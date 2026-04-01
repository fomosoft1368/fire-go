# 💰 Hệ thống Nạp/Rút Tiền với Sepay Auto-Topup

## 📋 **Tổng quan**

Hệ thống wallet cho phép:
1. **Nạp tiền (Topup)** → Tự động qua Sepay webhook khi user chuyển khoản
2. **Rút tiền (Withdrawal)** → Admin xử lý thủ công
3. **Chiết khấu (Commission)** → Tự động trừ sau khi hoàn thành cuốc xe
4. **Xem lịch sử giao dịch** → Web Admin dashboard

---

## 🚀 **Flow hoạt động**

### **1. Nạp tiền (Auto-topup với Sepay)**

```
User (Mobile App)
  └─> Chọn số tiền + "Chuyển khoản ngân hàng"
  └─> Frontend gọi: POST /api /wallet/sepay/create
  
Backend
  └─> Tạo transaction status=PENDING
  └─> Generate QR code (VietQR API)
  └─> Return: QR URL + bank info + unique content (e.g., "NAPVI ABC12345")
  
User
  └─> Quét QR hoặc chuyển khoản thủ công
  └─> Bấm "Đã chuyển khoản"
  
Sepay (Background)
  └─> Detect bank transfer
  └─> Call webhook: POST /api/wallet/sepay/webhook
  
Backend Webhook Handler
  └─> Verify signature
  └─> Parse content → Find transaction by ID
  └─> Validate amount matches
  └─> Complete transaction → Cộng tiền vào walletBalance
  └─> Unlock wallet if balance ≥ minimumBalance
  └─> Return 200 OK
  
User
  └─> Số dư tự động cập nhật trong 1-2 phút
```

---

### **2. Rút tiền (Manual processing)**

```
User (Mobile App)
  └─> Nhập số tiền + bank info (STK, tên, ngân hàng)
  └─> Frontend gọi: POST /api/wallet/withdraw
  
Backend
  └─> Validate: balance ≥ amount + minimumBalance
  └─> Trừ tiền ngay từ walletBalance (prevent fraud)
  └─> Create transaction status=PENDING
  └─> Move to pendingBalance
  
Admin (Web Dashboard)
  └─> Vào /wallet-transactions
  └─> Filter: Type=Withdrawal, Status=Pending
  └─> Chuyển khoản thủ công cho tài xế
  └─> Bấm "Approve" → Transaction status=COMPLETED
```

---

## 🛠️ **Backend API Endpoints**

### **Driver Wallet APIs**

#### **1. Create Sepay Payment (Topup)**
```http
POST /api/wallet/sepay/create
Authorization: Bearer <driver_token>

Request Body:
{
  "amount": 100000,
  "note": "Nạp tiền" // optional
}

Response:
{
  "success": true,
  "transactionId": "65f12a3b4c5d6e7f8a9b0c1d",
  "qrCodeUrl": "https://img.vietqr.io/image/970422-0986190053-compact2.png?...",
  "accountNo": "0986190053",
  "accountName": "HO VAN TRINH",
  "bankName": "MB",
  "amount": 100000,
  "content": "NAPVI ABC12345" // Unique per transaction!
}
```

#### **2. Withdraw Money**
```http
POST /api/wallet/withdraw
Authorization: Bearer <driver_token>

Request Body:
{
  "amount": 500000,
  "bankAccountNumber": "1234567890",
  "bankName": "Vietcombank",
  "accountHolderName": "NGUYEN VAN A",
  "note": "Rút tiền" // optional
}

Response:
{
  "success": true,
  "transactionId": "...",
  "message": "Withdrawal request created"
}
```

#### **3. Get Balance**
```http
GET /api/wallet/balance
Authorization: Bearer <driver_token>

Response:
{
  "balance": 1000000,
  "pending": 50000,
  "minimumBalance": 100000,
  "isLocked": false
}
```

#### **4. Get Transaction History**
```http
GET /api/wallet/transactions?limit=20&skip=0
Authorization: Bearer <driver_token>

Response:
{
  "transactions": [...],
  "total": 50
}
```

---

### **Sepay Webhook API**

#### **Sepay Webhook (Auto-topup)**
```http
POST /api/wallet/sepay/webhook
Content-Type: application/json
X-Sepay-Signature: <hmac_signature>

Request Body (from Sepay):
{
  "id": "sepay_txn_123abc",
  "gateway": "VIETQR",
  "transactionDate": "2026-02-09T10:30:00Z",
  "accountNumber": "0986190053",
  "transferType": "in",
  "transferAmount": 100000,
  "content": "NAPVI ABC12345", // Must match transaction content!
  "bankBrandName": "MB"
}

Response:
{
  "success": true,
  "message": "Transaction completed",
  "transactionId": "65f12a3b4c5d6e7f8a9b0c1d"
}
```

