# Assignment Request Modal - Debugging Guide

## Problem Statement
Modal hiện ra nhưng báo lỗi "không tìm thấy yêu cầu" (request not found).

## What I Fixed

### 1. **Mobile Driver - Polling Service** ✅
Enhanced error logging to see exact error responses from backend:
- Logs HTTP status codes
- Logs full response body if endpoint returns error
- Validates requests are objects (not errors)
- Detailed logging for each endpoint

**File**: [mobile-driver/src/services/assignmentRequestPollingService.ts](mobile-driver/src/services/assignmentRequestPollingService.ts)

### 2. **Mobile Driver - Modal Component** ✅  
Fixed React hooks violation and added error recovery:
- Moved all hooks to top of component (React rule)
- Added try-catch with fallback data in useMemo
- Flexible data extraction with multiple fallbacks
- Removed overly-strict render checks

**File**: [mobile-driver/src/components/AssignmentRequestModal.tsx](mobile-driver/src/components/AssignmentRequestModal.tsx)

### 3. **Backend - Combined Trips Controller** ✅
Added validation and detailed logging:
- Validates driver ID format (ObjectId)
- Logs all steps: validation → expired → active requests
- Returns array always (empty if no requests)
- Better error handling

**File**: [backend/src/modules/combined-trips/controllers/combined-trips.controller.ts](backend/src/modules/combined-trips/controllers/combined-trips.controller.ts)

## Deployment Steps

### Step 1: Stop and Rebuild Backend
```bash
cd backend
npm run build        # Already done ✅
```

### Step 2: Restart Backend
```bash
cd backend
npm run start:dev    # or npm start
```

Wait for logs to show:
```
[NestFactory] Starting Nest application...
[InstanceLoader] TypeOrmModule dependencies initialized
[RoutesResolver] CombinedTripsController {/api/combined-trips}:
GET /api/combined-trips/driver/:driverId/pending-requests
```

### Step 3: Rebuild & Restart Mobile Driver
```bash
cd mobile-driver
npm run dev          # or npx expo start
```

## Testing Workflow

### Test 1: Verify Polling Logs
1. Open **Expo logs** (press `i` or `a` for iOS/Android after `npm run dev`)
2. Look for these logs indicating polling is active:
```
✅ Including combined-trips endpoint (driverId: xxx)
```

3. If you see:
```
⚠️  NO driverId provided - SKIPPING combined-trips endpoint!
```
→ Problem: Redux auth not loaded properly

### Test 2: Create Combined Trip Request
1. **Backend Terminal**: Watch for logs:
```
[CombinedTripsController] 🔍 Getting pending requests for driver: xxx
[CombinedTripsController] ✅ Found N active pending requests
```

2. **Mobile Driver Logs**: Watch for:
```
[AssignmentPolling] Combined trip requests: N
[AssignmentPolling] 🔔 Found N pending request(s)
[App] 🔔 Assignment request received: {...}
```

3. **Modal**: Should appear with request data

### Test 3: Error Debugging
If you see error logs, check:

#### Error: `❌ Invalid driver ID format`
- Problem: driverId is null or not a valid MongoDB ObjectId
- Check: Is Redux auth loading correctly?
  ```javascript
  // In App.js logs should show:
  [App] 📱 Driver ID for polling: <valid-id-hex-string>
  ```

#### Error: `Combined-trips endpoint returned 404`
- Problem: Route not found
- Check: Backend is running and built
  ```bash
  curl http://192.168.1.16:3000/api/combined-trips/driver/xxx/pending-requests
  ```

#### Error: `Combined-trips endpoint returned 500`
- Problem: Backend crashed
- Check: Backend logs for error details
- Restart backend with: `npm run start:dev`

#### Empty array but polling says "Found 0 requests"
- Not an error!
- Means: No pending requests for this driver
- This is normal when no combined trip has been created

### Test 4: Status Code Checks
```bash
# On your development machine:
curl -H "Authorization: Bearer <token>" \
  http://192.168.1.16:3000/api/combined-trips/driver/<driverId>/pending-requests

# Should return:
# - 200: Array of requests (may be empty [])
# - 400: Invalid driver ID
# - 401: Missing or invalid token
# - 500: Server error (check backend logs)
```

