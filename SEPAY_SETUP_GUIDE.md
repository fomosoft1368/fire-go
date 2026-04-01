# Hướng Dẫn Cấu Hình Sepay Webhook - Tự Động Cộng Tiền

## ⚠️ QUAN TRỌNG

Hiện tại hệ thống đang dùng **VietQR miễn phí** - CHỈ TẠO QR CODE, **KHÔNG CÓ WEBHOOK TỰ ĐỘNG**!

Để webhook tự động cộng tiền khi chuyển khoản, bạn cần:

## 🔐 Bước 1: Đăng Ký Tài Khoản Sepay

### Option 1: Sepay.vn (Khuyến nghị)
1. Truy cập: https://www.sepay.vn/
2. Đăng ký tài khoản
3. Liên kết tài khoản ngân hàng
4. Lấy API Key và Secret Key

### Option 2: Casso.vn (Alternative)
1. Truy cập: https://casso.vn/
2. Đăng ký tài khoản
3. Kết nối ngân hàng Internet Banking
4. Lấy API Key

### Option 3: VietQR + Manual Webhook (đang dùng)
- ✅ Tạo QR code MIỄN PHÍ
- ❌ KHÔNG có webhook tự động
- ⚠️ Phải tự code webhook từ ngân hàng hoặc dùng dịch vụ trung gian

---

## 📋 Bước 2: Lấy API Credentials

### Sepay.vn:

1. **Đăng nhập vào dashboard Sepay**: https://my.sepay.vn/

2. **Vào mục "Cấu hình API"**:
   - API Key: `sepay_xxxxxxxxxxxxxxxxxxxx`
   - Secret Key: `sepay_secret_xxxxxxxxxxxxxxxxxxxx`
   - Account Number: Số tài khoản ngân hàng đã liên kết
   - Bank ID: Mã ngân hàng (VCB=970436, TCB=970407, MB=970422, etc.)

3. **Copy thông tin vào file `.env`**:

```env
# Sepay Configuration
SEPAY_API_KEY=sepay_xxxxxxxxxxxxxxxxxxxx
SEPAY_SECRET_KEY=sepay_secret_xxxxxxxxxxxxxxxxxxxx
SEPAY_ACCOUNT_NUMBER=0986190053
SEPAY_ACCOUNT_NAME=HO VAN TRINH
SEPAY_BANK_ID=970422
SEPAY_BANK_NAME=MB
```

---

## 🔗 Bước 3: Cấu Hình Webhook URL

### 3.1. Deploy Backend lên Server (Hosting)

<<<<<<< Updated upstream
Webhook PHẢI có URL public (không thể dùng 192.168.1.12):
=======
Webhook PHẢI có URL public (không thể dùng 192.168.1.14):
>>>>>>> Stashed changes

**Option A: Deploy lên Vercel/Railway/Render**
```bash
# Example với Railway
railway login
railway init
railway up
# Lấy URL: https://your-app.up.railway.app
```

**Option B: Dùng ngrok để test (tạm thời)**
```bash
# Download ngrok: https://ngrok.com/download
ngrok http 3000

# Copy URL: https://abc123.ngrok-free.app
```

### 3.2. Đăng Ký Webhook URL vào Sepay

1. Vào dashboard Sepay: https://my.sepay.vn/
2. Mục "Webhook"
3. Thêm URL webhook:
   ```
   https://your-domain.com/api/wallet/sepay/webhook
   ```
   hoặc nếu dùng ngrok:
   ```
   https://abc123.ngrok-free.app/api/wallet/sepay/webhook
   ```

4. Chọn Events:
   - ✅ `transaction.created` (giao dịch mới)
   - ✅ `transaction.in` (tiền vào)

5. Save webhook

---

## 🛠️ Bước 4: Update Code Backend

### 4.1. Update `.env` file:

```env
# Backend URL (for local development with ngrok)
# Production: https://your-domain.com
BACKEND_URL=https://abc123.ngrok-free.app

# Sepay Configuration
SEPAY_API_KEY=sepay_xxxxxxxxxxxxxxxxxxxx
SEPAY_SECRET_KEY=sepay_secret_xxxxxxxxxxxxxxxxxxxx
SEPAY_ACCOUNT_NUMBER=0986190053
SEPAY_ACCOUNT_NAME=HO VAN TRINH
SEPAY_BANK_ID=970422
SEPAY_BANK_NAME=MB
```

### 4.2. Update `sepay.service.ts`:

File: `backend/src/modules/drivers/services/sepay.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class SepayService {
  // Load from .env
  private readonly SEPAY_API_KEY = process.env.SEPAY_API_KEY;
  private readonly SEPAY_SECRET_KEY = process.env.SEPAY_SECRET_KEY;
  private readonly ACCOUNT_NO = process.env.SEPAY_ACCOUNT_NUMBER || '0986190053';
  private readonly ACCOUNT_NAME = process.env.SEPAY_ACCOUNT_NAME || 'HO VAN TRINH';
  private readonly BANK_ID = process.env.SEPAY_BANK_ID || '970422';
  private readonly BANK_NAME = process.env.SEPAY_BANK_NAME || 'MB';

  /**
   * Verify Sepay webhook signature (REAL IMPLEMENTATION)
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!this.SEPAY_SECRET_KEY) {
      console.log('[SepayService] ⚠️ No SEPAY_SECRET_KEY - accepting all (DEV MODE)');
      return true; // Development mode
    }

    try {
      const hmac = crypto.createHmac('sha256', this.SEPAY_SECRET_KEY);
      hmac.update(payload);
      const computedSignature = hmac.digest('hex');
      
      const isValid = computedSignature === signature;
      console.log('[SepayService] Signature verification:', isValid ? '✅ VALID' : '❌ INVALID');
      
      return isValid;
    } catch (error) {
      console.error('[SepayService] Error verifying signature:', error);
      return false;
    }
  }
}
```

