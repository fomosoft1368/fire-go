import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Query,
  Request,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { RidesService } from '../services/rides.service';
import { AutoAssignService } from '../services/auto-assign.service';
import { CreateRideDto } from '../dto';
import { UploadVehicleConditionDto } from '../dto/upload-vehicle-condition.dto';
import { Ride, RideDocument, RideType } from '../schemas/ride.schema';
import {
  AssignmentRequest,
  AssignmentRequestDocument,
} from '../schemas/assignment-request.schema';
import { Pricing } from '../schemas/pricing.schema';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Driver, DriverDocument } from '../../drivers/schemas/driver.schema';
import { PushNotificationService } from '../../notifications/push-notification.service';
import { NotificationType } from '../../notifications/schemas/notification.schema';

@Controller('rides')
export class RidesController {
  constructor(
    private readonly ridesService: RidesService,
    private readonly autoAssignService: AutoAssignService,
    private readonly pushService: PushNotificationService,
    @InjectModel(Ride.name) private rideModel: Model<RideDocument>,
    @InjectModel(Pricing.name) private pricingModel: Model<Pricing>,
    @InjectModel(AssignmentRequest.name)
    private assignmentRequestModel: Model<AssignmentRequestDocument>,
    @InjectModel(Driver.name) private driverModel: Model<DriverDocument>,
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
  async getPeakHours(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
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
    @Body()
    body: {
      distance: number;
      duration: number;
      vehicleType: string;
      isPeakHour?: boolean;
      isRainy?: boolean;
    },
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
      radius ? parseFloat(radius) : undefined, // Let service use config default if not provided
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
    const existing = await this.pricingModel.findOne({
      vehicleType: pricingData.vehicleType,
    });
    if (existing) {
      return this.pricingModel.findByIdAndUpdate(existing._id, pricingData, {
        new: true,
      });
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
    console.log('🔍 Directions endpoint called with:', {
      startLng,
      startLat,
      endLng,
      endLat,
    });

    if (!startLng || !startLat || !endLng || !endLat) {
      throw new Error(
        'Missing required parameters: startLng, startLat, endLng, endLat',
      );
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
      throw new BadRequestException(
        'Customer ID not found in authentication token',
      );
    }

    console.log('🆕 [RidesController] Creating ride for customer:', customerId);
    const ride = await this.ridesService.create(createRideDto, customerId);

    // Auto-assign driver for HIRE rides (default enabled unless explicitly disabled)
    const shouldAutoAssign =
      ride.rideType === RideType.HIRE && createRideDto.autoAssign !== false; // Default to true

    if (shouldAutoAssign) {
      console.log(
        '🤖 [RidesController] Auto-assigning driver for ride:',
        ride._id,
      );
      try {
        const assignResult = await this.ridesService.autoAssignDriver(
          ride._id.toString(),
        );
        console.log('✅ [RidesController] Auto-assign result:', assignResult);
        // Return ride with assignment info
        return {
          ...ride.toObject(),
          assignmentResult: assignResult,
        };
      } catch (error) {
        console.warn('⚠️ [RidesController] Auto-assign failed:', error.message);
        // Return original ride even if auto-assign fails
        return ride;
      }
    }

    return ride;
  }

  @Get()
  async findAll(
    @Query('status') status?: string,
    @Query('rideType') rideType?: string,
  ) {
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
    return this.ridesService.findNearbyRides(
      longitude,
      latitude,
      maxDistance,
      rideType,
    );
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

  // @Get('driver/:id')
  // async findByIdForDriver(@Param('id') id: string) {
  //   return this.ridesService.findByIdForDriver(id);
  // }

  // ============ Assignment Request Endpoints ============

  /**
   * Driver lấy danh sách pending assignment requests
   */
  @Get('assignment-requests/pending')
  @UseGuards(JwtAuthGuard)
  async getPendingAssignmentRequests(@Request() req: any) {
    const driverId = req.user.id;
    console.log(
      '[RidesController] 🔍 Getting pending assignment requests for driver:',
      driverId,
    );

    const now = new Date();
    const requests = await this.assignmentRequestModel
      .find({
        driverId: new Types.ObjectId(driverId),
        status: 'pending',
        expiresAt: { $gt: new Date() },
      })
      .populate({
        path: 'rideId',
        select:
          '_id customerId pickupAddress dropoffAddress totalFare rideType status distance duration pickupCoordinates dropoffCoordinates',
      })
      .sort({ createdAt: -1 });

    console.log(
      '[RidesController] 📋 Found',
      requests.length,
      'pending assignment requests',
    );
    return requests;
  }

  /**
   * Driver chấp nhận assignment request
   */
  @Post('assignment-requests/:requestId/accept')
  @UseGuards(JwtAuthGuard)
  async acceptAssignmentRequest(
    @Param('requestId') requestId: string,
    @Request() req: any,
  ) {
    const driverId = req.user.id;
    const ride = await this.autoAssignService.acceptAssignmentRequest(
      requestId,
      driverId,
    );

    // Fetch driver's wallet info to include in response
    const driver = await this.driverModel.findById(driverId);
    const walletBalance = driver?.walletBalance || 0;
    const walletWarning = walletBalance < 200000;

    return {
      ...(ride.toObject?.() || ride),
      walletBalance,
      walletWarning,
      walletWarningMessage: walletWarning
        ? 'Số dư ví dưới 200,000đ. Vui lòng nạp tiền để tiếp tục nhận cuốc.'
        : null,
    };
  }

  /**
   * Driver từ chối assignment request
   */
  @Post('assignment-requests/:requestId/reject')
  @UseGuards(JwtAuthGuard)
  async rejectAssignmentRequest(
    @Param('requestId') requestId: string,
    @Request() req: any,
    @Body('reason') reason?: string,
  ) {
    const driverId = req.user.id;
    return this.autoAssignService.rejectAssignmentRequest(
      requestId,
      driverId,
      reason,
    );
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
  async acceptRide(
    @Param('id') id: string,
    @Body('driverId') driverId: string,
  ) {
    console.log('[RidesController] Accept ride request:', {
      rideId: id,
      driverId,
    });
    try {
      const result = await this.ridesService.acceptRide(id, driverId);
      console.log('[RidesController] Ride accepted successfully:', result._id);

      // 📣 Notify customer: driver accepted
      const customerId = result.customerId?.toString();
      const driver = (await this.driverModel
        .findById(driverId)
        .select('firstName lastName')
        .lean()) as any;
      const driverName = driver
        ? `${driver.firstName} ${driver.lastName}`.trim()
        : 'Tài xế';
      if (customerId) {
        this.pushService
          .notifyCustomer(
            customerId,
            '🚗 Tài xế đã nhận chuyến!',
            `${driverName} đang trên đường đến đón bạn`,
            NotificationType.RIDE_ACCEPTED,
            { type: 'RIDE_ACCEPTED', rideId: id },
            id,
          )
          .catch(() => {});
      }

      return result;
    } catch (error) {
      console.error('[RidesController] Error accepting ride:', error.message);
      throw error;
    }
  }

  @Patch(':id/assign')
  async assignDriver(
    @Param('id') id: string,
    @Body('driverId') driverId: string,
  ) {
    return this.ridesService.assignDriver(id, driverId);
  }

  @Post(':id/auto-assign')
  async autoAssignDriver(@Param('id') id: string) {
    return this.autoAssignService.autoAssignDriver(id);
  }

  @Patch(':id/start')
  @UseGuards(JwtAuthGuard)
  async startRide(@Param('id') id: string) {
    const result = await this.ridesService.startRide(id);

    // 📣 Notify customer: trip started
    const customerId = result.customerId?.toString();
    if (customerId) {
      this.pushService
        .notifyCustomer(
          customerId,
          '🚀 Chuyến đi bắt đầu!',
          'Tài xế đang đưa bạn đến điểm đến. Chúc bạn có chuyến đi vui!',
          NotificationType.RIDE_STARTED,
          { type: 'RIDE_STARTED', rideId: id },
          id,
        )
        .catch(() => {});
    }

    return result;
  }

  /** Tài xế báo đã đến điểm đón */
  @Patch(':id/driver-arrived')
  @UseGuards(JwtAuthGuard)
  async driverArrived(@Param('id') id: string, @Request() req: any) {
    const ride = await this.ridesService.findById(id);
    if (!ride) throw new BadRequestException('Ride not found');

    // Cập nhật trạng thái vào database để app khách hàng cập nhật được
    await this.rideModel.findByIdAndUpdate(id, { status: 'arrived_pickup' });

    const customerId = ride.customerId
      ? (ride.customerId as any)?._id?.toString() ||
        (ride.customerId as any)?.toString()
      : null;

    if (customerId) {
      this.pushService
        .notifyCustomer(
          customerId,
          '📍 Tài xế đã đến điểm đón!',
          'Tài xế đang chờ bạn. Hãy ra xe ngay nhé!',
          NotificationType.DRIVER_ARRIVED,
          { type: 'DRIVER_ARRIVED', rideId: id },
          id,
        )
        .catch(() => {});
    }

    return { success: true, message: 'Customer notified of driver arrival' };
  }

  @Patch(':id/complete')
  @UseGuards(JwtAuthGuard)
  async completeRide(
    @Param('id') id: string,
    @Body('totalFare') totalFare?: number,
  ) {
    if (totalFare !== undefined && totalFare > 0) {
      await this.ridesService.updateRideData(id, { fare: totalFare });
    }

    const ride = await this.ridesService.completeRide(id);

    let walletBalance = 0;
    let walletWarning = false;

    if (ride.driverId) {
      const driverId =
        typeof ride.driverId === 'object' ? ride.driverId._id : ride.driverId;
      const driver = await this.driverModel.findById(driverId);

      if (driver) {
        walletBalance = driver.walletBalance;
        walletWarning = driver.walletBalance < 200000;

        // 📣 Notify driver: earnings
        const fare = (ride as any).fare || totalFare || ride.totalFare || 0;
        this.pushService
          .notifyDriver(
            driverId.toString(),
            '✅ Hoàn thành chuyến đi!',
            `Thu nhập +${fare.toLocaleString('vi-VN')}đ đã được ghi nhận vào ví`,
            NotificationType.RIDE_COMPLETED,
            { type: 'RIDE_COMPLETED', rideId: id },
            id,
          )
          .catch(() => {});
      }
    }

    // 📣 Notify customer: trip completed
    const customerId = ride.customerId?.toString();
    if (customerId) {
      this.pushService
        .notifyCustomer(
          customerId,
          '🎉 Chuyến đi hoàn thành!',
          'Cảm ơn bạn đã sử dụng dịch vụ. Hãy đánh giá tài xế nhé!',
          NotificationType.RIDE_COMPLETED,
          { type: 'RIDE_COMPLETED', rideId: id },
          id,
        )
        .catch(() => {});
    }

    return {
      ...ride.toObject(),
      walletBalance,
      walletWarning,
      walletWarningMessage: walletWarning
        ? 'Số dư ví dưới 200,000đ. Vui lòng nạp tiền để tiếp tục nhận cuốc.'
        : null,
    };
  }

  @Patch(':id/cancel')
  @UseGuards(JwtAuthGuard)
  async cancelRide(
    @Param('id') id: string,
    @Body('cancellationBy') cancellationBy: 'driver' | 'customer',
    @Body('reason') reason?: string,
  ) {
    const result = await this.ridesService.cancelRide(
      id,
      cancellationBy,
      reason,
    );

    const customerId = result.customerId?.toString();
    const driverId = result.driverId?.toString();

    if (cancellationBy === 'driver' && customerId) {
      // Customer gets notified that driver cancelled
      this.pushService
        .notifyCustomer(
          customerId,
          '❌ Chuyến bị hủy',
          'Tài xế đã hủy chuyến. Chúng tôi đang tìm tài xế khác cho bạn...',
          NotificationType.RIDE_CANCELLED,
          { type: 'RIDE_CANCELLED_BY_DRIVER', rideId: id },
          id,
        )
        .catch(() => {});
    } else if (cancellationBy === 'customer' && driverId) {
      // Driver gets notified that customer cancelled
      this.pushService
        .notifyDriver(
          driverId,
          '❌ Khách hủy chuyến',
          'Khách hàng đã hủy chuyến này.',
          NotificationType.RIDE_CANCELLED,
          { type: 'RIDE_CANCELLED_BY_CUSTOMER', rideId: id },
          id,
        )
        .catch(() => {});
    }

    return result;
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

  /**
   * Upload vehicle condition images (pre-trip or post-trip)
   * Maximum 5 images: front, back, left, right, interior
   * Images are sent as base64 strings in JSON body
   */
  @Post(':id/vehicle-condition/upload')
  @UseGuards(JwtAuthGuard)
  async uploadVehicleCondition(
    @Param('id') rideId: string,
    @Body() dto: UploadVehicleConditionDto,
    @Request() req: any,
  ) {
    console.log('🚗 [Vehicle Condition Upload] Request received');
    console.log('   Ride ID:', rideId);
    console.log('   Phase:', dto.phase);
    console.log('   Number of images:', dto.images?.length || 0);
    console.log('   User:', req.user?.id || 'no user');

    if (!dto.images || dto.images.length === 0) {
      throw new BadRequestException('At least one image is required');
    }

    if (dto.images.length > 5) {
      throw new BadRequestException('Maximum 5 images allowed');
    }

    const result = await this.ridesService.uploadVehicleCondition(
      rideId,
      dto.phase,
      dto.images,
    );
    console.log('✅ [Vehicle Condition Upload] Success');
    return result;
  }

  /**
   * Get vehicle condition info for a ride
   */
  @Get(':id/vehicle-condition')
  @UseGuards(JwtAuthGuard)
  async getVehicleCondition(@Param('id') rideId: string) {
    return this.ridesService.getVehicleCondition(rideId);
  }
}
