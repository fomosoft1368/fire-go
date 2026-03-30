# HƯỚNG DẪN SETUP NGROK - CÁCH 2: CHOCOLATEY

## 📦 Bước 1: Cài Chocolatey (Package Manager cho Windows)

### Mở PowerShell **AS ADMINISTRATOR**:
1. Nhấn **Windows + X**
2. Chọn **"Windows PowerShell (Admin)"** hoặc **"Terminal (Admin)"**

### Chạy lệnh cài Chocolatey:

```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
```

### Kiểm tra đã cài thành công:
```powershell
choco --version
```

Kết quả: `2.x.x` hoặc cao hơn

---

## 🔧 Bước 2: Cài Ngrok qua Chocolatey

### Trong PowerShell (Admin), chạy:

```powershell
choco install ngrok -y
```

### Kiểm tra:
```powershell
ngrok version
```

Kết quả: `ngrok version 3.x.x`

---

## 🚀 Bước 3: Chạy Ngrok (2 Terminals)

### Terminal 1 - Backend:
```powershell
cd D:\fire-go\backend
npm run start:dev
```

Chờ thấy: `[NestApplication] Nest application successfully started`

### Terminal 2 - Ngrok (PowerShell KHÁC):
```powershell
ngrok http 3000
```

### Lấy URL:
Sau khi chạy, copy URL:
```
<<<<<<< Updated upstream
Forwarding    https://abc123.ngrok-free.app -> http://192.168.1.10:3000
=======
Forwarding    https://abc123.ngrok-free.app -> http://192.168.1.14:3000
>>>>>>> Stashed changes
```

**Copy:** `https://abc123.ngrok-free.app`

---

## 🔗 Bước 4: Update Webhook URL trong Sepay

1. **Vào:** https://my.sepay.vn/
2. **Menu:** Webhooks
3. **Click:** Nút "Sửa" webhook "verification"
4. **Gọi đến:** Thay đổi thành:
   ```
   https://abc123.ngrok-free.app/api/wallet/sepay/webhook
   ```
   *(Thay `abc123` = URL ngrok của bạn)*
5. **Click:** "Lưu"

---

## ✅ Bước 5: Test

### Test Manual:
```powershell
cd D:\fire-go
node backend/test-manual-webhook.js
```

### Test Chuyển Khoản Thật:
1. Tạo nạp tiền 10,000đ trong app
2. Quét QR và chuyển khoản
3. Chờ 5-10 giây
4. Check backend log:
   ```
   [SepayWebhook] 📥 Received webhook
   [SepayWebhook] 🎉 Transaction completed successfully
   ```
5. Refresh app → **Số dư tăng!** ✅

---

## 🛠️ HOẶC Dùng Script Tự Động (Khuyến nghị)

```powershell
# Chạy trong PowerShell (Admin):
cd D:\fire-go\backend
.\setup-ngrok-chocolatey.ps1
```

Script sẽ tự động:
- ✅ Kiểm tra Chocolatey (cài nếu chưa có)
- ✅ Cài Ngrok
- ✅ Chạy ngrok luôn

---

## 🔍 Troubleshooting

### Lỗi: "choco: command not found"
**Nguyên nhân:** Chocolatey chưa cài hoặc chưa có trong PATH

**Giải pháp:**
1. Restart PowerShell
2. Hoặc refresh PATH:
   ```powershell
   $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
   ```

### Lỗi: "ngrok: command not found"
**Nguyên nhân:** Ngrok chưa cài hoặc chưa có trong PATH

**Giải pháp:**
1. Restart PowerShell
2. Hoặc cài lại: `choco install ngrok -y --force`

### Lỗi: "Requires elevation" (cần quyền Admin)
**Giải pháp:** Chạy PowerShell **AS ADMINISTRATOR**

---

## 📊 So Sánh Cách 1 vs Cách 2

| Feature | Cách 1 (Download) | Cách 2 (Chocolatey) |
|---------|-------------------|---------------------|
| **Cài đặt** | Download file, copy thủ công | Tự động qua package manager |
| **Cập nhật** | Download lại file mới | `choco upgrade ngrok -y` |
| **Gỡ cài đặt** | Xóa file thủ công | `choco uninstall ngrok -y` |
| **PATH** | Phải setup thủ công | Tự động thêm vào PATH |
| **Khuyến nghị** | Người dùng cơ bản | ⭐ Developer (chuyên nghiệp hơn) |

---

## 🎯 Tóm Tắt Lệnh Nhanh

```powershell
# 1. Cài Chocolatey (Admin PowerShell)
Set-ExecutionPolicy Bypass -Scope Process -Force; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# 2. Cài Ngrok
choco install ngrok -y

# 3. Chạy Ngrok
ngrok http 3000

# 4. Hoặc dùng script tự động
cd D:\fire-go\backend
.\setup-ngrok-chocolatey.ps1
```

---

**Xong! Giờ update webhook URL trong Sepay và test thôi!** 🚀
