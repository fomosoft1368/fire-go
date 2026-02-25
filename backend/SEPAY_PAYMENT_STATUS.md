# 🎯 Sepay Payment System - Implementation Complete

**Date**: February 25, 2026  
**Status**: ✅ FULLY IMPLEMENTED  
**Merchant**: SP-LIVE-HVBB3B66 (Hồ Văn Trịnh)  
**Mode**: LIVE (Production)

---

## 📝 Files Modified

### Backend Files

#### 1. Driver Module
- ✅ `backend/src/modules/drivers/services/wallet.service.ts`
  - Added: `createTopupTransaction()` method
  - Purpose: Create PENDING transaction for Sepay QR code generation

- ✅ `backend/src/modules/drivers/services/sepay.service.ts`
  - Updated: `generateQRCode()` to support `userType` parameter
  - Now generates: `DRV_` or `CUST_` prefixed content

- ✅ `backend/src/modules/drivers/controllers/sepay-webhook.controller.ts`
  - Added: `POST /api/wallet/sepay/create-topup` endpoint
  - Updated: `handleWebhook()` to parse DRV_ and CUST_ prefixes
  - Added: `handleCustomerTopup()` handler
  - Imports: Added `WalletsService`

- ✅ `backend/src/modules/drivers/drivers.module.ts`
  - Added: Import of `WalletsModule`
  - Purpose: Allow webhook controller to access `WalletsService`

#### 2. Wallets Module
- ✅ `backend/src/modules/wallets/wallets.service.ts`
  - Added: `createTopupTransaction()` - customer version
  - Added: `findPendingTopupByContent()` - transaction lookup
  - Added: `completeTopupTransaction()` - wallet balance update

- ✅ `backend/src/modules/wallets/wallets.controller.ts`
  - Added: `POST /api/wallets/sepay-topup` endpoint
  - Imports: Added `SepayService` from drivers module

- ✅ `backend/src/modules/wallets/wallets.module.ts`
  - Added: `SepayService` provider
  - Purpose: Support QR code generation for customers

---

## 🔌 API Endpoints

### Driver Payment Endpoints

**1. Create Driver Topup (with QR Code)**
```
POST /api/wallet/sepay/create-topup
Authorization: Bearer <driver_jwt_token>
Content-Type: application/json

Request:
{
  "amount": 100000
}

Response (201):
{
  "success": true,
  "transactionId": "65f12a3b4c5d6e7f8a9b0c1d",
  "amount": 100000,
  "qrCodeUrl": "https://img.vietqr.io/image/970422-0986190053-compact2.png?...",
  "content": "DRV_8A9B0C1D",
  "accountNo": "0986190053",
  "accountName": "HO VAN TRINH",
  "bankName": "VietComBank",
  "bankId": "970422"
}
```

**2. Get Driver Wallet**
```
GET /api/wallet/me
Authorization: Bearer <driver_jwt_token>

Response:
{
  "balance": 1500000,
  "pending": 0,
  "minimumBalance": 100000,
  "isLocked": false
}
```

**3. Sepay Webhook (Driver)**
```
POST /api/wallet/sepay/webhook
x-sepay-signature: <signature>
Content-Type: application/json

Automatic (Sepay calls when payment received)
- Listens for "DRV_" prefix
- Updates driver wallet balance
- Returns 200 OK
```

---

### Customer Payment Endpoints

**1. Create Customer Topup (with QR Code)**
```
POST /api/wallets/sepay-topup
Authorization: Bearer <customer_jwt_token>
Content-Type: application/json

Request:
{
  "amount": 50000
}

Response (201):
{
  "success": true,
  "transactionId": "75g23b4c5d6e7f8a9b0c2d2e",
  "amount": 50000,
  "qrCodeUrl": "https://img.vietqr.io/image/970422-0986190053-compact2.png?...",
  "content": "CUST_9B0C2D2E",
  "accountNo": "0986190053",
  "accountName": "HO VAN TRINH",
  "bankName": "VietComBank",
  "bankId": "970422"
}
```

**2. Get Customer Wallet**
```
GET /api/wallets/me
Authorization: Bearer <customer_jwt_token>

Response:
{
  "balance": 850000,
  "locked": false
}
```

