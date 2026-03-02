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
    const matchStage: any = {};

    if (startDate || endDate) {
      const dateFilter: any = {};
      if (startDate) dateFilter.$gte = new Date(startDate);
      if (endDate) dateFilter.$lte = new Date(endDate);
      matchStage.completedAt = dateFilter;
    }

    // 1. Get revenue from regular rides
    const ridesStats = await this.rideModel.aggregate([
      { $match: { status: 'completed', ...matchStage } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalFare' },
          totalRides: { $sum: 1 },
        },
      },
    ]);

    // 2. Get revenue from combined trips (carpooling)
    const combinedTripsStats = await this.rideRequestModel.aggregate([
      { $match: { status: 'completed', combinedTripId: { $exists: true }, ...matchStage } },
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

    // Combine all sources
    const rides = ridesStats[0] || { totalRevenue: 0, totalRides: 0 };
    const combinedTrips = combinedTripsStats[0] || { totalRevenue: 0, totalRides: 0 };
    const deliveries = deliveriesStats[0] || { totalRevenue: 0, totalRides: 0 };

    const totalRevenue = rides.totalRevenue + combinedTrips.totalRevenue + deliveries.totalRevenue;
    const totalRides = rides.totalRides + combinedTrips.totalRides + deliveries.totalRides;

    console.log('[Admin Revenue Stats]', {
      rides: { revenue: rides.totalRevenue, count: rides.totalRides },
      combinedTrips: { revenue: combinedTrips.totalRevenue, count: combinedTrips.totalRides },
      deliveries: { revenue: deliveries.totalRevenue, count: deliveries.totalRides },
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

    // Merge all sources by date
    const dailyMap = new Map<string, any>();

    [...ridesDaily, ...combinedTripsDaily, ...deliveriesDaily].forEach((item) => {
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
    const matchStage: any = {};
    if (startDate || endDate) {
      const dateFilter: any = {};
      if (startDate) dateFilter.$gte = new Date(startDate);
      if (endDate) dateFilter.$lte = new Date(endDate);
      matchStage.completedAt = dateFilter;
    }

    // Get stats from each source
    const ridesStats = await this.rideModel.aggregate([
      { $match: { status: 'completed', ...matchStage } },
      {
        $group: {
          _id: null,
          revenue: { $sum: '$totalFare' },
          rides: { $sum: 1 },
        },
      },
    ]);

    const combinedTripsStats = await this.rideRequestModel.aggregate([
      { $match: { status: 'completed', combinedTripId: { $exists: true }, ...matchStage } },
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

    const rides = ridesStats[0] || { revenue: 0, rides: 0 };
    const combinedTrips = combinedTripsStats[0] || { revenue: 0, rides: 0 };
    const deliveries = deliveriesStats[0] || { revenue: 0, rides: 0 };

    const totalRides = rides.rides + combinedTrips.rides + deliveries.rides;

    const result = [
      {
        type: 'hire',
        revenue: rides.revenue,
        rides: rides.rides,
        percentage: totalRides > 0 ? ((rides.rides / totalRides) * 100).toFixed(2) : 0,
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
    ];

    console.log('[Admin Revenue By Type]', result);
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
