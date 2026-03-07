import { Injectable, NotFoundException, BadRequestException, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CombinedTrip, CombinedTripDocument, CombinedTripStatus } from '../schemas/combined-trip.schema';
import { RideRequest, RideRequestDocument } from '../schemas/ride-request.schema';
import { Driver, DriverDocument } from '../../drivers/schemas/driver.schema';
import { extractLocationHierarchy } from '../../../shared/utils/location.util';

import { PricingService } from '../../pricing/pricing.service';
import { ConfigService } from '../../config/config.service';
import { ServiceType } from '../../config/schemas/driver-search-config.schema';
import { ModuleRef } from '@nestjs/core';

@Injectable()
export class CombinedTripsService implements OnModuleInit {
  private timeoutCheckInterval: NodeJS.Timeout | null = null;
  private processingTrips: Set<string> = new Set(); // Track trips being processed


  private pricingService: PricingService;

  constructor(
    @InjectModel(CombinedTrip.name) private combinedTripModel: Model<CombinedTripDocument>,
    @InjectModel(RideRequest.name) private rideRequestModel: Model<RideRequestDocument>,
    @InjectModel(Driver.name) private driverModel: Model<DriverDocument>,
    private eventEmitter: EventEmitter2,
    private moduleRef: ModuleRef,
    private configService: ConfigService,
  ) {}

  /**
   * Called after all modules are initialized
   */
  onModuleInit() {
    this.pricingService = this.moduleRef.get(PricingService, { strict: false });
    console.log('🚀 CombinedTripsService initialized - starting timeout checker');
    this.startTimeoutChecker();
  }

  /**
   * Cập nhật lại giá cho tất cả khách chưa hoàn thành khi có người ghép mới
   * (trừ những ride request đã COMPLETED)
   */
  async recalculateFaresForCombinedTrip(combinedTripId: string): Promise<void> {
    // ✅ CHỈ lấy ride request ĐANG HOẠT ĐỘNG (accepted, arrived_at_pickup, in_progress)
    // KHÔNG tính pending, rejected, timeout, cancelled
    const requests = await this.rideRequestModel.find({
      combinedTripId: new Types.ObjectId(combinedTripId),
      status: { $in: ['accepted', 'arrived_at_pickup', 'in_progress'] }, // ✅ CHỈ lấy requests đang active
    });
    
    console.log(`[recalculateFaresForCombinedTrip] Found ${requests.length} ACTIVE requests for trip ${combinedTripId}`);
    
    if (!requests.length) {
      console.log('[recalculateFaresForCombinedTrip] No active requests, skipping recalculation');
      return;
    }

    // ✅ Chuẩn bị dữ liệu cho pricing
    // CRITICAL: Phải tạo entry cho MỖI GHẾ, không phải mỗi request
    // Ví dụ: 1 request với 2 ghế → tạo 2 passenger entries
    const passengers = [];
    for (const req of requests) {
      const seatsCount = req.seats || 1;
      for (let i = 0; i < seatsCount; i++) {
        passengers.push({
          distance: req.distance || 0,
          isPeakTime: req.isPeakTime, // ✅ Dùng isPeakTime đã lưu
          peakMultiplier: req.peakMultiplier, // ✅ Dùng peakMultiplier đã lưu (1.0, 1.3, 1.5)
          vehicleType: 'sedan',
        });
      }
    }

    const totalSeats = passengers.length;
    console.log(`[recalculateFaresForCombinedTrip] Calculating price for ${totalSeats} TOTAL SEATS from ${requests.length} requests`);
    console.log(`  → Breakdown: ${requests.map(r => `${r.seats || 1} ghế`).join(', ')}`);

    // Tính lại giá cho tất cả khách
    const pricingResult = await this.pricingService.calculatePrice({ passengers });
    const breakdown = pricingResult.breakdown;

    // ✅ Cập nhật fare cho từng request
    // Mỗi request có thể có nhiều ghế, cần lấy tổng giá cho TẤT CẢ ghế của request đó
    let passengerIndex = 0;
    await Promise.all(requests.map(async (req) => {
      const seatsCount = req.seats || 1;
      let totalFareForRequest = 0;
      
      // Cộng giá của TẤT CẢ ghế thuộc request này
      for (let i = 0; i < seatsCount; i++) {
        const farePerSeat = breakdown[passengerIndex]?.finalPrice || 0;
        totalFareForRequest += farePerSeat;
        passengerIndex++;
      }
      
      console.log(`  → Request ${req._id}: ${req.distance}km, ${seatsCount} ghế, tổng: ${totalFareForRequest.toLocaleString()}đ (${(totalFareForRequest/seatsCount).toLocaleString()}đ/ghế)`);
      return this.rideRequestModel.findByIdAndUpdate(req._id, { fare: totalFareForRequest });
    }));
    
    console.log(`[recalculateFaresForCombinedTrip] ✅ Updated fares for ${requests.length} ACTIVE requests in trip ${combinedTripId}`);
  }

