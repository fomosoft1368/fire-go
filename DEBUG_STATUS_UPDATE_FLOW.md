# Debug: Combined Trip Status Update Flow

## Overview
We're debugging why DriverFoundScreen (Customer view) doesn't show updated status after driver starts journey.

## Expected Flow

### 1. Driver Accepts Trip
- **ActiveRideScreen** doesn't accept trip (different flow)
- **RideRequestsScreen** accepts via endpoint: `PATCH /combined-trips/{id}/requests/{requestId}/accept`
- Backend updates:
  - RideRequest.status → "accepted" ✅
  - CombinedTrip.status → "accepted" ✅ (via updateCombinedTripStatus)

### 2. Driver Starts Journey  
- **ActiveRideScreen** → "Bắt đầu chuyến" button
- Calls: `PATCH /combined-trips/{combinedTripId}/requests/{requestId}/start-journey`
- Backend updates:
  - RideRequest.status → "in_progress" ✅
  - CombinedTrip.status → "in_progress" ✅ (via updateCombinedTripStatus)
  - Logs: "[CombinedTripsController] ✅ Journey started - Request and Trip updated"

### 3. Customer Polls for Updates
- **DriverFoundScreen** polls every 2 seconds
- Calls: `GET /combined-trips/{combinedTripId}`
- Service: combinedTripsService.getCombinedTripDetail()
  - Fetches from API with auth token
  - Receives CombinedTrip object with current status
  - Returns trip data to screen

### 4. Screen Re-renders
- DriverFoundScreen receives updated tripData with status = "in_progress"
- getStatusLabel() converts "in_progress" → "Bắt đầu chuyến đi"
- StatusBadge shows updated status

## Logging Added

### Backend Service (combined-trips.service.ts)

#### getCombinedTripDetail()
```
[CombinedTripsService] getCombinedTripDetail called for: {id}
[CombinedTripsService] Trip found from DB with status: {status, updatedAt}
[CombinedTripsService] Returning enriched trip with status: {status}
```

#### enrichCombinedTripWithCustomers()
```
✅ Enriched trip data returned to API: {
  _id, 
  status, 
  statusType,
  tripObjectStatus,
  driverId,
  updatedAt
}
```

#### updateCombinedTripStatus()
```
[CombinedTripsService] 🔄 updateCombinedTripStatus called: {combinedTripId, newStatus}
[CombinedTripsService] ✅ Trip status updated successfully: {
  tripId,
  oldStatus,
  newStatus, 
  updatedAt
}
```

### Backend Controller (combined-trips.controller.ts)

#### GET /:combinedTripId
```
[CombinedTripsController] GET combined trip detail: {combinedTripId}
[CombinedTripsController] 📤 Returning trip from GET endpoint: {_id, status, customersCount}
```

#### PATCH /:combinedTripId/requests/:requestId/start-journey
```
[CombinedTripsController] Starting journey: {combinedTripId, requestId}
[CombinedTripsController] ✅ Journey started - Request and Trip updated: {requestStatus, tripId}
```

### Frontend Service (mobile-customer/src/services/combinedTripsService.ts)

#### getCombinedTripDetail()
```
[CombinedTripsService] Getting combined trip detail: {combinedTripId}
[CombinedTripsService] ✅ Token found, adding to headers
OR
[CombinedTripsService] ⚠️ No auth token found
[CombinedTripsService] 🌐 Fetching from: {API_URL}
[CombinedTripsService] 📥 API Response status: {statusCode}
[CombinedTripsService] ✅ Combined trip detail received: {
  id,
  status,
  statusType,
  hasDriverId,
  customersCount
}
```

### Frontend Screen (mobile-customer/src/screens/DriverFoundScreen.tsx)

#### loadTripDetails()
```
[DriverFoundScreen] Trip updated - Full data: {
  _id,
  status,
  statusFromAPI,
  pickupLocation,
  dropoffLocation,
  driverId,
  allData (full JSON)
}
[DriverFoundScreen] ⚠️ Status value type: {typeof, value}
```

#### Render
```
[DriverFoundScreen] 🔄 Rendering with status: {
  tripStatus,
  statusLabel,
  tripData_status,
  tripData_id,
  tripDataKeys (all keys in object),
  fullTripData (JSON)
}
```

## What to Look For in Logs

1. **Driver starts journey successfully?**
   - Should see: `[CombinedTripsController] ✅ Journey started`
   - Should see: `[CombinedTripsService] ✅ Trip status updated successfully`

2. **Status updated in database?**
   - Should see: `newStatus: 'in_progress'`

3. **GET endpoint fetched after update?**
   - Should see: `[CombinedTripsController] GET combined trip detail`
   - Within 2 seconds of start-journey call

4. **API returned updated status?**
   - Should see: `status: 'in_progress'` in "Combined trip detail received"
   - Check statusType is 'string' not object

5. **Screen received updated data?**
   - Should see: `[DriverFoundScreen] Trip updated - Full data` with status = "in_progress"
   - Should see render with statusLabel = "Bắt đầu chuyến đi"

## Potential Issues & Solutions

| Issue | Symptom | Solution |
|-------|---------|----------|
| Token not sent | "⚠️ No auth token found" | Check AsyncStorage key is 'authToken' |
| API returns old data | status still "accepted" | Check database actually persisted status |
| Polling not triggered | No GET requests every 2s | Check pollingInterval ref and cleanup |
| Status not updated in DB | newStatus logged but DB unchanged | Check updateCombinedTripStatus execution |
| Response not parsed | statusType is object | Check API returns valid JSON |
| Status lost in enrichment | status field missing in response | Check tripObject spread includes status |

## Test Scenario

1. Start both driver and customer apps
2. Driver creates combined trip
3. Customer joins combined trip
4. Driver accepts request (should see status → "accepted")
5. Driver clicks "Bắt đầu chuyến" 
6. **Monitor logs** - trace status through the flow
7. Customer should see "Bắt đầu chuyến đi" within 2 seconds

## Files Modified

- `backend/src/modules/combined-trips/services/combined-trips.service.ts` - Added detailed logging
- `backend/src/modules/combined-trips/controllers/combined-trips.controller.ts` - Added response logging
- `mobile-customer/src/services/combinedTripsService.ts` - Added token and response logging
- `mobile-customer/src/screens/DriverFoundScreen.tsx` - Already has detailed logging

