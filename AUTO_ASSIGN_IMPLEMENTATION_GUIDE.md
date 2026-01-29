# AUTO-ASSIGN WITH DRIVER CONFIRMATION - IMPLEMENTATION GUIDE

## 📋 Tổng quan Flow

Khi khách hàng tạo cuốc xe với `autoAssign: true`:

1. **Backend tìm tài xế phù hợp nhất** (gần nhất, online, rảnh)
2. **Tạo AssignmentRequest** và gửi cho tài xế đó
3. **Tài xế nhận modal notification** (trên mọi màn hình)
4. **Tài xế có 15 giây** để Accept hoặc Reject
5. **Nếu Reject hoặc Timeout** → Chuyển sang tài xế tiếp theo
6. **Nếu Accept** → Ride được assign cho tài xế đó

---

## 🗂️ Các file đã tạo/sửa

### Backend

1. **assignment-request.schema.ts** (MỚI)
   - Model để track assignment requests
   - Có status: pending, accepted, rejected, timeout, cancelled
   - TTL 15 giây cho timeout

2. **auto-assign.service.ts** (SỬA)
   - `autoAssignDriver()` giờ tạo request thay vì assign luôn
   - `acceptAssignmentRequest()` - Driver accept
   - `rejectAssignmentRequest()` - Driver reject
   - `retryWithNextDriver()` - Retry logic khi reject/timeout
   - Timeout mechanism: 15 giây

3. **rides.controller.ts** (SỬA)
   - `POST /api/rides/assignment-requests/:requestId/accept`
   - `POST /api/rides/assignment-requests/:requestId/reject`
   - `GET /api/rides/assignment-requests/pending`

4. **rides.module.ts** (SỬA)
   - Import AssignmentRequest schema

### Mobile Driver

1. **assignmentRequestPollingService.ts** (MỚI)
   - Poll mỗi 3 giây để check pending requests
   - `startPolling()`, `stopPolling()`
   - `acceptRequest()`, `rejectRequest()`

2. **AssignmentRequestModal.tsx** (MỚI)
   - Global modal hiện trên mọi màn hình
   - Countdown 15 giây
   - Nút Accept/Reject
   - Animation pulse effect

3. **App.js** (SỬA)
   - Start polling service khi app load
   - Global state cho assignment request modal
   - Handle accept/reject actions

---

## 🧪 Testing Guide

### Bước 1: Start Backend
```bash
cd backend
npm run start:dev
```

### Bước 2: Chuẩn bị 2 tài xế
- **Driver A**: Đăng nhập, bật Online, ở gần điểm đón
- **Driver B**: Đăng nhập, bật Online, ở xa hơn Driver A

### Bước 3: Khách hàng tạo cuốc với Auto-Assign
Trong mobile-customer app:
```typescript
// HireDriverScreen.tsx
const [autoAssign, setAutoAssign] = useState(true) // Bật auto-assign

// Khi tạo cuốc
const rideData = {
  pickupLocation: {...},
  dropoffLocation: {...},
  autoAssign: true, // ✅ Quan trọng
}
```

### Bước 4: Kiểm tra Flow

**Test Case 1: Driver Accept**
1. Customer tạo cuốc với autoAssign = true
2. Driver A (gần nhất) nhận được modal notification
3. Driver A nhấn "Nhận cuốc"
4. ✅ Ride được assign cho Driver A
5. Driver B không nhận gì cả

**Test Case 2: Driver Reject → Retry**
1. Customer tạo cuốc với autoAssign = true
2. Driver A (gần nhất) nhận được modal notification
3. Driver A nhấn "Từ chối"
4. 🔄 Hệ thống gửi request cho Driver B (xa hơn)
5. Driver B nhận được modal notification
6. Driver B nhấn "Nhận cuốc"
7. ✅ Ride được assign cho Driver B

**Test Case 3: Timeout → Retry**
1. Customer tạo cuốc với autoAssign = true
2. Driver A nhận được modal notification
3. Driver A không làm gì (đợi 15 giây)
4. ⏱️ Request timeout tự động
5. 🔄 Hệ thống gửi request cho Driver B
6. Driver B nhận được modal notification

