import { Controller, Get, Post, Body, Param, Patch, Query, Request, BadRequestException, UseGuards } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { RidesService } from './rides.service';
import { AutoAssignService } from './services/auto-assign.service';
import { CreateRideDto } from './dto';
import { Ride, RideDocument, RideStatus, RideType } from './schemas/ride.schema';
import { RideRequest, RideRequestDocument } from './schemas/ride-request.schema';
import { Pricing } from './schemas/pricing.schema';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('api/rides')
export class RidesController {
  constructor(
    private readonly ridesService: RidesService,
    private readonly autoAssignService: AutoAssignService,
    @InjectModel(Ride.name) private rideModel: Model<RideDocument>,
    @InjectModel(Pricing.name) private pricingModel: Model<Pricing>,
    @InjectModel(RideRequest.name) private rideRequestModel: Model<RideRequestDocument>,
  ) {}
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

  // Find share rides with location hierarchy filtering
  @Get('share/search')
  async findShareRides(
    @Query('longitude') longitude: number,
    @Query('latitude') latitude: number,
    @Query('pickupAddress') pickupAddress: string,
    @Query('maxDistance') maxDistance?: number,
  ) {
    console.log('🔍 [RidesController] Searching share rides:', {
      longitude,
      latitude,
      pickupAddress,
      maxDistance,
    });
    return this.ridesService.findShareRides(
      longitude,
      latitude,
      pickupAddress,
      maxDistance || 10000, // Default 10km
    );
  }

  @Get('customer/:customerId')
  async findByCustomer(@Param('customerId') customerId: string) {
    return this.ridesService.findByCustomerId(customerId);
  }

  @Get('driver/:id')
  async findByIdForDriver(@Param('id') id: string) {
    return this.ridesService.findByIdForDriver(id);
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

  @Get('driver-list/:driverId')
  async findByDriver(@Param('driverId') driverId: string) {
    return this.ridesService.findByDriverId(driverId);
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

  @Patch(':rideId/rate')
  async rateRide(
    @Param('rideId') rideId: string,
    @Body('rating') rating: number,
    @Body('review') review?: string,
    @Body('ratedBy') ratedBy?: 'driver' | 'customer',
  ) {
    return this.ridesService.rateRide(rideId, rating, review, ratedBy);
  }

  // Ride Requests Management
  @Post(':rideId/requests')
  async createRideRequest(
    @Param('rideId') rideId: string,
    @Body() body: {
      customerId: string;
      seats: number;
      fare: number;
      pickupAddress: string;
      dropoffAddress: string;
      pickupCoordinates: [number, number];
      dropoffCoordinates: [number, number];
      distance: number;
    },
  ) {
    try {
      console.log('📝 [createRideRequest] Creating request with:', {
        rideId,
        customerId: body.customerId,
        pickupAddress: body.pickupAddress,
        dropoffAddress: body.dropoffAddress,
        pickupCoordinates: body.pickupCoordinates,
        dropoffCoordinates: body.dropoffCoordinates,
      });
      
      // Create ride request
      const request = new this.rideRequestModel({
        rideId: new Types.ObjectId(rideId),
        customerId: new Types.ObjectId(body.customerId),
        status: 'pending',
        seats: body.seats,
        fare: body.fare,
        pickupAddress: body.pickupAddress,
        dropoffAddress: body.dropoffAddress,
        pickupCoordinates: body.pickupCoordinates,
        dropoffCoordinates: body.dropoffCoordinates,
        distance: body.distance,
      });

      console.log('💾 [createRideRequest] Saving request document...');
      const savedRequest = await request.save();
      console.log('✅ [createRideRequest] Request saved successfully:', {
        _id: savedRequest._id,
        rideId: savedRequest.rideId,
        customerId: savedRequest.customerId,
        pickupCoordinates: savedRequest.pickupCoordinates,
      });
      
      const populatedRequest = await savedRequest.populate('customerId', 'name phone rating');
      console.log('✅ [createRideRequest] Request populated:', populatedRequest);
      return populatedRequest;
    } catch (error: any) {
      console.error('❌ [createRideRequest] Error:', error.message, error.stack);
      throw new BadRequestException(`Failed to create ride request: ${error.message}`);
    }
  }

  @Get(':rideId/requests/:requestId')
  async getRideRequest(
    @Param('rideId') rideId: string,
    @Param('requestId') requestId: string,
  ) {
    try {
      const request = await this.rideRequestModel
        .findById(new Types.ObjectId(requestId))
        .populate('customerId', 'name phone rating');

      if (!request) {
        throw new Error('Request not found');
      }

      return request;
    } catch (error: any) {
      throw new Error(`Failed to get request: ${error.message}`);
    }
  }

  @Get(':rideId/requests')
  async getRideRequests(@Param('rideId') rideId: string) {
    return this.rideRequestModel
      .find({ rideId: new Types.ObjectId(rideId), status: 'pending' })
      .populate('customerId', 'name phone rating')
      .sort({ createdAt: -1 })
  }

  @Patch(':rideId/requests/:requestId/accept')
  async acceptRideRequest(
    @Param('rideId') rideId: string,
    @Param('requestId') requestId: string,
  ) {
    const request = await this.rideRequestModel.findByIdAndUpdate(
      requestId,
      { status: 'accepted' },
      { new: true },
    )

    if (!request) {
      throw new BadRequestException('Request not found')
    }

    return request
  }

  @Patch(':rideId/requests/:requestId/reject')
  async rejectRideRequest(
    @Param('rideId') rideId: string,
    @Param('requestId') requestId: string,
  ) {
    // Update request status to rejected
    const request = await this.rideRequestModel.findByIdAndUpdate(
      requestId,
      { status: 'rejected' },
      { new: true },
    )

    return request
  }

  @Patch(':rideId/requests/:requestId/mark-arrived')
  async markArrivedAtPickup(
    @Param('rideId') rideId: string,
    @Param('requestId') requestId: string,
  ) {
    const request = await this.rideRequestModel.findByIdAndUpdate(
      requestId,
      { status: 'arrived_at_pickup' },
      { new: true },
    )

    if (!request) {
      throw new BadRequestException('Request not found')
    }

    return request
  }

  @Patch(':rideId/requests/:requestId/start-journey')
  async startJourneyWithPassenger(
    @Param('rideId') rideId: string,
    @Param('requestId') requestId: string,
  ) {
    const request = await this.rideRequestModel.findByIdAndUpdate(
      requestId,
      { status: 'in_progress' },
      { new: true },
    )

    if (!request) {
      throw new BadRequestException('Request not found')
    }

    return request
  }

  @Patch(':rideId/requests/:requestId/complete')
  async completePassengerJourney(
    @Param('rideId') rideId: string,
    @Param('requestId') requestId: string,
  ) {
    const request = await this.rideRequestModel.findByIdAndUpdate(
      requestId,
      { status: 'completed' },
      { new: true },
    )

    if (!request) {
      throw new BadRequestException('Request not found')
    }

    return request
  }
}
