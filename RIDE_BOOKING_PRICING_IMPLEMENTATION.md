# Ride Booking Pricing System - Implementation Complete

## Overview
Implemented complete ride booking system with real-time fare calculation, driver discovery, and price breakdown for the fire-go ride-sharing platform.

## Backend Implementation

### 1. Pricing DTOs (`backend/src/modules/rides/dto/pricing.dto.ts`)
Created comprehensive type definitions for pricing operations:
- **CreatePricingDto**: Admin configuration for vehicle types (basic/comfort/premium)
  - baseFare, pricePerKm, pricePerMinute
  - peakHourSurge, rainyDaySurge, minimumFare
- **CalculateFareDto**: Parameters for fare calculation
  - distance, duration, vehicleType, isPeakHour, isRainy
- **FindDriversDto**: Parameters for driver search
  - latitude, longitude, radius, vehicleType, limit
- **FareBreakdown**: Response structure with detailed breakdown

### 2. Pricing Schema (`backend/src/modules/rides/schemas/pricing.schema.ts`)
MongoDB schema for storing vehicle type pricing configurations:
```typescript
{
  vehicleType: 'basic' | 'comfort' | 'premium',
  baseFare: number,           // Opening fare (VND)
  pricePerKm: number,         // Distance charge (VND/km)
  pricePerMinute: number,     // Time charge (VND/minute)
  peakHourSurge: number,      // Peak hour surcharge (%)
  rainyDaySurge: number,      // Rain surcharge (%)
  minimumFare: number,        // Minimum charge (VND)
  isActive: boolean
}
```

### 3. Rides Service Methods

#### `calculateFare(distance, duration, vehicleType, isPeakHour, isRainy)`
Calculates total fare with breakdown:
- Base fare + distance charge + time charge
- Applies surge pricing for peak hours and rainy weather
- Enforces minimum fare if configured
- Returns detailed breakdown for UI display

#### `getPricing(vehicleType)`
Retrieves active pricing configuration for specified vehicle type

#### `findNearbyDrivers(latitude, longitude, radius, vehicleType, limit)`
Geospatial search for available drivers:
- Uses MongoDB $geoNear aggregation for efficient distance calculation
- Filters by online status and vehicle type
- Returns driver info with distance in kilometers
- Limited to specified radius and result count

### 4. API Endpoints (`backend/src/modules/rides/rides.controller.ts`)

#### POST `/api/rides/calculate-fare`
Calculate fare for a potential trip
```javascript
{
  distance: number,        // km
  duration: number,        // seconds
  vehicleType: string,     // 'basic', 'comfort', 'premium'
  isPeakHour?: boolean,
  isRainy?: boolean
}
```
Response includes baseFare, distanceFare, timeFare, surgeFare, totalFare, and details

#### GET `/api/rides/find-drivers`
Find available drivers near pickup location
```
?latitude=21.0285&longitude=105.8542&radius=5&vehicleType=basic&limit=10
```
Returns array of drivers with name, rating, car type, distance

#### GET `/api/rides/pricing/:vehicleType`
Get pricing configuration for vehicle type
Returns current pricing rates for displaying to customer

## Mobile Customer Implementation

### 1. Updated Services

#### rideService (`mobile-customer/src/services/rideService.ts`)
New methods added:
- **getDirections(startLng, startLat, endLng, endLat)**: Call OSRM API for route distance/duration
- **calculateFare(distance, duration, vehicleType, isPeakHour, isRainy)**: Call backend fare calculation
- **findNearbyDrivers(lat, lng, radius, vehicleType, limit)**: Search for available drivers
- **getPricing(vehicleType)**: Get pricing configuration

#### authService (`mobile-customer/src/services/authService.ts`)
Added **getUserId()** method to retrieve current user ID for ride creation

### 2. New Screen: RideBookingScreen

**Location**: `mobile-customer/src/screens/RideBookingScreen.tsx`

Features:
- **Location Display**: Shows pickup and dropoff addresses with icons
- **Trip Info**: Displays distance and estimated duration
- **Vehicle Type Selection**: Three options (Basic, Comfort, Premium) with visual indicators
- **Real-time Fare Calculation**: Updates when vehicle type changes
- **Fare Breakdown**: Detailed breakdown showing:
  - Base fare
  - Distance charge
  - Time charge
  - Surge pricing (if applicable)
  - Total fare
- **Driver Discovery**: Modal showing nearby available drivers with:
  - Driver name and rating
  - Car type and distance
  - Sorted by proximity
- **Booking**: Creates ride with selected vehicle type and fares

Navigation flow:
```
HomeScreen → Calculate route → Navigate to RideBookingScreen
           → Show fare & vehicle options → Find drivers
           → Book ride → RideTrackingScreen
```

### 3. Updated HomeScreen