  /**
   * Get route directions using Google Maps API
   * ✅ Returns accurate distance and duration
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

      const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;
      if (!googleMapsApiKey) {
        throw new BadRequestException('Google Maps API key not configured');
      }

      // Google Maps format: latitude,longitude
      const origin = `${startLat},${startLng}`;
      const destination = `${endLat},${endLng}`;

      console.log('📍 [CombinedTrips] Calling Google Maps Directions API');
      console.log('   Origin:', origin);
      console.log('   Destination:', destination);

      // ✅ SIMPLIFIED: Request MULTIPLE alternative routes and pick the ABSOLUTE SHORTEST
      // No waypoints - let Google Maps find the best route naturally
      // Just like Google Maps on mobile phone
      const params = new URLSearchParams({
        origin,
        destination,
        key: googleMapsApiKey,
        mode: 'driving',
        region: 'vn',
        language: 'vi',
        alternatives: 'true', // ✅ Get up to 3 alternative routes
        units: 'metric',
        // ✅ NO AVOID parameters - allow all routes (even tolls/highways)
        // ✅ NO WAYPOINTS - let Google choose naturally
      });

      const url = `https://maps.googleapis.com/maps/api/directions/json?${params.toString()}`;

      const response = await fetch(url);

      if (!response.ok) {
        const errorBody = await response.text();
        console.error('Google Maps API error:', response.status, errorBody);
        throw new BadRequestException(`Google Maps API error: ${response.status}`);
      }

      const data: any = await response.json();

      console.log('✅ Google Maps Response received:', {
        status: data.status,
        routes: data.routes?.length,
      });

      // Check if route found
      if (data.status === 'OK' && data.routes && data.routes.length > 0) {
        // ✅ SIMPLE: Pick the ABSOLUTE SHORTEST route (like Google Maps mobile)
        // No complex scoring - distance is king!
        console.log(`🔍 Found ${data.routes.length} alternative routes, analyzing...`);
        
        let shortestRoute = data.routes[0];
        let shortestDistance = data.routes[0].legs.reduce((sum: number, leg: any) => sum + leg.distance.value, 0);

        for (const route of data.routes) {
          const totalDistance = route.legs.reduce((sum: number, leg: any) => sum + leg.distance.value, 0);
          const totalDuration = route.legs.reduce((sum: number, leg: any) => sum + leg.duration.value, 0);
          
          console.log(`📏 Route ${data.routes.indexOf(route) + 1}:`);
          console.log(`   Distance: ${(totalDistance / 1000).toFixed(2)}km`);
          console.log(`   Duration: ${Math.ceil(totalDuration / 60)}min`);
          console.log(`   Summary: ${route.summary}`);
          
          // ✅ Pick SHORTEST distance (simplest logic)
          if (totalDistance < shortestDistance) {
            shortestRoute = route;
            shortestDistance = totalDistance;
            console.log(`   ⭐ NEW SHORTEST ROUTE!`);
          }
        }

        console.log(`✅ Selected SHORTEST route: ${(shortestDistance / 1000).toFixed(2)}km - ${shortestRoute.summary}`);

        const route = shortestRoute;
        
        // ✅ Calculate distance and duration from selected route
        const totalDistance = route.legs.reduce((sum: number, leg: any) => sum + leg.distance.value, 0);
        const totalDuration = route.legs.reduce((sum: number, leg: any) => sum + leg.duration.value, 0);
        
        const distanceKm = totalDistance / 1000; // Convert meters to km
        const durationMinutes = Math.ceil(totalDuration / 60); // Convert seconds to minutes
        
        // Format text
        const distanceText = `${distanceKm.toFixed(1)} km`;
        const durationText = `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m`.replace('0h ', '');

        console.log('✅ Route found:', {
          distanceKm: distanceKm.toFixed(2),
          durationMinutes,
          distanceText,
          durationText,
          legs: route.legs.length,
        });

        // Decode the polyline
        console.log('📍 Decoding polyline from Google Maps...');
        const decodedCoordinates = this.decodePolyline(route.overview_polyline.points);
        console.log('📍 Polyline decoded, coordinates:', decodedCoordinates.length);

        const response = {
          distance: distanceKm, // in km
          duration: durationMinutes, // in minutes
          distanceText,
          durationText,
          features: [
            {
              geometry: {
                type: 'LineString',
                coordinates: decodedCoordinates,
              },
              properties: {
                summary: {
                  distance: totalDistance,
                  duration: totalDuration,
                  routeSummary: route.summary, // Include route name (e.g., "via QL1A")
                }
              }
            }
          ]
        };

        console.log('📍 Final response:', {
          distance: response.distance,
          duration: response.duration,
          distanceText: response.distanceText,
          durationText: response.durationText,
          coordinatesCount: response.features[0].geometry.coordinates.length,
        });

        return response;
      } else {
        console.error('No route found. Status:', data.status);
        throw new BadRequestException(`No route found. Status: ${data.status}`);
      }
    } catch (err: any) {
      console.error('❌ Error fetching directions from Google Maps:', err.message);
      throw new BadRequestException(err.message || 'Failed to fetch directions');
    }
  }

  /**
   * Decode Google Maps polyline format to coordinates
   * Reference: https://developers.google.com/maps/documentation/utilities/polylinealgorithm
   */
  private decodePolyline(encoded: string): any[] {
    const inv = 1.0 / 1e5;
    const decoded: any[] = [];
    let previous = [0, 0];
    let i = 0;

    console.log('[decodePolyline] Decoding polyline of length:', encoded.length);

    while (i < encoded.length) {
      let ll = [0, 0];

      for (let j = 0; j < 2; j++) {
        let shift = 0;
        let result = 0;
        let byte = 0;

        do {
          byte = encoded.charCodeAt(i++) - 63;
          result |= (byte & 0x1f) << shift;
          shift += 5;
        } while (byte >= 0x20);

        ll[j] = previous[j] + (result & 1 ? ~(result >> 1) : result >> 1);
        previous[j] = ll[j];
      }

      // Convert to [longitude, latitude] format for GeoJSON
      const coordinate = [ll[1] * inv, ll[0] * inv];
      decoded.push(coordinate);
    }

    console.log('[decodePolyline] Decoded total coordinates:', decoded.length);
    if (decoded.length > 0) {
      console.log('[decodePolyline] Sample coordinates:', decoded.slice(0, 3));
      console.log('[decodePolyline] Last coordinate:', decoded[decoded.length - 1]);
    }

    return decoded;
  }

