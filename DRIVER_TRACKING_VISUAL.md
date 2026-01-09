# 🎯 Phân biệt Driver Status - Visual Guide

## 📊 State Diagram - Share Ride Flow

```
┌──────────────────────────────────────────────────┐
│                  HOMESCREEN                       │
│  isSearching = false                             │
│  driverFound = false                             │
│                                                  │
│  ┌────────────────────────────────────────────┐ │
│  │  - Map mini                                │ │
│  │  - Nhập Pickup/Dropoff                     │ │
│  │  - Hiển thị giá                            │ │
│  │  - Nút "Tìm chuyến xe"                     │ │
│  └────────────────────────────────────────────┘ │
└──────────────────┬───────────────────────────────┘
                   │ Nhấn "Tìm chuyến xe"
                   │ rideService.createRide()
                   │ rideService.autoAssignDriver()
                   │
                   ▼
┌──────────────────────────────────────────────────┐
│            FINDING DRIVER SCREEN                 │
│  isSearching = true                              │
│  driverFound = false                             │
│  rideId = "ride-123"                             │
│                                                  │
│  ┌────────────────────────────────────────────┐ │
│  │  - Map FULL SCREEN                         │ │
│  │    * Pickup marker 🔴                      │ │
│  │    * Dropoff marker 📍                     │ │
│  │    * Route polyline                        │ │
│  │  - Radar animation (3 circles)             │ │
│  │  - Status: "Đang tìm tài xế"               │ │
│  │  - Nút "Hủy chuyến"                        │ │
│  └────────────────────────────────────────────┘ │
│                                                  │
│  🔄 POLLING EVERY 2 SECONDS                     │
│  GET /rides/ride-123                            │
│  → Check if rideData.driverId exists            │
└──────────────────┬───────────────────────────────┘
                   │ rideData.driverId = {_id, name, ...}
                   │ ✅ Driver found!
                   │
                   ▼
┌──────────────────────────────────────────────────┐
│          DRIVER FOUND SCREEN                     │
│  isSearching = false                             │
│  driverFound = true                              │
│  driver = {...}                                  │
│                                                  │
│  ┌────────────────────────────────────────────┐ │
│  │  - Map FULL SCREEN                         │ │
│  │    * Driver marker 🟡                      │ │
│  │    * Pickup marker 🔴                      │ │
│  │    * Dropoff marker 📍                     │ │
│  │    * Route polyline                        │ │
│  │  - Driver Info Card                        │ │
│  │    ├─ Avatar 👤                            │ │
│  │    ├─ Name: "Minh"                         │ │
│  │    ├─ Rating: ⭐⭐⭐⭐⭐ 4.8                │ │
│  │    ├─ Vehicle: Toyota Vios                 │ │
│  │    └─ License: ABC 123                     │ │
│  │  - Actions                                 │ │
│  │    ├─ 📞 Call                              │ │
│  │    ├─ 💬 Chat                              │ │
│  │    └─ ❌ Cancel                            │ │
│  └────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────┘
```

---

## 🔍 Detailed State Transitions

### State 1: Normal View (Nhập địa điểm)
```typescript
{
  isSearching: false,
  driverFound: false,
  rideId: null,
  driver: null,
  routeInfo: {...}  // Có tuyến đường từ Google Maps
}

✅ Hiển thị: HomeScreen with form
```

### State 2: Searching (Đang tìm tài xế)
```typescript
{
  isSearching: true,    // ← CHANGE
  driverFound: false,
  rideId: "ride-123",   // ← CHANGE
  driver: null,
  routeInfo: {...}      // Giữ để vẽ map
}

✅ Hiển thị: Finding Driver Screen
🔄 Action: Polling mỗi 2 giây
```

### State 3: Driver Found (Tài xế tìm thấy)
```typescript
{
  isSearching: false,   // ← CHANGE
  driverFound: true,    // ← CHANGE
  rideId: "ride-123",
  driver: {             // ← CHANGE
    id: "driver-456",
    name: "Minh",
    phone: "0123456789",
    avatar: "https://...",
    rating: 4.8,
    reviews: 128,
    vehicle: {
      model: "Toyota Vios",
      licensePlate: "ABC 123",
      color: "White"
    }
  },
  driverLocation: {      // ← NEW
    latitude: 21.0285,
    longitude: 105.8542
  },
  routeInfo: {...}
}

✅ Hiển thị: DriverFoundScreen
🔄 Action: Dừng polling
```

---

## 🔄 Polling Process (Every 2 seconds)

