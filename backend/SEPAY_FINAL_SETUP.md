# HƯỚNG DẪN CẤU HÌNH SEPAY DASHBOARD - BƯỚC CUỐI CÙNG

## ⚠️ KẾT QUẢ TEST: SEPAY KHÔNG CÓ TRANSACTION API

Test script cho kết quả:
- GET /userapi/transactions: **501 - Not Implemented**
- POST /userapi/transactions/create: **501 - Not Implemented**

→ Sepay **CHỈ HOẠT ĐỘNG** qua Dashboard Monitoring Mode  
→ **KHÔNG THỂ** tạo QR tracked qua API  
→ **PHẢI DÙNG** VietQR + Sepay webhook

---

## ✅ FLOW CHÍNH XÁC:

```
┌────────────────────────────────────────────────────────────────┐
│ 1. Backend tạo QR bằng VietQR (img.vietqr.io)                 │
│    ├─ Amount: 100,000 VND                                      │
│    ├─ Content: "NAPVI ABC12345"                                │
│    └─ Account: MB 0986190053                                   │
└─────────────┬──────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. User quét QR và chuyển tiền                                 │
│    ├─ Vào: MB 0986190053 (HO VAN TRINH)                        │
│    ├─ Số tiền: 100,000 VND                                     │
│    └─ Nội dung: "NAPVI ABC12345" (auto-fill từ QR)            │
└─────────────┬───────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. Sepay auto-scan bank account MB 0986190053                  │
│    ├─ Tần suất: Mỗi 30 giây - 1 phút                           │
│    ├─ Detect: +100,000 VND vào MB 0986190053                   │
│    ├─ Content: "NAPVI ABC12345"                                │
│    └─ Match: Pattern "NAPVI*"                                  │
└─────────────┬───────────────────────────────────────────────────┘
              │
              ▼ (Nếu match)
┌─────────────────────────────────────────────────────────────────┐
│ 4. Sepay gọi webhook URL của bạn                               │
│    POST https://choppy-kit-dualistically.ngrok-free.app/...    │
│    Body:                                                        │
│    {                                                            │
│      "id": "sepay_xxx",                                         │
│      "accountNumber": "0986190053",                             │
│      "transferAmount": 100000,                                  │
│      "content": "NAPVI ABC12345",                               │
│      "transactionDate": "2026-02-10T..."                        │
│    }                                                            │
└─────────────┬───────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. Backend nhận webhook                                        │
│    ├─ Parse content: "ABC12345"                                │
│    ├─ Find transaction in MongoDB                              │
│    ├─ Update status: PENDING → COMPLETED                       │
│    └─ Update driver balance: +100,000 VND                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🚨 VẤN ĐỀ HIỆN TẠI: SEPAY KHÔNG GỌI WEBHOOK

**Nguyên nhân có thể:**

### 1. ❌ Auto-Monitor chưa được bật
```
Sepay Dashboard → Settings → Auto Monitor
  [ ] Tự động gửi webhook khi có giao dịch  ← PHẢI TICK ✅
```

### 2. ❌ Webhook chưa ACTIVE
```
Sepay Dashboard → Webhooks → Webhook #23929
  Status: "verification" ❌  
  Cần: "active" ✅
```

### 3. ❌ Bank account chưa kết nối đúng
```
Sepay Dashboard → Tài khoản ngân hàng
  MB - 0986190053: "Pending" ❌
  Cần: "Connected" ✅
```

### 4. ❌ Webhook URL không truy cập được
```
Test: curl https://choppy-kit-dualistically.ngrok-free.app/api/wallet/sepay/webhook
Nếu ERROR → Ngrok đã expire hoặc backend không chạy
```

---

## 🎯 CHECKLIST - LÀM THEO THỨ TỰ

### ✅ Bước 1: Kiểm tra Ngrok
```bash
# Terminal 1: Backend phải chạy
cd backend
npm run start:dev
# → Listening on port 3000 ✅

# Terminal 2: Ngrok phải chạy
ngrok http 3000
# → https://choppy-kit-dualistically.ngrok-free.app ✅

# Test webhook URL từ bên ngoài
curl https://choppy-kit-dualistically.ngrok-free.app/api/wallet/sepay/webhook
# → Should return 200 or 405 (Method Not Allowed, nhưng URL accessible)
```

**Hiện tại:**
- ✅ Backend đang chạy (port 3000)
- ✅ Ngrok đang chạy (https://choppy-kit-dualistically.ngrok-free.app)
- ❓ Ngrok có expire không? (Free plan: 2 giờ/session)

**Nếu ngrok expire:**
```bash
# Stop ngrok hiện tại
Ctrl+C

# Start lại
ngrok http 3000

