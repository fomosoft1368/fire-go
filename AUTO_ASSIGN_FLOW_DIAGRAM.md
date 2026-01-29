# AUTO-ASSIGN DRIVER CONFIRMATION FLOW

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          KHÁCH HÀNG TẠO CUỐC XE                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     │ POST /api/rides
                                     │ { autoAssign: true }
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         BACKEND AUTO-ASSIGN SERVICE                          │
│                                                                              │
│  1. Tìm tài xế sẵn có (online, rảnh, có currentLocation)                   │
│  2. Tính điểm scoring cho từng tài xế:                                      │
│     • 40% Khoảng cách (gần = điểm cao)                                      │
│     • 30% Rating                                                             │
│     • 20% Completion rate                                                    │
│     • 10% Online time                                                        │
│  3. Sắp xếp theo điểm cao nhất                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     │ Tạo AssignmentRequest
                                     │ status: 'pending'
                                     │ expiresAt: +15 seconds
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          TÀI XẾ #1 (Gần nhất)                               │
│                                                                              │
│  📱 Modal popup (trên mọi màn hình):                                        │
│     ┌──────────────────────────────────────┐                                │
│     │  🎉 Cuốc xe mới!                     │                                │
│     │  📍 123 Lê Lợi → 456 Nguyễn Huệ    │                                │
│     │  💰 125,000đ                         │                                │
│     │  ⏱️  Tự động từ chối sau 12s         │                                │
│     │  [Từ chối] [Nhận cuốc]              │                                │
│     └──────────────────────────────────────┘                                │
│                                                                              │
│  ← Polling mỗi 3s: GET /api/rides/assignment-requests/pending              │
└─────────────────────────────────────────────────────────────────────────────┘
                │                                        │
                │                                        │
      ┌─────────┴────────┐                   ┌──────────┴──────────┐
      │  ACCEPT          │                   │  REJECT / TIMEOUT    │
      │  Nhấn "Nhận cuốc"│                   │  Nhấn "Từ chối"     │
      └─────────┬────────┘                   └──────────┬──────────┘
                │                                        │
                │ POST /assignment-requests/:id/accept  │ POST /assignment-requests/:id/reject
                │                                        │
                ▼                                        ▼
┌───────────────────────────┐           ┌────────────────────────────────────┐
│  ✅ RIDE ASSIGNED         │           │  🔄 RETRY WITH NEXT DRIVER         │
│                           │           │                                    │
│  • Ride.driverId = #1     │           │  1. Update request status:         │
│  • Ride.status = accepted │           │     rejected/timeout               │
│  • Cancel other requests  │           │  2. Tìm driver tiếp theo           │
│  • Navigate to ride       │           │     (chưa được request)            │
│                           │           │  3. Tạo AssignmentRequest mới      │
└───────────────────────────┘           │  4. attemptNumber++                │
                                        └────────────────┬───────────────────┘
                                                         │
                                                         │
                                                         ▼
                                        ┌─────────────────────────────────────┐
                                        │     TÀI XẾ #2 (Xa hơn)             │
                                        │                                     │
                                        │  📱 Modal popup (giống như trên)   │
                                        │  ⏱️  15 giây mới                    │
                                        └─────────────────────────────────────┘
                                                         │
                                                         │
                                              ┌──────────┴──────────┐
                                              │  ACCEPT / REJECT     │
                                              └──────────┬──────────┘
                                                         │
                                                         ▼
                                              (Lặp lại flow trên)


┌─────────────────────────────────────────────────────────────────────────────┐
│                      TRƯỜNG HỢP ĐẶC BIỆT                                    │
│                                                                              │
│  🚫 Không còn tài xế nào sẵn có:                                            │
│     • Ride.status = 'no_driver_available'                                   │
│     • Emit event 'ride.no_driver_available'                                 │
│     • Notify customer: "Không tìm thấy tài xế"                              │
│                                                                              │
│  ⏱️  Timeout Mechanism:                                                      │
│     • setTimeout() 15 giây                                                   │
│     • Nếu status vẫn là 'pending' → Auto update thành 'timeout'             │
│     • Trigger retry với driver tiếp theo                                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Sequence Diagram (Chi tiết)