## Log Locations

### Mobile Driver - Expo Logs
- **Android**: `npx expo start` → press `a` → Check terminal output
- **iOS**: `npx expo start` → press `i` → Check Xcode console or terminal

### Backend Logs
- Run with: `npm run start:dev` in backend directory
- Look for `[CombinedTripsController]` prefixed logs

### Key Log Markers
```
✅ = Success
❌ = Error/Critical
⚠️  = Warning
📍 = Information
🔍 = Searching
🔔 = Found/Notification
```

## Common Issues & Solutions

### Issue: Modal shows but no data
**Cause**: Request object missing required fields
**Solution**: 
- Check Expo logs for: `[useMemo] Full request object:`
- Verify all fields present: `_id`, `type`, `pickupAddress`, etc.

### Issue: Modal appears for 1 second then disappears
**Cause**: Request expires or timing issue
**Solution**:
- Modal gets request
- Checks if expired (expiresAt < now)
- Auto-rejects if already expired
- Check backend logs: "Auto-rejecting expired request"

### Issue: "không tìm thấy yêu cầu" error message
**Cause**: Request data structure mismatch
**Solution**:
- Modal receives error object instead of request
- Check polling service logs for: `Invalid request object`
- Verify backend returns array of requests, not error

### Issue: Driver ID shows as `undefined`
**Cause**: Redux state not populated
**Solution**:
- Check auth login completed
- Verify user object has `id` or `_id` field
- Look for: `[App] 📱 Driver ID for polling: undefined`
- Solution: Re-login to refresh Redux state

## Backend Endpoint Details

### Route
```
GET /api/combined-trips/driver/:driverId/pending-requests
Authorization: Bearer <token>
```

### Response (200 OK)
```json
[
  {
    "_id": "...",
    "type": "rideshare",
    "driverId": "...",
    "combinedTripId": {
      "_id": "...",
      "pickupLocation": { "coordinates": [lng, lat] },
      ...
    },
    "customerId": {
      "_id": "...",
      "firstName": "...",
      "lastName": "...",
      "rating": 5.0
    },
    "status": "pending",
    "expiresAt": "2026-02-23T10:15:45.000Z",
    "createdAt": "2026-02-23T10:15:00.000Z"
  }
]
```

### Response (400 Bad Request)
```json
{
  "statusCode": 400,
  "message": "Invalid driver ID format: not-a-valid-id",
  "error": "Bad Request"
}
```

## Next Steps After Debugging

1. **If modal still doesn't appear**:
   - Check browser dev tools: Network tab → GET /api/combined-trips/driver/.../pending-requests
   - Is response 200? What's the body?
   - Is request being sent at all?

2. **If modal appears but shows wrong data**:
   - Check field mapping in modal component
   - Verify API response structure matches expectations
   - Check if nested fields are being extracted correctly

3. **If everything works**:
   - ✅ Combined trips modal fully functional!
   - Test accept/reject flows
   - Test countdown timer
   - Test cross-screen visibility

## Performance Notes

- Polling runs every **1 second**
- Each poll calls **3 endpoints**: rides, deliveries, combined-trips
- **Bandwidth**: ~3KB per second (~180KB/min, ~10MB/hour)
- Consider reducing frequency if battery drain is high
- Current cache strategy: None (real-time polling)

## Architecture Reminder

```
Customer App
    ↓
Creates Combined Trip → Backend API
    ↓
Backend: 
  - Create RideRequest
  - Emit event
  - Find matching drivers
  - Send notification
    ↓
Driver App (Polling every 1s):
  - GET /rides/assignment-requests/pending
  - GET /deliveries/assignment-requests/pending
  - GET /combined-trips/driver/{id}/pending-requests ← KEY
    ↓
Convert to unified format → Call App.js callback
    ↓
App.js: setState(assignmentRequest, showModal=true, countdown=45)
    ↓
Modal renders globally (visible on all screens)
    ↓
Driver accepts or rejects
```

---

Good luck! Check the logs first. 🚀