**Flow xử lý webhook:**
1. Verify signature (security check)
2. Check transferType = "in" (incoming transfer)
3. Parse content → Extract transaction ID (e.g., "ABC12345")
4. Find pending transaction with matching ID
5. Validate amount matches
6. Complete transaction → Cộng tiền vào wallet
7. Return 200 OK

---

### **Admin APIs**

#### **1. Get All Transactions (Admin)**
```http
GET /api/wallet/admin/transactions?limit=50&skip=0&type=topup&status=pending
Authorization: Bearer <admin_token>

Query Params:
- limit: number (default 50)
- skip: number (default 0)
- type: "topup" | "withdrawal" | "commission" | "bonus" | "refund"
- status: "pending" | "completed" | "failed" | "cancelled"
- driverId: string (optional)

Response:
{
  "transactions": [...],
  "total": 100,
  "limit": 50,
  "skip": 0
}
```

#### **2. Get Pending Withdrawals**
```http
GET /api/wallet/admin/pending-withdrawals
Authorization: Bearer <admin_token>

Response:
{
  "transactions": [
    {
      "_id": "...",
      "driverId": { "firstName": "Nguyen", "lastName": "Van A", ... },
      "type": "withdrawal",
      "amount": -500000,
      "status": "pending",
      "bankAccountNumber": "1234567890",
      "bankName": "Vietcombank",
      "createdAt": "..."
    }
  ]
}
```

#### **3. Approve Withdrawal (TODO)**
```http
POST /api/wallet/admin/approve-withdrawal/:transactionId
Authorization: Bearer <admin_token>

Response:
{
  "success": true,
  "message": "Withdrawal approved"
}
```

#### **4. Reject Withdrawal (TODO)**
```http
POST /api/wallet/admin/reject-withdrawal/:transactionId
Authorization: Bearer <admin_token>

Response:
{
  "success": true,
  "message": "Withdrawal rejected, money refunded"
}
```

---

## 🖥️ **Web Admin Dashboard**

### **Trang: Wallet Transactions**
<<<<<<< Updated upstream
URL: `http://192.168.1.12:5173/wallet-transactions`
=======
URL: `http://192.168.1.14:5173/wallet-transactions`
>>>>>>> Stashed changes

**Chức năng:**
- ✅ Hiển thị tất cả giao dịch (nạp/rút/chiết khấu/thưởng)
- ✅ Filter theo: Type, Status, Driver
- ✅ Search theo tên tài xế
- ✅ Stats cards: Total topup, withdrawal, commission, pending count
- ✅ Transaction detail modal
- ⏳ Approve/Reject withdrawal (TODO)

**Các cột hiển thị:**
- Mã GD (transaction ID - 8 ký tự cuối)
- Tài xế (tên + số điện thoại)
- Loại (tag: Nạp tiền / Rút tiền / Chiết khấu / Thưởng)
- Số tiền (màu xanh/đỏ, có dấu +/-)
- Trạng thái (tag: Chờ xử lý / Hoàn thành / Thất bại)
- Phương thức (Chuyển khoản / ...)
- Mô tả
- Thời gian
- Hành động (Chi tiết button)

---

## 🧪 **Testing Guide**

### **1. Test Nạp tiền (Development - without real Sepay)**

#### **Bước 1: User tạo topup request**
```bash
# Frontend: Bấm "Nạp tiền" → Chọn 100,000đ → "Chuyển khoản ngân hàng" → "Xác nhận"
# Backend sẽ tạo transaction PENDING và return QR data
```

#### **Bước 2: Simulate Sepay webhook**
```bash
# Lấy transaction ID từ response (e.g., "65f12a3b4c5d6e7f8a9b0c1d")
# Last 8 chars: "8A9B0C1D"

# Call test webhook endpoint
<<<<<<< Updated upstream
curl -X POST http://192.168.1.12:3000/api/wallet/sepay/test-webhook \
=======
curl -X POST http://192.168.1.14:3000/api/wallet/sepay/test-webhook \
>>>>>>> Stashed changes
  -H "Content-Type: application/json" \
  -d '{
    "id": "sepay_test_123",
    "gateway": "VIETQR",
    "transactionDate": "2026-02-09T10:30:00Z",
    "accountNumber": "0986190053",
    "transferType": "in",
    "transferAmount": 100000,
    "content": "NAPVI 8A9B0C1D",
    "bankBrandName": "MB"
  }'
```

#### **Bước 3: Verify transaction completed**
```bash
# Check backend logs → Should see "Transaction completed successfully"
# Check frontend → Số dư tăng lên 100,000đ
# Check database → Transaction status = "completed"
```

---

### **2. Test Rút tiền (Withdrawal)**

#### **Bước 1: User tạo withdrawal request**
```bash
# Frontend: Vào "Rút tiền" → Nhập số tiền + bank info → "Xác nhận"
# Backend trừ tiền ngay từ walletBalance → Transaction status = PENDING
```

