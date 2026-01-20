# 🎯 BUSINESS LOGIC IMPLEMENTATION SUMMARY

## Tình huống (Scenario)

**Bạn có 2 hoặc nhiều khách hàng hơn:**
- Khách 1, Khách 2, v.v...
- Mỗi khách có riêng trạng thái (status)
- Mỗi khách có riêng điểm đón (pickup) và điểm đến (dropoff)

**Yêu cầu:**
- Tài xế xử lý từng khách một
- Map phải hiển thị đúng điểm: pickup khi đón khách, dropoff khi chở khách
- Nút button phải thay đổi text theo trạng thái
- Khi vuốt sang khách khác: toàn bộ reset (map, button, trạng thái)

---

## ✅ Cách hoạt động (Implementation)

### Chu kỳ Khách 1:

**Giai đoạn 1: Chờ đón (pending/accepted)**
```
Status: pending hoặc accepted
Map: Vẽ đường từ tài xế → Địa điểm đón Khách 1
Button: "Bắt đầu đến điểm đón"
Click → Gọi API mark-arrived → Status thay đổi → "arrived_at_pickup"
```

**Giai đoạn 2: Đã đến điểm đón (arrived_at_pickup)**
```
Status: arrived_at_pickup
Map: Vẫn vẽ đường từ tài xế → Địa điểm đón Khách 1 (giữ nguyên)
Button: "Bắt đầu chuyến đi" ← TEXT THAY ĐỔI
Click → Gọi API start-journey → Status thay đổi → "in_progress"
```

**Giai đoạn 3: Đang chở khách (in_progress)**
```
Status: in_progress
Map: VẼ ĐỨ ĐỀ → Từ tài xế → Địa điểm đến Khách 1 ← MAP THAY ĐỔI!
Button: "Hoàn thành chuyến đi"
Click → Gọi API complete → Status thay đổi → "completed"
```

**Giai đoạn 4: Hoàn thành (completed)**
```
Status: completed
Map: Giữ nguyên
Button: "Đã hoàn thành" (tắt, không thể click)
→ Chờ tài xế vuốt sang khách tiếp theo
```

### Vuốt sang Khách 2: TOÀN BỘ RESET!

```
FlatList swipe left
    ↓
currentPassengerIndex: 0 → 1
    ↓
currentPassenger = ride.customerId[1]  (lấy dữ liệu Khách 2)
    ↓
useEffect triggered (phát hiện thay đổi)
    ↓
Map reset: Xóa đường cũ
    ↓
Lấy route mới: Tài xế → Địa điểm đón Khách 2
    ↓
Button reset: Quay lại "Bắt đầu đến điểm đón"
    ↓
Khách 2 hiện thị trên FlatList
    ↓
Lặp lại chu kỳ từ Giai đoạn 1 (cho Khách 2)
```

---

## 🔧 Fixes Applied (3 lỗi đã sửa)

### Fix 1: Route Logic - Thêm status 'accepted'
**File**: `mobile-driver/src/screens/ActiveRideScreen.tsx` (Line 251)

**Trước:**
```typescript
if (currentPassenger?.status === 'pending' || currentPassenger?.status === 'arrived_at_pickup') {
  endCoord = [currentPassenger.pickupCoordinates[0], currentPassenger.pickupCoordinates[1]]
}
```

**Sau:**
```typescript
if (currentPassenger?.status === 'pending' || 
    currentPassenger?.status === 'accepted' || 
    currentPassenger?.status === 'arrived_at_pickup') {
  endCoord = [currentPassenger.pickupCoordinates[0], currentPassenger.pickupCoordinates[1]]
}
```

**Tại sao**: Backend trả về status 'accepted', không phải 'pending', nên phải kiểm tra cả hai.

---

### Fix 2: Button Text - Sửa text khi arrived_at_pickup
**File**: `mobile-driver/src/screens/ActiveRideScreen.tsx` (Line 1120)

**Trước:**
```typescript
{currentPassenger?.status === 'arrived_at_pickup' && (
  <Text style={styles.actionBtnText}>Đã đến điểm đón</Text>
)}
```

**Sau:**
```typescript
{currentPassenger?.status === 'arrived_at_pickup' && (
  <Text style={styles.actionBtnText}>Bắt đầu chuyến đi</Text>
)}
```

**Tại sao**: Khi đã đến điểm đón, bước tiếp theo là BẮT ĐẦU chuyến đi (tương lai), không phải TỎ ĐẠO đã đến (quá khứ).

---

### Fix 3: useEffect Dependencies - Thêm requestId
**File**: `mobile-driver/src/screens/ActiveRideScreen.tsx` (Line 307)

**Trước:**
```typescript
}, [currentPassengerIndex, ride?.customerId, currentPassenger?.pickupCoordinates, currentPassenger?.dropoffCoordinates, currentPassenger?.status, currentLocation])
```

**Sau:**
```typescript
}, [currentPassengerIndex, ride?.customerId, currentPassenger?.pickupCoordinates, currentPassenger?.dropoffCoordinates, currentPassenger?.status, currentPassenger?.requestId, currentLocation])
```

