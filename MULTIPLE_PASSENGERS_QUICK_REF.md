# 🚀 QUICK REFERENCE - Multiple Passengers Flow

## 3 Fixes Applied

| # | File | Line | Change | Why |
|---|------|------|--------|-----|
| 1 | ActiveRideScreen.tsx | 251 | Add `'accepted'` to route logic | Backend returns 'accepted' status |
| 2 | ActiveRideScreen.tsx | 1120 | Change button text to "Bắt đầu chuyến đi" | Next action after arriving |
| 3 | ActiveRideScreen.tsx | 307 | Add `currentPassenger?.requestId` to dependencies | Ensure map updates when data enriched |

---

## One-Page Flow Chart

```
LOAD
 ├─ Customer 1: status=pending
 │   ├─ Map: driver→pickup1
 │   ├─ Button: "Bắt đầu đến điểm đón"
 │   └─ Click ──→ status=arrived_at_pickup
 │       ├─ Map: driver→pickup1 (same)
 │       ├─ Button: "Bắt đầu chuyến đi" ← TEXT CHANGED
 │       └─ Click ──→ status=in_progress
 │           ├─ Map: driver→dropoff1 ← MAP CHANGED!
 │           ├─ Button: "Hoàn thành chuyến đi"
 │           └─ Click ──→ status=completed
 │               ├─ Map: static
 │               └─ Button: "Đã hoàn thành" (disabled)
 │
 ├─ SWIPE LEFT ──→ Customer 2 (RESET ALL)
 │   ├─ Map: driver→pickup2
 │   ├─ Button: "Bắt đầu đến điểm đón"
 │   └─ [Repeat same cycle]
 │
 └─ More customers: [Same pattern]
```

---

## Status → What to Display

```
pending/accepted       → Map: PICKUP        | Button: "Bắt đầu"
arrived_at_pickup      → Map: PICKUP        | Button: "Bắt đầu chuyến"
in_progress            → Map: DROPOFF ✅    | Button: "Hoàn thành"
completed              → Map: static        | Button: "Đã hoàn thành"
```

---

## Key Code Snippets

### Route Logic (Line 251)
```typescript
if (status === 'pending' || status === 'accepted' || status === 'arrived_at_pickup') {
  endCoord = currentPassenger.pickupCoordinates
} else if (status === 'in_progress') {
  endCoord = currentPassenger.dropoffCoordinates  // MAP CHANGES!
}
```

### Button Conditions (Lines 1106-1138)
```typescript
// pending/accepted
{(status === 'pending' || status === 'accepted') && <Btn>"Bắt đầu"</Btn>}

// arrived_at_pickup
{status === 'arrived_at_pickup' && <Btn>"Bắt đầu chuyến"</Btn>}

// in_progress
{status === 'in_progress' && <Btn>"Hoàn thành"</Btn>}

// completed
{status === 'completed' && <DisabledBtn>"Đã hoàn thành"</DisabledBtn>}
```

### FlatList Swipe (Line 1026)
```typescript
<FlatList
  pagingEnabled={true}
  onMomentumScrollEnd={(e) => {
    const newIndex = Math.round(e.nativeEvent.contentOffset.x / 300)
    setCurrentPassengerIndex(newIndex)  // Triggers useEffect
  }}
/>
```

### useEffect (Line 214)
```typescript
useEffect(() => {
  // Map update logic
}, [currentPassengerIndex, ..., currentPassenger?.status, currentPassenger?.requestId, ...])
```

---

## Testing Checklist

- [ ] **Load**: Map shows pickup, button says "Bắt đầu"
- [ ] **Click "Bắt đầu"**: Status→arrived, button→"Bắt đầu chuyến"
- [ ] **Click "Bắt đầu chuyến"**: Status→in_progress, **map→dropoff**, button→"Hoàn thành"
- [ ] **Click "Hoàn thành"**: Status→completed, button disabled
- [ ] **Swipe to Customer 2**: Map/button/status ALL reset
- [ ] **Repeat for Customer 2**: Same flow as Customer 1
- [ ] **No errors**: Check console for 400s or exceptions

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Map doesn't change on swipe | Check useEffect includes `currentPassengerIndex` |
| Button doesn't change text | Check `currentPassenger?.status` matches condition |
| Map shows pickup when should be dropoff | Check status is `'in_progress'` and route logic correct |
| 400 error on button click | Check backend schema has `ref: 'Customer'` not `'User'` |
| Swipe is jerky | Ensure FlatList has `pagingEnabled={true}` |

---

## Files to Reference

- **Implementation**: [mobile-driver/src/screens/ActiveRideScreen.tsx](mobile-driver/src/screens/ActiveRideScreen.tsx)
- **Backend Routes**: [backend/src/modules/rides/rides.controller.ts](backend/src/modules/rides/rides.controller.ts)
- **Test Guide**: [TEST_FLOW_MULTIPLE_PASSENGERS.md](TEST_FLOW_MULTIPLE_PASSENGERS.md)
- **Business Logic**: [BUSINESS_LOGIC_EXPLANATION.md](BUSINESS_LOGIC_EXPLANATION.md)
- **State Diagram**: [VISUAL_STATE_FLOW.md](VISUAL_STATE_FLOW.md)

---

## Success = ✅ All of these work:

✅ Map shows correct location (pickup vs dropoff)
✅ Button text changes correctly
✅ Status updates properly
✅ Swipe between customers smooth
✅ All resets on swipe
✅ No API errors (400s)
✅ Console logs expected flow

**Ready to test!** 🎯
