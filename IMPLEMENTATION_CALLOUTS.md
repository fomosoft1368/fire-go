# 🎯 Implementation Callout Guide

## Where to Find Each Piece

### 📍 1. State Declarations (Lines 53-57)
```typescript
// Share ride - Driver finding states
const [isSearching, setIsSearching] = useState(false)           // ← Line 53
const [driverFound, setDriverFound] = useState(false)          // ← Line 54
const [driver, setDriver] = useState<any>(null)                // ← Line 55
const [driverLocation, setDriverLocation] = useState<any>(null) // ← Line 56
const [rideId, setRideId] = useState<string | null>(null)      // ← Line 57
```

**Location:** `HomeScreen.tsx` lines 53-57

**Purpose:** Track the lifecycle of finding a driver
- `isSearching`: Currently searching?
- `driverFound`: Driver found & accepted?
- `driver`: Driver info object
- `driverLocation`: Driver's current location
- `rideId`: Current ride ID being tracked

---

### 📍 2. Reset Function (Lines 76-81)
```typescript
// Reset share ride state khi cancel
const resetShareRideState = () => {
  setIsSearching(false)
  setDriverFound(false)
  setDriver(null)
  setDriverLocation(null)
  setRideId(null)
}
```

**Location:** `HomeScreen.tsx` lines 76-81

**When Called:**
- User clicks Cancel while searching
- User navigates back from driver found

**Effect:** Returns all states to initial values

---

### 📍 3. Polling useEffect (Lines 84-124)
```typescript
// Polling để lấy thông tin tài xế khi có tài xế nhận cuốc
useEffect(() => {
  if (!isSearching || !rideId) {
    return  // Don't start if conditions not met
  }

  console.log('[HomeScreen] Polling ride data for rideId:', rideId)
  
  // Every 2 seconds
  const pollInterval = setInterval(async () => {
    try {
      // 1. Get ride data from API
      const rideData = await rideService.getRideById(rideId)
      
      // 2. Validate response
      if (!rideData || typeof rideData !== 'object') {
        return
      }

      // 3. Check if driver accepted (has driverId)
      if (rideData.driverId) {
        const driverData = rideData.driverId
        
        // 4. Validate driver data
        if (!driverData || !driverData._id) {
          return
        }

        // 5. Map API data to UI format
        setDriver({
          id: driverData._id,
          name: driverData.firstName || 'Driver',
          phone: driverData.phone || '0',
          avatar: driverData.avatar || '',
          rating: driverData.rating || 4.8,
          reviews: driverData.reviews || 128,
          vehicle: {
            model: driverData.vehicle?.model || 'Toyota Vios',
            licensePlate: driverData.vehicle?.licensePlate || 'ABC 123',
            color: driverData.vehicle?.color || 'White',
          },
        })

        // 6. Set driver location
        setDriverLocation({
          latitude: rideData.driverLocation?.[1] || 21.0285,
          longitude: rideData.driverLocation?.[0] || 105.8542,
        })

        // 7. Update states & stop polling
        setDriverFound(true)
        setIsSearching(false)
        clearInterval(pollInterval)
      }
    } catch (error) {
      // Continue polling on error (don't stop)
      console.error('[HomeScreen] Polling error:', error)
    }
  }, 2000) // Poll every 2 seconds

  // Cleanup: Stop polling on unmount
  return () => clearInterval(pollInterval)
}, [isSearching, rideId])  // Dependencies
```

**Location:** `HomeScreen.tsx` lines 84-124

**Key Points:**
1. ✅ Guard clauses at start
2. ✅ Polling every 2 seconds
3. ✅ Validation before using data
4. ✅ Data mapping to UI format
5. ✅ Stop polling when found
6. ✅ Error handling (continue polling)
7. ✅ Cleanup on unmount

---

### 📍 4. Handle Find Ride (Update)
```typescript
const handleFindRide = async () => {
  // ... validation ...

  setIsLoading(true)

  const rideData = {
    rideType: 'share' as const,
    pickupAddress: routeInfo.pickup.formattedAddress,
    // ... more fields ...
  }

  const result = await rideService.createRide(rideData, user.id)
  const assignedRide = await rideService.autoAssignDriver(result._id)
  
  // ✨ NEW: Set searching state
  setRideId(result._id)        // ← Store ride ID
  setIsSearching(true)          // ← Start polling
  
  setTimeout(() => {
    setIsLoading(false)
    Alert.alert('Thành công', '✓ Cuốc xe đã được tạo!...')
  }, 500)
}
```

**Location:** Updated version of handleFindRide

**Changes:**
- Added: `setRideId(result._id)`
- Added: `setIsSearching(true)`
- Removed: Direct driver found message
- Effect: Triggers polling useEffect

---

### 📍 5. Conditional Rendering (Before Main Return)

#### Option 1: Driver Found
```typescript
if (driverFound && routeInfo && driver) {
  return (
    <DriverFoundScreen
      driver={driver}
      routeInfo={routeInfo}
      onChat={() => { console.log('Chat with driver:', driver.id) }}
      onCancel={resetShareRideState}
    />
  )
}
```

**When:** `driverFound = true`
**Shows:** DriverFoundScreen with driver info

---

