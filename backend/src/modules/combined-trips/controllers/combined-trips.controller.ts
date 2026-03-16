import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  BadRequestException,
  Patch,
  Request,
  UseGuards,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CombinedTripsService } from '../services/combined-trips.service';
import { CombinedTrip, CombinedTripStatus } from '../schemas/combined-trip.schema';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { RideRequest, RequestStatus } from '../schemas/ride-request.schema';
import { Driver } from '../../drivers/schemas/driver.schema';
import { DriversService } from '../../drivers/drivers.service';
import { Types } from 'mongoose';
import { PricingConfig } from '../../pricing/pricing-config.schema';

@Controller('combined-trips')
export class CombinedTripsController {
  constructor(
    private readonly combinedTripsService: CombinedTripsService,
    private eventEmitter: EventEmitter2,
    @InjectModel(RideRequest.name) private rideRequestModel: Model<RideRequest>,
    @InjectModel(CombinedTrip.name) private combinedTripModel: Model<CombinedTrip>,
    @InjectModel(Driver.name) private driverModel: Model<Driver>,
    @InjectModel('PricingConfig') private pricingConfigModel: Model<any>,
    private readonly driversService: DriversService,
  ) {}

  /**
   * POST /combined-trips
   * Create a new combined trip (share ride) - Driver only
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() createCombinedTripDto: any, @Request() req: any) {
    try {
      const driverId = req.user?.id || req.user?.sub;

      if (!driverId) {
        throw new BadRequestException('Driver ID not found in authentication token');
      }

      // ✅ DEBUG: Check what totalSeats value is received
      

      // ✅ CRITICAL FIX: Don't use driver's estimated totalFare
      // totalFare should be 0 initially, and will be updated as customers book
      // This ensures totalFare = sum of all customer fares, not driver's estimate
      let totalFare = 0;

      // ✅ FIX: Use totalSeats with proper fallback (only default if undefined, not if 0)
      const totalSeatsValue = createCombinedTripDto.totalSeats !== undefined 
        ? createCombinedTripDto.totalSeats 
        : (createCombinedTripDto.remainingSeats || 4);
      
     

      const tripData = {
        ...createCombinedTripDto,
        driverId: new Types.ObjectId(driverId),
        customerId: [],
        requestedAt: new Date(),
        totalFare, // Include calculated totalFare
        totalSeats: totalSeatsValue, // ✅ Use calculated value
        availableSeats: totalSeatsValue, // ✅ Same value for available seats
        createdBy: 'driver', // ✅ Mark this trip as driver-created
        // Convert coordinates to GeoJSON format
        pickupLocation: {
          type: 'Point',
          coordinates: createCombinedTripDto.pickupCoordinates || [0, 0],
        },
        dropoffLocation: {
          type: 'Point',
          coordinates: createCombinedTripDto.dropoffCoordinates || [0, 0],
        },
      };

      

      return await this.combinedTripsService.createCombinedTrip(tripData);
    } catch (error: any) {
      console.error('[CombinedTripsController] Error creating trip:', error);
      throw error;
    }
  }

  /**
   * POST /combined-trips/customer-request
   * Customer requests a new combined trip (like Grab)
   * System finds nearby drivers and sends notification
   */
  @Post('customer-request')
  @UseGuards(JwtAuthGuard)
  async customerRequest(@Body() requestDto: any, @Request() req: any) {
    const requestId = Date.now();

    
    try {
      const customerId = req.user?.id || req.user?.sub;

      if (!customerId) {
        throw new BadRequestException('Customer ID not found in authentication token');
      }

     

      // ✅ Check if customer already has an active trip (check in CombinedTrip)
      const activeTrip = await this.combinedTripsService.getCombinedTripsModel().findOne({
        customerId: new Types.ObjectId(customerId),
        status: { $in: ['pending', 'accepted', 'in_progress'] },
      });

      if (activeTrip) {
        throw new BadRequestException('Bạn đang có chuyến đi đang hoạt động. Vui lòng hoàn thành hoặc hủy chuyến trước khi tạo chuyến mới.');
      }

      // Create combined trip from customer
      // ⏱️ Set 15-minute timeout for customer-created trips
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now
      console.log('[CombinedTripsController] 🕐 Setting trip expiry:', expiresAt.toISOString());
      
      const trip = await this.combinedTripsService.createCustomerCombinedTrip({
        ...requestDto,
        customerId: new Types.ObjectId(customerId),
        expiresAt, // ✅ Add 15-minute timeout
      });

      // 🔧 REMOVED DUPLICATE LOG - already logged in service at line 495
      // console.log('✅ Customer combined trip created:', (trip as any)._id);
     

      // Find nearby available drivers and send notification
      await this.combinedTripsService.findAndNotifyDrivers((trip as any)._id.toString(), requestDto.pickupCoordinates);

      return {
        success: true,
        trip,
        message: 'Đang tìm tài xế gần bạn...',
      };
    } catch (error: any) {
      console.error('🆔', requestId, '❌ [CombinedTripsController] Error creating customer trip:', error);
    
      throw error;
    }
  }

  /**
   * PATCH /combined-trips/:id/cancel
   * Cancel a trip (customer cancellation)
   */
  @Patch(':id/cancel')
  @UseGuards(JwtAuthGuard)
  async cancelTrip(
    @Param('id') tripId: string,
    @Request() req: any,
  ) {
    try {
      // Use same pattern as customer-request endpoint
      const customerId = req.user?.id || req.user?.sub;
    
      
      if (!customerId) {
        throw new BadRequestException('Customer ID not found in authentication token');
      }

     

      const trip = await this.combinedTripsService.findById(tripId);
      if (!trip) {
        throw new BadRequestException('Trip not found');
      }

      // Check if customer owns this trip
      const customerOwnsTrip = (trip as any).customerId?.some(
        (id: any) => id.toString() === customerId
      );

      if (!customerOwnsTrip) {
        throw new BadRequestException('You are not authorized to cancel this trip');
      }

      console.log('🚫 [CancelTrip] Cancelling trip:', {
        tripId,
        customerId,
        currentStatus: trip.status,
        existingCancelledAt: trip.cancelledAt,
      });

      // ✅ CRITICAL: Use atomic update to prevent race conditions
      // Only update if status is NOT already cancelled
      const updatedTrip = await this.combinedTripModel.findOneAndUpdate(
        {
          _id: new Types.ObjectId(tripId),
          status: { $ne: CombinedTripStatus.CANCELLED }, // Only update if not already cancelled
        },
        {
          $set: {
            status: CombinedTripStatus.CANCELLED,
            cancelledAt: new Date(),
            cancellationBy: 'customer',
          }
        },
        { new: true }
      ).populate('customerId', 'firstName lastName phone')
        .populate('driverId', 'firstName lastName phone vehicleModel vehiclePlate');

      if (!updatedTrip) {
        // Trip was already cancelled or doesn't exist
        const existingTrip = await this.combinedTripModel.findById(tripId);
        if (existingTrip?.status === CombinedTripStatus.CANCELLED) {
          return {
            success: true,
            trip: existingTrip,
            message: 'Chuyến đi đã được hủy trước đó',
          };
        }
        throw new BadRequestException('Không thể hủy chuyến đi');
      }

      console.log('✅ [CancelTrip] Trip cancelled successfully:', {
        tripId,
        newStatus: updatedTrip?.status,
        cancelledAt: updatedTrip?.cancelledAt,
        cancellationBy: updatedTrip?.cancellationBy,
      });

      

      return {
        success: true,
        trip: updatedTrip,
        message: 'Chuyến đi đã được hủy',
      };
    } catch (error: any) {
      console.error('[CombinedTripsController] Error cancelling trip:', error);
      throw error;
    }
  }

