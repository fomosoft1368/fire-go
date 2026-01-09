# 📝 Code Reference - Driver Tracking Implementation

## 1️⃣ State Declaration

```typescript
// Share ride - Driver finding states
const [isSearching, setIsSearching] = useState(false)
const [driverFound, setDriverFound] = useState(false)
const [driver, setDriver] = useState<any>(null)
const [driverLocation, setDriverLocation] = useState<any>(null)
const [rideId, setRideId] = useState<string | null>(null)
```

---

## 2️⃣ Reset Function

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

---

## 3️⃣ Polling Effect Hook

```typescript
// Polling để lấy thông tin tài xế khi có tài xế nhận cuốc
useEffect(() => {
  if (!isSearching || !rideId) {
    return
  }

  console.log('[HomeScreen] Polling ride data for rideId:', rideId)
  
  const pollInterval = setInterval(async () => {
    try {
      const rideData = await rideService.getRideById(rideId)
      console.log('[HomeScreen] Ride data:', rideData)

      if (!rideData || typeof rideData !== 'object') {
        console.warn('[HomeScreen] Invalid rideData:', rideData)
        return
      }

      // Nếu tài xế đã nhận cuốc (có driverId)
      if (rideData.driverId) {
        const driverData = rideData.driverId
        
        if (!driverData || !driverData._id) {
          console.warn('[HomeScreen] Invalid driverData:', driverData)
          return
        }

        console.log('[HomeScreen] Driver found:', driverData._id)
        
        // Map dữ liệu từ API sang format UI
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

        setDriverLocation({
          latitude: rideData.driverLocation?.[1] || 21.0285,
          longitude: rideData.driverLocation?.[0] || 105.8542,
        })

        setDriverFound(true)
        setIsSearching(false)
        clearInterval(pollInterval)
      }
    } catch (error) {
      console.error('[HomeScreen] Polling error:', error)
      // Continue polling on next interval
    }
  }, 2000) // 2 giây

  return () => clearInterval(pollInterval)
}, [isSearching, rideId])
```

---

## 4️⃣ Handle Find Ride

```typescript
const handleFindRide = async () => {
  try {
    // Validation
    if (!pickupLocation.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập điểm đón')
      return
    }
    
    if (!dropoffLocation.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập điểm đến')
      return
    }

    if (!user?.id) {
      Alert.alert('Lỗi', 'Vui lòng đăng nhập trước')
      return
    }

    // Nếu chưa tính giá
    if (!routeInfo || !fareEstimate) {
      Alert.alert('Chưa tính giá', 'Vui lòng đợi hệ thống tính toán!')
      return
    }

    setIsLoading(true)

    // Tạo cuốc xe ghép
    const rideData = {
      rideType: 'share' as const,
      pickupAddress: routeInfo.pickup.formattedAddress,
      pickupCoordinates: [
        routeInfo.pickup.coordinates.longitude,
        routeInfo.pickup.coordinates.latitude,
      ],
      dropoffAddress: routeInfo.dropoff.formattedAddress,
      dropoffCoordinates: [
        routeInfo.dropoff.coordinates.longitude,
        routeInfo.dropoff.coordinates.latitude,
      ],
      distance: routeInfo.distance,
      duration: routeInfo.duration,
      baseFare: fareEstimate.baseFare,
      distanceFare: fareEstimate.distanceFare,
      timeFare: fareEstimate.timeFare,
      passengers: passengerCount,
    }

    const result = await rideService.createRide(rideData, user.id)
    
    // 🚀 Tự động chỉ định tài xế
    const assignedRide = await rideService.autoAssignDriver(result._id)
    
    // ✅ Set searching state to track driver
    setRideId(result._id)
    setIsSearching(true)
    
    setTimeout(() => {
      setIsLoading(false)
      Alert.alert(
        'Thành công',
        `✓ Cuốc xe đã được tạo!\n\nHệ thống đang tìm tài xế phù hợp cho bạn...`,
        [
          { 
            text: 'OK', 
            onPress: () => {
              console.log('Ride created:', assignedRide)
            } 
          },
        ]
      )
    }, 500)

    console.log('Ride created and assigned:', assignedRide)
  } catch (error: any) {
    setIsLoading(false)
    Alert.alert('Lỗi', error.message || 'Không thể tạo cuốc xe')
    console.error('Error:', error)
  }
}
```

---

## 5️⃣ Conditional Rendering

