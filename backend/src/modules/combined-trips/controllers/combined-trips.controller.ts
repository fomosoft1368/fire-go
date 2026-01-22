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
   * GET /combined-trips/:combinedTripId
   * Get combined trip detail with enriched customer data
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
   * GET /combined-trips/:combinedTripId/requests
   * Get all requests for a combined trip (pending only)
   */
  @Get(':combinedTripId/requests')
  async getCombinedTripRequests(
    @Param('combinedTripId') combinedTripId: string,
  ) {
    try {
      console.log('[CombinedTripsController] Getting requests for combinedTripId:', combinedTripId);

      const combinedTripIdObj = new Types.ObjectId(combinedTripId);

      const requests = await this.rideRequestModel.find({
        combinedTripId: combinedTripIdObj,
        status: 'pending',
      })
        .populate('customerId', 'name phone rating')
        .sort({ createdAt: -1 });

      console.log('[CombinedTripsController] Found requests:', requests.length);
      return requests;
    } catch (error: any) {
      console.error('[CombinedTripsController] Error getting requests:', error);
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

      const newRequest = await this.rideRequestModel.create({
        combinedTripId: combinedTripIdObj,
        customerId: customerIdObj,
        tripType: 'combined_trip',
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

      console.log('✅ Request created:', newRequest._id.toString());

      // Add customer to combined trip
      await this.combinedTripsService.addCustomerToCombinedTrip(
        combinedTripId,
        body.customerId,
      );

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
      console.log('[CombinedTripsController] Getting request status:', {
        combinedTripId,
        requestId,
      });

      const request = await this.rideRequestModel.findById(requestId);

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

      const request = await this.rideRequestModel.findByIdAndUpdate(
        requestId,
        { status: 'accepted' },
        { new: true },
      );

      if (!request) {
        throw new BadRequestException('Request not found');
      }

      // Update combined trip status
      await this.combinedTripsService.updateCombinedTripStatus(
        combinedTripId,
        CombinedTripStatus.ACCEPTED,
      );

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
}
