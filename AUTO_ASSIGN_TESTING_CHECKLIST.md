# ✅ AUTO-ASSIGN TESTING CHECKLIST

## Pre-Test Setup

### Backend
- [ ] Backend server running: `cd backend && npm run start:dev`
- [ ] MongoDB running and accessible
- [ ] No compile errors in terminal
- [ ] Logs showing: `[NestApplication] Nest application successfully started`

### Database
- [ ] Check drivers collection has `currentLocation` field
```bash
mongo
use fire_go
db.drivers.find({ status: 'online' }).pretty()
```
Expected: At least 2 drivers with `currentLocation.coordinates: [lng, lat]`

- [ ] Check assignmentrequests collection exists
```bash
db.assignmentrequests.find().pretty()
```

### Mobile Driver App
- [ ] App compiled successfully
- [ ] No TypeScript errors
- [ ] 2+ driver accounts created
- [ ] Both drivers can login successfully

### Mobile Customer App  
- [ ] HireDriverScreen has auto-assign checkbox
- [ ] Checkbox is visible and working
- [ ] Customer account ready

---

## Test Suite 1: Basic Flow

### Test 1.1: Driver Accept (Happy Path)
**Setup:**
- Driver A: Logged in, Online, Location: (10.762622, 106.660172)
- Driver B: Logged in, Online, Location: (10.782622, 106.680172)
- Customer: Logged in

**Steps:**
1. [ ] Customer opens HireDriverScreen
2. [ ] Customer enters pickup location (near Driver A)
3. [ ] Customer enters dropoff location
4. [ ] Customer checks "Tự động chỉ định tài xế"
5. [ ] Customer clicks "Book Now"

**Expected Results:**
- [ ] Customer receives success response with `assignmentResult.success: true`
- [ ] Driver A app shows modal within 3-5 seconds
- [ ] Modal displays:
  - [ ] Pickup address
  - [ ] Dropoff address
  - [ ] Fare amount
  - [ ] Countdown timer starting at 15s
- [ ] Driver A clicks "Nhận cuốc"
- [ ] Modal closes
- [ ] Driver A app shows success alert
- [ ] Ride status updates to 'accepted'
- [ ] Driver B receives NO notification

**Backend Logs to Check:**
```
[AutoAssignService] Found available drivers: { total: 2 }
[AutoAssignService] Driver scores for ride 673abc...
[AutoAssignService] Created assignment request 674xyz for driver <DriverA_ID>
[AutoAssignService] Driver <DriverA_ID> accepted assignment request 674xyz
```

---

### Test 1.2: Driver Reject → Retry to Next Driver
**Setup:**
- Same as Test 1.1

**Steps:**
1. [ ] Customer creates ride with auto-assign
2. [ ] Driver A receives modal
3. [ ] Driver A clicks "Từ chối"

**Expected Results:**
- [ ] Driver A modal closes immediately
- [ ] Backend logs show: `Driver <DriverA_ID> rejected assignment request`
- [ ] Driver B receives modal within 3-5 seconds
- [ ] Driver B modal shows same ride info
- [ ] Driver B can accept successfully

**Backend Logs:**
```
[AutoAssignService] Driver <DriverA_ID> rejected assignment request 674xyz
[AutoAssignService] Retry attempt 2: Created assignment request 675abc for driver <DriverB_ID>
```

---

### Test 1.3: Timeout → Auto Retry
**Setup:**
- Same as Test 1.1

**Steps:**
1. [ ] Customer creates ride with auto-assign
2. [ ] Driver A receives modal
3. [ ] Driver A does NOTHING (wait 15 seconds)

**Expected Results:**
- [ ] Countdown shows: 15, 14, 13... 3, 2, 1, 0
- [ ] Modal auto-closes when countdown reaches 0
- [ ] Backend logs show timeout
- [ ] Driver B receives modal within 3 seconds

**Backend Logs:**
```
[AutoAssignService] Assignment request 674xyz timeout, retrying with next driver
[AutoAssignService] Retry attempt 2: Created assignment request 675abc for driver <DriverB_ID>
```

---

## Test Suite 2: Edge Cases

### Test 2.1: No Drivers Available
**Setup:**
- All drivers are offline or have active rides

