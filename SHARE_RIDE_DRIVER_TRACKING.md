# Hướng dẫn Tracking Tài xế - Ghép Xe (Share Ride)

## 📋 Tổng quát
Khi người dùng đặt cuốc xe ghép, hệ thống sẽ:
1. Tạo cuốc xe trong database
2. Tự động chỉ định tài xế
3. **Polling** để lấy thông tin tài xế mỗi 2 giây
4. Hiển thị màn hình "Đang tìm tài xế"
5. Khi tài xế nhận → Hiển thị "Tài xế đã tìm thấy"

---

## 🔄 State Management

### Tracking States:
```typescript
// Trạng thái tìm kiếm
const [isSearching, setIsSearching] = useState(false)       // Đang tìm tài xế?
const [driverFound, setDriverFound] = useState(false)       // Tài xế tìm thấy?
const [rideId, setRideId] = useState<string | null>(null)   // ID cuốc xe
const [driver, setDriver] = useState<any>(null)             // Thông tin tài xế
const [driverLocation, setDriverLocation] = useState<any>(null) // Vị trí tài xế
```

---

## 🎯 Quy trình Hoạt động

### 1️⃣ Khi nhấn "Tìm chuyến xe"
```typescript
const result = await rideService.createRide(rideData, user.id)
const assignedRide = await rideService.autoAssignDriver(result._id)

// Set searching state
setRideId(result._id)        // Lưu ID cuốc xe
setIsSearching(true)          // Bắt đầu polling
```

### 2️⃣ Polling Driver Status (Mỗi 2 giây)
```typescript
useEffect(() => {
  if (!isSearching || !rideId) return

  const pollInterval = setInterval(async () => {
    const rideData = await rideService.getRideById(rideId)
    
    // Kiểm tra xem tài xế đã nhận chưa
    if (rideData.driverId) {
      setDriver(mapDriverData(rideData.driverId))
      setDriverFound(true)
      setIsSearching(false)
    }
  }, 2000)

  return () => clearInterval(pollInterval)
}, [isSearching, rideId])
```

### 3️⃣ Hiển thị UI theo Trạng thái

#### A. Đang tìm tài xế (isSearching = true)
```typescript
if (isSearching && routeInfo) {
  return (
    <View style={styles.findingContainer}>
      {/* Bản đồ với tuyến đường */}
      <MapViewComponent ... />

      {/* Thẻ trạng thái với radar animation */}
      <View style={styles.statusCard}>
        <RadarAnimation />
        <Text>Đang tìm tài xế</Text>
        <CancelButton />
      </View>
    </View>
  )
}
```

**Hiển thị:**
- 🗺️ Bản đồ toàn màn hình với pickup/dropoff
- 📡 Radar animation (3 vòng tròn pulse)
- ❌ Nút "Hủy chuyến"

#### B. Tài xế tìm thấy (driverFound = true)
```typescript
if (driverFound && routeInfo && driver) {
  return (
    <DriverFoundScreen
      driver={driver}
      routeInfo={routeInfo}
      onChat={() => {}}
      onCancel={resetShareRideState}
    />
  )
}
```

**Hiển thị:**
- 👤 Thông tin tài xế (tên, rating, xe)
- 📞 Nút gọi điện
- 💬 Nút chat
- ❌ Nút hủy chuyến
- 🗺️ Bản đồ với vị trí tài xế

---

## 🔍 Chi tiết Polling Logic

### Mục đích:
- Lấy dữ liệu cuốc xe từ backend mỗi 2 giây
- Kiểm tra xem tài xế đã nhận (`rideData.driverId` không null)
- Nếu có → Lưu thông tin tài xế và dừng polling

### Dữ liệu lấy về:
```typescript
{
  _id: "ride-123",
  driverId: {
    _id: "driver-456",
    firstName: "Minh",
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
  driverLocation: [105.8542, 21.0285],  // [longitude, latitude]
  ...
}
```

### Reset Function:
```typescript
const resetShareRideState = () => {
  setIsSearching(false)
  setDriverFound(false)
  setDriver(null)
  setDriverLocation(null)
  setRideId(null)
}
```

---

## 🎨 UI States Diagram

