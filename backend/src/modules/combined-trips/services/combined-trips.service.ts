import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CombinedTrip, CombinedTripDocument, CombinedTripStatus } from '../schemas/combined-trip.schema';
import { RideRequest, RideRequestDocument } from '../../rides/schemas/ride-request.schema';
import { extractLocationHierarchy } from '../../../shared/utils/location.util';

@Injectable()
export class CombinedTripsService {
  constructor(
    @InjectModel(CombinedTrip.name) private combinedTripModel: Model<CombinedTripDocument>,
    @InjectModel(RideRequest.name) private rideRequestModel: Model<RideRequestDocument>,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * Get the combined trip model for direct queries
   */
  getCombinedTripsModel(): Model<CombinedTripDocument> {
    return this.combinedTripModel;
  }

  /**
   * Get all combined trips with optional filtering
   */
  async findAll(filters?: any): Promise<CombinedTrip[]> {
    try {
      console.log('📋 [findAll] Getting combined trips with filters:', filters);

      const trips = await this.combinedTripModel
        .find(filters || {})
        .populate('driverId', 'firstName lastName avatar rating averageRating totalReviews vehicleModel vehiclePlate')
        .populate('customerId', 'firstName lastName phone avatar')
        .sort({ requestedAt: -1 });

      console.log('✅ Found trips:', trips.length);
      return trips;
    } catch (error) {
      console.error('❌ Error finding combined trips:', error);
      throw error;
    }
  }

  /**
   * Find share rides by location hierarchy (province/district/ward)
   */
  async findShareRides(
    lng: number,
    lat: number,
    pickupAddress: string,
    maxDistance: number = 10000,
  ): Promise<CombinedTrip[]> {
    try {
      console.log('🔍 [findShareRides] Searching for combined trips:', {
        pickupAddress,
        lng,
        lat,
        maxDistance,
      });

      // Extract location hierarchy from pickup address
      const locationHierarchy = extractLocationHierarchy(pickupAddress);
      console.log('📍 Extracted location hierarchy:', locationHierarchy);

      // Build query based on location hierarchy
      const query: any = {
        status: { $in: [CombinedTripStatus.PENDING, CombinedTripStatus.ACCEPTED] },
      };

      // Filter by location hierarchy (most specific to least specific)
      if (locationHierarchy.ward && locationHierarchy.ward !== 'Unknown') {
        console.log('🔎 Filtering by ward:', locationHierarchy.ward);
        query.pickupWard = locationHierarchy.ward;
      } else if (locationHierarchy.district && locationHierarchy.district !== 'Unknown') {
        console.log('🔎 Filtering by district:', locationHierarchy.district);
        query.pickupDistrict = locationHierarchy.district;
      } else if (locationHierarchy.province && locationHierarchy.province !== 'Unknown') {
        console.log('🔎 Filtering by province:', locationHierarchy.province);
        query.pickupProvince = locationHierarchy.province;
      }

      console.log('📋 Query:', query);

      const trips = await this.combinedTripModel
        .find(query)
        .populate('driverId', 'firstName lastName avatar rating averageRating totalReviews vehicleModel vehiclePlate')
        .populate('customerId', 'firstName lastName phone avatar')
        .sort({ requestedAt: -1 })
        .limit(10);

      console.log('✅ Found trips:', trips.length);
      return trips;
    } catch (error) {
      console.error('❌ Error finding share rides:', error);
      throw error;
    }
  }

  /**
   * Get combined trip with enriched customer data
   */
  async getCombinedTripDetail(combinedTripId: string): Promise<any> {
    try {
      const tripIdObj = new Types.ObjectId(combinedTripId);

      const trip = await this.combinedTripModel
        .findById(tripIdObj)
        .populate('driverId')
        .populate({
          path: 'customerId',
          model: 'Customer',
          select: 'firstName lastName phone avatar rating',
        });

      if (!trip) {
        throw new NotFoundException('Combined trip not found');
      }

      // Enrich with RideRequest data
      return this.enrichCombinedTripWithCustomers(combinedTripId, trip);
    } catch (error) {
      console.error('❌ Error getting combined trip detail:', error);
      throw error;
    }
  }

  /**
   * Enrich combined trip with customer request details
   */
  private async enrichCombinedTripWithCustomers(
    combinedTripId: string,
    trip: any,
  ): Promise<any> {
    try {
      console.log('🔍 Searching RideRequests for combinedTripId:', combinedTripId);

      let tripIdObj: Types.ObjectId;
      try {
        tripIdObj = new Types.ObjectId(combinedTripId);
        console.log('✅ Converted combinedTripId to ObjectId:', tripIdObj.toString());
      } catch (e) {
        console.error('❌ Failed to convert combinedTripId to ObjectId:', combinedTripId, e);
        tripIdObj = new Types.ObjectId(combinedTripId);
      }

      const requests = await this.rideRequestModel
        .find({ combinedTripId: tripIdObj })
        .populate('customerId', 'name phone rating firstName lastName avatar')
        .exec() as any[];

      console.log('📋 RideRequests found:', requests.length);

      let enrichedCustomers = [];

      if (trip.customerId && trip.customerId.length > 0) {
        const isPopulated = trip.customerId[0] && typeof trip.customerId[0] === 'object' && trip.customerId[0]._id;

        if (isPopulated) {
          console.log('✅ Using populated customer data');
          enrichedCustomers = (trip.customerId || []).map((customer: any) => {
            const customerRequest = requests.find(r => {
              const rCustomerId = r.customerId?._id?.toString?.() || r.customerId?.toString?.() || r.customerId;
              const cCustomerId = customer._id?.toString?.() || customer._id;
              return rCustomerId === cCustomerId;
            });

            return {
              _id: customer._id,
              name: customer.name || customer.firstName || 'Khách hàng',
              phone: customer.phone || '',
              rating: customer.rating || 0,
              firstName: customer.firstName || '',
              lastName: customer.lastName || '',
              avatar: customer.avatar || '',
              pickupAddress: customerRequest?.pickupAddress || trip.pickupAddress || '',
              dropoffAddress: customerRequest?.dropoffAddress || trip.dropoffAddress || '',
              pickupCoordinates: customerRequest?.pickupCoordinates || trip.pickupLocation?.coordinates || [],
              dropoffCoordinates: customerRequest?.dropoffCoordinates || trip.dropoffLocation?.coordinates || [],
              distance: customerRequest?.distance || trip.distance || 0,
              fare: customerRequest?.fare || trip.totalFare || 0,
              status: customerRequest?.status || 'pending',
              requestId: customerRequest?._id?.toString(),
            };
          });
        }
      }

      const tripObject = trip.toObject ? trip.toObject() : trip;
      const enrichedTrip = {
        ...tripObject,
        customerId: enrichedCustomers,
      };

      console.log('✅ Enriched trip data - status:', enrichedTrip.status, 'tripObject.status:', tripObject.status);

      return enrichedTrip;
    } catch (error) {
      console.error('❌ Error enriching combined trip:', error);
      throw error;
    }
  }

  /**
   * Create combined trip for share ride
   */
  async createCombinedTrip(data: any): Promise<CombinedTrip> {
    try {
      const locationHierarchy = extractLocationHierarchy(data.pickupAddress);

      const trip = new this.combinedTripModel({
        ...data,
        pickupProvince: locationHierarchy.province,
        pickupDistrict: locationHierarchy.district,
        pickupWard: locationHierarchy.ward,
        status: CombinedTripStatus.PENDING,
      });

      return await trip.save();
    } catch (error) {
      console.error('❌ Error creating combined trip:', error);
      throw error;
    }
  }

  /**
   * Update combined trip status
   */
  async updateCombinedTripStatus(
    combinedTripId: string,
    status: CombinedTripStatus,
  ): Promise<CombinedTrip> {
    try {
      const trip = await this.combinedTripModel.findByIdAndUpdate(
        combinedTripId,
        { status, updatedAt: new Date() },
        { new: true },
      );

      if (!trip) {
        throw new NotFoundException('Combined trip not found');
      }

      return trip;
    } catch (error) {
      console.error('❌ Error updating combined trip status:', error);
      throw error;
    }
  }

  /**
   * Add customer to combined trip
   */
  async addCustomerToCombinedTrip(
    combinedTripId: string,
    customerId: string,
  ): Promise<CombinedTrip> {
    try {
      const tripIdObj = new Types.ObjectId(combinedTripId);
      const customerIdObj = new Types.ObjectId(customerId);

      const trip = await this.combinedTripModel.findById(tripIdObj);

      if (!trip) {
        throw new NotFoundException('Combined trip not found');
      }

      // Check if customer already in trip
      const alreadyExists = trip.customerId?.some(c =>
        c._id?.toString() === customerIdObj.toString(),
      );

      if (!alreadyExists) {
        trip.customerId = trip.customerId || [];
        trip.customerId.push(customerIdObj);
        await trip.save();
        console.log('✅ Customer added to combined trip');
      }

      return trip;
    } catch (error) {
      console.error('❌ Error adding customer to combined trip:', error);
      throw error;
    }
  }

  /**
   * Accept a combined trip (driver accepts the share ride)
   */
  async acceptCombinedTrip(combinedTripId: string, driverId: string): Promise<CombinedTrip> {
    try {
      console.log('[CombinedTripsService] Accepting combined trip:', { combinedTripId, driverId });

      const trip = await this.combinedTripModel.findById(combinedTripId);
      
      if (!trip) {
        throw new NotFoundException('Combined trip not found');
      }

      console.log('[CombinedTripsService] Trip found:', {
        id: trip._id,
        status: trip.status,
        currentDriverId: trip.driverId,
      });

      if (trip.status !== CombinedTripStatus.PENDING) {
        throw new BadRequestException(`Combined trip is not available for acceptance. Current status: ${trip.status}`);
      }

      if (trip.driverId) {
        throw new BadRequestException('Combined trip has already been accepted by another driver');
      }

      console.log('[CombinedTripsService] Updating combined trip with driverId:', driverId);
      const updatedTrip = await this.combinedTripModel.findByIdAndUpdate(
        combinedTripId,
        {
          driverId: new Types.ObjectId(driverId),
          status: CombinedTripStatus.ACCEPTED,
          acceptedAt: new Date(),
        },
        { new: true },
      )
        .populate('driverId', 'firstName lastName avatar rating averageRating totalReviews vehicleModel vehiclePlate')
        .populate('customerId', 'firstName lastName phone avatar')
        .exec();

      if (!updatedTrip) {
        throw new NotFoundException('Failed to update combined trip');
      }

      console.log('[CombinedTripsService] Combined trip accepted successfully');
      return updatedTrip;
    } catch (error) {
      console.error('[CombinedTripsService] Error accepting combined trip:', error);
      throw error;
    }
  }
}
