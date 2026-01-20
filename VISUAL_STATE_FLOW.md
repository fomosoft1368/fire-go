# 🗺️ Visual State Flow Diagram

## Customer Journey State Machine

```
                    ┌─────────────────────────────────────┐
                    │   CUSTOMER ADDED TO RIDE           │
                    │   status = "pending" or "accepted"  │
                    └──────────────┬──────────────────────┘
                                   │
                                   ▼
                   ┌───────────────────────────────┐
                   │        PICKING UP              │
                   ├───────────────────────────────┤
                   │ Button: Bắt đầu đến điểm đón   │
                   │ Map route: Driver → PICKUP    │
                   │ Click → handleMarkArrived()   │
                   └──────────────┬──────────────────┘
                                  │ (status changes)
                                  ▼
                   ┌───────────────────────────────┐
                   │     ARRIVED AT PICKUP         │
                   ├───────────────────────────────┤
                   │ Button: Bắt đầu chuyến đi   │
                   │ Map route: Driver → PICKUP  │
                   │ Click → handleStartRide()   │
                   └──────────────┬──────────────────┘
                                  │ (status changes)
                                  ▼
                   ┌───────────────────────────────┐
                   │     IN PROGRESS (DRIVING)      │
                   ├───────────────────────────────┤
                   │ Button: Hoàn thành chuyến đi │
                   │ Map route: Driver → DROPOFF  │ ✅ MAP CHANGES HERE
                   │ Click → handleCompletePass() │
                   └──────────────┬──────────────────┘
                                  │ (status changes)
                                  ▼
                   ┌───────────────────────────────┐
                   │      DELIVERY COMPLETE         │
                   ├───────────────────────────────┤
                   │ Button: Đã hoàn thành (gray) │
                   │ Map route: Static             │
                   │ No further action             │
                   └───────────────────────────────┘
```

---

## Swipe to Next Customer Flow

```
                        USER SWIPES LEFT
                             │
                             ▼
              ┌──────────────────────────┐
              │ FlatList onMomentumScroll│
              │ Calculate new index: 0→1 │
              └──────────────┬───────────┘
                             │
                             ▼
              ┌──────────────────────────┐
              │ setCurrentPassengerIndex │
              │ from 0 to 1              │
              └──────────────┬───────────┘
                             │
                             ▼
              ┌──────────────────────────┐
              │ currentPassenger updates  │
              │ ride.customerId[1]       │
              └──────────────┬───────────┘
                             │
                             ▼
              ┌──────────────────────────┐
              │ useEffect triggered      │
              │ (dependency: index, ...) │
              └──────────────┬───────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
         ▼                   ▼                   ▼
    Reset Route      Clear Old Map        Animate Map
    coordinates[]     clearPolyline()      to new location
         │                   │                   │
         └───────────────────┼───────────────────┘
                             │
                             ▼
              ┌──────────────────────────┐
              │ Fetch new Google route   │
              │ (driver → new pickup)    │
              └──────────────┬───────────┘
                             │
                             ▼
              ┌──────────────────────────┐
              │ setRouteCoordinates      │
              │ (draw new polyline)      │
              └──────────────┬───────────┘
                             │
                             ▼
              ┌──────────────────────────┐
              │ UI FULLY UPDATED         │
              ├──────────────────────────┤
              │ ✅ Passenger name        │
              │ ✅ Customer avatar       │
              │ ✅ Map location          │
              │ ✅ Route drawn           │
              │ ✅ Button text reset     │
              └──────────────────────────┘
```

---

## Map Route Updates During Journey

