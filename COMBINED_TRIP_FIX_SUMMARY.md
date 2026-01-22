# Combined Trip Detail Endpoint Fix - Summary

## Problem
ActiveRideScreen was unable to display customer details (name, pickup/dropoff addresses) for combined trips because the backend endpoint was returning the enriched customer data in the wrong field name.

## Root Cause
The `enrichCombinedTripWithCustomers()` method in `combined-trips.service.ts` was returning the enriched customer data under the field name `enrichedCustomers`, but the frontend expected it under `customerId` (to match the rides endpoint structure).

### Backend Data Structure Mismatch
```typescript
// BEFORE (WRONG)
return {
  ...trip.toObject(),
  enrichedCustomers,  // ❌ Frontend expects 'customerId'
}

// AFTER (CORRECT)
return {
  ...trip.toObject(),
  customerId: enrichedCustomers,  // ✅ Matches rides endpoint
}
```

## Solution
Changed [combined-trips.service.ts](backend/src/modules/combined-trips/services/combined-trips.service.ts#L182) line 182 to return enriched customers under the `customerId` field instead of `enrichedCustomers`.

## Verification

### Backend Endpoints - Both Now Return Same Structure
1. **GET `/rides/driver/:id`** (Line: [rides.controller.ts:407](backend/src/modules/rides/rides.controller.ts#L407))
   - Calls: `findByIdForDriver()`
   - Returns: `{ ..., customerId: [{name, phone, pickupAddress, dropoffAddress, status, ...}], ... }`

2. **GET `/combined-trips/:id`** (Line: [combined-trips.controller.ts:164](backend/src/modules/combined-trips/controllers/combined-trips.controller.ts#L164))
   - Calls: `getCombinedTripDetail()`
   - Returns: `{ ..., customerId: [{name, phone, pickupAddress, dropoffAddress, status, ...}], ... }` ✅ FIXED

### Frontend Data Flow - ActiveRideScreen
1. **Route Detection** (Line: [ActiveRideScreen.tsx:57-62](mobile-driver/src/screens/ActiveRideScreen.tsx#L57))
   ```typescript
   const combinedTripId = route?.params?.combinedTripId
   const sourceType = route?.params?.sourceType // 'ride' or 'combined_trip'
   const currentPassenger = ride?.customerId?.[currentPassengerIndex]
   ```

2. **Endpoint Selection** (Line: [ActiveRideScreen.tsx:384-388](mobile-driver/src/screens/ActiveRideScreen.tsx#L384))
   ```typescript
   if (sourceType === 'combined_trip' || combinedTripId) {
     endpoint = `${API_BASE_URL}/combined-trips/${combinedTripId || tripId}`
   } else {
     endpoint = `${API_BASE_URL}/rides/driver/${rideId || tripId}`
   }
   ```

3. **Data Usage** (Lines used in render):
   - Customer name: Line [1176](mobile-driver/src/screens/ActiveRideScreen.tsx#L1176) `{currentPassenger.name}`
   - Pickup address: Line [951](mobile-driver/src/screens/ActiveRideScreen.tsx#L951) `{currentPassenger.pickupAddress}`
   - Dropoff address: Line [978](mobile-driver/src/screens/ActiveRideScreen.tsx#L978) `{currentPassenger.dropoffAddress}`
   - Status-based buttons: Line [1071](mobile-driver/src/screens/ActiveRideScreen.tsx#L1071) `currentPassenger.status`

## Data Fields Returned

The `customerId` array now properly contains:
```typescript
{
  _id: ObjectId,
  name: string,                           // Customer name
  phone: string,                          // Customer phone
  rating: number,                         // Customer rating
  firstName: string,
  lastName: string,
  avatar: string,
  pickupAddress: string,                  // ✅ From RideRequest or trip default
  dropoffAddress: string,                 // ✅ From RideRequest or trip default
  pickupCoordinates: [number, number],    // ✅ For MapView rendering
  dropoffCoordinates: [number, number],   // ✅ For MapView rendering
  distance: number,                       // Trip distance
  fare: number,                           // Passenger fare
  status: string,                         // 'pending' | 'accepted' | 'arrived_at_pickup' | 'in_progress' | 'completed' | 'cancelled'
  requestId: string,                      // RideRequest._id for backend references
}
```

## Testing Checklist

After deploying the fix, verify:

1. ✅ Driver creates a combined trip
2. ✅ Customer requests to join the trip
3. ✅ Driver accepts the request → navigates to RideRequestsScreen
4. ✅ Driver clicks "Start journey" → navigates to ActiveRideScreen
5. ✅ **Customer name displays** (was showing "Khách hàng" fallback before)
6. ✅ **Pickup address displays** (was showing "N/A" before)
7. ✅ **Dropoff address displays** (was showing "N/A" before)
8. ✅ **Action buttons visible** based on status:
   - "Đã đến đón khách" button shows when status === 'pending'
   - "Thả khách" button shows when status === 'arrived_at_pickup' or 'in_progress'
9. ✅ Map displays passenger pickup/dropoff coordinates correctly
10. ✅ Status updates reflect in real-time as driver progresses through journey

## Files Modified

- [backend/src/modules/combined-trips/services/combined-trips.service.ts](backend/src/modules/combined-trips/services/combined-trips.service.ts#L182) - Line 182

## Related Code References

**Service Methods That Enrich Customer Data:**
- [rides.service.ts - enrichRideWithCustomers()](backend/src/modules/rides/rides.service.ts#L221) - Reference pattern
- [combined-trips.service.ts - enrichCombinedTripWithCustomers()](backend/src/modules/combined-trips/services/combined-trips.service.ts#L124) - Fixed implementation

**Controller Endpoints:**
- [rides.controller.ts - findByIdForDriver()](backend/src/modules/rides/rides.controller.ts#L407)
- [combined-trips.controller.ts - getCombinedTripDetail()](backend/src/modules/combined-trips/controllers/combined-trips.controller.ts#L164)

**Frontend Usage:**
- [ActiveRideScreen.tsx - fetchRideDetail()](mobile-driver/src/screens/ActiveRideScreen.tsx#L374) - Handles endpoint routing and data fetching
- [ActiveRideScreen.tsx - currentPassenger](mobile-driver/src/screens/ActiveRideScreen.tsx#L58) - Uses enriched customer data in render
