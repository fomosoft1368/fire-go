import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Ride, RideDocument, RideStatus, RideType } from './schemas/ride.schema';
import { CreateRideDto } from './dto';

@Injectable()
export class RidesService {
  constructor(
    @InjectModel(Ride.name) private rideModel: Model<RideDocument>,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * Get route directions from OSRM (Open Source Routing Machine)
   * Free, no API key needed, supports Vietnam well
   */
  async getDirections(
    startLng: number,
    startLat: number,
    endLng: number,
    endLat: number,
  ): Promise<any> {
    try {
      // Validate numbers
      if (isNaN(startLng) || isNaN(startLat) || isNaN(endLng) || isNaN(endLat)) {
        throw new BadRequestException('Invalid coordinates - must be numbers');
      }

      // OSRM format: lng,lat;lng,lat
      const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?geometries=geojson&overview=full`;
      
      console.log('📍 Calling OSRM with coordinates:');
      console.log('   Start:', startLng, startLat);
      console.log('   End:', endLng, endLat);
      console.log('   URL:', url);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorBody = await response.text();
        console.error('OSRM API error:', response.status, errorBody);
        throw new BadRequestException(`OSRM API error: ${response.status}`);
      }
      
      const data: any = await response.json();
      console.log('✅ OSRM Response received:', {
        code: data.code,
        routes: data.routes?.length,
      });
      
      // Convert OSRM format to GeoJSON-like format for frontend
      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        return {
          features: [
            {
              geometry: route.geometry,
              properties: {
                summary: {
                  distance: route.distance,
                  duration: route.duration,
                }
              }
            }
          ]
        };
      } else {
        throw new BadRequestException('No route found');
      }
    } catch (err: any) {
      console.error('❌ Error fetching directions:', err.message);
      throw new BadRequestException(err.message || 'Failed to fetch directions');
    }
  }

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

    // Extract customerId before populate (it's still an ObjectId at this point)
    const customerIdStr = ride.customerId?.toString();

    const populatedRide = await ride.populate(['customerId', 'driverId']);

    // Emit ride.created event
    this.eventEmitter.emit('ride.created', {
      rideId: ride._id.toString(),
      customerId: customerIdStr,
      pickupAddress: createRideDto.pickupAddress,
      dropoffAddress: createRideDto.dropoffAddress,
      totalFare: totalFare,
      rideType: rideType,
    });

    return populatedRide;
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

    const updatedRide = await this.rideModel.findByIdAndUpdate(
      rideId,
      {
        driverId: new Types.ObjectId(driverId),
        status: RideStatus.ACCEPTED,
        acceptedAt: new Date(),
      },
      { new: true },
    ).populate('driverId').populate('customerId');

    // Emit ride.accepted event
    const extractedCustomerId = ride.customerId && typeof ride.customerId === 'object' 
      ? (ride.customerId as any)._id.toString() 
      : ride.customerId.toString();
    
    this.eventEmitter.emit('ride.accepted', {
      rideId: rideId,
      driverId: driverId,
      customerId: extractedCustomerId,
      driverName: (updatedRide.driverId as any)?.name || 'Driver',
    });

    return updatedRide;
  }

  async assignDriver(rideId: string, driverId: string): Promise<RideDocument> {
    const ride = await this.findById(rideId);

    if (ride.status !== RideStatus.PENDING) {
      throw new BadRequestException('Ride is not available for assignment');
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

    const updatedRide = await this.rideModel.findByIdAndUpdate(
      rideId,
      {
        status: RideStatus.COMPLETED,
        completedAt: new Date(),
        isPaid: true,
        paidAt: new Date(),
      },
      { new: true },
    );

    // Emit ride.completed event
    const extractedCustomerId = ride.customerId && typeof ride.customerId === 'object' 
      ? (ride.customerId as any)._id.toString() 
      : ride.customerId.toString();
    
    this.eventEmitter.emit('ride.completed', {
      rideId: rideId,
      customerId: extractedCustomerId,
      driverId: ride.driverId?.toString(),
      totalFare: ride.totalFare,
    });

    return updatedRide;
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

  /**
   * Get overall ride statistics for dashboard
   */
  async getAllRideStats(): Promise<any> {
    const stats = await this.rideModel.aggregate([
      {
        $facet: {
          byStatus: [
            {
              $group: {
                _id: '$status',
                count: { $sum: 1 },
                status: { $first: '$status' },
              },
            },
            {
              $project: {
                _id: 0,
                status: 1,
                count: 1,
              },
            },
          ],
          overall: [
            {
              $group: {
                _id: null,
                totalRides: { $sum: 1 },
                completedRides: {
                  $sum: {
                    $cond: [{ $eq: ['$status', RideStatus.COMPLETED] }, 1, 0],
                  },
                },
                activeRides: {
                  $sum: {
                    $cond: [
                      {
                        $in: ['$status', [RideStatus.ACCEPTED, RideStatus.IN_PROGRESS]],
                      },
                      1,
                      0,
                    ],
                  },
                },
                cancelledRides: {
                  $sum: {
                    $cond: [{ $eq: ['$status', RideStatus.CANCELLED] }, 1, 0],
                  },
                },
                totalRevenue: {
                  $sum: {
                    $cond: [{ $eq: ['$status', RideStatus.COMPLETED] }, '$totalFare', 0],
                  },
                },
              },
            },
          ],
        },
      },
    ]);

    const result = stats[0];
    const overall = result.overall[0] || {
      totalRides: 0,
      completedRides: 0,
      activeRides: 0,
      cancelledRides: 0,
      totalRevenue: 0,
    };

    return {
      byStatus: result.byStatus.map((s: any) => ({
        status: s.status,
        count: s.count,
      })),
      totalRides: overall.totalRides,
      completedRides: overall.completedRides,
      activeRides: overall.activeRides,
      cancelledRides: overall.cancelledRides,
      totalRevenue: overall.totalRevenue,
    };
  }

  /**
   * Get revenue statistics for a date range
   */
  async getRevenueStats(startDate?: Date, endDate?: Date) {
    const matchStage: any = {
      status: RideStatus.COMPLETED,
    };

    if (startDate || endDate) {
      matchStage.completedAt = {};
      if (startDate) matchStage.completedAt.$gte = new Date(startDate);
      if (endDate) matchStage.completedAt.$lte = new Date(endDate);
    }

    const stats = await this.rideModel.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalFare' },
          totalRides: { $sum: 1 },
          averageFare: { $avg: '$totalFare' },
          minFare: { $min: '$totalFare' },
          maxFare: { $max: '$totalFare' },
        },
      },
    ]);

    return stats[0] || { totalRevenue: 0, totalRides: 0, averageFare: 0 };
  }

  /**
   * Get daily revenue breakdown
   */
  async getDailyRevenue(days: number = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const dailyStats = await this.rideModel.aggregate([
      {
        $match: {
          status: RideStatus.COMPLETED,
          completedAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$completedAt' },
            month: { $month: '$completedAt' },
            day: { $dayOfMonth: '$completedAt' },
          },
          revenue: { $sum: '$totalFare' },
          rides: { $sum: 1 },
          date: { $first: '$completedAt' },
        },
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 },
      },
    ]);

    return dailyStats.map((item) => ({
      date: item.date,
      day: item._id.day,
      month: `T${item._id.month}`,
      revenue: item.revenue,
      rides: item.rides,
    }));
  }

  /**
   * Get revenue by ride type
   */
  async getRevenueByRideType(startDate?: Date, endDate?: Date) {
    const matchStage: any = {
      status: RideStatus.COMPLETED,
    };

    if (startDate || endDate) {
      matchStage.completedAt = {};
      if (startDate) matchStage.completedAt.$gte = new Date(startDate);
      if (endDate) matchStage.completedAt.$lte = new Date(endDate);
    }

    const stats = await this.rideModel.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$rideType',
          revenue: { $sum: '$totalFare' },
          rides: { $sum: 1 },
          percentage: { $sum: 1 },
        },
      },
    ]);

    // Calculate total rides for percentage
    const totalRides = stats.reduce((sum, item) => sum + item.rides, 0);

    return stats.map((item) => ({
      type: item._id || 'unknown',
      revenue: item.revenue,
      rides: item.rides,
      percentage: totalRides > 0 ? ((item.rides / totalRides) * 100).toFixed(2) : 0,
    }));
  }

  /**
   * Get weekly revenue
   */
  async getWeeklyRevenue() {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 6);

    const weeklyStats = await this.rideModel.aggregate([
      {
        $match: {
          status: RideStatus.COMPLETED,
          completedAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$completedAt' },
            week: { $week: '$completedAt' },
          },
          revenue: { $sum: '$totalFare' },
          rides: { $sum: 1 },
        },
      },
    ]);

    return weeklyStats;
  }

  /**
   * Get peak hours (rides by hour)
   */
  async getPeakHours(startDate?: Date, endDate?: Date) {
    const matchStage: any = {
      status: RideStatus.COMPLETED,
    };

    if (startDate || endDate) {
      matchStage.completedAt = {};
      if (startDate) matchStage.completedAt.$gte = new Date(startDate);
      if (endDate) matchStage.completedAt.$lte = new Date(endDate);
    }

    const peakHours = await this.rideModel.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: { $hour: '$completedAt' },
          rides: { $sum: 1 },
          revenue: { $sum: '$totalFare' },
        },
      },
      { $sort: { '_id': 1 } },
    ]);

    // Fill missing hours with 0
    const result = Array.from({ length: 24 }, (_, hour) => {
      const found = peakHours.find(p => p._id === hour);
      return {
        hour,
        rides: found?.rides || 0,
        revenue: found?.revenue || 0,
      };
    });

    return result;
  }

  /**
   * Get top drivers by earnings
   */
  async getTopDrivers(limit: number = 10) {
    const topDrivers = await this.rideModel.aggregate([
      {
        $match: {
          status: RideStatus.COMPLETED,
          driverId: { $ne: null, $exists: true },
        },
      },
      {
        $group: {
          _id: '$driverId',
          totalRides: { $sum: 1 },
          totalEarnings: { $sum: '$totalFare' },
          averageRating: { $avg: '$driverRating' },
        },
      },
      {
        $sort: { totalEarnings: -1 },
      },
      {
        $limit: limit,
      },
      {
        $lookup: {
          from: 'drivers',
          localField: '_id',
          foreignField: '_id',
          as: 'driver',
        },
      },
      {
        $unwind: {
          path: '$driver',
          preserveNullAndEmptyArrays: false,
        },
      },
    ]);

    // Map to response format
    return topDrivers.map((item, idx) => ({
      id: item._id?.toString() || '',
      rank: idx + 1,
      name: item.driver?.fullName || `${item.driver?.firstName || ''} ${item.driver?.lastName || ''}`.trim() || 'Unknown',
      trips: item.totalRides || 0,
      avatar: item.driver?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${item._id?.toString() || 'default'}`,
      rating: Math.round((item.averageRating || 0) * 10) / 10,
      earnings: Math.round(item.totalEarnings) || 0,
    }));
  }
}
