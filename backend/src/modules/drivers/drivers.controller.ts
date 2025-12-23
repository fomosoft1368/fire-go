import { Controller, Get, Post, Patch, Body, Param, UseGuards, Request, Query, HttpCode } from '@nestjs/common';
import { DriversService } from './drivers.service';
import { CreateDriverDto, UpdateDriverDto, UpdateLocationDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DriverStatus } from './schemas/driver.schema';

@Controller('api/drivers')
export class DriversController {
  constructor(private readonly driversService: DriversService) {}

  /**
   * GET /api/drivers
   * Lấy danh sách tất cả tài xế
   */
  @Get()
  async findAll(
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.driversService.findAll({
      status,
      search,
      page,
      limit,
    });
  }

  /**
   * POST /api/drivers
   * Tạo hồ sơ tài xế mới
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(201)
  async create(@Request() req: any, @Body() createDriverDto: CreateDriverDto) {
    return this.driversService.create(req.user.id, createDriverDto);
  }

  /**
   * GET /api/drivers/me
   * Lấy thông tin cá nhân tài xế đang đăng nhập
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMyProfile(@Request() req: any) {
    return this.driversService.findByUserId(req.user.id);
  }

  /**
   * GET /api/drivers/me/dashboard
   * Dashboard tài xế (thống kê, earnings, rating)
   */
  @Get('me/dashboard')
  @UseGuards(JwtAuthGuard)
  async getMyDashboard(@Request() req: any) {
    return this.driversService.getDashboard(req.user.id);
  }

  /**
   * GET /api/drivers/me/earnings/today
   * Doanh thu hôm nay
   */
  @Get('me/earnings/today')
  @UseGuards(JwtAuthGuard)
  async getTodayEarnings(@Request() req: any) {
    return this.driversService.getTodayEarnings(req.user.id);
  }

  /**
   * GET /api/drivers/nearby
   * Tìm tài xế online gần vị trí (geolocation)
   */
  @Get('nearby')
  async getNearbyDrivers(
    @Query('longitude') longitude: number,
    @Query('latitude') latitude: number,
    @Query('maxDistance') maxDistance?: number,
  ) {
    return this.driversService.findOnlineDrivers(
      parseFloat(longitude as any),
      parseFloat(latitude as any),
      maxDistance ? parseInt(maxDistance as any) : 5000,
    );
  }

  /**
   * GET /api/drivers/:id
   * Lấy thông tin tài xế theo ID
   */
  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.driversService.findById(id);
  }

  /**
   * GET /api/drivers/:id/stats
   * Thống kê chi tiết (tổng cuốc, đánh giá, doanh thu)
   */
  @Get(':id/stats')
  async getStats(@Param('id') id: string) {
    return this.driversService.getStats(id);
  }

  /**
   * PATCH /api/drivers/me/accepting-rides
   * Toggle chấp nhận cuốc
   */
  @Patch('me/accepting-rides')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  async toggleAcceptingRides(
    @Request() req: any,
    @Body('isAcceptingRides') isAcceptingRides: boolean,
  ) {
    return this.driversService.toggleAcceptingRides(req.user.id, isAcceptingRides);
  }

  /**
   * PATCH /api/drivers/:id/status
   * Cập nhật trạng thái tài xế
   */
  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: DriverStatus,
  ) {
    return this.driversService.updateStatus(id, status);
  }

  /**
   * PATCH /api/drivers/:id/location
   * Cập nhật vị trí (real-time tracking)
   */
  @Patch(':id/location')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  async updateLocation(
    @Param('id') id: string,
    @Body() updateLocationDto: UpdateLocationDto,
  ) {
    return this.driversService.updateLocation(id, updateLocationDto);
  }

  /**
   * PATCH /api/drivers/:id
   * Cập nhật thông tin tài xế
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  async update(
    @Param('id') id: string,
    @Body() updateDriverDto: UpdateDriverDto,
  ) {
    return this.driversService.update(id, updateDriverDto);
  }
}
