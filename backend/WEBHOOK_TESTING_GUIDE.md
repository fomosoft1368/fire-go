# Sepay Webhook Testing Guide

## 🎯 Overview
Hệ thống đã được cải tiến với:
- ✅ Content parsing linh hoạt hơn (3 patterns)
- ✅ Transaction finding thông minh (full ID + last 8 chars)
- ✅ Detailed logging cho debugging
- ✅ Real-time webhook monitoring tools

## 🔧 Các Thay Đổi Code

### 1. Webhook Controller - Content Parsing
**File:** `backend/src/modules/drivers/controllers/sepay-webhook.controller.ts`

**Cải tiến:**
- Hỗ trợ 3 patterns cho content parsing:
  - Pattern 1: `NAPVI <ID>` (có khoảng trắng)
  - Pattern 2: `NAPVI<ID>` (không khoảng trắng)  
  - Pattern 3: Fallback - chỉ hex chars (8-24 ký tự)
- Normalize content (uppercase, trim)
- Detailed logging từng bước

**Example logs:**
```
[SepayWebhook] 📥 Received webhook: {...}
[SepayWebhook] 📝 Raw content: "NAPVI 07C2B288"
[SepayWebhook] 📝 Normalized content: "NAPVI 07C2B288"
[SepayWebhook] ✅ Pattern 1 matched (NAPVI + space + ID): 07C2B288
[SepayWebhook] 📝 Final extracted transaction ID: 07C2B288
```

### 2. Wallet Service - Transaction Finding
**File:** `backend/src/modules/drivers/services/wallet.service.ts`

**Cải tiến:**
- **Strategy 1**: Tìm theo full ID (nếu có 24 chars)
- **Strategy 2**: Tìm theo last 8 chars trong 50 pending transactions gần nhất
- Logging chi tiết từng transaction được check
- Show amount, createdAt khi tìm thấy

**Example logs:**
```
[WalletService] 🔍 Searching for transaction with ID: 07C2B288
[WalletService] ID length: 8
[WalletService] 🔍 Trying last 8 chars match: 07C2B288
[WalletService] Found 3 pending transactions to check
[WalletService] ✅ Found by last 8 chars: 6989addaf753852a07c2b288
[WalletService] Full ID: 6989addaf753852a07c2b288
[WalletService] Amount: 100000
[WalletService] Created: 2026-02-09T09:50:18.676Z
```

### 3. Sepay Service - QR Generation
**File:** `backend/src/modules/drivers/services/sepay.service.ts`

**Cải tiến:**
- Logging chi tiết khi tạo QR code
- Show full transaction ID và last 8 chars
- Hiển rõ content sẽ dùng

**Example logs:**
```
[SepayService] 🔖 Generating QR code:
[SepayService] Full Transaction ID: 6989addaf753852a07c2b288
[SepayService] Last 8 chars: 07C2B288
[SepayService] Content: NAPVI 07C2B288
```

## 🛠️ Testing Tools

### 1. Webhook Monitor (Real-time)
**File:** `backend/monitor-webhook.js`

**Chức năng:**
- Monitor ngrok API mỗi 2 giây
- Detect webhook requests đến `/api/wallet/sepay/webhook`
- Display payload, response chi tiết
- Heartbeat mỗi 30 giây

**Usage:**
```bash
# Terminal 1: Start backend
cd backend
npm run start:dev

# Terminal 2: Start ngrok
cd backend
.\ngrok.exe http 3000

# Terminal 3: Monitor webhooks
cd backend
node monitor-webhook.js
```

**Output khi có webhook:**
```
🎯 WEBHOOK RECEIVED! (1 request(s))
════════════════════════════════════════════════════════════

Request #1:
Time: 09/02/2026 10:15:30
Method: POST
URI: /api/wallet/sepay/webhook
Status: 200

📦 Payload:
  - Transfer Amount: 100,000 VND
  - Content: NAPVI 07C2B288
  - Transaction Date: 2026-02-09T10:15:00Z
  - Account: 0986190053
  - Bank: MB Bank

✅ Response:
  - Success: true
  - Message: Transaction completed
  - Transaction ID: 6989addaf753852a07c2b288
────────────────────────────────────────────────────────────
```

