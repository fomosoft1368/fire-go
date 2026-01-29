# 🚗 Auto-Assign Driver với Driver Confirmation

## 📄 Tổng quan

Hệ thống tự động chỉ định tài xế **CÓ XÁC NHẬN** cho cuốc xe. Khi khách hàng tạo cuốc với auto-assign enabled:

1. ✅ Backend tìm tài xế phù hợp nhất (gần, online, rảnh)
2. ✅ Gửi **yêu cầu** (không assign luôn) cho tài xế đó
3. ✅ Tài xế nhận **modal notification** với countdown 15s
4. ✅ Tài xế có thể **Accept** hoặc **Reject**
5. ✅ Nếu Reject/Timeout → Tự động chuyển sang tài xế tiếp theo
6. ✅ Nếu Accept → Ride được assign cho tài xế đó

---

## 📚 Tài liệu

### 1. [AUTO_ASSIGN_IMPLEMENTATION_GUIDE.md](./AUTO_ASSIGN_IMPLEMENTATION_GUIDE.md)
**Hướng dẫn implementation chi tiết**
- Danh sách files được tạo/sửa
- Cấu hình hệ thống
- Debugging tips
- FAQs

### 2. [AUTO_ASSIGN_FLOW_DIAGRAM.md](./AUTO_ASSIGN_FLOW_DIAGRAM.md)
**Sơ đồ flow và kiến trúc**
- Flow diagrams (ASCII art)
- Sequence diagrams
- Database schema
- State transitions
- API endpoints
- Scoring algorithm

### 3. [AUTO_ASSIGN_SUMMARY.md](./AUTO_ASSIGN_SUMMARY.md)
**Tổng kết implementation**
- What was implemented
- Complete flow scenarios
- Files created/modified
- Configuration options
- Success criteria

### 4. [AUTO_ASSIGN_TESTING_CHECKLIST.md](./AUTO_ASSIGN_TESTING_CHECKLIST.md)
**Danh sách kiểm tra testing**
- Pre-test setup
- 5 test suites
- Debugging checklist
- Performance benchmarks
- Acceptance criteria

---

## 🚀 Quick Start

### Bước 1: Cài đặt Dependencies (nếu cần)

Backend không cần thêm package mới, nhưng đảm bảo có:
```bash
cd backend
npm install @nestjs/mongoose mongoose @nestjs/event-emitter
```

Mobile Driver App:
```bash
cd mobile-driver
npm install @react-native-async-storage/async-storage expo-av
```

### Bước 2: Start Services

Terminal 1 - Backend:
```bash
cd backend
npm run start:dev
```

Terminal 2 - MongoDB (nếu chưa chạy):
```bash
mongod
```

Terminal 3 - Mobile Driver:
```bash
cd mobile-driver
npm start
```

Terminal 4 - Mobile Customer:
```bash
cd mobile-customer
npm start
```

### Bước 3: Test

1. **Login 2 drivers** (Driver A và B)
2. **Bật online** cho cả 2 drivers
3. **Đảm bảo có location**: Drivers phải có `currentLocation` set
4. **Customer tạo cuốc** với checkbox "Tự động chỉ định tài xế" ✅
5. **Driver A** (gần hơn) sẽ nhận modal đầu tiên
6. **Test các scenarios**:
   - Accept → Ride assigned
   - Reject → Driver B nhận modal
   - Timeout → Tự động chuyển sang Driver B

---

## 🏗️ Kiến trúc

```
Customer App                  Backend                    Driver Apps
     │                           │                            │
     │───Create Ride────────────>│                            │
     │   autoAssign: true        │                            │
     │                           │                            │
     │                    ┌──────▼──────┐                     │
     │                    │ AutoAssign  │                     │
     │                    │   Service   │                     │
     │                    └──────┬──────┘                     │
     │                           │                            │
     │                    Find & Score Drivers                │
     │                           │                            │
     │                    ┌──────▼──────┐                     │
     │                    │  Create      │                     │
     │                    │  Assignment  │                     │
     │                    │  Request     │                     │
     │                    └──────┬──────┘                     │
     │                           │                            │
     │                           │◄────Polling (3s)───────────│
     │                           │                            │
     │                           │─────Pending Request───────>│
     │                           │                            │
     │                           │                    ┌───────▼────────┐
     │                           │                    │  Modal Popup   │
     │                           │                    │  ⏱️ 15s Timer   │
     │                           │                    └───────┬────────┘
     │                           │                            │
     │                           │◄──Accept/Reject────────────│
     │                           │                            │
     │                    ┌──────▼──────┐                     │
     │                    │  Update Ride │                     │
     │                    │  OR Retry    │                     │
     │                    └──────────────┘                     │
```

---

## 📊 Scoring Algorithm

Tài xế được chọn dựa trên điểm tổng (0-100):

| Criteria | Weight | Description |
|----------|--------|-------------|
| **Distance** | 40% | Khoảng cách đến điểm đón (càng gần càng cao) |
| **Rating** | 30% | Đánh giá trung bình (0-5 stars) |
| **Completion Rate** | 20% | % hoàn thành chuyến |
| **Online Time** | 10% | Thời gian online (mới online = điểm cao) |

**Example:**
- Driver A: 1.2km, 4.8★, 95%, 3 min → **89.8 điểm** ✅ Được chọn
- Driver B: 2.5km, 4.5★, 90%, 30 min → **75.5 điểm**

---

## 🗄️ Database Schema

### AssignmentRequest Collection

