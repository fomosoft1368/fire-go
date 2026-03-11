import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AdminLog, AdminLogDocument, AdminAction } from './schemas/admin-log.schema';
import { SystemConfig, SystemConfigDocument } from './schemas/system-config.schema';
import { Permission, PermissionDocument } from './schemas/permission.schema';
import { SystemConfigDto, CreateUserDto, UpdateUserDto, UpdateUserPermissionsDto } from './dto';
import { User, UserStatus, UserRole } from '../auth/schemas/user.schema';
import { Customer } from '../customers/schemas/customer.schema';
import { Driver } from '../drivers/schemas/driver.schema';
import { Ride } from '../rides/schemas/ride.schema';
import { RideRequest } from '../combined-trips/schemas/ride-request.schema';
import { Delivery } from '../delivery/schemas/delivery.schema';
import { HourlyService } from '../hourly-services/schemas/hourly-service.schema';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(AdminLog.name) private adminLogModel: Model<AdminLogDocument>,
    @InjectModel(SystemConfig.name) private systemConfigModel: Model<SystemConfigDocument>,
    @InjectModel(Permission.name) private permissionModel: Model<PermissionDocument>,
    @InjectModel(User.name) private userModel: Model<any>,
    @InjectModel(Customer.name) private customerModel: Model<any>,
    @InjectModel(Driver.name) private driverModel: Model<any>,
    @InjectModel(Ride.name) private rideModel: Model<any>,
    @InjectModel(RideRequest.name) private rideRequestModel: Model<any>,
    @InjectModel(Delivery.name) private deliveryModel: Model<any>,
    @InjectModel(HourlyService.name) private hourlyServiceModel: Model<any>,
  ) {}

  // Admin Logging
  async logAdminAction(
    adminId: string,
    action: AdminAction,
    description: string,
    targetUserId?: string,
    oldValue?: string,
    newValue?: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AdminLogDocument> {
    return this.adminLogModel.create({
      adminId,
      action,
      description,
      targetUserId,
      oldValue,
      newValue,
      ipAddress,
      userAgent,
      isSuccess: true,
    });
  }

  async logAdminActionError(
    adminId: string,
    action: AdminAction,
    description: string,
    errorMessage: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AdminLogDocument> {
    return this.adminLogModel.create({
      adminId,
      action,
      description,
      isSuccess: false,
      errorMessage,
      ipAddress,
      userAgent,
    });
  }

  async getAdminLogs(
    adminId?: string,
    action?: AdminAction,
    limit: number = 20,
    skip: number = 0,
  ): Promise<AdminLogDocument[]> {
    const filters: any = {};

    if (adminId) filters.adminId = adminId;
    if (action) filters.action = action;

    return this.adminLogModel
      .find(filters)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);
  }

  // Users Management
  async getUsers(role?: string, status?: string, search?: string): Promise<any[]> {
    const searchRegex = search ? new RegExp(search, 'i') : null;
    
    // Fetch customers
    const customers = await this.customerModel
      .find()
      .lean();

    // Fetch drivers
    const drivers = await this.driverModel
      .find()
      .lean();

    // Map to unified format
    const users: any[] = [];

    // Add customers
    customers.forEach((customer: any) => {
      const userInfo = customer.userId || {};
      const displayName = userInfo.fullName || userInfo.name || 'Chưa có tên';
      
      // Filter by search
      if (searchRegex) {
        const matchesSearch = searchRegex.test(displayName) || 
                            searchRegex.test(userInfo.email) || 
                            searchRegex.test(userInfo.phone);
        if (!matchesSearch) return;
      }

      // Filter by role
      if (role && role !== 'customer') return;

      // Filter by status
      const customerStatus = customer.isBlacklisted ? 'blocked' : 
                            customer.isAccountLocked ? 'inactive' : 'active';
      if (status && status !== customerStatus) return;

      users.push({
        _id: customer._id,
        userId: customer.userId?._id,
        name: displayName,
        email: userInfo.email || 'N/A',
        phone: userInfo.phone || 'N/A',
        role: 'customer',
        status: customerStatus,
        avatar: `https://i.pravatar.cc/150?u=${userInfo._id}`,
        createdAt: customer.createdAt,
      });
    });

    // Add drivers
    drivers.forEach((driver: any) => {
      const userInfo = driver.userId || {};
      const displayName = userInfo.fullName || userInfo.name || 'Chưa có tên';
      
      // Filter by search
      if (searchRegex) {
        const matchesSearch = searchRegex.test(displayName) || 
                            searchRegex.test(userInfo.email) || 
                            searchRegex.test(userInfo.phone);
        if (!matchesSearch) return;
      }

      // Filter by role
      if (role && role !== 'driver') return;

      // Filter by status
      const driverStatus = driver.isSuspended ? 'blocked' : 'active';
      if (status && status !== driverStatus) return;

      users.push({
        _id: driver._id,
        userId: driver.userId?._id,
        name: displayName,
        email: userInfo.email || 'N/A',
        phone: userInfo.phone || 'N/A',
        role: 'driver',
        status: driverStatus,
        avatar: `https://i.pravatar.cc/150?u=${userInfo._id}`,
        createdAt: driver.createdAt,
      });
    });

    return users;
  }

  // Get Admin and Staff Users
  async getAdminUsers(role?: string, status?: string, search?: string): Promise<any[]> {
    const searchRegex = search ? new RegExp(search, 'i') : null;
    
    // Fetch admin/staff users
    const adminUsers = await this.userModel
      .find({
        $or: [
          { role: 'admin' },
          { role: 'staff' },
          { role: 'moderator' },
          { role: 'support' }
        ]
      })
      .lean();

    const users: any[] = [];

    adminUsers.forEach((user: any) => {
      // Build full name from firstName and lastName
      const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Chưa có tên';

      // Filter by search
      if (searchRegex) {
        const matchesSearch = searchRegex.test(fullName) || 
                            searchRegex.test(user.email) || 
                            searchRegex.test(user.phone || '');
        if (!matchesSearch) return;
      }

      // Filter by role
      if (role && role !== user.role) return;

      // Filter by status (based on user fields)
      const userStatus = user.isBlocked ? 'blocked' : (user.status === 'active' ? 'active' : user.status);
      if (status && status !== userStatus) return;

      users.push({
        _id: user._id,
        name: fullName,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone || 'N/A',
        role: user.role,
        status: userStatus,
        department: user.department,
        permissions: user.permissions || [],
        isBlocked: user.isBlocked,
        avatar: `https://i.pravatar.cc/150?u=${user._id}`,
        createdAt: user.createdAt,
        lastActivityAt: user.lastActivityAt,
      });
    });

    return users;
  }

  // System Configuration
  async getConfig(key: string): Promise<SystemConfigDocument> {
    const config = await this.systemConfigModel.findOne({ key });

    if (!config) {
      throw new NotFoundException(`Config with key ${key} not found`);
    }

    return config;
  }

  async getAllConfigs(): Promise<SystemConfigDocument[]> {
    return this.systemConfigModel.find({}).sort({ key: 1 });
  }

  async setConfig(systemConfigDto: SystemConfigDto, adminId: string): Promise<SystemConfigDocument> {
    const config = await this.systemConfigModel.findOneAndUpdate(
      { key: systemConfigDto.key },
      {
        ...systemConfigDto,
        lastModifiedBy: adminId,
        lastModifiedAt: new Date(),
      },
      { upsert: true, new: true },
    );

    // Log the action
    await this.logAdminAction(
      adminId,
      AdminAction.SYSTEM_CONFIG,
      `Updated config: ${systemConfigDto.key}`,
      undefined,
      undefined,
      JSON.stringify(systemConfigDto.value),
    );

    return config;
  }

  async deleteConfig(key: string, adminId: string): Promise<void> {
    const config = await this.getConfig(key);

    if (!config) {
      throw new NotFoundException(`Config with key ${key} not found`);
    }

    await this.systemConfigModel.deleteOne({ key });

    // Log the action
    await this.logAdminAction(
      adminId,
      AdminAction.SYSTEM_CONFIG,
      `Deleted config: ${key}`,
    );
  }

  // Dashboard Stats
  async getDashboardStats(): Promise<any> {
    return {
      systemStatus: 'operational',
      lastUpdated: new Date(),
      timestamp: Date.now(),
    };
  }

  // Search and filter
  async searchUsers(query: string, userType?: string, limit: number = 20): Promise<any[]> {
    // This would integrate with User model
    return [];
  }

  async getReportsData(reportType: string): Promise<any> {
    switch (reportType) {
      case 'rides':
        return this.getRidesReport();
      case 'users':
        return this.getUsersReport();
      case 'revenue':
        return this.getRevenueReport();
      default:
        throw new BadRequestException('Invalid report type');
    }
  }

  private async getRidesReport(): Promise<any> {
    return {
      totalRides: 0,
      completedRides: 0,
      cancelledRides: 0,
      avgRating: 0,
    };
  }

  private async getUsersReport(): Promise<any> {
    return {
      totalUsers: 0,
      activeUsers: 0,
      suspendedUsers: 0,
      newUsersThisMonth: 0,
    };
  }

  private async getRevenueReport(): Promise<any> {
    return {
      totalRevenue: 0,
      monthlyRevenue: 0,
      avgRevenuePerRide: 0,
    };
  }

  // ========== USER MANAGEMENT ==========

  /**
   * Create a new admin/staff user
   */
  async createUser(createUserDto: CreateUserDto): Promise<any> {
    // Check if user already exists
    const existingUser = await this.userModel.findOne({
      $or: [
        { email: createUserDto.email },
        { phone: createUserDto.phone }
      ]
    });

    if (existingUser) {
      throw new ConflictException('Email hoặc số điện thoại đã được sử dụng');
    }

    // Create new user
    const newUser = new this.userModel({
      firstName: createUserDto.firstName,
      lastName: createUserDto.lastName,
      email: createUserDto.email,
      phone: createUserDto.phone,
      password: createUserDto.password,
      role: createUserDto.role,
      status: createUserDto.status || UserStatus.ACTIVE,
      department: createUserDto.department,
      permissions: createUserDto.permissions || [],
      emailVerified: true,
      phoneVerified: true,
      lastActivityAt: new Date(),
    });

    await newUser.save();

    return this.formatUserResponse(newUser);
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<any> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('ID không hợp lệ');
    }

    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    return this.formatUserResponse(user);
  }

  /**
   * Update user information
   */
  async updateUser(userId: string, updateUserDto: UpdateUserDto): Promise<any> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('ID không hợp lệ');
    }

    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    // Check if email/phone already exists (and not same user)
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const emailExists = await this.userModel.findOne({ email: updateUserDto.email });
      if (emailExists) {
        throw new ConflictException('Email đã được sử dụng');
      }
    }

    if (updateUserDto.phone && updateUserDto.phone !== user.phone) {
      const phoneExists = await this.userModel.findOne({ phone: updateUserDto.phone });
      if (phoneExists) {
        throw new ConflictException('Số điện thoại đã được sử dụng');
      }
    }

    // Update fields
    if (updateUserDto.firstName) user.firstName = updateUserDto.firstName;
    if (updateUserDto.lastName) user.lastName = updateUserDto.lastName;
    if (updateUserDto.email) user.email = updateUserDto.email;
    if (updateUserDto.phone) user.phone = updateUserDto.phone;
    if (updateUserDto.role) user.role = updateUserDto.role;
    if (updateUserDto.department) user.department = updateUserDto.department;
    if (updateUserDto.status) user.status = updateUserDto.status;
    if (updateUserDto.isBlocked !== undefined) user.isBlocked = updateUserDto.isBlocked;
    if (updateUserDto.blockedReason) user.blockedReason = updateUserDto.blockedReason;

    user.lastActivityAt = new Date();
    await user.save();

    return this.formatUserResponse(user);
  }

  /**
   * Update user permissions
   */
  async updateUserPermissions(userId: string, updatePermissionsDto: UpdateUserPermissionsDto): Promise<any> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('ID không hợp lệ');
    }

    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    user.permissions = updatePermissionsDto.permissions;
    user.lastActivityAt = new Date();
    await user.save();

    return this.formatUserResponse(user);
  }

  /**
   * Delete a user
   */
  async deleteUser(userId: string): Promise<{ message: string }> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('ID không hợp lệ');
    }

    const user = await this.userModel.findByIdAndDelete(userId);
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    return { message: 'Xóa người dùng thành công' };
  }

  /**
   * Get actual revenue stats from all sources (Rides + Combined Trips + Deliveries)
   */
  async getActualRevenueStats(startDate?: Date, endDate?: Date): Promise<any> {
    // Build date filter using updatedAt (since completedAt may not exist)
    const ridesMatchStage: any = { status: 'completed' };
    if (startDate || endDate) {
      const dateFilter: any = {};
      if (startDate) dateFilter.$gte = new Date(startDate);
      if (endDate) dateFilter.$lte = new Date(endDate);
      ridesMatchStage.updatedAt = dateFilter;
    }

    // 1. Get revenue from regular rides
    const ridesStats = await this.rideModel.aggregate([
      { $match: ridesMatchStage },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalFare' },
          totalRides: { $sum: 1 },
        },
      },
    ]);

    // 2. Get revenue from combined trips (carpooling)
    const combinedMatchStage: any = { status: 'completed', combinedTripId: { $exists: true } };
    if (startDate || endDate) {
      const dateFilter: any = {};
      if (startDate) dateFilter.$gte = new Date(startDate);
      if (endDate) dateFilter.$lte = new Date(endDate);
      combinedMatchStage.updatedAt = dateFilter;
    }
    const combinedTripsStats = await this.rideRequestModel.aggregate([
      { $match: combinedMatchStage },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$fare' },
          totalRides: { $sum: 1 },
        },
      },
    ]);

    // 3. Get revenue from deliveries
    const deliveryMatchStage: any = { status: 'delivered' };
    if (startDate || endDate) {
      const dateFilter: any = {};
      if (startDate) dateFilter.$gte = new Date(startDate);
      if (endDate) dateFilter.$lte = new Date(endDate);
      deliveryMatchStage.deliveredAt = dateFilter;
    }

    const deliveriesStats = await this.deliveryModel.aggregate([
      { $match: deliveryMatchStage },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$fare' },
          totalRides: { $sum: 1 },
        },
      },
    ]);

    // 4. Get revenue from hourly services (cleaning)
    const hourlyMatchStage: any = { status: 'completed' };
    if (startDate || endDate) {
      const dateFilter: any = {};
      if (startDate) dateFilter.$gte = new Date(startDate);
      if (endDate) dateFilter.$lte = new Date(endDate);
      hourlyMatchStage.endTime = dateFilter;
    }

    const hourlyServicesStats = await this.hourlyServiceModel.aggregate([
      { $match: hourlyMatchStage },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: { $ifNull: ['$actualPrice', '$estimatedPrice'] } },
          totalRides: { $sum: 1 },
        },
      },
    ]);

    // Combine all sources
    const rides = ridesStats[0] || { totalRevenue: 0, totalRides: 0 };
    const combinedTrips = combinedTripsStats[0] || { totalRevenue: 0, totalRides: 0 };
    const deliveries = deliveriesStats[0] || { totalRevenue: 0, totalRides: 0 };
    const hourlyServices = hourlyServicesStats[0] || { totalRevenue: 0, totalRides: 0 };

    const totalRevenue = rides.totalRevenue + combinedTrips.totalRevenue + deliveries.totalRevenue + hourlyServices.totalRevenue;
    const totalRides = rides.totalRides + combinedTrips.totalRides + deliveries.totalRides + hourlyServices.totalRides;

    console.log('[Admin Revenue Stats]', {
      rides: { revenue: rides.totalRevenue, count: rides.totalRides },
      combinedTrips: { revenue: combinedTrips.totalRevenue, count: combinedTrips.totalRides },
      deliveries: { revenue: deliveries.totalRevenue, count: deliveries.totalRides },
      hourlyServices: { revenue: hourlyServices.totalRevenue, count: hourlyServices.totalRides },
      total: { revenue: totalRevenue, count: totalRides },
    });

    return {
      totalRevenue,
      totalRides,
      averageFare: totalRides > 0 ? totalRevenue / totalRides : 0,
      breakdown: {
        rides: rides.totalRevenue,
        combinedTrips: combinedTrips.totalRevenue,
        deliveries: deliveries.totalRevenue,
        hourlyServices: hourlyServices.totalRevenue,
      },
    };
  }

  /**
   * Get daily revenue from all sources
   */
  async getDailyRevenueAll(days: number = 7): Promise<any[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // 1. Daily revenue from rides
    const ridesDaily = await this.rideModel.aggregate([
      {
        $match: {
          status: 'completed',
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
        },
      },
    ]);

    // 2. Daily revenue from combined trips
    const combinedTripsDaily = await this.rideRequestModel.aggregate([
      {
        $match: {
          status: 'completed',
          combinedTripId: { $exists: true },
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
          revenue: { $sum: '$fare' },
          rides: { $sum: 1 },
        },
      },
    ]);

    // 3. Daily revenue from deliveries
    const deliveriesDaily = await this.deliveryModel.aggregate([
      {
        $match: {
          status: 'delivered',
          deliveredAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$deliveredAt' },
            month: { $month: '$deliveredAt' },
            day: { $dayOfMonth: '$deliveredAt' },
          },
          revenue: { $sum: '$fare' },
          rides: { $sum: 1 },
        },
      },
    ]);

    // 4. Daily revenue from hourly services (cleaning)
    const hourlyServicesDaily = await this.hourlyServiceModel.aggregate([
      {
        $match: {
          status: 'completed',
          endTime: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$endTime' },
            month: { $month: '$endTime' },
            day: { $dayOfMonth: '$endTime' },
          },
          revenue: { $sum: { $ifNull: ['$actualPrice', '$estimatedPrice'] } },
          rides: { $sum: 1 },
        },
      },
    ]);

    // Merge all sources by date
    const dailyMap = new Map<string, any>();

    [...ridesDaily, ...combinedTripsDaily, ...deliveriesDaily, ...hourlyServicesDaily].forEach((item) => {
      const key = `${item._id.year}-${item._id.month}-${item._id.day}`;
      if (!dailyMap.has(key)) {
        dailyMap.set(key, {
          _id: item._id,
          revenue: 0,
          rides: 0,
        });
      }
      const existing = dailyMap.get(key);
      existing.revenue += item.revenue;
      existing.rides += item.rides;
    });

    // Convert to array and sort
    const result = Array.from(dailyMap.values())
      .sort((a, b) => {
        const dateA = new Date(a._id.year, a._id.month - 1, a._id.day);
        const dateB = new Date(b._id.year, b._id.month - 1, b._id.day);
        return dateA.getTime() - dateB.getTime();
      })
      .map((item) => ({
        date: new Date(item._id.year, item._id.month - 1, item._id.day),
        day: item._id.day,
        month: `T${item._id.month}`,
        revenue: item.revenue,
        rides: item.rides,
      }));

    console.log('[Admin Daily Revenue]', result);
    return result;
  }

  /**
   * Get revenue by service type from all sources
   */
  async getRevenueByServiceType(startDate?: Date, endDate?: Date): Promise<any[]> {
    // Build date filter for rides (use updatedAt since completedAt may not exist)
    const ridesMatchStage: any = { status: 'completed' };
    if (startDate || endDate) {
      const dateFilter: any = {};
      if (startDate) dateFilter.$gte = new Date(startDate);
      if (endDate) dateFilter.$lte = new Date(endDate);
      ridesMatchStage.updatedAt = dateFilter;
    }

    // Get stats from each source (each service = 1 separate table)
    // 1. Hire rides (Lái xe hộ) - ALL completed rides from rides table
    const hireRidesStats = await this.rideModel.aggregate([
      { $match: ridesMatchStage },
      {
        $group: {
          _id: null,
          revenue: { $sum: '$totalFare' },
          rides: { $sum: 1 },
        },
      },
    ]);

    // 2. Share rides (Ghép xe) - ONLY from riderequests/combined_trips table  
    const combinedMatchStage: any = { status: 'completed', combinedTripId: { $exists: true } };
    if (startDate || endDate) {
      const dateFilter: any = {};
      if (startDate) dateFilter.$gte = new Date(startDate);
      if (endDate) dateFilter.$lte = new Date(endDate);
      combinedMatchStage.updatedAt = dateFilter;
    }
    const combinedTripsStats = await this.rideRequestModel.aggregate([
      { $match: combinedMatchStage },
      {
        $group: {
          _id: null,
          revenue: { $sum: '$fare' },
          rides: { $sum: 1 },
        },
      },
    ]);

    const deliveryMatchStage: any = { status: 'delivered' };
    if (startDate || endDate) {
      const dateFilter: any = {};
      if (startDate) dateFilter.$gte = new Date(startDate);
      if (endDate) dateFilter.$lte = new Date(endDate);
      deliveryMatchStage.deliveredAt = dateFilter;
    }

    const deliveriesStats = await this.deliveryModel.aggregate([
      { $match: deliveryMatchStage },
      {
        $group: {
          _id: null,
          revenue: { $sum: '$fare' },
          rides: { $sum: 1 },
        },
      },
    ]);

    // 4. Get revenue from hourly services (cleaning)
    const hourlyMatchStage: any = { status: 'completed' };
    if (startDate || endDate) {
      const dateFilter: any = {};
      if (startDate) dateFilter.$gte = new Date(startDate);
      if (endDate) dateFilter.$lte = new Date(endDate);
      hourlyMatchStage.endTime = dateFilter;
    }

    const hourlyServicesStats = await this.hourlyServiceModel.aggregate([
      { $match: hourlyMatchStage },
      {
        $group: {
          _id: null,
          revenue: { $sum: { $ifNull: ['$actualPrice', '$estimatedPrice'] } },
          rides: { $sum: 1 },
        },
      },
    ]);

    const hireRides = hireRidesStats[0] || { revenue: 0, rides: 0 };
    const combinedTrips = combinedTripsStats[0] || { revenue: 0, rides: 0 };
    const deliveries = deliveriesStats[0] || { revenue: 0, rides: 0 };
    const hourlyServices = hourlyServicesStats[0] || { revenue: 0, rides: 0 };

    const totalRides = hireRides.rides + combinedTrips.rides + deliveries.rides + hourlyServices.rides;
    const totalRevenue = hireRides.revenue + combinedTrips.revenue + deliveries.revenue + hourlyServices.revenue;

    const result = [
      {
        type: 'hire',
        revenue: hireRides.revenue,
        rides: hireRides.rides,
        percentage: totalRides > 0 ? ((hireRides.rides / totalRides) * 100).toFixed(2) : 0,
      },
      {
        type: 'share',
        revenue: combinedTrips.revenue,
        rides: combinedTrips.rides,
        percentage: totalRides > 0 ? ((combinedTrips.rides / totalRides) * 100).toFixed(2) : 0,
      },
      {
        type: 'delivery',
        revenue: deliveries.revenue,
        rides: deliveries.rides,
        percentage: totalRides > 0 ? ((deliveries.rides / totalRides) * 100).toFixed(2) : 0,
      },
      {
        type: 'hourly',
        revenue: hourlyServices.revenue,
        rides: hourlyServices.rides,
        percentage: totalRides > 0 ? ((hourlyServices.rides / totalRides) * 100).toFixed(2) : 0,
      },
    ];

    console.log('[Admin Revenue By Type]', result);
    console.log('[Admin Revenue By Type Details]', {
      hireRides: `${hireRides.rides} rides, ${hireRides.revenue} VND`,
      combinedTrips: `${combinedTrips.rides} trips, ${combinedTrips.revenue} VND`,
      deliveries: `${deliveries.rides} deliveries, ${deliveries.revenue} VND`,
      hourlyServices: `${hourlyServices.rides} services, ${hourlyServices.revenue} VND`,
      totalRides,
      totalRevenue,
    });
    return result;
  }

  /**
   * Get peak hours analysis (actual data from all sources)
   */
  async getPeakHours(startDate?: Date, endDate?: Date): Promise<any[]> {
    // Build date filter
    const dateFilter: any = {};
    if (startDate) dateFilter.$gte = startDate;
    if (endDate) dateFilter.$lte = endDate;

    const matchStage: any = { status: 'completed' };
    if (startDate || endDate) {
      matchStage.updatedAt = dateFilter;
    }

    // Aggregate rides by hour from all sources
    const ridesByHour = await this.rideModel.aggregate([
      { $match: matchStage },
      {
        $project: {
          hour: { $hour: '$updatedAt' },
          totalFare: 1,
        },
      },
      {
        $group: {
          _id: '$hour',
          rides: { $sum: 1 },
          revenue: { $sum: '$totalFare' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Aggregate from combined trips
    const combinedByHour = await this.rideRequestModel.aggregate([
      { $match: { ...matchStage, combinedTripId: { $exists: true } } },
      {
        $project: {
          hour: { $hour: '$updatedAt' },
          fare: 1,
        },
      },
      {
        $group: {
          _id: '$hour',
          rides: { $sum: 1 },
          revenue: { $sum: '$fare' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Aggregate from deliveries
    const deliveriesByHour = await this.deliveryModel.aggregate([
      { $match: matchStage },
      {
        $project: {
          hour: { $hour: '$updatedAt' },
          totalFare: 1,
        },
      },
      {
        $group: {
          _id: '$hour',
          rides: { $sum: 1 },
          revenue: { $sum: '$totalFare' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Aggregate from hourly services
    const hourlyByHour = await this.hourlyServiceModel.aggregate([
      { $match: matchStage },
      {
        $project: {
          hour: { $hour: '$updatedAt' },
          totalFare: 1,
        },
      },
      {
        $group: {
          _id: '$hour',
          rides: { $sum: 1 },
          revenue: { $sum: '$totalFare' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Combine all data by hour (0-23)
    const result = [];
    for (let hour = 0; hour < 24; hour++) {
      const ridesData = ridesByHour.find(r => r._id === hour) || { rides: 0, revenue: 0 };
      const combinedData = combinedByHour.find(r => r._id === hour) || { rides: 0, revenue: 0 };
      const deliveryData = deliveriesByHour.find(r => r._id === hour) || { rides: 0, revenue: 0 };
      const hourlyData = hourlyByHour.find(r => r._id === hour) || { rides: 0, revenue: 0 };

      result.push({
        hour,
        rides: ridesData.rides + combinedData.rides + deliveryData.rides + hourlyData.rides,
        revenue: ridesData.revenue + combinedData.revenue + deliveryData.revenue + hourlyData.revenue,
      });
    }

    return result;
  }

  /**
   * Get area/district performance (actual data from all sources)
   */
  async getAreaPerformance(startDate?: Date, endDate?: Date): Promise<any[]> {
    // Build date filter
    const dateFilter: any = {};
    if (startDate) dateFilter.$gte = startDate;
    if (endDate) dateFilter.$lte = endDate;

    const matchStage: any = { status: 'completed' };
    if (startDate || endDate) {
      matchStage.updatedAt = dateFilter;
    }

    // Get rides grouped by pickup location
    const ridesByArea = await this.rideModel.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$pickupLocation',
          rides: { $sum: 1 },
          revenue: { $sum: '$totalFare' },
        },
      },
      { $sort: { rides: -1 } },
      { $limit: 10 },
    ]);

    // Get combined trips grouped by pickup location
    const combinedByArea = await this.rideRequestModel.aggregate([
      { $match: { ...matchStage, combinedTripId: { $exists: true } } },
      {
        $group: {
          _id: '$pickupLocation',
          rides: { $sum: 1 },
          revenue: { $sum: '$fare' },
        },
      },
      { $sort: { rides: -1 } },
      { $limit: 10 },
    ]);

    // Get deliveries grouped by pickup location
    const deliveriesByArea = await this.deliveryModel.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$pickupLocation',
          rides: { $sum: 1 },
          revenue: { $sum: '$totalFare' },
        },
      },
      { $sort: { rides: -1 } },
      { $limit: 10 },
    ]);

    // Merge all data by location
    const areaMap = new Map();

    // Process rides
    ridesByArea.forEach(area => {
      const location = area._id || 'Không rõ';
      if (!areaMap.has(location)) {
        areaMap.set(location, { rides: 0, revenue: 0 });
      }
      const current = areaMap.get(location);
      current.rides += area.rides;
      current.revenue += area.revenue;
    });

    // Process combined trips
    combinedByArea.forEach(area => {
      const location = area._id || 'Không rõ';
      if (!areaMap.has(location)) {
        areaMap.set(location, { rides: 0, revenue: 0 });
      }
      const current = areaMap.get(location);
      current.rides += area.rides;
      current.revenue += area.revenue;
    });

    // Process deliveries
    deliveriesByArea.forEach(area => {
      const location = area._id || 'Không rõ';
      if (!areaMap.has(location)) {
        areaMap.set(location, { rides: 0, revenue: 0 });
      }
      const current = areaMap.get(location);
      current.rides += area.rides;
      current.revenue += area.revenue;
    });

    // Convert to array and sort by rides
    const result = Array.from(areaMap.entries())
      .map(([location, data]) => ({
        name: location,
        rides: data.rides,
        revenue: data.revenue,
      }))
      .sort((a, b) => b.rides - a.rides)
      .slice(0, 10);

    // Calculate total for percentage
    const totalRides = result.reduce((sum, area) => sum + area.rides, 0);

    // Add percentage
    return result.map(area => ({
      ...area,
      percentage: totalRides > 0 ? Math.round((area.rides / totalRides) * 100) : 0,
    }));
  }

  /**
   * Get cancel rate statistics (actual data from all sources)
   */
  async getCancelRate(startDate?: Date, endDate?: Date): Promise<any> {
    // Build date filter
    const dateFilter: any = {};
    if (startDate) dateFilter.$gte = startDate;
    if (endDate) dateFilter.$lte = endDate;

    const matchStage: any = {};
    if (startDate || endDate) {
      matchStage.updatedAt = dateFilter;
    }

    // Aggregate rides
    const ridesStats = await this.rideModel.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
          },
          cancelled: {
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] },
          },
        },
      },
    ]);

    // Aggregate combined trips
    const combinedStats = await this.rideRequestModel.aggregate([
      { $match: { ...matchStage, combinedTripId: { $exists: true } } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
          },
          cancelled: {
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] },
          },
        },
      },
    ]);

    // Aggregate deliveries
    const deliveryStats = await this.deliveryModel.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
          },
          cancelled: {
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] },
          },
        },
      },
    ]);

    // Aggregate hourly services
    const hourlyStats = await this.hourlyServiceModel.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
          },
          cancelled: {
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] },
          },
        },
      },
    ]);

    // Combine all statistics
    const rides = ridesStats[0] || { total: 0, completed: 0, cancelled: 0 };
    const combined = combinedStats[0] || { total: 0, completed: 0, cancelled: 0 };
    const deliveries = deliveryStats[0] || { total: 0, completed: 0, cancelled: 0 };
    const hourly = hourlyStats[0] || { total: 0, completed: 0, cancelled: 0 };

    const totalRides = rides.total + combined.total + deliveries.total + hourly.total;
    const totalCompleted = rides.completed + combined.completed + deliveries.completed + hourly.completed;
    const totalCancelled = rides.cancelled + combined.cancelled + deliveries.cancelled + hourly.cancelled;

    const cancelRate = totalRides > 0 ? (totalCancelled / totalRides) * 100 : 0;

    return {
      totalRides,
      totalCompleted,
      totalCancelled,
      cancelRate: parseFloat(cancelRate.toFixed(1)),
    };
  }

  /**
   * Get top drivers by total trips from all sources (rides, combined trips, deliveries, hourly services)
   */
  async getTopDrivers(limit: number = 10, startDate?: Date, endDate?: Date): Promise<any[]> {
    const dateFilter: any = {};
    if (startDate) dateFilter.$gte = startDate;
    if (endDate) dateFilter.$lte = endDate;

    const matchStage: any = { status: 'completed' };
    if (startDate || endDate) {
      matchStage.updatedAt = dateFilter;
    }

    // Aggregate drivers from rides
    const ridesByDriver = await this.rideModel.aggregate([
      { 
        $match: { 
          ...matchStage,
          driverId: { $ne: null, $exists: true }
        } 
      },
      {
        $group: {
          _id: '$driverId',
          trips: { $sum: 1 },
          earnings: { $sum: '$totalFare' },
        },
      },
    ]);

    // Aggregate drivers from combined trips
    const combinedByDriver = await this.rideRequestModel.aggregate([
      { 
        $match: { 
          ...matchStage,
          driverId: { $ne: null, $exists: true }
        } 
      },
      {
        $group: {
          _id: '$driverId',
          trips: { $sum: 1 },
          earnings: { $sum: '$totalFare' },
        },
      },
    ]);

    // Aggregate drivers from deliveries
    const deliveriesByDriver = await this.deliveryModel.aggregate([
      { 
        $match: { 
          ...matchStage,
          driverId: { $ne: null, $exists: true }
        } 
      },
      {
        $group: {
          _id: '$driverId',
          trips: { $sum: 1 },
          earnings: { $sum: '$totalFare' },
        },
      },
    ]);

    // Aggregate drivers from hourly services
    const hourlyByDriver = await this.hourlyServiceModel.aggregate([
      { 
        $match: { 
          ...matchStage,
          driverId: { $ne: null, $exists: true }
        } 
      },
      {
        $group: {
          _id: '$driverId',
          trips: { $sum: 1 },
          earnings: { $sum: '$totalFare' },
        },
      },
    ]);

    console.log('[TopDrivers] Aggregation results:');
    console.log(`  - Rides: ${ridesByDriver.length} drivers`);
    console.log(`  - Combined: ${combinedByDriver.length} drivers`);
    console.log(`  - Deliveries: ${deliveriesByDriver.length} drivers`);
    console.log(`  - Hourly: ${hourlyByDriver.length} drivers`);

    // Merge all data by driver ID
    const driverMap = new Map();

    // Process all sources
    [ridesByDriver, combinedByDriver, deliveriesByDriver, hourlyByDriver].forEach(dataSet => {
      dataSet.forEach(driver => {
        const driverId = driver._id?.toString();
        if (!driverId) return;

        if (!driverMap.has(driverId)) {
          driverMap.set(driverId, { trips: 0, earnings: 0 });
        }
        const current = driverMap.get(driverId);
        current.trips += driver.trips || 0;
        current.earnings += driver.earnings || 0;
      });
    });

    // Convert to array and sort by trips
    const driversArray = Array.from(driverMap.entries())
      .map(([driverId, data]) => ({
        driverId,
        trips: data.trips,
        earnings: data.earnings,
      }))
      .sort((a, b) => b.trips - a.trips)
      .slice(0, limit);

    console.log(`[TopDrivers] Found ${driversArray.length} drivers before lookup, limit: ${limit}`);
    driversArray.forEach((d, i) => {
      console.log(`  ${i + 1}. Driver ${d.driverId}: ${d.trips} trips, ${d.earnings} earnings`);
    });

    // Lookup driver details from drivers collection
    const result = [];
    for (const driverData of driversArray) {
      try {
        // Convert string to ObjectId if needed
        const driverObjectId = new Types.ObjectId(driverData.driverId);
        const driver = await this.driverModel.findById(driverObjectId);
        
        if (driver) {
          result.push({
            driverId: driverData.driverId,
            name: driver.fullName || `${driver.firstName || ''} ${driver.lastName || ''}`.trim() || 'Không rõ',
            avatar: driver.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${driverData.driverId}`,
            rating: driver.averageRating ? Math.round(driver.averageRating * 10) / 10 : 0,
            trips: driverData.trips,
            earnings: Math.round(driverData.earnings),
          });
          console.log(`[TopDrivers] ✓ Found driver: ${driver.fullName || driver.firstName}`);
        } else {
          console.log(`[TopDrivers] ✗ Driver not found in drivers collection: ${driverData.driverId}`);
        }
      } catch (error) {
        console.error(`[TopDrivers] Error fetching driver ${driverData.driverId}:`, error.message);
      }
    }

    console.log(`[TopDrivers] Returning ${result.length} drivers`);
    return result;
  }

  /**
   * Format user response
   */
  private formatUserResponse(user: any) {
    return {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
      department: user.department,
      permissions: user.permissions || [],
      isBlocked: user.isBlocked,
      avatar: `https://i.pravatar.cc/150?u=${user._id}`,
      createdAt: user.createdAt,
      lastActivityAt: user.lastActivityAt,
    };
  }
}