### 2. Live Test Transaction Creator
**File:** `backend/test-webhook-live.js`

**Chức năng:**
- Tạo pending transaction trong MongoDB
- Generate QR code URL
- Hiển thị step-by-step instructions
- Provide transfer info (bank, account, content)

**Usage:**
```bash
cd backend
node test-webhook-live.js
```

**Output:**
```
═══════════════════════════════════════════════════════════════════
📋 TRANSACTION DETAILS:
═══════════════════════════════════════════════════════════════════
   Transaction ID: 6989b12af753852a07c3d456
   Last 8 chars: 07C3D456
   Amount: 50,000 VND
   Status: PENDING

═══════════════════════════════════════════════════════════════════
💳 BANK TRANSFER INFO:
═══════════════════════════════════════════════════════════════════
   Bank: MB Bank (970422)
   Account Number: 0986190053
   Account Name: HO VAN TRINH
   Amount: 50,000 VND
   Content: NAPVI 07C3D456

═══════════════════════════════════════════════════════════════════
🎯 TESTING INSTRUCTIONS:
═══════════════════════════════════════════════════════════════════
1. Make sure backend and ngrok are running
2. Start webhook monitor: node monitor-webhook.js
3. Transfer money with EXACT content: NAPVI 07C3D456
4. Watch monitor for webhook notification
5. Check status: node check-transaction-status.js 6989b12af753852a07c3d456

🔍 QR CODE URL (VietQR):
https://img.vietqr.io/image/970422-0986190053-compact2.png?amount=50000&addInfo=NAPVI+07C3D456&accountName=HO%20VAN%20TRINH
```

### 3. Existing Check Script
**File:** `backend/check-transaction-status.js`

**Usage:**
```bash
node check-transaction-status.js <transactionId>
```

## 📋 Complete Testing Workflow

### Step 1: Prepare Environment
```bash
# Terminal 1 - Backend (port 3000)
cd D:\fire-go\backend
npm run start:dev

# Terminal 2 - Ngrok tunnel
cd D:\fire-go\backend
.\ngrok.exe http 3000

# Terminal 3 - Webhook monitor
cd D:\fire-go\backend
node monitor-webhook.js

# Get ngrok URL from terminal 2, update in Sepay dashboard:
# https://my.sepay.vn/webhooks/23929
```

### Step 2: Create Test Transaction
```bash
# Terminal 4
cd D:\fire-go\backend
node test-webhook-live.js
```

Copy content từ output: `NAPVI 07C3D456`

### Step 3: Make Bank Transfer

**Option A: Scan QR Code**
- Copy QR URL từ test-webhook-live.js
- Mở browser, paste URL
- Scan QR bằng banking app
- Confirm transfer

**Option B: Manual Transfer**
- Mở MB Bank app
- Transfer to: 0986190053 (HO VAN TRINH)
- Amount: 50,000 VND (hoặc amount từ test script)
- Content: **CHÍNH XÁC** như script output (e.g., `NAPVI 07C3D456`)
- Confirm transfer

### Step 4: Verify Results

**4.1 Watch Monitor (Terminal 3)**
Sau 1-2 phút, sẽ thấy:
```
🎯 WEBHOOK RECEIVED!
✅ Response: Transaction completed
```

**4.2 Check Backend Logs (Terminal 1)**
```
[SepayWebhook] 📥 Received webhook
[SepayWebhook] 📝 Raw content: NAPVI 07C3D456
[SepayWebhook] ✅ Pattern 1 matched
[WalletService] ✅ Found by last 8 chars
[WalletService] 🎉 Transaction completed
```

**4.3 Check Database**
```bash
node check-transaction-status.js 6989b12af753852a07c3d456
```

Expected output:
```
Transaction Status: completed
Driver Balance: 250,000đ (increased by 50k)
```

## 🐛 Troubleshooting

### Webhook Not Received

**Check 1: Ngrok Running?**
```bash
Get-Process | Where-Object {$_.ProcessName -like '*ngrok*'}
```
Should return process with ngrok.exe

