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

  // Seed test data route
  @Post('seed-test-data')
  async seedTestData() {
    // Xóa tất cả rides cũ
    await this.rideModel.deleteMany({});
    
    // Tạo 30 ride test từ các vị trí Hà Nội để customer có thể tìm thấy
    // Các vị trí test: Hà Nội và xung quanh (trong bán kính 10km)
    const locations = [
      { // Hà Nội - Thủ Đức
        pickup: [105.8542, 21.0285],
        dropoff: [105.9000, 21.0500]
      },
      { // Hà Nội - Ba Đình
        pickup: [105.8340, 21.0369],
        dropoff: [105.8500, 21.0400]
      },
      { // Hà Nội - Đống Đa
        pickup: [105.8250, 21.0100],
        dropoff: [105.8400, 21.0300]
      },
      { // Hà Nội - Hai Bà Trưng
        pickup: [105.8550, 20.9950],
        dropoff: [105.8700, 21.0100]
      },
      { // Hà Nội - Hoàn Kiếm
        pickup: [105.8450, 21.0276],
        dropoff: [105.8600, 21.0450]
      },
    ];

    const rides = [];
    const now = new Date();

    for (let i = 0; i < 30; i++) {
      // Pick random location pair
      const location = locations[i % locations.length];

      const pickupCoords = { type: 'Point', coordinates: location.pickup };
      const dropoffCoords = { type: 'Point', coordinates: location.dropoff };

      rides.push({
        customerId: [], // No customers yet (available to join)
        driverId: new Types.ObjectId(),
        rideType: RideType.SHARE, // Create SHARE rides only for customer to find
        status: RideStatus.PENDING, // PENDING status so it appears in nearby search
        pickupAddress: `Hà Nội - Điểm đón ${i + 1}`,
        dropoffAddress: `Hà Nội - Điểm trả ${i + 1}`,
        pickupLocation: pickupCoords,
        dropoffLocation: dropoffCoords,
        distance: 3 + Math.random() * 10,
        duration: 10 + Math.random() * 30,
        baseFare: 10000,
        distanceFare: (3 + Math.random() * 10) * 5000,
        timeFare: (10 + Math.random() * 30) * 500,
        surgePricing: 0,
        totalFare: 30000 + Math.random() * 50000,
        paymentMethod: 'cash',
        isPaid: false,
        passengers: 0,
        totalSeats: 2 + Math.floor(Math.random() * 3), // 2-4 seats available
        requestedAt: now,
      });
    }

    await this.rideModel.insertMany(rides);
    return { message: 'Seeded 30 new PENDING SHARE rides around Hà Nội for customer discovery', count: 30 };
  }

  // Seed RideRequest test data
  @Post('seed-ride-requests')
  async seedRideRequests() {
    try {
      // Get first ride
      const ride = await this.rideModel.findOne().lean();
      if (!ride) {
        return { message: 'No rides found. Run seed-test-data first', count: 0 };
      }

      // Create test customers
      const User = this.rideModel.db.collection('users');
      const RideReq = this.rideModel.db.collection('riderequests');

      // Clear existing requests
      await RideReq.deleteMany({ rideId: ride._id });

      // Create 2 test customers
      const customers = [
        {
          name: 'Nguyễn Văn A',
          phone: '0901234567',
          email: `nguyenvana${Date.now()}@test.com`,
          role: 'customer',
          rating: 4.8,
          createdAt: new Date(),
        },
        {
          name: 'Trần Thị B',
          phone: '0902345678',
          email: `tranthib${Date.now()}@test.com`,
          role: 'customer',
          rating: 4.5,
          createdAt: new Date(),
        },
      ];

      const customerDocs = await User.insertMany(customers);
      const customerIds = Array.isArray(customerDocs) 
        ? customerDocs.map(c => c._id) 
        : Object.values(customerDocs.insertedIds);

      // Create RideRequest records
      const requests = [
        {
          rideId: ride._id,
          customerId: customerIds[0],
          status: 'pending',
          seats: 1,
          fare: 85000,
          distance: 8.5,
          pickupAddress: 'Tầng 1, Tòa nhà Keangnam, Phạm Hùng, Hà Nội',
          dropoffAddress: 'Phố Huế, Hoàn Kiếm, Hà Nội',
          pickupCoordinates: [105.78, 21.03],
          dropoffCoordinates: [105.85, 21.03],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          rideId: ride._id,
          customerId: customerIds[1],
          status: 'pending',
          seats: 1,
          fare: 62000,
          distance: 6.2,
          pickupAddress: 'Bộ Quốc Phòng, Ba Đình, Hà Nội',
          dropoffAddress: 'Lotte Center, Hai Bà Trưng, Hà Nội',
          pickupCoordinates: [105.81, 21.05],
          dropoffCoordinates: [105.84, 21.01],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      await RideReq.insertMany(requests);

      // Update ride to include customer IDs
      await this.rideModel.updateOne(
        { _id: ride._id },
        { customerId: customerIds, totalSeats: 4 }
      );

      return {
        message: 'Seeded RideRequest test data',
        rideId: ride._id,
        customers: customerIds.length,
        requests: requests.length,
      };
    } catch (error: any) {
      return { error: error.message };
    }
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

  // Add passenger to ride (when driver accepts customer)
  @Patch(':rideId/add-passenger')
  async addPassengerToRide(
    @Param('rideId') rideId: string,
    @Body('customerId') customerId: string,
    @Body('pickupCoordinates') pickupCoordinates?: [number, number],
    @Body('dropoffCoordinates') dropoffCoordinates?: [number, number],
    @Body('pickupAddress') pickupAddress?: string,
    @Body('dropoffAddress') dropoffAddress?: string,
  ) {
    try {
      console.log('👥 Adding passenger to ride:', { rideId, customerId, pickupCoordinates, dropoffCoordinates });
      
      // Find the ride
      const ride = await this.rideModel.findById(rideId)
        .populate('driverId')
        .populate({
          path: 'customerId',
          model: 'Customer',
          select: 'name phone rating firstName lastName avatar'
        });

      if (!ride) {
        throw new BadRequestException('Ride not found');
      }

      // Check if customer already in ride
      const customerObjectId = new Types.ObjectId(customerId);
      const alreadyExists = ride.customerId?.some(c => 
        c._id?.toString() === customerObjectId.toString()
      );

      if (!alreadyExists) {
        ride.customerId = ride.customerId || [];
        ride.customerId.push(customerObjectId);
        await ride.save();
        console.log('✅ Passenger added to ride');
        
        // Auto-create RideRequest for this customer if not exists
        const RideRequestModel = this.rideModel.db.model('RideRequest');
        const rideIdObj = new Types.ObjectId(rideId);
        console.log('🔍 Checking for existing RideRequest:', {
          rideId: rideIdObj.toString(),
          customerId: customerObjectId.toString(),
        });
        
        try {
          const existingRequest = await RideRequestModel.findOne({
            rideId: rideIdObj,
            customerId: customerObjectId
          });
          
          console.log('📋 Existing request found:', !!existingRequest, existingRequest?._id);
          
          if (!existingRequest) {
            console.log('📝 Creating RideRequest for new passenger...');
            
            // Use customer's coordinates if provided, otherwise fallback to ride's
            const finalPickupCoordinates = pickupCoordinates || ride.pickupLocation?.coordinates || [0, 0];
            const finalDropoffCoordinates = dropoffCoordinates || ride.dropoffLocation?.coordinates || [0, 0];
            const finalPickupAddress = pickupAddress || ride.pickupAddress || '';
            const finalDropoffAddress = dropoffAddress || ride.dropoffAddress || '';
            
            console.log('   Final Coordinates - pickup:', finalPickupCoordinates, 'dropoff:', finalDropoffCoordinates);
            console.log('   Final Addresses - pickup:', finalPickupAddress, 'dropoff:', finalDropoffAddress);
            
            const newRequest = await RideRequestModel.create({
              rideId: rideIdObj,
              customerId: customerObjectId,
              pickupAddress: finalPickupAddress,
              dropoffAddress: finalDropoffAddress,
              pickupCoordinates: finalPickupCoordinates,
              dropoffCoordinates: finalDropoffCoordinates,
              distance: ride.distance || 0,
              fare: ride.totalFare || 0,
              status: 'pending',
              createdAt: new Date(),
              updatedAt: new Date()
            });
            console.log('✅ RideRequest created successfully:', newRequest._id.toString());
            console.log('✅ RideRequest details:', {
              _id: newRequest._id.toString(),
              rideId: newRequest.rideId.toString(),
              customerId: newRequest.customerId.toString(),
              pickupCoordinates: newRequest.pickupCoordinates,
              dropoffCoordinates: newRequest.dropoffCoordinates,
              status: newRequest.status,
            });
            
            // Verify it was actually saved
            const verifyRequest = await RideRequestModel.findById(newRequest._id);
            console.log('✅ Verification: RideRequest found in DB:', !!verifyRequest, verifyRequest?._id.toString());
          } else {
            console.log('⚠️ RideRequest already exists:', existingRequest._id.toString());
          }
        } catch (error) {
          console.error('❌ Error creating RideRequest:', error);
          throw error;
        }
      } else {
        console.log('⚠️ Passenger already in ride');
      }

      // Return enriched ride data with all customer details
      const updatedRide = await this.rideModel.findById(rideId)
        .populate('driverId')
        .populate({
          path: 'customerId',
          model: 'Customer',
          select: 'name phone rating firstName lastName avatar'
        });

      return this.ridesService.getRideWithEnrichedCustomers(rideId, updatedRide);
    } catch (error: any) {
      throw new BadRequestException(`Failed to add passenger: ${error.message}`);
    }
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

  // Test endpoint to create sample RideRequest
  @Post(':rideId/requests/test')
  async createTestRideRequest(
    @Param('rideId') rideId: string,
    @Body() body?: { customerId?: string; [key: string]: any }
  ) {
    try {
      console.log('🧪 [TEST] Creating test RideRequest for rideId:', rideId);
      
      // Get the ride to ensure it exists
      const ride = await this.rideModel.findById(rideId);
      if (!ride) {
        throw new BadRequestException('Ride not found');
      }

      // Use provided customerId or first customer in ride
      let customerId = body?.customerId;
      if (!customerId) {
        if (ride.customerId && ride.customerId.length > 0) {
          customerId = ride.customerId[0].toString();
        } else {
          throw new BadRequestException('No customer ID provided and ride has no customers');
        }
      }

      const testRequest = new this.rideRequestModel({
        rideId: new Types.ObjectId(rideId),
        customerId: new Types.ObjectId(customerId),
        status: 'pending',
        seats: 1,
        fare: 50000,
        pickupAddress: 'Hà Nội, Việt Nam',
        dropoffAddress: 'Hồ Chí Minh, Việt Nam',
        pickupCoordinates: [105.8386, 21.0722],
        dropoffCoordinates: [106.6885, 10.8231],
        distance: 1500,
      });

      console.log('💾 [TEST] Saving test request...');
      const saved = await testRequest.save();
      console.log('✅ [TEST] Test request saved:', {
        _id: saved._id,
        rideId: saved.rideId,
        customerId: saved.customerId,
      });

      // Verify it can be found
      const found = await this.rideRequestModel.findById(saved._id);
      console.log('✅ [TEST] Verified request exists in DB:', !!found);

      // Now test enrichment
      const enrichedRide = await this.ridesService.getRideWithEnrichedCustomers(rideId, ride);
      console.log('✅ [TEST] Enriched ride returned with', enrichedRide.customerId?.length || 0, 'customers');

      return {
        success: true,
        message: 'Test RideRequest created successfully',
        request: saved,
        enrichedRide: enrichedRide,
      };
    } catch (error: any) {
      console.error('❌ [TEST] Error:', error.message);
      throw new BadRequestException(`Test failed: ${error.message}`);
    }
  }

  @Patch(':rideId/requests/:requestId/accept')
  async acceptRideRequest(
    @Param('rideId') rideId: string,
    @Param('requestId') requestId: string,
  ) {
    // Update request status to accepted
    const request = await this.rideRequestModel.findByIdAndUpdate(
      requestId,
      { status: 'accepted' },
      { new: true },
    )

    if (!request) {
      throw new Error('Request not found')
    }

    // Add customer to ride's customerId array
    await this.rideModel.findByIdAndUpdate(
      rideId,
      {
        $addToSet: { customerId: request.customerId },
        $inc: { passengers: 1 },
      },
      { new: true },
    )

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
    // Update request status to arrived_at_pickup
    const request = await this.rideRequestModel.findByIdAndUpdate(
      requestId,
      { status: 'arrived_at_pickup' },
      { new: true },
    )

    if (!request) {
      throw new BadRequestException('Request not found')
    }

    // Return enriched ride data
    const ride = await this.rideModel.findById(rideId)
      .populate('driverId')
      .populate({
        path: 'customerId',
        model: 'Customer',
        select: 'name phone rating firstName lastName avatar'
      })
      .exec()
    
    if (!ride) {
      throw new BadRequestException('Ride not found')
    }
    
    return this.ridesService.getRideWithEnrichedCustomers(rideId, ride)
  }

  @Patch(':rideId/requests/:requestId/start-journey')
  async startJourneyWithPassenger(
    @Param('rideId') rideId: string,
    @Param('requestId') requestId: string,
  ) {
    // Update request status to in_progress
    const request = await this.rideRequestModel.findByIdAndUpdate(
      requestId,
      { status: 'in_progress' },
      { new: true },
    )

    if (!request) {
      throw new BadRequestException('Request not found')
    }

    // Return enriched ride data
    const ride = await this.rideModel.findById(rideId)
      .populate('driverId')
      .populate({
        path: 'customerId',
        model: 'Customer',
        select: 'name phone rating firstName lastName avatar'
      })
      .exec()
    
    if (!ride) {
      throw new BadRequestException('Ride not found')
    }
    
    return this.ridesService.getRideWithEnrichedCustomers(rideId, ride)
  }

  @Patch(':rideId/requests/:requestId/complete')
  async completePassengerJourney(
    @Param('rideId') rideId: string,
    @Param('requestId') requestId: string,
  ) {
    // Update request status to completed
    const request = await this.rideRequestModel.findByIdAndUpdate(
      requestId,
      { status: 'completed' },
      { new: true },
    )

    if (!request) {
      throw new BadRequestException('Request not found')
    }

    // Return enriched ride data
    const ride = await this.rideModel.findById(rideId)
      .populate('driverId')
      .populate({
        path: 'customerId',
        model: 'Customer',
        select: 'name phone rating firstName lastName avatar'
      })
      .exec()
    
    if (!ride) {
      throw new BadRequestException('Ride not found')
    }
    
    return this.ridesService.getRideWithEnrichedCustomers(rideId, ride)
  }
}
