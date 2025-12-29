import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Ride, RideDocument, RideStatus, RideType } from './schemas/ride.schema';
import { CreateRideDto } from './dto';

@Injectable()
export class RidesService {
  constructor(@InjectModel(Ride.name) private rideModel: Model<RideDocument>) {}

  async create(createRideDto: CreateRideDto, customerId: string): Promise<RideDocument> {
    const totalFare =
      createRideDto.baseFare +
      createRideDto.distanceFare +
      createRideDto.timeFare +
      (createRideDto.surgePricing || 0);

    // Xác định loại chuyến (mặc định là SHARE nếu không được chỉ định)
    const rideType = createRideDto.rideType || RideType.SHARE;

    // Validation cho ride type HIRE
    if (rideType === RideType.HIRE) {
      if (!createRideDto.carType || !createRideDto.licensePlate) {
        throw new BadRequestException(
          'carType và licensePlate là bắt buộc cho cuốc xe lái xe hộ'
        );
      }
    }

    const ride = await this.rideModel.create({
      ...createRideDto,
      rideType,
      customerId: new Types.ObjectId(customerId),
      pickupLocation: {
        type: 'Point',
        coordinates: createRideDto.pickupCoordinates,
      },
      dropoffLocation: {
        type: 'Point',
        coordinates: createRideDto.dropoffCoordinates,
      },
      totalFare,
      status: RideStatus.PENDING,
    });

    return ride.populate(['customerId', 'driverId']);
  }

  async findAll(filters?: any): Promise<RideDocument[]> {
    return this.rideModel
      .find(filters || {})
      .populate('driverId')
      .populate('customerId')
      .sort({ createdAt: -1 });
  }

  async findById(id: string): Promise<RideDocument> {
    const ride = await this.rideModel
      .findById(id)
      .populate('driverId')
      .populate('customerId');

    if (!ride) {
      throw new NotFoundException(`Ride with ID ${id} not found`);
    }

    return ride;
  }

  async findByCustomerId(customerId: string): Promise<RideDocument[]> {
    return this.rideModel
      .find({ customerId: new Types.ObjectId(customerId) })
      .populate('driverId')
      .populate('customerId')
      .sort({ createdAt: -1 });
  }

  async findByDriverId(driverId: string): Promise<RideDocument[]> {
    return this.rideModel
      .find({ driverId: new Types.ObjectId(driverId) })
      .populate('driverId')
      .populate('customerId')
      .sort({ createdAt: -1 });
  }

  async findNearbyRides(
    longitude: number,
    latitude: number,
    maxDistance: number = 5000, // 5km in meters
    rideType?: string, // Lọc theo loại chuyến
  ): Promise<RideDocument[]> {
    const query: any = {
      status: RideStatus.PENDING,
      rideType: RideType.SHARE, // Mặc định chỉ tìm chuyến ghép
      pickupLocation: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude],
          },
          $maxDistance: maxDistance,
        },
      },
    };

    return this.rideModel
      .find(query)
      .populate('driverId')
      .populate('customerId')
      .limit(10);
  }

  async acceptRide(rideId: string, driverId: string): Promise<RideDocument> {
    const ride = await this.findById(rideId);

    if (ride.status !== RideStatus.PENDING) {
      throw new BadRequestException('Ride is not available for acceptance');
    }

    return this.rideModel.findByIdAndUpdate(
      rideId,
      {
        driverId: new Types.ObjectId(driverId),
        status: RideStatus.ACCEPTED,
        acceptedAt: new Date(),
      },
      { new: true },
    ).populate('driverId').populate('customerId');
  }

  async startRide(rideId: string): Promise<RideDocument> {
    const ride = await this.findById(rideId);

    if (ride.status !== RideStatus.ACCEPTED) {
      throw new BadRequestException('Ride must be accepted before starting');
    }

    return this.rideModel.findByIdAndUpdate(
      rideId,
      {
        status: RideStatus.IN_PROGRESS,
        startedAt: new Date(),
      },
      { new: true },
    );
  }

  async completeRide(rideId: string): Promise<RideDocument> {
    const ride = await this.findById(rideId);

    if (ride.status !== RideStatus.IN_PROGRESS) {
      throw new BadRequestException('Ride must be in progress to complete');
    }

    return this.rideModel.findByIdAndUpdate(
      rideId,
      {
        status: RideStatus.COMPLETED,
        completedAt: new Date(),
        isPaid: true,
        paidAt: new Date(),
      },
      { new: true },
    );
  }

  async cancelRide(
    rideId: string,
    cancellationBy: 'driver' | 'customer',
    reason?: string,
  ): Promise<RideDocument> {
    const ride = await this.findById(rideId);

    if ([RideStatus.COMPLETED, RideStatus.CANCELLED].includes(ride.status)) {
      throw new BadRequestException('Ride cannot be cancelled');
    }

    return this.rideModel.findByIdAndUpdate(
      rideId,
      {
        status: RideStatus.CANCELLED,
        cancelledAt: new Date(),
        cancellationBy,
        cancellationReason: reason,
      },
      { new: true },
    );
  }

  async rateRide(
    rideId: string,
    rating: number,
    review?: string,
    ratedBy: 'driver' | 'customer' = 'customer',
  ): Promise<RideDocument> {
    if (rating < 1 || rating > 5) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }

    const updateData =
      ratedBy === 'driver'
        ? { customerRating: rating, customerReview: review }
        : { driverRating: rating, driverReview: review };

    return this.rideModel.findByIdAndUpdate(rideId, updateData, { new: true });
  }

  async getRideStats(userId: string, userType: 'driver' | 'customer'): Promise<any> {
    const field = userType === 'driver' ? 'driverId' : 'customerId';

    const stats = await this.rideModel.aggregate([
      {
        $match: {
          [field]: new Types.ObjectId(userId),
        },
      },
      {
        $group: {
          _id: null,
          totalRides: { $sum: 1 },
          completedRides: {
            $sum: {
              $cond: [{ $eq: ['$status', RideStatus.COMPLETED] }, 1, 0],
            },
          },
          cancelledRides: {
            $sum: {
              $cond: [{ $eq: ['$status', RideStatus.CANCELLED] }, 1, 0],
            },
          },
          totalEarnings: {
            $sum: {
              $cond: [{ $eq: ['$status', RideStatus.COMPLETED] }, '$totalFare', 0],
            },
          },
          averageRating: { $avg: `$${userType === 'driver' ? 'customer' : 'driver'}Rating` },
        },
      },
    ]);

    return stats[0] || {};
  }
}
