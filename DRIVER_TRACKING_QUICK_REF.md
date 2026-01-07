# ⚡ Quick Reference - Driver Tracking

## 🎯 3 States of Share Ride

```
STATE 1          STATE 2           STATE 3
─────────────────────────────────────────────
Normal      →    Searching    →    Found
isSearching=false  isSearching=true   driverFound=true

[Form]     →    [Finding]    →    [Driver Card]
```

---

## 🔑 Key Variables

```typescript
isSearching: boolean     // True = Searching for driver
driverFound: boolean     // True = Driver found & accepted
rideId: string           // ID of current ride
driver: object           // Driver info (name, rating, etc)
```

---

## 🔄 Polling Flow

```
User clicks "Tìm chuyến"
         ↓
Create ride + Auto-assign
         ↓
Set isSearching = true
Set rideId = ride-123
         ↓
START POLLING (every 2s)
    GET /rides/ride-123
         ↓
Check: rideData.driverId exists?
         ↓
    YES ✅
    setDriver(...)
    driverFound = true
    STOP POLLING
         ↓
Show DriverFoundScreen
```

---

## 📱 Screen Display

```
if (driverFound) {
  return <DriverFoundScreen />    // Driver info
}

if (isSearching) {
  return <FindingDriverScreen />  // Radar animation
}

return <HomeScreen />              // Normal form
```

---

## 🎯 What Triggers What

| User Action | State Change | Screen Update |
|------------|--------------|---------------|
| Click "Tìm chuyến" | isSearching = true | Finding Driver |
| Driver accepts | driverFound = true | Driver Found |
| Click Cancel | Reset all states | Back to Home |

---

## 🧪 Test Checklist

- [ ] Enter locations
- [ ] Click find ride
- [ ] See "Đang tìm tài xế"
- [ ] Radar animates
- [ ] Driver info appears
- [ ] Click cancel → back to home

---

## 🔍 Debug Console

```
[HomeScreen] Polling ride data for rideId: ride-123
[HomeScreen] Ride data: {...}
[HomeScreen] Driver found: driver-456
```

---

## ⚠️ Common Issue

**Problem:** Forever stuck on "Đang tìm tài xế"

**Solution:** Check if backend returns `driverId` in response:
```typescript
{
  _id: "ride-123",
  driverId: {           // ← Must not be null!
    _id: "driver-456",
    firstName: "Minh"
  }
}
```

---

## 📊 State Cheat Sheet

```typescript
// Searching
{ isSearching: true, driverFound: false, driver: null }

// Found
{ isSearching: false, driverFound: true, driver: {...} }

// Reset
{ isSearching: false, driverFound: false, driver: null }
```

---

## 🚀 Quick Start

1. Open `HomeScreen.tsx`
2. Look for these 3 conditional renders:
   - `if (driverFound && routeInfo && driver)`
   - `if (isSearching && routeInfo)`
   - Default return (normal form)
3. Polling happens automatically via `useEffect`
4. When `rideData.driverId` is found → Automatic transition

---

## 📚 Full Docs

| File | Content |
|------|---------|
| SHARE_RIDE_DRIVER_TRACKING.md | Full explanation |
| DRIVER_TRACKING_VISUAL.md | Diagrams & flows |
| DRIVER_TRACKING_CODE_SNIPPETS.md | Code examples |
| DRIVER_TRACKING_IMPLEMENTATION.md | Implementation summary |