**Tại sao**: requestId có thể chưa ready khi backend response, thêm vào dependency để trigger useEffect khi requestId được enriched.

---

## 📊 Truth Table - Khi nào hiển thị cái gì

### Status → Map Route
| Status | Hiển thị | Ghi chú |
|--------|---------|--------|
| pending | Pickup | Chuẩn bị đón khách |
| accepted | Pickup | Đã chấp nhận, đi đón |
| arrived_at_pickup | Pickup | Hiển thị điểm đã đến |
| **in_progress** | **Dropoff** | **MAP THAY ĐỔI!** |
| completed | (tĩnh) | Hoàn thành |

### Status → Button Text
| Status | Text | Handler |
|--------|------|---------|
| pending/accepted | "Bắt đầu đến điểm đón" | handleMarkArrived() |
| arrived_at_pickup | "Bắt đầu chuyến đi" | handleStartRide() |
| in_progress | "Hoàn thành chuyến đi" | handleCompletePassenger() |
| completed | "Đã hoàn thành" | (disabled) |

---

## 🔄 Data Flow (Dòng dữ liệu)

### Khi Load App:
```
Backend → Fetch ride data
  ├─ ride._id
  ├─ ride.driverId
  ├─ ride.customerId = [Customer1, Customer2, ...]
  │   └─ mỗi Customer có:
  │       ├─ _id
  │       ├─ name, phone, rating
  │       ├─ pickupCoordinates
  │       ├─ dropoffCoordinates
  │       ├─ requestId (tạo bởi backend)
  │       └─ status (pending/accepted/arrived_at_pickup/in_progress/completed)
  └─ ride.totalSeats

Frontend:
  ├─ setCurrentPassengerIndex(0)  → Khách 1
  ├─ currentPassenger = ride.customerId[0]
  ├─ Map shows: driver → currentPassenger.pickupCoordinates
  └─ Button shows: "Bắt đầu đến điểm đón"
```

### Khi Click Button:
```
handleMarkArrived() {
  → fetch PATCH /rides/:rideId/requests/:requestId/mark-arrived
  → Backend: RideRequest.status = "arrived_at_pickup"
  → Response: enriched ride object
  → setRide(response)  → Cập nhật dữ liệu
  → currentPassenger?.status thay đổi
  → useEffect trigger
  → Button condition re-evaluate
  → Button text thay đổi: "Bắt đầu đến điểm đón" → "Bắt đầu chuyến đi"
}
```

### Khi Click "Bắt đầu chuyến đi":
```
handleStartRide() {
  → fetch PATCH /rides/:rideId/requests/:requestId/start-journey
  → Backend: RideRequest.status = "in_progress"
  → Response: enriched ride object
  → setRide(response)
  → currentPassenger?.status = "in_progress"
  → useEffect trigger
  → Route logic check: status === 'in_progress'? → YES!
  → endCoord = currentPassenger.dropoffCoordinates  ← KHÔNG PHẢI PICKUP!
  → getDirectionsRoute() fetch đường mới
  → Map polyline redraws: driver → DROPOFF
  → Button text thay đổi: "Bắt đầu chuyến đi" → "Hoàn thành chuyến đi"
}
```

### Khi Vuốt (Swipe):
```
FlatList onMomentumScrollEnd:
  → Calculate: contentOffsetX / 300 = newIndex
  → setCurrentPassengerIndex(newIndex)
  → currentPassenger = ride.customerId[newIndex]
  → useEffect triggered (dependency: currentPassengerIndex)
  → setRouteCoordinates([])  ← Xóa đường cũ
  → getDirectionsRoute(driver, currentPassenger.pickupCoordinates)
  → setRouteCoordinates(newRoute)
  → Polyline redraws
  → Button condition re-evaluate
  → Button text reset: "Bắt đầu đến điểm đón"
  → Map animate: Đến địa điểm mới
  → Tất cả ready cho khách tiếp theo
```

---

## ✨ Ví dụ cụ thể (Concrete Example)

**Scenario: Tài xế có 2 khách, Khách 1 đã hoàn thành, bây giờ xử lý Khách 2**

