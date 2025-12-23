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
  async findAll(@Query('status') status?: string) {
    const filters = status ? { status } : {};
    return this.ridesService.findAll(filters);
  }

  @Get('nearby')
  async findNearby(
    @Query('longitude') longitude: number,
    @Query('latitude') latitude: number,
    @Query('maxDistance') maxDistance?: number,
  ) {
    return this.ridesService.findNearbyRides(longitude, latitude, maxDistance);
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
