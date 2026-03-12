import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Delivery, DeliveryStatus } from '../schemas/delivery.schema';
import { Driver } from '../../drivers/schemas/driver.schema';
import { DeliveryAssignmentRequest, DeliveryAssignmentRequestDocument } from '../schemas/delivery-assignment-request.schema';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '../../config/config.service';
import { ServiceType } from '../../config/schemas/driver-search-config.schema';

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
  private timeoutHandlers = new Map<string, NodeJS.Timeout>(); // Track timeout handlers

  constructor(
    @InjectModel(Delivery.name) private deliveryModel: Model<Delivery>,
    @InjectModel(Driver.name) private driverModel: Model<Driver>,
    @InjectModel(DeliveryAssignmentRequest.name) private assignmentRequestModel: Model<DeliveryAssignmentRequestDocument>,
    private eventEmitter: EventEmitter2,
    private configService: ConfigService,
  ) {}

  /**
   * Tự động tìm và gửi request cho driver phù hợp nhất
   */
  async autoAssignDriver(deliveryId: string): Promise<{ success: boolean; message: string; requestId?: string }> {
    try {
      this.logger.log(`========== AUTO-ASSIGN START ==========`);
      this.logger.log(`[autoAssignDriver] Starting auto-assign for delivery: ${deliveryId}`);

      // Validate delivery ID
      if (!Types.ObjectId.isValid(deliveryId)) {
        this.logger.error(`[autoAssignDriver] Invalid delivery ID: ${deliveryId}`);
        throw new BadRequestException('Invalid delivery ID');
      }

      // Find delivery
      this.logger.log(`[autoAssignDriver] Fetching delivery from database...`);
      const delivery = await this.deliveryModel.findById(deliveryId).exec();
      if (!delivery) {
        this.logger.error(`[autoAssignDriver] Delivery not found: ${deliveryId}`);
        throw new NotFoundException(`Delivery with ID ${deliveryId} not found`);
      }

      this.logger.log(`[autoAssignDriver] ✅ Delivery found: ${delivery._id}`);
      this.logger.log(`[autoAssignDriver] Current status: ${delivery.status}`);
      this.logger.log(`[autoAssignDriver] Distance: ${delivery.distance}, Duration: ${delivery.duration}, Price: ${delivery.estimatedPrice}`);

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
        console.log(`[autoAssignDriver] Updating status to FINDING_DRIVER...`);
        await this.deliveryModel.findByIdAndUpdate(deliveryId, {
          status: DeliveryStatus.FINDING_DRIVER,
        });
      }

      // Get pickup coordinates
      const pickupLng = delivery.pickupCoordinates[0];
      const pickupLat = delivery.pickupCoordinates[1];

      console.log(`\n========== STARTING AUTO-ASSIGN ==========`)
      console.log(`[autoAssignDriver] Delivery ID: ${deliveryId}`);
      console.log(`[autoAssignDriver] Pickup coordinates: [${pickupLng}, ${pickupLat}]`);
      console.log(`[autoAssignDriver] Calling getAvailableDriversWithScores...`);

      // Find nearby available drivers and score them
      const driverScores = await this.getAvailableDriversWithScores(pickupLng, pickupLat);

      console.log(`[autoAssignDriver] 🎯 Driver scores returned: ${driverScores.length} drivers nearby`);
      if (driverScores.length > 0) {
        driverScores.forEach((ds, idx) => {
          console.log(`  [${idx + 1}] Driver ${ds.driver.firstName} ${ds.driver.lastName} (${ds.driver._id}): score=${ds.score.toFixed(2)}, distance=${ds.breakdown.distance.toFixed(1)}, rating=${ds.breakdown.rating}`);
        });
      }

      if (driverScores.length === 0) {
        console.error(`[autoAssignDriver] ❌ No available drivers found near delivery ${deliveryId}`);
        console.error(`[autoAssignDriver] Updating delivery status to NO_DRIVER_AVAILABLE...`);
        await this.deliveryModel.findByIdAndUpdate(deliveryId, {
          status: DeliveryStatus.NO_DRIVER_AVAILABLE,
        });
        console.log(`========== END AUTO-ASSIGN (NO DRIVERS) ==========\n`)
        return {
          success: false,
          message: 'No available drivers found in the area',
        };
      }

      // Get the best driver (highest score)
      const selectedDriver = driverScores[0];
      console.log(`[autoAssignDriver] ✅ Selected best driver: ${selectedDriver.driver.firstName} ${selectedDriver.driver.lastName} (${selectedDriver.driver._id}) with score ${selectedDriver.score.toFixed(2)}`);

      // Get timeout from config (DELIVERY service)
      const timeoutMs = await this.configService.getRequestTimeout(ServiceType.DELIVERY);

      // Create assignment request
      console.log(`[autoAssignDriver] Creating assignment request...`);
      const assignmentRequest = await this.createAssignmentRequest(
        deliveryId,
        selectedDriver.driver._id.toString(),
        selectedDriver.score,
        1, // attemptNumber = 1 (first attempt)
      );

      console.log(`[autoAssignDriver] ✅ Created assignment request ${assignmentRequest._id} for driver ${selectedDriver.driver._id}`);

      // Emit event để notify driver (via polling)
      this.eventEmitter.emit('delivery.assignment.request.created', {
        requestId: assignmentRequest._id,
        driverId: selectedDriver.driver._id,
        deliveryId: delivery._id,
        delivery: delivery,
        expiresAt: assignmentRequest.expiresAt,
        timeoutMs, // Pass timeout to frontend
      });
      console.log(`[autoAssignDriver] ✅ Event emitted for polling`);

      // Lên lịch timeout check
      this.scheduleTimeoutCheck(assignmentRequest._id.toString(), driverScores, timeoutMs);
      console.log(`[autoAssignDriver] ✅ Timeout check scheduled for ${timeoutMs}ms`);
      console.log(`========== END AUTO-ASSIGN (SUCCESS) ==========\n`)

      return {
        success: true,
        message: 'Assignment request sent to driver',
        requestId: assignmentRequest._id.toString(),
      };
    } catch (error) {
      console.error(`[autoAssignDriver] ❌ Error: ${error.message}`, error.stack);
      console.log(`========== END AUTO-ASSIGN (ERROR) ==========\n`)
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
    // Get timeout from config (DELIVERY service)
    const timeoutMs = await this.configService.getRequestTimeout(ServiceType.DELIVERY);
    const expiresAt = new Date(Date.now() + timeoutMs);

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
  private scheduleTimeoutCheck(requestId: string, driverScores: DriverScore[], timeoutMs: number) {
    const timeoutHandler = setTimeout(async () => {
      try {
        console.log(`\n========== TIMEOUT CHECK TRIGGERED ==========`)
        console.log(`[scheduleTimeoutCheck] ⏰ Timeout fired for request ${requestId}`)
        
        const request = await this.assignmentRequestModel.findById(requestId);
        
        if (!request) {
          console.log(`[scheduleTimeoutCheck] ❌ Request not found: ${requestId}`)
          this.timeoutHandlers.delete(requestId);
          return
        }

        console.log(`[scheduleTimeoutCheck] Request status: ${request.status}`)
        
        if (request.status !== 'pending') {
          console.log(`[scheduleTimeoutCheck] ⏸️ Request already handled (status: ${request.status}), skipping retry`)
          this.timeoutHandlers.delete(requestId);
          return;
        }

        console.log(`[scheduleTimeoutCheck] 📢 Delivery assignment request TIMEOUT`)
        console.log(`[scheduleTimeoutCheck] Driver: ${request.driverId}`)
        console.log(`[scheduleTimeoutCheck] Total drivers in list: ${driverScores.length}`)

        // Update status sang timeout
        await this.assignmentRequestModel.findByIdAndUpdate(requestId, {
          status: 'timeout',
          respondedAt: new Date(),
        });
        console.log(`[scheduleTimeoutCheck] ✅ Status updated to 'timeout'`)

        // IMPORTANT: Set driver back to available since they didn't accept
        // Driver should remain available for other requests
        console.log(`[scheduleTimeoutCheck] 🔄 Setting driver ${request.driverId} back to available`)
        await this.driverModel.findByIdAndUpdate(request.driverId, {
          isAvailable: true,
        });
        console.log(`[scheduleTimeoutCheck] ✅ Driver set to available`)

        // Retry với driver tiếp theo
        console.log(`[scheduleTimeoutCheck] 🔄 Calling retryWithNextDriver...`)
        await this.retryWithNextDriver(request, driverScores);
        console.log(`[scheduleTimeoutCheck] ✅ Retry completed`)
        
        this.timeoutHandlers.delete(requestId);
        console.log(`========== TIMEOUT CHECK COMPLETE ==========\n`)
      } catch (error) {
        console.error(`[scheduleTimeoutCheck] ❌ ERROR in timeout handler:`, error)
        console.error(`[scheduleTimeoutCheck] Error message:`, error instanceof Error ? error.message : String(error))
        console.error(`[scheduleTimeoutCheck] Error stack:`, error instanceof Error ? error.stack : '')
        this.timeoutHandlers.delete(requestId);
      }
    }, timeoutMs);

    this.timeoutHandlers.set(requestId, timeoutHandler);
  }

  /**
   * Thử lại với tài xế tiếp theo
   */
  private async retryWithNextDriver(
    previousRequest: DeliveryAssignmentRequestDocument,
    driverScores: DriverScore[], // Deprecated - will fetch fresh list
  ): Promise<void> {
    const attemptNumber = previousRequest.attemptNumber + 1;
    
    console.log(`\n========== RETRY WITH NEXT DRIVER (Attempt #${attemptNumber}) ==========`)
    console.log(`[retryWithNextDriver] 🔄 Previous driver rejected/timed out, finding next driver...`);
    console.log(`[retryWithNextDriver] Delivery: ${previousRequest.deliveryId}`);
    console.log(`[retryWithNextDriver] Previous driver: ${previousRequest.driverId}`);

    // ⭐ IMPORTANT: Fetch FRESH driver scores instead of using stale closure
    // The driverScores passed in may be from 45 seconds ago and won't include new drivers
    const delivery = await this.deliveryModel.findById(previousRequest.deliveryId);
    if (!delivery) {
      console.error(`[retryWithNextDriver] ❌ Delivery not found: ${previousRequest.deliveryId}`);
      throw new NotFoundException('Delivery not found');
    }

    const pickupLng = delivery.pickupCoordinates[0];
    const pickupLat = delivery.pickupCoordinates[1];
    
    console.log(`[retryWithNextDriver] 🔄 Fetching FRESH driver scores from [${pickupLng}, ${pickupLat}]...`);
    const freshDriverScores = await this.getAvailableDriversWithScores(pickupLng, pickupLat);
    console.log(`[retryWithNextDriver] 📊 Fresh driver pool size: ${freshDriverScores.length}`);

    // Lấy danh sách drivers đã được request rồi
    const previousRequests = await this.assignmentRequestModel.find({
      deliveryId: previousRequest.deliveryId,
    }).select('driverId status');

    const triedDriverIds = previousRequests.map(r => r.driverId.toString());
    console.log(`[retryWithNextDriver] Already tried: ${triedDriverIds.length} driver(s)`);
    previousRequests.forEach((r, idx) => console.log(`  [${idx + 1}] ${r.driverId} (status: ${r.status})`));

    // Tìm driver tiếp theo chưa được request - từ FRESH list
    console.log(`[retryWithNextDriver] Searching in fresh driver pool...`);
    const nextDriver = freshDriverScores.find(
      ds => !triedDriverIds.includes(ds.driver._id.toString())
    );

    if (!nextDriver) {
      console.error(`[retryWithNextDriver] ❌ No more drivers available for delivery ${previousRequest.deliveryId}`);
      console.error(`[retryWithNextDriver] Fresh pool size: ${freshDriverScores.length}, Already tried: ${triedDriverIds.length}`);
      console.error(`[retryWithNextDriver] Fresh pool IDs:`, freshDriverScores.map(d => d.driver._id.toString()));
      console.error(`[retryWithNextDriver] Tried IDs:`, triedDriverIds);
      
      // Update delivery status
      await this.deliveryModel.findByIdAndUpdate(previousRequest.deliveryId, {
        status: DeliveryStatus.NO_DRIVER_AVAILABLE,
      });

      // Emit event để notify customer
      this.eventEmitter.emit('delivery.no_driver_available', {
        deliveryId: previousRequest.deliveryId,
      });
      
      console.log(`[retryWithNextDriver] ========== END RETRY (NO DRIVERS AVAILABLE) ==========\n`)
      return;
    }

    console.log(`[retryWithNextDriver] ✅ Found next driver: ${nextDriver.driver.firstName} ${nextDriver.driver.lastName} (${nextDriver.driver._id})`);
    console.log(`[retryWithNextDriver] Next driver score: ${nextDriver.score.toFixed(2)}`);

    // Tạo request mới cho driver tiếp theo
    try {
      const newRequest = await this.createAssignmentRequest(
        previousRequest.deliveryId.toString(),
        nextDriver.driver._id.toString(),
        nextDriver.score,
        attemptNumber,
      );

      console.log(`[retryWithNextDriver] ✅ Created assignment request ${newRequest._id} for driver ${nextDriver.driver._id}`);
      console.log(`[retryWithNextDriver] 📋 Request will expire at: ${newRequest.expiresAt}`);

      // Get timeout from config
      const timeoutMs = await this.configService.getRequestTimeout(ServiceType.DELIVERY);

      // Emit event
      this.eventEmitter.emit('delivery.assignment.request.created', {
        requestId: newRequest._id,
        driverId: nextDriver.driver._id,
        deliveryId: previousRequest.deliveryId,
        expiresAt: newRequest.expiresAt,
        timeoutMs,
      });
      console.log(`[retryWithNextDriver] ✅ Event emitted for polling`);

      // Lên lịch timeout check - pass freshDriverScores instead of stale one
      this.scheduleTimeoutCheck(newRequest._id.toString(), freshDriverScores, timeoutMs);
      console.log(`[retryWithNextDriver] ✅ Timeout check scheduled for ${timeoutMs}ms`);
      console.log(`[retryWithNextDriver] ========== END RETRY (SUCCESS) ==========\n`);
    } catch (error) {
      console.error(`[retryWithNextDriver] ❌ Error creating assignment request:`, error);
      console.error(`[retryWithNextDriver] Error message:`, error instanceof Error ? error.message : String(error));
      console.error(`[retryWithNextDriver] ========== END RETRY (ERROR) ==========\n`)
      throw error;
    }
  }

  /**
   * Driver accept assignment request
   */
  async acceptAssignmentRequest(requestId: string, driverId: string): Promise<any> {
    const request = await this.assignmentRequestModel.findById(requestId);

    if (!request) {
      throw new NotFoundException('Assignment request not found');
    }

    // ✅ Only check driver ID match (driver assigned to this request can accept anytime)
    if (request.driverId.toString() !== driverId) {
      throw new BadRequestException('This request is not for you');
    }

    // Cancel timeout handler
    const timeoutHandler = this.timeoutHandlers.get(requestId);
    if (timeoutHandler) {
      clearTimeout(timeoutHandler);
      this.timeoutHandlers.delete(requestId);
    }

    // Atomic update request status
    const updatedRequest = await this.assignmentRequestModel.findOneAndUpdate(
      { _id: requestId },
      {
        status: 'accepted',
        respondedAt: new Date(),
      },
      { new: true }
    );

    if (!updatedRequest) {
      throw new BadRequestException('Could not accept request');
    }

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
    this.logger.log(`[rejectAssignmentRequest] Driver ${driverId} rejecting request ${requestId}, reason: ${reason || 'none'}`);
    
    const request = await this.assignmentRequestModel.findById(requestId);

    if (!request) {
      this.logger.error(`[rejectAssignmentRequest] ❌ Request ${requestId} not found`);
      throw new NotFoundException('Assignment request not found');
    }

    this.logger.log(`[rejectAssignmentRequest] Request found: status=${request.status}, driverId=${request.driverId}`);
    this.logger.log(`[rejectAssignmentRequest] Comparing: request.driverId=${request.driverId.toString()} vs calling driverId=${driverId}`);

    // ✅ Only check driver ID match (driver assigned to this request can reject anytime)
    if (request.driverId.toString() !== driverId) {
      this.logger.error(`[rejectAssignmentRequest] ❌ Driver ID mismatch!`);
      throw new BadRequestException('This request is not for you');
    }

    // Cancel timeout handler
    const timeoutHandler = this.timeoutHandlers.get(requestId);
    if (timeoutHandler) {
      clearTimeout(timeoutHandler);
      this.timeoutHandlers.delete(requestId);
    }

    // Update request status - atomic update
    const updatedRequest = await this.assignmentRequestModel.findOneAndUpdate(
      { _id: requestId },
      {
        status: 'rejected',
        respondedAt: new Date(),
        rejectionReason: reason,
      },
      { new: true }
    );

    if (!updatedRequest) {
      this.logger.error(`[rejectAssignmentRequest] ❌ Failed to update request`);
      throw new BadRequestException('Could not reject request');
    }

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
      select: '_id customerId pickupAddress dropoffAddress pickupCoordinates dropoffCoordinates distance duration estimatedPrice status',
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
    // Get search radius from config (default to 5000m if not set)
    const maxDistance = await this.configService.getSearchRadius(ServiceType.DELIVERY);

    console.log(`\n========== SEARCHING FOR DRIVERS ==========`)
    console.log(`[getAvailableDriversWithScores] Searching for drivers near [${lng}, ${lat}] within ${maxDistance}m`);

    // ⭐ FIRST: Get ALL online drivers to see what's filtered
    const allOnlineDrivers = await this.driverModel.find({
      isOnline: true,
    })
    .select('_id firstName lastName isOnline isAvailable isVerified currentLocation driverTypes deliveryEnabled')
    .exec();

    console.log(`[getAvailableDriversWithScores] 📊 Total ONLINE drivers: ${allOnlineDrivers.length}`);
    allOnlineDrivers.forEach((d: any) => {
      const driverTypesStr = Array.isArray(d.driverTypes) ? d.driverTypes.join(',') : d.driverTypes;
      console.log(`  [${d._id}] ${d.firstName} ${d.lastName}`);
      console.log(`       online=${d.isOnline}, available=${d.isAvailable}, verified=${d.isVerified}`);
      console.log(`       driverTypes=[${driverTypesStr}], deliveryEnabled=${d.deliveryEnabled}`);
      console.log(`       hasLocation=${!!d.currentLocation}`);
    });

    // Step 1: Check all drivers with delivery type (no location filter)
    const allDeliveryDrivers = await this.driverModel.find({
      driverTypes: { $in: ['delivery'] },
      isOnline: true,
    })
    .select('_id firstName lastName isOnline isAvailable isVerified currentLocation driverTypes')
    .exec();

    console.log(`[getAvailableDriversWithScores] 📦 Drivers with driverTypes containing 'delivery': ${allDeliveryDrivers.length}`);
    allDeliveryDrivers.forEach((d: any) => {
      const driverTypesStr = Array.isArray(d.driverTypes) ? d.driverTypes.join(',') : d.driverTypes;
      console.log(`  ✅ ${d.firstName} ${d.lastName} (${d._id}): online=${d.isOnline}, available=${d.isAvailable}, verified=${d.isVerified}, driverTypes=[${driverTypesStr}]`);
    });

    // ⭐ IMPORTANT: Debug geospatial filter
    // Calculate distance manually for all delivery drivers to see why Ho Van Trinh is filtered
    console.log(`\n[getAvailableDriversWithScores] 🔍 Analyzing which drivers pass geospatial filter...`);
    const deliveryDriversNearby = allDeliveryDrivers.filter((d: any) => {
      if (!d.isOnline || !d.isAvailable) {
        console.log(`  ❌ ${d.firstName} ${d.lastName} - FILTERED: not (online && available)`);
        return false;
      }

      if (!d.currentLocation || !d.currentLocation.coordinates) {
        console.log(`  ❌ ${d.firstName} ${d.lastName} - FILTERED: No valid currentLocation`);
        return false;
      }

      const driverLng = d.currentLocation.coordinates[0];
      const driverLat = d.currentLocation.coordinates[1];
      const distance = this.calculateDistance(lat, lng, driverLat, driverLng);

      if (distance > maxDistance) {
        console.log(`  ❌ ${d.firstName} ${d.lastName} - FILTERED: Too far (${distance.toFixed(0)}m > ${maxDistance}m)`);
        console.log(`       Driver location: [${driverLng}, ${driverLat}], Target: [${lng}, ${lat}]`);
        return false;
      }

      console.log(`  ✅ ${d.firstName} ${d.lastName} - PASSES: Distance ${distance.toFixed(0)}m`);
      return true;
    });

    console.log(`[getAvailableDriversWithScores] Total NEARBY delivery drivers: ${deliveryDriversNearby.length}\n`);

    // Step 2: Now apply full filters with geospatial
    const drivers = await this.driverModel.find({
      isAvailable: true,
      isOnline: true,
      driverTypes: { $in: ['delivery'] }, // Tìm tài xế có 'delivery' trong array driverTypes
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
    .select('_id firstName lastName phone vehiclePlate currentLocation averageRating totalTrips driverTypes')
    .limit(10)
    .exec();

    console.log(`[getAvailableDriversWithScores] 🎯 Final result - delivery drivers matching ALL criteria: ${drivers.length}`);
    drivers.forEach((d: any) => {
      const driverTypesStr = Array.isArray(d.driverTypes) ? d.driverTypes.join(',') : d.driverTypes;
      console.log(`  ✅ ${d.firstName} ${d.lastName} (${d._id}) - driverTypes: [${driverTypesStr}]`);
    });

    console.log(`========== END DRIVER SEARCH ==========\n`)

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