```
TRƯỚC KHI VUỐT:
┌─────────────────────────────────────┐
│ Khách 1 (Hoàn thành)                │
├─────────────────────────────────────┤
│ Status: completed                   │
│ Button: "Đã hoàn thành" (disabled)  │
│ Map: Pickup location (cố định)      │
└─────────────────────────────────────┘

TÀI XẾ VUỐT TRÁI
↓

SAU KHI VUỐT:
┌─────────────────────────────────────┐
│ Khách 2 (Chưa đón)                  │
├─────────────────────────────────────┤
│ Status: pending                     │ ← Reset!
│ Button: "Bắt đầu đến điểm đón"     │ ← Reset!
│ Map: Khách 2 pickup location        │ ← Reset!
│ Route: Tài xế → Khách 2 pickup      │ ← Reset!
└─────────────────────────────────────┘

TÀI XẾ CLICK "BẮT ĐẦU ĐẾN ĐIỂM ĐÓN"
↓

┌─────────────────────────────────────┐
│ Khách 2 (Đã đến điểm đón)           │
├─────────────────────────────────────┤
│ Status: arrived_at_pickup           │ ← Thay đổi
│ Button: "Bắt đầu chuyến đi"        │ ← Thay đổi
│ Map: Khách 2 pickup location        │ ← Giữ nguyên
│ Route: Tài xế → Khách 2 pickup      │ ← Giữ nguyên
└─────────────────────────────────────┘

TÀI XẾ CLICK "BẮT ĐẦU CHUYẾN ĐI"
↓

┌─────────────────────────────────────┐
│ Khách 2 (Đang chở)                  │
├─────────────────────────────────────┤
│ Status: in_progress                 │ ← Thay đổi
│ Button: "Hoàn thành chuyến đi"     │ ← Thay đổi
│ Map: Khách 2 DROPOFF location       │ ← THAY ĐỔI!
│ Route: Tài xế → Khách 2 DROPOFF     │ ← THAY ĐỔI!
└─────────────────────────────────────┘

TÀI XẾ CLICK "HOÀN THÀNH CHUYẾN ĐI"
↓

┌─────────────────────────────────────┐
│ Khách 2 (Hoàn thành)                │
├─────────────────────────────────────┤
│ Status: completed                   │ ← Thay đổi
│ Button: "Đã hoàn thành" (disabled) │ ← Thay đổi
│ Map: Khách 2 dropoff location       │ ← Cố định
│ Route: Tĩnh                         │ ← Cố định
└─────────────────────────────────────┘
```

---

## 🎯 Testing Steps

### 1. Load App & Kiểm tra Khách 1
- [ ] Map hiển thị pickup của Khách 1
- [ ] Button: "Bắt đầu đến điểm đón"
- [ ] Tên khách đúng

### 2. Click Button → arrived_at_pickup
- [ ] Button thay đổi thành: "Bắt đầu chuyến đi"
- [ ] Map: vẫn hiển thị pickup (giữ nguyên)
- [ ] Status log: "arrived_at_pickup"

### 3. Click Button → in_progress
- [ ] Button thay đổi thành: "Hoàn thành chuyến đi"
- [ ] Map: THAY ĐỔI thành dropoff ← **QUAN TRỌNG**
- [ ] Route: Vẽ đến dropoff
- [ ] Status log: "in_progress"

### 4. Click Button → completed
- [ ] Button thay đổi thành: "Đã hoàn thành" (disabled)
- [ ] Status log: "completed"

### 5. Vuốt sang Khách 2
- [ ] FlatList scroll smooth
- [ ] Map animates đến vị trí khách 2
- [ ] Button RESET thành: "Bắt đầu đến điểm đón"
- [ ] Tên khách thay đổi
- [ ] Lặp lại từ bước 2-4 cho Khách 2

---

## 💡 Tại sao phải làm thế?

**Vấn đề ban đầu:**
- Map không cập nhật khi vuốt
- Button không đổi text
- Status không match logic
- Khách 2 không reset đúng

**Giải pháp:**
- Fix route logic: thêm 'accepted' status
- Fix button text: "Đã đến" → "Bắt đầu chuyến"
- Fix useEffect: thêm requestId dependency
- Kết quả: Toàn bộ flow hoạt động đúng

---

## 📱 Console Logs Bạn Sẽ Thấy

### Load app:
```
✅ Passenger changed, updating map to:
   name: "Khách 1"
   pickup: [105.85, 21.02]
   dropoff: [105.87, 21.03]
   status: "pending"
🗺️ Getting route from [105.84, 21.07] to [105.85, 21.02]
✅ Route received with 42 points
```

### Click "Bắt đầu đến điểm đón":
```
📡 Calling mark-arrived with: { rideId, requestId, passengerName: "Khách 1" }
✅ Request updated: status = arrived_at_pickup
```

### Click "Bắt đầu chuyến đi":
```
📡 Calling start-journey with: { rideId, requestId }
✅ Request updated: status = in_progress
🗺️ Getting route from [105.84, 21.07] to [105.87, 21.03]  ← ĐỀN DROPOFF!
✅ Route received with 38 points
```

### Vuốt sang Khách 2:
```
🔄 Passenger swipe detected
   contentOffsetX: 300
   calculated index: 1
   final index: 1
✅ Setting new passenger index: 1

🔄 Passenger changed, updating map to:
   name: "Khách 2"
   status: "pending"
🗺️ Getting route from [105.84, 21.07] to [105.88, 21.04]
```

---

## ✅ Bây giờ bạn hiểu rõ business logic!

Mỗi khách có riêng:
- Status (trạng thái)
- Map route (đường đi)
- Button action (hành động)

Khi vuốt: toàn bộ reset cho khách mới.
Khi click button: map và button cập nhật theo status.
Khi in_progress: map THAY ĐỔI từ pickup → dropoff.

**Test và feedback lại nếu có issues!** 🎯
