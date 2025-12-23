import { Controller, Get, Post, Delete, Body, Param, UseGuards, Request, Query } from '@nestjs/common';
import { AdminService } from './admin.service';
import { SystemConfigDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('api/admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // Dashboard
  @Get('dashboard')
  async getDashboard() {
    return this.adminService.getDashboardStats();
  }

  // Users Management
  @Get('users')
  async getUsers(
    @Query('role') role?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.getUsers(role, status, search);
  }

  // Admin and Staff Users
  @Get('staff')
  async getAdminUsers(
    @Query('role') role?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.getAdminUsers(role, status, search);
  }

  // Admin Logs
  @Get('logs')
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
  async setConfig(@Request() req: any, @Body() systemConfigDto: SystemConfigDto) {
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