  /**
   * PATCH /combined-trips/:id/complete
   * Mark a combined trip as completed by driver
   */
  @Patch(':id/complete')
  async completeTrip(
    @Param('id') combinedTripId: string,
    @Body('totalFare') totalFare?: number,
  ) {
    try {
      // Update trip status to completed with total fare
      const updateData: any = {
        status: CombinedTripStatus.COMPLETED,
        completedAt: new Date(),
      };

      // Save total fare if provided
      if (totalFare !== undefined && totalFare > 0) {
        updateData.totalFare = totalFare;
        console.log(`[CombinedTripsController] 💰 Saving total fare:`, {
          tripId: combinedTripId,
          totalFare: totalFare,
        });
      }

      const trip = await this.combinedTripsService.update(combinedTripId, updateData);

      if (!trip) {
        throw new BadRequestException('Trip not found');
      }

      // Update driver status back to available
      // ⚠️ CRITICAL: DO NOT deduct commission here!
      // Commission is already deducted per passenger in completeRequest()
      if (trip.driverId) {
        const driverId = typeof trip.driverId === 'object' ? trip.driverId._id : trip.driverId;
        await this.driverModel.findByIdAndUpdate(
          driverId,
          { 
            status: 'available',
            $inc: {
              totalRides: 1,
              completedRides: 1,
            },
          }
        );

        console.log(`[CombinedTripsController] ✅ Trip completed (commission already deducted per passenger):`, {
          tripId: combinedTripId,
          driverId: driverId.toString(),
          totalFare: totalFare || trip.totalFare || 0,
        });
      }

      // Fetch driver's updated wallet balance
      let walletBalance = 0;
      let walletWarning = false;

      if (trip.driverId) {
        const driverId = typeof trip.driverId === 'object' ? trip.driverId._id : trip.driverId;
        const driver = await this.driverModel.findById(driverId);

        if (driver) {
          walletBalance = driver.walletBalance || 0;
          walletWarning = driver.walletBalance < 200000;

          console.log(`[CombinedTripsController] 💰 Driver wallet after completion:`, {
            driverId: driverId.toString(),
            newBalance: walletBalance,
            warningNeeded: walletWarning,
          });
        }
      }

      return {
        ...trip.toObject ? trip.toObject() : trip,
        walletBalance,
        walletWarning,
        walletWarningMessage: walletWarning
          ? 'Số dư ví dưới 200,000đ. Vui lòng nạp tiền để tiếp tục nhận cuốc.'
          : null,
      };
    } catch (error: any) {
      console.error('[CombinedTripsController] Error completing trip:', error);
      throw error;
    }
  }

  /**
   * PATCH /combined-trips/:id/rate
   * Rate driver for a completed combined trip
   * Customer provides rating (1-5), optional comment, and tags
   * Increments driver's priorityScore by 0.1 for each completion
   */
  @Patch(':id/rate')
  @UseGuards(JwtAuthGuard)
  async rateCombinedTrip(
    @Param('id') combinedTripId: string,
    @Body('rating') rating: number,
    @Body('comment') comment?: string,
    @Body('tags') tags?: string[],
    @Request() req?: any,
  ) {
    try {
      const customerId = req.user?.id || req.user?.sub;

      if (!customerId) {
        throw new BadRequestException('Customer ID not found in authentication token');
      }

      // Validate rating
      if (!rating || rating < 1 || rating > 5) {
        throw new BadRequestException('Rating must be between 1 and 5');
      }

      console.log('[CombinedTripsController] 🌟 Rating combined trip:', {
        tripId: combinedTripId,
        customerId,
        rating,
        comment: comment || 'No comment',
        tags: tags || [],
      });

      // Find the combined trip
      const trip = await this.combinedTripModel.findById(combinedTripId);
      if (!trip) {
        throw new BadRequestException('Trip not found');
      }

      // ✅ CRITICAL FIX: Find THIS CUSTOMER's COMPLETED RideRequest
      // For combined trips, the trip may not be fully completed if other passengers are still riding
      // But each passenger can rate once their own request is completed
      // NOTE: A customer may have multiple requests (e.g., first was rejected/timeout, second was completed)
      // So we need to find the COMPLETED request specifically
      const customerRequest = await this.rideRequestModel.findOne({
        combinedTripId: new Types.ObjectId(combinedTripId),
        customerId: new Types.ObjectId(customerId),
        status: 'completed', // ✅ Only find completed requests
      });

      if (!customerRequest) {
        // Log all requests for debugging
        const allRequests = await this.rideRequestModel.find({
          combinedTripId: new Types.ObjectId(combinedTripId),
          customerId: new Types.ObjectId(customerId),
        });
        console.error('[CombinedTripsController] ❌ No completed request found. All requests:', 
          allRequests.map(r => ({ id: r._id, status: r.status, hasRated: r.hasRated }))
        );
        throw new BadRequestException('No completed ride request found for this trip. You can only rate trips you have completed.');
      }

      // ✅ Check if customer already rated this specific request
      if (customerRequest.hasRated) {
        throw new BadRequestException('You have already rated this trip');
      }

      // Update trip with rating (keep latest rating)
      trip.driverRating = rating;
      trip.driverReview = comment || '';
      await trip.save();

      // ✅ Mark request as rated to prevent duplicate ratings
      customerRequest.hasRated = true;
      await customerRequest.save();

      // Update driver rating and priority score
      if (trip.driverId) {
        const driverId = typeof trip.driverId === 'object' ? trip.driverId._id : trip.driverId;
        const driver = await this.driverModel.findById(driverId);

        if (driver) {
          // Calculate new average rating (weighted average)
          const currentTotal = driver.averageRating * driver.totalReviews;
          const newTotal = currentTotal + rating;
          const newReviewCount = driver.totalReviews + 1;
          const newAverageRating = newTotal / newReviewCount;

          // ✅ Increment priorityScore by 0.1 for each completed trip
          const newPriorityScore = (driver.priorityScore || 0) + 0.1;

          await this.driverModel.findByIdAndUpdate(driverId, {
            averageRating: newAverageRating,
            totalReviews: newReviewCount,
            priorityScore: newPriorityScore, // ✅ Key feature: priority scoring
          });

          console.log('[CombinedTripsController] ✅ Driver rating updated:', {
            driverId: driverId.toString(),
            oldRating: driver.averageRating,
            newRating: newAverageRating.toFixed(2),
            oldPriorityScore: driver.priorityScore || 0,
            newPriorityScore: newPriorityScore.toFixed(1),
            totalReviews: newReviewCount,
          });
        }
      }

      return {
        success: true,
        message: 'Cảm ơn bạn đã đánh giá!',
        trip: trip,
      };
    } catch (error: any) {
      console.error('[CombinedTripsController] Error rating trip:', error);
      throw error;
    }
  }

  /**
   * GET /combined-trips
   * Get all combined trips with optional filtering
   */
  @Get()
  async findAll(
    @Query('status') status?: string,
    @Query('driverId') driverId?: string,
  ) {
    try {
      

      const filters: any = {};
      if (status) {
        filters.status = status;
      }
      if (driverId) {
        filters.driverId = new Types.ObjectId(driverId);
      }

      const trips = await this.combinedTripsService.findAll(filters);

    
      return trips;
    } catch (error: any) {
      console.error('[CombinedTripsController] Error:', error);
      throw error;
    }
  }

