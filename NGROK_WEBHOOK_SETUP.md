# 🚀 HƯỚNG DẪN SETUP WEBHOOK SEPAY - 5 PHÚT

## Bạn đã hoàn thành:
- ✅ Đăng ký Sepay
- ✅ Tạo webhook trong dashboard
- ✅ Thêm API Key vào `.env`
- ✅ Build backend

## Còn 2 bước cuối:

---

## 📡 BƯỚC 1: Expose Backend ra Internet (Dùng Ngrok)

### Option A: Chạy Script Tự Động (Khuyến nghị)

```bash
# Mở Terminal mới, chạy:
cd D:\fire-go\backend
start-ngrok.bat
```

### Option B: Cài Ngrok Thủ Công

**1. Download Ngrok:**
- Link: https://ngrok.com/download
- Chọn: Windows (64-bit)
- Giải nén file `ngrok.exe`

**2. Cài đặt:**
```bash
# Copy ngrok.exe vào thư mục backend
# Hoặc thêm vào PATH

# Chạy ngrok:
cd D:\fire-go\backend
ngrok http 3000
```

**3. Lấy URL Public:**

Sau khi chạy, bạn sẽ thấy:
```
ngrok

Session Status                online
Account                       Free Plan
Version                       3.x.x
Region                        Asia Pacific (ap)
<<<<<<< Updated upstream
Forwarding                    https://abc123.ngrok-free.app -> http://192.168.1.10:3000
=======
Forwarding                    https://abc123.ngrok-free.app -> http://192.168.1.14:3000
>>>>>>> Stashed changes

Web Interface                 http://127.0.0.1:4040
```

**🎯 Copy URL này:** `https://abc123.ngrok-free.app`

---

## 🔧 BƯỚC 2: Cập Nhật Webhook URL trong Sepay

**1. Vào Sepay Dashboard:**
- URL: https://my.sepay.vn/
- Login với tài khoản của bạn

**2. Mở Webhooks:**
- Menu bên trái → **Webhooks**
- Tìm webhook "verification" (ID: 23929)

**3. Sửa Webhook:**
- Click nút **"Sửa"** (hoặc Edit)
- Tìm field **"Gọi đến"** (URL)
- **Thay đổi từ:**
  ```
  https://your-domain.com/api/wallet/sepay/webhook
  ```
  **Thành:**
  ```
  https://abc123.ngrok-free.app/api/wallet/sepay/webhook
  ```
  *(Thay `abc123` bằng URL ngrok của bạn)*

**4. Lưu lại:**
- Click **"Lưu"** hoặc **"Cập nhật"**
- Đảm bảo trạng thái: **"Kích hoạt"** (màu xanh)

---

## ✅ BƯỚC 3: Test Webhook

### 3.1. Restart Backend (Terminal 1)

```bash
cd D:\fire-go\backend
npm run start:dev
```

Chờ thấy:
```
[NestApplication] Nest application successfully started
```

### 3.2. Chạy Ngrok (Terminal 2 - MỚI)

```bash
cd D:\fire-go\backend
ngrok http 3000
```

**LƯU Ý:** Giữ 2 terminal chạy, KHÔNG TẮT!

### 3.3. Test Nạp Tiền

**Option A: Test Manual Script**
```bash
# Terminal 3
cd D:\fire-go
node backend/test-manual-webhook.js
```

**Option B: Test Chuyển Khoản Thật**

1. **Tạo giao dịch trong app:**
   - Login driver trong mobile app
   - Wallet → Nạp tiền → Nhập: 10,000đ
   - QR code hiện ra

2. **Quét QR và chuyển khoản:**
   - Mở app ngân hàng
   - Quét QR code
   - Nội dung: `NAPVI ABC12345` (tự động điền)
   - Chuyển tiền

3. **Kiểm tra webhook:**
   - **Backend log** sẽ hiện:
     ```
     [SepayWebhook] 📥 Received webhook
     [WalletService] ✅ Found pending transaction
     [SepayWebhook] 🎉 Transaction completed successfully
     ```

   - **Ngrok dashboard:** http://127.0.0.1:4040
     - Xem request từ Sepay
     - Status: 200 OK

