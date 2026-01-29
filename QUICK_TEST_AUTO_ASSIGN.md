# 🧪 QUICK TEST - Auto-Assign Driver Confirmation

## ✅ Đã sửa lỗi

### Vấn đề cũ:
- ❌ HomeScreen vẫn có notification cũ (assignedRide)
- ❌ Conflict với modal mới trong App.js

### Đã fix:
- ✅ Xóa assignedRide notification trong HomeScreen
- ✅ Xóa test button cũ
- ✅ Giờ CHỈ dùng **AssignmentRequestModal** trong App.js (global modal)

---

## 🚀 Cách test ngay

### 1. Start Backend
```bash
cd backend
npm run start:dev
```

### 2. Start Mobile Driver
```bash
cd mobile-driver
npm start
# Chọn a (Android) hoặc i (iOS)
```

### 3. Login 2 drivers
- **Driver A**: Login, bật Online
- **Driver B**: Login, bật Online

### 4. Tạo cuốc từ Customer App

**Option 1: Dùng mobile-customer app**
- Mở HireDriverScreen
- Chọn điểm đón + đích đến
- ✅ Check "Tự động chỉ định tài xế"
- Nhấn "Book Now"

**Option 2: Dùng Postman (nhanh hơn)**
```http
POST http://10.0.2.2:3000/api/rides
Headers:
  Authorization: Bearer <CUSTOMER_TOKEN>
  Content-Type: application/json

Body:
{
  "pickupLocation": {
    "type": "Point",
    "coordinates": [106.660172, 10.762622]
  },
  "pickupAddress": "123 Lê Lợi, Q1, TP.HCM",
  "dropoffLocation": {
    "type": "Point",
    "coordinates": [106.680172, 10.782622]
  },
  "dropoffAddress": "456 Nguyễn Huệ, Q1, TP.HCM",
  "rideType": "HIRE",
  "totalFare": 125000,
  "autoAssign": true
}
```

### 5. Kiểm tra Modal

**Trong 3-5 giây**, Driver A (gần nhất) sẽ thấy:

```
┌──────────────────────────────────┐
│  🎉 Cuốc xe mới!                 │
│  Bạn nhận được yêu cầu đặt xe   │
│                                  │
│  📍 Điểm đón:                    │
│  123 Lê Lợi, Q1, TP.HCM        │
│                                  │
│  📍 Điểm đến:                    │
│  456 Nguyễn Huệ, Q1, TP.HCM     │
│                                  │
│  💰 125,000 đ                    │
│                                  │
│  ⏱️ Tự động từ chối sau 15s      │
│  [████████████░░░░] 75%         │
│                                  │
│  [Từ chối]  [Nhận cuốc]        │
└──────────────────────────────────┘
```

### 6. Test Scenarios

#### ✅ Test 1: Accept
1. Driver A nhấn **"Nhận cuốc"**
2. ✅ Modal đóng
3. ✅ Alert "Thành công"
4. ✅ Ride assigned to Driver A
5. ✅ Driver B KHÔNG thấy gì

#### ✅ Test 2: Reject → Retry
1. Driver A nhấn **"Từ chối"**
2. ✅ Modal đóng
3. ✅ Driver B nhận modal sau 3-5s
4. Driver B nhấn **"Nhận cuốc"**
5. ✅ Ride assigned to Driver B

#### ✅ Test 3: Timeout
1. Driver A không làm gì
2. ✅ Countdown: 15...14...13...1...0
3. ✅ Modal tự động đóng
4. ✅ Driver B nhận modal sau 3s

---

## 📊 Backend Logs để Monitor

Mở terminal backend, bạn sẽ thấy:

```bash
# Khi customer tạo cuốc
[AutoAssignService] Found available drivers: { total: 2, busyCount: 0 }
[AutoAssignService] Driver scores for ride 673abc123:
  - Driver A: 89.8 điểm
  - Driver B: 75.5 điểm

# Tạo request cho Driver A
[AutoAssignService] Created assignment request 674xyz for driver 671def (score: 89.8)

# Nếu Driver A accept
[AutoAssignService] Driver 671def accepted assignment request 674xyz

# Nếu Driver A reject
[AutoAssignService] Driver 671def rejected assignment request 674xyz: Tài xế từ chối
[AutoAssignService] Retry attempt 2: Created assignment request 675abc for driver 672ghi
```

---

## 🐛 Nếu Modal KHÔNG hiện

### Check 1: Polling có chạy không?
**Mobile logs:**
```
[AssignmentPolling] 🔄 Started polling for assignment requests
```

Nếu KHÔNG thấy → App.js chưa start polling

### Check 2: Driver có online không?
```bash
# MongoDB
db.drivers.find({ _id: ObjectId("...") }).pretty()
```

Phải có:
```javascript
{
  status: "online",
  isAcceptingRides: true,
  currentLocation: {
    type: "Point",
    coordinates: [106.66, 10.76]
  }
}
```

### Check 3: Token có valid không?
**Mobile logs:**
```javascript
// AsyncStorage
const token = await AsyncStorage.getItem('token')
console.log('Token:', token)
```

### Check 4: API có response không?
**Test manually:**
```bash
curl -X GET http://10.0.2.2:3000/api/rides/assignment-requests/pending \
  -H "Authorization: Bearer <DRIVER_TOKEN>"
```

Expected:
```json
[
  {
    "_id": "674abc...",
    "rideId": {...},
    "status": "pending",
    "expiresAt": "2026-01-29T..."
  }
]
```

---

## 🎯 Expected Results Checklist

Sau khi test, check:

- [ ] Modal hiện trong 3-5 giây
- [ ] Modal có đầy đủ thông tin (pickup, dropoff, fare)
- [ ] Countdown chạy từ 15 xuống 0
- [ ] Nút Accept hoạt động
- [ ] Nút Reject hoạt động
- [ ] Timeout tự động trigger sau 15s
- [ ] Retry với driver tiếp theo
- [ ] Sound notification phát
- [ ] Backend logs đúng
- [ ] Database có record assignment request

---

## 🔥 Pro Tips

### 1. Test nhanh với 1 driver
Nếu chỉ có 1 driver:
- Modal sẽ hiện bình thường
- Nếu reject → "Không có tài xế sẵn có"

### 2. Test modal trên nhiều màn hình
Khi modal hiện:
- Navigate sang TripsScreen → Modal vẫn hiện ✅
- Navigate sang MapScreen → Modal vẫn hiện ✅
- Navigate sang ProfileScreen → Modal vẫn hiện ✅

### 3. Reset nhanh nếu bị lỗi
```bash
# Xóa assignment requests cũ
mongo
use fire_go
db.assignmentrequests.deleteMany({})

# Restart backend
Ctrl+C
npm run start:dev
```

---

## ✅ Success Criteria

Modal được coi là **hoạt động tốt** nếu:
1. ✅ Hiện trong 3-5 giây
2. ✅ Countdown chính xác
3. ✅ Accept assign ride thành công
4. ✅ Reject trigger retry
5. ✅ Timeout tự động
6. ✅ Hiện trên mọi màn hình

---

**Bắt đầu test ngay! 🚀**
