import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Driver, DriverDocument, DriverStatus } from './schemas/driver.schema';
import { CreateDriverDto, UpdateDriverDto, UpdateLocationDto } from './dto';

@Injectable()
export class DriversService {
  constructor(
    @InjectModel(Driver.name) private driverModel: Model<DriverDocument>,
    @InjectModel('Ride') private rideModel: Model<any>,
    @InjectModel('CombinedTrip') private combinedTripModel: Model<any>,
    @InjectModel('Delivery') private deliveryModel: Model<any>,
    @InjectModel('PricingConfig') private pricingConfigModel: Model<any>,
    private eventEmitter: EventEmitter2,
  ) {}

  async create(userId: string, createDriverDto: CreateDriverDto): Promise<DriverDocument> {
    const driverData: any = {
      ...createDriverDto,
      status: DriverStatus.OFFLINE,
    };

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
    const driver = await this.driverModel
      .findOne({ userId: new Types.ObjectId(userId) });

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

  /**
   * Get all available drivers (online and accepting rides)
   */
  async getAvailableDrivers() {
    return this.driverModel.find({
      status: { $ne: DriverStatus.OFFLINE },
      isSuspended: false,
      isAcceptingRides: true,
      currentLocation: { $exists: true }, // Must have location
    }).sort({ createdAt: -1 });
  }

  async updateStatus(driverId: string, status: DriverStatus): Promise<DriverDocument> {
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
    
    console.log(`[DriversService] Updating driver ${driverId} status to ${status}, isOnline=${isOnline}, isAvailable=${isOnline}`);
    
    if (isOnline) {
      updateData.lastOnlineTime = new Date();
    }

    return this.driverModel.findByIdAndUpdate(
      driverId,
      updateData,
      { new: true },
    );
  }

  async updateLocation(driverId: string, updateLocationDto: UpdateLocationDto): Promise<DriverDocument> {
    console.log('[DriversService] 📍 Updating driver location:', {
      driverId,
      coordinates: updateLocationDto.coordinates,
      timestamp: new Date().toISOString()
    })
    
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
    )
    
    if (updatedDriver) {
      console.log('[DriversService] ✅ Location updated successfully:', {
        driverId: updatedDriver._id,
        name: `${updatedDriver.firstName} ${updatedDriver.lastName}`,
        coordinates: updatedDriver.currentLocation?.coordinates
      })
    } else {
      console.error('[DriversService] ❌ Driver not found:', driverId)
    }
    
    return updatedDriver
  }