  /**
   * GET /combined-trips/find-share-rides
   * Find share rides by location using configured search radius
   */
  @Get('find-share-rides')
  async findShareRides(
    @Query('lng') lng: number,
    @Query('lat') lat: number,
    @Query('pickupAddress') pickupAddress: string,
  ) {
    try {
     

      if (!lng || !lat || !pickupAddress) {
        throw new BadRequestException(
          'lng, lat, and pickupAddress are required',
        );
      }

      // Backend will use ConfigService.getSearchRadius(ServiceType.RIDESHARE)
      const rides = await this.combinedTripsService.findShareRides(
        Number(lng),
        Number(lat),
        pickupAddress,
      );

      return rides;
    } catch (error: any) {
      console.error('[CombinedTripsController] Error:', error);
      throw error;
    }
  }

  /**
   * GET /combined-trips/directions
   * Get route directions for rideshare trips with automatic waypoints
   * ✅ Optimized for Vietnam - adds waypoints for long distances
   * ⚠️ Public endpoint - no auth required
   */
  @Get('directions')
  async getDirections(
    @Query('startLng') startLng: number,
    @Query('startLat') startLat: number,
    @Query('endLng') endLng: number,
    @Query('endLat') endLat: number,
  ) {
    try {
      console.log('═══════════════════════════════════════════════════════════');
      console.log('🗺️ [GET /combined-trips/directions] Route called');
      console.log('📍 Coordinates:', {
        start: [startLng, startLat],
        end: [endLng, endLat],
      });
      console.log('═══════════════════════════════════════════════════════════');

      if (!startLng || !startLat || !endLng || !endLat) {
        throw new BadRequestException(
          'startLng, startLat, endLng, and endLat are required',
        );
      }

      const directions = await this.combinedTripsService.getDirections(
        Number(startLng),
        Number(startLat),
        Number(endLng),
        Number(endLat),
      );

      console.log('✅ Directions returned successfully');
      return directions;
    } catch (error: any) {
      console.error('[CombinedTripsController] Error getting directions:', error);
      throw error;
    }
  }

  /**
   * GET /combined-trips/driver/:driverId/pending-requests
   * Get all pending ride requests for a specific driver
   * Driver app polls this to discover new trip requests
   */
  @Get('driver/:driverId/pending-requests')
  async getDriverPendingRequests(@Param('driverId') driverId: string) {
    try {
      console.log('[CombinedTripsController] 🔍 Getting pending requests for driver:', driverId)

      // ✅ Validate driver ID format
      if (!driverId || !Types.ObjectId.isValid(driverId)) {
        console.warn('[CombinedTripsController] ❌ Invalid driver ID format:', driverId)
        throw new BadRequestException(`Invalid driver ID format: ${driverId}`)
      }

      // ✅ CHECK FOR EXPIRED REQUESTS FIRST
      const now = new Date()
      const expiredRequests = await this.rideRequestModel.find({
        driverId: new Types.ObjectId(driverId),
        status: 'pending',
        expiresAt: { $lt: now },
      })

      console.log(`[CombinedTripsController] 🕰️ Found ${expiredRequests.length} expired requests for this driver`)

      // Auto-reject expired requests and trigger finding next driver
      for (const expiredReq of expiredRequests) {
        console.log(`[CombinedTripsController] ⏰ Auto-rejecting expired request: ${expiredReq._id}`)
        
        await this.rideRequestModel.findByIdAndUpdate(expiredReq._id, {
          status: 'rejected',
        })
        
        // Trigger finding next driver for that trip
        const combinedTripId = expiredReq.combinedTripId.toString()
        const trip = await this.combinedTripsService.findById(combinedTripId)
        if (trip && trip.status === 'pending') {
          const pickupCoordinates = trip.pickupLocation?.coordinates as [number, number]
          if (pickupCoordinates) {
            console.log(`[CombinedTripsController] 🔄 Finding next driver for trip: ${combinedTripId}`)
            // Call asynchronously
            this.combinedTripsService.findAndNotifyDrivers(combinedTripId, pickupCoordinates).catch(err => {
              console.error('❌ Error finding next driver:', err)
            })
          }
        }
      }

      // Get active pending requests for this driver
      // ✅ Only include truly pending requests, exclude timeout/rejected/accepted
      const pendingRequests = await this.rideRequestModel
        .find({
          driverId: new Types.ObjectId(driverId),
          status: 'pending', // Strictly 'pending'
          expiresAt: { $gte: now }, // Not expired yet
        })
        .select('_id combinedTripId tripType createdBy customerId driverId status seats notes fare pickupAddress dropoffAddress pickupCoordinates dropoffCoordinates distance duration isPeakTime peakMultiplier createdAt updatedAt expiresAt +fare') // ⭐ CRITICAL: Include fare field EXPLICITLY with + prefix to force include
        .populate({
          path: 'combinedTripId',
          select: '_id pickupLocation dropoffLocation distance duration status -totalFare -estimatedPrice -fare', // ⭐ EXPLICITLY EXCLUDE: totalFare, estimatedPrice, fare - DO NOT return pricing from trip
          populate: {
            path: 'driverId',
            select: 'firstName lastName phone avatar rating currentLocation',
          }
        })
        .populate('customerId', 'firstName lastName phone avatar rating')
        .lean() // ⭐ Return lean documents (raw JS objects)
        .sort({ createdAt: -1 })
        .exec() // ⭐ Explicitly execute query

      console.log(`[CombinedTripsController] ✅ Found ${pendingRequests.length} active pending requests for driver: ${driverId}`)
      
      // ⭐ DEBUG: Log first request to verify fare field is included
      if (pendingRequests.length > 0) {
        const firstRequest = pendingRequests[0] as any
        console.log('═══════════════════════════════════════════════════════════')
        console.log('[CombinedTripsController] 🔍 DEBUG - First request object:')
        console.log('═══════════════════════════════════════════════════════════')
        console.log('REQUEST LEVEL:', {
          requestId: firstRequest._id,
          requestFareField: firstRequest.fare, // ⭐ THIS is what mobile app receives
          type: typeof firstRequest.fare,
          hasProperty: 'fare' in firstRequest,
        })
        console.log('COMBINED TRIP LEVEL:', {
          combinedTripId: (firstRequest.combinedTripId as any)?._id,
          tripTotalFare: (firstRequest.combinedTripId as any)?.totalFare,
          tripEstimatedPrice: (firstRequest.combinedTripId as any)?.estimatedPrice,
        })
        console.log('═══════════════════════════════════════════════════════════')
        console.log('📱 MOBILE APP WILL RECEIVE:', JSON.stringify({
          _id: firstRequest._id,
          fare: firstRequest.fare, // ⭐ This value
          combinedTripId: {
            _id: (firstRequest.combinedTripId as any)?._id,
            totalFare: (firstRequest.combinedTripId as any)?.totalFare,
          }
        }, null, 2))
        console.log('═══════════════════════════════════════════════════════════')
      }

      // ✅ Always return array (empty if no requests)
      return pendingRequests || []
    } catch (error: any) {
      console.error('[CombinedTripsController] ❌ Error getting driver pending requests:', error.message)
      console.error('[CombinedTripsController] Error details:', error)
      
      // Return meaningful error response
      if (error.message?.includes('Invalid')) {
        throw new BadRequestException(error.message)
      }
      
      throw error
    }
  }