**Check 2: Ngrok URL in Sepay?**
- Go to https://my.sepay.vn/webhooks/23929
- Verify URL: `https://<your-ngrok>.ngrok-free.dev/api/wallet/sepay/webhook`
- Include full path `/api/wallet/sepay/webhook`

**Check 3: Backend Running?**
```bash
Get-NetTCPConnection -LocalPort 3000
```
Should show LISTENING state

**Check 4: Content Exact Match?**
- Content PHẢI CHÍNH XÁC như trong QR/script
- Không thêm dấu cách, ký tự khác
- Ví dụ: `NAPVI 07C3D456` (có đúng 1 khoảng trắng)

**Check 5: Sepay Webhook Logs**
- Go to https://my.sepay.vn/webhooks/23929
- Check "Logs" tab
- Look for delivery attempts, errors

**Check 6: Ngrok Dashboard**
- Open http://127.0.0.1:4040
- Check "Inspect" → "HTTP Requests"
- Look for POST /api/wallet/sepay/webhook

### Transaction Not Found

**Scenario:** Monitor shows webhook received but transaction not updated

**Check Logs:**
```
[WalletService] ❌ No matching transaction found
[WalletService] Searched ID: 07C3D456
```

**Solutions:**
1. Verify transaction exists in DB:
   ```bash
   node check-transaction-status.js <fullTransactionId>
   ```

2. Check transaction status (might be already completed):
   ```javascript
   // MongoDB query
   db.transactions.findOne({ _id: ObjectId("6989b12af...") })
   ```

3. Check content format in webhook payload vs database

### Amount Mismatch

**Scenario:**
```
[SepayWebhook] ❌ Amount mismatch:
  expected: 50000
  received: 50001
```

**Cause:** Transfer amount không khớp với transaction amount

**Solution:** Transfer đúng số tiền như trong QR/script

## 📊 Expected Behavior

### Successful Flow
```
1. Create transaction → Status: PENDING, Balance: unchanged
2. Transfer money → Sepay detects transfer
3. Sepay calls webhook → Backend logs webhook received
4. Parse content → Extract transaction ID
5. Find transaction → Match by last 8 chars
6. Verify amount → Match ✅
7. Complete transaction → Status: COMPLETED
8. Update balance → Balance increased
9. Return 200 OK → Sepay stops retrying
```

### Timeline
- **T+0s**: Create transaction
- **T+30s**: Transfer money
- **T+60-120s**: Sepay processes transfer and calls webhook
- **T+120s**: Transaction completed, balance updated

## 🔍 Debug Commands

```bash
# Check all pending transactions
node backend/check-all-pending-transactions.js

# Monitor backend logs
cd backend
npm run start:dev | Select-String "Sepay|Webhook|Transaction"

# Check ngrok requests
curl http://127.0.0.1:4040/api/requests/http

# Manual webhook test (bypass Sepay)
$body = @{
  id = "test_123"
  transferType = "in"
  transferAmount = 50000
  content = "NAPVI 07C3D456"
  accountNumber = "0986190053"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:3000/api/wallet/sepay/webhook" `
  -Method POST -Body $body -ContentType "application/json"
```

## 📞 Support

Nếu vẫn gặp vấn đề:

1. **Collect Logs:**
   - Backend terminal output (full)
   - Ngrok dashboard screenshot (http://127.0.0.1:4040)
   - Sepay webhook logs (https://my.sepay.vn)
   - Monitor output (monitor-webhook.js)

2. **Check Configuration:**
   - `.env` file (SEPAY_API_KEY, account info)
   - Sepay dashboard settings
   - MongoDB connection

3. **Test Components:**
   - Backend: `curl http://localhost:3000/api/drivers/wallet/balance` (with auth)
   - Ngrok: Copy ngrok URL, test in browser
   - MongoDB: `mongosh firego` → `db.transactions.find()`

## ✅ Success Indicators

- ✅ Monitor shows "WEBHOOK RECEIVED"
- ✅ Backend logs show "Transaction completed successfully"
- ✅ Driver balance increased by topup amount
- ✅ Transaction status changed to "completed"
- ✅ completedAt timestamp populated
- ✅ balanceBefore/balanceAfter recorded

---

**Last Updated:** 2026-02-09  
**Version:** 2.0 - Improved parsing & monitoring
