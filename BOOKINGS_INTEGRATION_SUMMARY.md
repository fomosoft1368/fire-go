# BookingsScreen Integration - HIRE + SHARE Rides ✅

## Overview
Updated BookingsScreen to fetch and display both HIRE rides (traditional rides) and SHARE rides (combined-trips/ghép xe) in unified history view.

## Changes Made

### 1. **Types Update** ✅
**File:** `mobile-customer/src/types/index.ts`

**Changes:**
```typescript
// Updated RideBooking interface
export interface RideBooking {
  // ... existing fields
  rideType: 'standard' | 'comfort' | 'xl' | 'hire' | 'share'  // Added 'hire' and 'share'
  status: ... | 'accepted' | 'arrived_at_pickup'  // Added trip statuses
  pickupDistrict?: string  // New field
  dropoffDistrict?: string  // New field
  combinedTripId?: string  // New field - track combined trip ID for navigation
}

// Added DriverFoundScreen to navigation
export type RootStackParamList = {
  // ... existing
  DriverFoundScreen: { rideId?: string; combinedTripId?: string; tripType?: 'ride' | 'combined_trip' }
}
```

### 2. **Backend - Combined Trips Controller** ✅
**File:** `backend/src/modules/combined-trips/controllers/combined-trips.controller.ts`

**New Endpoint:**
```typescript
/**
 * GET /combined-trips/customer/:customerId
 * Get all combined trips (history) for a specific customer
 */
@Get('customer/:customerId')
async getCustomerTrips(@Param('customerId') customerId: string)
// Returns: Combined trips where customer is in customerId array
// Populated with: driverId (firstName, lastName, phone, avatar, rating, vehicleModel, vehicleColor, vehiclePlate, currentLocation)
```

### 3. **Backend - Combined Trips Service** ✅
**File:** `backend/src/modules/combined-trips/services/combined-trips.service.ts`

**New Method:**
```typescript
getCombinedTripsModel(): Model<CombinedTripDocument> {
  return this.combinedTripModel;
}
```
- Allows controller to directly query combined trips by customer

### 4. **Frontend - CombinedTripsService** ✅
**File:** `mobile-customer/src/services/combinedTripsService.ts`

**New Method:**
```typescript
async getCustomerTrips(customerId: string) {
  // GET /api/combined-trips/customer/:customerId
  // Returns: Array of combined trips with driver data populated
}
```

### 5. **Frontend - BookingsScreen** ✅
**File:** `mobile-customer/src/screens/BookingsScreen.tsx`

**Key Changes:**

#### Data Fetching
```typescript
const [rideHistory, combinedTrips] = await Promise.all([
  rideService.getRideHistory(userId),      // HIRE rides
  combinedTripsService.getCustomerTrips(userId),  // SHARE rides
])
```

#### Data Formatting
```typescript
// Format combined trips to RideBooking structure
const formattedCombinedTrips = combinedTrips.map((trip) => ({
  id: trip._id,
  rideType: 'share',  // Mark as share ride
  estimatedFare: trip.totalFare,
  bookingTime: new Date(trip.createdAt).toLocaleString('vi-VN'),
  pickupLocation: trip.pickupLocationAddress,
  dropoffLocation: trip.dropoffLocationAddress,
  status: trip.status.toLowerCase(),  // pending, accepted, in_progress, completed
  driverName: trip.driverId.firstName + ' ' + trip.driverId.lastName,
  carPlate: trip.driverId.vehiclePlate,
  combinedTripId: trip._id,  // Store for navigation
}))
```

#### Merging & Sorting
```typescript
const allBookings = [...rideHistory, ...formattedCombinedTrips]
allBookings.sort((a, b) => new Date(b.bookingTime) - new Date(a.bookingTime))
```

#### Navigation Handler
```typescript
const handleViewDetail = (booking: RideBooking) => {
  if (booking.rideType === 'share' && booking.combinedTripId) {
    // Navigate to DriverFoundScreen for live tracking
    navigation.navigate('DriverFoundScreen', {
      combinedTripId: booking.combinedTripId,
    })
  } else {
    // HIRE rides - show alert (can be extended)
    Alert.alert('Chi tiết', `Chuyến đi ${booking.id}`)
  }
}
```