  /**
   * Build coordinates with optimized Vietnam highway waypoints
   * Forces OSRM to route along main highways instead of through Laos/Cambodia
   */
  private buildCoordinatesWithWaypoints(
    startLng: number,
    startLat: number,
    endLng: number,
    endLat: number,
    directDistance: number,
  ): string {
    // ✅ Main Vietnam highway waypoints (North to South)
    // These are strategic points along Vietnam's main North-South highway
    const vietnamHighwayWaypoints = [
      { lng: 105.8542, lat: 21.0285, name: 'Hà Nội' },           // North
      { lng: 105.8500, lat: 19.8000, name: 'Thanh Hóa' },
      { lng: 106.5000, lat: 18.0000, name: 'Huế' },
      { lng: 107.0000, lat: 16.0000, name: 'Đà Nẵng' },
      { lng: 109.2000, lat: 13.8000, name: 'Quy Nhơn' },
      { lng: 108.0000, lat: 12.0000, name: 'Nha Trang' },
      { lng: 107.5000, lat: 10.8000, name: 'TP.HCM area' },      // South
    ];

    let coordinates = `${startLng},${startLat}`;

    // Nếu route > 300km, thêm waypoints gần start/end
    if (directDistance > 300) {
      console.log('🛣️ Long distance (>300km) - adding multiple waypoints');
      
      // Tìm 3-5 waypoints gần nhất trên đường chính
      const relevantWaypoints = this.findRelevantWaypoints(
        startLng, startLat, endLng, endLat,
        vietnamHighwayWaypoints,
        Math.min(5, Math.ceil(directDistance / 200)) // 1 waypoint per 200km
      );

      for (const wp of relevantWaypoints) {
        coordinates += `;${wp.lng},${wp.lat}`;
        console.log(`   Added waypoint: ${wp.name}`);
      }
    } else {
      console.log('🛣️ Short/medium distance (<300km) - adding 1-2 waypoints');
      // For short routes, add 1-2 strategic waypoints
      const midLat = (startLat + endLat) / 2;
      const midLng = (startLng + endLng) / 2;
      
      // Shift EAST to avoid Laos
      const adjustedMidLng = midLng + 0.6;
      
      // Tìm waypoint gần nhất trên đường chính
      const nearestWaypoint = this.findNearestWaypoint(
        adjustedMidLng, midLat,
        vietnamHighwayWaypoints
      );
      
      if (nearestWaypoint) {
        coordinates += `;${nearestWaypoint.lng},${nearestWaypoint.lat}`;
        console.log(`   Added waypoint: ${nearestWaypoint.name}`);
      }
    }

    // Add end point
    coordinates += `;${endLng},${endLat}`;
    
    return coordinates;
  }

  /**
   * Find relevant waypoints along Vietnam highway based on start/end coordinates
   */
  private findRelevantWaypoints(
    startLng: number,
    startLat: number,
    endLng: number,
    endLat: number,
    allWaypoints: any[],
    maxCount: number,
  ): any[] {
    // Sort waypoints by their position along the route
    const sorted = allWaypoints
      .map(wp => ({
        ...wp,
        // Score based on proximity to route and progression from start to end
        score: this.calculateWaypointScore(startLat, startLng, endLat, endLng, wp.lat, wp.lng),
      }))
      .sort((a, b) => a.score - b.score)
      .slice(0, maxCount);

    return sorted;
  }

  /**
   * Find nearest waypoint to a given coordinate
   */
  private findNearestWaypoint(
    lng: number,
    lat: number,
    waypoints: any[],
  ): any {
    let nearest = waypoints[0];
    let minDistance = this.calculateHaversineDistance(lat, lng, nearest.lat, nearest.lng);

    for (const wp of waypoints) {
      const dist = this.calculateHaversineDistance(lat, lng, wp.lat, wp.lng);
      if (dist < minDistance) {
        minDistance = dist;
        nearest = wp;
      }
    }

    return nearest;
  }