---

## 🧪 Bước 5: Test Webhook

### 5.1. Test Manual (không cần chuyển khoản thật)

Gửi POST request đến webhook endpoint:

```bash
<<<<<<< Updated upstream
curl -X POST http://192.168.1.12:3000/api/wallet/sepay/webhook \
=======
curl -X POST http://192.168.1.14:3000/api/wallet/sepay/webhook \
>>>>>>> Stashed changes
  -H "Content-Type: application/json" \
  -d '{
    "id": "sepay_test_123",
    "gateway": "VIETQR",
    "transactionDate": "2026-02-09T10:00:00Z",
    "accountNumber": "0986190053",
    "transferType": "in",
    "transferAmount": 100000,
    "content": "NAPVI ABC12345",
    "bankBrandName": "MB"
  }'
```

Nếu thành công, backend log:
```
[SepayWebhook] 📥 Received webhook
[WalletService] ✅ Found pending transaction
[WalletService] ✅ Completing transaction
[SepayWebhook] 🎉 Transaction completed successfully
```

### 5.2. Test với Ngrok (giả lập production)

1. Start ngrok:
```bash
ngrok http 3000
```

2. Copy ngrok URL vào Sepay dashboard webhook

3. Tạo giao dịch nạp tiền qua API

4. Chuyển khoản thật với nội dung QR

5. Sepay sẽ gọi webhook tự động → tiền tự động cộng vào ví

---

## 🔍 Troubleshooting

### 1. Webhook không được gọi

**Kiểm tra:**
<<<<<<< Updated upstream
- ✅ Backend đã deploy lên server public (không phải 192.168.1.12)
=======
- ✅ Backend đã deploy lên server public (không phải 192.168.1.14)
>>>>>>> Stashed changes
- ✅ URL webhook đã đăng ký đúng trong Sepay dashboard
- ✅ Firewall/Security group cho phép traffic từ Sepay IP

**Xem Sepay logs:**
- Vào dashboard Sepay → Webhook → Logs
- Xem request/response từ Sepay

### 2. Signature verification failed

**Kiểm tra:**
- ✅ `SEPAY_SECRET_KEY` trong `.env` đúng
- ✅ Backend đã load `.env` file (restart sau khi thay đổi)

### 3. Transaction not found

**Kiểm tra:**
- ✅ Backend đã chạy code mới (restart backend)
- ✅ Database có collection `transactions` (không phải `wallettransactions`)
- ✅ Transaction được tạo với `userType: 'driver'`

**Debug:**
```bash
# Kiểm tra database
node backend/test-topup-api.js

# Phải thấy:
✅ Recent Transactions:
1. ID: 65f1234...
   UserType: driver ✅
   Status: pending
```

### 4. Content không khớp

**Format nội dung:**
```
NAPVI ABC12345
       ^^^^^^^^
       8 ký tự cuối của transaction._id
```

**Kiểm tra:**
- QR code content: `NAPVI ABC12345`
- Chuyển khoản content: `NAPVI ABC12345` (phải giống CHÍNH XÁC)
- Webhook content: backend extract `ABC12345` để tìm transaction

---

## 📊 So Sánh Các Giải Pháp

| Dịch Vụ | Chi Phí | Webhook | Độ Khó | Khuyến Nghị |
|---------|---------|---------|--------|-------------|
| **Sepay.vn** | 20,000đ/tháng | ✅ Auto | Dễ | ⭐⭐⭐⭐⭐ Tốt nhất |
| **Casso.vn** | Free (limit) | ✅ Auto | Dễ | ⭐⭐⭐⭐ Tốt |
| **VietQR + Manual** | FREE | ❌ Manual | Khó | ⭐⭐ Chỉ test |
| **Bank API** | FREE | ✅ Auto | Rất khó | ⭐ Không nên |

---

## ✅ Checklist Hoàn Chỉnh

### Development (Test):
- [ ] Đăng ký tài khoản Sepay/Casso
- [ ] Lấy API Key và Secret Key
- [ ] Cập nhật file `.env`
- [ ] Cài đặt ngrok
- [ ] Start ngrok: `ngrok http 3000`
- [ ] Cấu hình webhook URL trong Sepay dashboard
- [ ] Restart backend
- [ ] Test tạo QR nạp tiền
- [ ] Test webhook manual (curl)
- [ ] Test chuyển khoản thật

### Production (Live):
- [ ] Deploy backend lên hosting (Vercel/Railway/Render)
- [ ] Cập nhật Domain vào Sepay webhook
- [ ] Cấu hình HTTPS (bắt buộc cho webhook)
- [ ] Test webhook production
- [ ] Monitor logs
- [ ] Backup database trước khi go-live

---

## 🆘 Liên Hệ Hỗ Trợ

- **Sepay Support**: https://www.sepay.vn/lien-he
- **Casso Support**: https://casso.vn/ho-tro
- **Documentation**: https://docs.sepay.vn/

---

## 💡 Tóm Tắt

**Hiện tại hệ thống:**
- ✅ Code webhook đã HOÀN CHỈNH
- ✅ Backend sẵn sàng nhận webhook
- ❌ CHƯA có dịch vụ webhook thực (đang dùng VietQR free - chỉ QR code)

**Cần làm ngay:**
1. Đăng ký Sepay.vn hoặc Casso.vn
2. Lấy API credentials
3. Deploy backend lên server public (hoặc dùng ngrok test)
4. Cấu hình webhook URL
5. Test → Done! 🚀
