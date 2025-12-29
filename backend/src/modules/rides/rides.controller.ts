import { Controller, Get, Post, Body, Param, Patch, Query } from '@nestjs/common';
import { RidesService } from './rides.service';
import { CreateRideDto } from './dto';

@Controller('api/rides')
export class RidesController {
  constructor(private readonly ridesService: RidesService) {}

  @Post()
  async create(@Body() createRideDto: CreateRideDto, @Query('customerId') customerId: string) {
    return this.ridesService.create(createRideDto, customerId);
  }

  @Get()
  async findAll(@Query('status') status?: string, @Query('rideType') rideType?: string) {
    const filters: any = {};
    if (status) filters.status = status;
    if (rideType) filters.rideType = rideType; // Lọc theo loại chuyến
    return this.ridesService.findAll(filters);
  }

  @Get('nearby')
  async findNearby(
    @Query('longitude') longitude: number,
    @Query('latitude') latitude: number,
    @Query('maxDistance') maxDistance?: number,
    @Query('rideType') rideType?: string, // Lọc theo loại chuyến
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