  /**
   * Calculate score for waypoint relevance (lower = better fit for route)
   */
  private calculateWaypointScore(
    startLat: number,
    startLng: number,
    endLat: number,
    endLng: number,
    waypointLat: number,
    waypointLng: number,
  ): number {
    // Distance from waypoint to route line
    // Using simple projection: how close waypoint is to line between start and end
    const totalDistance = this.calculateHaversineDistance(startLat, startLng, endLat, endLng);
    const distToStart = this.calculateHaversineDistance(startLat, startLng, waypointLat, waypointLng);
    const distToEnd = this.calculateHaversineDistance(waypointLat, waypointLng, endLat, endLng);
    
    // Score = how much waypoint deviates from straight line
    // Lower score = better alignment with route
    const directSum = distToStart + distToEnd;
    const deviation = Math.max(0, directSum - totalDistance);
    
    return deviation;
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   * Returns distance in kilometers
   */
  private calculateHaversineDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
      Math.cos(this.toRadians(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Start interval to check for expired requests every 5 seconds
   */
  private startTimeoutChecker() {
    console.log('⏰ Starting timeout checker - will check expired requests every 5 seconds');
    
    this.timeoutCheckInterval = setInterval(async () => {
      try {
        const now = new Date();
        const expiredRequests = await this.rideRequestModel.find({
          status: 'pending',
          expiresAt: { $lt: now },
        });

        if (expiredRequests.length > 0) {
          console.log('⏰ [Timeout Checker] Found', expiredRequests.length, 'expired requests');
          
          for (const expiredReq of expiredRequests) {
            console.log('⏰ Processing expired request:', expiredReq._id, 'for trip:', expiredReq.combinedTripId);
            
            // Find next driver for the trip
            const combinedTripId = expiredReq.combinedTripId?.toString();
            if (combinedTripId) {
              // ✅ PREVENT DUPLICATE PROCESSING - skip if already processing this trip
              if (this.processingTrips.has(combinedTripId)) {
                console.log('⚠️ [Timeout Checker] Trip', combinedTripId, 'already being processed, skipping');
                continue;
              }
              
              // Mark trip as being processed
              this.processingTrips.add(combinedTripId);
              console.log('🔒 [Timeout Checker] Locked trip', combinedTripId, 'for processing');
              
              // ✅ MARK AS TIMEOUT with status guard to prevent race condition:
              // Driver may have just accepted while this checker was finding expired requests.
              // Using findOneAndUpdate with status:'pending' ensures we never overwrite 'accepted'→'timeout'.
              const timeoutUpdateResult = await this.rideRequestModel.findOneAndUpdate(
                { _id: expiredReq._id, status: 'pending' },
                { status: 'timeout', updatedAt: new Date() },
                { new: true },
              );
              
              if (!timeoutUpdateResult) {
                // Request was already accepted/rejected by the driver — do NOT override
                this.processingTrips.delete(combinedTripId);
                console.log('⚠️ [Timeout Checker] Request already handled (accepted/rejected), skipping:', expiredReq._id);
                continue;
              }
              
              console.log('⏰ [Timeout Checker] Marked request as TIMEOUT (not deleted):', expiredReq._id);
              console.log('📝 [Timeout Checker] This driver will be EXCLUDED from next search');
              
              const trip = await this.combinedTripModel.findById(combinedTripId);
              if (trip && trip.status === 'pending') {
                const pickupCoordinates = trip.pickupLocation?.coordinates as [number, number];
                if (pickupCoordinates) {
                  // ✅ ALWAYS delay 15 seconds from when request expired before finding next driver
                  const expiredAt = expiredReq.expiresAt.getTime();
                  const targetTime = expiredAt + 15000; // 15s after expiry
                  const delayNeeded = targetTime - now.getTime();
                  
                  if (delayNeeded > 0) {
                    console.log(`⏰ [Timeout Checker] Request expired at ${expiredReq.expiresAt.toISOString()}`);
                    console.log(`⏰ [Timeout Checker] Will find next driver in ${delayNeeded}ms (15s from expiry)`);
                    setTimeout(() => {
                      console.log('🔄 [Timeout Checker] 15 seconds passed, finding next driver for trip:', combinedTripId);
                      this.findAndNotifyDrivers(combinedTripId, pickupCoordinates)
                        .catch(err => {
                          console.error('❌ Error finding next driver:', err);
                        })
                        .finally(() => {
                          // Release lock after processing
                          this.processingTrips.delete(combinedTripId);
                          console.log('🔓 [Timeout Checker] Unlocked trip', combinedTripId);
                        });
                    }, delayNeeded);
                  } else {
                    // Already more than 15s since expiry (shouldn't happen with 5s interval)
                    console.log('🔄 [Timeout Checker] Finding next driver immediately (>15s since expiry)');
                    this.findAndNotifyDrivers(combinedTripId, pickupCoordinates)
                      .catch(err => {
                        console.error('❌ Error finding next driver:', err);
                      })
                      .finally(() => {
                        // Release lock after processing
                        this.processingTrips.delete(combinedTripId);
                        console.log('🔓 [Timeout Checker] Unlocked trip', combinedTripId);
                      });
                  }
                } else {
                  // No coordinates, release lock
                  this.processingTrips.delete(combinedTripId);
                }
              } else {
                // Trip no longer pending, release lock
                this.processingTrips.delete(combinedTripId);
                console.log('🔓 [Timeout Checker] Trip not pending, unlocked', combinedTripId);
              }
            }
          }
        }
      } catch (error) {
        console.error('❌ Error in timeout checker:', error);
      }
    }, 5000); // Check every 5 seconds
  }

  /**
   * Stop the timeout checker (for cleanup)
   */
  onModuleDestroy() {
    if (this.timeoutCheckInterval) {
      clearInterval(this.timeoutCheckInterval);
      console.log('⏰ Timeout checker stopped');
    }
  }

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
        .populate('driverId', 'firstName lastName avatar rating averageRating totalReviews vehicleModel vehiclePlate vehicleType')
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
    maxDistance?: number,
  ): Promise<CombinedTrip[]> {
    try {
      // Get search radius from config (default to 10000m if not set)
      const searchRadius = maxDistance ?? await this.configService.getSearchRadius(ServiceType.RIDESHARE);

      // Build query with both geospatial filter AND address filter
      const query: any = {
        status: { $in: [CombinedTripStatus.PENDING, CombinedTripStatus.ACCEPTED] },
        // Geospatial query: find trips with pickup location within maxDistance from user
        pickupLocation: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [lng, lat],
            },
            $maxDistance: searchRadius, // in meters
          },
        },
      };

      

      const trips = await this.combinedTripModel
        .find(query)
        .populate('driverId', 'firstName lastName avatar rating averageRating totalReviews vehicleModel vehiclePlate vehicleType')
        .populate('customerId', 'firstName lastName phone avatar')
        .sort({ requestedAt: -1 })
        .limit(10);

     
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
        .populate({
          path: 'driverId',
          select: 'firstName lastName avatar rating averageRating totalReviews vehicleModel vehiclePlate vehicleType vehicleColor phone',
          // Don't fail if driver is null
          options: { strictPopulate: false },
        })
        .populate({
          path: 'customerId',
          model: 'Customer',
          select: 'firstName lastName phone avatar rating',
          options: { strictPopulate: false },
        });

      if (!trip) {
        console.error('[CombinedTripsService] ❌ Trip not found in database:', combinedTripId);
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
      

      let tripIdObj: Types.ObjectId;
      try {
        tripIdObj = new Types.ObjectId(combinedTripId);
       
      } catch (e) {
        console.error('❌ Failed to convert combinedTripId to ObjectId:', combinedTripId, e);
        tripIdObj = new Types.ObjectId(combinedTripId);
      }

      const requests = await this.rideRequestModel
        .find({ combinedTripId: tripIdObj })
        .populate('customerId', 'name phone rating firstName lastName avatar')
        .exec() as any[];

      

      let enrichedCustomers = [];

      // ✅ CRITICAL FIX: Build customer data from RideRequests instead of trip.customerId
      // This ensures driver rotation works - even if trip.customerId is empty/wrong,
      // we get customer data from RideRequests which always has current data
      if (requests.length > 0) {
       
        enrichedCustomers = requests.map((customerRequest: any) => {
          const customer = customerRequest.customerId; // This is populated customer object
          
          return {
            _id: customer?._id || customerRequest.customerId,
            name: customer?.name || customer?.firstName || 'Khách hàng',
            phone: customer?.phone || '',
            rating: customer?.rating || 0,
            firstName: customer?.firstName || '',
            lastName: customer?.lastName || '',
            avatar: customer?.avatar || '',
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
      } else if (trip.customerId && trip.customerId.length > 0) {
        // ✅ FALLBACK: Use trip.customerId only if no RideRequests found
       
        const isPopulated = trip.customerId[0] && typeof trip.customerId[0] === 'object' && trip.customerId[0]._id;

        if (isPopulated) {
          enrichedCustomers = (trip.customerId || []).map((customer: any) => {
            return {
              _id: customer._id,
              name: customer.name || customer.firstName || 'Khách hàng',
              phone: customer.phone || '',
              rating: customer.rating || 0,
              firstName: customer.firstName || '',
              lastName: customer.lastName || '',
              avatar: customer.avatar || '',
              pickupAddress: trip.pickupAddress || '',
              dropoffAddress: trip.dropoffAddress || '',
              pickupCoordinates: trip.pickupLocation?.coordinates || [],
              dropoffCoordinates: trip.dropoffLocation?.coordinates || [],
              distance: trip.distance || 0,
              fare: trip.totalFare || 0,
              status: 'pending', // Default status if no RideRequest
              requestId: null, // No requestId available
            };
          });
        }
      }

      

      const tripObject = trip.toObject ? trip.toObject() : trip;
      const enrichedTrip = {
        ...tripObject,
        customerId: enrichedCustomers,
        // ✅ Add bookedSeats calculation for frontend display
        bookedSeats: (tripObject.totalSeats || 4) - (tripObject.availableSeats || 4),
      };

    

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
      const timestamp = new Date().toISOString();
      console.log('═══════════════════════════════════════════════════════════');
      console.log('🚗 [CombinedTripsService] DRIVER ACCEPTING TRIP');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('⏰ Timestamp:', timestamp);
      console.log('🆔 Trip ID:', combinedTripId);
      console.log('👤 Driver ID:', driverId);
      console.log('═══════════════════════════════════════════════════════════');

      const trip = await this.combinedTripModel.findById(combinedTripId);
      
      if (!trip) {
        console.error('❌ Trip not found:', combinedTripId);
        throw new NotFoundException('Combined trip not found');
      }

      console.log('📋 [BEFORE UPDATE] Trip current state:', {
        id: trip._id,
        status: trip.status,
        currentDriverId: trip.driverId,
        customerId: trip.customerId,
        pickupAddress: trip.pickupAddress,
        createdBy: trip.createdBy,
      });

      if (trip.status !== CombinedTripStatus.PENDING) {
        console.error('❌ Trip not available for acceptance. Status:', trip.status);
        throw new BadRequestException(`Combined trip is not available for acceptance. Current status: ${trip.status}`);
      }

      if (trip.driverId) {
        console.error('❌ Trip already accepted by driver:', trip.driverId);
        throw new BadRequestException('Combined trip has already been accepted by another driver');
      }

      console.log('✅ Trip is available - updating to ACCEPTED...');
      
      const updatedTrip = await this.combinedTripModel.findByIdAndUpdate(
        combinedTripId,
        {
          driverId: new Types.ObjectId(driverId),
          status: CombinedTripStatus.ACCEPTED,
          acceptedAt: new Date(),
        },
        { new: true },
      )
        .populate('driverId', 'firstName lastName avatar rating averageRating totalReviews vehicleModel vehiclePlate vehicleType')
        .populate('customerId', 'firstName lastName phone avatar')
        .exec();

      if (!updatedTrip) {
        console.error('❌ Failed to update trip');
        throw new NotFoundException('Failed to update combined trip');
      }

      console.log('═══════════════════════════════════════════════════════════');
      console.log('✅✅✅ TRIP ACCEPTED SUCCESSFULLY ✅✅✅');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('🆔 Trip ID:', updatedTrip._id);
      console.log('👤 Driver:', updatedTrip.driverId ? `${(updatedTrip.driverId as any).firstName} ${(updatedTrip.driverId as any).lastName}` : 'Unknown');
      console.log('📍 Pickup:', updatedTrip.pickupAddress);
      console.log('📍 Dropoff:', updatedTrip.dropoffAddress);
      console.log('💰 Fare:', updatedTrip.baseFare);
      console.log('⏰ Accepted at:', updatedTrip.acceptedAt);
      console.log('🔔 Status changed from PENDING → ACCEPTED');
      console.log('═══════════════════════════════════════════════════════════');
      
      return updatedTrip;
    } catch (error) {
      console.error('[CombinedTripsService] Error accepting combined trip:', error);
      throw error;
    }
  }

  /**
   * Create combined trip from customer request (like Grab)
   */
  async createCustomerCombinedTrip(data: any): Promise<CombinedTrip> {
    try {
      

      const locationHierarchy = extractLocationHierarchy(data.pickupAddress);

      const trip = new this.combinedTripModel({
        pickupAddress: data.pickupAddress,
        dropoffAddress: data.dropoffAddress,
        pickupLocation: {
          type: 'Point',
          coordinates: data.pickupCoordinates || [0, 0],
        },
        dropoffLocation: {
          type: 'Point',
          coordinates: data.dropoffCoordinates || [0, 0],
        },
        pickupProvince: locationHierarchy.province,
        pickupDistrict: locationHierarchy.district,
        pickupWard: locationHierarchy.ward,
        distance: data.distance || 0,
        duration: data.duration || 0,
        baseFare: data.totalFare || 0, // Required field
        totalFare: data.totalFare || 0,
        totalSeats: 4, // ✅ Sedan có 4 ghế
        availableSeats: 4, // ✅ Ban đầu 4 ghế trống, sẽ trừ khi driver accept
        customerId: data.customerId ? [data.customerId] : [],
        status: CombinedTripStatus.PENDING,
        requestedAt: new Date(),
        createdBy: 'customer', // Mark as created by customer
        driverQueue: [], // Will be populated with nearby drivers
        currentDriverIndex: 0,
      });

      const savedTrip = await trip.save();
     

      return savedTrip;
    } catch (error) {
      console.error('❌ Error creating customer combined trip:', error);
      throw error;
    }
  }

  /**
   * Find nearby available drivers and send notification
   * Implements Grab-like queue system: send to closest driver, if timeout, send to next
   */
  // hàm tìm và thông báo cho tài xế
  async findAndNotifyDrivers(combinedTripId: string, pickupCoordinates: [number, number]): Promise<void> {
    try {
      const callId = Date.now();
      const stack = new Error().stack;
      console.log('');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('🆔 [findAndNotifyDrivers] CALL ID:', callId);
      console.log('🔍 [findAndNotifyDrivers] Trip:', combinedTripId);
      console.log('📍 Pickup coordinates:', pickupCoordinates);
      console.log('📞 Called from:', stack?.split('\n')[2]?.trim() || 'unknown');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('');

      // Get the combined trip to get customerId
      const combinedTrip = await this.combinedTripModel.findById(combinedTripId);
      if (!combinedTrip) {
        throw new NotFoundException(`Combined trip not found: ${combinedTripId}`);
      }
      
      // ⭐ CRITICAL FIX: If trip is driver-created, skip finding drivers (driver already assigned)
      if (combinedTrip.createdBy === 'driver') {
        console.log('⚠️ [findAndNotifyDrivers] Trip created by DRIVER - skipping driver search (driver already assigned)');
        console.log('🚗 Assigned driver:', combinedTrip.driverId);
        return; // Early return - no need to find drivers
      }
      
      // Only for customer-created trips, we need to find drivers
      const customerId = combinedTrip.customerId && combinedTrip.customerId[0] ? combinedTrip.customerId[0] : null;
      if (!customerId) {
        console.log('⚠️ [findAndNotifyDrivers] No customer ID found for trip:', combinedTripId);
        console.log('⚠️ Trip details:', { createdBy: combinedTrip.createdBy, status: combinedTrip.status });
        throw new BadRequestException(`No customer ID found for trip: ${combinedTripId}`);
      }

      // First, check how many drivers exist in total
      const allDrivers = await this.driverModel.find({});
      console.log('📊 Total drivers in database:', allDrivers.length);
      
      const availableDrivers = await this.driverModel.find({ status: 'online' });
      console.log('📊 Available drivers (online):', availableDrivers.length);
      
      const driversWithLocation = await this.driverModel.find({ 
        currentLocation: { $exists: true, $ne: null } 
      });
      console.log('📊 Drivers with location:', driversWithLocation.length);
      
      // 🔍 DEBUG: Print ALL driver locations
      console.log('');
      console.log('🗺️ ALL DRIVER LOCATIONS:');
      for (const d of availableDrivers) {
        console.log(`  Driver ${d._id} (${d.firstName} ${d.lastName}):`);
        console.log(`    Status: ${d.status}`);
        console.log(`    Location:`, d.currentLocation?.coordinates || 'NO LOCATION');
        console.log('');
      }
      console.log('🎯 Customer pickup:', pickupCoordinates);
      console.log('');

      // Get list of drivers who already have active trips
      const activeTrips = await this.combinedTripModel.find({
        driverId: { $exists: true, $ne: null },
        status: { $in: ['pending', 'accepted', 'in_progress'] },
      });
      const busyDriverIds = activeTrips.map(trip => trip.driverId?.toString()).filter(Boolean);
      console.log('📊 Busy drivers (already have active trips):', busyDriverIds.length);

      // ✅ NEW: Get list of drivers who already REJECTED or TIMED OUT for THIS trip
      // 🔥 CRITICAL: Only exclude drivers with requests that are STILL VALID (not expired)
      // Don't exclude drivers from old/expired requests
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      const rejectedRequests = await this.rideRequestModel.find({
        combinedTripId: new Types.ObjectId(combinedTripId),
        status: { $in: ['rejected', 'timeout'] }, // Include both rejected AND timeout
        createdAt: { $gte: thirtyMinutesAgo }, // ✅ Only from last 30 minutes
      });
      const rejectedDriverIds = rejectedRequests.map(req => req.driverId?.toString()).filter(Boolean)
      console.log('📊 Rejected/timeout drivers for this trip (last 30 min):', rejectedDriverIds.length, rejectedDriverIds)

      // Combine exclusion lists: busy drivers + rejected drivers
      const excludedDriverIds = [...busyDriverIds, ...rejectedDriverIds];
      console.log('📊 Total excluded drivers:', excludedDriverIds.length);

      // Get search radius from config (default to 10000m if not set)
      const searchRadiusMeters = await this.configService.getSearchRadius(ServiceType.RIDESHARE);
      const searchRadiusKm = (searchRadiusMeters / 1000).toFixed(1);
      const searchRadiusForSphere = searchRadiusMeters / 1000 / 6378.1; // Convert to radians for $centerSphere

      // Find available drivers within configured radius, sorted by priorityScore then averageRating
      // Exclude drivers who already have active trips OR rejected/timeout this trip
      // ✅ NGHIỆP VỤ: Chỉ tìm driver ONLINE + có loại RIDESHARE
      // ✅ NEW: Sort by priorityScore (higher = more reliable) then averageRating
      const drivers = await this.driverModel.find({
        _id: { $nin: excludedDriverIds.map(id => new Types.ObjectId(id)) }, // ✅ Exclude busy + rejected drivers
        $or: [
          { status: 'online' },
          { isOnline: true }
        ], // Driver must be available
        driverTypes: { $in: ['rideshare'] }, // ✅ CHỈ lấy driver có loại RIDESHARE
        currentLocation: {
          $geoWithin: {
            $centerSphere: [pickupCoordinates, searchRadiusForSphere] // Dynamic radius from config (Earth radius = 6378.1km)
          },
        },
      })
      .sort({ priorityScore: -1, averageRating: -1 }) // ✅ Sort by priority score first, then rating
      .limit(10); // Get top 10 highest priority drivers

      console.log(`✅ Found RIDESHARE drivers within ${searchRadiusKm}km (sorted by priority):`, drivers.length);
      
      if (drivers.length > 0) {
        console.log('🚗 RIDESHARE Driver details:', drivers.map(d => ({
          id: d._id,
          name: `${d.firstName} ${d.lastName}`,
          status: d.status,
          driverTypes: d.driverTypes, // ✅ Show driver types
          priorityScore: d.priorityScore || 0, // ✅ Show priority score
          averageRating: d.averageRating || 0,
          location: d.currentLocation,
        })));
      }

      if (drivers.length === 0) {
        console.warn(`⚠️ No RIDESHARE drivers found within ${searchRadiusKm}km (need: online + rideshare type) - will retry in 30s`);
        // Don't mark as no_drivers_available - keep trying forever until customer cancels
        // Schedule retry after 30 seconds
        setTimeout(async () => {
          const trip = await this.combinedTripModel.findById(combinedTripId);
          if (trip && trip.status === 'pending') {
            console.log('🔄 Retrying driver search...');
            await this.findAndNotifyDrivers(combinedTripId, pickupCoordinates);
          }
        }, 30000); // Retry after 30 seconds
        return;
      }

      // For customer-created trips: Only send to ONE driver at a time (no queue)
      // Pick the closest driver
      const targetDriver = drivers[0];
      
      console.log('');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('📬 [findAndNotifyDrivers] CREATING RIDE REQUEST');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('📬 Sending notification to closest driver:', targetDriver._id);
      console.log('📬 Driver name:', `${targetDriver.firstName} ${targetDriver.lastName}`);
      console.log('📬 Trip ID:', combinedTripId);
      console.log('📬 Customer ID:', customerId);
      console.log('📬 🎯 THIS IS THE ONLY DRIVER WHO WILL RECEIVE THIS REQUEST');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('');

      // Update trip with current driver being notified (NOT a queue)
      // sửa lại để chỉ có 1 tài xế được thông báo
      await this.combinedTripModel.findByIdAndUpdate(combinedTripId, {
        currentDriverId: targetDriver._id,
        notificationSentAt: new Date(),
      });

      // Create ride request for this driver with complete trip details
      // Get timeout from config (RIDESHARE service) — fallback to 45s if config missing/zero
      const timeoutMsRaw = await this.configService.getRequestTimeout(ServiceType.RIDESHARE);
      const timeoutMs = Math.max(10000, timeoutMsRaw || 45000);

      const rideRequest = new this.rideRequestModel({
        combinedTripId: new Types.ObjectId(combinedTripId),
        customerId: new Types.ObjectId(customerId), // ✅ Add required customerId
        driverId: targetDriver._id,
        tripType: 'combined_trip',
        createdBy: combinedTrip.createdBy || 'customer', // ✅ Mark who created the trip
        status: 'pending',
        // Copy trip details from combinedTrip
        pickupAddress: combinedTrip.pickupAddress,
        pickupCoordinates: combinedTrip.pickupLocation?.coordinates,
        dropoffAddress: combinedTrip.dropoffAddress,
        dropoffCoordinates: combinedTrip.dropoffLocation?.coordinates,
        fare: combinedTrip.baseFare,
        seats: combinedTrip.availableSeats,
        distance: combinedTrip.distance,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + timeoutMs), // Dynamic timeout from config
      });

      await rideRequest.save();
      
      console.log('');
      console.log('✅✅✅ RIDE REQUEST CREATED ✅✅✅');
      console.log('Request ID:', rideRequest._id);
      console.log('For Driver ID:', targetDriver._id);
      console.log('Trip ID:', combinedTripId);
      console.log('Status:', rideRequest.status);
      console.log('Expires at:', rideRequest.expiresAt);
      console.log('Timeout configured:', `${timeoutMs}ms`);
      console.log('⏰ Timeout will be checked by polling endpoint');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('');

      // ✅ NO setTimeout - timeout is handled by polling endpoint checking expiresAt

    } catch (error) {
      console.error('❌ Error finding and notifying drivers:', error);
      throw error;
    }
  }

  /**
   * Handle driver timeout - find another driver instead of using queue
   */
  async handleDriverTimeout(combinedTripId: string, rideRequestId: string): Promise<void> {
    try {
      console.log('⏰ [CombinedTripsService] Checking driver timeout for trip:', combinedTripId);

      const rideRequest = await this.rideRequestModel.findById(rideRequestId);
      
      if (!rideRequest || rideRequest.status !== 'pending') {
        console.log('✅ Request already handled, skipping timeout');
        return;
      }

      console.log('🔄 Driver timeout - finding another driver');

      // Mark current request as rejected (timeout)
      await this.rideRequestModel.findByIdAndUpdate(rideRequestId, {
        status: 'rejected',
      });

      const trip = await this.combinedTripModel.findById(combinedTripId);
      
      if (!trip || trip.status !== 'pending') {
        console.log('⚠️ Trip no longer pending');
        return;
      }

      const rejectedDriverId = rideRequest.driverId;
      const pickupCoordinates = trip.pickupLocation?.coordinates as [number, number];
      
      if (!pickupCoordinates) {
        console.error('❌ No pickup coordinates found');
        return;
      }

      // Get list of busy drivers (already have active trips)
      const activeTrips = await this.combinedTripModel.find({
        driverId: { $exists: true, $ne: null },
        status: { $in: ['pending', 'accepted', 'in_progress'] },
      });
      const busyDriverIds = activeTrips.map(trip => trip.driverId?.toString()).filter(Boolean);
      
      // ✅ CRITICAL FIX: Get ALL drivers who recently rejected/timeout for THIS trip
      // Only exclude drivers with requests from last 30 minutes (not old expired ones)
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      const allRejectedRequests = await this.rideRequestModel.find({
        combinedTripId: new Types.ObjectId(combinedTripId),
        status: 'rejected',
        createdAt: { $gte: thirtyMinutesAgo }, // ✅ Only from last 30 minutes
      });
      const allRejectedDriverIds = allRejectedRequests.map(req => req.driverId?.toString()).filter(Boolean);
      console.log('📊 All recently rejected drivers (last 30 min):', allRejectedDriverIds.length, allRejectedDriverIds);
      
      // Combine all exclusion lists: busy drivers + ALL rejected drivers (not just current one)
      const excludedDriverIds = [...busyDriverIds, ...allRejectedDriverIds];
      console.log('📊 Total excluded drivers (busy + all rejected):', excludedDriverIds.length);

      // Find another driver (excluding busy drivers and the one who timed out)
      // ✅ NGHIỆP VỤ: Chỉ tìm driver ONLINE + có loại RIDESHARE
      const drivers = await this.driverModel.find({
        _id: { $nin: excludedDriverIds.map(id => new Types.ObjectId(id)) }, // ✅ Exclude busy + rejected drivers
        $or: [
          { status: 'online' },
          { isOnline: true }
        ], // ✅ Check both status fields
        driverTypes: { $in: ['rideshare'] }, // ✅ CHỈ lấy driver có loại RIDESHARE
        currentLocation: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: pickupCoordinates,
            },
            $maxDistance: 50000, // 50km (increased for testing)
          },
        },
      }).limit(1); // Get only the closest driver

      if (drivers.length === 0) {
        console.warn('⚠️ No other available drivers found - will retry in 30s');
        // Retry after 30 seconds
        setTimeout(async () => {
          const tripCheck = await this.combinedTripModel.findById(combinedTripId);
          if (tripCheck && tripCheck.status === 'pending') {
            console.log('🔄 Retrying driver search after timeout...');
            await this.findAndNotifyDrivers(combinedTripId, pickupCoordinates);
          }
        }, 30000);
        return;
      }

      const nextDriver = drivers[0];
      console.log('📬 Sending notification to next driver:', nextDriver._id);

      // Update trip with new current driver
      await this.combinedTripModel.findByIdAndUpdate(combinedTripId, {
        currentDriverId: nextDriver._id,
        notificationSentAt: new Date(),
      });

      // Get customerId from trip
      const customerId = trip.customerId && trip.customerId[0] ? trip.customerId[0] : null;

      // Get timeout from config (RIDESHARE service)
      const timeoutMs = await this.configService.getRequestTimeout(ServiceType.RIDESHARE);

      // Create new ride request for next driver
      const newRideRequest = new this.rideRequestModel({
        combinedTripId: new Types.ObjectId(combinedTripId),
        customerId: customerId ? new Types.ObjectId(customerId) : undefined,
        driverId: nextDriver._id,
        tripType: 'combined_trip',
        createdBy: trip.createdBy || 'customer',
        status: 'pending',
        // Copy trip details
        pickupAddress: trip.pickupAddress,
        pickupCoordinates: trip.pickupLocation?.coordinates,
        dropoffAddress: trip.dropoffAddress,
        dropoffCoordinates: trip.dropoffLocation?.coordinates,
        fare: trip.baseFare,
        seats: trip.availableSeats,
        distance: trip.distance,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + timeoutMs), // Dynamic timeout from config
      });

