import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
<<<<<<< HEAD:backend/src/modules/rides/services/rides.service.ts
import { Ride, RideDocument, RideStatus, RideType } from '../schemas/ride.schema';
import { Pricing } from '../schemas/pricing.schema';
import { CreateRideDto } from '../dto';
import { extractLocationHierarchy } from '../../../shared/utils/location.util';
import { AutoAssignService } from './auto-assign.service';
=======
import { Ride, RideDocument, RideStatus, RideType } from './schemas/ride.schema';
import { Pricing } from './schemas/pricing.schema';
import { CreateRideDto } from './dto';
import { extractLocationHierarchy } from '../../shared/utils/location.util';
import { AutoAssignService } from './services/auto-assign.service';
>>>>>>> 575fa8899f586c90e179f1c33e7561109deb8541:backend/src/modules/rides/rides.service.ts

@Injectable()
export class RidesService {
  constructor(
    @InjectModel(Ride.name) private rideModel: Model<RideDocument>,
    @InjectModel(Pricing.name) private pricingModel: Model<any>,
<<<<<<< HEAD:backend/src/modules/rides/services/rides.service.ts
=======
    // @InjectModel(RideRequest.name) private rideRequestModel: Model<RideRequestDocument>,
>>>>>>> 575fa8899f586c90e179f1c33e7561109deb8541:backend/src/modules/rides/rides.service.ts
    private eventEmitter: EventEmitter2,
    @Inject(forwardRef(() => AutoAssignService))
    private autoAssignService: AutoAssignService,
  ) {}

