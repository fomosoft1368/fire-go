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
import { CreateDeliveryDto } from '../dto/create-delivery.dto';
import { UpdateDeliveryDto } from '../dto/update-delivery.dto';
import { RateDeliveryDto } from '../dto/rate-delivery.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { DeliveryStatus } from '../schemas/delivery.schema';
import { Types } from 'mongoose';

@Controller('api/deliveries')
export class DeliveryController {
  constructor(private readonly deliveryService: DeliveryService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() createDeliveryDto: CreateDeliveryDto, @Request() req) {
    console.log('[DeliveryController] Creating delivery for user:', req.user.userId);
    console.log('[DeliveryController] DTO:', createDeliveryDto);
    return this.deliveryService.create({
      ...createDeliveryDto,
      customerId: new Types.ObjectId(req.user.userId),
    });
  }

  @Get()
  findAll(@Query('customerId') customerId?: string, @Query('status') status?: DeliveryStatus) {
    return this.deliveryService.findAll(customerId, status);
  }

  @Get('my-deliveries')
  @UseGuards(JwtAuthGuard)
  findMyDeliveries(@Request() req) {
    return this.deliveryService.findByCustomer(req.user.userId);
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
    return this.deliveryService.getDeliveryStats(req.user.userId);
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
}