```
Customer App          Backend API           AssignmentRequest DB      Driver App #1        Driver App #2
     │                     │                         │                      │                    │
     │─POST /rides────────>│                         │                      │                    │
     │ autoAssign:true     │                         │                      │                    │
     │                     │                         │                      │                    │
     │                     │──Find drivers──────────>│                      │                    │
     │                     │<─Available drivers──────│                      │                    │
     │                     │                         │                      │                    │
     │                     │──Score drivers──────────│                      │                    │
     │                     │  (distance, rating...)  │                      │                    │
     │                     │                         │                      │                    │
     │                     │──CREATE request────────>│                      │                    │
     │                     │  status: pending        │                      │                    │
     │                     │  expiresAt: +15s        │                      │                    │
     │<─Response───────────│                         │                      │                    │
     │ {success: true}     │                         │                      │                    │
     │                     │                         │                      │                    │
     │                     │                         │                      │◄─POLL (3s)─────────│
     │                     │                         │<─────GET pending─────│                    │
     │                     │                         │──────[request]──────>│                    │
     │                     │                         │                      │                    │
     │                     │                         │              [SHOW MODAL]                 │
     │                     │                         │              ⏱️ 15s countdown              │
     │                     │                         │                      │                    │
     │                     │                         │                      │                    │
     ├─ Case 1: ACCEPT ───┤                         │                      │                    │
     │                     │                         │                      │                    │
     │                     │<─POST /accept───────────│──────────────────────│                    │
     │                     │                         │                      │                    │
     │                     │──UPDATE request────────>│                      │                    │
     │                     │  status: accepted       │                      │                    │
     │                     │                         │                      │                    │
     │                     │──UPDATE ride───────────>│                      │                    │
     │                     │  driverId: #1           │                      │                    │
     │                     │  status: accepted       │                      │                    │
     │                     │                         │                      │                    │
     │                     │──────Success───────────>│──────────────────────│                    │
     │                     │                         │              [Navigate to ride]           │
     │                     │                         │                      │                    │
     ├─ Case 2: REJECT ───┤                         │                      │                    │
     │                     │                         │                      │                    │
     │                     │<─POST /reject───────────│──────────────────────│                    │
     │                     │                         │                      │                    │
     │                     │──UPDATE request────────>│                      │                    │
     │                     │  status: rejected       │                      │                    │
     │                     │                         │                      │                    │
     │                     │──Find next driver──────>│                      │                    │
     │                     │<─Driver #2──────────────│                      │                    │
     │                     │                         │                      │                    │
     │                     │──CREATE new request────>│                      │                    │
     │                     │  driverId: #2           │                      │                    │
     │                     │  attemptNumber: 2       │                      │                    │
     │                     │                         │                      │                    │
     │                     │                         │                      │                 [POLL]
     │                     │                         │<─────GET pending────────────────────────│
     │                     │                         │──────[request]──────────────────────────>│
     │                     │                         │                      │          [SHOW MODAL]
     │                     │                         │                      │                    │
     │                     │                         │                      │                    │
     ├─ Case 3: TIMEOUT ──┤                         │                      │                    │
     │                     │                         │                      │                    │
     │                  [After 15s]                  │                      │                    │
     │                     │──Auto timeout──────────>│                      │                    │
     │                     │  status: timeout        │                      │                    │
     │                     │                         │                      │                    │
     │                     │──Retry (same as reject)─│                      │                    │
     │                     │                         │                      │                    │
```

---

## Database Schema

### AssignmentRequest Collection

```javascript
{
  _id: ObjectId("674abc..."),
  rideId: ObjectId("673xyz..."),
  driverId: ObjectId("671def..."),
  status: "pending", // pending | accepted | rejected | timeout | cancelled
  score: 87.5,
  expiresAt: ISODate("2026-01-29T10:15:30Z"),
  respondedAt: null, // hoặc ISODate khi driver phản hồi
  rejectionReason: null, // "Tài xế từ chối"
  attemptNumber: 1,
  createdAt: ISODate("2026-01-29T10:15:15Z"),
  updatedAt: ISODate("2026-01-29T10:15:15Z")
}
```

### Indexes

```javascript
// Query pending requests for specific driver
{ driverId: 1, status: 1, expiresAt: 1 }

// Query all requests for a ride
{ rideId: 1, status: 1 }

// TTL index to auto-delete expired requests
{ expiresAt: 1 } // expireAfterSeconds: 0
```

---

## API Endpoints

### 1. Get Pending Requests (Driver polling)
```
GET /api/rides/assignment-requests/pending
Authorization: Bearer <driver_token>

Response:
[
  {
    _id: "674abc...",
    rideId: {
      _id: "673xyz...",
      pickupAddress: "123 Lê Lợi",
      dropoffAddress: "456 Nguyễn Huệ",
      totalFare: 125000
    },
    status: "pending",
    expiresAt: "2026-01-29T10:15:30Z"
  }
]
```

### 2. Accept Request
```
POST /api/rides/assignment-requests/:requestId/accept
Authorization: Bearer <driver_token>

Response:
{
  _id: "673xyz...",
  driverId: "671def...",
  status: "accepted",
  pickupAddress: "...",
  ...
}
```

### 3. Reject Request
```
POST /api/rides/assignment-requests/:requestId/reject
Authorization: Bearer <driver_token>

Body:
{
  "reason": "Tài xế từ chối"
}

Response: 204 No Content
```

---

## State Transitions

```
pending ──┬──> accepted (driver nhấn Accept)
          │
          ├──> rejected (driver nhấn Reject)
          │
          ├──> timeout (15 giây không phản hồi)
          │
          └──> cancelled (có driver khác accept)
```

---

## Scoring Algorithm

```typescript
Total Score = (0-100)
├─ Distance Score (40%)
│  ├─ < 1km = 40 điểm
│  ├─ 1-3km = 40 → 20 điểm (giảm dần)
│  └─ > 3km = < 20 điểm
│
├─ Rating Score (30%)
│  └─ (averageRating / 5) * 30
│
├─ Completion Score (20%)
│  └─ (completionRate / 100) * 20
│
└─ Online Time Score (10%)
   ├─ < 5 min = 10 điểm
   ├─ 5-60 min = 10 → 5 điểm (giảm dần)
   └─ > 60 min = 5 điểm
```

**Example:**
- Driver A: 1.2km, Rating 4.8, Completion 95%, Online 3 min
  - Distance: 32 + Rating: 28.8 + Completion: 19 + Online: 10 = **89.8 điểm**
  
- Driver B: 2.5km, Rating 4.5, Completion 90%, Online 30 min
  - Distance: 25 + Rating: 27 + Completion: 18 + Online: 5.5 = **75.5 điểm**

→ Driver A được chọn đầu tiên!