#### Option 2: Finding Driver
```typescript
if (isSearching && routeInfo) {
  return (
    <View style={[styles.findingContainer, { backgroundColor: colors.bg }]}>
      {/* Full screen map */}
      <MapViewComponent ... />

      {/* Status card with radar */}
      <View style={[styles.statusCard, {...}]}>
        <View style={styles.statusContent}>
          {/* Radar Animation */}
          <View style={styles.radarContainer}>
            <View style={[styles.radarPulse, styles.radarRing1, {...}]} />
            <View style={[styles.radarPulse, styles.radarRing2, {...}]} />
            <View style={[styles.radarPulse, styles.radarRing3, {...}]} />
            <View style={styles.radarCenter} />
          </View>
          
          {/* Status Text */}
          <Text>Đang tìm tài xế</Text>
          <Text>Sẽ sớm có tài xế nhận chuyến</Text>
        </View>

        {/* Cancel Button */}
        <TouchableOpacity onPress={() => {
          resetShareRideState()
          setPickupLocation('')
          setDropoffLocation('')
          setRouteInfo(null)
          setFareEstimate(null)
        }}>
          <Text>Hủy chuyến</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}
```

**When:** `isSearching = true`
**Shows:** Finding driver screen with radar animation

---

#### Option 3: Normal (Default)
```typescript
// Rest of HomeScreen component
// Normal form with:
// - Ride type toggle
// - Location inputs
// - Suggestions dropdown
// - Price display
// - Find ride button
```

**When:** `isSearching = false && driverFound = false`
**Shows:** Normal home screen form

---

### 📍 6. Styles Added (Bottom of File)

```typescript
const styles = StyleSheet.create({
  // ... existing styles ...
  
  // ✨ NEW STYLES:
  findingContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 0,
  },
  
  radarContainer: {
    position: 'relative',
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  radarPulse: {
    position: 'absolute',
    borderWidth: 2,
    borderRadius: 999,
  },
  
  radarRing1: { width: 80, height: 80 },
  radarRing2: { width: 120, height: 120 },
  radarRing3: { width: 160, height: 160 },
  
  radarCenter: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FF6B00',
    shadowColor: '#FF6B00',
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 8,
  },
  
  statusCard: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xl,
    gap: SPACING.lg,
  },
  
  statusContent: {
    alignItems: 'center',
    gap: SPACING.md,
  },
  
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  
  statusSubtext: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  
  cancelButton: {
    height: 56,
    borderRadius: BORDER_RADIUS.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
})
```

---

## 🔄 Execution Flow

```
1. Component mounts
   ↓
2. User fills form
   ↓
3. User clicks "Tìm chuyến xe"
   ↓
4. handleFindRide() runs
   ├─ Create ride
   ├─ Auto-assign driver
   ├─ setRideId(result._id)  ← NEW
   └─ setIsSearching(true)   ← NEW
   ↓
5. Polling useEffect triggers
   (because isSearching changed)
   ↓
6. Every 2 seconds: GET /rides/{rideId}
   ↓
7. Check if rideData.driverId exists
   ├─ NO: Continue polling
   └─ YES: 
       ├─ setDriver(...)
       ├─ setDriverFound(true)
       ├─ setIsSearching(false)
       └─ clearInterval()
   ↓
8. Component re-renders
   (driverFound = true)
   ↓
9. Shows <DriverFoundScreen />
```

---

## 📊 Before & After

### Before (Old Implementation)
```typescript
handleFindRide() {
  // Create ride
  // Auto-assign driver
  // Show alert immediately
  // Alert.alert('Thành công', '✓ Tài xế đã nhận...')
  // Done!
}
```

❌ No tracking
❌ No visual feedback of finding
❌ No way to see when driver accepts

---

### After (New Implementation)
```typescript
handleFindRide() {
  // Create ride
  // Auto-assign driver
  setRideId(result._id)       // ← NEW
  setIsSearching(true)         // ← NEW
  // Show alert about finding
}

// useEffect automatically runs
useEffect(() => {
  // Polling starts every 2s
  // Waits for rideData.driverId
  // Updates driver info when found
  // Switches to DriverFoundScreen
}, [isSearching, rideId])
```

✅ Real-time tracking
✅ Visual feedback (radar animation)
✅ Automatic UI transition
✅ Error recovery
✅ No memory leaks

---

## 🎓 Learning from This Implementation

### Pattern 1: State-based Rendering
```typescript
if (condition1) return <Screen1 />
if (condition2) return <Screen2 />
return <Screen3 />
```

### Pattern 2: Polling with useEffect
```typescript
useEffect(() => {
  const interval = setInterval(async () => {
    // Fetch data
    // Check condition
    // Update states
    // Clear interval if done
  }, 2000)
  
  return () => clearInterval(interval)
}, [dependencies])
```

### Pattern 3: Error Handling in Polling
```typescript
try {
  // Fetch data
  if (condition) {
    // Update states
  }
} catch (error) {
  // Log but don't stop polling
  // Next cycle will retry
}
```

---

## ✅ Verification Checklist

- [x] States declared
- [x] Reset function created
- [x] Polling useEffect added
- [x] handleFindRide updated
- [x] Conditional rendering added
- [x] Styles defined
- [x] DriverFoundScreen imported
- [x] Documentation created

---

**✨ Implementation is complete and ready to test!**

