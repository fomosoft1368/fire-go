# Hướng dẫn tích hợp Google Maps API

## 🔑 Lấy Google Maps API Key

### Bước 1: Tạo Google Cloud Project
1. Truy cập [Google Cloud Console](https://console.cloud.google.com/)
2. Tạo project mới hoặc chọn project hiện tại
3. Enable billing (cần thẻ tín dụng nhưng có $300 free credit)

### Bước 2: Enable các API cần thiết
1. Vào **APIs & Services** > **Library**
2. Enable các API sau:
   - **Geocoding API** (Chuyển địa chỉ thành tọa độ)
   - **Distance Matrix API** (Tính khoảng cách và thời gian)

### Bước 3: Tạo API Key
1. Vào **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **API Key**
3. Copy API Key vừa tạo

### Bước 4: Cấu hình API Key (Recommended)
1. Click vào API key vừa tạo
2. **Application restrictions**: chọn **None** (hoặc thiết lập theo nhu cầu)
3. **API restrictions**: 
   - Chọn "Restrict key"
   - Chỉ chọn: Geocoding API, Distance Matrix API
4. Save

## 📝 Cấu hình trong project

### 1. Tạo file .env
```bash
cd mobile-customer
cp .env.example .env
```

### 2. Cập nhật .env với API key của bạn
```env
GOOGLE_MAPS_API_KEY=AIzaSy...YOUR_ACTUAL_API_KEY
REACT_APP_API_URL=http://192.168.1.12:3000/api
```

### 3. Restart app
```bash
# Dừng app hiện tại (Ctrl+C)
# Chạy lại
npm start
```

## 💰 Chi phí (Pricing)

Google Maps API có **$200 free credit/tháng**, đủ cho:
- Geocoding API: ~40,000 requests/tháng
- Distance Matrix API: ~40,000 requests/tháng

**Sau khi hết free credit:**
- Geocoding: $5/1000 requests
- Distance Matrix: $5-10/1000 requests

## 🧪 Test API key

Bạn có thể test API key bằng cách:

```bash
# Test Geocoding API
curl "https://maps.googleapis.com/maps/api/geocode/json?address=Hanoi&key=YOUR_API_KEY"

# Test Distance Matrix API
curl "https://maps.googleapis.com/maps/api/distancematrix/json?origins=Hanoi&destinations=HoChiMinh&key=YOUR_API_KEY"
```

## 🔒 Bảo mật API Key

**QUAN TRỌNG:**
- ❌ KHÔNG commit file `.env` lên git
- ✅ Đã thêm `.env` vào `.gitignore`
- ✅ Chỉ share `.env.example` (không có API key thật)
- ✅ Giới hạn API key theo domain/IP khi deploy production

## 📚 Tài liệu tham khảo

- [Geocoding API](https://developers.google.com/maps/documentation/geocoding)
- [Distance Matrix API](https://developers.google.com/maps/documentation/distance-matrix)
- [Pricing](https://mapsplatform.google.com/pricing/)