```
STATE 1: pending/accepted
┌─────────────────────────────┐
│ Driver Location (🚗)        │
│                             │
│        ········· Route      │
│       /           \         │
│      /             \        │
│     Pickup Loc (📍) dropoff │
│                             │
│ Map: Driver → PICKUP ✅     │
│ Distance: X km              │
└─────────────────────────────┘
        Button: "Bắt đầu đến điểm đón"
                ↓ Click
                ↓ status → "arrived_at_pickup"


STATE 2: arrived_at_pickup
┌─────────────────────────────┐
│ Driver Location (🚗)        │
│                             │
│        ········· Route      │
│       /           \         │
│      /             \        │
│     Pickup Loc (📍) dropoff │
│                             │
│ Map: Driver → PICKUP ✅     │
│ Distance: X km (same)       │
└─────────────────────────────┘
        Button: "Bắt đầu chuyến đi"
                ↓ Click
                ↓ status → "in_progress"


STATE 3: in_progress
┌─────────────────────────────┐
│ Driver Location (🚗)        │
│                             │
│        ········· Route      │
│       /           \         │
│      /             \        │
│    Pickup Loc    Dropoff(📍)│
│    (customer       [NEW     │
│     on board)      TARGET]  │
│                             │
│ Map: Driver → DROPOFF ✅    │ ⚠️ ROUTE CHANGED!
│ Distance: Y km              │
└─────────────────────────────┘
        Button: "Hoàn thành chuyến đi"
                ↓ Click
                ↓ status → "completed"


STATE 4: completed
┌─────────────────────────────┐
│ Customer Dropped Off ✅     │
│                             │
│ Driver Location (🚗)        │
│ with next passenger ready   │
│                             │
│ Map: Static (waiting next)  │
└─────────────────────────────┘
    Button: "Đã hoàn thành" (disabled)
    
    SWIPE → Next Customer → Repeat all states
```

---

## Code Flow Execution Timeline

```
TIME    │ EVENT                      │ STATE CHANGES              │ UI UPDATES
────────┼────────────────────────────┼────────────────────────────┼──────────────
   T0   │ App loads                  │ currentPassengerIndex: 0   │ Customer 1
        │                            │ currentPassenger: C1       │ Map: C1 pickup
        │                            │ routeCoordinates: [...]    │ Button: "Bắt đầu"
────────┼────────────────────────────┼────────────────────────────┼──────────────
   T1   │ Click "Bắt đầu"            │ (API call in progress)     │ Button disabled
        │                            │                            │ Loading spinner
────────┼────────────────────────────┼────────────────────────────┼──────────────
   T2   │ Backend updates C1.status  │ ride state updates with    │ Button enabled
        │ → "arrived_at_pickup"      │ arrived_at_pickup          │ Button text:
        │                            │                            │ "Bắt đầu chuyến"
────────┼────────────────────────────┼────────────────────────────┼──────────────
   T3   │ Click "Bắt đầu chuyến"     │ (API call in progress)     │ Button disabled
        │                            │                            │
────────┼────────────────────────────┼────────────────────────────┼──────────────
   T4   │ Backend updates C1.status  │ ride state updates with    │ Map animates
        │ → "in_progress"            │ in_progress                │ Route changes:
        │                            │                            │ pickup → dropoff
        │                            │ useEffect triggers         │ Button text:
        │                            │ getDirectionsRoute() calls │ "Hoàn thành"
────────┼────────────────────────────┼────────────────────────────┼──────────────
   T5   │ Click "Hoàn thành"         │ (API call in progress)     │ Button disabled
        │                            │                            │
────────┼────────────────────────────┼────────────────────────────┼──────────────
   T6   │ Backend updates C1.status  │ ride state updates with    │ Button text:
        │ → "completed"              │ completed                  │ "Đã hoàn thành"
        │                            │                            │ (grayed out)
────────┼────────────────────────────┼────────────────────────────┼──────────────
   T7   │ User swipes left           │ FlatList detects scroll    │ FlatList
        │ (Customer 1 → Customer 2)  │                            │ animates
────────┼────────────────────────────┼────────────────────────────┼──────────────
   T8   │ Swipe animation complete   │ setCurrentPassengerIndex:  │ Map animates
        │                            │ 0 → 1                      │ to new location
        │                            │ useEffect triggers         │
        │                            │ (dependencies updated)     │ Route clears
        │                            │ setRouteCoordinates([])    │ then redraws
────────┼────────────────────────────┼────────────────────────────┼──────────────
   T9   │ Google route fetched       │ routeCoordinates updated   │ Polyline
        │                            │ for Customer 2 pickup      │ renders
────────┼────────────────────────────┼────────────────────────────┼──────────────
  T10   │ Customer 2 fully loaded    │ currentPassenger: C2       │ Button shows:
        │                            │ status: "pending"          │ "Bắt đầu"
        │ All updates complete       │                            │ for C2
        │                            │                            │ (fresh cycle)
────────┴────────────────────────────┴────────────────────────────┴──────────────
```

