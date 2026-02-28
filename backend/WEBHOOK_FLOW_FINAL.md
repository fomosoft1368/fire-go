# Sepay Webhook Flow - Cấu Hình Cuối Cùng

## ✅ Đã Hoàn Thành

### 1. Backend Code
- **Prefix:** `DH` (khớp với Sepay config)
- **Format:** `DH + 8 chars hex` (ví dụ: DH313C05AF)
- **Webhook endpoint:** `/api/wallet/sepay/webhook`
- **Content parsing:** Hỗ trợ `DH<id>` và `DH <id>`

### 2. Sepay Dashboard Config
- **Account:** MB 0986190053 (HO VAN TRINH) - Status: Đã kết nối ✅
- **Webhook #23929:** URL ngrok - Status: Kích hoạt ✅
- **Cấu trúc mã:** 
  - Tiền tố: `DH`
  - Hậu tố: 8-24 ký tự (hex)
  - Toggle: BẬT ✅

### 3. Flow Hoạt Động

```
1. User tạo topup trong app
   └─> Backend tạo transaction (PENDING)
   └─> Generate QR với content "DHABC12345"

2. User quét QR và chuyển tiền
   └─> Vào MB 0986190053
   └─> Content: "DHABC12345"

3. Sepay auto-monitor account
   └─> Detect giao dịch mới
   └─> Parse content: match pattern "DH" + 8 chars
   └─> Trigger webhook

4. Backend nhận webhook
   └─> Verify signature (nếu có SEPAY_SECRET_KEY)
   └─> Parse content → Extract transaction ID
   └─> Find transaction trong MongoDB
   └─> Validate amount
   └─> Update status: PENDING → COMPLETED
   └─> Update driver balance: +amount
```

## 🔧 Cấu Hình Sepay Dashboard

### Bước 1: Cấu trúc mã thanh toán
```
Menu: Cấu hình chung cho công ty
├─ Nhận diện mã thanh toán: ✅ BẬT
├─ Mẫu mặc định: ✅ ĐANG HOẠT ĐỘNG
└─ Cấu trúc:
    - Tiền tố: DH
    - Hậu tố: Từ 8 ký tự → Đến 24 ký tự
    - Loại: Chữ và số (hex A-F, 0-9)
```

### Bước 2: Webhook Settings
```
Menu: Tích hợp & Thông báo → Webhooks
├─ Webhook #23929
├─ URL: https://choppy-kit-dualistically.ngrok-free.app/api/wallet/sepay/webhook
├─ Loại sự kiện: Tiền vào và Tiền ra
├─ Account: MB 0986190053
└─ Status: Kích hoạt ✅
```

## 🧪 Test Flow

### 1. Tạo Transaction
```bash
cd backend
node test-sepay-webhook-live.js
# → Tạo transaction + QR code với content "DHABC12345"
```

### 2. Chuyển Tiền Test
```
Ngân hàng: MB 0986190053
Số tiền: 20,000 VND
Nội dung: DHABC12345 (auto-fill từ QR)
```

### 3. Kiểm Tra
- **Backend logs:**
  ```
  [SepayWebhook] 📥 Received webhook
  [SepayWebhook] 📝 Raw content: DHABC12345
  [SepayWebhook] ✅ Pattern 1 matched (DH + ID): ABC12345
  [WalletService] ✅ Completing transaction...
  [SepayWebhook] 🎉 Transaction completed successfully
  ```

- **Sepay Dashboard:**
  - Giao dịch → Có transaction 20k ✅
  - Webhooks → Stats: 0/0 → 1/1 ✅

- **MongoDB:**
  - Transaction status: PENDING → COMPLETED ✅
  - Driver balance: +20,000 VND ✅

## 🔒 Security

✅ **Webhook chỉ trigger khi:**
- Có transfer THẬT vào MB 0986190053
- Content match pattern "DH" + 8-24 chars
- Amount match với transaction trong DB

✅ **Không còn auto-complete:**
- Đã xóa auto-transaction-checker.js
- Chỉ complete khi Sepay verify có tiền vào thật

## 🚨 Troubleshooting

### Webhook không được gọi?
1. Check Sepay Dashboard → Giao dịch (có detect transfer không?)
2. Check Sepay Dashboard → Webhooks → Logs (có request không?)
3. Check ngrok: http://127.0.0.1:4040 (có request từ Sepay không?)
4. Verify webhook URL còn active (ngrok free: expire sau 2 giờ)

### Transaction không complete?
1. Check backend logs (có nhận webhook không?)
2. Check content format (phải có "DH" + transaction ID)
3. Check amount (phải khớp chính xác)
4. Check transaction status (phải PENDING, chưa completed)

## 📝 Environment Variables

```env
# .env file
SEPAY_API_KEY=D2BNIOSMU1LVRCJTSAJEKERF8DZXU4L5VATXIBFZKPOXAQVPGV6GJIMFHNF9LX4J
SEPAY_SECRET_KEY=          # Optional: for webhook signature verification
SEPAY_ACCOUNT_NUMBER=0986190053
SEPAY_ACCOUNT_NAME=HO VAN TRINH
SEPAY_BANK_ID=970422
SEPAY_BANK_NAME=MB
```

## 🎯 Production Deployment

Khi deploy lên production:

1. **Thay ngrok bằng URL cố định:**
   ```bash
   # Deploy backend lên Railway/Render
   railway deploy
   # → https://firego-api.up.railway.app
   ```

2. **Update Sepay webhook URL:**
   ```
   https://firego-api.up.railway.app/api/wallet/sepay/webhook
   ```

3. **Enable signature verification:**
   - Lấy SEPAY_SECRET_KEY từ Sepay dashboard
   - Add vào .env production
   - Backend sẽ verify mọi webhook request

## 📚 Related Files

- `sepay.service.ts` - QR generation với prefix "DH"
- `sepay-webhook.controller.ts` - Webhook handler với DH pattern matching
- `wallet.service.ts` - Transaction completion logic
- `test-sepay-webhook-live.js` - Test script
- `complete-verified-transaction.js` - Manual completion (backup)
