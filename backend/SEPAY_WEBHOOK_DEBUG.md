# Sepay Webhook Debug Guide

## ❌ Vấn Đề Hiện Tại

User đã chuyển khoản với nội dung đúng (`NAPVI 05AF7F2E`) nhưng:
- ❌ Backend KHÔNG thấy log `[SepayWebhook] Received webhook`
- ❌ Ngrok dashboard: "No requests to display yet"
- ❌ Sepay stats: "Hôm nay 0/0, Tổng 0/0"

## 🔍 Root Cause

**Backend đang dùng VietQR (static QR image), KHÔNG dùng Sepay API**

File: `backend/src/modules/drivers/services/sepay.service.ts`
```typescript
// ❌ Current: VietQR static QR (no tracking)
const qrUrl = `https://img.vietqr.io/image/970422-0986190053-compact2.png?amount=${amount}&addInfo=${content}`;

// ✅ Needed: Sepay API call (với tracking)
// POST https://my.sepay.vn/userapi/transactions/create
```

### Tại Sao VietQR Không Work Với Webhook?

1. **VietQR chỉ tạo ảnh QR** → Không có transaction tracking
2. **User scan QR** → Thấy thông tin (bank, account, amount, content)
3. **User transfer tiền** → Tiền vào MB 0986190053 ✅
4. **Nhưng Sepay KHÔNG BIẾT** transaction này ❌
5. **Webhook không được gọi** vì Sepay không track ❌

## 🎯 Các Bước Debug

### Bước 1: Check Webhook Settings

1. Vào https://my.sepay.vn/webhooks
2. **Click vào webhook #23929** (dòng có "veritification")
3. Tìm tab **"Lịch sử gọi"** hoặc **"Logs"**
4. Check xem có request nào không

**Nếu có logs → Screenshot cho tôi**
**Nếu KHÔNG có logs → Sepay chưa bao giờ gọi webhook**

### Bước 2: Check Webhook Filters

Trong chi tiết webhook #23929, check:
- [ ] **Loại sự kiện**: Phải bật "Chuyển tiền vào" (transfer in)
- [ ] **Ngân hàng**: Phải chọn MBBank hoặc "Tất cả"
- [ ] **Số tiền tối thiểu/tối đa**: Phải bao gồm 100,000 VND
- [ ] **Trạng thái**: Phải "Kích hoạt" (active) ✅ đã OK

### Bước 3: Verify Webhook URL

Sepay có thể cần **verify webhook** trước khi gửi requests:

1. Trong chi tiết webhook, check status
2. Nếu có nút "Xác thực" hoặc "Verify" → Click vào
3. Sepay sẽ gửi test request đến URL
4. Backend phải response 200 OK

**Nếu chưa verify → Sepay sẽ KHÔNG bao giờ gửi webhook thật**

### Bước 4: Test Webhook Manual

Trong Sepay dashboard:
1. Tìm nút **"Test webhook"** hoặc **"Gửi thử"**
2. Click để Sepay gửi test payload
3. Check ngrok dashboard xem có request không
4. Check backend logs xem có nhận được không

## 💡 Solutions

### Solution 1: Manual Complete (Tạm thời)

Mỗi khi user transfer, chạy script:
```bash
node test-manual-webhook-698a875b.js
```

**Pros**: Hoạt động ngay
**Cons**: Phải chạy manual mỗi lần

### Solution 2: Verify Webhook (Khuyến nghị)

1. Vào chi tiết webhook #23929
2. Click "Xác thực" hoặc "Verify"
3. Sepay sẽ test webhook URL
4. Sau khi verify OK → Auto webhook sẽ hoạt động

### Solution 3: Tích Hợp Sepay API (Lâu dài)

**Cần xác nhận**: Sepay có API để tạo transaction không?

Nếu CÓ API:
```typescript
// Replace VietQR with Sepay API
const response = await axios.post(
  'https://my.sepay.vn/userapi/transactions/create',
  {
    account_number: '0986190053',
    amount: amount,
    content: content,
  },
  {
    headers: {
      'Authorization': `Bearer ${SEPAY_API_KEY}`,
    }
  }
);

// Response will include QR code URL + transaction ID
// Sepay will track this transaction and trigger webhook
```

Nếu KHÔNG CÓ API:
- Sepay phải tự động detect transfers đến linked bank account
- Webhook PHẢI được verify trước
- Có thể cần enable trong settings

### Solution 4: Deploy Backend (Production)

Ngrok URL thay đổi mỗi lần restart → Phải update webhook URL liên tục

Deploy lên server:
- **Railway**: Free tier, auto deploy
- **Render**: Free tier với static URL
- **VPS Vietnam**: <100k/tháng, low latency

## 📋 Action Items

**Làm ngay:**
1. [ ] Click vào webhook #23929, screenshot chi tiết
2. [ ] Check tab "Lịch sử gọi" xem có logs không
3. [ ] Tìm nút "Xác thực" hoặc "Verify", click nếu có
4. [ ] Screenshot settings (filters, events)

**Nếu webhook đã verify:**
- Check Sepay có auto-detect transfers không
- Contact Sepay support để hỏi tại sao webhook không trigger

**Nếu webhook chưa verify:**
- Verify webhook URL
- Test lại bằng cách transfer tiền mới
- Monitor ngrok dashboard và backend logs

## 🔗 Useful Links

- Sepay Webhooks: https://my.sepay.vn/webhooks
- Ngrok Dashboard: http://127.0.0.1:4040
- Sepay Docs: https://docs.sepay.vn (nếu có)
- Support: https://my.sepay.vn (contact/chat)

## 📞 Next Steps

**Cần từ user:**
1. Screenshot chi tiết webhook #23929 (click vào để xem)
2. Screenshot logs/lịch sử gọi (nếu có)
3. Confirm: Có nút "Xác thực" không?
4. Confirm: User đã transfer tiền bao nhiêu lần? (để biết có transaction nào cần complete)

**Sau khi có thông tin:**
- Nếu webhook chưa verify → Hướng dẫn verify
- Nếu đã verify nhưng vẫn không trigger → Contact Sepay hoặc tích hợp API
- Tạm thời: Dùng manual script để complete transactions

---

**Last Updated**: 2026-02-10 08:30
**Status**: Waiting for webhook detail screenshots