4. **Kiểm tra ví:**
   - Refresh app
   - Số dư tăng +10,000đ ✅

---

## 🔍 Troubleshooting

### 1. Webhook không được gọi

**Kiểm tra:**
- ✅ Backend đang chạy? (`npm run start:dev`)
- ✅ Ngrok đang chạy? (terminal hiển thị URL)
- ✅ URL webhook trong Sepay đã update đúng?
- ✅ Webhook ở trạng thái "Kích hoạt"?

**Xem log:**
- Sepay Dashboard → Webhooks → Logs
- Ngrok Dashboard: http://127.0.0.1:4040

### 2. Signature verification failed

**Tạm thời:**
Backend đang accept tất cả webhook (dev mode). Nếu cần verify signature:
1. Lấy `SEPAY_SECRET_KEY` từ Sepay dashboard
2. Thêm vào `.env`:
   ```env
   SEPAY_SECRET_KEY=your_secret_key_here
   ```
3. Restart backend

### 3. Transaction not found

**Kiểm tra:**
```bash
# Chạy script kiểm tra database
node backend/test-topup-api.js
```

Phải thấy:
```
✅ Recent Transactions:
1. UserType: driver ✅
   Type: topup
   Status: pending
```

---

## 📊 Flow Hoàn Chỉnh

```
Mobile App (Driver)
    ↓ (1) Tạo nạp tiền 10,000đ
<<<<<<< Updated upstream
Backend (192.168.1.10:3000)
=======
Backend (192.168.1.14:3000)
>>>>>>> Stashed changes
    ↓ (2) Tạo transaction PENDING
    ↓ (3) Generate QR code
Mobile App
    ↓ (4) Hiển thị QR
Driver quét QR
    ↓ (5) Chuyển khoản qua ngân hàng
MBBank
    ↓ (6) Nhận tiền
Sepay
    ↓ (7) Phát hiện giao dịch
    ↓ (8) POST webhook → ngrok → backend
Backend
    ↓ (9) Verify content
    ↓ (10) Tìm transaction PENDING
    ↓ (11) Cộng tiền vào driver.walletBalance
    ↓ (12) Update status → COMPLETED
Driver App
    ↓ (13) Refresh → Số dư tăng ✅
```

---

## 🎯 Checklist

### Trước khi test:
- [ ] Backend chạy (`npm run start:dev`)
- [ ] Ngrok chạy (`ngrok http 3000`)
- [ ] Copy URL ngrok
- [ ] Update webhook URL trong Sepay dashboard
- [ ] Webhook ở trạng thái "Kích hoạt"

### Khi test:
- [ ] Tạo giao dịch nạp tiền trong app
- [ ] QR code hiển thị
- [ ] Chuyển khoản với nội dung đúng
- [ ] Backend log: "Transaction completed successfully"
- [ ] Ngrok dashboard: request từ Sepay (200 OK)
- [ ] Driver wallet: số dư tăng

### Nếu lỗi:
- [ ] Check backend logs
- [ ] Check ngrok logs: http://127.0.0.1:4040
- [ ] Check Sepay webhook logs
- [ ] Chạy: `node backend/test-topup-api.js`

---

## 🚀 Production (Sau khi test OK)

Khi đã test thành công với ngrok, deploy production:

1. **Deploy backend lên hosting:**
   - Vercel: https://vercel.com/
   - Railway: https://railway.app/
   - Render: https://render.com/

2. **Lấy domain production:**
   ```
   https://api.firgo.com
   ```

3. **Update webhook URL:**
   ```
   https://api.firgo.com/api/wallet/sepay/webhook
   ```

4. **Done!** Webhook tự động hoạt động 24/7

---

## 📞 Hỗ Trợ

Nếu gặp vấn đề:
1. Check backend logs
2. Check ngrok dashboard: http://127.0.0.1:4040
3. Check Sepay webhook logs: https://my.sepay.vn/webhooks
4. Chạy test script: `node backend/test-manual-webhook.js`

---

**🎉 Chúc bạn setup thành công!**
