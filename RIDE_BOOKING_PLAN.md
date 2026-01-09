# RIDE BOOKING SYSTEM - Implementation Plan

## BACKEND CHANGES NEEDED

### 1. Add Pricing Configuration Endpoint
- GET /api/rides/pricing/:vehicleType - Get pricing config for vehicle type
- POST /api/rides/pricing - Create/Update pricing (admin only)
- Include: baseFare, pricePerKm, pricePerMinute, surgePricing, minimumFare

### 2. Calculate Price API
- POST /api/rides/calculate-fare
- Input: distance, duration, vehicleType, isPeakHour, isRainy
- Formula: totalFare = baseFare + (distance * pricePerKm) + (duration * pricePerMinute) + surgePricing
- Output: breakdown of all costs

### 3. Find Nearby Drivers API
- GET /api/rides/find-drivers?lat=X&lng=Y&radius=5&vehicleType=sedan
- Find online drivers within radius
- Sort by distance (nearest first)
- Filter by vehicle type
- Return: driver list with current location, rating, distance

### 4. Update Ride Schema
- Add: estimatedPickupTime, estimatedDropoffTime, driverLocation (GeoJSON)
- Add: routeCoordinates (array of [lng,lat] for polyline)
- Add: priceBreakdown object

## MOBILE CHANGES NEEDED

### 1. HomeScreen.tsx
- Get user's current GPS location
- Show pickup location automatically
- Calculate fare in real-time as user picks destination
- Show fare breakdown before booking
- Show estimated driver arrival time

### 2. New Screen: RideBookingScreen.tsx
- Map with pickup/dropoff markers
- Route polyline visualization
- Ride details card: fare, distance, duration
- Available nearby drivers list (with avatars, ratings)
- "Book Ride" button

### 3. New Screen: FindingRideScreen.tsx (Already exists as FindingRideModal)
- Show searching animation
- Show auto-assigned driver when found
- Show driver's current location moving toward pickup
- Update driver location in real-time
- Show estimated arrival time (counting down)

### 4. New Screen: RideTrackingScreen.tsx
- Map with driver location and customer location
- Route polyline updated in real-time
- Driver marker animates as it moves
- Order status: finding → assigned → driver coming → arrived → in progress → completed
- Driver info card: name, rating, car, license plate

### 5. Update rideService.ts
- calculateFare(distance, duration, vehicleType, isPeakHour, isRainy)
- findNearbyDrivers(lat, lng, radius, vehicleType)
- trackRideRealtime(rideId) - WebSocket or polling
- getEstimatedPickupTime(driverLat, driverLng, pickupLat, pickupLng)

## REAL-TIME UPDATES (Socket.io)

### Events to emit:
1. 'driver_location_updated' - Driver location change
2. 'ride_status_changed' - Status updates (pending → accepted → in_progress → completed)
3. 'estimated_time_updated' - ETA changes
4. 'driver_found' - Auto-assigned driver info

### Events to listen:
- Same as above

## DATA FLOW

1. User enters pickup (auto) + dropoff (manual)
2. System calls calculateFare() → shows breakdown
3. User clicks "Book Ride"
4. System calls createRide() + immediately findNearbyDrivers()
5. Auto-assign nearest available driver
6. Emit 'driver_found' event
7. Start real-time location tracking
8. Show driver moving to pickup point
9. Driver arrives → status changes to 'in_progress'
10. Show route during ride
11. Complete → show rating screen

## PRICING FORMULA

```
baseFare = 10,000 VND (mở cửa)
pricePerKm = 10,000 VND/km
pricePerMinute = 500 VND/phút
peakHourSurge = 20% (giờ cao điểm 6-9h, 17-20h)
rainyDaySurge = 15% (mưa)
minimumFare = 20,000 VND

totalFare = baseFare 
          + (distance * pricePerKm) 
          + (duration * pricePerMinute) 
          + surgePricing 
          + min(totalBeforeSurge, minimumFare)
```

## LOCATION VALIDATION

- Check if coordinates are within Vietnam
- Validate lat/lng are numbers
- Check distance >= 1 km (minimum)
- Check if pickup != dropoff
- Geohash or grid-based validation (optional)

## DRIVER MATCHING LOGIC

```
WHERE:
  status = 'online' 
  AND vehicleType = requested_type
  AND distance_from_pickup <= radius (5km)
  AND is_available = true
  
SORT BY:
  1. distance ASC (nearest first)
  2. rating DESC (best rated)
  
ASSIGN:
  - First driver in sorted list
  - If no response in 30s, try next
  - If no drivers, tell user "No drivers available"
```

## TODO

- [ ] Backend: Pricing schema & API
- [ ] Backend: Calculate fare API  
- [ ] Backend: Find nearby drivers API with geospatial query
- [ ] Backend: Estimated time API (call OSRM)
- [ ] Backend: Ride tracking with Socket.io
- [ ] Mobile: Update HomeScreen with fare calculation
- [ ] Mobile: Create RideBookingScreen
- [ ] Mobile: Update FindingRideModal
- [ ] Mobile: Create RideTrackingScreen  
- [ ] Mobile: Update rideService with all methods
- [ ] Mobile: Real-time location tracking
- [ ] Mobile: WebSocket connection for live updates