```
┌─────────────────────────────────────┐
│    Nhập địa điểm & Tính giá         │  (Normal HomeScreen)
└────────────┬────────────────────────┘
             │ Nhấn "Tìm chuyến xe"
             ▼
┌─────────────────────────────────────┐
│  Đang tìm tài xế (isSearching=true) │
│  - Map toàn màn hình                │
│  - Radar animation                  │
│  - Cancel button                    │
└────────────┬────────────────────────┘
             │ Polling... rideData.driverId ≠ null
             │ (Mỗi 2 giây)
             ▼
┌─────────────────────────────────────┐
│  Tài xế tìm thấy (driverFound=true) │
│  - DriverFoundScreen                │
│  - Thông tin tài xế                 │
│  - Chat & Call buttons              │
└─────────────────────────────────────┘
```

---

## 📱 Phân biệt với Hire Ride

| Tính năng | Share Ride | Hire Ride |
|-----------|-----------|----------|
| **Phí cơ bản** | 10k VND | Tùy theo xe |
| **Tính giá** | Tự động | Manual (nút Tính giá) |
| **Thông tin xe** | Hiển thị sau khi tìm | Nhập trước |
| **Polling** | 2 giây | 2 giây |
| **Màn hình tìm** | Tương tự | DriverFoundScreen |

---

## ⚠️ Các trường hợp Lỗi

### 1. Polling không nhận được driverId
```typescript
// Vẫn tiếp tục polling mỗi 2 giây
// Nếu user click Cancel → dừng polling
```

### 2. Network error
```typescript
catch (error) {
  console.error('[HomeScreen] Polling error:', error)
  // Vẫn tiếp tục polling (không dừng)
}
```

### 3. Invalid driverData
```typescript
if (!driverData || !driverData._id) {
  console.warn('[HomeScreen] Invalid driverData')
  return // Skip cập nhật, tiếp tục polling
}
```

---

## 🔧 Debugging Tips

### 1. Kiểm tra Console Logs
```typescript
[HomeScreen] Polling ride data for rideId: ride-123
[HomeScreen] Ride data: { _id: "ride-123", driverId: {...} }
[HomeScreen] Driver found: driver-456
```

### 2. Kiểm tra State
```typescript
console.log('isSearching:', isSearching)
console.log('driverFound:', driverFound)
console.log('rideId:', rideId)
console.log('driver:', driver)
```

### 3. Kiểm tra Backend Response
```typescript
// GET /rides/{rideId}
{
  _id: "ride-123",
  driverId: {
    _id: "driver-456",
    firstName: "Minh",
    ...
  }
}
```

---

## 📞 Test Flow

### Mock Test (Offline):
1. ✅ Nhập "Tô Tịch" → "Tây Hồ"
2. ✅ Hệ thống tính giá
3. ✅ Nhấn "Tìm chuyến xe"
4. ✅ Hiển thị "Đang tìm tài xế"
5. ✅ Nhấn Cancel → Quay lại

### Real Test (Online):
1. ✅ Có backend và driver
2. ✅ Polling nhận được driverId ≠ null
3. ✅ Chuyển sang DriverFoundScreen
4. ✅ Hiển thị thông tin tài xế chính xác

---

## 🚀 Performance Optimization

### 1. Polling Interval
- **Hiện tại:** 2 giây
- **Có thể tăng nếu:** Cần tiết kiệm bandwidth → 3-5 giây
- **Có thể giảm nếu:** Cần real-time hơn → 1 giây

### 2. State Updates
```typescript
// ✅ Tốt: Chỉ update khi driverData thay đổi
if (rideData.driverId) {
  setDriver(newDriver)
  setDriverFound(true)
  clearInterval(pollInterval)
}

// ❌ Tránh: Update mỗi polling
setRideData(rideData) // Mỗi 2 giây
```

### 3. Memory Leak Prevention
```typescript
useEffect(() => {
  const pollInterval = setInterval(...)
  
  // ✅ Cleanup interval
  return () => clearInterval(pollInterval)
}, [isSearching, rideId])
```

---

## 📝 Tóm tắt

| Bước | Action | State |
|------|--------|-------|
| 1 | Nhập địa điểm | isSearching = false |
| 2 | Nhấn "Tìm chuyến" | isSearching = true, rideId = set |
| 3 | Polling... | setInterval mỗi 2 giây |
| 4 | Tài xế nhận | driverId ≠ null |
| 5 | Update driver | driverFound = true |
| 6 | Hiển thị driver | DriverFoundScreen |