---

## Dependency Update Triggers

```
useEffect(() => {
  updateMapAndRoute()
}, [
  currentPassengerIndex,  ← Changes when FlatList swipes
  ride?.customerId,       ← Changes when new customer added
  currentPassenger?.pickupCoordinates,   ← Changes when swipe
  currentPassenger?.dropoffCoordinates,  ← Changes when swipe
  currentPassenger?.status,              ← Changes on status update ✅
  currentPassenger?.requestId,           ← Changes when enriched
  currentLocation,                       ← Changes every GPS update
])
```

**Effect Triggers Sequence:**
```
Swipe Event:
  1. FlatList scroll ends
  2. currentPassengerIndex changes (0→1)
  3. currentPassenger updates (ride.customerId[1])
  4. useEffect triggered (index dependency)
  5. currentPassenger.pickupCoordinates extracted
  6. currentPassenger.status evaluated for route logic
  7. getDirectionsRoute() fetches Google Maps
  8. routeCoordinates state updated
  9. MapView renders polyline

Status Update:
  1. Button clicked
  2. API call to backend
  3. Backend updates RideRequest.status
  4. Response returns enriched ride
  5. setRide() updates ride object
  6. currentPassenger.status changes
  7. useEffect triggered (status dependency)
  8. Route logic re-evaluates (pickup vs dropoff)
  9. If changed, getDirectionsRoute() fetches new route
  10. MapView animates to new coordinates
```

---

## Error Prevention Checks

```
┌─ Route Calculation ─────────────────────────────┐
│ ✅ Check: status === 'pending' || 'accepted'    │
│    → Use pickupCoordinates                      │
│ ✅ Check: status === 'arrived_at_pickup'        │
│    → Use pickupCoordinates (same)               │
│ ✅ Check: status === 'in_progress'              │
│    → Use dropoffCoordinates (DIFFERENT)         │
└──────────────────────────────────────────────────┘

┌─ Button Rendering ─────────────────────────────┐
│ ✅ Check: currentPassenger exists before use    │
│ ✅ Check: currentPassenger.status defined       │
│ ✅ Check: requestId fallback to _id             │
│ ✅ Check: disabled={updating} prevents double  │
└──────────────────────────────────────────────────┘

┌─ Map Updates ──────────────────────────────────┐
│ ✅ Check: mapRef.current exists before animate  │
│ ✅ Check: Route coordinates not empty          │
│ ✅ Check: Coordinates within valid range       │
└──────────────────────────────────────────────────┘
```

---

## Performance Optimization

```
Optimized:
  ✅ Route fetch only on [status, index] changes
  ✅ Map animation 500ms (smooth, not lagging)
  ✅ FlatList pagingEnabled for snappy scroll
  ✅ Dependencies specified (no unnecessary renders)

Areas to Monitor:
  ⚠️  currentLocation updates every GPS tick
      → May trigger useEffect frequently
      → If slow: consider debouncing
  
  ⚠️  Google Directions API calls
      → Consider caching routes for same pairs
      → Rate limit: 50 QPS per API key

Not Implemented (Future):
  ⏳ Route caching (Google Maps API cost optimization)
  ⏳ Polyline animation (show route drawing progressively)
  ⏳ Offline mode (pre-fetch routes)
```

---

## Success Verification Checklist

```
✅ Initial load: Map shows Customer 1 pickup route
✅ Click mark-arrived: Status changes, button text changes
✅ Button says "Bắt đầu chuyến đi": Correct for arrived state
✅ Click start-journey: Map route changes from pickup → dropoff
✅ Click complete: Status = completed, button disabled
✅ Swipe to Customer 2: Map and button reset completely
✅ New route drawn: For Customer 2 pickup location
✅ No console errors: All logs show expected flow
✅ No API 400 errors: requestId properly populated
✅ Smooth animation: Map transitions without lag
```

---

This diagram shows exactly how each state flows and when the map changes! 🎯
