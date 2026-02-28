# HƯỚNG DẪN TẠO QR CODE BẰNG SEPAY DASHBOARD

## 🎯 Mục Tiêu

Thay vì dùng VietQR (ảnh tĩnh), dùng Sepay QR (có tracking) để:
- Sepay biết transaction ID ngay từ đầu
- Auto trigger webhook khi có transfer
- Không cần parse content "NAPVI ABC12345"

---

## 📋 Bước 1: Tạo QR Bằng Dashboard

1. **Vào Sepay Dashboard:** https://my.sepay.vn/

2. **Click menu "Tạo QR"** (ở sidebar bên trái)

3. **Điền thông tin:**
   ```
   Ngân hàng: MB - 0986190053 (HO VAN TRINH)
   Số tiền: 20000 (20k test)
   Nội dung: TEST SEPAY QR
   Mã đơn hàng: (để trống hoặc nhập test_123)
   ```

4. **Click "Tạo QR"**

5. **Lấy QR URL:**
   - Có thể sẽ cho bạn:
     - QR code image URL
     - Payment link (https://sepay.vn/pay/xxxxx)
     - Transaction ID

6. **Screenshot lại** phần tạo QR và gửi cho tôi:
   - Form tạo QR
   - QR code kết quả
   - URL / Link nếu có

---

## 📋 Bước 2: Quét QR và Chuyển Tiền Test

1. Quét QR vừa tạo
2. Chuyển 20k
3. Đợi 1-2 phút
4. Check:
   - Sepay Dashboard → Giao dịch (có transaction không?)
   - Sepay Dashboard → Webhooks → #23929 Stats (có tăng không?)
   - Backend logs (có nhận webhook không?)

---

## 🔍 Thông Tin Cần Xem

Sau khi tạo QR, tôi cần biết:

1. **QR URL có format gì?**
   - Ví dụ: `https://sepay.vn/qr/xxxxx`
   - Hoặc: `https://img.sepay.vn/xxxxx.png`

2. **Có Transaction ID / Order ID không?**
   - Để backend có thể link với transaction trong MongoDB

3. **Response từ Sepay có format gì?**
   - JSON?
   - Chỉ là URL?

4. **Có API để tạo QR programmatically không?**
   - Tìm trong dashboard: "API Documentation" hoặc "Developers"

---

## 🎯 Mục Tiêu Cuối

Nếu Sepay có API tạo QR:

```typescript
// Backend: sepay.service.ts
async generateQRCode(amount: number, transactionId: string) {
  // Gọi Sepay API tạo QR
  const response = await axios.post(
    'https://my.sepay.vn/api/qr/create', // ← Endpoint cần tìm
    {
      amount: amount,
      content: `NAPVI ${transactionId.slice(-8)}`,
      account_id: 'MB-0986190053',
      order_id: transactionId,
    },
    {
      headers: {
        'Authorization': `Bearer ${SEPAY_API_KEY}`,
      }
    }
  );
  
  return {
    qrCodeUrl: response.data.qr_url, // QR do Sepay tạo (CÓ TRACKING)
    transactionId: response.data.transaction_id,
    // ...
  };
}
```

Khi đó:
- QR có tracking ngay từ đầu ✅
- Webhook auto trigger khi có transfer ✅
- Không cần manual verification ✅

---

## 📸 Screenshot Cần Gửi

1. Menu "Tạo QR" - Form tạo QR
2. Kết quả sau khi tạo (QR image + URL)
3. Nếu có API docs, chụp luôn

Sau đó tôi sẽ viết code tích hợp vào backend!
