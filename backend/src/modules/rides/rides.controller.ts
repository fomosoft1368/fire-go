import { Controller, Get, Post, Body, Param, Patch, Query } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { RidesService } from './rides.service';
import { AutoAssignService } from './services/auto-assign.service';
import { CreateRideDto } from './dto';
import { Ride, RideDocument, RideStatus, RideType } from './schemas/ride.schema';

@Controller('api/rides')
export class RidesController {
  constructor(
    private readonly ridesService: RidesService,
    @InjectModel(Ride.name) private rideModel: Model<RideDocument>,
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

  // Analytics routes - MUST be before :id routes
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
  async create(@Body() createRideDto: CreateRideDto, @Query('customerId') customerId: string) {
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
  async acceptRide(@Param('id') id: string, @Body('driverId') driverId: string) {
    return this.ridesService.acceptRide(id, driverId);
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
  async startRide(@Param('id') id: string) {
    return this.ridesService.startRide(id);
  }

  @Patch(':id/complete')
  async completeRide(@Param('id') id: string) {
    return this.ridesService.completeRide(id);
  }

  @Patch(':id/cancel')
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
