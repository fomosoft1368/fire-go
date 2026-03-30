import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DeliveryService } from '../services/delivery.service';
import { DeliveryAutoAssignService } from '../services/delivery-auto-assign.service';
import { CreateDeliveryDto } from '../dto/create-delivery.dto';
import { UpdateDeliveryDto } from '../dto/update-delivery.dto';
import { RateDeliveryDto } from '../dto/rate-delivery.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { DeliveryStatus } from '../schemas/delivery.schema';
import { Driver, DriverDocument } from '../../drivers/schemas/driver.schema';
import { Types } from 'mongoose';
import { PushNotificationService } from '../../notifications/push-notification.service';
import { NotificationType } from '../../notifications/schemas/notification.schema';

@Controller('deliveries')
export class DeliveryController {
  constructor(
    private readonly deliveryService: DeliveryService,
    private readonly deliveryAutoAssignService: DeliveryAutoAssignService,
    private readonly pushService: PushNotificationService,
    @InjectModel(Driver.name) private driverModel: Model<DriverDocument>,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() createDeliveryDto: CreateDeliveryDto, @Request() req) {
    console.log('[DeliveryController] ========== CREATE DELIVERY START ==========');
    console.log('[DeliveryController] Creating delivery for user:', req.user);
    console.log('[DeliveryController] User ID:', req.user.id || req.user.sub);
    console.log('[DeliveryController] DTO:', JSON.stringify(createDeliveryDto, null, 2));
    
    const delivery = await this.deliveryService.create({
      ...createDeliveryDto,
      customerId: new Types.ObjectId(req.user.id || req.user.sub),
    });

    console.log('[DeliveryController] ✅ Delivery created:', delivery._id);
    console.log('[DeliveryController] Delivery status:', delivery.status);
    console.log('[DeliveryController] Pickup coords:', delivery.pickupCoordinates);

    // Auto-assign driver asynchronously (don't wait for it)
    console.log('[DeliveryController] Setting up auto-assign timer for 1 second...');
    setTimeout(async () => {
      try {
        console.log('[DeliveryController] ⏰ Auto-assign timer triggered!');
        console.log('[DeliveryController] Calling autoAssignDriver for delivery:', delivery._id.toString());
        const result = await this.deliveryAutoAssignService.autoAssignDriver(delivery._id.toString());
        console.log('[DeliveryController] Auto-assign result:', JSON.stringify(result, null, 2));
      } catch (error) {
        console.error('[DeliveryController] ❌ Auto-assign error:', error);
        console.error('[DeliveryController] Error stack:', error.stack);
      }
    }, 1000);

    console.log('[DeliveryController] Returning delivery to client (auto-assign scheduled)');
    return delivery;
  }

  @Get()
  findAll(@Query('customerId') customerId?: string, @Query('status') status?: DeliveryStatus) {
    return this.deliveryService.findAll(customerId, status);
  }

  @Get('my-deliveries')
  @UseGuards(JwtAuthGuard)
  findMyDeliveries(@Request() req) {
    return this.deliveryService.findByCustomer(req.user.id || req.user.sub);
  }

  @Get('driver/:driverId')
  findByDriver(@Param('driverId') driverId: string) {
    return this.deliveryService.findByDriver(driverId);
  }

  @Get('nearby')
  findNearby(
    @Query('latitude') latitude: string,
    @Query('longitude') longitude: string,
    @Query('maxDistance') maxDistance?: string,
  ) {
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    const distance = maxDistance ? parseFloat(maxDistance) : undefined;
    return this.deliveryService.findNearbyDeliveries(lat, lng, distance);
  }

  @Get('stats/:customerId')
  getStats(@Param('customerId') customerId: string) {
    return this.deliveryService.getDeliveryStats(customerId);
  }

