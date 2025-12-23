import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Ride, RideDocument, RideStatus } from './schemas/ride.schema';
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

    const ride = await this.rideModel.create({
      ...createRideDto,
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
      .populate(['customerId', 'driverId'])
      .sort({ createdAt: -1 });
  }

  async findById(id: string): Promise<RideDocument> {
    const ride = await this.rideModel
      .findById(id)
      .populate(['customerId', 'driverId']);

    if (!ride) {
      throw new NotFoundException(`Ride with ID ${id} not found`);
    }

    return ride;
  }

  async findByCustomerId(customerId: string): Promise<RideDocument[]> {
    return this.rideModel
      .find({ customerId: new Types.ObjectId(customerId) })
      .populate(['customerId', 'driverId'])
      .sort({ createdAt: -1 });
  }

  async findByDriverId(driverId: string): Promise<RideDocument[]> {
    return this.rideModel
      .find({ driverId: new Types.ObjectId(driverId) })
      .populate(['customerId', 'driverId'])
      .sort({ createdAt: -1 });
  }

  async findNearbyRides(
    longitude: number,
    latitude: number,
    maxDistance: number = 5000, // 5km in meters
  ): Promise<RideDocument[]> {
    return this.rideModel
      .find({
        status: RideStatus.PENDING,
        pickupLocation: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [longitude, latitude],
            },
            $maxDistance: maxDistance,
          },
        },
      })
      .populate(['customerId'])
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
    );
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