  /**
   * GET /combined-trips/customer/:customerId
   * Get all combined trips (history) for a specific customer with their specific pickup/dropoff locations
   * Returns combined trips with embedded customer's RideRequest data
   */
  @Get('customer/:customerId')
  async getCustomerTrips(
    @Param('customerId') customerId: string,
  ) {
    try {
     

      // Validate customerId is a valid MongoDB ObjectId
      if (!Types.ObjectId.isValid(customerId)) {
        console.warn('[CombinedTripsController] Invalid customer ID format:', customerId);
        throw new BadRequestException('Invalid customer ID format');
      }

      const customerIdObj = new Types.ObjectId(customerId);
      

      // Step 1: Get all RideRequests for this customer (to get combined trips they booked)
      const rideRequests = await this.rideRequestModel
        .find({
          customerId: customerIdObj,
          tripType: 'combined_trip',
        })
        .populate({
          path: 'combinedTripId',
          populate: {
            path: 'driverId',
            select: 'firstName lastName phone avatar rating vehicleModel vehiclePlate',
          }
        })
        .sort({ createdAt: -1 })
        .exec();

      

      // Step 2: Extract combined trip IDs and enrich with customer's specific pickup/dropoff
      const enrichedTrips = rideRequests.map((request: any) => {
        const trip = request.combinedTripId;
        if (!trip) return null;

       

        const tripObj = trip.toObject ? trip.toObject() : trip;

        // Calculate booked seats for display
        const bookedSeats = (tripObj.totalSeats || 4) - (tripObj.availableSeats || 4);

        // IMPORTANT: Customer's locations must override driver's route
        // This is why we set customer fields AFTER spreading trip object
        return {
          ...tripObj,
          // ✅ CRITICAL: Include requestId so frontend can cancel the request
          requestId: request._id,
          // Override with customer's specific locations from RideRequest (these take priority)
          pickupAddress: request.pickupAddress,  // Customer's pickup, not driver's route
          dropoffAddress: request.dropoffAddress,  // Customer's dropoff, not driver's route
          pickupLocationAddress: request.pickupAddress,
          dropoffLocationAddress: request.dropoffAddress,
          customerPickupAddress: request.pickupAddress,
          customerDropoffAddress: request.dropoffAddress,
          customerPickupCoordinates: request.pickupCoordinates,
          customerDropoffCoordinates: request.dropoffCoordinates,
          customerFare: request.fare,
          customerSeats: request.seats,
          requestStatus: request.status,
          bookedSeats, // ✅ Số ghế đã đặt (để frontend hiển thị ghế occupied)
          // Keep original driver route for reference (for debugging)
          driverPickupAddress: tripObj.pickupAddress,
          driverDropoffAddress: tripObj.dropoffAddress,
        };
      }).filter(t => t !== null);

     
      return enrichedTrips || [];
    } catch (error: any) {
      console.error('[CombinedTripsController] ❌ Error getting customer trips:', {
        message: error.message,
        stack: error.stack
      });
      throw new BadRequestException('Failed to get customer trips: ' + error.message);
    }
  }

  /**
   * GET /combined-trips/:combinedTripId/requests
   * Get all requests for a combined trip (FOR AUTHENTICATED DRIVER ONLY)
   */
  /**
   * GET /combined-trips/:combinedTripId/requests
   * Get ride requests for a combined trip
   * Auth disabled - this is a polling endpoint for customer to check driver status
   */
  @Get(':combinedTripId/requests')
  // @UseGuards(JwtAuthGuard) // Disabled - polling endpoint, no sensitive data
  async getCombinedTripRequests(
    @Param('combinedTripId') combinedTripId: string,
    @Query('driverId') driverId: string, // Pass driverId via query for now
    @Request() req: any,
  ) {
    try {
      // ✅ REMOVED AUTO-TIMEOUT LOGIC - Let timeout checker handle it exclusively
      // This prevents duplicate findAndNotifyDrivers calls from polling
      
      // Temporarily allow without driverId to test
      if (!driverId) {
        console.warn('[CombinedTripsController] ⚠️ No driverId - will return ALL requests for this trip');
      }

      const combinedTripIdObj = new Types.ObjectId(combinedTripId);
      
      // Build query
      const query: any = {
        combinedTripId: new Types.ObjectId(combinedTripId),
      };
      
      // Only filter by status and driverId if driverId is provided (for driver polling)
      // For admin view (no driverId), return ALL requests regardless of status
      if (driverId) {
        query.driverId = new Types.ObjectId(driverId);
        query.status = 'pending'; // Only pending for driver
      }
      
      // Query with optional driverId filter
      const requests = await this.rideRequestModel.find(query)
        .populate({
          path: 'combinedTripId',
          select: '_id totalFare estimatedPrice fare pickupLocation dropoffLocation distance duration status',
          populate: {
            path: 'driverId',
            select: 'firstName lastName phone avatar rating currentLocation',
          }
        })
        .populate('customerId', 'firstName lastName phone avatar email')
        .sort({ createdAt: -1 })

     
      return requests;
    } catch (error: any) {
      console.error('[CombinedTripsController] ❌ Error getting requests:', {
        message: error.message,
        stack: error.stack,
        error: error,
      });
      throw error;
    }
  }

  /**
   * GET /combined-trips/:combinedTripId/requests/:requestId
   * Get a specific request for a combined trip
   */
  @Get(':combinedTripId/requests/:requestId')
  async getCombinedTripRequest(
    @Param('combinedTripId') combinedTripId: string,
    @Param('requestId') requestId: string,
  ) {
    try {
      const request = await this.rideRequestModel.findById(
        new Types.ObjectId(requestId),
      ).populate('customerId', 'name phone rating');

      if (!request) {
        throw new BadRequestException('Request not found');
      }

      return request;
    } catch (error: any) {
      console.error('[CombinedTripsController] Error getting request:', error);
      throw error;
    }
  }
  

