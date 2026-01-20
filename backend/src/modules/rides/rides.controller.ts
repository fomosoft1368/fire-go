import { Controller, Get, Post, Body, Param, Patch, Query, Request, BadRequestException, UseGuards } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { RidesService } from './rides.service';
import { AutoAssignService } from './services/auto-assign.service';
import { CreateRideDto } from './dto';
import { Ride, RideDocument, RideStatus, RideType } from './schemas/ride.schema';
import { Pricing } from './schemas/pricing.schema';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('api/rides')
export class RidesController {
  constructor(
    private readonly ridesService: RidesService,
    private readonly autoAssignService: AutoAssignService,
    @InjectModel(Ride.name) private rideModel: Model<RideDocument>,
    @InjectModel(Pricing.name) private pricingModel: Model<Pricing>,
  ) {}

  // Seed test data route
  @Post('seed-test-data')
  async seedTestData() {
    // Xóa tất cả rides cũ
    await this.rideModel.deleteMany({});
    
    // Tạo 30 ride test từ 7 ngày trước đến hôm nay
    // Các vị trí test: Hà Nội, HCM, Đà Nẵng, Nghệ An
    const locations = [
      { // Hà Nội
        pickup: [105.8386, 21.0722],
        dropoff: [105.8066, 20.9799]
      },
      { // HCM
        pickup: [106.6309, 10.7895],
        dropoff: [106.7, 10.8]
      },
      { // Đà Nẵng
        pickup: [107.5909, 16.0544],
        dropoff: [107.6, 16.1]
      },
      { // Nghệ An
        pickup: [105.8859, 18.6783],
        dropoff: [105.9, 18.7]
      },
      { // Hà Nội → Nghệ An
        pickup: [105.8386, 21.0722],
        dropoff: [105.8859, 18.6783]
      },
    ];

    const rides = [];
    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() - 6);

    for (let i = 0; i < 30; i++) {
      const completedAt = new Date(baseDate);
      completedAt.setDate(completedAt.getDate() + Math.floor(i / 4));
      completedAt.setHours(8 + Math.random() * 12);

      // Pick random location pair
      const location = locations[i % locations.length];

      const pickupCoords = { type: 'Point', coordinates: location.pickup };
      const dropoffCoords = { type: 'Point', coordinates: location.dropoff };

      rides.push({
        customerId: new Types.ObjectId(),
        driverId: new Types.ObjectId(),
        rideType: i % 2 === 0 ? RideType.SHARE : RideType.HIRE,
        status: RideStatus.COMPLETED,
        pickupAddress: `Địa điểm ${i + 1}`,
        dropoffAddress: `Đích đến ${i + 1}`,
        pickupLocation: pickupCoords,
        dropoffLocation: dropoffCoords,
        distance: 5 + Math.random() * 20,
        duration: 10 + Math.random() * 40,
        baseFare: 10000,
        distanceFare: (5 + Math.random() * 20) * 1000,
        timeFare: (10 + Math.random() * 40) * 100,
        surgePricing: Math.random() > 0.8 ? 5000 : 0,
        totalFare: 20000 + Math.random() * 80000,
        paymentMethod: 'wallet',
        isPaid: true,
        passengers: 1,
        requestedAt: completedAt,
        acceptedAt: new Date(completedAt.getTime() + 30000),
        startedAt: new Date(completedAt.getTime() + 60000),
        completedAt: new Date(completedAt.getTime() + 1800000),
        paidAt: new Date(completedAt.getTime() + 1800000),
      });
    }