**3. Sepay Webhook (Customer)**
```
POST /api/wallet/sepay/webhook
x-sepay-signature: <signature>
Content-Type: application/json

Automatic (Sepay calls when payment received)
- Listens for "CUST_" prefix
- Updates customer wallet balance
- Returns 200 OK
```

---

## 🔐 Environment Variables

```bash
# .env configuration

# Sepay Account (Your Live Account)
SEPAY_MERCHANT_ID=SP-LIVE-HVBB3B66
SEPAY_SECRET_KEY=spsk_live_yr9jL5u7gm9gAwa9aQtsY9zvS4s5cey
SEPAY_API_URL=https://api.sepay.vn/api/v2

# Bank Account Details
SEPAY_ACCOUNT_NUMBER=0986190053
SEPAY_ACCOUNT_NAME=HO VAN TRINH
SEPAY_BANK_ID=970422
SEPAY_BANK_NAME=MB

# Webhook URL (set in Sepay dashboard)
SEPAY_WEBHOOK_URL=https://your-ngrok-url.ngrok.io/api/wallet/sepay/webhook
```

---

## 🏗️ Database Schema Updates

### Transaction Collection

All topup transactions now have:

```javascript
{
  _id: ObjectId,
  userType: 'driver' | 'customer',        // NEW: Distinguishes user type
  driverId?: ObjectId,                     // For driver transactions
  userId?: ObjectId,                       // For customer transactions
  
  type: 'topup',
  status: 'pending' | 'completed' | 'failed',
  amount: 100000,
  
  paymentMethod: 'bank_transfer',
  
  balanceBefore: 1400000,
  balanceAfter: 1500000,
  
  createdAt: Date,
  completedAt?: Date,
  
  description: 'Nạp tiền qua chuyển khoản ngân hàng'
}
```

---

## 🧪 Testing Sequence

### 1. Backend Unit Tests

```bash
# Test driver topup creation
curl -X POST http://localhost:3000/api/wallet/sepay/create-topup \
  -H "Authorization: Bearer <driver_token>" \
  -H "Content-Type: application/json" \
  -d '{"amount": 100000}'

# Expected: Returns QR code URL with DRV_ prefix
```

```bash
# Test customer topup creation
curl -X POST http://localhost:3000/api/wallets/sepay-topup \
  -H "Authorization: Bearer <customer_token>" \
  -H "Content-Type: application/json" \
  -d '{"amount": 50000}'

# Expected: Returns QR code URL with CUST_ prefix
```

### 2. Webhook Tests

```bash
# Test driver webhook
curl -X POST http://localhost:3000/api/wallet/sepay/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "id": "sepay_12345",
    "transferType": "in",
    "transferAmount": 100000,
    "content": "DRV_8A9B0C1D",
    "bankBrandName": "VietComBank"
  }'

# Expected: 200 OK, driver wallet updated
```

```bash
# Test customer webhook
curl -X POST http://localhost:3000/api/wallet/sepay/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "id": "sepay_67890",
    "transferType": "in",
    "transferAmount": 50000,
    "content": "CUST_9B0C2D2E",
    "bankBrandName": "VietComBank"
  }'

# Expected: 200 OK, customer wallet updated
```

### 3. End-to-End Mobile Tests

**Driver App**:
1. Open TopupScreen
2. Enter amount (e.g., 100000)
3. Request topup → Get QR code (DRV_ prefix)
4. Scan QR with banking app
5. Transfer exact amount as shown
6. In 2-5 seconds, success notification
7. Verify wallet balance increased

**Customer App**:
1. Open WalletScreen → Deposit section
2. Enter amount (e.g., 50000)
3. Request topup → Get QR code (CUST_ prefix)
4. Scan QR with banking app
5. Transfer exact amount as shown
6. In 2-5 seconds, success notification
7. Verify wallet balance increased

---

## ✅ Feature Checklist

### Core Features
- ✅ Driver can create topup with QR code
- ✅ Customer can create topup with QR code
- ✅ QR codes have user-type prefixes (DRV_, CUST_)
- ✅ Webhook processes both driver and customer transfers
- ✅ Wallet balances update after payment
- ✅ Transaction history tracks user type
- ✅ All transactions stored with correct metadata