# Lấy URL mới
# → Copy URL mới vào Sepay dashboard webhook settings
```

---

### ✅ Bước 2: Vào Sepay Dashboard

**URL:** https://my.sepay.vn/

**Đăng nhập:**
- Username/Email: (tài khoản bạn đăng ký Sepay)
- Password: ...

---

### ✅ Bước 3: Kiểm tra "Tài khoản ngân hàng"

**Menu:** Dashboard → Tài khoản ngân hàng / Bank Accounts

**Cần thấy:**
```
╔══════════════════════════════════════════════════════════╗
║  Ngân hàng: MB (Military Bank)                          ║
║  Số tài khoản: 0986190053                               ║
║  Chủ tài khoản: HO VAN TRINH                            ║
║  Trạng thái: 🟢 Đã kết nối / Connected                  ║
║  Loại: Internet Banking / API                           ║
╚══════════════════════════════════════════════════════════╝
```

**Nếu trạng thái là "Pending" hay "Chưa xác thực":**
1. Click vào account
2. Follow hướng dẫn kết nối:
   - Có thể cần đăng nhập Internet Banking
   - Hoặc xác thực bằng SMS/OTP
   - Hoặc chuyển khoản test 1,000 VND

**Nếu KHÔNG CÓ account nào:**
1. Click "Thêm tài khoản" / "Add Account"
2. Chọn ngân hàng: MB Bank
3. Nhập số tài khoản: 0986190053
4. Xác thực (theo hướng dẫn)

---

### ✅ Bước 4: Kiểm tra "Webhook Settings"

**Menu:** Dashboard → Webhooks / Cài đặt Webhook

**Tìm webhook #23929 (hoặc tạo mới):**

```
╔══════════════════════════════════════════════════════════╗
║  Webhook #23929                                          ║
║  ─────────────────────────────────────────────────────   ║
║  URL: https://choppy-kit-dualistically.ngrok-free.app/  ║
║       api/wallet/sepay/webhook                           ║
║  ─────────────────────────────────────────────────────   ║
║  Method: POST                                            ║
║  ─────────────────────────────────────────────────────   ║
║  Events: ✅ transaction.in (Giao dịch vào)              ║
║           ✅ transaction.created                         ║
║  ─────────────────────────────────────────────────────   ║
║  Status: 🟢 ACTIVE                                       ║
║  (NOT "verification" or "pending")                       ║
║  ─────────────────────────────────────────────────────   ║
║  Stats: 0 sent / 0 failed                                ║
╚══════════════════════════════════════════════════════════╝
```

**Nếu Status = "verification":**
- Sepay đang đợi bạn xác thực webhook
- Click "Test Webhook" hoặc "Verify"
- Sepay sẽ gửi 1 test request
- Backend phải trả về 200 OK

**Nếu KHÔNG CÓ webhook:**
1. Click "Thêm Webhook" / "Add Webhook"
2. URL: `https://choppy-kit-dualistically.ngrok-free.app/api/wallet/sepay/webhook`
3. Events: Tick ✅ "transaction.in"
4. Save

---

### ✅ Bước 5: BẬT AUTO-MONITOR (QUAN TRỌNG!)

**Tìm section:** "Tự động gửi webhook" / "Auto Webhook" / "Monitor Settings"

**Cần config:**

```
╔══════════════════════════════════════════════════════════╗
║  🔄 Tự động gửi webhook khi có giao dịch mới             ║
║     ✅ Bật / Enable                                      ║
║  ─────────────────────────────────────────────────────   ║
║  🏦 Tài khoản giám sát:                                  ║
║     ✅ MB - 0986190053 (HO VAN TRINH)                    ║
║  ─────────────────────────────────────────────────────   ║
║  🔍 Lọc giao dịch:                                       ║
║     Loại: ✅ Tiền VÀO (in / incoming)                   ║
║     Nội dung: [ ] (để trống để nhận tất cả)             ║
║               hoặc: NAPVI (nếu cần filter)               ║
║  ─────────────────────────────────────────────────────   ║
║  ⏱️ Tần suất kiểm tra:                                   ║
║     ○ 30 giây                                            ║
║     ○ 1 phút                                             ║
║     ● 2 phút                                             ║
║     ○ 5 phút                                             ║
║  ─────────────────────────────────────────────────────   ║
║  [Lưu cài đặt]                                           ║
╚══════════════════════════════════════════════════════════╝
```

**⚠️ NẾU KHÔNG THẤ Section này:**
→ Sepay free plan có thể không hỗ trợ auto-webhook  
→ Cần upgrade plan hoặc liên hệ support

---

### ✅ Bước 6: Test Thử

**Sau khi config xong:**

1. **Chuyển khoản test 10,000 VND:**
   ```
   Ngân hàng: MB Bank 0986190053
   Chủ TK: HO VAN TRINH
   Số tiền: 10,000 VND
   Nội dung: TEST SEPAY WEBHOOK
   ```

2. **Đợi 1-2 phút**

3. **Kiểm tra Sepay Dashboard:**
   - Menu: Transaction History / Lịch sử giao dịch
   - Có thấy giao dịch 10,000 VND không?
   
   **Nếu CÓ:**
   ✅ Sepay đang monitor bank account thành công!
   
   **Nếu KHÔNG CÓ:**
   ❌ Bank account chưa kết nối đúng → Quay lại Bước 3

