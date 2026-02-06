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
import { DeliveryService } from '../services/delivery.service';
import { DeliveryAutoAssignService } from '../services/delivery-auto-assign.service';
import { CreateDeliveryDto } from '../dto/create-delivery.dto';
import { UpdateDeliveryDto } from '../dto/update-delivery.dto';
import { RateDeliveryDto } from '../dto/rate-delivery.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { DeliveryStatus } from '../schemas/delivery.schema';
import { Types } from 'mongoose';

@Controller('api/deliveries')
export class DeliveryController {
  constructor(
    private readonly deliveryService: DeliveryService,
    private readonly deliveryAutoAssignService: DeliveryAutoAssignService,
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
    }, 1000); // Wait 1 second before auto-assign

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
  update(@Param('id') id: string, @Body() updateDeliveryDto: UpdateDeliveryDto) {
    return this.deliveryService.update(id, updateDeliveryDto);
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
  cancel(@Param('id') id: string, @Body('reason') reason: string) {
    return this.deliveryService.cancel(id, reason);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string) {
    return this.deliveryService.remove(id);
  }

  // ============= ASSIGNMENT REQUEST ENDPOINTS =============

  /**
   * Get pending assignment requests for driver
   * Used by driver app to poll for new delivery requests
   */
  @Get('assignment-requests/pending')
  @UseGuards(JwtAuthGuard)
  async getPendingAssignmentRequests(@Request() req) {
    const driverId = req.user.id || req.user.sub;
    console.log('[DeliveryController] 🔍 Getting pending delivery assignment requests for driver:', driverId);
    const requests = await this.deliveryAutoAssignService.getPendingRequestsForDriver(driverId);
    console.log('[DeliveryController] 📋 Found', requests.length, 'pending delivery assignment requests');
    return requests;
  }

  /**
   * Accept an assignment request
   */
  @Post('assignment-requests/:requestId/accept')
  @UseGuards(JwtAuthGuard)
  async acceptAssignmentRequest(@Param('requestId') requestId: string, @Request() req) {
    const driverId = req.user.id || req.user.sub;
    return this.deliveryAutoAssignService.acceptAssignmentRequest(requestId, driverId);
  }

  /**
   * Reject an assignment request
   */
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
