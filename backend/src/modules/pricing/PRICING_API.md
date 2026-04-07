# PRICING API DOCUMENTATION

## Base URL
```
<<<<<<< Updated upstream
http://192.168.1.15:3000/api/pricing
=======
http://192.168.1.14:3000/api/pricing
>>>>>>> Stashed changes
```

## Endpoints

### 1. Lấy cấu hình giá
```http
GET /api/pricing/config
Authorization: Bearer <token>
```

**Response:**
```json
{
  "baseFee": 20000,
  "pricePerKm": 8000,
  "peakMultiplier": 1.2,
  "driverShare": 85,
  "minimumFare": 20000,
  "maxDiscountRate": 30,
  "carpoolDiscounts": [
    { "passengers": 1, "discount": 0 },
    { "passengers": 2, "discount": 15 },
    { "passengers": 3, "discount": 25 },
    { "passengers": 4, "discount": 30 }
  ],
  "peakHours": [
    {
      "id": "morning",
      "name": "Giờ cao điểm sáng",
      "startTime": "07:00",
      "endTime": "09:00",
      "multiplier": 1.2
    }
  ]
}
```

### 2. Cập nhật cấu hình
```http
POST /api/pricing/config
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "baseFee": 20000,
  "pricePerKm": 8000,
  "peakMultiplier": 1.2,
  "driverShare": 85
}
```

### 3. Reset về mặc định
```http
POST /api/pricing/config/reset
Authorization: Bearer <token>
```

### 4. Tính giá ghép xe (LOGIC MỚI)
```http
POST /api/pricing/calculate
Content-Type: application/json
```

**Request Body:**
```json
{
  "passengers": [
    {
      "distance": 25,
      "isPeakTime": true
    },
    {
      "distance": 18,
      "isPeakTime": true
    },
    {
      "distance": 12,
      "isPeakTime": false
    }
  ]
}
```

**Response:**
```json
{
  "breakdown": [
    {
      "passengerIndex": 1,
      "distance": 25,
      "isPeakTime": true,
      "rawPrice": 220000,
      "basePrice": 264000,
      "finalPrice": 198000,
      "discountApplied": 25
    },
    {
      "passengerIndex": 2,
      "distance": 18,
      "isPeakTime": true,
      "rawPrice": 164000,
      "basePrice": 196800,
      "finalPrice": 147600,
      "discountApplied": 25
    },
    {
      "passengerIndex": 3,
      "distance": 12,
      "isPeakTime": false,
      "rawPrice": 116000,
      "basePrice": 116000,
      "finalPrice": 87000,
      "discountApplied": 25
    }
  ],
  "totalPrice": 432600,
  "driverShare": 85,
  "driverAmount": 367710,
  "totalPassengers": 3,
  "configUsed": {
    "baseFee": 20000,
    "pricePerKm": 8000,
    "peakMultiplier": 1.2,
    "driverSharePercent": 85,
    "discountRate": 25
  }
}
```

### 5. Kiểm tra giờ cao điểm
```http
POST /api/pricing/check-peak-time
Content-Type: application/json
```

**Request Body:**
```json
{
  "time": "2026-01-30T07:30:00Z"
}
```

**Response:**
```json
{
  "isPeakTime": true
}
```

## CÔNG THỨC TÍNH GIÁ

### Bước 1: Tính raw_price
```
raw_price = (distance × price_per_km) + base_fee
```

### Bước 2: Tính base_price
```
base_price = isPeakTime ? raw_price × peak_multiplier : raw_price
```

### Bước 3: Tính final_price
```
final_price = base_price × (1 - discount_rate[N])

Trong đó N = tổng số người ghép
```

### Bước 4: Áp dụng minimum_fare
```
if (final_price < minimum_fare) {
  final_price = minimum_fare
}
```

## VÍ DỤ SỬ DỤNG

### Test với curl:
```bash
# Tính giá cho 3 người
<<<<<<< Updated upstream
curl -X POST http://192.168.1.15:3000/api/pricing/calculate \
=======
curl -X POST http://192.168.1.14:3000/api/pricing/calculate \
>>>>>>> Stashed changes
  -H "Content-Type: application/json" \
  -d '{
    "passengers": [
      {"distance": 25, "isPeakTime": true},
      {"distance": 18, "isPeakTime": true},
      {"distance": 12, "isPeakTime": false}
    ]
  }'
```

### Test với JavaScript:
```javascript
<<<<<<< Updated upstream
const response = await fetch('http://192.168.1.15:3000/api/pricing/calculate', {
=======
const response = await fetch('http://192.168.1.14:3000/api/pricing/calculate', {
>>>>>>> Stashed changes
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    passengers: [
      { distance: 25, isPeakTime: true },
      { distance: 18, isPeakTime: true },
      { distance: 12, isPeakTime: false }
    ]
  })
});

const result = await response.json();
console.log('Tổng tiền:', result.totalPrice);
console.log('Tài xế nhận:', result.driverAmount);
```

## LƯU Ý
- `isPeakTime` là optional, mặc định = false
- Discount rate tự động lấy theo số người (carpoolDiscounts)
- Nếu không có config cho số người, discount = 0%
- Final price luôn >= minimum_fare
- Tất cả giá trị được làm tròn (Math.round)