  /**
   * Get route directions from OSRM (Open Source Routing Machine)
   * Free, no API key needed, supports Vietnam well
   */
  async getDirections(
    startLng: number,
    startLat: number,
    endLng: number,
    endLat: number,
  ): Promise<any> {
    try {
      // Validate numbers
      if (isNaN(startLng) || isNaN(startLat) || isNaN(endLng) || isNaN(endLat)) {
        throw new BadRequestException('Invalid coordinates - must be numbers');
      }

      // OSRM format: lng,lat;lng,lat
      const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?geometries=geojson&overview=full`;
      
      console.log('📍 Calling OSRM with coordinates:');
      console.log('   Start:', startLng, startLat);
      console.log('   End:', endLng, endLat);
      console.log('   URL:', url);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorBody = await response.text();
        console.error('OSRM API error:', response.status, errorBody);
        throw new BadRequestException(`OSRM API error: ${response.status}`);
      }
      
      const data: any = await response.json();
      console.log('✅ OSRM Response received:', {
        code: data.code,
        routes: data.routes?.length,
      });
      
      // Convert OSRM format to response for frontend
      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const distanceKm = Math.round((route.distance / 1000) * 100) / 100; // Convert m to km
        const durationMinutes = Math.ceil(route.duration / 60); // Convert s to minutes

        console.log('✅ Converting to frontend format:', {
          distanceKm,
          durationMinutes,
          originalDistance: route.distance,
          originalDuration: route.duration,
        });

        return {
          distance: distanceKm, // in km
          duration: durationMinutes, // in minutes
          features: [
            {
              geometry: route.geometry,
              properties: {
                summary: {
                  distance: route.distance,
                  duration: route.duration,
                }
              }
            }
          ]
        };
      } else {
        throw new BadRequestException('No route found');
      }
    } catch (err: any) {
      console.error('❌ Error fetching directions:', err.message);
      throw new BadRequestException(err.message || 'Failed to fetch directions');
    }
  }

  async create(createRideDto: CreateRideDto, customerId?: string): Promise<RideDocument> {
    const totalFare =
      createRideDto.baseFare +
      createRideDto.distanceFare +
      createRideDto.timeFare +
      (createRideDto.surgePricing || 0);

    // Xác định loại chuyến (mặc định là SHARE nếu không được chỉ định)
    const rideType = createRideDto.rideType || RideType.SHARE;

    // Validation cho ride type HIRE
    if (rideType === RideType.HIRE) {
      if (!createRideDto.carType || !createRideDto.licensePlate) {
        throw new BadRequestException(
          'carType và licensePlate là bắt buộc cho cuốc xe lái xe hộ'
        );
      }
    }

    // For SHARE rides: driverId MUST be provided (only driver can create SHARE rides)
    if (rideType === RideType.SHARE && !createRideDto.driverId && !customerId) {
      throw new BadRequestException('Chỉ tài xế mới có thể tạo chuyến ghép');
    }
    
    // For HIRE: driverId should be null (customer creates, driver assigned later)
    // For SHARE: driverId is the person creating (driver)
    const driverId = rideType === RideType.HIRE ? null : (createRideDto.driverId || customerId);

    // Extract location hierarchy for filtering
    const pickupLoc = extractLocationHierarchy(createRideDto.pickupAddress);
    const dropoffLoc = extractLocationHierarchy(createRideDto.dropoffAddress);

    console.log('📍 [create] Location hierarchy extraction:', {
      pickup: {
        address: createRideDto.pickupAddress,
        extracted: pickupLoc,
      },
      dropoff: {
        address: createRideDto.dropoffAddress,
        extracted: dropoffLoc,
      },
    });

    const ride = await this.rideModel.create({
      ...createRideDto,
      rideType,
      driverId: driverId ? new Types.ObjectId(driverId) : null,
      customerId: customerId ? new Types.ObjectId(customerId) : null,
      pickupLocation: {
        type: 'Point',
        coordinates: createRideDto.pickupCoordinates,
      },
      // Use provided values or extracted values
      pickupProvince: createRideDto.pickupProvince || pickupLoc.province,
      pickupDistrict: createRideDto.pickupDistrict || pickupLoc.district,
      pickupWard: createRideDto.pickupWard || pickupLoc.ward,
      dropoffLocation: {
        type: 'Point',
        coordinates: createRideDto.dropoffCoordinates,
      },
      dropoffProvince: createRideDto.dropoffProvince || dropoffLoc.province,
      dropoffDistrict: createRideDto.dropoffDistrict || dropoffLoc.district,
      dropoffWard: createRideDto.dropoffWard || dropoffLoc.ward,
      totalFare,
      status: RideStatus.PENDING,
    });

    // Extract driverId before populate
    const driverIdStr = ride.driverId?.toString();

    const populatedRide = await ride.populate(['customerId', 'driverId']);

    // Emit ride.created event
    this.eventEmitter.emit('ride.created', {
      rideId: ride._id.toString(),
      driverId: driverIdStr,
      pickupAddress: createRideDto.pickupAddress,
      dropoffAddress: createRideDto.dropoffAddress,
      totalFare: totalFare,
      rideType: rideType,
    });

    return populatedRide;
  }

  async findAll(filters?: any): Promise<RideDocument[]> {
    return this.rideModel
      .find(filters || {})
      .populate('driverId')
      .populate('customerId')
      .sort({ createdAt: -1 });
  }

  async findById(id: string): Promise<RideDocument> {
    try {
      console.log('[RidesService] Finding ride by ID:', id);
      const ride = await this.rideModel
        .findById(id)
        .populate('driverId', '-password -__v')
        .populate('customerId', '-password -__v')
        .exec();

      if (!ride) {
        throw new NotFoundException(`Ride with ID ${id} not found`);
      }

      console.log('[RidesService] Ride found:', { 
        id: ride._id, 
        status: ride.status,
        hasDriver: !!ride.driverId,
        hasCustomer: !!ride.customerId,
        driverLocation: ride.driverId?.['currentLocation']
      });

      return ride;
    } catch (error) {
      console.error('[RidesService] Error finding ride:', error.message);
      throw error;
    }
  }

<<<<<<< HEAD:backend/src/modules/rides/services/rides.service.ts
  async findByIdForDriver(id: string): Promise<RideDocument> {
    console.log('🚗 findByIdForDriver called with id:', id);
    
    const ride = await this.rideModel
      .findById(id)
      .populate('driverId')
      .populate({
        path: 'customerId',
        model: 'Customer',
        select: 'name phone rating firstName lastName avatar'
      })
      .exec();
=======
  /**
   * Enrich ride with customer details for driver app
   * Merges customer info with RideRequest data (coordinates, addresses, fare)
   */
  
  // async getRideWithEnrichedCustomers(rideId: string, ride: any): Promise<any> {
  //   return this.enrichRideWithCustomers(rideId, ride);
  // }

  // private async enrichRideWithCustomers(rideId: string, ride: any): Promise<any> {
  //   // Get all ride requests with customer details
  //   console.log('🔍 Searching RideRequests for rideId:', rideId, 'Type:', typeof rideId);
    
  //   let rideIdObj: Types.ObjectId;
  //   try {
  //     rideIdObj = new Types.ObjectId(rideId);
  //     console.log('✅ Converted rideId to ObjectId:', rideIdObj.toString());
  //   } catch (e) {
  //     console.error('❌ Failed to convert rideId to ObjectId:', rideId, e);
  //     rideIdObj = new Types.ObjectId(rideId);
  //   }
    
  //   const requests = await this.rideRequestModel
  //     .find({ rideId: rideIdObj })
  //     .populate('customerId', 'name phone rating firstName lastName avatar')
  //     .exec() as any[];

  //   console.log('📋 RideRequests found:', requests.length);
  //   console.log('🔎 Query used:', { rideId: rideIdObj.toString() });
  //   if (requests.length > 0) {
  //     console.log('📋 Sample RideRequest:', {
  //       _id: requests[0]._id,
  //       rideId: requests[0].rideId,
  //       customerId: requests[0].customerId?._id,
  //       pickupAddress: requests[0].pickupAddress,
  //       dropoffAddress: requests[0].dropoffAddress,
  //       pickupCoordinates: requests[0].pickupCoordinates,
  //       status: requests[0].status,
  //     });
  //     console.log('📋 All RideRequests:', requests.map(r => ({
  //       _id: r._id,
  //       customerId: r.customerId?._id,
  //       status: r.status,
  //     })));
  //   } else {
  //     // If no requests found, log what we're looking for
  //     console.log('⚠️ No RideRequests found for rideId:', rideIdObj.toString());
  //     console.log('ℹ️ This is expected if customer hasn\'t submitted a request yet');
  //   }

  //   let enrichedCustomers = [];
    
  //   if (ride.customerId && ride.customerId.length > 0) {
  //     // Check if customerId is already populated (contains objects)
  //     const isPopulated = ride.customerId[0] && typeof ride.customerId[0] === 'object' && ride.customerId[0]._id;
      
  //     if (isPopulated) {
  //       console.log('✅ Using populated customer data');
  //       enrichedCustomers = (ride.customerId || []).map((customer: any) => {
  //         console.log('🔍 Finding request for customer:', {
  //           customerId: customer._id?.toString?.() || customer._id,
  //           customerIdType: typeof customer._id,
  //         });
          
  //         const customerRequest = requests.find(r => {
  //           const rCustomerId = r.customerId?._id?.toString?.() || r.customerId?.toString?.() || r.customerId;
  //           const cCustomerId = customer._id?.toString?.() || customer._id;
  //           const match = rCustomerId === cCustomerId;
            
  //           if (!match) {
  //             console.log('   Comparing:', {
  //               requestCustomerId: rCustomerId,
  //               customerCustomerId: cCustomerId,
  //               match,
  //             });
  //           }
  //           return match;
  //         });
          
  //         console.log('🔗 Linking customer to request:', {
  //           customerId: customer._id?.toString?.() || customer._id,
  //           found: !!customerRequest,
  //           requestId: customerRequest?._id?.toString?.() || customerRequest?._id,
  //           status: customerRequest?.status,
  //         });
          
  //         return {
  //           _id: customer._id,
  //           name: customer.name || customer.firstName || 'Khách hàng',
  //           phone: customer.phone || '',
  //           rating: customer.rating || 0,
  //           firstName: customer.firstName || '',
  //           lastName: customer.lastName || '',
  //           avatar: customer.avatar || '',
  //           pickupAddress: customerRequest?.pickupAddress || ride.pickupAddress || '',
  //           dropoffAddress: customerRequest?.dropoffAddress || ride.dropoffAddress || '',
  //           pickupCoordinates: customerRequest?.pickupCoordinates || ride.pickupLocation?.coordinates || [],
  //           dropoffCoordinates: customerRequest?.dropoffCoordinates || ride.dropoffLocation?.coordinates || [],
  //           distance: customerRequest?.distance || ride.distance || 0,
  //           fare: customerRequest?.fare || ride.totalFare || 0,
  //           status: customerRequest?.status || 'pending',
  //           requestId: customerRequest?._id?.toString(),
  //         };
  //       });
  //     } else {
  //       // Populate didn't work, manually fetch customers
  //       console.log('⚠️ Populate failed, manually fetching customers...');
  //       const customerIds = ride.customerId as Types.ObjectId[];
        
  //       const customers = await this.rideModel.db.db.collection('customers').find({
  //         _id: { $in: customerIds.map(id => typeof id === 'string' ? new Types.ObjectId(id) : id) }
  //       }).toArray();
        
  //       console.log('👥 Manually fetched customers:', customers.length);
        
  //       enrichedCustomers = customers.map((customer: any) => {
  //         const customerRequest = requests.find(r => 
  //           r.customerId?._id?.toString() === customer._id?.toString()
  //         );
          
  //         return {
  //           _id: customer._id,
  //           name: customer.name || customer.firstName || 'Khách hàng',
  //           phone: customer.phone || '',
  //           rating: customer.rating || 0,
  //           firstName: customer.firstName || '',
  //           lastName: customer.lastName || '',
  //           avatar: customer.avatar || '',
  //           pickupAddress: customerRequest?.pickupAddress || ride.pickupAddress || '',
  //           dropoffAddress: customerRequest?.dropoffAddress || ride.dropoffAddress || '',
  //           pickupCoordinates: customerRequest?.pickupCoordinates || ride.pickupLocation?.coordinates || [],
  //           dropoffCoordinates: customerRequest?.dropoffCoordinates || ride.dropoffLocation?.coordinates || [],
  //           distance: customerRequest?.distance || ride.distance || 0,
  //           fare: customerRequest?.fare || ride.totalFare || 0,
  //           status: customerRequest?.status || 'pending',
  //           requestId: customerRequest?._id?.toString(),
  //         };
  //       });
  //     }
  //   }

  //   console.log('✅ enrichedCustomers:', enrichedCustomers.length);
  //   console.log('✅ enrichedCustomers detailed data:');
  //   enrichedCustomers.forEach((c, idx) => {
  //     console.log(`   [${idx}] ${c.name}:`, {
  //       pickupCoordinates: c.pickupCoordinates,
  //       dropoffCoordinates: c.dropoffCoordinates,
  //       pickupAddress: c.pickupAddress,
  //       dropoffAddress: c.dropoffAddress,
  //       status: c.status,
  //       requestId: c.requestId,
  //     });
  //   });

  //   const plainRide = ride.toObject ? ride.toObject() : ride;
  //   return {
  //     ...plainRide,
  //     customerId: enrichedCustomers,
  //   };
  // }

  // async findByIdForDriver(id: string): Promise<any> {
  //   // For driver app - get ride with populated customer details
  //   console.log('🚗 findByIdForDriver called with id:', id);
    
  //   // Get ride with populated driver
  //   const ride = await this.rideModel
  //     .findById(id)
  //     .populate('driverId')
  //     .populate({
  //       path: 'customerId',
  //       model: 'Customer',
  //       select: 'name phone rating firstName lastName avatar'
  //     })
  //     .exec();
>>>>>>> 575fa8899f586c90e179f1c33e7561109deb8541:backend/src/modules/rides/rides.service.ts

  //   console.log('📦 Ride found:', !!ride);

  //   if (!ride) {
  //     throw new NotFoundException(`Ride with ID ${id} not found`);
  //   }

    return ride;
  }

  async findByCustomerId(customerId: string): Promise<RideDocument[]> {
    return this.rideModel
      .find({ customerId: new Types.ObjectId(customerId) })
      .populate('driverId')
      .populate('customerId')
      .sort({ createdAt: -1 });
  }

  async findByDriverId(driverId: string): Promise<RideDocument[]> {
    return this.rideModel
      .find({ driverId: new Types.ObjectId(driverId) })
      .populate('driverId')
      .populate('customerId')
      .sort({ createdAt: -1 });
  }

  async findNearbyRides(
    longitude: number,
    latitude: number,
    maxDistance: number = 5000, // 5km in meters
    rideType?: string, // Lọc theo loại chuyến
  ): Promise<RideDocument[]> {
    const query: any = {
      status: RideStatus.PENDING,
      rideType: RideType.SHARE, // Mặc định chỉ tìm chuyến ghép
      pickupLocation: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude],
          },
          $maxDistance: maxDistance,
        },
      },
    };

    console.log('[RidesService] Finding nearby rides query:', JSON.stringify(query, null, 2));

    const result = await this.rideModel
      .find(query)
      .populate('driverId')
      .populate('customerId')
      .limit(10);

    console.log('[RidesService] Found', result.length, 'nearby rides');

    return result;
  }

  /**
   * Find share rides matching customer's pickup location with multi-level filtering
   * Customer's pickup point must match driver's dropoff location
   * Filters: Ward (xã/phường) → District (huyện/quận) → Province (tỉnh/thành phố)
   * Also checks customer GPS distance must be within 10km of driver
   */
  async findShareRides(
    customerLongitude: number,
    customerLatitude: number,
    customerPickupAddress: string,
    maxGpsDistance: number = 10000, // 10km in meters
  ): Promise<RideDocument[]> {
    // Extract customer's location hierarchy
    const customerLoc = extractLocationHierarchy(customerPickupAddress);

    console.log('🔍 [findShareRides] Customer location extraction:', {
      address: customerPickupAddress,
      extracted: customerLoc,
      gpsCoords: [customerLongitude, customerLatitude],
      maxDistance: maxGpsDistance,
    });

    // Build query: PENDING SHARE rides
    const query: any = {
      status: RideStatus.PENDING,
      rideType: RideType.SHARE,
      // Customer location (within GPS range of driver's pickup)
      pickupLocation: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [customerLongitude, customerLatitude],
          },
          $maxDistance: maxGpsDistance,
        },
      },
    };

    // Filter by location hierarchy (Ward → District → Province)
    if (customerLoc.ward) {
      // Khách hàng ở cùng xã/phường với điểm bắt đầu của tài xế
      console.log('🔍 [findShareRides] Filtering by Ward:', customerLoc.ward);
      query.pickupWard = customerLoc.ward;
      query.pickupDistrict = customerLoc.district;
      query.pickupProvince = customerLoc.province;
    } else if (customerLoc.district) {
      // Khách hàng ở cùng huyện/quận với điểm bắt đầu của tài xế
      console.log('🔍 [findShareRides] Filtering by District:', customerLoc.district);
      query.pickupDistrict = customerLoc.district;
      query.pickupProvince = customerLoc.province;
    } else if (customerLoc.province) {
      // Khách hàng ở cùng tỉnh/thành phố với điểm bắt đầu của tài xế
      console.log('🔍 [findShareRides] Filtering by Province:', customerLoc.province);
      query.pickupProvince = customerLoc.province;
    } else {
      console.warn('⚠️ [findShareRides] Could not extract any location hierarchy from:', customerPickupAddress);
    }

    console.log('🔍 [findShareRides] MongoDB query:', {
      status: query.status,
      rideType: query.rideType,
      pickupWard: query.pickupWard,
      pickupDistrict: query.pickupDistrict,
      pickupProvince: query.pickupProvince,
      gpsNear: query.pickupLocation.$near,
    });

    const rides = await this.rideModel
      .find(query)
      .populate('driverId', 'name phone rating vehicleInfo')
      .populate('customerId')
      .limit(20)
      .sort({ createdAt: -1 }); // Newest rides first

    console.log('✅ [findShareRides] Found', rides.length, 'share rides matching location');
    
    if (rides.length > 0) {
      console.log('📍 [findShareRides] First ride sample:', {
        _id: rides[0]._id,
        pickup: rides[0].pickupAddress,
        pickupCoordinates: rides[0].pickupLocation?.coordinates,
        dropoffCoordinates: rides[0].dropoffLocation?.coordinates,
        pickupProvince: rides[0].pickupProvince,
        pickupDistrict: rides[0].pickupDistrict,
        pickupWard: rides[0].pickupWard,
        driverId: rides[0].driverId,
        customerId: rides[0].customerId,
      });
    }

    // Transform rides to include coordinates in array format for mobile app
    return rides.map(ride => ({
      ...ride.toObject(),
      pickupCoordinates: ride.pickupLocation?.coordinates || [0, 0],
      dropoffCoordinates: ride.dropoffLocation?.coordinates || [0, 0],
    })) as any;
  }

  async acceptRide(rideId: string, driverId: string): Promise<RideDocument> {
    try {
      console.log('[RidesService] acceptRide called:', { rideId, driverId });
      
      const ride = await this.findById(rideId);
      console.log('[RidesService] Ride found:', { 
        id: ride._id, 
        status: ride.status,
        currentDriverId: ride.driverId 
      });

      if (ride.status !== RideStatus.PENDING) {
        throw new BadRequestException(`Ride is not available for acceptance. Current status: ${ride.status}`);
      }

      if (ride.driverId) {
        throw new BadRequestException('Ride has already been accepted by another driver');
      }

      console.log('[RidesService] Updating ride with driverId:', driverId);
      const updatedRide = await this.rideModel.findByIdAndUpdate(
        rideId,
        {
          driverId: new Types.ObjectId(driverId),
          status: RideStatus.ACCEPTED,
          acceptedAt: new Date(),
        },
        { new: true },
      ).exec();

      if (!updatedRide) {
        throw new NotFoundException('Failed to update ride');
      }

      console.log('[RidesService] Ride updated successfully, now populating...');

      // Populate separately to handle potential errors
      try {
        await updatedRide.populate([
          { path: 'driverId', select: '-password -__v' },
          { path: 'customerId', select: '-password -__v' }
        ]);
        console.log('[RidesService] Population successful');
      } catch (populateError) {
        console.warn('[RidesService] Warning: Could not populate driver/customer:', populateError.message);
        // Continue anyway - populate failure shouldn't fail the whole operation
      }

      // Emit ride.accepted event
      try {
        // Extract customer ID safely
        let extractedCustomerId: string;
        if (ride.customerId) {
          extractedCustomerId = typeof ride.customerId === 'object' 
            ? (ride.customerId as any)._id?.toString() || (ride.customerId as any).toString()
            : (ride.customerId as any).toString();
        } else {
          console.warn('[RidesService] Warning: ride.customerId is null, using updatedRide data');
          const rawRideData = await this.rideModel.findById(rideId).lean();
          extractedCustomerId = rawRideData?.customerId?.toString() || 'unknown';
        }
        
        const driverName = updatedRide.driverId && typeof updatedRide.driverId === 'object'
          ? `${(updatedRide.driverId as any).firstName || ''} ${(updatedRide.driverId as any).lastName || ''}`.trim() || 'Driver'
          : 'Driver';

        this.eventEmitter.emit('ride.accepted', {
          rideId: rideId,
          driverId: driverId,
          customerId: extractedCustomerId,
          driverName,
        });
        console.log('[RidesService] Event emitted: ride.accepted');
      } catch (eventError) {
        console.warn('[RidesService] Warning: Could not emit event:', eventError.message);
        // Event failure shouldn't fail the whole operation
      }

      return updatedRide;
    } catch (error) {
      console.error('[RidesService] Error in acceptRide:', error.message);
      throw error;
    }
  }

  async assignDriver(rideId: string, driverId: string): Promise<RideDocument> {
    const ride = await this.findById(rideId);

    if (ride.status !== RideStatus.PENDING) {
      throw new BadRequestException('Ride is not available for assignment');
    }

    return this.rideModel.findByIdAndUpdate(
      rideId,
      {
        driverId: new Types.ObjectId(driverId),
        status: RideStatus.ACCEPTED,
        acceptedAt: new Date(),
      },
      { new: true },
    ).populate('driverId').populate('customerId');
  }

  async startRide(rideId: string): Promise<RideDocument> {
    const ride = await this.findById(rideId);

    if (ride.status !== RideStatus.ACCEPTED) {
      throw new BadRequestException('Ride must be accepted before starting');
    }

    return this.rideModel.findByIdAndUpdate(
      rideId,
      {
        status: RideStatus.IN_PROGRESS,
        startedAt: new Date(),
      },
      { new: true },
    );
  }

  async completeRide(rideId: string): Promise<RideDocument> {
    const ride = await this.findById(rideId);

    if (ride.status !== RideStatus.IN_PROGRESS) {
      throw new BadRequestException('Ride must be in progress to complete');
    }

    const updatedRide = await this.rideModel.findByIdAndUpdate(
      rideId,
      {
        status: RideStatus.COMPLETED,
        completedAt: new Date(),
        isPaid: true,
        paidAt: new Date(),
      },
      { new: true },
    );

    // Emit ride.completed event
    const extractedCustomerId = ride.customerId && typeof ride.customerId === 'object' 
      ? (ride.customerId as any)._id.toString() 
      : ride.customerId.toString();
    
    this.eventEmitter.emit('ride.completed', {
      rideId: rideId,
      customerId: extractedCustomerId,
      driverId: ride.driverId?.toString(),
      totalFare: ride.totalFare,
    });

    return updatedRide;
  }

  async cancelRide(
    rideId: string,
    cancellationBy: 'driver' | 'customer',
    reason?: string,
  ): Promise<RideDocument> {
    const ride = await this.findById(rideId);

    if ([RideStatus.COMPLETED, RideStatus.CANCELLED].includes(ride.status)) {
      throw new BadRequestException('Ride cannot be cancelled');
    }

    return this.rideModel.findByIdAndUpdate(
      rideId,
      {
        status: RideStatus.CANCELLED,
        cancelledAt: new Date(),
        cancellationBy,
        cancellationReason: reason,
      },
      { new: true },
    );
  }

  async rateRide(
    rideId: string,
    rating: number,
    review?: string,
    ratedBy: 'driver' | 'customer' = 'customer',
  ): Promise<RideDocument> {
    if (rating < 1 || rating > 5) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }

    const updateData =
      ratedBy === 'driver'
        ? { customerRating: rating, customerReview: review }
        : { driverRating: rating, driverReview: review };

    return this.rideModel.findByIdAndUpdate(rideId, updateData, { new: true });
  }

  /**
   * Get overall ride statistics for dashboard
   */
  async getAllRideStats(): Promise<any> {
    const stats = await this.rideModel.aggregate([
      {
        $facet: {
          byStatus: [
            {
              $group: {
                _id: '$status',
                count: { $sum: 1 },
                status: { $first: '$status' },
              },
            },
            {
              $project: {
                _id: 0,
                status: 1,
                count: 1,
              },
            },
          ],
          overall: [
            {
              $group: {
                _id: null,
                totalRides: { $sum: 1 },
                completedRides: {
                  $sum: {
                    $cond: [{ $eq: ['$status', RideStatus.COMPLETED] }, 1, 0],
                  },
                },
                activeRides: {
                  $sum: {
                    $cond: [
                      {
                        $in: ['$status', [RideStatus.ACCEPTED, RideStatus.IN_PROGRESS]],
                      },
                      1,
                      0,
                    ],
                  },
                },
                cancelledRides: {
                  $sum: {
                    $cond: [{ $eq: ['$status', RideStatus.CANCELLED] }, 1, 0],
                  },
                },
                totalRevenue: {
                  $sum: {
                    $cond: [{ $eq: ['$status', RideStatus.COMPLETED] }, '$totalFare', 0],
                  },
                },
              },
            },
          ],
        },
      },
    ]);

    const result = stats[0];
    const overall = result.overall[0] || {
      totalRides: 0,
      completedRides: 0,
      activeRides: 0,
      cancelledRides: 0,
      totalRevenue: 0,
    };

    return {
      byStatus: result.byStatus.map((s: any) => ({
        status: s.status,
        count: s.count,
      })),
      totalRides: overall.totalRides,
      completedRides: overall.completedRides,
      activeRides: overall.activeRides,
      cancelledRides: overall.cancelledRides,
      totalRevenue: overall.totalRevenue,
    };
  }

  /**
   * Get revenue statistics for a date range
   */
  async getRevenueStats(startDate?: Date, endDate?: Date) {
    const matchStage: any = {
      status: RideStatus.COMPLETED,
    };

    if (startDate || endDate) {
      matchStage.completedAt = {};
      if (startDate) matchStage.completedAt.$gte = new Date(startDate);
      if (endDate) matchStage.completedAt.$lte = new Date(endDate);
    }

    const stats = await this.rideModel.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalFare' },
          totalRides: { $sum: 1 },
          averageFare: { $avg: '$totalFare' },
          minFare: { $min: '$totalFare' },
          maxFare: { $max: '$totalFare' },
        },
      },
    ]);

    return stats[0] || { totalRevenue: 0, totalRides: 0, averageFare: 0 };
  }

  /**
   * Get daily revenue breakdown
   */
  async getDailyRevenue(days: number = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const dailyStats = await this.rideModel.aggregate([
      {
        $match: {
          status: RideStatus.COMPLETED,
          completedAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$completedAt' },
            month: { $month: '$completedAt' },
            day: { $dayOfMonth: '$completedAt' },
          },
          revenue: { $sum: '$totalFare' },
          rides: { $sum: 1 },
          date: { $first: '$completedAt' },
        },
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 },
      },
    ]);

    return dailyStats.map((item) => ({
      date: item.date,
      day: item._id.day,
      month: `T${item._id.month}`,
      revenue: item.revenue,
      rides: item.rides,
    }));
  }

  /**
   * Get revenue by ride type
   */
  async getRevenueByRideType(startDate?: Date, endDate?: Date) {
    const matchStage: any = {
      status: RideStatus.COMPLETED,
    };

    if (startDate || endDate) {
      matchStage.completedAt = {};
      if (startDate) matchStage.completedAt.$gte = new Date(startDate);
      if (endDate) matchStage.completedAt.$lte = new Date(endDate);
    }

    const stats = await this.rideModel.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$rideType',
          revenue: { $sum: '$totalFare' },
          rides: { $sum: 1 },
          percentage: { $sum: 1 },
        },
      },
    ]);

    // Calculate total rides for percentage
    const totalRides = stats.reduce((sum, item) => sum + item.rides, 0);

    return stats.map((item) => ({
      type: item._id || 'unknown',
      revenue: item.revenue,
      rides: item.rides,
      percentage: totalRides > 0 ? ((item.rides / totalRides) * 100).toFixed(2) : 0,
    }));
  }

  /**
   * Get weekly revenue
   */
  async getWeeklyRevenue() {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 6);

    const weeklyStats = await this.rideModel.aggregate([
      {
        $match: {
          status: RideStatus.COMPLETED,
          completedAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$completedAt' },
            week: { $week: '$completedAt' },
          },
          revenue: { $sum: '$totalFare' },
          rides: { $sum: 1 },
        },
      },
    ]);

    return weeklyStats;
  }

  /**
   * Get peak hours (rides by hour)
   */
  async getPeakHours(startDate?: Date, endDate?: Date) {
    const matchStage: any = {
      status: RideStatus.COMPLETED,
    };

    if (startDate || endDate) {
      matchStage.completedAt = {};
      if (startDate) matchStage.completedAt.$gte = new Date(startDate);
      if (endDate) matchStage.completedAt.$lte = new Date(endDate);
    }

    const peakHours = await this.rideModel.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: { $hour: '$completedAt' },
          rides: { $sum: 1 },
          revenue: { $sum: '$totalFare' },
        },
      },
      { $sort: { '_id': 1 } },
    ]);

    // Fill missing hours with 0
    const result = Array.from({ length: 24 }, (_, hour) => {
      const found = peakHours.find(p => p._id === hour);
      return {
        hour,
        rides: found?.rides || 0,
        revenue: found?.revenue || 0,
      };
    });

    return result;
  }

  /**
   * Get top drivers by earnings
   */
  async getTopDrivers(limit: number = 10) {
    const topDrivers = await this.rideModel.aggregate([
      {
        $match: {
          status: RideStatus.COMPLETED,
          driverId: { $ne: null, $exists: true },
        },
      },
      {
        $group: {
          _id: '$driverId',
          totalRides: { $sum: 1 },
          totalEarnings: { $sum: '$totalFare' },
          averageRating: { $avg: '$driverRating' },
        },
      },
      {
        $sort: { totalEarnings: -1 },
      },
      {
        $limit: limit,
      },
      {
        $lookup: {
          from: 'drivers',
          localField: '_id',
          foreignField: '_id',
          as: 'driver',
        },
      },
      {
        $unwind: {
          path: '$driver',
          preserveNullAndEmptyArrays: false,
        },
      },
    ]);

    // Map to response format
    return topDrivers.map((item, idx) => ({
      id: item._id?.toString() || '',
      rank: idx + 1,
      name: item.driver?.fullName || `${item.driver?.firstName || ''} ${item.driver?.lastName || ''}`.trim() || 'Unknown',
      trips: item.totalRides || 0,
      avatar: item.driver?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${item._id?.toString() || 'default'}`,
      rating: Math.round((item.averageRating || 0) * 10) / 10,
      earnings: Math.round(item.totalEarnings) || 0,
    }));
  }

  /**
   * Get pricing for vehicle type
   */
  async getPricing(vehicleType: string) {
    const pricing = await this.pricingModel.findOne({ vehicleType, isActive: true })
    if (!pricing) {
      throw new BadRequestException(`Pricing not found for vehicle type: ${vehicleType}`)
    }
    return pricing
  }

  /**
   * Calculate fare based on distance, duration and surge pricing
   * Formula: baseFare + (distance * pricePerKm) + (duration * pricePerMinute) + surgeFare
   */
  async calculateFare(distance: number, duration: number, vehicleType: string, isPeakHour?: boolean, isRainy?: boolean) {
    if (distance <= 0 || duration <= 0) {
      throw new BadRequestException('Distance and duration must be greater than 0');
    }

    // Get pricing config
    const pricing = await this.getPricing(vehicleType);

    // Base calculation
    const baseFare = pricing.baseFare;
    const distanceFare = distance * pricing.pricePerKm;
    const timeFare = duration * pricing.pricePerMinute;
    let subtotal = baseFare + distanceFare + timeFare;

    // Apply surge pricing
    let surgeFare = 0;
    if (isPeakHour && pricing.peakHourSurge) {
      surgeFare += subtotal * (pricing.peakHourSurge / 100);
    }
    if (isRainy && pricing.rainyDaySurge) {
      surgeFare += subtotal * (pricing.rainyDaySurge / 100);
    }

    let totalFare = subtotal + surgeFare;

    // Apply minimum fare
    if (pricing.minimumFare && totalFare < pricing.minimumFare) {
      totalFare = pricing.minimumFare;
    }

    return {
      baseFare,
      distanceFare,
      timeFare,
      surgeFare,
      totalFare: Math.round(totalFare),
      details: {
        distance,
        duration,
        pricePerKm: pricing.pricePerKm,
        pricePerMinute: pricing.pricePerMinute,
        peakHourSurge: isPeakHour ? pricing.peakHourSurge : 0,
        rainyDaySurge: isRainy ? pricing.rainyDaySurge : 0,
      },
    };
  }

  /**
   * Find nearby online drivers
   */
  async findNearbyDrivers(latitude: number, longitude: number, radius: number = 5, vehicleType?: string, limit: number = 10) {
    if (isNaN(latitude) || isNaN(longitude)) {
      throw new BadRequestException('Invalid coordinates')
    }

    // Convert radius to meters for geospatial query
    const radiusInMeters = radius * 1000

    const drivers = await this.rideModel.db.collection('drivers')
      .aggregate([
        {
          $geoNear: {
            near: {
              type: 'Point',
              coordinates: [longitude, latitude],
            },
            distanceField: 'distance',
            maxDistance: radiusInMeters,
            spherical: true,
          },
        },
        {
          $match: {
            status: 'online',
            ...(vehicleType && { 'car.carType': vehicleType }),
          },
        },
        {
          $limit: limit,
        },
        {
          $project: {
            _id: 1,
            name: 1,
            phone: 1,
            rating: 1,
            car: 1,
            distance: 1,
            location: 1,
          },
        },
      ])
      .toArray()

    return drivers.map(driver => ({
      _id: driver._id,
      name: driver.name,
      phone: driver.phone,
      rating: driver.rating,
      carType: driver.car?.carType,
      licensePlate: driver.car?.licensePlate,
      location: driver.location,
      distance: Math.round(driver.distance / 1000 * 10) / 10, // Convert to km, round to 1 decimal
    }))
  }

  /**
   * Auto-assign driver to a ride using scoring algorithm
   */
  async autoAssignDriver(rideId: string): Promise<{ success: boolean; message: string; requestId?: string }> {
    console.log('[RidesService] 🤖 Auto-assigning driver for ride:', rideId);
    return this.autoAssignService.autoAssignDriver(rideId);
  }
}