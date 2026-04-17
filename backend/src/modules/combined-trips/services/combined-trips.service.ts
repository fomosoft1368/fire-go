import {
  Injectable,
  NotFoundException,
  BadRequestException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  CombinedTrip,
  CombinedTripDocument,
  CombinedTripStatus,
} from '../schemas/combined-trip.schema';
import {
  RideRequest,
  RideRequestDocument,
} from '../schemas/ride-request.schema';
import { Driver, DriverDocument } from '../../drivers/schemas/driver.schema';
import { extractLocationHierarchy } from '../../../shared/utils/location.util';

import { PricingService } from '../../pricing/pricing.service';
import { ConfigService } from '../../config/config.service';
import { ServiceType } from '../../config/schemas/driver-search-config.schema';
import { ModuleRef } from '@nestjs/core';
import { AppSettingsService } from '../../app-settings/app-settings.service';

@Injectable()
export class CombinedTripsService implements OnModuleInit {
  private timeoutCheckInterval: NodeJS.Timeout | null = null;
  private pendingTripScannerInterval: NodeJS.Timeout | null = null; // ✅ NEW: Scanner for pending customer trips
  private processingTrips: Set<string> = new Set(); // Track trips being processed

  private pricingService: PricingService;

  constructor(
    @InjectModel(CombinedTrip.name)
    private combinedTripModel: Model<CombinedTripDocument>,
    @InjectModel(RideRequest.name)
    private rideRequestModel: Model<RideRequestDocument>,
    @InjectModel(Driver.name) private driverModel: Model<DriverDocument>,
    private eventEmitter: EventEmitter2,
    private moduleRef: ModuleRef,
    private configService: ConfigService,
    private appSettingsService: AppSettingsService,
  ) {}

