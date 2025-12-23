import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Driver, DriverDocument, DriverStatus } from './schemas/driver.schema';
import { CreateDriverDto, UpdateDriverDto, UpdateLocationDto } from './dto';

@Injectable()
export class DriversService {
  constructor(@InjectModel(Driver.name) private driverModel: Model<DriverDocument>) {}

  async create(userId: string, createDriverDto: CreateDriverDto): Promise<DriverDocument> {
    const driver = await this.driverModel.create({
      ...createDriverDto,
      userId: new Types.ObjectId(userId),
      status: DriverStatus.OFFLINE,
    });

    return driver.populate('userId');
  }

  async findById(id: string): Promise<DriverDocument> {
    const driver = await this.driverModel.findById(id).populate('userId');

    if (!driver) {
      throw new NotFoundException(`Driver with ID ${id} not found`);
    }

    return driver;
  }

  async findByUserId(userId: string): Promise<DriverDocument> {
    const driver = await this.driverModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .populate('userId');

    if (!driver) {
      throw new NotFoundException(`Driver with user ID ${userId} not found`);
    }

    return driver;
  }

  async findAll(filters?: { status?: string; search?: string; page?: number; limit?: number }): Promise<DriverDocument[]> {
    const query: any = {};

    // Filter by status
    if (filters?.status) {
      query.status = filters.status;
    }

    // Search by name or license plate
    if (filters?.search) {
      query.$or = [
        { bankAccountHolder: { $regex: filters.search, $options: 'i' } },
        { vehiclePlate: { $regex: filters.search, $options: 'i' } },
        { licenseNumber: { $regex: filters.search, $options: 'i' } },
      ];
    }

    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    return this.driverModel
      .find(query)
      .populate('userId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
  }

  async findOnlineDrivers(longitude: number, latitude: number, maxDistance: number = 5000) {
    return this.driverModel.find({
      status: { $ne: DriverStatus.OFFLINE },
      isSuspended: false,
      isAcceptingRides: true,
      currentLocation: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude],
          },
          $maxDistance: maxDistance,
        },
      },
    });
  }

  async updateStatus(driverId: string, status: DriverStatus): Promise<DriverDocument> {
    const driver = await this.findById(driverId);

    if (driver.isSuspended) {
      throw new BadRequestException('Driver is suspended');
    }

    return this.driverModel.findByIdAndUpdate(
      driverId,
      { status },
      { new: true },
    );
  }

  async updateLocation(driverId: string, updateLocationDto: UpdateLocationDto): Promise<DriverDocument> {
    return this.driverModel.findByIdAndUpdate(
      driverId,
      {
        currentLocation: {
          type: 'Point',
          coordinates: updateLocationDto.coordinates,
        },
        lastLocationUpdate: new Date(),
      },
      { new: true },
    );
  }

  async update(driverId: string, updateDriverDto: UpdateDriverDto): Promise<DriverDocument> {
    return this.driverModel.findByIdAndUpdate(
      driverId,
      updateDriverDto,
      { new: true },
    );
  }

  async incrementRideStats(driverId: string, completed: boolean = true): Promise<void> {
    const updateData: any = {
      $inc: { totalRides: 1 },
    };

    if (completed) {
      updateData.$inc.completedRides = 1;
    } else {
      updateData.$inc.cancelledRides = 1;
    }

    await this.driverModel.findByIdAndUpdate(driverId, updateData);
  }

  async updateRating(driverId: string, rating: number): Promise<DriverDocument> {
    const driver = await this.findById(driverId);

    const newTotal = driver.totalReviews + 1;
    const newAverage =
      (driver.averageRating * driver.totalReviews + rating) / newTotal;

    return this.driverModel.findByIdAndUpdate(
      driverId,
      {
        averageRating: Math.round(newAverage * 100) / 100,
        $inc: { totalReviews: 1 },
      },
      { new: true },
    );
  }

  async suspendDriver(
    driverId: string,
    reason: string,
    until?: Date,
  ): Promise<DriverDocument> {
    return this.driverModel.findByIdAndUpdate(
      driverId,
      {
        isSuspended: true,
        suspensionReason: reason,
        suspendedUntil: until,
        status: DriverStatus.OFFLINE,
      },
      { new: true },
    );
  }

  async unsuspendDriver(driverId: string): Promise<DriverDocument> {
    return this.driverModel.findByIdAndUpdate(
      driverId,
      {
        isSuspended: false,
        suspensionReason: null,
        suspendedUntil: null,
      },
      { new: true },
    );
  }

  async getStats(driverId: string): Promise<any> {
    return this.driverModel.findById(driverId).select(
      'totalRides completedRides cancelledRides averageRating totalReviews totalEarnings',
    );
  }

  async getDashboard(userId: string): Promise<any> {
    const driver = await this.findByUserId(userId);

    return {
      id: driver._id,
      name: driver.userId['name'] || 'Driver',
      status: driver.status,
      isOnline: driver.status !== DriverStatus.OFFLINE,
      averageRating: driver.averageRating,
      totalReviews: driver.totalReviews,
      totalRides: driver.totalRides,
      completedRides: driver.completedRides,
      cancelledRides: driver.cancelledRides,
      totalEarnings: driver.totalEarnings,
      isAcceptingRides: driver.isAcceptingRides,
      isSuspended: driver.isSuspended,
      vehicleInfo: {
        plate: driver.vehiclePlate,
        model: driver.vehicleModel,
        color: driver.vehicleColor,
      },
    };
  }

  async getTodayEarnings(userId: string): Promise<any> {
    const driver = await this.findByUserId(userId);
    
    // Tính doanh thu hôm nay từ rides
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Cần intergrate với Rides module để lấy doanh thu hôm nay
    // Tạm thời trả về mock data
    return {
      driverId: driver._id,
      date: new Date(),
      totalEarnings: 0,
      totalTrips: 0,
      breakdown: {
        cash: 0,
        online: 0,
        tips: 0,
      },
    };
  }

  async toggleAcceptingRides(
    userId: string,
    isAcceptingRides: boolean,
  ): Promise<DriverDocument> {
    const driver = await this.findByUserId(userId);

    if (driver.isSuspended) {
      throw new BadRequestException('Driver is suspended and cannot accept rides');
    }

    return this.driverModel.findByIdAndUpdate(
      driver._id,
      { isAcceptingRides },
      { new: true },
    );
  }
}