### Security & Reliability
- ✅ JWT authentication on create-topup endpoints
- ✅ Webhook signature verification (with dev bypass option)
- ✅ Amount validation (must be ≥10,000 VND)
- ✅ Webhook always returns 200 OK (prevents retries)
- ✅ Comprehensive error logging
- ✅ Transaction state management (pending → completed)

### Mobile Integration
- ⏳ Driver TopupScreen needs update
- ⏳ Customer WalletScreen needs update
- ⏳ QR display and polling implementation

---

## 🚀 Deployment Checklist

Before going to production:

- [ ] `.env` has correct Sepay credentials
- [ ] SEPAY_WEBHOOK_URL points to production ngrok/domain
- [ ] Sepay dashboard webhook URL updated to production
- [ ] MongoDB migrations run (all Transaction docs can have userType)
- [ ] Backend deployed with all code changes
- [ ] ngrok tunnel running and stable
- [ ] Mobile apps updated with new endpoints
- [ ] Mobile apps deployed to app stores/beta
- [ ] Test topup works for both driver and customer
- [ ] Check transaction logs for userType consistency
- [ ] Monitor webhook processing in production logs

---

## 📊 System Architecture

```
┌─────────────────┐
│  Mobile Driver  │
│   TopupScreen   │
└────────┬────────┘
         │ POST /api/wallet/sepay/create-topup
         ↓
    ┌─────────────────────────────────────────┐
    │  Backend - NodeJS/NestJS                │
    │  ┌─────────────────────────────────────┐│
    │  │ WalletService (driver)              ││
    │  │ - createTopupTransaction()          ││
    │  │ - completeTopupTransaction()        ││
    │  └─────────────────────────────────────┘│
    │  ┌─────────────────────────────────────┐│
    │  │ SepayService                        ││
    │  │ - generateQRCode(amount, txId, type)││
    │  │  Returns: DRV_... or CUST_...      ││
    │  └─────────────────────────────────────┘│
    │  ┌─────────────────────────────────────┐│
    │  │ SepayWebhookController              ││
    │  │ - POST /webhook (webhook handler)   ││
    │  │ - handleDriverTopup()               ││
    │  │ - handleCustomerTopup()             ││
    └─────────────────────────────────────────┘
         │
         │ Returns: QR Code URL
         ↓
    ┌──────────────┐
    │  Display QR  │
    │  User Scans  │
    │  Transfers   │
    └──────┬───────┘
           │ Bank Transfer
           ↓
        [SEPAY]
         │
         │ Webhook: POST /api/wallet/sepay/webhook
         ↓
    [Webhook Handler]
         │
         ├─→ [Parse Content: DRV_ or CUST_]
         ├─→ [Find Transaction by last-8-chars]
         ├─→ [Verify Amount]
         ├─→ [Update Wallet Balance]
         ├─→ [Mark Transaction COMPLETED]
         └─→ [Return 200 OK]
           │
           ↓
    ┌──────────────────┐
    │ Polling (Mobile) │
    │ GET /wallet/me   │
    │ [Balance Updated]│
    └──────────────────┘
```

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| QR code doesn't load | Check VietQR URL format, verify bank ID and account |
| Webhook not called | Verify ngrok URL in Sepay dashboard, check firewall |
| Transaction not found | Verify content format (DRV_ or CUST_), check last-8-chars |
| Amount mismatch | Ensure exact transfer amount, check webhook payload |
| Signature verification fails | Check SEPAY_SECRET_KEY, can use empty for testing |

---

## 📞 Support & Documentation

**References**:
- [Sepay Documentation](https://api.sepay.vn)
- [VietQR Generator](https://img.vietqr.io)
- Implementation Guides:
  - `SEPAY_PAYMENT_IMPLEMENTATION_COMPLETE.md` (Flows & Testing)
  - `MOBILE_APP_UPDATES_REQUIRED.md` (Mobile Integration)
  - `SEPAY_IMPLEMENTATION_GUIDE.md` (Quick Start)

---

**Status**: 🟢 COMPLETE - Ready for Mobile App Integration & Testing