  /**
   * Called after all modules are initialized
   */
  onModuleInit() {
    this.pricingService = this.moduleRef.get(PricingService, { strict: false });
    console.log(
      '🚀 CombinedTripsService initialized - starting timeout checker',
    );
    this.startTimeoutChecker();
    console.log(
      '🚀 CombinedTripsService initialized - starting pending trip scanner',
    );
    this.startPendingTripScanner(); // ✅ NEW: Start scanner for pending customer trips
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

    console.log(
      `[recalculateFaresForCombinedTrip] Found ${requests.length} ACTIVE requests for trip ${combinedTripId}`,
    );

    if (!requests.length) {
      console.log(
        '[recalculateFaresForCombinedTrip] ⚠️ No active requests — resetting trip fares to 0',
      );
      await this.combinedTripModel.findOneAndUpdate(
        {
          _id: combinedTripId,
          status: { $ne: 'cancelled' },
        },
        {
          totalFare: 0,
          baseFare: 0,
          distanceFare: 0,
          timeFare: 0,
          surgePricing: 0,
        },
      );
      return;
    }

    // 🚍 CRITICAL: SKIP inter-provincial fixed price requests
    // Chỉ tính lại fare cho distance-based requests
    const dynamicPriceRequests = requests.filter((req) => !req.hasFixedPrice);
    const fixedPriceRequests = requests.filter((req) => req.hasFixedPrice);

    console.log(`[recalculateFaresForCombinedTrip] 📊 Breakdown:`);
    console.log(
      `  → ${dynamicPriceRequests.length} distance-based requests (will recalculate)`,
    );
    console.log(
      `  → ${fixedPriceRequests.length} fixed-price requests (keep original price)`,
    );

    if (fixedPriceRequests.length > 0) {
      fixedPriceRequests.forEach((req) => {
        console.log(
          `    🚍 Fixed price: Request ${req._id} - ${req.fare?.toLocaleString()}đ (${req.seats} ghế)`,
        );
      });
    }

    // 🚍 CRITICAL FIX: Nếu TẤT CẢ requests đều là fixed price → VẪN CẦN recalculate discount!
    // Vì discount phụ thuộc vào TỔNG SỐ NGƯỜI trong xe
    if (dynamicPriceRequests.length === 0) {
      console.log(
        '[recalculateFaresForCombinedTrip] 🚍 ALL requests use fixed price - recalculating discount based on total passengers',
      );

      // Tính tổng số ghế để xác định discount
      const totalSeats = fixedPriceRequests.reduce(
        (sum, req) => sum + (req.seats || 1),
        0,
      );

      // ✅ Lấy discount rate từ pricing config (carpoolDiscounts)
      const pricingConfig = await this.pricingService.getConfig();
      const discountConfig = pricingConfig.carpoolDiscounts.find(
        (d) => d.passengers === totalSeats,
      );
      const discountRate = discountConfig ? discountConfig.discount / 100 : 0;

      console.log(
        `[recalculateFaresForCombinedTrip] 📊 Total seats: ${totalSeats}, Discount: ${Math.round(discountRate * 100)}% (from config)`,
      );

      // Recalculate fare cho TẤT CẢ fixed-price requests với discount mới
      await Promise.all(
        fixedPriceRequests.map(async (req) => {
          const baseFare = req.baseFare || req.fare || 0;
          const newFare = Math.round(baseFare * (1 - discountRate));

          console.log(
            `  → Request ${req._id}: ${baseFare.toLocaleString()}đ → ${newFare.toLocaleString()}đ (${Math.round(discountRate * 100)}% off)`,
          );

          return this.rideRequestModel.findByIdAndUpdate(req._id, {
            fare: newFare,
          });
        }),
      );

      // Update trip totalFare
      const tripTotalFare = await this.rideRequestModel
        .find({
          combinedTripId: new Types.ObjectId(combinedTripId),
          status: { $in: ['accepted', 'arrived_at_pickup', 'in_progress'] },
        })
        .then((reqs) => reqs.reduce((sum, req) => sum + (req.fare || 0), 0));

      // ✅ Only update if trip is not cancelled
      await this.combinedTripModel.findOneAndUpdate(
        {
          _id: combinedTripId,
          status: { $ne: 'cancelled' },
        },
        {
          totalFare: tripTotalFare,
        },
      );

      console.log(
        `[recalculateFaresForCombinedTrip] ✅ Updated ${fixedPriceRequests.length} fixed-price requests. Trip total: ${tripTotalFare.toLocaleString()}đ`,
      );
      return;
    }

    // ✅ Tính TỔNG SỐ GHẾ trong xe (bao gồm CẢ fixed-price requests)
    // Điều này quan trọng để tính discount đúng!
    const totalSeatsFromFixedPrice = fixedPriceRequests.reduce(
      (sum, req) => sum + (req.seats || 1),
      0,
    );
    const totalSeatsFromDynamic = dynamicPriceRequests.reduce(
      (sum, req) => sum + (req.seats || 1),
      0,
    );
    const totalSeatsInTrip = totalSeatsFromFixedPrice + totalSeatsFromDynamic;

    console.log(
      `[recalculateFaresForCombinedTrip] 🎫 Total seats in trip: ${totalSeatsInTrip}`,
    );
    console.log(
      `  → ${totalSeatsFromFixedPrice} ghế (fixed-price) + ${totalSeatsFromDynamic} ghế (distance-based)`,
    );

    // ✅ CHỈ tính lại giá cho distance-based requests
    // Chuẩn bị dữ liệu cho pricing
    // CRITICAL: Phải tạo entry cho MỖI GHẾ, không phải mỗi request
    // Ví dụ: 1 request với 2 ghế → tạo 2 passenger entries
    const passengers = [];

    // 🚍 CRITICAL FIX: Thêm "dummy passengers" cho fixed-price requests
    // Lý do: Pricing service tính discount dựa trên passengers.length
    // Nếu không thêm, pricing service sẽ tính discount SAI!
    // Ví dụ: 2 ghế fixed-price + 1 ghế dynamic = 3 ghế → discount 25%
    // Nếu chỉ đếm 1 ghế dynamic → discount 0% (SAI!)
    for (const req of fixedPriceRequests) {
      const seatsCount = req.seats || 1;
      for (let i = 0; i < seatsCount; i++) {
        passengers.push({
          distance: req.distance || 10, // Dummy distance (không quan trọng, không dùng để tính giá)
          isPeakTime: false,
          peakMultiplier: 1.0,
          vehicleType: 'sedan',
        });
      }
    }

    // Thêm distance-based requests (sẽ dùng để tính giá)
    for (const req of dynamicPriceRequests) {
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

    console.log(
      `[recalculateFaresForCombinedTrip] Calculating price with ${passengers.length} passengers (${totalSeatsFromFixedPrice} dummy + ${totalSeatsFromDynamic} real)`,
    );
    console.log(
      `  → Distance-based requests: ${dynamicPriceRequests.map((r) => `${r.seats || 1} ghế`).join(', ')}`,
    );

    // Tính lại giá CHỈ cho distance-based requests
    const pricingResult = await this.pricingService.calculatePrice({
      passengers,
    });
    const breakdown = pricingResult.breakdown;

    console.log(
      `[recalculateFaresForCombinedTrip] 💡 Discount applied: ${breakdown[0]?.discountApplied || 0}% (based on ${passengers.length} total seats)`,
    );

    // 🚍 NEW: Tính lại fare cho FIXED-PRICE requests với discount MỚI
    // Fixed-price requests CŨNG ĐƯỢC giảm giá khi có thêm người ghép!
    const newDiscountRate = (breakdown[0]?.discountApplied || 0) / 100;

    if (fixedPriceRequests.length > 0) {
      console.log(
        `[recalculateFaresForCombinedTrip] 🚍 Recalculating ${fixedPriceRequests.length} fixed-price requests with NEW discount ${Math.round(newDiscountRate * 100)}%`,
      );

      await Promise.all(
        fixedPriceRequests.map(async (req) => {
          // baseFare = giá gốc TRƯỚC discount
          const baseFare = req.baseFare || req.fare || 0;

          // Áp dụng discount MỚI
          const newFare = Math.round(baseFare * (1 - newDiscountRate));

          console.log(
            `  → Fixed-price Request ${req._id}: baseFare ${baseFare.toLocaleString()}đ → newFare ${newFare.toLocaleString()}đ (discount ${Math.round(newDiscountRate * 100)}%)`,
          );

          return this.rideRequestModel.findByIdAndUpdate(req._id, {
            fare: newFare,
          });
        }),
      );

      console.log(
        `[recalculateFaresForCombinedTrip] ✅ Updated fares for ${fixedPriceRequests.length} fixed-price requests`,
      );
    }

    // ✅ Cập nhật fare CHỈ cho distance-based requests
    // Mỗi request có thể có nhiều ghế, cần lấy tổng giá cho TẤT CẢ ghế của request đó
    // 🚍 CRITICAL: Skip dummy passengers (fixed-price) ở đầu breakdown!
    let passengerIndex = totalSeatsFromFixedPrice; // Bắt đầu từ sau dummy passengers
    await Promise.all(
      dynamicPriceRequests.map(async (req) => {
        const seatsCount = req.seats || 1;
        let totalFareForRequest = 0;

        // Cộng giá của TẤT CẢ ghế thuộc request này
        for (let i = 0; i < seatsCount; i++) {
          const farePerSeat = breakdown[passengerIndex]?.finalPrice || 0;
          totalFareForRequest += farePerSeat;
          passengerIndex++;
        }

        console.log(
          `  → Distance-based Request ${req._id}: ${req.distance}km, ${seatsCount} ghế, tổng: ${totalFareForRequest.toLocaleString()}đ (${(totalFareForRequest / seatsCount).toLocaleString()}đ/ghế)`,
        );
        return this.rideRequestModel.findByIdAndUpdate(req._id, {
          fare: totalFareForRequest,
        });
      }),
    );

    console.log(
      `[recalculateFaresForCombinedTrip] ✅ Updated fares for ${dynamicPriceRequests.length} distance-based requests`,
    );

    // ✅ CRITICAL: Update combinedTrip totalFare = sum of ALL request fares (fixed + dynamic)
    const allUpdatedRequests = await this.rideRequestModel.find({
      combinedTripId: new Types.ObjectId(combinedTripId),
      status: { $in: ['accepted', 'arrived_at_pickup', 'in_progress'] },
    });

    const tripTotalFare = allUpdatedRequests.reduce(
      (sum, req) => sum + (req.fare || 0),
      0,
    );

    // ✅ Only update if trip is not cancelled
    await this.combinedTripModel.findOneAndUpdate(
      {
        _id: combinedTripId,
        status: { $ne: 'cancelled' },
      },
      {
        totalFare: tripTotalFare,
      },
    );

    console.log(
      `[recalculateFaresForCombinedTrip] 💰 Updated trip totalFare: ${tripTotalFare.toLocaleString()}đ (${fixedPriceRequests.length} fixed + ${dynamicPriceRequests.length} dynamic)`,
    );
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
      if (
        isNaN(startLng) ||
        isNaN(startLat) ||
        isNaN(endLng) ||
        isNaN(endLat)
      ) {
        throw new BadRequestException('Invalid coordinates - must be numbers');
      }

      const googleMapsApiKey =
        this.appSettingsService.getSync('GOOGLE_MAPS_API_KEY') ||
        process.env.GOOGLE_MAPS_API_KEY;
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
        throw new BadRequestException(
          `Google Maps API error: ${response.status}`,
        );
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
        console.log(
          `🔍 Found ${data.routes.length} alternative routes, analyzing...`,
        );

        let shortestRoute = data.routes[0];
        let shortestDistance = data.routes[0].legs.reduce(
          (sum: number, leg: any) => sum + leg.distance.value,
          0,
        );

        for (const route of data.routes) {
          const totalDistance = route.legs.reduce(
            (sum: number, leg: any) => sum + leg.distance.value,
            0,
          );
          const totalDuration = route.legs.reduce(
            (sum: number, leg: any) => sum + leg.duration.value,
            0,
          );

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

        console.log(
          `✅ Selected SHORTEST route: ${(shortestDistance / 1000).toFixed(2)}km - ${shortestRoute.summary}`,
        );

        const route = shortestRoute;

        // ✅ Calculate distance and duration from selected route
        const totalDistance = route.legs.reduce(
          (sum: number, leg: any) => sum + leg.distance.value,
          0,
        );
        const totalDuration = route.legs.reduce(
          (sum: number, leg: any) => sum + leg.duration.value,
          0,
        );

        const distanceKm = totalDistance / 1000; // Convert meters to km
        const durationMinutes = Math.ceil(totalDuration / 60); // Convert seconds to minutes

        // Format text
        const distanceText = `${distanceKm.toFixed(1)} km`;
        const durationText =
          `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m`.replace(
            '0h ',
            '',
          );

        console.log('✅ Route found:', {
          distanceKm: distanceKm.toFixed(2),
          durationMinutes,
          distanceText,
          durationText,
          legs: route.legs.length,
        });

        // Decode the polyline
        console.log('📍 Decoding polyline from Google Maps...');
        const decodedCoordinates = this.decodePolyline(
          route.overview_polyline.points,
        );
        console.log(
          '📍 Polyline decoded, coordinates:',
          decodedCoordinates.length,
        );

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
                },
              },
            },
          ],
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
      console.error(
        '❌ Error fetching directions from Google Maps:',
        err.message,
      );
      throw new BadRequestException(
        err.message || 'Failed to fetch directions',
      );
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

    console.log(
      '[decodePolyline] Decoding polyline of length:',
      encoded.length,
    );

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
      console.log(
        '[decodePolyline] Last coordinate:',
        decoded[decoded.length - 1],
      );
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
      { lng: 105.8542, lat: 21.0285, name: 'Hà Nội' }, // North
      { lng: 105.85, lat: 19.8, name: 'Thanh Hóa' },
      { lng: 106.5, lat: 18.0, name: 'Huế' },
      { lng: 107.0, lat: 16.0, name: 'Đà Nẵng' },
      { lng: 109.2, lat: 13.8, name: 'Quy Nhơn' },
      { lng: 108.0, lat: 12.0, name: 'Nha Trang' },
      { lng: 107.5, lat: 10.8, name: 'TP.HCM area' }, // South
    ];

    let coordinates = `${startLng},${startLat}`;

    // Nếu route > 300km, thêm waypoints gần start/end
    if (directDistance > 300) {
      console.log('🛣️ Long distance (>300km) - adding multiple waypoints');

      // Tìm 3-5 waypoints gần nhất trên đường chính
      const relevantWaypoints = this.findRelevantWaypoints(
        startLng,
        startLat,
        endLng,
        endLat,
        vietnamHighwayWaypoints,
        Math.min(5, Math.ceil(directDistance / 200)), // 1 waypoint per 200km
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
        adjustedMidLng,
        midLat,
        vietnamHighwayWaypoints,
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
      .map((wp) => ({
        ...wp,
        // Score based on proximity to route and progression from start to end
        score: this.calculateWaypointScore(
          startLat,
          startLng,
          endLat,
          endLng,
          wp.lat,
          wp.lng,
        ),
      }))
      .sort((a, b) => a.score - b.score)
      .slice(0, maxCount);

    return sorted;
  }

  /**
   * Find nearest waypoint to a given coordinate
   */
  private findNearestWaypoint(lng: number, lat: number, waypoints: any[]): any {
    let nearest = waypoints[0];
    let minDistance = this.calculateHaversineDistance(
      lat,
      lng,
      nearest.lat,
      nearest.lng,
    );

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
    const totalDistance = this.calculateHaversineDistance(
      startLat,
      startLng,
      endLat,
      endLng,
    );
    const distToStart = this.calculateHaversineDistance(
      startLat,
      startLng,
      waypointLat,
      waypointLng,
    );
    const distToEnd = this.calculateHaversineDistance(
      waypointLat,
      waypointLng,
      endLat,
      endLng,
    );

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
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

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
    console.log(
      '⏰ Starting timeout checker - will check expired requests every 5 seconds',
    );

    this.timeoutCheckInterval = setInterval(async () => {
      try {
        const now = new Date();
        const expiredRequests = await this.rideRequestModel.find({
          status: 'pending',
          expiresAt: { $lt: now },
        });

        if (expiredRequests.length > 0) {
          console.log(
            '⏰ [Timeout Checker] Found',
            expiredRequests.length,
            'expired requests',
          );

          for (const expiredReq of expiredRequests) {
            console.log(
              '⏰ Processing expired request:',
              expiredReq._id,
              'for trip:',
              expiredReq.combinedTripId,
            );

            // Find next driver for the trip
            const combinedTripId = expiredReq.combinedTripId?.toString();
            if (combinedTripId) {
              // ✅ PREVENT DUPLICATE PROCESSING - skip if already processing this trip
              if (this.processingTrips.has(combinedTripId)) {
                console.log(
                  '⚠️ [Timeout Checker] Trip',
                  combinedTripId,
                  'already being processed, skipping',
                );
                continue;
              }

              // Mark trip as being processed
              this.processingTrips.add(combinedTripId);
              console.log(
                '🔒 [Timeout Checker] Locked trip',
                combinedTripId,
                'for processing',
              );

              // ✅ MARK AS TIMEOUT with status guard to prevent race condition:
              // Driver may have just accepted while this checker was finding expired requests.
              // Using findOneAndUpdate with status:'pending' ensures we never overwrite 'accepted'→'timeout'.
              const timeoutUpdateResult =
                await this.rideRequestModel.findOneAndUpdate(
                  { _id: expiredReq._id, status: 'pending' },
                  { status: 'timeout', updatedAt: new Date() },
                  { new: true },
                );

              if (!timeoutUpdateResult) {
                // Request was already accepted/rejected by the driver — do NOT override
                this.processingTrips.delete(combinedTripId);
                console.log(
                  '⚠️ [Timeout Checker] Request already handled (accepted/rejected), skipping:',
                  expiredReq._id,
                );
                continue;
              }

              console.log(
                '⏰ [Timeout Checker] Marked request as TIMEOUT (not deleted):',
                expiredReq._id,
              );
              console.log(
                '📝 [Timeout Checker] This driver will be EXCLUDED from next search',
              );

              const trip =
                await this.combinedTripModel.findById(combinedTripId);
              if (trip && trip.status === 'pending') {
                const pickupCoordinates = trip.pickupLocation?.coordinates as [
                  number,
                  number,
                ];
                if (pickupCoordinates) {
                  // ✅ ALWAYS delay 15 seconds from when request expired before finding next driver
                  const expiredAt = expiredReq.expiresAt.getTime();
                  const targetTime = expiredAt + 3000; // 3s delay (was 15s - reduced to send next driver faster)
                  const delayNeeded = targetTime - now.getTime();

                  if (delayNeeded > 0) {
                    console.log(
                      `⏰ [Timeout Checker] Request expired at ${expiredReq.expiresAt.toISOString()}`,
                    );
                    console.log(
                      `⏰ [Timeout Checker] Will find next driver in ${delayNeeded}ms (15s from expiry)`,
                    );
                    setTimeout(async () => {
                      // ✅ CRITICAL FIX: Re-check trip status when timeout executes (not just when scheduling)
                      // Customer may have cancelled during the 15s delay
                      const tripRecheck =
                        await this.combinedTripModel.findById(combinedTripId);
                      if (!tripRecheck || tripRecheck.status !== 'pending') {
                        console.log(
                          '⚠️ [Timeout Checker] Trip no longer pending (cancelled/completed), skipping driver search',
                        );
                        this.processingTrips.delete(combinedTripId);
                        console.log(
                          '🔓 [Timeout Checker] Unlocked trip',
                          combinedTripId,
                        );
                        return;
                      }

                      console.log(
                        '🔄 [Timeout Checker] 15 seconds passed, finding next driver for trip:',
                        combinedTripId,
                      );
                      this.findAndNotifyDrivers(
                        combinedTripId,
                        pickupCoordinates,
                      )
                        .catch((err) => {
                          console.error('❌ Error finding next driver:', err);
                        })
                        .finally(() => {
                          // Release lock after processing
                          this.processingTrips.delete(combinedTripId);
                          console.log(
                            '🔓 [Timeout Checker] Unlocked trip',
                            combinedTripId,
                          );
                        });
                    }, delayNeeded);
                  } else {
                    // Already more than 15s since expiry (shouldn't happen with 5s interval)
                    console.log(
                      '🔄 [Timeout Checker] Finding next driver immediately (>15s since expiry)',
                    );
                    this.findAndNotifyDrivers(combinedTripId, pickupCoordinates)
                      .catch((err) => {
                        console.error('❌ Error finding next driver:', err);
                      })
                      .finally(() => {
                        // Release lock after processing
                        this.processingTrips.delete(combinedTripId);
                        console.log(
                          '🔓 [Timeout Checker] Unlocked trip',
                          combinedTripId,
                        );
                      });
                  }
                } else {
                  // No coordinates, release lock
                  this.processingTrips.delete(combinedTripId);
                }
              } else {
                // Trip no longer pending, release lock
                this.processingTrips.delete(combinedTripId);
                console.log(
                  '🔓 [Timeout Checker] Trip not pending, unlocked',
                  combinedTripId,
                );
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
   * ✅ NEW: Start interval to scan pending customer-created trips and re-trigger driver search
   * Runs every 30 seconds to catch newly available drivers
   */
  private startPendingTripScanner() {
    console.log(
      '🔄 Starting pending trip scanner - will scan every 30 seconds',
    );

    this.pendingTripScannerInterval = setInterval(async () => {
      try {
        const now = new Date();

        // Find all pending trips created by customers that haven't expired yet
        const pendingTrips = await this.combinedTripModel.find({
          status: 'pending',
          createdBy: 'customer',
          $or: [
            { expiresAt: { $gte: now } }, // Not expired yet
            { expiresAt: { $exists: false } }, // No expiry set (fallback)
          ],
        });

        if (pendingTrips.length > 0) {
          console.log(
            `🔄 [Pending Trip Scanner] Found ${pendingTrips.length} pending customer trips`,
          );

          for (const trip of pendingTrips) {
            const tripId = (trip as any)._id.toString();

            // Skip if already being processed
            if (this.processingTrips.has(tripId)) {
              console.log(
                `⚠️ [Pending Trip Scanner] Trip ${tripId} already being processed, skipping`,
              );
              continue;
            }

            // Check if trip has any pending ride requests
            const pendingRequests = await this.rideRequestModel.countDocuments({
              combinedTripId: (trip as any)._id,
              status: 'pending',
            });

            // Only re-scan if there are NO pending requests (means all previous requests were timeout/rejected)
            if (pendingRequests === 0) {
              console.log(
                `🔄 [Pending Trip Scanner] Trip ${tripId} has no pending requests - re-scanning for available drivers`,
              );

              const pickupCoordinates = trip.pickupLocation?.coordinates as [
                number,
                number,
              ];
              if (pickupCoordinates) {
                // Re-trigger driver search
                this.findAndNotifyDrivers(tripId, pickupCoordinates).catch(
                  (err) => {
                    console.error(
                      `❌ [Pending Trip Scanner] Error finding drivers for trip ${tripId}:`,
                      err,
                    );
                  },
                );
              } else {
                console.warn(
                  `⚠️ [Pending Trip Scanner] Trip ${tripId} has no pickup coordinates`,
                );
              }
            } else {
              console.log(
                `⏳ [Pending Trip Scanner] Trip ${tripId} has ${pendingRequests} pending requests - waiting for driver response`,
              );
            }
          }
        } else {
          console.log(
            '🔄 [Pending Trip Scanner] No pending customer trips found',
          );
        }
      } catch (error) {
        console.error('❌ Error in pending trip scanner:', error);
      }
    }, 30000); // Scan every 30 seconds
  }

  /**
   * Stop the timeout checker (for cleanup)
   */
  onModuleDestroy() {
    if (this.timeoutCheckInterval) {
      clearInterval(this.timeoutCheckInterval);
      console.log('⏰ Timeout checker stopped');
    }
    if (this.pendingTripScannerInterval) {
      clearInterval(this.pendingTripScannerInterval);
      console.log('🔄 Pending trip scanner stopped');
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
        .populate(
          'driverId',
          'firstName lastName avatar rating averageRating totalReviews vehicleModel vehiclePlate vehicleType',
        )
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
      const searchRadius =
        maxDistance ??
        (await this.configService.getSearchRadius(ServiceType.RIDESHARE));

      // Build query with both geospatial filter AND address filter
      const query: any = {
        status: {
          $in: [CombinedTripStatus.PENDING, CombinedTripStatus.ACCEPTED],
        },
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
        .populate(
          'driverId',
          'firstName lastName avatar rating averageRating totalReviews vehicleModel vehiclePlate vehicleType',
        )
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
          // ✅ Include currentLocation so DriverFoundScreen can display driver on map
          select:
            'firstName lastName avatar rating averageRating totalReviews vehicleModel vehiclePlate vehicleType vehicleColor phone currentLocation',
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
        console.error(
          '[CombinedTripsService] ❌ Trip not found in database:',
          combinedTripId,
        );
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
        console.error(
          '❌ Failed to convert combinedTripId to ObjectId:',
          combinedTripId,
          e,
        );
        tripIdObj = new Types.ObjectId(combinedTripId);
      }

      const requests = (await this.rideRequestModel
        .find({ combinedTripId: tripIdObj })
        .populate('customerId', 'name phone rating firstName lastName avatar')
        .exec()) as any[];

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
            pickupAddress:
              customerRequest?.pickupAddress || trip.pickupAddress || '',
            dropoffAddress:
              customerRequest?.dropoffAddress || trip.dropoffAddress || '',
            pickupCoordinates:
              customerRequest?.pickupCoordinates ||
              trip.pickupLocation?.coordinates ||
              [],
            dropoffCoordinates:
              customerRequest?.dropoffCoordinates ||
              trip.dropoffLocation?.coordinates ||
              [],
            distance: customerRequest?.distance || trip.distance || 0,
            fare: customerRequest?.fare || trip.totalFare || 0,
            status: customerRequest?.status || 'pending',
            requestId: customerRequest?._id?.toString(),
          };
        });
      } else if (trip.customerId && trip.customerId.length > 0) {
        // ✅ FALLBACK: Use trip.customerId only if no RideRequests found

        const isPopulated =
          trip.customerId[0] &&
          typeof trip.customerId[0] === 'object' &&
          trip.customerId[0]._id;

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
        bookedSeats:
          (tripObject.totalSeats || 4) - (tripObject.availableSeats || 4),
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
      // ✅ CRITICAL: Cannot change status of cancelled trip
      const existingTrip =
        await this.combinedTripModel.findById(combinedTripId);
      if (
        existingTrip?.status === 'cancelled' &&
        status !== CombinedTripStatus.CANCELLED
      ) {
        console.error(
          '❌ Cannot change status of cancelled trip:',
          combinedTripId,
        );
        throw new BadRequestException(
          'Cannot change status of a cancelled trip',
        );
      }

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
      const alreadyExists = trip.customerId?.some(
        (c) => c._id?.toString() === customerIdObj.toString(),
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
  async acceptCombinedTrip(
    combinedTripId: string,
    driverId: string,
  ): Promise<CombinedTrip> {
    try {
      const timestamp = new Date().toISOString();
      console.log(
        '═══════════════════════════════════════════════════════════',
      );
      console.log('🚗 [CombinedTripsService] DRIVER ACCEPTING TRIP');
      console.log(
        '═══════════════════════════════════════════════════════════',
      );
      console.log('⏰ Timestamp:', timestamp);
      console.log('🆔 Trip ID:', combinedTripId);
      console.log('👤 Driver ID:', driverId);
      console.log(
        '═══════════════════════════════════════════════════════════',
      );

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

      // ✅ CRITICAL: Check if trip is cancelled - do NOT accept
      if (trip.status === CombinedTripStatus.CANCELLED) {
        console.error('❌ Trip is CANCELLED - cannot accept');
        throw new BadRequestException('Chuyến đi đã bị hủy');
      }

      if (trip.status !== CombinedTripStatus.PENDING) {
        console.error(
          '❌ Trip not available for acceptance. Status:',
          trip.status,
        );
        throw new BadRequestException(
          `Combined trip is not available for acceptance. Current status: ${trip.status}`,
        );
      }

      if (trip.driverId) {
        console.error('❌ Trip already accepted by driver:', trip.driverId);
        throw new BadRequestException(
          'Combined trip has already been accepted by another driver',
        );
      }

      console.log('✅ Trip is available - updating to ACCEPTED...');

      // ✅ Use atomic update with status check to prevent race conditions
      const updatedTrip = await this.combinedTripModel
        .findOneAndUpdate(
          {
            _id: combinedTripId,
            status: CombinedTripStatus.PENDING, // Only update if still pending
            driverId: { $exists: false }, // And no driver assigned yet
          },
          {
            driverId: new Types.ObjectId(driverId),
            status: CombinedTripStatus.ACCEPTED,
            acceptedAt: new Date(),
          },
          { new: true },
        )
        .populate(
          'driverId',
          'firstName lastName avatar rating averageRating totalReviews vehicleModel vehiclePlate vehicleType',
        )
        .populate('customerId', 'firstName lastName phone avatar')
        .exec();

      if (!updatedTrip) {
        console.error('❌ Failed to update trip');
        throw new NotFoundException('Failed to update combined trip');
      }

      console.log(
        '═══════════════════════════════════════════════════════════',
      );
      console.log('✅✅✅ TRIP ACCEPTED SUCCESSFULLY ✅✅✅');
      console.log(
        '═══════════════════════════════════════════════════════════',
      );
      console.log('🆔 Trip ID:', updatedTrip._id);
      console.log(
        '👤 Driver:',
        updatedTrip.driverId
          ? `${(updatedTrip.driverId as any).firstName} ${(updatedTrip.driverId as any).lastName}`
          : 'Unknown',
      );
      console.log('📍 Pickup:', updatedTrip.pickupAddress);
      console.log('📍 Dropoff:', updatedTrip.dropoffAddress);
      console.log('💰 Fare:', updatedTrip.baseFare);
      console.log('⏰ Accepted at:', updatedTrip.acceptedAt);
      console.log('🔔 Status changed from PENDING → ACCEPTED');
      console.log(
        '═══════════════════════════════════════════════════════════',
      );

      return updatedTrip;
    } catch (error) {
      console.error(
        '[CombinedTripsService] Error accepting combined trip:',
        error,
      );
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
        ...data,
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
        baseFare: data.totalFare || 0,
        totalFare: data.totalFare || 0,
        // ✅ Tính số ghế theo loại xe khách chọn
        // sedan: 4 ghế, suv: 6 ghế, premium (cả hai): 6 ghế (tối đa)
        ...((): { totalSeats: number; availableSeats: number } => {
          const types: string[] = data.driverVehicleTypes || ['sedan'];
          const hasSuv = types.includes('suv');
          const maxSeats = hasSuv ? 6 : 4;
          const requestedSeats = Number(data.seats) || 1;
          const availableSeats = Math.max(0, maxSeats - requestedSeats);
          return { totalSeats: maxSeats, availableSeats };
        })(),

        customerId: data.customerId ? [data.customerId] : [],
        status: CombinedTripStatus.PENDING,
        requestedAt: new Date(),
        createdBy: 'customer',
        driverQueue: [],
        currentDriverIndex: 0,
        // ✅ Lưu loại xe khách chọn để filter tài xế phù hợp
        vehicleType: data.vehicleType || 'basic', // 'basic'/'comfort'/'premium'
        driverVehicleTypes: data.driverVehicleTypes || ['sedan'], // ['sedan']/['suv']/['sedan','suv']
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
  async findAndNotifyDrivers(
    combinedTripId: string,
    pickupCoordinates: [number, number],
  ): Promise<void> {
    try {
      const callId = Date.now();
      const stack = new Error().stack;
      console.log('');
      console.log(
        '═══════════════════════════════════════════════════════════',
      );
      console.log('🆔 [findAndNotifyDrivers] CALL ID:', callId);
      console.log('🔍 [findAndNotifyDrivers] Trip:', combinedTripId);
      console.log('📍 Pickup coordinates:', pickupCoordinates);
      console.log(
        '📞 Called from:',
        stack?.split('\n')[2]?.trim() || 'unknown',
      );
      console.log(
        '═══════════════════════════════════════════════════════════',
      );
      console.log('');

      // Get the combined trip to get customerId
      const combinedTrip =
        await this.combinedTripModel.findById(combinedTripId);
      if (!combinedTrip) {
        throw new NotFoundException(
          `Combined trip not found: ${combinedTripId}`,
        );
      }

      // ✅ CRITICAL: Check if trip is cancelled - do NOT send to drivers
      if (combinedTrip.status === 'cancelled') {
        console.log(
          '⚠️ [findAndNotifyDrivers] Trip is CANCELLED - skipping driver search',
        );
        console.log('🚫 Cancelled at:', combinedTrip.cancelledAt);
        return; // Early return - trip was cancelled
      }

      // ⭐ CRITICAL FIX: If trip is driver-created, skip finding drivers (driver already assigned)
      if (combinedTrip.createdBy === 'driver') {
        console.log(
          '⚠️ [findAndNotifyDrivers] Trip created by DRIVER - skipping driver search (driver already assigned)',
        );
        console.log('🚗 Assigned driver:', combinedTrip.driverId);
        return; // Early return - no need to find drivers
      }

      // Only for customer-created trips, we need to find drivers
      const customerId =
        combinedTrip.customerId && combinedTrip.customerId[0]
          ? combinedTrip.customerId[0]
          : null;
      if (!customerId) {
        console.warn(
          '⚠️ [findAndNotifyDrivers] No customer ID found for trip:',
          combinedTripId,
        );
        console.warn(
          '⚠️ Possible reason: customer cancelled or was removed. Trip details:',
          {
            createdBy: combinedTrip.createdBy,
            status: combinedTrip.status,
            customerIds: combinedTrip.customerId?.length || 0,
          },
        );
        // ✅ Do NOT throw here — this runs inside a setTimeout and throwing would
        // become an unhandledPromiseRejection → Node.js process crash (Node 24+)
        return; // Stop gracefully
      }

      // Get list of drivers who already have active (accepted/in_progress) trips
      const activeTrips = await this.combinedTripModel.find({
        driverId: { $exists: true, $ne: null },
        status: { $in: ['accepted', 'in_progress'] },
      });
      const busyDriverIds = activeTrips
        .map((trip) => trip.driverId?.toString())
        .filter(Boolean);
      console.log(
        '[findAndNotifyDrivers] Busy drivers (accepted/in_progress):',
        busyDriverIds.length,
      );

      // ✅ FIX: Get list of drivers who already have a PENDING RideRequest from ANY other customer
      // This prevents the same driver from receiving 2 requests simultaneously
      const now = new Date();
      const pendingRequests = await this.rideRequestModel
        .find({
          status: 'pending',
          expiresAt: { $gt: now }, // Only non-expired pending requests
        })
        .select('driverId');
      const pendingDriverIds = pendingRequests
        .map((req) => req.driverId?.toString())
        .filter(Boolean);
      console.log(
        '[findAndNotifyDrivers] Drivers with pending requests (cannot receive new):',
        pendingDriverIds.length,
      );

      // Get list of drivers who already REJECTED or TIMED OUT for THIS trip (last 30 min)
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      const rejectedRequests = await this.rideRequestModel.find({
        combinedTripId: new Types.ObjectId(combinedTripId),
        status: { $in: ['rejected', 'timeout'] },
        createdAt: { $gte: thirtyMinutesAgo },
      });
      const rejectedDriverIds = rejectedRequests
        .map((req) => req.driverId?.toString())
        .filter(Boolean);
      console.log(
        '[findAndNotifyDrivers] Rejected/timeout drivers for this trip:',
        rejectedDriverIds.length,
      );

      // Combine ALL exclusion lists: busy + pending + rejected drivers
      const excludedDriverIds = [
        ...new Set([
          ...busyDriverIds,
          ...pendingDriverIds,
          ...rejectedDriverIds,
        ]),
      ];

      // Get search radius from config
      const searchRadiusMeters = await this.configService.getSearchRadius(
        ServiceType.RIDESHARE,
      );
      const searchRadiusKm = (searchRadiusMeters / 1000).toFixed(1);
      const searchRadiusForSphere = searchRadiusMeters / 1000 / 6378.1;

      // ✅ Đọc driverVehicleTypes từ trip để filter đúng loại xe
      // basic→['sedan'], comfort→['suv'], premium→['sedan','suv']
      const tripObj = combinedTrip.toObject
        ? combinedTrip.toObject()
        : combinedTrip;
      const driverVehicleTypes: string[] =
        tripObj.driverVehicleTypes && tripObj.driverVehicleTypes.length > 0
          ? tripObj.driverVehicleTypes
          : ['sedan']; // fallback nếu không có (trip cũ trước khi deploy)
      console.log(
        `[findAndNotifyDrivers] 🚗 driverVehicleTypes từ DB: ${JSON.stringify(tripObj.driverVehicleTypes)}`,
      );
      console.log(
        `[findAndNotifyDrivers] 🚗 Sẽ filter tài xế theo vehicleType: ${JSON.stringify(driverVehicleTypes)} (loại xe khách: ${tripObj.vehicleType || 'không có'})`,
      );

      // Find available RIDESHARE drivers within configured radius
      const drivers = await this.driverModel
        .find({
          _id: { $nin: excludedDriverIds.map((id) => new Types.ObjectId(id)) },
          $or: [{ status: 'online' }, { isOnline: true }],
          driverTypes: { $in: ['rideshare'] },
          vehicleType: { $in: driverVehicleTypes }, // ✅ Filter theo loại xe khách chọn
          currentLocation: {
            $geoWithin: {
              $centerSphere: [pickupCoordinates, searchRadiusForSphere],
            },
          },
        })
        .sort({ priorityScore: -1, averageRating: -1 })
        .limit(10);

      console.log(
        `[findAndNotifyDrivers] ✅ Found RIDESHARE drivers (${driverVehicleTypes.join('/')}) within ${searchRadiusKm}km:`,
        drivers.length,
      );

      if (drivers.length === 0) {
        console.warn(
          `[findAndNotifyDrivers] ⚠️ No RIDESHARE drivers found within ${searchRadiusKm}km - retrying in 5s`,
        );
        // Retry after 5 seconds (reduced from 30s for faster response)
        setTimeout(async () => {
          const trip = await this.combinedTripModel.findById(combinedTripId);
          if (!trip || trip.status !== 'pending') {
            console.log(
              '[findAndNotifyDrivers] [Retry] Trip no longer pending, skipping driver search',
            );
            return;
          }
          console.log('[findAndNotifyDrivers] 🔄 Retrying driver search...');
          await this.findAndNotifyDrivers(combinedTripId, pickupCoordinates);
        }, 5000); // ✅ Retry after 5 seconds (was 30s)
        return;
      }

      // For customer-created trips: Only send to ONE driver at a time (no queue)
      // Pick the closest driver
      const targetDriver = drivers[0];

      console.log('');
      console.log(
        '═══════════════════════════════════════════════════════════',
      );
      console.log('📬 [findAndNotifyDrivers] CREATING RIDE REQUEST');
      console.log(
        '═══════════════════════════════════════════════════════════',
      );
      console.log(
        '📬 Sending notification to closest driver:',
        targetDriver._id,
      );
      console.log(
        '📬 Driver name:',
        `${targetDriver.firstName} ${targetDriver.lastName}`,
      );
      console.log('📬 Trip ID:', combinedTripId);
      console.log('📬 Customer ID:', customerId);
      console.log(
        '📬 🎯 THIS IS THE ONLY DRIVER WHO WILL RECEIVE THIS REQUEST',
      );
      console.log(
        '═══════════════════════════════════════════════════════════',
      );
      console.log('');

      // Update trip with current driver being notified (NOT a queue)
      // sửa lại để chỉ có 1 tài xế được thông báo
      // ✅ CRITICAL: Only update if trip is still pending (not cancelled)
      const updateResult = await this.combinedTripModel.findOneAndUpdate(
        {
          _id: combinedTripId,
          status: { $ne: 'cancelled' }, // Only update if NOT cancelled
        },
        {
          currentDriverId: targetDriver._id,
          notificationSentAt: new Date(),
        },
        { new: true },
      );

      if (!updateResult) {
        console.log(
          '⚠️ [findAndNotifyDrivers] Trip was cancelled or no longer exists - aborting driver notification',
        );
        console.log(
          '🚫 NOT creating ride request for driver:',
          targetDriver._id,
        );
        return; // Early return - trip was cancelled
      }

      // Create ride request for this driver with complete trip details
      // Get timeout from config (RIDESHARE service) — fallback to 45s if config missing/zero
      const timeoutMsRaw = await this.configService.getRequestTimeout(
        ServiceType.RIDESHARE,
      );
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
        fare: combinedTrip.totalFare || combinedTrip.baseFare || 0, // ✅ FIX: use totalFare (baseFare doesn't exist)
        // ✅ FIX: seats = number of seats the customer BOOKED = totalSeats - availableSeats
        // NOT availableSeats (which is the remaining free seats)
        seats: (combinedTrip.totalSeats || 4) - (combinedTrip.availableSeats ?? (combinedTrip.totalSeats || 4)),
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
      console.log(
        '═══════════════════════════════════════════════════════════',
      );
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
  async handleDriverTimeout(
    combinedTripId: string,
    rideRequestId: string,
  ): Promise<void> {
    try {
      console.log(
        '⏰ [CombinedTripsService] Checking driver timeout for trip:',
        combinedTripId,
      );

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
      const pickupCoordinates = trip.pickupLocation?.coordinates as [
        number,
        number,
      ];

      if (!pickupCoordinates) {
        console.error('❌ No pickup coordinates found');
        return;
      }

      // Get list of busy drivers (already have active trips)
      const activeTrips = await this.combinedTripModel.find({
        driverId: { $exists: true, $ne: null },
        status: { $in: ['pending', 'accepted', 'in_progress'] },
      });
      const busyDriverIds = activeTrips
        .map((trip) => trip.driverId?.toString())
        .filter(Boolean);

      // ✅ CRITICAL FIX: Get ALL drivers who recently rejected/timeout for THIS trip
      // Only exclude drivers with requests from last 30 minutes (not old expired ones)
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      const allRejectedRequests = await this.rideRequestModel.find({
        combinedTripId: new Types.ObjectId(combinedTripId),
        status: 'rejected',
        createdAt: { $gte: thirtyMinutesAgo }, // ✅ Only from last 30 minutes
      });
      const allRejectedDriverIds = allRejectedRequests
        .map((req) => req.driverId?.toString())
        .filter(Boolean);
      console.log(
        '📊 All recently rejected drivers (last 30 min):',
        allRejectedDriverIds.length,
        allRejectedDriverIds,
      );

      // Combine all exclusion lists: busy drivers + ALL rejected drivers (not just current one)
      const excludedDriverIds = [...busyDriverIds, ...allRejectedDriverIds];
      console.log(
        '📊 Total excluded drivers (busy + all rejected):',
        excludedDriverIds.length,
      );

      // Find another driver (excluding busy drivers and the one who timed out)
      // ✅ NGHIỆP VỤ: Chỉ tìm driver ONLINE + có loại RIDESHARE
      const drivers = await this.driverModel
        .find({
          _id: { $nin: excludedDriverIds.map((id) => new Types.ObjectId(id)) }, // ✅ Exclude busy + rejected drivers
          $or: [{ status: 'online' }, { isOnline: true }], // ✅ Check both status fields
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
        })
        .limit(1); // Get only the closest driver

      if (drivers.length === 0) {
        console.warn('⚠️ No other available drivers found - will retry in 30s');
        // Retry after 30 seconds
        setTimeout(async () => {
          // ✅ CRITICAL FIX: Re-check trip status when retry executes
          // Customer may have cancelled during the 30s delay
          const tripCheck =
            await this.combinedTripModel.findById(combinedTripId);
          if (!tripCheck || tripCheck.status !== 'pending') {
            console.log(
              '⚠️ [Retry] Trip no longer pending (cancelled/completed), skipping driver search',
            );
            return;
          }
          console.log('🔄 Retrying driver search after timeout...');
          await this.findAndNotifyDrivers(combinedTripId, pickupCoordinates);
        }, 30000);
        return;
      }

      const nextDriver = drivers[0];
      console.log('📬 Sending notification to next driver:', nextDriver._id);

      // Update trip with new current driver
      // ✅ CRITICAL: Only update if trip is still pending (not cancelled)
      const updateResult = await this.combinedTripModel.findOneAndUpdate(
        {
          _id: combinedTripId,
          status: { $ne: 'cancelled' }, // Only update if NOT cancelled
        },
        {
          currentDriverId: nextDriver._id,
          notificationSentAt: new Date(),
        },
        { new: true },
      );

      if (!updateResult) {
        console.log(
          '⚠️ [Retry] Trip was cancelled or no longer exists - aborting driver notification',
        );
        console.log('🚫 NOT creating ride request for driver:', nextDriver._id);
        return; // Early return - trip was cancelled
      }

      // Get customerId from trip
      const customerId =
        trip.customerId && trip.customerId[0] ? trip.customerId[0] : null;

      // Get timeout from config (RIDESHARE service)
      const timeoutMs = await this.configService.getRequestTimeout(
        ServiceType.RIDESHARE,
      );

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
        fare: trip.totalFare || trip.baseFare || 0, // ✅ FIX: use totalFare
        // ✅ FIX: seats = number of seats the customer BOOKED = totalSeats - availableSeats
        seats: (trip.totalSeats || 4) - (trip.availableSeats ?? (trip.totalSeats || 4)),
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

      // ✅ CRITICAL: Check if trip is already cancelled
      const existingTrip = await this.combinedTripModel.findById(tripIdObj);
      if (existingTrip?.status === 'cancelled') {
        // ✅ BLOCK ALL updates to cancelled trips (except re-confirming cancellation)
        const isCancellationUpdate =
          updateData.status === 'cancelled' ||
          updateData.cancelledAt ||
          updateData.cancellationBy;

        if (!isCancellationUpdate) {
          console.error('❌ Cannot update cancelled trip:', tripId);
          console.error('❌ Attempted update:', Object.keys(updateData));
          throw new BadRequestException(
            'Cannot update a cancelled trip. Trip was cancelled and is immutable.',
          );
        }
      }

      const updatedTrip = await this.combinedTripModel.findByIdAndUpdate(
        tripIdObj,
        { $set: updateData }, // Use $set to ensure fields are updated
        { new: true },
      );

      console.log('✅ Trip updated:', {
        tripId,
        updatedFields: Object.keys(updateData),
        newStatus: updatedTrip?.status,
      });

      return updatedTrip;
    } catch (error) {
      console.error('❌ Error updating trip:', error);
      throw error;
    }
  }
}