```javascript
{
  _id: ObjectId,
  rideId: ObjectId,          // Cuốc xe
  driverId: ObjectId,        // Tài xế
  status: 'pending' | 'accepted' | 'rejected' | 'timeout' | 'cancelled',
  score: Number,             // Điểm scoring
  expiresAt: Date,           // +15 seconds
  respondedAt: Date,         // Thời gian phản hồi
  rejectionReason: String,   // Lý do từ chối
  attemptNumber: Number,     // 1, 2, 3...
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🔌 API Endpoints

### 1. Get Pending Requests (Polling)
```
GET /api/rides/assignment-requests/pending
Authorization: Bearer <driver_token>
```

### 2. Accept Request
```
POST /api/rides/assignment-requests/:requestId/accept
Authorization: Bearer <driver_token>
```

### 3. Reject Request
```
POST /api/rides/assignment-requests/:requestId/reject
Authorization: Bearer <driver_token>
Body: { reason?: string }
```

---

## 📱 Mobile Components

### Polling Service
**File:** `mobile-driver/src/services/assignmentRequestPollingService.ts`

```typescript
// Start polling khi driver online
assignmentRequestPollingService.startPolling((request) => {
  // Show modal
})

// Stop khi driver offline
assignmentRequestPollingService.stopPolling()
```

### Global Modal
**File:** `mobile-driver/src/components/AssignmentRequestModal.tsx`

- Hiện trên **MỌI màn hình**
- Countdown 15 giây
- Accept/Reject buttons
- Pulse animation
- Sound notification

---

## 🎯 Test Scenarios

### ✅ Scenario 1: Accept
Customer tạo cuốc → Driver A nhận modal → Accept → Ride assigned

### ✅ Scenario 2: Reject
Customer tạo cuốc → Driver A reject → Driver B nhận modal → Accept

### ✅ Scenario 3: Timeout
Customer tạo cuốc → Driver A không response → 15s timeout → Driver B nhận

### ✅ Scenario 4: No Drivers
Tất cả drivers reject/timeout → Ride status = 'no_driver_available'

---

## 🔧 Configuration

### Timeout (default: 15s)
```typescript
// backend/src/modules/rides/services/auto-assign.service.ts
private readonly REQUEST_TIMEOUT_SECONDS = 15
```

### Polling Interval (default: 3s)
```typescript
// mobile-driver/src/services/assignmentRequestPollingService.ts
private pollingInterval = 3000
```

### Scoring Weights
```typescript
// auto-assign.service.ts
const distanceScore = ... // 40%
const ratingScore = ... // 30%
const completionScore = ... // 20%
const onlineTimeScore = ... // 10%
```

---

## 🐛 Debugging

### Backend Logs
```bash
# Check terminal running backend
[AutoAssignService] Found available drivers: { total: 2 }
[AutoAssignService] Created assignment request 674xyz for driver 671def
[AutoAssignService] Driver 671def accepted assignment request 674xyz
```

### Mobile Logs
```bash
# React Native debugger
[AssignmentPolling] 🔄 Started polling
[AssignmentPolling] 🔔 Found 1 pending request(s)
[App] ✅ Accepting assignment request: 674xyz
```

### Database Check
```bash
mongo
use fire_go
db.assignmentrequests.find().pretty()
db.rides.find({ status: 'assigned' }).pretty()
```

---

## 📂 Files Created/Modified

### Backend (5 files)
- ✅ `schemas/assignment-request.schema.ts` (NEW)
- ✅ `services/auto-assign.service.ts` (MODIFIED)
- ✅ `rides.controller.ts` (MODIFIED)
- ✅ `rides.service.ts` (MODIFIED)
- ✅ `rides.module.ts` (MODIFIED)

### Mobile Driver (3 files)
- ✅ `services/assignmentRequestPollingService.ts` (NEW)
- ✅ `components/AssignmentRequestModal.tsx` (NEW)
- ✅ `App.js` (MODIFIED)

### Documentation (4 files)
- ✅ `AUTO_ASSIGN_IMPLEMENTATION_GUIDE.md`
- ✅ `AUTO_ASSIGN_FLOW_DIAGRAM.md`
- ✅ `AUTO_ASSIGN_SUMMARY.md`
- ✅ `AUTO_ASSIGN_TESTING_CHECKLIST.md`

---

## ✅ Status

**Implementation:** ✅ Complete  
**Testing:** ⏳ Pending  
**Production Ready:** ⏳ After Testing

---

## 🚀 Next Steps

1. **Test với 2 drivers thật** → Xem modal có hiện không
2. **Test accept flow** → Ride có assign đúng không
3. **Test reject/timeout flow** → Retry có hoạt động không
4. **Performance testing** → Polling có lag không
5. **Production deployment** → Deploy lên server thật

---

## 📞 Support

Nếu gặp vấn đề:
1. Check [AUTO_ASSIGN_IMPLEMENTATION_GUIDE.md](./AUTO_ASSIGN_IMPLEMENTATION_GUIDE.md) → Debugging section
2. Check backend logs
3. Check MongoDB data
4. Test API endpoints với Postman
5. Review [AUTO_ASSIGN_TESTING_CHECKLIST.md](./AUTO_ASSIGN_TESTING_CHECKLIST.md)

---

## 📜 License & Credits

**Project:** Fire-Go Ride Hailing Platform  
**Feature:** Auto-Assign Driver with Confirmation  
**Implementation Date:** January 29, 2026  
**Version:** 1.0

---

**Happy Testing! 🎉**