  /**
   * POST /combined-trips/:combinedTripId/requests
   * Create ride request for combined trip
   */
  @Post(':combinedTripId/requests')
  async createCombinedTripRequest(
    @Param('combinedTripId') combinedTripId: string,
    @Body()
    body: {
      customerId: string;
      seats: number;
      fare: number;
      baseFare?: number; // 🚍 NEW: Base fare (TRƯỚC discount)
      pickupAddress: string;
      dropoffAddress: string;
      pickupCoordinates: [number, number];
      dropoffCoordinates: [number, number];
      distance: number;
      isPeakTime?: boolean;
      peakMultiplier?: number;
      hasFixedPrice?: boolean;  // 🚍 NEW: Inter-provincial fixed price flag
    },
  ) {
    try {
      const uid = Date.now();
      console.log('');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('🆔 [createCombinedTripRequest] REQUEST ID:', uid);
      console.log('📍 Creating request for combined trip:', combinedTripId);
      console.log('👤 Customer ID:', body.customerId);
      console.log('🚍 Has Fixed Price:', body.hasFixedPrice ? 'YES (Inter-provincial)' : 'NO (Distance-based)');
      console.log('═══════════════════════════════════════════════════════════');

      const combinedTripIdObj = new Types.ObjectId(combinedTripId);
      const customerIdObj = new Types.ObjectId(body.customerId);

      // ✅ Get the combined trip to find the driverId
      console.log('🔍 [', uid, '] Fetching combined trip from DB...');
      const combinedTrip = await this.combinedTripsService.getCombinedTripsModel()
        .findById(combinedTripIdObj)
        .populate('driverId')  // ✅ CRITICAL: Populate driverId field
        .exec();
      
      console.log('🔍 [', uid, '] Trip fetched:', {
        found: !!combinedTrip,
        tripId: combinedTrip?._id,
        tripStatus: combinedTrip?.status,
        driverId: combinedTrip?.driverId,
        driverIdExists: !!combinedTrip?.driverId,
      });
      
      if (!combinedTrip) {
        console.error('❌ [', uid, '] Combined trip NOT FOUND in database!');
        throw new BadRequestException('Combined trip not found');
      }

      if (!combinedTrip.driverId) {
        console.error('❌ [', uid, '] CRITICAL: Trip has NO driverId! Cannot create request.');
        console.error('❌ [', uid, '] Trip data:', {
          _id: combinedTrip._id,
          status: combinedTrip.status,
          createdBy: combinedTrip.createdBy,
          driverIdField: combinedTrip.driverId,
        });
        throw new BadRequestException('Chuyến xe này chưa có tài xế. Vui lòng chọn chuyến khác.');
      }
      
      const driverIdToUse = combinedTrip.driverId;
      console.log('✅ [', uid, '] Trip has driverId:', driverIdToUse);

      console.log('💰 [', uid, '] Pricing info:', {
        fare: body.fare,
        baseFare: body.baseFare,
        hasFixedPrice: body.hasFixedPrice,
        isPeakTime: body.isPeakTime,
        peakMultiplier: body.peakMultiplier,
      });

      // ✅ Check if customer already has active trip
      const activeCustomerTrip = await this.combinedTripsService.getCombinedTripsModel().findOne({
        customerId: customerIdObj,
        status: { $in: ['pending', 'accepted', 'in_progress'] },
      });

      if (activeCustomerTrip) {
        console.warn('⚠️ [', uid, '] Customer already has active trip:', activeCustomerTrip._id);
        throw new BadRequestException('Bạn đang có chuyến đi đang hoạt động.');
      }

      // ✅ Check if customer already has pending request for this trip (prevent duplicates)
      const existingRequest = await this.rideRequestModel.findOne({
        combinedTripId: combinedTripIdObj,
        customerId: customerIdObj,
        status: 'pending',
      });

      if (existingRequest) {
        console.log('ℹ️ [', uid, '] Existing pending request found, returning it:', existingRequest._id);
        return existingRequest.populate('customerId', 'name phone rating');
      }

      // ✅ Create request with driverId (send to THIS trip's driver only)
      console.log('📝 [', uid, '] Creating new RideRequest...');
      const newRequest = await this.rideRequestModel.create({
        combinedTripId: combinedTripIdObj,
        customerId: customerIdObj,
        driverId: driverIdToUse, // ✅ MUST have driverId - validated above
        tripType: 'combined_trip',
        createdBy: 'customer',
        pickupAddress: body.pickupAddress,
        dropoffAddress: body.dropoffAddress,
        pickupCoordinates: body.pickupCoordinates,
        dropoffCoordinates: body.dropoffCoordinates,
        distance: body.distance,
        fare: body.fare,
        baseFare: body.baseFare || body.fare, // 🚍 NEW: Base fare (fallback to fare if not provided)
        seats: body.seats,
        hasFixedPrice: body.hasFixedPrice ?? false, // 🚍 NEW: Mark fixed price requests
        isPeakTime: body.isPeakTime ?? false, // ✅ Save peak time status
        peakMultiplier: body.peakMultiplier ?? 1.0, // ✅ Save multiplier (1.0, 1.3, 1.5)
        status: 'pending',
        expiresAt: new Date(Date.now() + 45000), // ✅ CRITICAL FIX: 45 second timeout (enough for driver to poll + show modal)
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      console.log('✅ [', uid, '] RideRequest created in DB:', {
        requestId: newRequest._id,
        driverId: newRequest.driverId,
        fare: newRequest.fare,
        hasFixedPrice: newRequest.hasFixedPrice,
        status: newRequest.status,
        expiresAt: newRequest.expiresAt,
        expiresIn: '45 seconds',
      });

      
      // VERIFY driverId was set
      if (!newRequest.driverId) {
        console.error('❌❌❌ CRITICAL ERROR: Request created WITHOUT driverId!');
        throw new BadRequestException('Failed to set driver ID');
      }

      // ✅ EMIT EVENT for driver notification
      console.log('📬 [', uid, '] Emitting assignment.request.created event...');
      this.eventEmitter.emit('assignment.request.created', {
        requestId: newRequest._id,
        driverId: driverIdToUse,
        combinedTripId: combinedTripIdObj,
        customerId: customerIdObj,
        type: 'combined_trip',
        pickupAddress: body.pickupAddress,
        dropoffAddress: body.dropoffAddress,
        fare: body.fare,
        expiresAt: newRequest.expiresAt,
      });
      console.log('✅ [', uid, '] Event emitted to notification listener');

      // ❌ DO NOT add customer to trip yet! Wait for driver to accept.
      // Customer will be added in acceptRequest() method when driver accepts.

      const populatedRequest = await newRequest.populate('customerId', 'name phone rating');

      console.log('═══════════════════════════════════════════════════════════');
      console.log('✅ [', uid, '] REQUEST CREATION COMPLETE');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('');

      return populatedRequest;
    } catch (error: any) {
      console.error('[CombinedTripsController] Error:', error.message);
      throw new BadRequestException(`Failed to create request: ${error.message}`);
    }
  }

  /**
   * GET /combined-trips/:combinedTripId/requests/:requestId/status
   * Get request status
   */
  @Get(':combinedTripId/requests/:requestId/status')
  async getRequestStatus(
    @Param('combinedTripId') combinedTripId: string,
    @Param('requestId') requestId: string,
  ) {
    try {
      

      const request = await this.rideRequestModel.findById(requestId);

      if (!request) {
        console.warn('[CombinedTripsController] ⚠️ Request not found (possibly deleted):', requestId);
        // Return a response indicating the request was deleted/rejected
        return {
          _id: requestId,
          status: 'deleted',
          message: 'Request not found - may have been deleted or rejected',
        };
      }

    

      return request;
    } catch (error: any) {
      console.error('[CombinedTripsController] Lỗi:', error);
      throw error;
    }
  }

  /**
   * PATCH /combined-trips/:combinedTripId/requests/:requestId/accept
   * Accept request
   */
  @Patch(':combinedTripId/requests/:requestId/accept')
  async acceptRequest(
    @Param('combinedTripId') combinedTripId: string,
    @Param('requestId') requestId: string,
  ) {
    try {
      

      const request = await this.rideRequestModel.findById(requestId);

      if (!request) {
        throw new BadRequestException('Request not found');
      }

      // ✅ CRITICAL: Prevent double-accept
      if (request.status === 'accepted') {
       
        return { status: request.status };
      }

      

      // Get the trip to check current state
      const trip = await this.combinedTripsService.getCombinedTripsModel().findById(combinedTripId);
      
      if (!trip) {
        throw new BadRequestException('Trip not found');
      }

      // ✅ CRITICAL: Check if trip is cancelled - do NOT accept
      if (trip.status === CombinedTripStatus.CANCELLED) {
        console.error('❌ [acceptRequest] Trip is CANCELLED - cannot accept');
        throw new BadRequestException('Chuyến đi đã bị hủy');
      }

     
      // Determine what to do based on request type
      if (request.createdBy === 'customer' && !trip.driverId) {
        // Case 1: Customer created new trip, driver accepting → Add driver to trip
       
        
        // ✅ Check if driver is busy with ANY service (rides, delivery, combined-trips, hourly-services)
        const busyDriverIds = await this.driversService.getBusyDriverIds();
        if (busyDriverIds.includes(request.driverId.toString())) {
          throw new BadRequestException('Tài xế đang bận với một dịch vụ khác.');
        }

        // ✅ CRITICAL: Check driver wallet balance BEFORE accepting request
        // Calculate commission that will be deducted from driver wallet
        const pricingConfigs = await this.pricingConfigModel.find({}).limit(1);
        const driverShare = pricingConfigs?.[0]?.driverShare || 80; // Default 80%
        const platformCommission = Math.round((request.fare * (100 - driverShare)) / 100);
        
        // Get driver's current wallet balance
        const driver = await this.driverModel.findById(request.driverId);
        if (!driver) {
          throw new BadRequestException('Tài xế không tồn tại');
        }
        
        const driverWalletBalance = driver.walletBalance || 0;
        
        console.log('[acceptRequest] 💰 Wallet check (Case 1):', {
          driverId: request.driverId.toString(),
          fare: request.fare,
          driverShare: `${driverShare}%`,
          platformCommission,
          driverWalletBalance,
          isEnough: driverWalletBalance >= platformCommission,
        });
        
        // ✅ CRITICAL: Prevent accepting if wallet balance is insufficient
        if (driverWalletBalance < platformCommission) {
          console.error('[acceptRequest] ❌ Insufficient wallet balance:', {
            required: platformCommission,
            available: driverWalletBalance,
            shortage: platformCommission - driverWalletBalance,
          });
          
          throw new BadRequestException(
            `Số dư ví không đủ để nhận chuyến này. Cần ${platformCommission.toLocaleString()}đ, hiện có ${driverWalletBalance.toLocaleString()}đ. Vui lòng nạp thêm ${(platformCommission - driverWalletBalance).toLocaleString()}đ.`
          );
        }
        
        console.log('[acceptRequest] ✅ Wallet balance sufficient (Case 1), proceeding...');

        // Update request status
        await this.rideRequestModel.findByIdAndUpdate(
          requestId,
          { status: 'accepted' },
          { new: true },
        );

        // ✅ CRITICAL: Trừ số ghế ngay cả khi driver accept trip đầu tiên
        const seatsToDeduct = request.seats || 1;
       

        // ✅ VALIDATION: Don't allow if not enough seats
        if (trip.availableSeats < seatsToDeduct) {
          throw new BadRequestException(`Không đủ ghế trống. Còn ${trip.availableSeats} ghế, yêu cầu ${seatsToDeduct} ghế`);
        }

        // ✅ CRITICAL: Add driver to trip AND deduct seats - ONLY if not cancelled
        const updatedTrip = await this.combinedTripsService.getCombinedTripsModel().findOneAndUpdate(
          {
            _id: new Types.ObjectId(combinedTripId),
            status: { $ne: CombinedTripStatus.CANCELLED }, // ✅ Only update if not cancelled
          },
          { 
            $set: {
              status: CombinedTripStatus.ACCEPTED,
              driverId: request.driverId,
            },
            $inc: { availableSeats: -seatsToDeduct }, // ✅ Trừ seats
          },
          { new: true },
        );
        
        if (!updatedTrip) {
          throw new BadRequestException('Chuyến đi đã bị hủy hoặc không còn khả dụng');
        }

      } else if (request.createdBy === 'customer' && trip.driverId) {
        // Case 2: Customer joining existing trip → Add customer to trip
        

        // ✅ CRITICAL: Check driver wallet balance BEFORE accepting request
        // Calculate commission that will be deducted from driver wallet
        const pricingConfigs = await this.pricingConfigModel.find({}).limit(1);
        const driverShare = pricingConfigs?.[0]?.driverShare || 80; // Default 80%
        const platformCommission = Math.round((request.fare * (100 - driverShare)) / 100);
        
        // Get driver's current wallet balance
        const driver = await this.driverModel.findById(trip.driverId);
        if (!driver) {
          throw new BadRequestException('Tài xế không tồn tại');
        }
        
        const driverWalletBalance = driver.walletBalance || 0;
        
        console.log('[acceptRequest] 💰 Wallet check:', {
          driverId: trip.driverId.toString(),
          fare: request.fare,
          driverShare: `${driverShare}%`,
          platformCommission,
          driverWalletBalance,
          isEnough: driverWalletBalance >= platformCommission,
        });
        
        // ✅ CRITICAL: Prevent accepting if wallet balance is insufficient
        if (driverWalletBalance < platformCommission) {
          console.error('[acceptRequest] ❌ Insufficient wallet balance:', {
            required: platformCommission,
            available: driverWalletBalance,
            shortage: platformCommission - driverWalletBalance,
          });
          
          throw new BadRequestException(
            `Số dư ví không đủ để nhận chuyến này. Cần ${platformCommission.toLocaleString()}đ, hiện có ${driverWalletBalance.toLocaleString()}đ. Vui lòng nạp thêm ${(platformCommission - driverWalletBalance).toLocaleString()}đ.`
          );
        }
        
        console.log('[acceptRequest] ✅ Wallet balance sufficient, proceeding with accept...');

        // Update request status
        await this.rideRequestModel.findByIdAndUpdate(
          requestId,
          { status: 'accepted' },
          { new: true },
        );

        // Add customer to trip (use service method)
        await this.combinedTripsService.addCustomerToCombinedTrip(
          combinedTripId,
          request.customerId.toString(),
        );

        // ✅ CRITICAL: Trừ số ghế khi accept request
        const seatsToDeduct = request.seats || 1;

        
        // ✅ VALIDATION: Don't allow if not enough seats
        if (trip.availableSeats < seatsToDeduct) {
          throw new BadRequestException(`Không đủ ghế trống. Còn ${trip.availableSeats} ghế, yêu cầu ${seatsToDeduct} ghế`);
        }
        
        // ✅ CRITICAL: Only update if not cancelled
        const updatedTrip = await this.combinedTripsService.getCombinedTripsModel().findOneAndUpdate(
          {
            _id: new Types.ObjectId(combinedTripId),
            status: { $ne: CombinedTripStatus.CANCELLED },
          },
          { $inc: { availableSeats: -seatsToDeduct } },
          { new: true },
        );
        
        if (!updatedTrip) {
          throw new BadRequestException('Chuyến đi đã bị hủy hoặc không còn khả dụng');
        }
        

        // Sau khi thêm người ghép mới, cập nhật lại giá cho tất cả khách chưa hoàn thành
        await this.combinedTripsService.recalculateFaresForCombinedTrip(combinedTripId);

      

      } else {
        // Other cases (driver-created trips, etc.)
       
        
        // ✅ Check if driver is busy with ANY service
        if (request.driverId) {
          const busyDriverIds = await this.driversService.getBusyDriverIds();
          if (busyDriverIds.includes(request.driverId.toString())) {
            throw new BadRequestException('Tài xế đang bận với một dịch vụ khác.');
          }
        }
        
        // ✅ CRITICAL: Check driver wallet balance if driver is accepting
        if (request.driverId) {
          const pricingConfigs = await this.pricingConfigModel.find({}).limit(1);
          const driverShare = pricingConfigs?.[0]?.driverShare || 80;
          const platformCommission = Math.round((request.fare * (100 - driverShare)) / 100);
          
          const driver = await this.driverModel.findById(request.driverId);
          if (!driver) {
            throw new BadRequestException('Tài xế không tồn tại');
          }
          
          const driverWalletBalance = driver.walletBalance || 0;
          
          console.log('[acceptRequest] 💰 Wallet check (Other case):', {
            driverId: request.driverId.toString(),
            fare: request.fare,
            platformCommission,
            driverWalletBalance,
          });
          
          if (driverWalletBalance < platformCommission) {
            throw new BadRequestException(
              `Số dư ví không đủ để nhận chuyến này. Cần ${platformCommission.toLocaleString()}đ, hiện có ${driverWalletBalance.toLocaleString()}đ.`
            );
          }
        }
        
        // Update request status
        await this.rideRequestModel.findByIdAndUpdate(
          requestId,
          { status: 'accepted' },
          { new: true },
        );

        // ✅ CRITICAL FIX: Always update driverId when driver accepts - ONLY if not cancelled
        // This handles driver rotation case (driver 1 timeout → driver 2 accept)
        if (request.driverId) {
          const tripUpdate = await this.combinedTripsService.getCombinedTripsModel().findOneAndUpdate(
            {
              _id: new Types.ObjectId(combinedTripId),
              status: { $ne: CombinedTripStatus.CANCELLED },
            },
            { 
              $set: {
                status: CombinedTripStatus.ACCEPTED,
                driverId: request.driverId, // ✅ Always update to new accepting driver
              }
            },
          );
        }
      }

      return { status: request.status };
    } catch (error: any) {
      console.error('[CombinedTripsController] Error:', error);
      throw error;
    }
  }

  /**
   * PATCH /combined-trips/:combinedTripId/requests/:requestId/reject
   * Reject request
   */
  @Patch(':combinedTripId/requests/:requestId/reject')
  async rejectRequest(
    @Param('combinedTripId') combinedTripId: string,
    @Param('requestId') requestId: string,
  ) {
    try {
  

      const request = await this.rideRequestModel.findByIdAndUpdate(
        requestId,
        { status: 'rejected' },
        { new: true },
      );

      if (!request) {
        throw new BadRequestException('Request not found');
      }

  

      // Update combined trip status back to PENDING (still looking for driver)
      await this.combinedTripsService.updateCombinedTripStatus(
        combinedTripId,
        CombinedTripStatus.PENDING,
      );

      // ✅ IMPORTANT: Find next driver after rejection

      const trip = await this.combinedTripsService.getCombinedTripDetail(combinedTripId);
      if (trip && trip.pickupLocation?.coordinates) {
        const pickupCoordinates = trip.pickupLocation.coordinates as [number, number];
        
        // Wait 5 seconds before sending to next driver (give time for UI to update)
        setTimeout(() => {
 
          this.combinedTripsService.findAndNotifyDrivers(combinedTripId, pickupCoordinates)
            .catch(err => {
              console.error('❌ [rejectRequest] Error finding next driver:', err);
            });
        }, 5000);
      } else {
        console.warn('⚠️ [rejectRequest] Cannot find next driver - trip not found or no coordinates');
      }

      return { status: request.status };
    } catch (error: any) {
      console.error('[CombinedTripsController] Error:', error);
      throw error;
    }
  }

  /**
   * DELETE /combined-trips/:combinedTripId/requests/:requestId
   * Delete request completely from database
   */
  // @Patch(':combinedTripId/requests/:requestId/delete')
  // async deleteRequest(
  //   @Param('combinedTripId') combinedTripId: string,
  //   @Param('requestId') requestId: string,
  // ) {
  //   try {
  //     console.log('[CombinedTripsController] Deleting request:', {
  //       combinedTripId,
  //       requestId,
  //     });

  //     const deletedRequest = await this.rideRequestModel.findByIdAndDelete(requestId);

  //     if (!deletedRequest) {
  //       throw new BadRequestException('Request not found');
  //     }

  //     console.log('[CombinedTripsController] ✅ Request deleted:', requestId);
  //     return { message: 'Request deleted successfully', deletedId: requestId };
  //   } catch (error: any) {
  //     console.error('[CombinedTripsController] Error deleting request:', error);
  //     throw error;
  //   }
  // }

  /**
   * PATCH /combined-trips/:combinedTripId/requests/:requestId/mark-arrived
   * Mark request as arrived at pickup
   */
  @Patch(':combinedTripId/requests/:requestId/mark-arrived')
  async markArrived(
    @Param('combinedTripId') combinedTripId: string,
    @Param('requestId') requestId: string,
  ) {
    try {
      

      const request = await this.rideRequestModel.findByIdAndUpdate(
        requestId,
        { status: 'arrived_at_pickup' },
        { new: true },
      );

      if (!request) {
        throw new BadRequestException('Request not found');
      }

      return { status: request.status };
    } catch (error: any) {
      console.error('[CombinedTripsController] Error:', error);
      throw error;
    }
  }

  /**
   * PATCH /combined-trips/:combinedTripId/requests/:requestId/cancel
   * Customer cancels their ride request (only allowed when status = 'accepted')
   * - Sets request status to 'cancelled'
   * - Frees up seats on the combined trip
   * - Recalculates fares for remaining passengers
   */
  @Patch(':combinedTripId/requests/:requestId/cancel')
  @UseGuards(JwtAuthGuard)
  async cancelRideRequest(
    @Param('combinedTripId') combinedTripId: string,
    @Param('requestId') requestId: string,
    @Request() req: any,
  ) {
    try {
      

      // Get the ride request
      const request = await this.rideRequestModel.findById(requestId);

      if (!request) {
        throw new BadRequestException('Không tìm thấy yêu cầu đặt xe');
      }

      // ✅ Only allow cancel when status = 'accepted'
      if (request.status !== RequestStatus.ACCEPTED) {
        throw new BadRequestException(
          request.status === RequestStatus.ARRIVED_AT_PICKUP || request.status === RequestStatus.IN_PROGRESS
            ? 'Tài xế đã đến điểm đón hoặc đang di chuyển, không thể hủy chuyến'
            : `Không thể hủy chuyến ở trạng thái hiện tại: ${request.status}`
        );
      }

      // ✅ Verify customer owns this request
      const customerId = req.user?.id || req.user?.sub;
      if (String(request.customerId) !== String(customerId)) {
        throw new BadRequestException('Bạn không có quyền hủy yêu cầu này');
      }

      // ✅ Update request status to 'cancelled'
      request.status = RequestStatus.CANCELLED;
      await request.save();

    

      // ✅ Free up seats on combined trip AND remove customer from customerId array
      const trip = await this.combinedTripsService.getCombinedTripsModel().findById(combinedTripId);
      if (trip) {
        // Restore available seats
        trip.availableSeats += request.seats;
        
        // ✅ CRITICAL: Remove customer from customerId array
        if (Array.isArray(trip.customerId)) {
          trip.customerId = trip.customerId.filter(
            (id) => String(id) !== String(request.customerId)
          );
          console.log('[CombinedTripsController] ✅ Removed customer from trip:', {
            customerId: request.customerId,
            remainingCustomers: trip.customerId.length,
          });
        }
        
        await trip.save();
        console.log('[CombinedTripsController] ✅ Freed up seats:', {
          seats: request.seats,
          newAvailableSeats: trip.availableSeats,
          remainingCustomers: trip.customerId?.length || 0,
        });
      }

      // ✅ Recalculate fares for remaining passengers
      await this.combinedTripsService.recalculateFaresForCombinedTrip(combinedTripId);
  

      // TODO: Send socket notification to driver about cancellation

      return {
        success: true,
        message: 'Đã hủy chuyến đi thành công. Ghế của bạn đã được hoàn lại.',
        request: {
          _id: request._id,
          status: request.status,
          seats: request.seats,
        },
      };
    } catch (error: any) {
      console.error('[CombinedTripsController] ❌ Error cancelling request:', error);
      throw error;
    }
  }

  /**
   * PATCH /combined-trips/:combinedTripId/requests/:requestId/start-journey
   * Start journey with passenger
   */
  @Patch(':combinedTripId/requests/:requestId/start-journey')
  async startJourney(
    @Param('combinedTripId') combinedTripId: string,
    @Param('requestId') requestId: string,
  ) {
    try {
      

      const request = await this.rideRequestModel.findByIdAndUpdate(
        requestId,
        { status: 'in_progress' },
        { new: true },
      );

      if (!request) {
        throw new BadRequestException('Request not found');
      }

      return { status: request.status };
    } catch (error: any) {
      console.error('[CombinedTripsController] Error:', error);
      throw error;
    }
  }

  /**
   * PATCH /combined-trips/:combinedTripId/requests/:requestId/complete
   * Mark request as completed
   */
  @Patch(':combinedTripId/requests/:requestId/complete')
  async completeRequest(
    @Param('combinedTripId') combinedTripId: string,
    @Param('requestId') requestId: string,
  ) {
    try {
      const request = await this.rideRequestModel.findByIdAndUpdate(
        requestId,
        { status: 'completed' },
        { new: true },
      );

      if (!request) {
        throw new BadRequestException('Request not found');
      }

      // ⭐ DEDUCT commission IMMEDIATELY when each passenger completes
      // This deducts commission per passenger as they are dropped off
      const trip = await this.combinedTripModel.findById(combinedTripId);
      if (trip && trip.driverId) {
        const driverId = typeof trip.driverId === 'object' ? trip.driverId._id : trip.driverId;
        
        try {
          const pricingConfigs = await this.pricingConfigModel.find({}).limit(1);
          const driverShare = pricingConfigs?.[0]?.driverShare || 80; // Default 80% for driver
          const passengerFare = request.fare || 0;
          const platformCommission = Math.round((passengerFare * (100 - driverShare)) / 100);

          console.log(`[CombinedTripsController] 💳 Individual request completion - deducting commission:`, {
            requestId: requestId,
            driverId: driverId.toString(),
            passengerFare: passengerFare,
            driverShare: `${driverShare}%`,
            platformCommission: platformCommission,
            driverEarnings: passengerFare - platformCommission,
          });

          // Deduct commission from driver wallet immediately
          if (platformCommission > 0) {
            await this.driverModel.findByIdAndUpdate(driverId, {
              $inc: { walletBalance: -platformCommission },
            });

            console.log(`[CombinedTripsController] ✅ Deducted ${platformCommission}đ commission (${100 - driverShare}%) for passenger ${request.customerId}`);
          }
        } catch (commissionError) {
          console.warn(`[CombinedTripsController] ⚠️ Warning: Failed to deduct individual commission:`, commissionError.message);
          // Don't fail if commission deduction fails
        }
      }

      // IMPORTANT: Check if ALL passenger requests are completed
      // If yes, set driver back to available and update trip status
      if (trip && trip.driverId) {
        const allRequests = await this.rideRequestModel.find({
          combinedTripId: new Types.ObjectId(combinedTripId),
        });
        
        const allCompleted = allRequests.every(r => 
          r.status === 'completed' || r.status === 'cancelled'
        );
        
        if (allCompleted) {
          const driverId = typeof trip.driverId === 'object' ? trip.driverId._id : trip.driverId;
          await this.driverModel.findByIdAndUpdate(driverId, {
            isAvailable: true,
            status: 'available',
          });
          console.log(`[CombinedTripsController] ✅ All passengers completed, set driver ${driverId} back to available`);
          
          // ✅ CRITICAL: Only update to COMPLETED if trip is not already CANCELLED
          // Use atomic update to prevent overriding cancelled status
          await this.combinedTripModel.findOneAndUpdate(
            {
              _id: new Types.ObjectId(combinedTripId),
              status: { $ne: CombinedTripStatus.CANCELLED }, // Don't override cancelled
            },
            {
              $set: {
                status: CombinedTripStatus.COMPLETED,
                completedAt: new Date(),
              }
            }
          );
        }
      }

      return { status: request.status };
    } catch (error: any) {
      console.error('[CombinedTripsController] Error:', error);
      throw error;
    }
  }

  /**
   * PATCH /combined-trips/:combinedTripId/accept
   * Accept a combined trip (driver accepts the share ride)
   */
  @Patch(':combinedTripId/accept')
  @UseGuards(JwtAuthGuard)
  async acceptCombinedTrip(
    @Param('combinedTripId') combinedTripId: string,
    @Body('driverId') driverId: string,
  ) {
    try {
     
      const result = await this.combinedTripsService.acceptCombinedTrip(combinedTripId, driverId);
      
      return result;
    } catch (error) {
      console.error('[CombinedTripsController] Error accepting combined trip:', error.message);
      throw error;
    }
  }

  /**
   * GET /combined-trips/:combinedTripId/driver-location
   * Get driver's current location
   */
  @Get(':combinedTripId/driver-location')
  async getDriverLocation(@Param('combinedTripId') combinedTripId: string) {
    try {
      
      
      const trip = await this.combinedTripsService.getCombinedTripDetail(combinedTripId);
      
      if (!trip) {
        throw new BadRequestException('Trip not found');
      }

      // If trip is pending (no driver assigned yet), return pending status
      if (trip.status === 'pending' || !trip.driverId) {
        
        return {
          status: 'pending',
          message: 'Waiting for driver acceptance',
          currentLocation: null,
        };
      }

      // Return driver's current location (if available from real-time service)
      // For now, return driver's stored location
      return {
        driverId: trip.driverId._id,
        currentLocation: trip.driverId.currentLocation || {
          type: 'Point',
          coordinates: [0, 0],
        },
        status: trip.status,
        updatedAt: trip.updatedAt,
      };
    } catch (error: any) {
      console.error('[CombinedTripsController] Error:', error);
      throw error;
    }
  }

  /**
   * GET /combined-trips/:combinedTripId/route
   * Get navigation route from driver current location to dropoff
   */
  @Get(':combinedTripId/route')
  async getRoute(@Param('combinedTripId') combinedTripId: string) {
    try {
     
      
      const trip = await this.combinedTripsService.getCombinedTripDetail(combinedTripId);
      
      if (!trip?.driverId?.currentLocation || !trip?.dropoffLocation) {
        throw new BadRequestException('Missing location data');
      }

      const driverCoords = trip.driverId.currentLocation.coordinates;
      const dropoffCoords = trip.dropoffLocation.coordinates;

      // Call OSRM or Google Maps API for route
      // This should return polyline and route details
      return {
        tripId: trip._id,
        from: {
          coordinates: driverCoords,
          name: 'Vị trí tài xế',
        },
        to: {
          coordinates: dropoffCoords,
          name: trip.dropoffLocationAddress || 'Điểm đến',
        },
        // Route data would be fetched from OSRM/Google Maps
        // For now return empty - frontend should fetch from OSRM
        polyline: null,
        distance: 0,
        duration: 0,
      };
    } catch (error: any) {
      console.error('[CombinedTripsController] Error:', error);
      throw error;
    }
  }

  /**
   * GET /combined-trips/:combinedTripId
   * Get combined trip detail with enriched customer data
   * Route order: This route MUST be last to avoid matching specific routes
   */
  @Get(':combinedTripId')
  @UseGuards(JwtAuthGuard)
  async getCombinedTripDetail(
    @Param('combinedTripId') combinedTripId: string,
    @Request() req: any
  ) {
    try {
      console.log('[CombinedTripsController] ✅ GET /combined-trips/:id called, Trip ID:', combinedTripId);
      
      const trip = await this.combinedTripsService.getCombinedTripDetail(combinedTripId);

      if (!trip) {
        throw new BadRequestException('Trip not found');
      }

      // ⏱️ Check if customer-created trip has expired (15 minutes timeout)
      if (
        trip.createdBy === 'customer' &&
        trip.status === 'pending' &&
        trip.expiresAt &&
        new Date() > new Date(trip.expiresAt)
      ) {
        console.log('[CombinedTripsController] ⏰ Trip expired - auto-cancelling:', {
          tripId: combinedTripId,
          expiresAt: trip.expiresAt,
          now: new Date().toISOString(),
        });

        // Auto-cancel expired trip
        await this.combinedTripModel.findByIdAndUpdate(combinedTripId, {
          status: CombinedTripStatus.CANCELLED,
          cancelledAt: new Date(),
          cancellationReason: 'Không tìm thấy tài xế sau 15 phút',
          cancellationBy: 'system',
        });

        // Return updated trip status
        const cancelledTrip = await this.combinedTripsService.getCombinedTripDetail(combinedTripId);
        return cancelledTrip;
      }

      console.log('[CombinedTripsController] ✅ Trip status:', trip.status);
      console.log('[CombinedTripsController] ✅ Has driverId:', !!trip.driverId);

      return trip;
    } catch (error: any) {
      console.error('[CombinedTripsController] Error:', error);
      throw error;
    }
  }
}
