import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AdminLog, AdminLogDocument, AdminAction } from './schemas/admin-log.schema';
import { SystemConfig, SystemConfigDocument } from './schemas/system-config.schema';
import { SystemConfigDto } from './dto';
import { User } from '../auth/schemas/user.schema';
import { Customer } from '../customers/schemas/customer.schema';
import { Driver } from '../drivers/schemas/driver.schema';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(AdminLog.name) private adminLogModel: Model<AdminLogDocument>,
    @InjectModel(SystemConfig.name) private systemConfigModel: Model<SystemConfigDocument>,
    @InjectModel(User.name) private userModel: Model<any>,
    @InjectModel(Customer.name) private customerModel: Model<any>,
    @InjectModel(Driver.name) private driverModel: Model<any>,
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
      .populate('userId')
      .lean();

    // Fetch drivers
    const drivers = await this.driverModel
      .find()
      .populate('userId')
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
          { role: 'staff' }
        ]
      })
      .lean();

    const users: any[] = [];

    adminUsers.forEach((user: any) => {
      // Filter by search
      if (searchRegex) {
        const matchesSearch = searchRegex.test(user.fullName || user.name || '') || 
                            searchRegex.test(user.email) || 
                            searchRegex.test(user.phone || '');
        if (!matchesSearch) return;
      }

      // Filter by role
      if (role && role !== user.role) return;

      // Filter by status (based on user fields)
      const userStatus = user.isBlocked ? 'blocked' : 'active';
      if (status && status !== userStatus) return;

      users.push({
        _id: user._id,
        name: user.fullName || user.name || 'Chưa có tên',
        email: user.email,
        phone: user.phone || 'N/A',
        role: user.role, // 'admin' or 'staff'
        status: userStatus,
        avatar: `https://i.pravatar.cc/150?u=${user._id}`,
        createdAt: user.createdAt,
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
}