    await this.rideModel.insertMany(rides);
    return { message: 'Deleted old rides and seeded 30 new test rides with correct locations', count: 30 };
  }

  // Seed pricing data
  @Post('seed-pricing')
  async seedPricing() {
    const pricingData = [
      {
        vehicleType: 'basic',
        baseFare: 10000,        // Giá mở cửa 10.000 VND
        pricePerKm: 5000,       // 5.000 VND/km
        pricePerMinute: 1000,   // 1.000 VND/phút
        minimumFare: 25000,     // Giá tối thiểu 25.000 VND
        peakHourSurge: 20,      // Phụ phí giờ cao điểm 20%
        rainyDaySurge: 15,      // Phụ phí mưa 15%
        isActive: true,
      },
      {
        vehicleType: 'comfort',
        baseFare: 15000,        // Giá mở cửa 15.000 VND
        pricePerKm: 7000,       // 7.000 VND/km
        pricePerMinute: 1500,   // 1.500 VND/phút
        minimumFare: 35000,     // Giá tối thiểu 35.000 VND
        peakHourSurge: 25,      // Phụ phí giờ cao điểm 25%
        rainyDaySurge: 20,      // Phụ phí mưa 20%
        isActive: true,
      },
      {
        vehicleType: 'premium',
        baseFare: 20000,        // Giá mở cửa 20.000 VND
        pricePerKm: 10000,      // 10.000 VND/km
        pricePerMinute: 2000,   // 2.000 VND/phút
        minimumFare: 50000,     // Giá tối thiểu 50.000 VND
        peakHourSurge: 30,      // Phụ phí giờ cao điểm 30%
        rainyDaySurge: 25,      // Phụ phí mưa 25%
        isActive: true,
      },
    ];

    // Delete existing pricing
    await this.pricingModel.deleteMany({});

    // Create new pricing
    const created = await this.pricingModel.insertMany(pricingData);
    return { message: 'Seeded pricing data for basic, comfort, and premium vehicle types', data: created };
  }
  @Get('analytics/revenue')
  async getRevenueStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.ridesService.getRevenueStats(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('analytics/daily-revenue')
  async getDailyRevenue(@Query('days') days: string = '7') {
    return this.ridesService.getDailyRevenue(parseInt(days, 10));
  }

  @Get('analytics/revenue-by-type')
  async getRevenueByType(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.ridesService.getRevenueByRideType(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('analytics/weekly-revenue')
  async getWeeklyRevenue() {
    return this.ridesService.getWeeklyRevenue();
  }

  @Get('analytics/peak-hours')
  async getPeakHours(@Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    return this.ridesService.getPeakHours(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('analytics/top-drivers')
  async getTopDrivers(@Query('limit') limit: string = '10') {
    return this.ridesService.getTopDrivers(parseInt(limit, 10));
  }

  // Statistics route (general stats without user ID)
  @Get('stats')
  async getAllStats() {
    return this.ridesService.getAllRideStats();
  }

  // Calculate fare based on distance, duration and vehicle type
  @Post('calculate-fare')
  async calculateFare(
    @Body() body: { distance: number; duration: number; vehicleType: string; isPeakHour?: boolean; isRainy?: boolean }
  ) {
    return this.ridesService.calculateFare(
      body.distance,
      body.duration,
      body.vehicleType,
      body.isPeakHour,
      body.isRainy,
    );
  }

  // Find nearby drivers for ride booking
  @Get('find-drivers')
  async findNearbyDrivers(
    @Query('latitude') latitude: string,
    @Query('longitude') longitude: string,
    @Query('radius') radius?: string,
    @Query('vehicleType') vehicleType?: string,
    @Query('limit') limit?: string,
  ) {
    return this.ridesService.findNearbyDrivers(
      parseFloat(latitude),
      parseFloat(longitude),
      radius ? parseFloat(radius) : 5,
      vehicleType,
      limit ? parseInt(limit) : 10,
    );
  }

  // Get pricing for vehicle type
  @Get('pricing/:vehicleType')
  async getPricing(@Param('vehicleType') vehicleType: string) {
    return this.ridesService.getPricing(vehicleType);
  }

  // Create or update pricing for vehicle type
  @Post('pricing')
  async createPricing(@Body() pricingData: any) {
    const existing = await this.pricingModel.findOne({ vehicleType: pricingData.vehicleType });
    if (existing) {
      return this.pricingModel.findByIdAndUpdate(existing._id, pricingData, { new: true });
    }
    return this.pricingModel.create(pricingData);
  }

  // Route directions - get route between two coordinates
  @Get('directions')
  async getDirections(
    @Query('startLng') startLng?: string,
    @Query('startLat') startLat?: string,
    @Query('endLng') endLng?: string,
    @Query('endLat') endLat?: string,
  ) {
    console.log('🔍 Directions endpoint called with:', { startLng, startLat, endLng, endLat });
    
    if (!startLng || !startLat || !endLng || !endLat) {
      throw new Error('Missing required parameters: startLng, startLat, endLng, endLat');
    }
    
    return this.ridesService.getDirections(
      parseFloat(startLng),
      parseFloat(startLat),
      parseFloat(endLng),
      parseFloat(endLat),
    );
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() createRideDto: CreateRideDto, @Request() req: any) {
    const customerId = req.user?.id || req.user?.sub;
    
    if (!customerId) {
      throw new BadRequestException('Customer ID not found in authentication token');
    }
    
    console.log('🆕 [RidesController] Creating ride for customer:', customerId);
    return this.ridesService.create(createRideDto, customerId);
  }

  @Get()
  async findAll(@Query('status') status?: string, @Query('rideType') rideType?: string) {
    const filters: any = {};
    if (status) filters.status = status;
    if (rideType) filters.rideType = rideType;
    return this.ridesService.findAll(filters);
  }

  @Get('nearby')
  async findNearby(
    @Query('longitude') longitude: number,
    @Query('latitude') latitude: number,
    @Query('maxDistance') maxDistance?: number,
    @Query('rideType') rideType?: string,
  ) {
    return this.ridesService.findNearbyRides(longitude, latitude, maxDistance, rideType);
  }

  @Get('customer/:customerId')
  async findByCustomer(@Param('customerId') customerId: string) {
    return this.ridesService.findByCustomerId(customerId);
  }

  @Get('driver/:driverId')
  async findByDriver(@Param('driverId') driverId: string) {
    return this.ridesService.findByDriverId(driverId);
  }

  @Get('stats/:userId')
  async getStats(
    @Param('userId') userId: string,
    @Query('userType') userType: 'driver' | 'customer',
  ) {
    return this.ridesService.getRideStats(userId, userType);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.ridesService.findById(id);
  }

  @Patch(':id/accept')
  @UseGuards(JwtAuthGuard)
  async acceptRide(@Param('id') id: string, @Body('driverId') driverId: string) {
    console.log('[RidesController] Accept ride request:', { rideId: id, driverId });
    try {
      const result = await this.ridesService.acceptRide(id, driverId);
      console.log('[RidesController] Ride accepted successfully:', result._id);
      return result;
    } catch (error) {
      console.error('[RidesController] Error accepting ride:', error.message);
      throw error;
    }
  }

  @Patch(':id/assign')
  async assignDriver(@Param('id') id: string, @Body('driverId') driverId: string) {
    return this.ridesService.assignDriver(id, driverId);
  }

  @Post(':id/auto-assign')
  async autoAssignDriver(@Param('id') id: string) {
    return this.autoAssignService.autoAssignDriver(id);
  }

  @Patch(':id/start')
  @UseGuards(JwtAuthGuard)
  async startRide(@Param('id') id: string) {
    return this.ridesService.startRide(id);
  }

  @Patch(':id/complete')
  @UseGuards(JwtAuthGuard)
  async completeRide(@Param('id') id: string) {
    return this.ridesService.completeRide(id);
  }

  @Patch(':id/cancel')
  @UseGuards(JwtAuthGuard)
  async cancelRide(
    @Param('id') id: string,
    @Body('cancellationBy') cancellationBy: 'driver' | 'customer',
    @Body('reason') reason?: string,
  ) {
    return this.ridesService.cancelRide(id, cancellationBy, reason);
  }

  @Patch(':id/rate')
  async rateRide(
    @Param('id') id: string,
    @Body('rating') rating: number,
    @Body('review') review?: string,
    @Body('ratedBy') ratedBy?: 'driver' | 'customer',
  ) {
    return this.ridesService.rateRide(id, rating, review, ratedBy);
  }
}