4. **Kiểm tra Webhook Logs:**
   - Menu: Webhooks → Logs / Lịch sử
   - Có thấy request nào không?
   
   **Nếu CÓ:**
   ✅ Webhook đang hoạt động!
   → Check backend logs xem có nhận được không
   
   **Nếu KHÔNG CÓ:**
   ❌ Auto-monitor chưa bật hoặc webhook chưa active → Bước 4 & 5

5. **Kiểm tra Backend Logs:**
   ```bash
   # Terminal backend
   [SepayWebhook] 📥 Received webhook
   [SepayWebhook] Content: TEST SEPAY WEBHOOK
   ...
   ```
   
   **Nếu CÓ log:**
   ✅ FULL FLOW HOẠT ĐỘNG!
   
   **Nếu KHÔNG CÓ log:**
   → Check ngrok logs: http://127.0.0.1:4040

---

## 🔧 TROUBLESHOOTING

### Issue 1: Sepay Dashboard không có "Auto Monitor"

**Nguyên nhân:**
- Free plan không support
- Hoặc feature này tên khác

**Giải pháp:**
1. Check menu: "Cài đặt" / "Settings" / "Tính năng"
2. Tìm: "Webhook tự động", "Auto notification", "Real-time sync"
3. Nếu không có → Liên hệ Sepay support hoặc upgrade plan

---

### Issue 2: Webhook Stats vẫn 0/0 dù đã bật

**Debug:**

1. **Test webhook URL từ bên ngoài:**
   ```bash
   curl -X POST https://choppy-kit-dualistically.ngrok-free.app/api/wallet/sepay/webhook \
     -H "Content-Type: application/json" \
     -d '{
       "id": "test_123",
       "accountNumber": "0986190053",
       "transferAmount": 10000,
       "content": "TEST",
       "transactionDate": "2026-02-10T10:00:00Z"
     }'
   ```
   
   **Expected:** Status 200, backend log xuất hiện
   
   **If fail:** Ngrok expired hoặc backend crash

2. **Check ngrok dashboard:**
   - http://127.0.0.1:4040/inspect/http
   - Có request từ Sepay không?
   
   **Nếu CÓ + Status 200:**
   → Sepay gọi thành công, backend nhận được
   
   **Nếu CÓ + Status 500:**
   → Backend lỗi, check logs
   
   **Nếu KHÔNG CÓ:**
   → Sepay chưa gọi webhook

3. **Kiểm tra Sepay logs:**
   - Dashboard → Webhooks → Logs / History
   - Click vào failed request (nếu có)
   - Xem error message

---

### Issue 3: Ngrok free plan expire sau 2 giờ

**Triệu chứng:**
- Webhook URL không accessible
- Curl test fail

**Giải pháp ngắn hạn:**
```bash
# Stop ngrok
Ctrl+C trong terminal ngrok

# Start lại
ngrok http 3000

# ⚠️ URL sẽ THAY ĐỔI!
# https://new-random-url.ngrok-free.app

# Phải update Sepay webhook URL với URL mới!
```

**Giải pháp dài hạn:**
1. **Upgrade ngrok** (có fixed URL)
2. **Deploy backend lên server:**
   ```bash
   # Railway
   railway deploy
   # → https://firego-api.up.railway.app
   
   # Render
   render deploy
   # → https://firego-api.onrender.com
   
   # Update Sepay webhook URL với URL cố định
   ```

---

## 📸 SCREENSHOT CHECKLIST

Để debug, chụp screenshot các phần sau và gửi:

1. ✅ **Tài khoản ngân hàng** (MB 0986190053 status)
2. ✅ **Webhook settings** (#23929 status + URL)
3. ✅ **Auto monitor settings** (nếu có)
4. ✅ **Transaction history** (có detect transfer không)
5. ✅ **Webhook logs** (có gọi webhook không)
6. ✅ **Ngrok dashboard** (http://127.0.0.1:4040)

---

## 🎯 TÓM TẮT

**Vấn đề:**
- Sepay KHÔNG CÓ Transaction API
- Chỉ có Dashboard Monitoring Mode

**Giải pháp:**
1. ✅ VietQR generates QR (hiện tại đang dùng)
2. ✅ User chuyển tiền vào MB 0986190053
3. ❓ Sepay auto-monitor bank account (CẦN BẬT)
4. ❓ Sepay gọi webhook khi có transaction (CẦN CONFIG)
5. ✅ Backend nhận webhook và cập nhật balance (code đã sẵn sàng)

**Next steps:**
1. Check Sepay dashboard theo checklist trên
2. BẬT auto-monitor
3. Test chuyển khoản 10k
4. Verify webhook được gọi
5. Nếu không work → Chụp screenshot gửi lại

---

**SUPPORT:**
- Sepay support: https://sepay.vn/lien-he.html
- Telegram: https://t.me/s/sepaychannel
- Facebook: https://www.facebook.com/messages/t/sepay.vn