  async update(driverId: string, updateDriverDto: UpdateDriverDto): Promise<DriverDocument> {
    try {
      console.log('[DriversService] Updating driver:', driverId);
      console.log('[DriversService] Update data:', JSON.stringify(updateDriverDto));
      
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
      const driver = await this.findById(driverId);
      if (!driver) {
        throw new NotFoundException('Driver not found');
      }

      // Get pricing config to get driverShare percentage
      const pricingConfigs = await this.pricingConfigModel.find({}).limit(1);
      const driverShare = pricingConfigs?.[0]?.driverShare || 80; // Default 80% if not found

      console.log(`[getTodayEarnings] Driver: ${driver.firstName} ${driver.lastName}`);
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

      console.log(`[getTodayEarnings] Today range: ${today.toISOString()} to ${tomorrow.toISOString()}`);
      console.log(`[getTodayEarnings] Yesterday range: ${yesterday.toISOString()} to ${today.toISOString()}`);

      // ===== TODAY'S EARNINGS =====
      
      // 1. Completed RIDES (lái xe hộ)
      const completedRides = await this.rideModel.find({
        driverId: new Types.ObjectId(driverId),
        status: 'completed',
        createdAt: { $gte: today, $lt: tomorrow },
      }).select('totalFare');

      const ridesTodayTotal = completedRides.reduce((sum, ride) => sum + (ride.totalFare || 0), 0);
      const ridesTodayEarnings = Math.round((ridesTodayTotal * driverShare) / 100);

      console.log(`[getTodayEarnings] Today - Rides: ${completedRides.length} trips, Total: ${ridesTodayTotal}, Driver share: ${ridesTodayEarnings}`);

      // 2. Completed COMBINED TRIPS (ghép xe)
      // For combined trips, sum up the fare from each completed ride request
      const completedCombinedTrips = await this.combinedTripModel.find({
        driverId: new Types.ObjectId(driverId),
        status: 'completed',
        createdAt: { $gte: today, $lt: tomorrow },
      }).populate('rideRequests');

      let combinedTodayTotal = 0;
      let completedRequestsCount = 0;

      for (const trip of completedCombinedTrips) {
        // Calculate total fare from passenger requests
        if (trip.rideRequests && Array.isArray(trip.rideRequests)) {
          for (const request of trip.rideRequests) {
            if (request.status === 'completed' && request.fare) {
              combinedTodayTotal += request.fare;
              completedRequestsCount++;
            }
          }
        } else if (trip.totalFare) {
          // Fallback to trip total if no requests breakdown
          combinedTodayTotal += trip.totalFare;
          completedRequestsCount++;
        }
      }

      const combinedTodayEarnings = Math.round((combinedTodayTotal * driverShare) / 100);

      console.log(`[getTodayEarnings] Today - Combined: ${completedCombinedTrips.length} trips, ${completedRequestsCount} requests, Total: ${combinedTodayTotal}, Driver share: ${combinedTodayEarnings}`);

      // 3. Completed DELIVERIES
      const completedDeliveries = await this.deliveryModel.find({
        driverId: new Types.ObjectId(driverId),
        status: 'delivered',
        createdAt: { $gte: today, $lt: tomorrow },
      }).select('estimatedPrice');

      const deliveriesTodayTotal = completedDeliveries.reduce((sum, delivery) => {
        const price = typeof delivery.estimatedPrice === 'string' 
          ? parseInt(delivery.estimatedPrice, 10) 
          : (delivery.estimatedPrice || 0);
        return sum + price;
      }, 0);

      const deliveriesTodayEarnings = Math.round((deliveriesTodayTotal * driverShare) / 100);

      console.log(`[getTodayEarnings] Today - Deliveries: ${completedDeliveries.length} deliveries, Total: ${deliveriesTodayTotal}, Driver share: ${deliveriesTodayEarnings}`);

      // TOTAL TODAY
      const todayTotal = ridesTodayEarnings + combinedTodayEarnings + deliveriesTodayEarnings;
      const todayTripsCount = completedRides.length + completedCombinedTrips.length + completedDeliveries.length;

      // ===== YESTERDAY'S EARNINGS (for trend calculation) =====

      const completedRidesYesterday = await this.rideModel.find({
        driverId: new Types.ObjectId(driverId),
        status: 'completed',
        createdAt: { $gte: yesterday, $lt: today },
      }).select('totalFare');

      const ridesYesterdayTotal = completedRidesYesterday.reduce((sum, ride) => sum + (ride.totalFare || 0), 0);
      const ridesYesterdayEarnings = Math.round((ridesYesterdayTotal * driverShare) / 100);

      const completedCombinedTripsYesterday = await this.combinedTripModel.find({
        driverId: new Types.ObjectId(driverId),
        status: 'completed',
        createdAt: { $gte: yesterday, $lt: today },
      }).populate('rideRequests');

      let combinedYesterdayTotal = 0;

      for (const trip of completedCombinedTripsYesterday) {
        if (trip.rideRequests && Array.isArray(trip.rideRequests)) {
          for (const request of trip.rideRequests) {
            if (request.status === 'completed' && request.fare) {
              combinedYesterdayTotal += request.fare;
            }
          }
        } else if (trip.totalFare) {
          combinedYesterdayTotal += trip.totalFare;
        }
      }

      const combinedYesterdayEarnings = Math.round((combinedYesterdayTotal * driverShare) / 100);

      const completedDeliveriesYesterday = await this.deliveryModel.find({
        driverId: new Types.ObjectId(driverId),
        status: 'delivered',
        createdAt: { $gte: yesterday, $lt: today },
      }).select('estimatedPrice');

      const deliveriesYesterdayTotal = completedDeliveriesYesterday.reduce((sum, delivery) => {
        const price = typeof delivery.estimatedPrice === 'string' 
          ? parseInt(delivery.estimatedPrice, 10) 
          : (delivery.estimatedPrice || 0);
        return sum + price;
      }, 0);

      const deliveriesYesterdayEarnings = Math.round((deliveriesYesterdayTotal * driverShare) / 100);

      // TOTAL YESTERDAY
      const yesterdayTotal = ridesYesterdayEarnings + combinedYesterdayEarnings + deliveriesYesterdayEarnings;

      // CALCULATE TREND
      let increase = 0;
      if (yesterdayTotal === 0 && todayTotal > 0) {
        increase = 100; // Was 0, now has earnings
      } else if (yesterdayTotal > 0) {
        increase = Math.round(((todayTotal - yesterdayTotal) / yesterdayTotal) * 100);
      }

      console.log(`[getTodayEarnings] Trend: ${yesterdayTotal} yesterday → ${todayTotal} today (${increase}%)`);

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
      console.error('[getTodayEarnings] Error:', error);
      throw error;
    }
  }

  async toggleAcceptingRides(
    driverId: string,
    isAcceptingRides: boolean,
  ): Promise<DriverDocument> {
    const driver = await this.findById(driverId);

    if (driver.isSuspended) {
      throw new BadRequestException('Driver is suspended and cannot accept rides');
    }

    return this.driverModel.findByIdAndUpdate(
      driverId,
      { isAcceptingRides },
      { new: true },
    );
  }

  /**
   * Set driver online status
   */
  async updateOnlineStatus(driverId: string, isOnline: boolean): Promise<DriverDocument> {
    const updateData: any = { 
      isOnline,
      status: isOnline ? 'online' : 'offline',
      isAvailable: isOnline,
    };
    if (isOnline) {
      updateData.lastOnlineTime = new Date();
    }

    const updated = await this.driverModel.findByIdAndUpdate(
      driverId,
      updateData,
      { new: true },
    );

    if (!updated) {
      throw new NotFoundException(`Driver ${driverId} not found`);
    }

    console.log(`[DriversService] Driver ${driverId} online status updated to:`, isOnline, 'status:', updateData.status, 'available:', isOnline);
    return updated;
  }

  /**
   * Set driver available status for auto-assign
   */
  async updateAvailableStatus(driverId: string, isAvailable: boolean): Promise<DriverDocument> {
    const updated = await this.driverModel.findByIdAndUpdate(
      driverId,
      { isAvailable },
      { new: true },
    );

    if (!updated) {
      throw new NotFoundException(`Driver ${driverId} not found`);
    }

    console.log(`[DriversService] Driver ${driverId} available status updated to:`, isAvailable);
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
      }
    );

    if (result.modifiedCount > 0) {
      console.log(`[DriversService] Auto-offlined ${result.modifiedCount} inactive drivers`);
    }
  }
}