```typescript
// Show driver found screen khi tài xế được tìm thấy
if (driverFound && routeInfo && driver) {
  return (
    <DriverFoundScreen
      driver={driver}
      routeInfo={routeInfo}
      onChat={() => {
        console.log('Chat with driver:', driver.id)
      }}
      onCancel={resetShareRideState}
    />
  )
}

// Show finding driver overlay
if (isSearching && routeInfo) {
  return (
    <View style={[styles.findingContainer, { backgroundColor: colors.bg }]}>
      <MapViewComponent
        height={null}
        initialRegion={{
          latitude: routeInfo.pickup.coordinates.latitude,
          longitude: routeInfo.pickup.coordinates.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        markers={[]}
        pickupCoords={{
          latitude: routeInfo.pickup.coordinates.latitude,
          longitude: routeInfo.pickup.coordinates.longitude,
        }}
        dropoffCoords={{
          latitude: routeInfo.dropoff.coordinates.latitude,
          longitude: routeInfo.dropoff.coordinates.longitude,
        }}
        routeCoordinates={routeInfo.routeCoordinates || []}
        onLocationSelect={() => {}}
      />

      {/* Finding Driver Status Card */}
      <View style={[styles.statusCard, { backgroundColor: colors.bgSecondary, borderTopColor: colors.border }]}>
        <View style={styles.statusContent}>
          {/* Radar animation */}
          <View style={styles.radarContainer}>
            <View style={[styles.radarPulse, styles.radarRing1, { borderColor: `${colors.primary}50` }]} />
            <View style={[styles.radarPulse, styles.radarRing2, { borderColor: `${colors.primary}30` }]} />
            <View style={[styles.radarPulse, styles.radarRing3, { borderColor: `${colors.primary}10` }]} />
            <View style={styles.radarCenter} />
          </View>
          
          <Text style={[styles.statusText, { color: colors.text }]}>
            Đang tìm tài xế
          </Text>
          <Text style={[styles.statusSubtext, { color: colors.textSecondary }]}>
            Sẽ sớm có tài xế nhận chuyến
          </Text>
        </View>

        {/* Cancel button */}
        <TouchableOpacity
          style={[styles.cancelButton, { backgroundColor: colors.border }]}
          onPress={() => {
            resetShareRideState()
            setPickupLocation('')
            setDropoffLocation('')
            setRouteInfo(null)
            setFareEstimate(null)
          }}
        >
          <MaterialIcons name="close" size={20} color={colors.text} />
          <Text style={[styles.cancelButtonText, { color: colors.text }]}>Hủy chuyến</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}
```

---

## 6️⃣ Styles for Finding Driver Screen

```typescript
const styles = StyleSheet.create({
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
  radarRing1: {
    width: 80,
    height: 80,
  },
  radarRing2: {
    width: 120,
    height: 120,
  },
  radarRing3: {
    width: 160,
    height: 160,
  },
  radarCenter: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FF6B00',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 0 },
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

## 7️⃣ Import Statements

```typescript
import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  Switch,
  Dimensions,
  ActivityIndicator,
  Alert,
  StatusBar,
  FlatList,
} from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { useSelector } from 'react-redux'
import type { RootState } from '../redux/store'
import { COLORS_DARK, COLORS_LIGHT, SPACING, BORDER_RADIUS } from '../constants'
import MapViewComponent from '../components/MapView'
import HireDriverScreen from './HireDriverScreen'
import DriverFoundScreen from './DriverFoundScreen'  // ← NEW
import FindingRideModal from '../components/FindingRideModal'
import { rideService } from '../services/rideService'
import { mapsService } from '../services/mapsService'
```

---

## 8️⃣ Key Points

### Polling Interval
```typescript
// Current: 2 seconds
const pollInterval = setInterval(..., 2000)

// Can adjust based on needs:
// 1000  = 1 second (real-time, more requests)
// 2000  = 2 seconds (balanced)
// 5000  = 5 seconds (less requests, slower update)
```

### Stop Polling
```typescript
// Stop immediately when driver found
clearInterval(pollInterval)

// Stop on unmount
return () => clearInterval(pollInterval)
```

### Error Handling
```typescript
// Continue polling on error
catch (error) {
  console.error('[HomeScreen] Polling error:', error)
  // No clearInterval - will retry next cycle
}
```

### State Guard
```typescript
// Check dependencies before polling
if (!isSearching || !rideId) {
  return  // Don't start polling
}
```

---

## 9️⃣ Testing Code

```typescript
// Test 1: Manual state change
const testFindDriver = () => {
  setRideId('test-123')
  setIsSearching(true)
  
  // Polling should start automatically
  // After 2 seconds, polling runs
  
  // Simulate driver found
  setTimeout(() => {
    setDriver({
      id: 'test-driver',
      name: 'Test Driver',
      phone: '0123456789',
      avatar: '',
      rating: 4.9,
      reviews: 100,
      vehicle: { model: 'Test Car', licensePlate: 'TEST 123', color: 'Blue' },
    })
    setDriverFound(true)
    setIsSearching(false)
  }, 2000)
}

// Test 2: Check console logs
// [HomeScreen] Polling ride data for rideId: test-123
// [HomeScreen] Ride data: {...}
// [HomeScreen] Driver found: test-driver

// Test 3: Check state changes
console.log({ isSearching, driverFound, rideId, driver })
```

---

## 🔟 Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Polling never stops | driverFound not set to true | Check if `rideData.driverId` exists |
| Forever loading | Polling interval not cleared | Add `clearInterval(pollInterval)` |
| Memory leak | useEffect cleanup missing | Add `return () => clearInterval(...)` |
| Wrong driver shown | Data mapping error | Check API response format |
| UI not updating | State not changing | Verify `setDriver()` is called |
| App crashes on unmount | Timeout trying to set state | Cleanup polling in useEffect return |

