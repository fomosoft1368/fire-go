import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Delivery, DeliveryStatus } from '../schemas/delivery.schema';
import { Driver } from '../../drivers/schemas/driver.schema';
import { DeliveryAssignmentRequest, DeliveryAssignmentRequestDocument } from '../schemas/delivery-assignment-request.schema';
import { EventEmitter2 } from '@nestjs/event-emitter';

interface DriverScore {
  driver: any;
  score: number;
  breakdown: {
    distance: number;
    rating: number;
    completion: number;
  };
}

@Injectable()
export class DeliveryAutoAssignService {
  private readonly logger = new Logger(DeliveryAutoAssignService.name);
  private readonly REQUEST_TIMEOUT_SECONDS = 15; // Timeout 15 giây
  private timeoutHandlers = new Map<string, NodeJS.Timeout>(); // Track timeout handlers

  constructor(
    @InjectModel(Delivery.name) private deliveryModel: Model<Delivery>,
    @InjectModel(Driver.name) private driverModel: Model<Driver>,
    @InjectModel(DeliveryAssignmentRequest.name) private assignmentRequestModel: Model<DeliveryAssignmentRequestDocument>,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * Tự động tìm và gửi request cho driver phù hợp nhất
   */
  async autoAssignDriver(deliveryId: string): Promise<{ success: boolean; message: string; requestId?: string }> {
    try {
      this.logger.log(`[autoAssignDriver] Starting auto-assign for delivery: ${deliveryId}`);

      // Validate delivery ID
      if (!Types.ObjectId.isValid(deliveryId)) {
        throw new BadRequestException('Invalid delivery ID');
      }

      // Find delivery
      const delivery = await this.deliveryModel.findById(deliveryId).exec();
      if (!delivery) {
        throw new NotFoundException(`Delivery with ID ${deliveryId} not found`);
      }

      // Check if delivery is in valid status for assignment
      if (delivery.status !== DeliveryStatus.PENDING && delivery.status !== DeliveryStatus.FINDING_DRIVER) {
        this.logger.warn(`[autoAssignDriver] Delivery ${deliveryId} is not in valid status for assignment: ${delivery.status}`);
        return {
          success: false,
          message: `Delivery is not in valid status for assignment: ${delivery.status}`,
        };
      }

      // Update status to finding driver
      if (delivery.status === DeliveryStatus.PENDING) {
        await this.deliveryModel.findByIdAndUpdate(deliveryId, {
          status: DeliveryStatus.FINDING_DRIVER,
        });
      }

      // Get pickup coordinates
      const pickupLng = delivery.pickupCoordinates[0];
      const pickupLat = delivery.pickupCoordinates[1];

      this.logger.log(`[autoAssignDriver] Finding drivers near: [${pickupLng}, ${pickupLat}]`);

      // Find nearby available drivers and score them
      const driverScores = await this.getAvailableDriversWithScores(pickupLng, pickupLat);

      if (driverScores.length === 0) {
        this.logger.warn(`[autoAssignDriver] No available drivers found near delivery ${deliveryId}`);
        await this.deliveryModel.findByIdAndUpdate(deliveryId, {
          status: DeliveryStatus.NO_DRIVER_AVAILABLE,
        });
        return {
          success: false,
          message: 'No available drivers found in the area',
        };
      }

      // Get the best driver (highest score)
      const selectedDriver = driverScores[0];

      this.logger.log(`[autoAssignDriver] Selected driver: ${selectedDriver.driver._id} (score: ${selectedDriver.score})`);

      // Create assignment request
      const assignmentRequest = await this.createAssignmentRequest(
        deliveryId,
        selectedDriver.driver._id.toString(),
        selectedDriver.score,
        1, // attemptNumber = 1 (first attempt)
      );

      this.logger.log(
        `Created assignment request ${assignmentRequest._id} for driver ${selectedDriver.driver._id}`
      );

      // Emit event để notify driver (via polling)
      this.eventEmitter.emit('delivery.assignment.request.created', {
        requestId: assignmentRequest._id,
        driverId: selectedDriver.driver._id,
        deliveryId: delivery._id,
        delivery: delivery,
        expiresAt: assignmentRequest.expiresAt,
      });

      // Lên lịch timeout check
      this.scheduleTimeoutCheck(assignmentRequest._id.toString(), driverScores);

      return {
        success: true,
        message: 'Assignment request sent to driver',
        requestId: assignmentRequest._id.toString(),
      };
    } catch (error) {
      this.logger.error(`[autoAssignDriver] Error: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Tạo delivery assignment request
   */
  private async createAssignmentRequest(
    deliveryId: string,
    driverId: string,
    score: number,
    attemptNumber: number,
  ): Promise<DeliveryAssignmentRequestDocument> {
    const expiresAt = new Date(Date.now() + this.REQUEST_TIMEOUT_SECONDS * 1000);

    const request = new this.assignmentRequestModel({
      deliveryId: new Types.ObjectId(deliveryId),
      driverId: new Types.ObjectId(driverId),
      status: 'pending',
      score,
      expiresAt,
      attemptNumber,
    });

    return await request.save();
  }

  /**
   * Lên lịch kiểm tra timeout
   */
  private scheduleTimeoutCheck(requestId: string, driverScores: DriverScore[]) {
    const timeoutHandler = setTimeout(async () => {
      const request = await this.assignmentRequestModel.findById(requestId);
      
      if (!request || request.status !== 'pending') {
        this.timeoutHandlers.delete(requestId);
        return; // Đã được xử lý rồi
      }

      this.logger.warn(`Delivery assignment request ${requestId} timeout, retrying with next driver`);

      // Update status sang timeout
      await this.assignmentRequestModel.findByIdAndUpdate(requestId, {
        status: 'timeout',
        respondedAt: new Date(),
      });

      // IMPORTANT: Set driver back to available since they didn't accept
      // Driver should remain available for other requests
      this.logger.log(`Setting driver ${request.driverId} back to available after timeout`);
      await this.driverModel.findByIdAndUpdate(request.driverId, {
        isAvailable: true,
      });

      // Retry với driver tiếp theo
      await this.retryWithNextDriver(request, driverScores);
      this.timeoutHandlers.delete(requestId);
    }, this.REQUEST_TIMEOUT_SECONDS * 1000);

    this.timeoutHandlers.set(requestId, timeoutHandler);
  }

  /**
   * Thử lại với tài xế tiếp theo
   */
  private async retryWithNextDriver(
    previousRequest: DeliveryAssignmentRequestDocument,
    driverScores: DriverScore[],
  ): Promise<void> {
    const attemptNumber = previousRequest.attemptNumber + 1;
    
    // Lấy danh sách drivers đã được request rồi
    const previousRequests = await this.assignmentRequestModel.find({
      deliveryId: previousRequest.deliveryId,
    }).select('driverId');

    const triedDriverIds = previousRequests.map(r => r.driverId.toString());

    // Tìm driver tiếp theo chưa được request
    const nextDriver = driverScores.find(
      ds => !triedDriverIds.includes(ds.driver._id.toString())
    );

    if (!nextDriver) {
      this.logger.error(`No more drivers available for delivery ${previousRequest.deliveryId}`);
      
      // Update delivery status
      await this.deliveryModel.findByIdAndUpdate(previousRequest.deliveryId, {
        status: DeliveryStatus.NO_DRIVER_AVAILABLE,
      });

      // Emit event để notify customer
      this.eventEmitter.emit('delivery.no_driver_available', {
        deliveryId: previousRequest.deliveryId,
      });
      
      return;
    }

    // Tạo request mới cho driver tiếp theo
    const newRequest = await this.createAssignmentRequest(
      previousRequest.deliveryId.toString(),
      nextDriver.driver._id.toString(),
      nextDriver.score,
      attemptNumber,
    );

    this.logger.log(
      `Retry attempt ${attemptNumber}: Created assignment request ${newRequest._id} for driver ${nextDriver.driver._id}`
    );

    // Emit event
    this.eventEmitter.emit('delivery.assignment.request.created', {
      requestId: newRequest._id,
      driverId: nextDriver.driver._id,
      deliveryId: previousRequest.deliveryId,
      expiresAt: newRequest.expiresAt,
    });

    // Lên lịch timeout check
    this.scheduleTimeoutCheck(newRequest._id.toString(), driverScores);
  }

  /**
   * Driver accept assignment request
   */
  async acceptAssignmentRequest(requestId: string, driverId: string): Promise<any> {
    const request = await this.assignmentRequestModel.findById(requestId);

    if (!request) {
      throw new NotFoundException('Assignment request not found');
    }

    if (request.status !== 'pending') {
      throw new BadRequestException(`Request is already ${request.status}`);
    }

    if (request.driverId.toString() !== driverId) {
      throw new BadRequestException('This request is not for you');
    }

    // Check if request expired
    if (new Date() > request.expiresAt) {
      await this.assignmentRequestModel.findByIdAndUpdate(requestId, {
        status: 'timeout',
        respondedAt: new Date(),
      });
      throw new BadRequestException('Request has expired');
    }

    // Cancel timeout handler
    const timeoutHandler = this.timeoutHandlers.get(requestId);
    if (timeoutHandler) {
      clearTimeout(timeoutHandler);
      this.timeoutHandlers.delete(requestId);
    }

    // Update request status
    await this.assignmentRequestModel.findByIdAndUpdate(requestId, {
      status: 'accepted',
      respondedAt: new Date(),
    });

    // Assign driver to delivery
    const delivery = await this.deliveryModel.findByIdAndUpdate(
      request.deliveryId,
      {
        driverId: new Types.ObjectId(driverId),
        status: DeliveryStatus.DRIVER_ASSIGNED,
      },
      { new: true },
    )
    .populate('driverId', 'firstName lastName phone vehiclePlate averageRating totalTrips avatar currentLocation')
    .populate('customerId', 'firstName lastName phone avatar')
    .exec();

    // Mark driver as unavailable
    await this.driverModel.findByIdAndUpdate(driverId, {
      isAvailable: false,
    });

    // Cancel all other pending requests for this delivery
    await this.assignmentRequestModel.updateMany(
      {
        deliveryId: request.deliveryId,
        _id: { $ne: requestId },
        status: 'pending',
      },
      {
        status: 'cancelled',
        respondedAt: new Date(),
      },
    );

    // Emit event
    this.eventEmitter.emit('delivery.assignment.request.accepted', {
      requestId: request._id,
      deliveryId: delivery._id,
      driverId: driverId,
    });

    this.logger.log(`Driver ${driverId} accepted delivery assignment ${requestId}`);

    return delivery;
  }

  /**
   * Driver reject assignment request
   */
  async rejectAssignmentRequest(requestId: string, driverId: string, reason?: string): Promise<void> {
    const request = await this.assignmentRequestModel.findById(requestId);

    if (!request) {
      throw new NotFoundException('Assignment request not found');
    }

    if (request.driverId.toString() !== driverId) {
      throw new BadRequestException('This request is not for you');
    }

    if (request.status !== 'pending') {
      throw new BadRequestException(`Request is already ${request.status}`);
    }

    // Cancel timeout handler
    const timeoutHandler = this.timeoutHandlers.get(requestId);
    if (timeoutHandler) {
      clearTimeout(timeoutHandler);
      this.timeoutHandlers.delete(requestId);
    }

    // Update request status
    await this.assignmentRequestModel.findByIdAndUpdate(requestId, {
      status: 'rejected',
      respondedAt: new Date(),
      rejectionReason: reason,
    });

    // IMPORTANT: Set driver back to available when they reject
    // Driver should remain available for other requests
    this.logger.log(`Driver ${driverId} rejected delivery assignment ${requestId}, setting back to available`);
    await this.driverModel.findByIdAndUpdate(driverId, {
      isAvailable: true,
    });

    // IMPORTANT: Retry immediately with next driver when rejected (don't wait for timeout)
    const delivery = await this.deliveryModel.findById(request.deliveryId);
    if (delivery && delivery.status === DeliveryStatus.FINDING_DRIVER) {
      this.logger.log(`Retrying delivery ${delivery._id} with next driver after rejection`);
      
      // Get fresh list of available drivers and scores
      const [lng, lat] = delivery.pickupCoordinates;
      const availableDrivers = await this.getAvailableDriversWithScores(lng, lat);
      
      if (availableDrivers.length > 0) {
        // Retry with next driver immediately
        await this.retryWithNextDriver(request, availableDrivers);
      } else {
        this.logger.warn(`No more drivers available for delivery ${delivery._id}`);
        await this.deliveryModel.findByIdAndUpdate(delivery._id, {
          status: DeliveryStatus.NO_DRIVER_AVAILABLE,
        });
      }
    }
  }

  /**
   * Get pending assignment requests for a driver
   */
  async getPendingRequestsForDriver(driverId: string): Promise<any[]> {
    const requests = await this.assignmentRequestModel.find({
      driverId: new Types.ObjectId(driverId),
      status: 'pending',
      expiresAt: { $gt: new Date() }, // Only active requests
    })
    .populate({
      path: 'deliveryId',
      populate: [
        { path: 'customerId', select: 'firstName lastName phone avatar' },
      ],
    })
    .sort({ createdAt: -1 })
    .exec();

    return requests;
  }

  /**
   * Get available drivers with scores
   */
  private async getAvailableDriversWithScores(lng: number, lat: number): Promise<DriverScore[]> {
    const maxDistance = 5000; // 5km

    // Debug: log query params
    this.logger.log(`[getAvailableDriversWithScores] Searching for drivers near [${lng}, ${lat}] within ${maxDistance}m`);

    const drivers = await this.driverModel.find({
      isAvailable: true,
      isOnline: true,
      isVerified: true,
      currentLocation: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [lng, lat],
          },
          $maxDistance: maxDistance,
        },
      },
    })
    .select('_id firstName lastName phone vehiclePlate currentLocation averageRating totalTrips')
    .limit(10)
    .exec();

    this.logger.log(`[getAvailableDriversWithScores] Found ${drivers.length} drivers matching criteria`);

    // Score drivers
    const driverScores: DriverScore[] = drivers.map((driver: any) => {
      const distance = this.calculateDistance(
        lat,
        lng,
        driver.currentLocation.coordinates[1],
        driver.currentLocation.coordinates[0]
      );

      const rating = driver.averageRating || 0;
      const totalTrips = driver.totalTrips || 0;

      // Scoring:
      // - Distance: 0-40 points (closer = better)
      // - Rating: 0-30 points (5 stars = 30 points)
      // - Completion: 0-20 points (more trips = better)
      
      const distanceScore = Math.max(0, 40 - (distance / maxDistance) * 40);
      const ratingScore = (rating / 5) * 30;
      const completionScore = Math.min(20, (totalTrips / 100) * 20);

      const score = distanceScore + ratingScore + completionScore;

      return {
        driver,
        score,
        breakdown: {
          distance: distanceScore,
          rating: ratingScore,
          completion: completionScore,
        },
      };
    });

    // Sort by score (highest first)
    return driverScores.sort((a, b) => b.score - a.score);
  }

  /**
   * Calculate distance between two points in meters (Haversine formula)
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Find nearby available drivers for delivery
   */
  async findNearbyDrivers(
    latitude: number,
    longitude: number,
    radius: number = 5000,
    limit: number = 10,
  ) {
    try {
      const drivers = await this.driverModel.find({
        isAvailable: true,
        isOnline: true,
        isVerified: true,
        currentLocation: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [longitude, latitude],
            },
            $maxDistance: radius,
          },
        },
      })
      .select('_id firstName lastName phone vehiclePlate currentLocation averageRating totalTrips avatar')
      .limit(limit)
      .exec();

      return drivers;
    } catch (error) {
      this.logger.error(`[findNearbyDrivers] Error: ${error.message}`, error.stack);
      throw error;
    }
  }
}