**Steps:**
1. [ ] Set all drivers to offline OR assign them active rides
2. [ ] Customer creates ride with auto-assign

**Expected Results:**
- [ ] Customer receives error: "Không có tài xế sẵn có"
- [ ] No assignment request created
- [ ] Ride status remains 'pending' or 'no_driver_available'

**Backend Logs:**
```
[AutoAssignService] Found available drivers: { total: 0 }
[BadRequestException] Không có tài xế sẵn có
```

---

### Test 2.2: All Drivers Reject
**Setup:**
- 3 drivers online (A, B, C)

**Steps:**
1. [ ] Customer creates ride
2. [ ] Driver A rejects
3. [ ] Driver B rejects
4. [ ] Driver C rejects

**Expected Results:**
- [ ] Each driver sees modal in sequence
- [ ] After C rejects, ride status = 'no_driver_available'
- [ ] Event emitted: `ride.no_driver_available`

---

### Test 2.3: Driver Offline During Request
**Setup:**
- Driver A online when request created
- Driver A goes offline before responding

**Steps:**
1. [ ] Customer creates ride (Driver A gets request)
2. [ ] Driver A logs out or goes offline
3. [ ] Wait for timeout (15s)

**Expected Results:**
- [ ] Request times out normally
- [ ] Retries with Driver B
- [ ] No crash or error

---

### Test 2.4: Multiple Simultaneous Rides
**Setup:**
- 2 drivers online
- 3 customers create rides at same time

**Steps:**
1. [ ] Customer 1 creates ride → Driver A receives request
2. [ ] Customer 2 creates ride → Driver B receives request
3. [ ] Customer 3 creates ride → Should queue (no available driver)

**Expected Results:**
- [ ] Driver A only sees request for Ride 1
- [ ] Driver B only sees request for Ride 2
- [ ] Ride 3 shows "no driver available" OR waits for driver to become free

---

## Test Suite 3: Performance & UX

### Test 3.1: Modal Shows on All Screens
**Setup:**
- Driver A logged in

**Steps:**
1. [ ] Driver A on HomeScreen
2. [ ] Customer creates ride (Driver A gets request)
3. [ ] Verify modal shows on HomeScreen
4. [ ] Driver A navigates to TripsScreen
5. [ ] Customer creates another ride
6. [ ] Verify modal shows on TripsScreen
7. [ ] Repeat for: EarningsScreen, ProfileScreen, MapScreen

**Expected Results:**
- [ ] Modal shows on ALL screens
- [ ] Modal always on top of other UI elements
- [ ] Modal animation works smoothly

---

### Test 3.2: Polling Performance
**Setup:**
- Driver A logged in and idle

**Steps:**
1. [ ] Monitor network traffic for 30 seconds
2. [ ] Count API calls to `/assignment-requests/pending`

**Expected Results:**
- [ ] Polling happens every ~3 seconds
- [ ] ~10 requests in 30 seconds
- [ ] No crashes or memory leaks
- [ ] No duplicate modals

---

### Test 3.3: Sound Notification
**Setup:**
- Driver A logged in, sound enabled

**Steps:**
1. [ ] Customer creates ride
2. [ ] Driver A receives modal

**Expected Results:**
- [ ] Notification sound plays when modal appears
- [ ] Sound plays at full volume (1.0)
- [ ] Sound file loads successfully

---

## Test Suite 4: API Integration

### Test 4.1: Accept Endpoint
**Test with Postman:**
```bash
POST http://localhost:3000/api/rides/assignment-requests/<REQUEST_ID>/accept
Headers:
  Authorization: Bearer <DRIVER_TOKEN>

Expected Response (200):
{
  "_id": "673xyz...",
  "driverId": "671def...",
  "status": "accepted",
  "pickupAddress": "...",
  ...
}
```

### Test 4.2: Reject Endpoint
**Test with Postman:**
```bash
POST http://localhost:3000/api/rides/assignment-requests/<REQUEST_ID>/reject
Headers:
  Authorization: Bearer <DRIVER_TOKEN>
  Content-Type: application/json
Body:
{
  "reason": "Test rejection"
}

Expected Response (204):
No Content
```

