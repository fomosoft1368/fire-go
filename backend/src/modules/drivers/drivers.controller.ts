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
   * GET /api/drivers/search
   * Tìm kiếm tài xế theo tên hoặc số điện thoại
   */
  @Get('search')
  async search(@Query('q') query: string) {
    if (!query || query.length < 2) {
      return [];
    }
    return this.driversService.search(query);
  }

  /**
   * POST /api/drivers
   * Tạo hồ sơ tài xế mới
   */
  @Post()
  @HttpCode(201)
  async create(@Request() req: any, @Body() createDriverDto: CreateDriverDto) {
    // Allow creating driver without authentication for admin panel
    // If authentication needed, add @UseGuards(JwtAuthGuard) back
    const userId = req.user?.id || ''; // Empty if not authenticated
    return this.driversService.create(userId, createDriverDto);
  }

  /**
   * GET /api/drivers/me
   * Lấy thông tin cá nhân tài xế đang đăng nhập
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMyProfile(@Request() req: any) {
    // req.user.id is the driver's _id from JWT token
    return this.driversService.findById(req.user.id);
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
   * GET /api/drivers/available
   * Lấy danh sách tài xế online và sẵn sàng nhận cuốc
   */
  @Get('available')
  async getAvailableDrivers() {
    return this.driversService.getAvailableDrivers();
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
   * PATCH /api/drivers/me/status
   * Cập nhật trạng thái tài xế hiện tại (available | offline)
   */
  @Patch('me/status')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  async updateMyStatus(
    @Request() req: any,
    @Body('status') status: DriverStatus,
  ) {
    console.log('[DriversController] Updating driver status:', req.user.id, 'to:', status);
    return this.driversService.updateStatus(req.user.id, status);
  }

  /**
   * PATCH /api/drivers/me
   * Cập nhật thông tin tài xế hiện tại
   */
  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  async updateMyProfile(
    @Request() req: any,
    @Body() updateDriverDto: UpdateDriverDto,
  ) {
    console.log('[DriversController] Updating profile for driver:', req.user.id);
    console.log('[DriversController] Update data:', JSON.stringify(updateDriverDto));
    return this.driversService.update(req.user.id, updateDriverDto);
  }

  /**
   * PATCH /api/drivers/online-status
   * Cập nhật online status (tài xế hiện tại)
   */
  @Patch('online-status')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  async updateOnlineStatus(
    @Request() req: any,
    @Body('isOnline') isOnline: boolean,
  ) {
    console.log('[DriversController] Setting online status for driver:', req.user.id, 'to:', isOnline);
    return this.driversService.updateOnlineStatus(req.user.id, isOnline);
  }

  /**
   * PATCH /api/drivers/available-status
   * Cập nhật available status (tài xế hiện tại)
   */
  @Patch('available-status')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  async updateAvailableStatus(
    @Request() req: any,
    @Body('isAvailable') isAvailable: boolean,
  ) {
    console.log('[DriversController] Setting available status for driver:', req.user.id, 'to:', isAvailable);
    return this.driversService.updateAvailableStatus(req.user.id, isAvailable);
  }

  /**
   * POST /api/drivers/heartbeat
   * Heartbeat to keep driver online (update lastOnlineTime)
   */
  @Post('heartbeat')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  async heartbeat(@Request() req: any) {
    // req.user.id is the driver's _id from JWT token
    await this.driversService.updateHeartbeat(req.user.id);
    
    return { success: true, message: 'Heartbeat received' };
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