Modified `handleFindRide()` function:
1. Validates pickup/dropoff locations
2. Calls getDirections() to calculate distance and duration
3. Navigates to RideBookingScreen with route parameters
4. Displays loading state during calculation

### 4. Navigation Configuration

Updated `App.tsx`:
- Imported RideBookingScreen
- Added RideBookingScreen to Stack navigator
- Route params include:
  - distance, duration (from OSRM)
  - pickup/dropoff coordinates and addresses
  - vehicleType, rideType selection capability

Updated `types/index.ts`:
- Added RideBooking route params to RootStackParamList
- Added RideTracking route for post-booking tracking

## Integration Points

### Module Setup
- **rides.module.ts**: Registered Pricing schema with Mongoose
- **RidesService**: Injected Pricing model for database queries
- **RidesController**: Added three new endpoints for pricing operations

### Data Flow
1. User enters pickup/dropoff in HomeScreen
2. Gets route details from OSRM (distance, duration)
3. Navigates to RideBookingScreen with route info
4. System calls calculateFare() for selected vehicle type
5. User views drivers via findNearbyDrivers()
6. Creates ride with calculated fares and driver selection
7. Transitions to tracking screen

## Pricing Formula

```javascript
subtotal = baseFare + (distance × pricePerKm) + (duration × pricePerMinute)

surgeFare = 0
if (isPeakHour) surgeFare += subtotal × (peakHourSurge / 100)
if (isRainy) surgeFare += subtotal × (rainyDaySurge / 100)

totalFare = subtotal + surgeFare
if (minimumFare && totalFare < minimumFare) totalFare = minimumFare
```

## Database Requirements

### Indexes Needed
- `drivers.location`: 2dsphere index for geospatial queries
- `pricings.vehicleType`: Index for fast pricing lookups
- `pricings.isActive`: Index for filtering active prices

### Initial Data
Default pricing configurations should be created:
```javascript
db.pricings.insertMany([
  {
    vehicleType: 'basic',
    baseFare: 10000,
    pricePerKm: 5000,
    pricePerMinute: 500,
    peakHourSurge: 30,
    rainyDaySurge: 20,
    minimumFare: 20000,
    isActive: true
  },
  {
    vehicleType: 'comfort',
    baseFare: 15000,
    pricePerKm: 7000,
    pricePerMinute: 600,
    peakHourSurge: 30,
    rainyDaySurge: 20,
    minimumFare: 30000,
    isActive: true
  },
  {
    vehicleType: 'premium',
    baseFare: 25000,
    pricePerKm: 10000,
    pricePerMinute: 800,
    peakHourSurge: 25,
    rainyDaySurge: 15,
    minimumFare: 50000,
    isActive: true
  }
])
```

## Features Ready for Next Phase

✅ **Completed:**
- Fare calculation engine with surge pricing
- Vehicle type-based pricing tiers
- Geospatial driver discovery
- Real-time fare breakdown display
- Multi-screen booking flow
- Route calculation integration

🔄 **Ready for Implementation:**
- Driver assignment algorithm
- Socket.io real-time driver location tracking
- Ride status updates (pending → accepted → in_transit → completed)
- Payment integration with calculated fare
- Trip history with fares
- Ride rating and review system

## Code Quality

✅ All TypeScript errors resolved
✅ Proper type definitions for all DTOs
✅ Error handling on all API calls
✅ Loading states during async operations
✅ User-friendly error messages
✅ Consistent with existing code style

## Testing Checklist

- [ ] Create sample pricing records in MongoDB
- [ ] Test fare calculation with different vehicle types
- [ ] Verify geospatial search returns nearby drivers
- [ ] Test HomeScreen → RideBookingScreen navigation
- [ ] Verify fare updates when changing vehicle type
- [ ] Test ride creation with all fare components
- [ ] Verify driver list updates correctly
- [ ] Test error cases (no drivers, invalid coordinates)
- [ ] Check performance with many drivers in database
- [ ] Verify currency formatting in UI (VND)

## Files Modified

### Backend
- `src/modules/rides/dto/pricing.dto.ts` (NEW)
- `src/modules/rides/schemas/pricing.schema.ts` (NEW)
- `src/modules/rides/rides.service.ts` (UPDATED)
- `src/modules/rides/rides.module.ts` (UPDATED)
- `src/modules/rides/rides.controller.ts` (UPDATED)

### Mobile Customer
- `src/services/rideService.ts` (UPDATED)
- `src/services/authService.ts` (UPDATED)
- `src/screens/RideBookingScreen.tsx` (NEW)
- `src/screens/HomeScreen.tsx` (UPDATED)
- `src/screens/index.ts` (UPDATED)
- `src/App.tsx` (UPDATED)
- `src/types/index.ts` (UPDATED)