      await newRideRequest.save();
      console.log('✅ New ride request created for next driver');
      console.log('📬 New request ID:', newRideRequest._id);
      console.log('📬 Next driver ID:', nextDriver._id);
      console.log('Timeout configured:', `${timeoutMs}ms`);
      console.log('⏰ Timeout will be checked by polling endpoint');

      // ✅ NO setTimeout - timeout is handled by polling endpoint checking expiresAt

    } catch (error) {
      console.error('❌ Error handling driver timeout:', error);
    }
  }

  /**
   * Find combined trip by ID
   */
  async findById(tripId: string): Promise<any> {
    try {
      const tripIdObj = new Types.ObjectId(tripId);
      const trip = await this.combinedTripModel.findById(tripIdObj);
      return trip;
    } catch (error) {
      console.error('❌ Error finding trip by ID:', error);
      throw error;
    }
  }

  /**
   * Update combined trip
   */
  async update(tripId: string, updateData: any): Promise<any> {
    try {
      const tripIdObj = new Types.ObjectId(tripId);
      const updatedTrip = await this.combinedTripModel.findByIdAndUpdate(
        tripIdObj,
        updateData,
        { new: true }
      );
      return updatedTrip;
    } catch (error) {
      console.error('❌ Error updating trip:', error);
      throw error;
    }
  }
}