**Test Case 4: Không còn tài xế**
1. Customer tạo cuốc
2. Tất cả drivers reject hoặc timeout
3. ❌ Ride status = "no_driver_available"
4. Event `ride.no_driver_available` được emit

---

## 📊 Backend Logs để Monitor

Khi test, check backend console:

```
[AutoAssignService] Driver scores for ride 673abc...
[AutoAssignService] Created assignment request 674xyz for driver 671def (score: 87.5)
[AutoAssignService] Driver 671def accepted assignment request 674xyz
```

Hoặc khi reject:

```
[AutoAssignService] Driver 671def rejected assignment request 674xyz: Tài xế từ chối
[AutoAssignService] Retry attempt 2: Created assignment request 675abc for driver 672ghi
```

---

## 🔧 Cấu hình

### Thay đổi timeout (default 15s)
```typescript
// auto-assign.service.ts
private readonly REQUEST_TIMEOUT_SECONDS = 15; // Đổi thành 30 nếu muốn
```

### Thay đổi polling interval (default 3s)
```typescript
// assignmentRequestPollingService.ts
private pollingInterval = 3000 // Đổi thành 5000 nếu muốn
```

### Thay đổi scoring weights
```typescript
// auto-assign.service.ts
private async calculateDriverScore() {
  const distanceScore = ... // 40%
  const ratingScore = ... // 30%
  const completionScore = ... // 20%
  const onlineTimeScore = ... // 10%
}
```

---

## 🐛 Debugging Tips

### 1. Modal không hiện
Check:
- Polling service có start không? → Check log `[AssignmentPolling] 🔄 Started polling`
- Driver có online không? → Check `driver.status === 'online'`
- Token có valid không? → Check AsyncStorage token

### 2. Không tìm thấy tài xế
Check:
- Driver có `isAcceptingRides: true` không?
- Driver có `currentLocation` không?
- Driver có đang bận cuốc khác không?

### 3. Retry không hoạt động
Check backend logs:
- `retryWithNextDriver` có được gọi không?
- Còn driver nào chưa được request không?

### 4. AssignmentRequest Model chưa đăng ký
```bash
# Nếu gặp lỗi "Cannot find model AssignmentRequest"
# Check rides.module.ts đã import schema chưa
MongooseModule.forFeature([
  { name: AssignmentRequest.name, schema: AssignmentRequestSchema },
])
```

---

## 📱 Mobile Driver - Modal xuất hiện trên MỌI màn hình

Modal được render trong `App.js` → hiện trên tất cả screens:
- HomeScreen
- MapScreen
- TripsScreen
- EarningsScreen
- ProfileScreen
- ActiveRideScreen
- ...

Không cần thêm modal vào từng screen!

---

## 🎯 Next Steps (Optional Enhancements)

1. **Socket.IO thay vì polling** → Real-time push notification
2. **Push notifications** → Notify driver khi app ở background
3. **Driver preferences** → Auto-reject rides xa hơn X km
4. **Priority queue** → VIP customers được ưu tiên
5. **Analytics** → Track acceptance rate, avg response time

---

## ✅ Checklist trước khi test

- [ ] Backend đang chạy (`npm run start:dev`)
- [ ] MongoDB đang chạy
- [ ] 2+ drivers đã đăng nhập và online
- [ ] Drivers có `currentLocation` đã được update
- [ ] Customer app có checkbox "Tự động chỉ định tài xế"
- [ ] Driver app có file `AssignmentRequestModal.tsx`
- [ ] Driver app có file `assignmentRequestPollingService.ts`
- [ ] `App.js` đã import và render `AssignmentRequestModal`

---

## 📞 Support

Nếu có lỗi, check:
1. Backend logs → `npm run start:dev`
2. Mobile logs → React Native debugger
3. Network tab → Check API calls
4. MongoDB → Check `assignmentrequests` collection

Good luck! 🚀
