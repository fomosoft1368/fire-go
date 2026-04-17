import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Delivery, DeliveryStatus } from '../schemas/delivery.schema';
import { Driver } from '../../drivers/schemas/driver.schema';
import { CreateDeliveryDto } from '../dto/create-delivery.dto';
import { UpdateDeliveryDto } from '../dto/update-delivery.dto';
import { RateDeliveryDto } from '../dto/rate-delivery.dto';
import { PricingConfig } from '../../pricing/pricing-config.schema';
import { TeamsService } from '../../teams/teams.service';

@Injectable()
export class DeliveryService {
  private readonly logger = new Logger(DeliveryService.name);

  constructor(
    @InjectModel(Delivery.name) private deliveryModel: Model<Delivery>,
    @InjectModel(Driver.name) private driverModel: Model<Driver>,
    @InjectModel('PricingConfig')
    private pricingConfigModel: Model<PricingConfig>,
    private teamsService: TeamsService,
  ) {}

  async create(createDeliveryDto: CreateDeliveryDto): Promise<Delivery> {
    console.log('[DeliveryService] Creating with data:', createDeliveryDto);
    const delivery = new this.deliveryModel({
      ...createDeliveryDto,
      status: DeliveryStatus.PENDING,
    });
    console.log('[DeliveryService] Model instance:', delivery);
    return delivery.save();
  }