#### **Bước 2: Admin duyệt**
```bash
# Web Admin: /wallet-transactions
# Filter: Type=Withdrawal, Status=Pending
# Chuyển khoản thật cho tài xế
# Bấm "Approve" (TODO: implement approve logic)
```

---

### **3. Test Commission Auto-deduct**

⚠️ **Chưa hook vào trip completion!** Cần implement:

```typescript
// File: backend/src/modules/combined-trips/services/combined-trips.service.ts
// Method: completeTrip()

async completeTrip(tripId: string) {
  // ... existing code ...
  
  // ✅ ADD THIS:
  await this.walletService.deductCommission(
    trip.driverId,
    trip._id,
    trip.fare
  );

// ...
}
```

---

## 🔐 **Security Notes**

### **1. Sepay Webhook Signature Verification**
```typescript
// File: backend/src/modules/drivers/services/sepay.service.ts
// Method: verifyWebhookSignature()

// ⚠️ CURRENTLY DISABLED (development mode)
// TODO: Enable in production with Sepay secret key!

const crypto = require('crypto');
const hmac = crypto.createHmac('sha256', process.env.SEPAY_SECRET_KEY);
hmac.update(payload);
const computedSignature = hmac.digest('hex');
return computedSignature === signature;
```

### **2. Environment Variables**
```env
# .env (backend)
SEPAY_SECRET_KEY=your_sepay_webhook_secret_key
SEPAY_ACCOUNT_NO=0986190053
SEPAY_ACCOUNT_NAME=HO VAN TRINH
SEPAY_BANK_ID=970422
SEPAY_BANK_NAME=MB
```

---

## 📊 **Database Schema**

### **WalletTransaction Schema**
```typescript
{
  _id: ObjectId,
  driverId: ObjectId (ref: Driver),
  type: "topup" | "withdrawal" | "commission" | "bonus" | "refund",
  amount: Number, // Positive for topup/bonus, negative for withdrawal/commission
  balanceBefore: Number,
  balanceAfter: Number,
  status: "pending" | "completed" | "failed" | "cancelled",
  paymentMethod: String, // "bank_transfer", "momo", "zalopay", etc.
  description: String,
  transactionId: String, // External transaction ID (e.g., Sepay ID)
  tripId: ObjectId, // For commission transactions
  commissionRate: Number, // Percentage (e.g., 20 for 20%)
  createdAt: Date,
  completedAt: Date,
}
```

### **Driver Schema (Wallet fields)**
```typescript
{
  walletBalance: Number, // Current available balance
  minimumBalance: Number, // Minimum balance required (default 100,000đ)
  pendingBalance: Number, // Money in pending withdrawal
  isWalletLocked: Boolean, // Locked if balance < minimumBalance
}
```

---

## ✅ **Checklist**

### **Đã hoàn thành:**
- [x] Sepay QR code generation (VietQR API)
- [x] Topup API (create pending transaction)
- [x] Sepay webhook handler (auto-complete transaction)
- [x] Withdraw API (create pending withdrawal)
- [x] Admin API (get all transactions)
- [x] Web Admin page (WalletTransactions.tsx)
- [x] Commission deduction logic (WalletService.deductCommission)

### **Cần làm tiếp:**
- [ ] **Hook commission vào trip completion** (CombinedTripsService, RidesService)
- [ ] **Admin approve/reject withdrawal** (Backend + Web UI)
- [ ] **Enable Sepay webhook signature verification** (Production)
- [ ] **Add Sepay webhook URL to Sepay dashboard** (Production setup)
- [ ] **Test end-to-end flow** với real Sepay account

---

## 🚨 **Production Deployment**

### **1. Register Sepay Webhook URL**
```
Webhook URL: https://your-domain.com/api/wallet/sepay/webhook
Method: POST
Headers: X-Sepay-Signature
```

### **2. Enable Signature Verification**
```typescript
// Uncomment trong sepay.service.ts
verifyWebhookSignature(payload: string, signature: string): boolean {
  const crypto = require('crypto');
  const hmac = crypto.createHmac('sha256', process.env.SEPAY_SECRET_KEY);
  hmac.update(payload);
  const computedSignature = hmac.digest('hex');
  return computedSignature === signature;
}
```

### **3. Set Environment Variables**
```bash
SEPAY_SECRET_KEY=<your_secret_from_sepay_dashboard>
SEPAY_ACCOUNT_NO=<your_bank_account>
SEPAY_ACCOUNT_NAME=<your_name_uppercase>
SEPAY_BANK_ID=<bank_id> # VCB=970436, TCB=970407, MB=970422
```

---

## 📞 **Support**

Nếu có vấn đề:
1. Check backend logs → Tìm `[SepayWebhook]` hoặc `[WalletService]`
2. Check database → Transaction status, balanceBefore/After
3. Test với `/api/wallet/sepay/test-webhook` endpoint trước
4. Verify Sepay webhook URL đã đăng ký chính xác

---

**Happy Coding! 🚀**