```javascript
// 1️⃣ Call API
GET /api/rides/ride-123
Response:
{
  _id: "ride-123",
  status: "accepted",
  driverId: null  // ❌ Still null
}
→ Continue polling...

// 2️⃣ 2 seconds later
GET /api/rides/ride-123
Response:
{
  _id: "ride-123",
  status: "accepted",
  driverId: {             // ✅ Now has driver!
    _id: "driver-456",
    firstName: "Minh",
    phone: "0123456789",
    avatar: "...",
    rating: 4.8,
    reviews: 128,
    vehicle: {...}
  },
  driverLocation: [105.8542, 21.0285]
}
→ ✅ Stop polling
→ Update driver state
→ Set driverFound = true
→ Show DriverFoundScreen
```

---

## 🎨 Visual Difference

### Finding Driver (isSearching = true)
```
┌─────────────────────────┐
│       FULL MAP          │
│                         │
│      🟡 📡 🟡           │  ← Radar animation
│       (pulsing)         │
│                         │
│                         │
└─────────────────────────┘
┌─────────────────────────┐
│   Đang tìm tài xế       │
│  Sẽ sớm có tài xế       │
│   [Hủy chuyến]          │
└─────────────────────────┘
```

### Driver Found (driverFound = true)
```
┌─────────────────────────┐
│       FULL MAP          │
│  🟡 (driver location)   │
│  🔴 (pickup)            │
│  📍 (dropoff)           │
│                         │
│  Route polyline         │
└─────────────────────────┘
┌─────────────────────────┐
│  👤 Minh                │
│  ⭐ 4.8 (128 reviews)   │
│  🚗 Toyota Vios         │
│  📋 ABC 123             │
├─────────────────────────┤
│ [📞 Call] [💬 Chat]     │
│ [❌ Cancel]             │
└─────────────────────────┘
```

---

## 📋 Rendering Logic

```typescript
// Component render order:
export default function HomeScreen() {
  // ... states

  // ✅ Step 1: Check if driver found
  if (driverFound && routeInfo && driver) {
    return <DriverFoundScreen {...} />
  }

  // ✅ Step 2: Check if searching
  if (isSearching && routeInfo) {
    return <FindingDriverView />
  }

  // ✅ Step 3: Default - Normal home screen
  return <NormalHomeView />
}
```

---

## 🚨 Edge Cases

### Case 1: User cancels while searching
```typescript
// Before: isSearching = true
handleCancel() → resetShareRideState()
// After: isSearching = false, rideId = null
// Result: Return to HomeScreen
```

### Case 2: Network error during polling
```typescript
// Polling catches error but continues
catch (error) {
  console.error('[HomeScreen] Polling error:', error)
  // Next iteration will retry in 2 seconds
}
```

### Case 3: Invalid driver data
```typescript
if (!driverData || !driverData._id) {
  console.warn('[HomeScreen] Invalid driverData')
  // Skip this polling cycle
  // Continue polling on next interval
}
```

### Case 4: App minimized while searching
```typescript
// useEffect cleanup will clear polling
// When app opens again:
// - If isSearching still true → Resume polling
// - If user navigated away → All states reset
```

---

## 🔧 Debug Command

To see state changes in console:

```typescript
// Add to HomeScreen
useEffect(() => {
  console.log('🎯 HomeScreen State Changed:')
  console.log('  isSearching:', isSearching)
  console.log('  driverFound:', driverFound)
  console.log('  rideId:', rideId)
  console.log('  driver:', driver)
  console.log('  routeInfo:', routeInfo)
}, [isSearching, driverFound, rideId, driver, routeInfo])
```

Output:
```
🎯 HomeScreen State Changed:
  isSearching: false
  driverFound: false
  rideId: null
  driver: null
  routeInfo: null

[After click Find Ride]

🎯 HomeScreen State Changed:
  isSearching: true
  driverFound: false
  rideId: "ride-123"
  driver: null
  routeInfo: {...}

[After polling finds driver]

🎯 HomeScreen State Changed:
  isSearching: false
  driverFound: true
  rideId: "ride-123"
  driver: {...}
  routeInfo: {...}
```

---

## 📱 Testing Checklist

- [ ] Nhập đúng địa điểm
- [ ] Tính giá xuất hiện
- [ ] Nhấn "Tìm chuyến xe"
- [ ] Hiển thị "Đang tìm tài xế"
- [ ] Radar animation hoạt động
- [ ] Backend trả về driverId
- [ ] Tự động chuyển sang DriverFoundScreen
- [ ] Hiển thị đúng thông tin tài xế
- [ ] Nút call, chat, cancel hoạt động
- [ ] Hủy chuyến → Quay lại HomeScreen

