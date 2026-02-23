# Sepay Account Monitoring - Checklist

## ✅ Các Bước Cần Làm Trong Sepay Dashboard

### 1. Đăng nhập vào https://my.sepay.vn/

### 2. Check "Tài khoản ngân hàng"
- ✅ MB Bank: 0986190053 (HO VAN TRINH) đã liên kết?
- ✅ Trạng thái: **ACTIVE** hoặc **CONNECTED**?

### 3. Check "Webhook Configuration"

Trong phần Webhook Settings:

```
URL: https://choppy-kit-dualistically.ngrok-free.app/api/wallet/sepay/webhook
Method: POST
Events: 
  ✅ transaction.created
  ✅ transaction.in (tiền vào)
  ✅ transaction.completed
Status: ACTIVE ✅ (KHÔNG PHẢI "verification" hay "pending")
```

### 4. Check "Auto-Monitor Settings" (QUAN TRỌNG!)

Có section dạng:
```
🔄 Tự động gửi webhook khi có giao dịch mới
  ✅ Bật (Enable)
  
🏦 Ngân hàng giám sát:
  ✅ MB - 0986190053
  
🔍 Lọc giao dịch:
  - Loại: Tiền VÀO (in)
  - Nội dung chứa: NAPVI (hoặc để trống để nhận tất cả)
  
⏱️ Tần suất kiểm tra:
  - Thời gian: 30 giây / 1 phút
```

### 5. Kiểm Tra "Transaction History" hoặc "Logs"

Xem có thấy transaction 100k bạn vừa chuyển không?

- Nếu **CÓ** transaction trong Sepay → Webhook config sai
- Nếu **KHÔNG CÓ** → Sepay chưa kết nối đúng với bank hoặc chưa bật monitoring

---

## 🧪 Test Ngay

### Bước 1: Bật Auto-Monitor trong Sepay
(Nếu chưa bật)

### Bước 2: Test Transfer Nhỏ
Chuyển **10,000 VND** vào MB 0986190053  
Nội dung: `TEST SEPAY WEBHOOK`

### Bước 3: Kiểm Tra Sepay Dashboard
Sau 1-2 phút, vào **Transaction History** xem có nhận được không?

- **Nếu CÓ**: Sepay đang monitor ✅
- **Nếu KHÔNG**: Bank chưa kết nối hoặc cần bật tính năng

### Bước 4: Kiểm Tra Webhook Logs
Nếu Sepay nhận được transaction, check xem có gọi webhook không?

Dashboard → Webhooks → Logs

Nếu không có request → Webhook URL sai hoặc chưa active

---

## 🔧 Các Giải Pháp

### Option 1: Bật Account Monitoring (KHUYẾN NGHỊ)
- Free với Sepay
- Tự động detect mọi transaction vào account
- QR code có thể dùng VietQR (miễn phí)
- Sepay trigger webhook khi có transfer

### Option 2: Dùng Sepay Transaction API
Nếu Sepay có API tạo transaction:

```bash
POST https://my.sepay.vn/userapi/transactions/create
Headers:
  Authorization: Bearer <SEPAY_API_KEY>
Body:
  {
    "account_number": "0986190053",
    "amount": 100000,
    "content": "NAPVI ABC12345"
  }
Response:
  {
    "qr_url": "https://sepay.vn/qr/xxxxx",
    "transaction_id": "sepay_txn_xxxxx"
  }
```

Lợi ích:
- QR có tracking ngay từ đầu
- Webhook trigger chắc chắn

### Option 3: Deploy Backend lên Server
Nếu ngrok không ổn định:

```bash
# Deploy lên Railway/Render
railway deploy

# Lấy URL cố định
https://firego-api.railway.app

# Update Sepay webhook URL
https://firego-api.railway.app/api/wallet/sepay/webhook
```

---

## ❓ Câu Hỏi Cần Trả Lời

1. **Trong Sepay Dashboard, phần "Tài khoản ngân hàng" có show MB 0986190053 không?**
2. **Trạng thái account là gì? (Active/Connected/Pending/...)**
3. **Có tính năng "Auto-monitor" hay "Tự động webhook" không?**
4. **Transaction history có show transaction 100k bạn vừa chuyển không?**
5. **Webhook logs có request nào không? (Stats hiện tại: 0/0)**

---

## 🎯 Next Steps

**Sau khi check dashboard:**

### Nếu Auto-Monitor ĐÃ BẬT:
→ Vấn đề là webhook URL hoặc content format
→ Test với `curl` manual webhook (đã test thành công ✅)
→ Check ngrok còn running không?

### Nếu Auto-Monitor CHƯA BẬT:
→ Bật tính năng trong Sepay settings
→ Test transfer 10k
→ Đợi 1-2 phút
→ Check webhook logs

### Nếu Sepay KHÔNG CÓ Auto-Monitor:
→ Cần dùng Sepay API (option 2)
→ Hoặc chuyển sang Casso.vn
→ Hoặc deploy backend + dùng service khác (VNPay, MoMo, ...)