  @Get('my-stats')
  @UseGuards(JwtAuthGuard)
  getMyStats(@Request() req) {
    return this.deliveryService.getDeliveryStats(req.user.id || req.user.sub);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.deliveryService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(@Param('id') id: string, @Body() updateDeliveryDto: UpdateDeliveryDto) {
    const delivery = await this.deliveryService.update(id, updateDeliveryDto);
    const customerId = (delivery as any).customerId?._id?.toString() || (delivery as any).customerId?.toString();
    const driverId = (delivery as any).driverId?._id?.toString() || (delivery as any).driverId?.toString();

    if (updateDeliveryDto.status === DeliveryStatus.PICKING_UP) {
      // Tài xế vấn đang đến lấy hàng
      if (customerId) {
        this.pushService.notifyCustomer(
          customerId,
          '📦 Tài xế đang đến lấy hàng!',
          'Tài xế đang trên đường đến lấy đơn hàng của bạn',
          NotificationType.DELIVERY_PICKING_UP,
          { type: 'DELIVERY_PICKING_UP', deliveryId: id },
        ).catch(() => {});
      }
    } else if (updateDeliveryDto.status === DeliveryStatus.DELIVERING) {
      // Tài xế đã lấy hàng và đang giao
      if (customerId) {
        this.pushService.notifyCustomer(
          customerId,
          '🚚 Hàng đã được lấy, đang giao!',
          'Tài xế đã lấy đơn hàng và đang giao đến bạn',
          NotificationType.DELIVERY_DELIVERING,
          { type: 'DELIVERY_DELIVERING', deliveryId: id },
        ).catch(() => {});
      }
    } else if (updateDeliveryDto.status === DeliveryStatus.DELIVERED) {
      // Giao thành công
      if (customerId) {
        this.pushService.notifyCustomer(
          customerId,
          '✅ Giao hàng thành công!',
          'Đơn hàng đã được giao thành công. Cảm ơn bạn đã sử dụng dịch vụ!',
          NotificationType.DELIVERY_DELIVERED,
          { type: 'DELIVERY_DELIVERED', deliveryId: id },
        ).catch(() => {});
      }
      if (driverId) {
        const fare = (delivery as any).estimatedPrice || 0;
        this.pushService.notifyDriver(
          driverId,
          '💰 Hoàn thành giao hàng!',
          `Thu nhập đã được ghi nhận`,
          NotificationType.DELIVERY_DELIVERED,
          { type: 'DELIVERY_DELIVERED', deliveryId: id },
        ).catch(() => {});
      }
    } else if (updateDeliveryDto.status === DeliveryStatus.CANCELLED) {
      if (customerId) {
        this.pushService.notifyCustomer(
          customerId,
          '❌ Đơn giao hàng bị hủy',
          'Đơn hàng của bạn đã bị hủy',
          NotificationType.DELIVERY_CANCELLED,
          { type: 'DELIVERY_CANCELLED', deliveryId: id },
        ).catch(() => {});
      }
      if (driverId) {
        this.pushService.notifyDriver(
          driverId,
          '❌ Đơn giao hàng bị hủy',
          'Đơn hàng đã bị hủy bởi khách hàng',
          NotificationType.DELIVERY_CANCELLED,
          { type: 'DELIVERY_CANCELLED', deliveryId: id },
        ).catch(() => {});
      }
    }

    return delivery;
  }

  @Patch(':id/assign-driver')
  @UseGuards(JwtAuthGuard)
  assignDriver(@Param('id') id: string, @Body('driverId') driverId: string) {
    return this.deliveryService.assignDriver(id, driverId);
  }

  @Post(':id/rate')
  @UseGuards(JwtAuthGuard)
  rateDelivery(@Param('id') id: string, @Body() rateDeliveryDto: RateDeliveryDto) {
    return this.deliveryService.rateDelivery(id, rateDeliveryDto);
  }

  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard)
  async cancel(@Param('id') id: string, @Body('reason') reason: string) {
    const delivery = await this.deliveryService.cancel(id, reason);
    const customerId = (delivery as any).customerId?._id?.toString() || (delivery as any).customerId?.toString();
    const driverId = (delivery as any).driverId?._id?.toString() || (delivery as any).driverId?.toString();

    if (customerId) {
      this.pushService.notifyCustomer(
        customerId,
        '❌ Đơn giao hàng bị hủy',
        reason || 'Đơn hàng của bạn đã bị hủy',
        NotificationType.DELIVERY_CANCELLED,
        { type: 'DELIVERY_CANCELLED', deliveryId: id },
      ).catch(() => {});
    }
    if (driverId) {
      this.pushService.notifyDriver(
        driverId,
        '❌ Đơn giao hàng bị hủy',
        'Đơn hàng đã bị hủy bởi khách hàng',
        NotificationType.DELIVERY_CANCELLED,
        { type: 'DELIVERY_CANCELLED', deliveryId: id },
      ).catch(() => {});
    }

    return delivery;
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string) {
    return this.deliveryService.remove(id);
  }

  // ============= ASSIGNMENT REQUEST ENDPOINTS =============

  @Get('assignment-requests/pending')
  @UseGuards(JwtAuthGuard)
  async getPendingAssignmentRequests(@Request() req) {
    const driverId = req.user.id || req.user.sub;
    console.log('[DeliveryController] 🔍 Getting pending delivery assignment requests for driver:', driverId);
    const requests = await this.deliveryAutoAssignService.getPendingRequestsForDriver(driverId);
    console.log('[DeliveryController] 📋 Found', requests.length, 'pending delivery assignment requests');
    return requests;
  }

  @Post('assignment-requests/:requestId/accept')
  @UseGuards(JwtAuthGuard)
  async acceptAssignmentRequest(@Param('requestId') requestId: string, @Request() req) {
    const driverId = req.user.id || req.user.sub;
    const delivery = await this.deliveryAutoAssignService.acceptAssignmentRequest(requestId, driverId);
    
    // Push to customer: driver accepted delivery
    const customerId = (delivery as any).customerId?.toString();
    const driver = await this.driverModel.findById(driverId).select('firstName lastName').lean() as any;
    const driverName = driver ? `${driver.firstName} ${driver.lastName}` : 'Tài xế';
    console.log(`\n🚚 [Push] Delivery ACCEPTED — customerId: ${customerId}, driver: ${driverName}`);
    if (customerId) {
      this.pushService.notifyCustomer(
        customerId,
        '🚚 Tài xế đã nhận đơn!',
        `${driverName} đang trên đường đến lấy hàng`,
        NotificationType.DELIVERY_ASSIGNED,
        { type: 'DELIVERY_ACCEPTED', deliveryId: (delivery as any)._id?.toString() },
      ).catch(() => {});
    }

    const driverFull = await this.driverModel.findById(driverId);
    const walletBalance = driverFull?.walletBalance || 0;
    const walletWarning = walletBalance < 200000;

    return {
      ...delivery.toObject?.() || delivery,
      walletBalance,
      walletWarning,
      walletWarningMessage: walletWarning
        ? 'Số dư ví dưới 200,000đ. Vui lòng nạp tiền để tiếp tục nhận cuốc.'
        : null,
    };
  }

  @Post('assignment-requests/:requestId/reject')
  @UseGuards(JwtAuthGuard)
  async rejectAssignmentRequest(
    @Param('requestId') requestId: string,
    @Request() req,
    @Body('reason') reason?: string,
  ) {
    const driverId = req.user.id || req.user.sub;
    await this.deliveryAutoAssignService.rejectAssignmentRequest(requestId, driverId, reason);
    return { success: true, message: 'Request rejected' };
  }
}
