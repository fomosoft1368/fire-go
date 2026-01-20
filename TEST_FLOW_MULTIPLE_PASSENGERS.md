# 🧪 Test Flow: Multiple Passengers with Dynamic Map & Status

## 📋 Business Logic Overview

**For each passenger, follow this exact flow:**

```
Customer 1:
├─ Status: pending/accepted 
│  ├─ Button: "Bắt đầu đến điểm đón" 
│  ├─ Map: driver → pickup of Customer 1
│  └─ Click → Status change to "arrived_at_pickup"
│
├─ Status: arrived_at_pickup
│  ├─ Button: "Bắt đầu chuyến đi" (updated text)
│  ├─ Map: driver → pickup of Customer 1 (same)
│  └─ Click → Status change to "in_progress"
│
├─ Status: in_progress
│  ├─ Button: "Hoàn thành chuyến đi" 
│  ├─ Map: driver → dropoff of Customer 1 (CHANGED)
│  └─ Click → Status change to "completed"
│
└─ Status: completed
   ├─ Button: "Đã hoàn thành" (disabled)
   └─ Map: reset (wait for next action)

Swipe to Customer 2 → SAME FLOW for Customer 2
├─ All resets: map, button, status
├─ Map animates to Customer 2 location
└─ Button shows "Bắt đầu đến điểm đón" (reset)
```

---

## ✅ Test Checklist

### Phase 1: Initial Load (Customer 1)
- [ ] App loads ride with 2+ customers
- [ ] FlatList shows all customers
- [ ] Customer 1 is active (index 0)
- [ ] Map shows: **driver location + Customer 1 pickup location**
- [ ] Route drawn: **driver → Customer 1 pickup** 
- [ ] Button shows: **"Bắt đầu đến điểm đón"**
- [ ] Console logs show:
  ```
  ✅ Passenger changed: Customer 1
  🔄 Resetting route coordinates...
  🗺️ Getting route from [driver_lng, driver_lat] to [pickup1_lng, pickup1_lat]
  🎨 Setting routeCoordinates state: X points
  📐 Fitting map to coordinates
  ```

### Phase 2: Click "Bắt đầu đến điểm đón" (Customer 1)
- [ ] Alert dialog appears: "Đánh dấu đã đến để đón Customer 1?"
- [ ] Click "Xác nhận"
- [ ] Backend updates RideRequest status → "arrived_at_pickup"
- [ ] Button text changes: **"Bắt đầu chuyến đi"** ✅
- [ ] Map remains: **driver → Customer 1 pickup** (same)
- [ ] Console logs show:
  ```
  📡 Calling mark-arrived with: { rideId, requestId, passengerName: "Customer 1" }
  ✅ Request updated: status = arrived_at_pickup
  ```

### Phase 3: Click "Bắt đầu chuyến đi" (Customer 1)
- [ ] Alert dialog appears: "Bắt đầu chuyến cho Customer 1?"
- [ ] Click "Bắt đầu"
- [ ] Backend updates RideRequest status → "in_progress"
- [ ] Button text changes: **"Hoàn thành chuyến đi"** ✅
- [ ] **MAP CHANGES**: Route now drawn **driver → Customer 1 DROPOFF** ✅
- [ ] Console logs show:
  ```
  📡 Calling start-journey with: { rideId, requestId }
  ✅ Request updated: status = in_progress
  🗺️ Getting route from [driver_lng, driver_lat] to [dropoff1_lng, dropoff1_lat]
  ```

### Phase 4: Click "Hoàn thành chuyến đi" (Customer 1)
- [ ] Alert dialog appears: "Đã thả hết khách Customer 1 chưa?"
- [ ] Click "Đã xong"
- [ ] Backend updates RideRequest status → "completed"
- [ ] Button text changes: **"Đã hoàn thành"** (disabled/greyed out) ✅
- [ ] Console logs show:
  ```
  📡 Calling complete with: { rideId, requestId }
  ✅ Request updated: status = completed
  ```

### Phase 5: Swipe to Customer 2 ⭐ **CRITICAL TEST**
- [ ] Swipe FlatList left → Customer 2 card moves to focus
- [ ] **Console logs show**:
  ```
  🔄 Passenger swipe detected
     contentOffsetX: [number]
     calculated index: 1
     final index: 1
     current index: 0
  ✅ Setting new passenger index: 1
  ```
- [ ] **EVERYTHING RESETS**:
  - [ ] `currentPassengerIndex` changes from 0 → 1
  - [ ] `currentPassenger` object updates to Customer 2
  - [ ] useEffect triggers with new dependencies
  - [ ] Map animates to Customer 2 pickup location
  - [ ] Route clears then redraws: **driver → Customer 2 pickup**
  - [ ] Console logs show:
    ```
    🔄 Passenger changed, updating map to: Customer 2
    🔄 Resetting route coordinates...
    🗺️ Getting route from [driver_lng, driver_lat] to [pickup2_lng, pickup2_lat]
    🎨 Setting routeCoordinates state: X points
    ```

### Phase 6: Button State After Swipe (Customer 2)
- [ ] Button RESETS to: **"Bắt đầu đến điểm đón"** ✅
- [ ] Map shows: **driver → Customer 2 pickup** (not dropoff!)
- [ ] Passenger name updated: shows "Customer 2"
- [ ] Status condition evaluated correctly:
  ```
  if (currentPassenger?.status === 'pending' || 
      currentPassenger?.status === 'accepted') {
    // Show "Bắt đầu đến điểm đón"
  }
  ```

### Phase 7: Repeat Cycle for Customer 2
- [ ] Click "Bắt đầu đến điểm đón" → status → "arrived_at_pickup"
  - [ ] Button changes to "Bắt đầu chuyến đi" ✅
  - [ ] Map: **driver → Customer 2 pickup** (same)
  
