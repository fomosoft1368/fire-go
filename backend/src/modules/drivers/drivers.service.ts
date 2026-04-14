import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  Driver,
  DriverDocument,
  DriverStatus,
  DocumentStatus,
} from './schemas/driver.schema';
import { CreateDriverDto, UpdateDriverDto, UpdateLocationDto } from './dto';

@Injectable()
export class DriversService {
  constructor(
    @InjectModel(Driver.name) private driverModel: Model<DriverDocument>,
    @InjectModel('Ride') private rideModel: Model<any>,
    @InjectModel('CombinedTrip') private combinedTripModel: Model<any>,
    @InjectModel('RideRequest') private rideRequestModel: Model<any>,
    @InjectModel('Delivery') private deliveryModel: Model<any>,
    @InjectModel('HourlyService') private hourlyServiceModel: Model<any>,
    @InjectModel('PricingConfig') private pricingConfigModel: Model<any>,
    @InjectModel('User') private userModel: Model<any>,
    private eventEmitter: EventEmitter2,
  ) {}

  async create(
    userId: string,
    createDriverDto: CreateDriverDto,
  ): Promise<DriverDocument> {
    const driverData: any = {
      ...createDriverDto,
      status: DriverStatus.OFFLINE,
      approvalStatus: DocumentStatus.PENDING, // ✅ Set to pending when driver registers
      isPhoneVerified: true, // Zalo verified
    };

    // Tạo mã giới thiệu độc nhất cho tài xế mới (VD: FG + 6 ký tự)
    driverData.referralCode =
      'FG' + Math.random().toString(36).substring(2, 8).toUpperCase();

    // Check mã người giới thiệu nhập vào (nếu có)
    if (createDriverDto.referralCode) {
      const codeStr = createDriverDto.referralCode.toUpperCase();

      // 1. Kiểm tra xem người giới thiệu có phải là nhân viên Marketing (User) không?
      const referrerUser = await this.userModel.findOne({
        referralCode: codeStr,
      });
      if (referrerUser) {
        // Tài xế này được giới thiệu bởi hệ thống Marketing
        driverData.marketingReferrerId = referrerUser._id;
      } else {
        // 2. Không phải Marketing, thì kiểm tra xem có phải là Tài xế khác giới thiệu không?
        const referrer = await this.driverModel.findOne({
          referralCode: codeStr,
        });
        if (referrer) {
          driverData.referredBy = referrer._id;
          driverData.referralF1 = referrer._id;
          driverData.referralF2 = referrer.referralF1; // F1 của người giới thiệu sẽ là F2 của tài xế mới
          driverData.referralF3 = referrer.referralF2; // F2 của người giới thiệu sẽ là F3 của tài xế mới

          // Tăng số lượng F1 của người giới thiệu
          await this.driverModel.findByIdAndUpdate(referrer._id, {
            $inc: { totalReferrals: 1 },
          });
        }
      }
    }

    // Only add userId if provided and valid
    if (userId && userId.trim()) {
      try {
        driverData.userId = new Types.ObjectId(userId);
      } catch (e) {
        // Invalid userId format, skip it
      }
    }

    const driver = await this.driverModel.create(driverData);

    // Emit event for new driver registration
    this.eventEmitter.emit('driver.registered', {
      driverId: driver._id.toString(),
      firstName: createDriverDto.firstName,
      lastName: createDriverDto.lastName,
      phone: createDriverDto.phone,
      approvalStatus: DocumentStatus.PENDING,
    });

    return driver;
  }

  async findById(id: string): Promise<DriverDocument> {
    const driver = await this.driverModel.findById(id);

    if (!driver) {
      throw new NotFoundException(`Driver with ID ${id} not found`);
    }

    return driver;
  }

  async findByUserId(userId: string): Promise<DriverDocument> {
    const driver = await this.driverModel.findOne({
      userId: new Types.ObjectId(userId),
    });

    if (!driver) {
      throw new NotFoundException(`Driver with user ID ${userId} not found`);
    }

    return driver;
  }

  async findByReferralCode(code: string): Promise<DriverDocument | null> {
    return this.driverModel.findOne({ referralCode: code.toUpperCase() });
  }

