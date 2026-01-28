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
import { CombinedTripsService } from '../services/combined-trips.service';
import { CombinedTripStatus } from '../schemas/combined-trip.schema';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { RideRequest } from '../../rides/schemas/ride-request.schema';
import { Types } from 'mongoose';

@Controller('api/combined-trips')
export class CombinedTripsController {
  constructor(
    private readonly combinedTripsService: CombinedTripsService,
    @InjectModel(RideRequest.name) private rideRequestModel: Model<RideRequest>,
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

      console.log('🆕 [CombinedTripsController] Creating combined trip for driver:', driverId);
      console.log('📍 Received coordinates:', {
        pickupCoordinates: createCombinedTripDto.pickupCoordinates,
        dropoffCoordinates: createCombinedTripDto.dropoffCoordinates,
      });

      // Calculate totalFare if not provided
      let totalFare = createCombinedTripDto.totalFare;
      if (!totalFare) {
        totalFare =
          (createCombinedTripDto.baseFare || 0) +
          (createCombinedTripDto.distanceFare || 0) +
          (createCombinedTripDto.timeFare || 0) +
          (createCombinedTripDto.surgePricing || 0);
        console.log('💰 Calculated totalFare:', totalFare);
      }

      const tripData = {
        ...createCombinedTripDto,
        driverId: new Types.ObjectId(driverId),
        customerId: [],
        requestedAt: new Date(),
        totalFare, // Include calculated totalFare
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

      console.log('📍 Converted to GeoJSON:', {
        pickupLocation: tripData.pickupLocation,
        dropoffLocation: tripData.dropoffLocation,
      });

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
    try {
      const customerId = req.user?.id || req.user?.sub;

      if (!customerId) {
        throw new BadRequestException('Customer ID not found in authentication token');
      }

      console.log('🚗 [CombinedTripsController] Customer requesting combined trip:', customerId);
      console.log('📍 Request data:', {
        pickupAddress: requestDto.pickupAddress,
        dropoffAddress: requestDto.dropoffAddress,
        pickupCoordinates: requestDto.pickupCoordinates,
        dropoffCoordinates: requestDto.dropoffCoordinates,
        seats: requestDto.seats,
      });

      // ✅ Check if customer already has an active trip (check in CombinedTrip)
      const activeTrip = await this.combinedTripsService.getCombinedTripsModel().findOne({
        customerId: new Types.ObjectId(customerId),
        status: { $in: ['pending', 'accepted', 'in_progress'] },
      });

      if (activeTrip) {
        throw new BadRequestException('Bạn đang có chuyến đi đang hoạt động. Vui lòng hoàn thành hoặc hủy chuyến trước khi tạo chuyến mới.');
      }

      // Create combined trip from customer
      const trip = await this.combinedTripsService.createCustomerCombinedTrip({
        ...requestDto,
        customerId: new Types.ObjectId(customerId),
      });

      console.log('✅ Customer combined trip created:', (trip as any)._id);

      // Find nearby available drivers and send notification
      await this.combinedTripsService.findAndNotifyDrivers((trip as any)._id.toString(), requestDto.pickupCoordinates);

      return {
        success: true,
        trip,
        message: 'Đang tìm tài xế gần bạn...',
      };
    } catch (error: any) {
      console.error('[CombinedTripsController] Error creating customer trip:', error);
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
      
      console.log('[CombinedTripsController] Cancel request - user:', req.user);
      console.log('[CombinedTripsController] Extracted customerId:', customerId);
      
      if (!customerId) {
        throw new BadRequestException('Customer ID not found in authentication token');
      }

      console.log('❌ [CombinedTripsController] Cancelling trip:', tripId, 'by customer:', customerId);

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

      // Update trip status to cancelled
      const updatedTrip = await this.combinedTripsService.update(tripId, {
        status: CombinedTripStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelledBy: 'customer',
      });

      console.log('✅ Trip cancelled successfully:', tripId);

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
   * GET /combined-trips
   * Get all combined trips with optional filtering
   */
  @Get()
  async findAll(
    @Query('status') status?: string,
    @Query('driverId') driverId?: string,
  ) {
    try {
      console.log('[CombinedTripsController] Getting all combined trips:', {
        status,
        driverId,
      });

      const filters: any = {};
      if (status) {
        filters.status = status;
      }
      if (driverId) {
        filters.driverId = new Types.ObjectId(driverId);
      }

      const trips = await this.combinedTripsService.findAll(filters);

      console.log('✅ Found trips:', trips.length);
      return trips;
    } catch (error: any) {
      console.error('[CombinedTripsController] Error:', error);
      throw error;
    }
  }

  /**
   * GET /combined-trips/find-share-rides
   * Find share rides by location
   */
  @Get('find-share-rides')
  async findShareRides(
    @Query('lng') lng: number,
    @Query('lat') lat: number,
    @Query('pickupAddress') pickupAddress: string,
    @Query('maxDistance') maxDistance?: number,
  ) {
    try {
      console.log('[CombinedTripsController] Finding share rides:', {
        lng,
        lat,
        pickupAddress,
        maxDistance,
      });

      if (!lng || !lat || !pickupAddress) {
        throw new BadRequestException(
          'lng, lat, and pickupAddress are required',
        );
      }

      const rides = await this.combinedTripsService.findShareRides(
        Number(lng),
        Number(lat),
        pickupAddress,
        maxDistance ? Number(maxDistance) : 10000,
      );

      return rides;
    } catch (error: any) {
      console.error('[CombinedTripsController] Error:', error);
      throw error;
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
      console.log('🔍 [CombinedTripsController] ROUTE MATCHED: customer/:customerId');
      console.log('[CombinedTripsController] 📜 Getting combined trips for customer:', customerId);

      // Validate customerId is a valid MongoDB ObjectId
      if (!Types.ObjectId.isValid(customerId)) {
        console.warn('[CombinedTripsController] Invalid customer ID format:', customerId);
        throw new BadRequestException('Invalid customer ID format');
      }

      const customerIdObj = new Types.ObjectId(customerId);
      console.log('[CombinedTripsController] Converted to ObjectId:', customerIdObj);

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

      console.log('[CombinedTripsController] Found ride requests:', rideRequests.length);

      // Step 2: Extract combined trip IDs and enrich with customer's specific pickup/dropoff
      const enrichedTrips = rideRequests.map((request: any) => {
        const trip = request.combinedTripId;
        if (!trip) return null;

        console.log('[CombinedTripsController] Processing trip:', {
          tripId: trip._id,
          customerPickupAddress: request.pickupAddress,
          customerDropoffAddress: request.dropoffAddress,
          driverId: trip.driverId,
          tripPickupAddress: trip.pickupAddress,
          tripDropoffAddress: trip.dropoffAddress,
        });

        const tripObj = trip.toObject ? trip.toObject() : trip;

        // IMPORTANT: Customer's locations must override driver's route
        // This is why we set customer fields AFTER spreading trip object
        return {
          ...tripObj,
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
          // Keep original driver route for reference (for debugging)
          driverPickupAddress: tripObj.pickupAddress,
          driverDropoffAddress: tripObj.dropoffAddress,
        };
      }).filter(t => t !== null);

      console.log('[CombinedTripsController] ✅ Found enriched customer trips:', enrichedTrips.length);
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
   * TEMPORARY: Auth disabled for testing - will re-enable after mobile-driver fixes
   */
  @Get(':combinedTripId/requests')
  // @UseGuards(JwtAuthGuard) // TODO: Re-enable after mobile-driver sends token
  async getCombinedTripRequests(
    @Param('combinedTripId') combinedTripId: string,
    @Query('driverId') driverId: string, // Pass driverId via query for now
    @Request() req: any,
  ) {
    try {
      console.log('');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('[CombinedTripsController] 🔴 ENDPOINT /requests GỌI');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('[CombinedTripsController] 📋 Query driverId:', driverId || 'NONE');
      console.log('[CombinedTripsController] 🔐 Auth object:', req.user);
      
      // Temporarily allow without driverId to test
      if (!driverId) {
        console.warn('[CombinedTripsController] ⚠️ No driverId - will return ALL requests for this trip');
      }

      console.log('');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('[CombinedTripsController] 🔴 ENDPOINT /requests GỌI');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('[CombinedTripsController] 🔍 Getting requests for combinedTripId:', combinedTripId);
      console.log('[CombinedTripsController] 👤 Using Driver ID:', driverId || 'ALL (no filter)');

      const combinedTripIdObj = new Types.ObjectId(combinedTripId);
      console.log('[CombinedTripsController] ✅ Converted to ObjectId:', combinedTripIdObj.toString());

      console.log('[CombinedTripsController] 🔄 About to query database...');
      
      // Build query
      const query: any = {
        combinedTripId: new Types.ObjectId(combinedTripId),
        status: 'pending',
      };
      
      // Only filter by driverId if provided
      if (driverId) {
        query.driverId = new Types.ObjectId(driverId);
        console.log('[CombinedTripsController] ✅ Filtering by driverId:', driverId);
      } else {
        console.log('[CombinedTripsController] ⚠️ NO FILTER - Returning ALL requests');
      }
      
      // Query with optional driverId filter
      const requests = await this.rideRequestModel.find(query)
        .populate('customerId', 'name phone rating')
        .sort({ createdAt: -1 });

      console.log('[CombinedTripsController] ✅ Query completed successfully');
      console.log('[CombinedTripsController] ✅ Found requests for this driver:', {
        count: requests.length,
        combinedTripId,
        driverId,
        requestDetails: requests.map(r => ({ 
          _id: r._id.toString(), 
          status: r.status,
          customerId: r.customerId,
          fare: r.fare,
          createdAt: r.createdAt,
        })),
      });
      console.log('═══════════════════════════════════════════════════════════');
      console.log('');
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
      pickupAddress: string;
      dropoffAddress: string;
      pickupCoordinates: [number, number];
      dropoffCoordinates: [number, number];
      distance: number;
    },
  ) {
    try {
      console.log('[CombinedTripsController] Creating request for combined trip:', {
        combinedTripId,
        customerId: body.customerId,
        pickupAddress: body.pickupAddress,
        dropoffAddress: body.dropoffAddress,
      });

      const combinedTripIdObj = new Types.ObjectId(combinedTripId);
      const customerIdObj = new Types.ObjectId(body.customerId);

      // ✅ Get the combined trip to find the driverId
      const combinedTrip = await this.combinedTripsService.getCombinedTripsModel().findById(combinedTripIdObj);
      
      console.log('[CombinedTripsController] ⚠️ JOIN REQUEST - Trip details:', {
        tripId: combinedTripId,
        driverId: combinedTrip?.driverId?.toString() || 'NO DRIVER ID!',
        status: combinedTrip?.status,
      });
      
      if (!combinedTrip) {
        throw new BadRequestException('Combined trip not found');
      }

      if (!combinedTrip.driverId) {
        console.error('[CombinedTripsController] ❌ CRITICAL: Trip has NO driverId! Cannot create request.');
        throw new BadRequestException('Chuyến xe này chưa có tài xế. Vui lòng chọn chuyến khác.');
      }
      
      const driverIdToUse = combinedTrip.driverId;
      console.log('[CombinedTripsController] ✅ Will send request to driver:', driverIdToUse.toString());

      // ✅ Check if customer already has active trip
      const activeCustomerTrip = await this.combinedTripsService.getCombinedTripsModel().findOne({
        customerId: customerIdObj,
        status: { $in: ['pending', 'accepted', 'in_progress'] },
      });

      if (activeCustomerTrip) {
        throw new BadRequestException('Bạn đang có chuyến đi đang hoạt động.');
      }

      // ✅ Check if customer already has pending request for this trip (prevent duplicates)
      const existingRequest = await this.rideRequestModel.findOne({
        combinedTripId: combinedTripIdObj,
        customerId: customerIdObj,
        status: 'pending',
      });

      if (existingRequest) {
        console.log('⚠️ Customer already has pending request for this trip, returning existing:', existingRequest._id);
        return existingRequest.populate('customerId', 'name phone rating');
      }

      // ✅ Create request with driverId (send to THIS trip's driver only)
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
        seats: body.seats,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      console.log('');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('✅✅✅ JOIN REQUEST CREATED SUCCESSFULLY');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('Request ID:', newRequest._id.toString());
      console.log('Driver ID:', newRequest.driverId?.toString() || '❌ MISSING!');
      console.log('Customer ID:', body.customerId);
      console.log('Trip ID:', combinedTripId);
      console.log('Status:', newRequest.status);
      console.log('🎯 This request is sent to ONLY ONE driver, not broadcast to all');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('');
      
      // VERIFY driverId was set
      if (!newRequest.driverId) {
        console.error('❌❌❌ CRITICAL ERROR: Request created WITHOUT driverId!');
        throw new BadRequestException('Failed to set driver ID');
      }

      // ❌ DO NOT add customer to trip yet! Wait for driver to accept.
      // Customer will be added in acceptRequest() method when driver accepts.

      const populatedRequest = await newRequest.populate('customerId', 'name phone rating');

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
      console.log('[CombinedTripsController] 🔍 Getting request status:', {
        combinedTripId,
        requestId,
      });

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

      console.log('[CombinedTripsController] ✅ Request tìm thấy:', {
        _id: request._id,
        status: request.status,
        combinedTripId: request.combinedTripId,
        customerId: request.customerId,
        fare: request.fare,
        all: JSON.stringify(request),
      });

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
      console.log('[CombinedTripsController] Accepting request:', {
        combinedTripId,
        requestId,
      });

      const request = await this.rideRequestModel.findById(requestId);

      if (!request) {
        throw new BadRequestException('Request not found');
      }

      console.log('[CombinedTripsController] Request details:', {
        createdBy: request.createdBy,
        driverId: request.driverId?.toString(),
        customerId: request.customerId?.toString(),
      });

      // Get the trip to check current state
      const trip = await this.combinedTripsService.getCombinedTripsModel().findById(combinedTripId);
      
      if (!trip) {
        throw new BadRequestException('Trip not found');
      }

      console.log('[CombinedTripsController] Trip current state:', {
        tripId: combinedTripId,
        hasDriverId: !!trip.driverId,
        driverId: trip.driverId?.toString(),
        currentCustomers: trip.customerId?.length || 0,
      });

      // Determine what to do based on request type
      if (request.createdBy === 'customer' && !trip.driverId) {
        // Case 1: Customer created new trip, driver accepting → Add driver to trip
        console.log('[CombinedTripsController] ✅ Case 1: Adding driver to new customer trip');
        
        // ✅ Check if driver already has an active trip
        const activeDriverTrip = await this.combinedTripsService.getCombinedTripsModel().findOne({
          driverId: request.driverId,
          status: { $in: ['pending', 'accepted', 'in_progress'] },
        });

        if (activeDriverTrip) {
          throw new BadRequestException('Tài xế đang có chuyến đi đang hoạt động.');
        }

        // Update request status
        await this.rideRequestModel.findByIdAndUpdate(
          requestId,
          { status: 'accepted' },
          { new: true },
        );

        // Add driver to trip
        await this.combinedTripsService.getCombinedTripsModel().findByIdAndUpdate(
          combinedTripId,
          { 
            status: CombinedTripStatus.ACCEPTED,
            driverId: request.driverId, // ✅ Add driver to trip
          },
        );

        console.log('[CombinedTripsController] ✅ Driver added to trip successfully');

      } else if (request.createdBy === 'customer' && trip.driverId) {
        // Case 2: Customer joining existing trip → Add customer to trip
        console.log('[CombinedTripsController] ✅ Case 2: Adding customer to existing trip');

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

        console.log('[CombinedTripsController] ✅ Customer added to trip successfully');

      } else {
        // Other cases (driver-created trips, etc.)
        console.log('[CombinedTripsController] ℹ️ Other case: Standard accept');
        
        // Update request status
        await this.rideRequestModel.findByIdAndUpdate(
          requestId,
          { status: 'accepted' },
          { new: true },
        );

        // Update trip status if needed
        if (!trip.driverId && request.driverId) {
          await this.combinedTripsService.getCombinedTripsModel().findByIdAndUpdate(
            combinedTripId,
            { 
              status: CombinedTripStatus.ACCEPTED,
              driverId: request.driverId,
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
      console.log('[CombinedTripsController] Rejecting request:', {
        combinedTripId,
        requestId,
      });

      const request = await this.rideRequestModel.findByIdAndUpdate(
        requestId,
        { status: 'rejected' },
        { new: true },
      );

      if (!request) {
        throw new BadRequestException('Request not found');
      }

      // Update combined trip status
      await this.combinedTripsService.updateCombinedTripStatus(
        combinedTripId,
        CombinedTripStatus.PENDING,
      );

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
      console.log('[CombinedTripsController] Marking arrived:', {
        combinedTripId,
        requestId,
      });

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
   * PATCH /combined-trips/:combinedTripId/requests/:requestId/start-journey
   * Start journey with passenger
   */
  @Patch(':combinedTripId/requests/:requestId/start-journey')
  async startJourney(
    @Param('combinedTripId') combinedTripId: string,
    @Param('requestId') requestId: string,
  ) {
    try {
      console.log('[CombinedTripsController] Starting journey:', {
        combinedTripId,
        requestId,
      });

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
      console.log('[CombinedTripsController] Completing request:', {
        combinedTripId,
        requestId,
      });

      const request = await this.rideRequestModel.findByIdAndUpdate(
        requestId,
        { status: 'completed' },
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
      console.log('[CombinedTripsController] Accepting combined trip:', { combinedTripId, driverId });
      const result = await this.combinedTripsService.acceptCombinedTrip(combinedTripId, driverId);
      console.log('[CombinedTripsController] Combined trip accepted successfully:', (result as any)._id);
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
      console.log('[CombinedTripsController] Getting driver location for trip:', combinedTripId);
      
      const trip = await this.combinedTripsService.getCombinedTripDetail(combinedTripId);
      
      if (!trip) {
        throw new BadRequestException('Trip not found');
      }

      // If trip is pending (no driver assigned yet), return pending status
      if (trip.status === 'pending' || !trip.driverId) {
        console.log('[CombinedTripsController] Trip is pending - no driver assigned yet');
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
      console.log('[CombinedTripsController] Getting route for trip:', combinedTripId);
      
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
  async getCombinedTripDetail(@Param('combinedTripId') combinedTripId: string) {
    try {
      console.log('[CombinedTripsController] Getting combined trip detail:', combinedTripId);

      const trip = await this.combinedTripsService.getCombinedTripDetail(combinedTripId);

      return trip;
    } catch (error: any) {
      console.error('[CombinedTripsController] Error:', error);
      throw error;
    }
  }
}