  async findAll(
    customerId?: string,
    status?: DeliveryStatus,
  ): Promise<Delivery[]> {
    const filter: any = {};

    if (customerId) {
      filter.customerId = new Types.ObjectId(customerId);
    }

    if (status) {
      filter.status = status;
    }

    return this.deliveryModel
      .find(filter)
      .populate('customerId', 'name phone')
      .populate(
        'driverId',
        'firstName lastName phone vehiclePlate averageRating totalTrips avatar currentLocation',
      )
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string): Promise<Delivery> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid delivery ID');
    }

    const delivery = await this.deliveryModel
      .findById(id)
      .populate('customerId', 'name phone')
      .populate(
        'driverId',
        'firstName lastName phone vehiclePlate averageRating totalTrips avatar currentLocation',
      )
      .exec();

    if (!delivery) {
      throw new NotFoundException(`Delivery with ID ${id} not found`);
    }

    return delivery;
  }

  async findByCustomer(customerId: string): Promise<Delivery[]> {
    if (!Types.ObjectId.isValid(customerId)) {
      throw new BadRequestException('Invalid customer ID');
    }

    return this.deliveryModel
      .find({ customerId: new Types.ObjectId(customerId) })
      .populate(
        'driverId',
        'firstName lastName phone vehiclePlate averageRating totalTrips avatar currentLocation',
      )
      .sort({ createdAt: -1 })
      .exec();
  }

  async findByDriver(driverId: string): Promise<Delivery[]> {
    if (!Types.ObjectId.isValid(driverId)) {
      throw new BadRequestException('Invalid driver ID');
    }

    return this.deliveryModel
      .find({ driverId: new Types.ObjectId(driverId) })
      .populate('customerId', 'name phone')
      .sort({ createdAt: -1 })
      .exec();
  }

  async update(
    id: string,
    updateDeliveryDto: UpdateDeliveryDto,
  ): Promise<Delivery> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid delivery ID');
    }

    const delivery = await this.deliveryModel.findById(id);
    if (!delivery) {
      throw new NotFoundException(`Delivery with ID ${id} not found`);
    }

    // Update timestamps based on status changes
    if (updateDeliveryDto.status) {
      switch (updateDeliveryDto.status) {
        case DeliveryStatus.PICKING_UP:
          updateDeliveryDto['pickupTime'] = new Date();
          break;
        case DeliveryStatus.DELIVERED:
          updateDeliveryDto['deliveredTime'] = new Date();
          break;
        case DeliveryStatus.CANCELLED:
          updateDeliveryDto['cancelledTime'] = new Date();
          break;
      }
    }

    const updatedDelivery = await this.deliveryModel
      .findByIdAndUpdate(id, { $set: updateDeliveryDto }, { new: true })
      .populate('customerId', 'name phone')
      .populate(
        'driverId',
        'firstName lastName phone vehiclePlate averageRating totalTrips avatar currentLocation',
      )
      .exec();

    // IMPORTANT: When delivery is completed or cancelled, set driver back to available
    if (
      updatedDelivery.driverId &&
      (updateDeliveryDto.status === DeliveryStatus.DELIVERED ||
        updateDeliveryDto.status === DeliveryStatus.CANCELLED)
    ) {
      const driverId =
        typeof updatedDelivery.driverId === 'object'
          ? updatedDelivery.driverId._id
          : updatedDelivery.driverId;

      const isDelivered = updateDeliveryDto.status === DeliveryStatus.DELIVERED;
      
      await this.driverModel.findByIdAndUpdate(driverId, {
        isAvailable: true,
        ...(isDelivered ? { $inc: { totalRides: 1, completedRides: 1 } } : {})
      });

      this.logger.log(
        `Set driver ${driverId} back to available after delivery ${updateDeliveryDto.status}`,
      );

      // ⭐ DEDUCT commission from driver wallet when delivery is DELIVERED (20% default)
      if (updateDeliveryDto.status === DeliveryStatus.DELIVERED) {
        try {
          const pricingConfigs = await this.pricingConfigModel
            .find({})
            .limit(1);
          const driverShare = pricingConfigs?.[0]?.driverShare || 80; // Default 80%
          const platformCommission = Math.round(
            (updatedDelivery.estimatedPrice * (100 - driverShare)) / 100,
          );

          this.logger.log(`[DeliveryService] 💰 Wallet deduction:`, {
            driverId: driverId.toString(),
            estimatedPrice: updatedDelivery.estimatedPrice,
            driverShare: `${driverShare}%`,
            platformCommission: platformCommission,
          });

          // Deduct from driver wallet
          await this.driverModel.findByIdAndUpdate(driverId, {
            $inc: { walletBalance: -platformCommission },
          });

          this.logger.log(
            `[DeliveryService] ✅ Deducted ${platformCommission}đ from driver wallet (${100 - driverShare}% commission)`,
          );

          // Process marketing commission (Teams) using the 50/50 rule
          try {
            await this.teamsService.processMarketingCommission(
              driverId.toString(),
              id,
              platformCommission,
            );
            this.logger.log(
              `[DeliveryService] ✅ Calculated Marketing Team Commission for delivery (Platform Fee: ${platformCommission}đ)`,
            );
          } catch (e) {
            this.logger.warn(`[DeliveryService] ⚠️ Marketing Commission Error: ${e.message}`);
          }
        } catch (walletError) {
          this.logger.warn(
            `[DeliveryService] ⚠️ Warning: Failed to deduct wallet commission: ${walletError.message}`,
          );
          // Don't fail the delivery completion if wallet deduction fails
        }
      }
    }

    return updatedDelivery;
  }

  async assignDriver(deliveryId: string, driverId: string): Promise<Delivery> {
    if (
      !Types.ObjectId.isValid(deliveryId) ||
      !Types.ObjectId.isValid(driverId)
    ) {
      throw new BadRequestException('Invalid delivery ID or driver ID');
    }

    const delivery = await this.deliveryModel.findById(deliveryId);
    if (!delivery) {
      throw new NotFoundException(`Delivery with ID ${deliveryId} not found`);
    }

    if (
      delivery.status !== DeliveryStatus.FINDING_DRIVER &&
      delivery.status !== DeliveryStatus.PENDING
    ) {
      throw new BadRequestException(
        'Delivery is not available for driver assignment',
      );
    }

    return this.update(deliveryId, {
      driverId: new Types.ObjectId(driverId),
      status: DeliveryStatus.DRIVER_ASSIGNED,
    });
  }

  async rateDelivery(
    id: string,
    rateDeliveryDto: RateDeliveryDto,
  ): Promise<Delivery> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid delivery ID');
    }

    const delivery = await this.deliveryModel.findById(id);
    if (!delivery) {
      throw new NotFoundException(`Delivery with ID ${id} not found`);
    }

    if (delivery.status !== DeliveryStatus.DELIVERED) {
      throw new BadRequestException('Can only rate completed deliveries');
    }

    if (delivery.rating) {
      throw new BadRequestException('Delivery has already been rated');
    }

    const updatedDelivery = await this.deliveryModel
      .findByIdAndUpdate(
        id,
        {
          $set: {
            rating: rateDeliveryDto.rating,
            comment: rateDeliveryDto.comment,
            feedback: rateDeliveryDto.feedback,
          },
        },
        { new: true },
      )
      .populate('customerId', 'name phone')
      .populate(
        'driverId',
        'firstName lastName phone vehiclePlate averageRating totalTrips avatar currentLocation',
      )
      .exec();

    return updatedDelivery;
  }

  async cancel(id: string, reason: string): Promise<Delivery> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid delivery ID');
    }

    const delivery = await this.deliveryModel.findById(id);
    if (!delivery) {
      throw new NotFoundException(`Delivery with ID ${id} not found`);
    }

    if (
      delivery.status === DeliveryStatus.DELIVERED ||
      delivery.status === DeliveryStatus.CANCELLED
    ) {
      throw new BadRequestException(
        'Cannot cancel completed or already cancelled delivery',
      );
    }

    return this.update(id, {
      status: DeliveryStatus.CANCELLED,
      cancelReason: reason,
      cancelledTime: new Date(),
    });
  }

  async findNearbyDeliveries(
    latitude: number,
    longitude: number,
    maxDistance: number = 5000, // 5km default
  ): Promise<Delivery[]> {
    console.log('[DeliveryService] Finding nearby:', {
      latitude,
      longitude,
      maxDistance,
    });

    // TEMPORARY: Comment out distance filter for debugging
    const deliveries = await this.deliveryModel
      .find({
        // pickupCoordinates: {
        //   $near: {
        //     $geometry: {
        //       type: 'Point',
        //       coordinates: [longitude, latitude],
        //     },
        //     $maxDistance: maxDistance,
        //   },
        // },
        status: {
          $in: [DeliveryStatus.PENDING, DeliveryStatus.FINDING_DRIVER],
        },
      })
      .populate('customerId', 'name phone')
      .limit(20)
      .exec();

    console.log('[DeliveryService] Found deliveries:', deliveries.length);
    return deliveries;
  }

  async getDeliveryStats(customerId: string) {
    if (!Types.ObjectId.isValid(customerId)) {
      throw new BadRequestException('Invalid customer ID');
    }

    const customerObjectId = new Types.ObjectId(customerId);

    const [total, completed, cancelled, active] = await Promise.all([
      this.deliveryModel.countDocuments({ customerId: customerObjectId }),
      this.deliveryModel.countDocuments({
        customerId: customerObjectId,
        status: DeliveryStatus.DELIVERED,
      }),
      this.deliveryModel.countDocuments({
        customerId: customerObjectId,
        status: DeliveryStatus.CANCELLED,
      }),
      this.deliveryModel.countDocuments({
        customerId: customerObjectId,
        status: {
          $in: [
            DeliveryStatus.PENDING,
            DeliveryStatus.FINDING_DRIVER,
            DeliveryStatus.DRIVER_ASSIGNED,
            DeliveryStatus.PICKING_UP,
            DeliveryStatus.DELIVERING,
          ],
        },
      }),
    ]);

    return {
      total,
      completed,
      cancelled,
      active,
    };
  }

  async remove(id: string): Promise<Delivery> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid delivery ID');
    }

    const delivery = await this.deliveryModel.findByIdAndDelete(id).exec();
    if (!delivery) {
      throw new NotFoundException(`Delivery with ID ${id} not found`);
    }

    return delivery;
  }
}