  async getOrCreateReferralCode(driverId: string) {
    let driver = await this.driverModel.findById(driverId);
    if (!driver) throw new NotFoundException('Driver not found');

    if (!driver.referralCode) {
      driver.referralCode =
        'FG' + Math.random().toString(36).substring(2, 8).toUpperCase();
      // Initialize zero stats if missing
      if (driver.totalReferrals === undefined) driver.totalReferrals = 0;
      if (driver.totalReferralEarnings === undefined)
        driver.totalReferralEarnings = 0;
      await driver.save();
    }

    return {
      referralCode: driver.referralCode,
      totalReferrals: driver.totalReferrals || 0,
      totalReferralEarnings: driver.totalReferralEarnings || 0,
      completedRides: driver.completedRides || 0,
    };
  }

  async findAll(filters?: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<DriverDocument[]> {
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
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
  }

  async search(query: string): Promise<any[]> {
    const searchQuery = {
      $or: [
        { firstName: { $regex: query, $options: 'i' } },
        { lastName: { $regex: query, $options: 'i' } },
        { phone: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
      ],
    };

    return this.driverModel
      .find(searchQuery)
      .select('_id firstName lastName phone email')
      .limit(20)
      .exec();
  }

  async findOnlineDrivers(
    longitude: number,
    latitude: number,
    maxDistance: number = 5000,
  ) {
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

  /**
   * Get all available drivers (online and accepting rides)
   */
  async getAvailableDrivers() {
    return this.driverModel
      .find({
        status: { $ne: DriverStatus.OFFLINE },
        isSuspended: false,
        isAcceptingRides: true,
        currentLocation: { $exists: true }, // Must have location
      })
      .sort({ createdAt: -1 });
  }

  /**
   * Get IDs of drivers who are currently busy with ANY service
   * Checks across: Rides, Combined Trips, Delivery, Hourly Services
   */
  async getBusyDriverIds(): Promise<string[]> {
    const busyDriverIds = new Set<string>();

    // 1️⃣ Check active rides (regular rides)
    const activeRides = await this.rideModel
      .find({
        status: { $in: ['accepted', 'in_progress'] },
        driverId: { $exists: true, $ne: null },
      })
      .select('driverId')
      .lean();

    activeRides.forEach((ride) => {
      if (ride.driverId) {
        busyDriverIds.add(ride.driverId.toString());
      }
    });

    // 2️⃣ Check active combined trips (carpooling)
    const activeCombinedTrips = await this.combinedTripModel
      .find({
        status: { $in: ['accepted', 'in_progress'] },
        driverId: { $exists: true, $ne: null },
      })
      .select('driverId')
      .lean();

    activeCombinedTrips.forEach((trip) => {
      if (trip.driverId) {
        busyDriverIds.add(trip.driverId.toString());
      }
    });

    // 3️⃣ Check active deliveries
    const activeDeliveries = await this.deliveryModel
      .find({
        status: { $in: ['driver_assigned', 'picking_up', 'delivering'] },
        driverId: { $exists: true, $ne: null },
      })
      .select('driverId')
      .lean();

    activeDeliveries.forEach((delivery) => {
      if (delivery.driverId) {
        busyDriverIds.add(delivery.driverId.toString());
      }
    });

    // 4️⃣ Check active hourly services
    const activeHourlyServices = await this.hourlyServiceModel
      .find({
        status: { $in: ['confirmed', 'in_progress'] },
        workerId: { $exists: true, $ne: null },
      })
      .select('workerId')
      .lean();

    activeHourlyServices.forEach((service) => {
      if (service.workerId) {
        busyDriverIds.add(service.workerId.toString());
      }
    });

    return Array.from(busyDriverIds);
  }

  async updateStatus(
    driverId: string,
    status: DriverStatus,
  ): Promise<DriverDocument> {
    const driver = await this.findById(driverId);

    if (driver.isSuspended) {
      throw new BadRequestException('Driver is suspended');
    }

    // Sync isOnline field with status
    const isOnline = status === DriverStatus.ONLINE;
    const updateData: any = {
      status,
      isOnline,
      // CRITICAL FIX: When driver goes online, they should be available
      // When offline, they are not available
      // isAvailable only becomes false when driver accepts a trip
      isAvailable: isOnline, // TRUE when online, FALSE when offline
    };

    console.log(
      `[DriversService] Updating driver ${driverId} status to ${status}, isOnline=${isOnline}, isAvailable=${isOnline}`,
    );

    if (isOnline) {
      updateData.lastOnlineTime = new Date();
    }

    return this.driverModel.findByIdAndUpdate(driverId, updateData, {
      new: true,
    });
  }

  async updateLocation(
    driverId: string,
    updateLocationDto: UpdateLocationDto,
  ): Promise<DriverDocument> {
    console.log('[DriversService] 📍 Updating driver location:', {
      driverId,
      coordinates: updateLocationDto.coordinates,
      timestamp: new Date().toISOString(),
    });

    const updatedDriver = await this.driverModel.findByIdAndUpdate(
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

    if (updatedDriver) {
      console.log('[DriversService] ✅ Location updated successfully:', {
        driverId: updatedDriver._id,
        name: `${updatedDriver.firstName} ${updatedDriver.lastName}`,
        coordinates: updatedDriver.currentLocation?.coordinates,
      });
    } else {
      console.error('[DriversService] ❌ Driver not found:', driverId);
    }

    return updatedDriver;
  }

  async update(
    driverId: string,
    updateDriverDto: UpdateDriverDto,
  ): Promise<DriverDocument> {
    try {
      console.log('[DriversService] Updating driver:', driverId);
      console.log(
        '[DriversService] Update data:',
        JSON.stringify(updateDriverDto),
      );

      const result = await this.driverModel.findByIdAndUpdate(
        driverId,
        updateDriverDto,
        { new: true },
      );

      console.log('[DriversService] Update successful');
      return result;
    } catch (error) {
      console.error('[DriversService] Error updating driver:', error);
      throw error;
    }
  }

  async requestDeletion(driverId: string): Promise<{ message: string }> {
    const driver = await this.driverModel.findById(driverId);
    if (!driver) {
      throw new NotFoundException('Không tìm thấy tài xế');
    }

    await this.driverModel.findByIdAndUpdate(driverId, {
      deletionRequestedAt: new Date(),
      isOnline: false,
      status: 'offline',
      isAvailable: false,
    });

    return { message: 'Đã ghi nhận yêu cầu xóa tài khoản' };
  }

  async incrementRideStats(
    driverId: string,
    completed: boolean = true,
  ): Promise<void> {
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

  async updateRating(
    driverId: string,
    rating: number,
  ): Promise<DriverDocument> {
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
    return this.driverModel
      .findById(driverId)
      .select(
        'totalRides completedRides cancelledRides averageRating totalReviews totalEarnings',
      );
  }

  async getDashboard(driverId: string): Promise<any> {
    const driver = await this.findById(driverId);

    return {
      id: driver._id,
      name: `${driver.firstName} ${driver.lastName}` || 'Driver',
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

  async getTodayEarnings(driverId: string): Promise<any> {
    try {
      console.log('[getTodayEarnings] Starting for driver:', driverId);

      const driver = await this.findById(driverId);
      if (!driver) {
        console.error('[getTodayEarnings] Driver not found:', driverId);
        throw new NotFoundException('Driver not found');
      }

      // Get pricing config to get driverShare percentage
      const pricingConfigs = await this.pricingConfigModel.find({}).limit(1);
      const driverShare = pricingConfigs?.[0]?.driverShare || 80; // Default 80% if not found

      console.log(
        `[getTodayEarnings] Driver: ${driver.firstName} ${driver.lastName}`,
      );
      console.log(`[getTodayEarnings] driverShare: ${driverShare}%`);

      // Get today's date range (00:00 - 23:59)
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Get yesterday's date range for trend comparison
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const dayBeforeYesterday = new Date(yesterday);
      dayBeforeYesterday.setDate(dayBeforeYesterday.getDate() - 1);

      console.log(
        `[getTodayEarnings] Today range: ${today.toISOString()} to ${tomorrow.toISOString()}`,
      );
      console.log(
        `[getTodayEarnings] Yesterday range: ${yesterday.toISOString()} to ${today.toISOString()}`,
      );

      // ===== TODAY'S EARNINGS =====

      // 1. Completed RIDES (lái xe hộ)
      let completedRides = [];
      let ridesTodayTotal = 0;
      let ridesTodayEarnings = 0;

      try {
        completedRides = await this.rideModel
          .find({
            driverId: new Types.ObjectId(driverId),
            status: 'completed',
            createdAt: { $gte: today, $lt: tomorrow },
          })
          .select('totalFare');

        ridesTodayTotal = completedRides.reduce(
          (sum, ride) => sum + (ride.totalFare || 0),
          0,
        );
        ridesTodayEarnings = Math.round((ridesTodayTotal * driverShare) / 100);
      } catch (err) {
        console.error('[getTodayEarnings] Error fetching rides:', err);
      }

      console.log(
        `[getTodayEarnings] Today - Rides: ${completedRides.length} trips, Total: ${ridesTodayTotal}, Driver share: ${ridesTodayEarnings}`,
      );

      // 2. Completed COMBINED TRIPS (ghép xe)
      let completedCombinedTrips = [];
      let combinedTodayTotal = 0;
      let completedRequestsCount = 0;
      let combinedTodayEarnings = 0;

      try {
        // Get completed combined trips
        completedCombinedTrips = await this.combinedTripModel.find({
          driverId: new Types.ObjectId(driverId),
          status: 'completed',
          createdAt: { $gte: today, $lt: tomorrow },
        });

        // Get all RideRequests for these trips
        const tripIds = completedCombinedTrips.map((trip) => trip._id);
        const completedRequests = await this.rideRequestModel.find({
          combinedTripId: { $in: tripIds },
          status: 'completed',
        });

        // Calculate total fare from all completed requests
        for (const request of completedRequests) {
          if (request.fare) {
            combinedTodayTotal += request.fare;
            completedRequestsCount++;
          }
        }

        combinedTodayEarnings = Math.round(
          (combinedTodayTotal * driverShare) / 100,
        );
      } catch (err) {
        console.error('[getTodayEarnings] Error fetching combined trips:', err);
      }

      console.log(
        `[getTodayEarnings] Today - Combined: ${completedCombinedTrips.length} trips, ${completedRequestsCount} requests, Total: ${combinedTodayTotal}, Driver share: ${combinedTodayEarnings}`,
      );

      // 3. Completed DELIVERIES
      let completedDeliveries = [];
      let deliveriesTodayTotal = 0;
      let deliveriesTodayEarnings = 0;

      try {
        completedDeliveries = await this.deliveryModel
          .find({
            driverId: new Types.ObjectId(driverId),
            status: 'delivered',
            createdAt: { $gte: today, $lt: tomorrow },
          })
          .select('estimatedPrice');

        deliveriesTodayTotal = completedDeliveries.reduce((sum, delivery) => {
          const price =
            typeof delivery.estimatedPrice === 'string'
              ? parseInt(delivery.estimatedPrice, 10)
              : delivery.estimatedPrice || 0;
          return sum + price;
        }, 0);

        deliveriesTodayEarnings = Math.round(
          (deliveriesTodayTotal * driverShare) / 100,
        );
      } catch (err) {
        console.error('[getTodayEarnings] Error fetching deliveries:', err);
      }

      console.log(
        `[getTodayEarnings] Today - Deliveries: ${completedDeliveries.length} deliveries, Total: ${deliveriesTodayTotal}, Driver share: ${deliveriesTodayEarnings}`,
      );

      // TOTAL TODAY
      const todayTotal =
        ridesTodayEarnings + combinedTodayEarnings + deliveriesTodayEarnings;
      const todayTripsCount =
        completedRides.length +
        completedCombinedTrips.length +
        completedDeliveries.length;

      // ===== YESTERDAY'S EARNINGS (for trend calculation) =====

      let completedRidesYesterday = [];
      let ridesYesterdayEarnings = 0;

      try {
        completedRidesYesterday = await this.rideModel
          .find({
            driverId: new Types.ObjectId(driverId),
            status: 'completed',
            createdAt: { $gte: yesterday, $lt: today },
          })
          .select('totalFare');

        const ridesYesterdayTotal = completedRidesYesterday.reduce(
          (sum, ride) => sum + (ride.totalFare || 0),
          0,
        );
        ridesYesterdayEarnings = Math.round(
          (ridesYesterdayTotal * driverShare) / 100,
        );
      } catch (err) {
        console.error(
          '[getTodayEarnings] Error fetching yesterday rides:',
          err,
        );
      }

      let combinedYesterdayEarnings = 0;

      try {
        const completedCombinedTripsYesterday =
          await this.combinedTripModel.find({
            driverId: new Types.ObjectId(driverId),
            status: 'completed',
            createdAt: { $gte: yesterday, $lt: today },
          });

        // Get all RideRequests for yesterday's trips
        const tripIdsYesterday = completedCombinedTripsYesterday.map(
          (trip) => trip._id,
        );
        const completedRequestsYesterday = await this.rideRequestModel.find({
          combinedTripId: { $in: tripIdsYesterday },
          status: 'completed',
        });

        let combinedYesterdayTotal = 0;
        for (const request of completedRequestsYesterday) {
          if (request.fare) {
            combinedYesterdayTotal += request.fare;
          }
        }
        combinedYesterdayEarnings = Math.round(
          (combinedYesterdayTotal * driverShare) / 100,
        );
      } catch (err) {
        console.error(
          '[getTodayEarnings] Error fetching yesterday combined trips:',
          err,
        );
      }

      let deliveriesYesterdayEarnings = 0;

      try {
        const completedDeliveriesYesterday = await this.deliveryModel
          .find({
            driverId: new Types.ObjectId(driverId),
            status: 'delivered',
            createdAt: { $gte: yesterday, $lt: today },
          })
          .select('estimatedPrice');

        const deliveriesYesterdayTotal = completedDeliveriesYesterday.reduce(
          (sum, delivery) => {
            const price =
              typeof delivery.estimatedPrice === 'string'
                ? parseInt(delivery.estimatedPrice, 10)
                : delivery.estimatedPrice || 0;
            return sum + price;
          },
          0,
        );

        deliveriesYesterdayEarnings = Math.round(
          (deliveriesYesterdayTotal * driverShare) / 100,
        );
      } catch (err) {
        console.error(
          '[getTodayEarnings] Error fetching yesterday deliveries:',
          err,
        );
      }

      // TOTAL YESTERDAY
      const yesterdayTotal =
        ridesYesterdayEarnings +
        combinedYesterdayEarnings +
        deliveriesYesterdayEarnings;

      // CALCULATE TREND
      let increase = 0;
      if (yesterdayTotal === 0 && todayTotal > 0) {
        increase = 100; // Was 0, now has earnings
      } else if (yesterdayTotal > 0) {
        increase = Math.round(
          ((todayTotal - yesterdayTotal) / yesterdayTotal) * 100,
        );
      }

      console.log(
        `[getTodayEarnings] Trend: ${yesterdayTotal} yesterday → ${todayTotal} today (${increase}%)`,
      );

      return {
        driverId: driver._id,
        date: new Date(),
        amount: todayTotal,
        totalTrips: todayTripsCount,
        increase,
        breakdown: {
          rides: {
            trips: completedRides.length,
            totalFare: ridesTodayTotal,
            driverEarnings: ridesTodayEarnings,
          },
          combinedTrips: {
            trips: completedCombinedTrips.length,
            requests: completedRequestsCount,
            totalFare: combinedTodayTotal,
            driverEarnings: combinedTodayEarnings,
          },
          deliveries: {
            deliveries: completedDeliveries.length,
            totalFare: deliveriesTodayTotal,
            driverEarnings: deliveriesTodayEarnings,
          },
        },
        driverShare,
      };
    } catch (error) {
      console.error('[getTodayEarnings] Fatal error:', error);
      // Return default response instead of throwing
      return {
        driverId: null,
        date: new Date(),
        amount: 0,
        totalTrips: 0,
        increase: 0,
        breakdown: {
          rides: { trips: 0, totalFare: 0, driverEarnings: 0 },
          combinedTrips: {
            trips: 0,
            requests: 0,
            totalFare: 0,
            driverEarnings: 0,
          },
          deliveries: { deliveries: 0, totalFare: 0, driverEarnings: 0 },
        },
        driverShare: 80,
      };
    }
  }

  async toggleAcceptingRides(
    driverId: string,
    isAcceptingRides: boolean,
  ): Promise<DriverDocument> {
    console.log('[toggleAcceptingRides] Starting with:', {
      driverId,
      isAcceptingRides,
    });

    const driver = await this.findById(driverId);
    console.log('[toggleAcceptingRides] Driver found:', {
      id: driver._id,
      walletBalance: driver.walletBalance,
      approvalStatus: driver.approvalStatus,
      isSuspended: driver.isSuspended,
    });

    if (driver.isSuspended) {
      console.log('[toggleAcceptingRides] Driver is suspended');
      throw new BadRequestException(
        'Driver is suspended and cannot accept rides',
      );
    }

    // Check wallet balance (must be >= 100k to accept rides)
    if (isAcceptingRides && driver.walletBalance < 100000) {
      console.log(
        '[toggleAcceptingRides] Wallet too low:',
        driver.walletBalance,
      );
      throw new BadRequestException(
        'Số dư ví phải từ 100.000 đ trở lên để nhận cuốc',
      );
    }

    // Check license status (must be APPROVED)
    if (isAcceptingRides && driver.licenseStatus !== DocumentStatus.APPROVED) {
      console.log(
        '[toggleAcceptingRides] License not approved:',
        driver.licenseStatus,
      );
      throw new BadRequestException(
        'Giấy phép lái xe của bạn chưa được phê duyệt. Vui lòng chờ admin duyệt hồ sơ',
      );
    }

    console.log('[toggleAcceptingRides] Validation passed, updating...');
    return this.driverModel.findByIdAndUpdate(
      driverId,
      { isAcceptingRides },
      { new: true },
    );
  }

  /**
   * Set driver online status
   */
  async updateOnlineStatus(
    driverId: string,
    isOnline: boolean,
  ): Promise<DriverDocument> {
    const driver = await this.driverModel.findById(driverId);
    if (!driver) {
      throw new NotFoundException(`Driver ${driverId} not found`);
    }

    const now = new Date();
    const today = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const lastDate = driver.lastOnlineDate
      ? driver.lastOnlineDate.toISOString().split('T')[0]
      : null;

    const updateData: any = {
      isOnline,
      status: isOnline ? 'online' : 'offline',
      isAvailable: isOnline,
    };

    // Reset daily tracking if it's a new day
    if (lastDate !== today) {
      updateData.todayOnlineMinutes = 0;
      updateData.lastOnlineDate = now;
    }

    if (isOnline) {
      // Driver bật online → ghi thời điểm bắt đầu session
      updateData.lastOnlineTime = now;
      updateData.onlineSessionStart = now;
    } else {
      // Driver tắt offline → tính phút online và cộng vào tổng
      if (driver.onlineSessionStart) {
        const sessionMinutes = Math.floor(
          (now.getTime() - driver.onlineSessionStart.getTime()) / 60000,
        );
        updateData.todayOnlineMinutes =
          (driver.todayOnlineMinutes || 0) + sessionMinutes;
        updateData.onlineSessionStart = null; // Clear session
        console.log(
          `[DriversService] 📊 Driver ${driverId} offline after ${sessionMinutes} minutes (total today: ${updateData.todayOnlineMinutes})`,
        );
      }
    }

    const updated = await this.driverModel.findByIdAndUpdate(
      driverId,
      updateData,
      { new: true },
    );

    console.log(
      `[DriversService] Driver ${driverId} online status updated to:`,
      isOnline,
      'status:',
      updateData.status,
      'available:',
      isOnline,
    );
    return updated;
  }

  /**
   * Set driver available status for auto-assign
   */
  async updateAvailableStatus(
    driverId: string,
    isAvailable: boolean,
  ): Promise<DriverDocument> {
    const updated = await this.driverModel.findByIdAndUpdate(
      driverId,
      { isAvailable },
      { new: true },
    );

    if (!updated) {
      throw new NotFoundException(`Driver ${driverId} not found`);
    }

    console.log(
      `[DriversService] Driver ${driverId} available status updated to:`,
      isAvailable,
    );
    return updated;
  }

  /**
   * Update driver heartbeat (keep alive)
   * Also ensures isOnline and status are synced
   */
  async updateHeartbeat(driverId: string): Promise<void> {
    await this.driverModel.findByIdAndUpdate(driverId, {
      lastOnlineTime: new Date(),
      isOnline: true,
      status: DriverStatus.ONLINE,
    });
  }

  /**
   * Auto-offline drivers that haven't sent heartbeat in 3 minutes
   * Should be called by a cron job every minute
   * Note: Heartbeat is sent every 15 seconds from mobile app
   */
  async autoOfflineInactiveDrivers(): Promise<void> {
    const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);

    const result = await this.driverModel.updateMany(
      {
        isOnline: true,
        lastOnlineTime: { $lt: threeMinutesAgo },
      },
      {
        isOnline: false,
        isAvailable: false,
        status: 'offline', // Sync status field with isOnline
      },
    );

    if (result.modifiedCount > 0) {
      console.log(
        `[DriversService] Auto-offlined ${result.modifiedCount} inactive drivers`,
      );
    }
  }

  /**
   * Approve driver (Admin action)
   */
  async approveDriver(id: string, notes?: string): Promise<DriverDocument> {
    console.log(`[DriversService] Approving driver ${id}`);

    const driver = await this.driverModel.findById(id);
    if (!driver) {
      throw new NotFoundException(`Driver with ID ${id} not found`);
    }

    // Update approval status
    driver.approvalStatus = DocumentStatus.APPROVED;
    driver.licenseStatus = DocumentStatus.APPROVED; // Also approve license
    driver.approvedAt = new Date();

    if (notes) {
      driver.approvalNotes = notes;
    }

    await driver.save();

    console.log(`[DriversService] ✅ Driver ${id} approved successfully`);

    // Emit event for notifications
    this.eventEmitter.emit('driver.approved', {
      driverId: driver._id.toString(),
      firstName: driver.firstName,
      lastName: driver.lastName,
      email: driver.email,
      phone: driver.phone,
    });

    return driver;
  }

  /**
   * Reject driver (Admin action)
   */
  async rejectDriver(
    id: string,
    rejectionData: {
      rejectedDocuments?: string[];
      reasons?: Record<string, string>;
      globalReason?: string;
    },
  ): Promise<DriverDocument> {
    console.log(`[DriversService] Rejecting driver ${id}`, rejectionData);

    const driver = await this.driverModel.findById(id);
    if (!driver) {
      throw new NotFoundException(`Driver with ID ${id} not found`);
    }

    // Update approval status
    driver.approvalStatus = DocumentStatus.REJECTED;
    driver.rejectedAt = new Date();
    driver.rejectionReasons = rejectionData.reasons || {};
    driver.globalRejectionReason = rejectionData.globalReason || '';
    driver.rejectedDocuments = rejectionData.rejectedDocuments || [];

    await driver.save();

    console.log(`[DriversService] ❌ Driver ${id} rejected`);

    // Emit event for notifications
    this.eventEmitter.emit('driver.rejected', {
      driverId: driver._id.toString(),
      firstName: driver.firstName,
      lastName: driver.lastName,
      email: driver.email,
      phone: driver.phone,
      reasons: rejectionData.reasons,
      globalReason: rejectionData.globalReason,
    });

    return driver;
  }

  /**
   * Upload driver documents for verification (base64)
   */
  async uploadDocuments(
    driverId: string,
    documents: {
      idCardFront?: string;
      idCardBack?: string;
      driverLicense?: string;
      vehicleRegistration?: string;
      vehiclePlate?: string;
      insurance?: string;
      facePhoto?: string;
    },
  ) {
    console.log(`[DriversService] Uploading documents for driver: ${driverId}`);

    const driver = await this.driverModel.findById(driverId);
    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    // Create documents object with base64 data
    const documentsData: any = {};
    const now = new Date();

    // Process each document type
    const documentTypes = [
      'idCardFront',
      'idCardBack',
      'driverLicense',
      'vehicleRegistration',
      'vehiclePlate',
      'insurance',
      'facePhoto',
    ];

    for (const docType of documentTypes) {
      if (documents[docType]) {
        documentsData[docType] = {
          url: documents[docType], // Store base64 string directly
          uploadedAt: now,
        };
      }
    }

    // Update driver with documents
    driver.documents = documentsData;
    driver.documentsSubmittedAt = now;
    driver.verificationStatus = DocumentStatus.PENDING;

    await driver.save();

    console.log(
      `[DriversService] ✅ Documents uploaded successfully for driver: ${driverId}`,
    );

    // Emit event for notifications (optional)
    this.eventEmitter.emit('driver.documents.submitted', {
      driverId: driver._id.toString(),
      firstName: driver.firstName,
      lastName: driver.lastName,
      email: driver.email,
      phone: driver.phone,
    });

    return {
      success: true,
      message: 'Documents uploaded successfully',
      verificationStatus: driver.verificationStatus,
      documentsSubmittedAt: driver.documentsSubmittedAt,
    };
  }

  /**
   * Approve driver documents (Admin action)
   */
  async approveDocuments(driverId: string, notes?: string) {
    console.log(`[DriversService] Approving documents for driver: ${driverId}`);

    const driver = await this.driverModel.findById(driverId);
    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    if (!driver.documents || Object.keys(driver.documents).length === 0) {
      throw new BadRequestException('No documents found for this driver');
    }

    // Update verification status
    driver.verificationStatus = DocumentStatus.APPROVED;
    driver.approvalStatus = DocumentStatus.APPROVED;
    driver.isVerified = true;

    // Clear rejected documents list if any
    driver.rejectedDocuments = [];

    await driver.save();

    console.log(
      `[DriversService] ✅ Documents approved for driver: ${driverId}`,
    );

    // Emit event for notifications
    this.eventEmitter.emit('driver.documents.approved', {
      driverId: driver._id.toString(),
      firstName: driver.firstName,
      lastName: driver.lastName,
      email: driver.email,
      phone: driver.phone,
      notes,
    });

    return {
      success: true,
      message: 'Documents approved successfully',
      verificationStatus: driver.verificationStatus,
      approvalStatus: driver.approvalStatus,
    };
  }

  /**
   * Reject driver documents (Admin action)
   */
  async rejectDocuments(
    driverId: string,
    reason: string,
    rejectedDocuments?: string[],
  ) {
    console.log(`[DriversService] Rejecting documents for driver: ${driverId}`);

    const driver = await this.driverModel.findById(driverId);
    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    if (!driver.documents || Object.keys(driver.documents).length === 0) {
      throw new BadRequestException('No documents found for this driver');
    }

    // Update verification status
    driver.verificationStatus = DocumentStatus.REJECTED;
    driver.approvalStatus = DocumentStatus.REJECTED;
    driver.isVerified = false;

    // Store rejected documents list
    driver.rejectedDocuments = rejectedDocuments || [];

    await driver.save();

    console.log(
      `[DriversService] ❌ Documents rejected for driver: ${driverId}`,
    );

    // Emit event for notifications
    this.eventEmitter.emit('driver.documents.rejected', {
      driverId: driver._id.toString(),
      firstName: driver.firstName,
      lastName: driver.lastName,
      email: driver.email,
      phone: driver.phone,
      reason,
      rejectedDocuments: driver.rejectedDocuments,
    });

    return {
      success: true,
      message: 'Documents rejected',
      verificationStatus: driver.verificationStatus,
      approvalStatus: driver.approvalStatus,
      rejectedDocuments: driver.rejectedDocuments,
      reason,
    };
  }
}