- [ ] Click "Bắt đầu chuyến đi" → status → "in_progress"
  - [ ] Button changes to "Hoàn thành chuyến đi" ✅
  - [ ] **MAP CHANGES**: Route now **driver → Customer 2 DROPOFF** ✅
  
- [ ] Click "Hoàn thành chuyến đi" → status → "completed"
  - [ ] Button shows "Đã hoàn thành" (disabled)

---

## 🐛 Common Issues to Watch For

### Issue 1: Map doesn't update when swiping
**Symptom**: Swipe to Customer 2, but map still shows Customer 1 location

**Root cause**: 
- useEffect dependency not including `currentPassengerIndex`
- Route not clearing before new fetch
- MapRef not updated

**Check**:
```tsx
useEffect(() => {
  if (!currentPassenger || !currentLocation) return
  
  setRouteCoordinates([])  // 👈 MUST clear first
  
  // Then fetch new route
  getDirectionsRoute(...)
}, [currentPassengerIndex, ...]  // 👈 Must include this
```

### Issue 2: Button doesn't show correct action
**Symptom**: After clicking mark-arrived, button still says "Bắt đầu đến điểm đón"

**Root cause**:
- Status not updating in state
- Button condition checking wrong status
- API response not setting ride state

**Check**:
```tsx
{(currentPassenger?.status === 'pending' || 
  currentPassenger?.status === 'accepted') && (
  <TouchableOpacity ... >
    <Text>Bắt đầu đến điểm đón</Text>
  </TouchableOpacity>
)}

{currentPassenger?.status === 'arrived_at_pickup' && (
  <TouchableOpacity ... >
    <Text>Bắt đầu chuyến đi</Text>  // ✅ Changed text
  </TouchableOpacity>
)}

{currentPassenger?.status === 'in_progress' && (
  <TouchableOpacity ... >
    <Text>Hoàn thành chuyến đi</Text>  // ✅ Correct next action
  </TouchableOpacity>
)}
```

### Issue 3: Map not showing correct destination
**Symptom**: When in_progress, map still shows pickup instead of dropoff

**Root cause**:
- Route calculation logic wrong
- Not checking `status === 'in_progress'` 
- Using wrong coordinates

**Check**:
```tsx
if (status === 'pending' || status === 'accepted' || status === 'arrived_at_pickup') {
  // Map to PICKUP
  endCoord = [pickupLng, pickupLat]
} else if (status === 'in_progress') {
  // Map to DROPOFF ✅
  endCoord = [dropoffLng, dropoffLat]
}
```

### Issue 4: requestId undefined error
**Symptom**: Click button → 400 error "Request not found"

**Root cause**:
- Backend schema has `ref: 'User'` instead of `ref: 'Customer'`
- RideRequest not populated with customerId
- currentPassenger.requestId is undefined

**Check**:
```tsx
// Frontend debug
console.log('📋 currentPassenger object:', JSON.stringify(currentPassenger, null, 2))
const requestId = currentPassenger.requestId || currentPassenger._id

// Backend debug - check RideRequest schema
@Prop({ type: Types.ObjectId, ref: 'Customer', required: true })  // ✅ Correct
customerId: Types.ObjectId
```

---

## 🔍 Debug Commands

### Check current state in app
```
Press: Ctrl+D (iOS Simulator)
or Ctrl+M (Android Emulator)
→ Open Remote Debugger
→ Check Console logs
```

### Key console.log outputs to look for:

```javascript
// ✅ GOOD: Passenger swipe detected
🔄 Passenger swipe detected
   contentOffsetX: 300
   calculated index: 1
   final index: 1
✅ Setting new passenger index: 1

// ✅ GOOD: Map updating with new route
🔄 Passenger changed, updating map to:
   name: "Customer 2"
   pickup: [105.85, 21.02]
   dropoff: [105.87, 21.03]
   status: "pending"

🗺️ Getting route from [105.8386, 21.0722] to [105.85, 21.02]
✅ Route received with 42 points
🎨 Setting routeCoordinates state: 42 points

// ✅ GOOD: Button action
📡 Calling mark-arrived with:
   { rideId: "...", requestId: "...", passengerName: "Customer 2" }
```

### Check network requests
```
Backend logs should show:
[✓] PATCH /rides/:rideId/requests/:requestId/mark-arrived
[✓] Response: 200 OK with enriched ride data
```

---

## 📊 Expected vs Actual Comparison Table

| State | Button Text | Map Route | Expected Behavior |
|-------|-------------|-----------|-------------------|
| pending/accepted | "Bắt đầu đến điểm đón" | driver → pickup | Click → status = arrived_at_pickup |
| arrived_at_pickup | "Bắt đầu chuyến đi" | driver → pickup | Click → status = in_progress |
| in_progress | "Hoàn thành chuyến đi" | driver → **dropoff** | Click → status = completed |
| completed | "Đã hoàn thành" | (static) | Disabled button |
| (swipe to next) | "Bắt đầu đến điểm đón" | driver → next pickup | Reset for next customer |

---

## ✨ Success Criteria

- ✅ All console.log messages appear in correct order
- ✅ Map updates when clicking buttons
- ✅ Map resets when swiping to next customer
- ✅ Button text changes match status flow
- ✅ Route drawn matches destination (pickup vs dropoff)
- ✅ Multiple customers can be completed sequentially
- ✅ No 400 errors on API calls
- ✅ Performance: map animation smooth, no lag on swipe

---

## 🎬 Record Test Video

For best results, while testing:
1. Enable console logs (Remote Debugger)
2. Have backend logs visible
3. Record screen to check:
   - Button text changes
   - Map route redraws
   - FlatList scrolling smooth
   - No error alerts

This will help diagnose any remaining issues quickly! 🎯
