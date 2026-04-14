import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
  Patch,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import {
  SystemConfigDto,
  CreateUserDto,
  UpdateUserDto,
  UpdateUserPermissionsDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // Dashboard
  @Get('dashboard')
  async getDashboard() {
    return this.adminService.getDashboardStats();
  }

  // Revenue Analytics (from all sources: rides + combined trips + deliveries)
  @Get('revenue/stats')
  async getRevenueStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.adminService.getActualRevenueStats(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('revenue/daily')
  async getDailyRevenue(@Query('days') days: string = '7') {
    return this.adminService.getDailyRevenueAll(parseInt(days, 10));
  }

  @Get('revenue/by-type')
  async getRevenueByType(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.adminService.getRevenueByServiceType(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('analytics/peak-hours')
  async getPeakHours(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.adminService.getPeakHours(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('analytics/area-performance')
  async getAreaPerformance(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.adminService.getAreaPerformance(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('analytics/cancel-rate')
  async getCancelRate(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.adminService.getCancelRate(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('analytics/top-drivers')
  async getTopDrivers(
    @Query('limit') limit?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.adminService.getTopDrivers(
      limit ? parseInt(limit, 10) : 10,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  // ========== USER MANAGEMENT ==========

  // Get all users (all roles including customers/drivers)
  @Get('users')
  async getUsers(
    @Query('role') role?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.getUsers(role, status, search);
  }

  // Get admin/staff users
  @Get('staff')
  async getAdminUsers(
    @Query('role') role?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.getAdminUsers(role, status, search);
  }

  // Get marketing staff
  @Get('marketing-staff')
  @UseGuards(JwtAuthGuard)
  async getMarketingStaff(
    @Request() req: any,
    @Query('search') search?: string,
  ) {
    const userId = req.user?.sub || req.user?._id || req.user?.id;
    const role = req.user?.role;
    return this.adminService.getMarketingStaff(userId, role, search);
  }

  // Get single user by ID
  @Get('users/:id')
  async getUserById(@Param('id') userId: string) {
    return this.adminService.getUserById(userId);
  }

  // Create new user
  @Post('users')
  @UseGuards(JwtAuthGuard)
  async createUser(@Request() req: any, @Body() createUserDto: CreateUserDto) {
    const creatorId = req.user?.sub || req.user?._id || req.user?.id;
    return this.adminService.createUser(createUserDto, creatorId);
  }

  // Update user
  @Patch('users/:id')
  async updateUser(
    @Param('id') userId: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.adminService.updateUser(userId, updateUserDto);
  }

  // Update user permissions
  @Patch('users/:id/permissions')
  async updateUserPermissions(
    @Param('id') userId: string,
    @Body() updatePermissionsDto: UpdateUserPermissionsDto,
  ) {
    return this.adminService.updateUserPermissions(
      userId,
      updatePermissionsDto,
    );
  }

  // Delete user
  @Delete('users/:id')
  async deleteUser(@Param('id') userId: string) {
    return this.adminService.deleteUser(userId);
  }

  // ========== ADMIN LOGS AND CONFIG ==========
  async getAdminLogs(
    @Query('adminId') adminId?: string,
    @Query('action') action?: string,
    @Query('limit') limit: number = 20,
    @Query('skip') skip: number = 0,
  ) {
    return this.adminService.getAdminLogs(adminId, action as any, limit, skip);
  }

  // System Config
  @Get('config')
  @UseGuards(JwtAuthGuard)
  async getAllConfigs() {
    return this.adminService.getAllConfigs();
  }

  @Get('config/:key')
  @UseGuards(JwtAuthGuard)
  async getConfig(@Param('key') key: string) {
    return this.adminService.getConfig(key);
  }

  @Post('config')
  @UseGuards(JwtAuthGuard)
  async setConfig(
    @Request() req: any,
    @Body() systemConfigDto: SystemConfigDto,
  ) {
    return this.adminService.setConfig(systemConfigDto, req.user.id);
  }

  @Delete('config/:key')
  @UseGuards(JwtAuthGuard)
  async deleteConfig(@Request() req: any, @Param('key') key: string) {
    await this.adminService.deleteConfig(key, req.user.id);
    return { message: 'Config deleted successfully' };
  }

  // Reports
  @Get('reports/:type')
  @UseGuards(JwtAuthGuard)
  async getReport(@Param('type') reportType: string) {
    return this.adminService.getReportsData(reportType);
  }

  // Search users
  @Get('search/users')
  async searchUsers(
    @Query('q') query: string,
    @Query('type') userType?: string,
    @Query('limit') limit: number = 20,
  ) {
    return this.adminService.searchUsers(query, userType, limit);
  }
}