#### UI Updates
- **Detail Button**: Added for all combined trips (share rides)
- **Button Styling**: Green accent (53d22d) with border
- **Conditional Rendering**: Different buttons based on ride type and status

## Data Flow

```
BookingsScreen
  ↓
fetchRideHistory()
  ├─ getRideHistory(userId) → HIRE rides
  │   └─ Format as RideBooking with rideType='hire'
  └─ getCustomerTrips(userId) → SHARE rides
      ├─ GET /combined-trips/customer/:customerId
      ├─ Format as RideBooking with rideType='share'
      ├─ Add combinedTripId for navigation
      └─ Populate driver info
  ↓
Merge & Sort (newest first)
  ↓
Display in list:
  - Filter by type (All, Hire, Share)
  - Show trip details
  - Add action buttons
  ↓
User clicks "Chi tiết" (Detail)
  ├─ If Share → Navigate to DriverFoundScreen with combinedTripId
  │   └─ Real-time tracking of ride
  └─ If Hire → Show alert (future implementation)
```

## Status Handling

**Combined Trip Status Values:**
```
pending → "Chuyến đi mới"
accepted → "Tài xế đang đến"
arrived_at_pickup → "Tài xế đã đến"
in_progress → "Bắt đầu chuyến đi"
completed → "Hoàn thành"
cancelled → "Đã hủy"
```

## UI Features

### Filter Tabs
- **Tất cả**: Show both HIRE and SHARE rides
- **Ghép xe**: Show only SHARE rides
- **Lái xe hộ**: Show only HIRE rides

### Booking Card Sections
1. **Header**: Ride type, status badge, fare amount
2. **Route Timeline**: Pickup → Dropoff visualization
3. **Footer with Action Buttons**:
   - **Share Rides** (completed): Stars + Detail button + Rebook
   - **Share Rides** (ongoing): Detail button only
   - **Hire Rides** (completed): Rate driver button
   - **Hire Rides** (ongoing): No footer actions

### Detail Button
- **Styling**: Green accent with border
- **Action**: Navigate to DriverFoundScreen for combined trips
- **Icon**: Info icon with green color

## Error Handling

```typescript
// Graceful fallback if either fetch fails
const [rideHistory, combinedTrips] = await Promise.all([
  rideService.getRideHistory(userId).catch(() => []),
  combinedTripsService.getCustomerTrips(userId).catch(() => []),
])

// Shows error alert if both are empty
if (allBookings.length === 0) {
  Alert.alert('Thông báo', 'Không có chuyến đi nào')
}
```

## Testing Checklist

- [ ] BookingsScreen loads both HIRE and SHARE rides
- [ ] Filter tabs work correctly (All, Hire, Share)
- [ ] Rides sorted by newest first (by bookingTime)
- [ ] Detail button appears on combined trips
- [ ] Click detail → Navigate to DriverFoundScreen
- [ ] DriverFoundScreen displays trip with real-time location
- [ ] Status-based UI rendering (stars, buttons, rating modal)
- [ ] Error handling when no rides exist
- [ ] Error handling when fetch fails

## Integration Points

**Frontend:**
- `combinedTripsService.getCustomerTrips(customerId)` → GET endpoint
- `navigation.navigate('DriverFoundScreen', { combinedTripId })` → Navigate to live tracking

**Backend:**
- `GET /api/combined-trips/customer/:customerId` → Fetch customer's combined trips
- Returns: Combined trips with populated driver data

**Type Safety:**
- Updated `RideBooking` interface supports all ride types
- Added `combinedTripId` field for tracking
- Updated `RootStackParamList` with `DriverFoundScreen` navigation

## Future Enhancements

1. **HIRE Ride Details**: Create detail screen for traditional rides
2. **Rating System**: Submit ratings for drivers after completed rides
3. **Rebook Function**: Quick rebook with previous route
4. **Trip Replay**: Replay completed trip on map
5. **Cancellation**: Cancel ongoing rides from history screen
6. **Advanced Filtering**: Filter by date range, distance, fare range

---

**Status:** ✅ **COMPLETE**
All HIRE and SHARE rides now display in unified BookingsScreen with navigation to real-time tracking for combined trips.