### Test 4.3: Get Pending Endpoint
**Test with Postman:**
```bash
GET http://localhost:3000/api/rides/assignment-requests/pending
Headers:
  Authorization: Bearer <DRIVER_TOKEN>

Expected Response (200):
[
  {
    "_id": "674abc...",
    "rideId": {...},
    "status": "pending",
    "expiresAt": "..."
  }
]
```

---

## Test Suite 5: Database Verification

### Test 5.1: Assignment Request Created
**After customer creates ride:**
```bash
mongo
use fire_go
db.assignmentrequests.find().sort({ createdAt: -1 }).limit(1).pretty()
```

**Expected:**
```javascript
{
  "_id": ObjectId("..."),
  "rideId": ObjectId("..."),
  "driverId": ObjectId("..."),
  "status": "pending",
  "score": 87.5,
  "expiresAt": ISODate("..."),
  "attemptNumber": 1,
  "createdAt": ISODate("..."),
  "updatedAt": ISODate("...")
}
```

### Test 5.2: Assignment Request Accepted
**After driver accepts:**
```javascript
db.assignmentrequests.findOne({ status: "accepted" })
```

**Expected:**
```javascript
{
  "status": "accepted",
  "respondedAt": ISODate("...")
}
```

### Test 5.3: Ride Updated
**After acceptance:**
```javascript
db.rides.findOne({ _id: ObjectId("<RIDE_ID>") })
```

**Expected:**
```javascript
{
  "driverId": ObjectId("<DRIVER_ID>"),
  "status": "accepted",
  "acceptedAt": ISODate("...")
}
```

---

## Debugging Checklist

### If Modal Doesn't Show
- [ ] Check polling service started: Search logs for `[AssignmentPolling] 🔄 Started polling`
- [ ] Verify driver token valid: Check AsyncStorage
- [ ] Confirm driver is online: `driver.status === 'online'`
- [ ] Check pending requests exist: Call GET endpoint manually

### If Retry Doesn't Work
- [ ] Verify multiple drivers available
- [ ] Check driver scores calculated correctly
- [ ] Confirm no driver already assigned to ride
- [ ] Look for `retryWithNextDriver` in backend logs

### If Timeout Doesn't Trigger
- [ ] Check setTimeout duration (should be 15000ms)
- [ ] Verify request status still 'pending' after 15s
- [ ] Look for `scheduleTimeoutCheck` in logs

### If Wrong Driver Gets Request
- [ ] Check scoring algorithm weights
- [ ] Verify driver locations are correct
- [ ] Confirm distance calculation working
- [ ] Review driver scores in backend logs

---

## Performance Benchmarks

### Target Metrics
- [ ] Modal appears within **3-5 seconds** of ride creation
- [ ] Polling request completes in **< 500ms**
- [ ] Accept action completes in **< 1 second**
- [ ] Retry happens within **3 seconds** of reject
- [ ] Timeout triggers exactly at **15 seconds**

### Monitor
- [ ] Memory usage stays stable (no leaks)
- [ ] No UI lag or freezes
- [ ] Smooth animations
- [ ] Network bandwidth reasonable (<100KB/min)

---

## Final Acceptance Criteria

### Functionality
- [x] Auto-assign finds best driver based on scoring
- [x] Driver receives modal notification
- [x] Countdown timer works (15s)
- [x] Accept assigns ride correctly
- [x] Reject triggers retry
- [x] Timeout triggers retry
- [x] No drivers case handled gracefully
- [x] Modal shows on all screens

### Code Quality
- [x] No compile errors
- [x] TypeScript types correct
- [x] API endpoints secured with JWT
- [x] Database indexes created
- [x] Error handling implemented

### Documentation
- [x] Implementation guide written
- [x] Flow diagrams created
- [x] API documentation complete
- [x] Testing guide available

---

## Sign-off

- [ ] All Test Suite 1 tests passed
- [ ] All Test Suite 2 tests passed
- [ ] All Test Suite 3 tests passed
- [ ] All Test Suite 4 tests passed
- [ ] All Test Suite 5 tests passed
- [ ] Performance benchmarks met
- [ ] All acceptance criteria satisfied

**Tested by:** _______________  
**Date:** _______________  
**Status:** ⬜ PASS / ⬜ FAIL  
**Notes:** _______________________________________________

---

**Ready for Production:** ⬜ YES / ⬜ NO
