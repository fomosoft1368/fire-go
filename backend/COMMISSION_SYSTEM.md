# Driver Wallet Commission System

## Cơ chế chiết khấu động (Dynamic Commission)

### Tổng quan
Hệ thống **tự động trừ % chiết khấu** từ ví tài xế sau mỗi cuốc xe. Tỷ lệ chiết khấu được lấy **động** từ **PricingConfig**, không hard-code.

---

## Công thức tính chiết khấu

```typescript
// Trong PricingConfig
driverShare = 80  // Tài xế nhận 80%

// Tính commission cho app
commissionRate = 100 - driverShare  // = 20%

// Ví dụ: Cuốc xe 100.000đ
tripAmount = 100000
commissionAmount = tripAmount × (commissionRate / 100)
                 = 100000 × 0.20
                 = 20.000đ  // App nhận
driverEarns = 80.000đ       // Tài xế giữ lại (đã thu từ khách)
```

---

## Luồng hoạt động

### 1. **Tài xế hoàn thành cuốc xe**
- Khách trả **100.000đ** (tiền mặt hoặc chuyển khoản cá nhân)
- Tài xế **thu trực tiếp 100.000đ** vào túi

### 2. **Hệ thống tự động trừ chiết khấu**
```typescript
// Backend gọi sau khi trip completed
await walletService.deductCommission(driverId, tripId, 100000);
```

**Xử lý:**
1. Lấy `driverShare` từ PricingConfig (VD: 80%)
2. Tính `commissionRate = 100 - 80 = 20%`
3. Tính `commissionAmount = 100000 × 20% = 20.000đ`
4. Trừ **20.000đ** từ `walletBalance` của tài xế
5. Tạo transaction log với type `COMMISSION`

### 3. **Kiểm tra ngưỡng khóa ví**
```typescript
if (driver.walletBalance < driver.minimumBalance) {
  driver.isWalletLocked = true;  // Khóa ví, không nhận cuốc mới
}
```

---

## Cấu hình PricingConfig

### Xem cấu hình hiện tại
```bash
GET /api/pricing/config
```

**Response:**
```json
{
  "driverShare": 80,
  "peakMultiplier": 1.5,
  "maxDiscountRate": 30,
  ...
}
```

### Cập nhật driverShare (Admin)
```bash
PUT /api/pricing/config
{
  "driverShare": 85  // Tăng lên 85% cho tài xế
}
```

**Kết quả:**
- Tài xế giờ nhận **85%**
- App chỉ thu **15%** chiết khấu

---

## Ví dụ thực tế

### Scenario 1: Tài xế chạy 5 cuốc liên tục (tiền mặt)

| Thời gian | Cuốc xe | Thu từ khách | Commission (20%) | Ví tài xế |
|-----------|---------|--------------|------------------|-----------|
| 07:00 | Nạp tiền đầu ngày | 0 | 0 | **200.000đ** |
| 09:00 | Cuốc 1: 150k | +150k cash | -30k | **170.000đ** |
| 11:00 | Cuốc 2: 500k | +500k cash | -100k | **70.000đ** |
| 14:00 | Cuốc 3: 300k | +300k cash | -60k | **10.000đ** ⚠️ |
| 14:00 | **BỊ KHÓA** | - | - | **< 100k → LOCK** 🔒 |
| 14:05 | Nạp thêm | 0 | 0 | **210.000đ** ✅ Mở khóa |

**Tổng kết:**
- Tài xế thu về: 150k + 500k + 300k = **950.000đ** (tiền mặt)
- App đã thu: 30k + 100k + 60k = **190.000đ** (từ ví)
- Ví còn: 10.000đ → **BỊ KHÓA** (< 100.000đ tối thiểu)

### Scenario 2: Thay đổi driverShare từ 80% → 85%

**Trước:**
```
driverShare = 80  → commissionRate = 20%
Cuốc 100k → Commission = 20k
```

**Sau:**
```
driverShare = 85  → commissionRate = 15%
Cuốc 100k → Commission = 15k  ✅ Giảm 5k
```

---

## Database Schema

### WalletTransaction (Commission record)
```typescript
{
  _id: ObjectId,
  driverId: ObjectId,
  type: 'commission',
  amount: -20000,              // Số âm (bị trừ)
  balanceBefore: 200000,
  balanceAfter: 180000,
  tripId: ObjectId,
  commissionRate: 20,          // % chiết khấu thực tế
  description: "Phí chiết khấu 20% (Tài xế nhận 80%) - Cuốc xe 100.000đ",
  status: 'completed',
  completedAt: "2026-02-07T10:30:00Z",
  createdAt: "2026-02-07T10:30:00Z"
}
```

### Driver (Wallet fields)
```typescript
{
  _id: ObjectId,
  walletBalance: 150000,       // Số dư hiện tại
  minimumBalance: 100000,      // Ngưỡng tối thiểu
  isWalletLocked: false,       // Trạng thái khóa
  pendingBalance: 0,           // Tiền đang chờ xử lý (rút tiền)
  // ❌ KHÔNG CÒN: commissionRate (dynamic from PricingConfig)
}
```

---

## Backend Implementation

### WalletService.deductCommission()
```typescript
async deductCommission(driverId, tripId, tripAmount) {
  // 1. Lấy driverShare từ PricingConfig
  const config = await pricingService.getConfig();
  const driverShare = config.driverShare || 85;
  const commissionRate = 100 - driverShare;

  // 2. Tính commission amount
  const commissionAmount = Math.round(tripAmount * (commissionRate / 100));

  // 3. Trừ từ ví
  driver.walletBalance -= commissionAmount;

  // 4. Khóa ví nếu < minimum
  if (driver.walletBalance < driver.minimumBalance) {
    driver.isWalletLocked = true;
  }

  // 5. Log transaction
  await createTransaction({
    type: 'commission',
    amount: -commissionAmount,
    commissionRate,
    description: `Phí ${commissionRate}% - Cuốc xe ${tripAmount}đ`,
  });
}
```

---

## Migration (Xóa field cũ)

**Chạy script:**
```bash
cd backend
node scripts/remove-driver-commission-field.js
```

**Kết quả:**
- Xóa field `commissionRate` khỏi tất cả driver documents
- Commission giờ tính **động** từ PricingConfig

---

## API Endpoints

### Lấy số dư ví
```
GET /api/drivers/wallet/balance
Response: {
  balance: 150000,
  minimumBalance: 100000,
  isLocked: false,
  pending: 0
}
```

### Lịch sử giao dịch
```
GET /api/drivers/wallet/transactions?limit=20
Response: [
  {
    type: "commission",
    amount: -20000,
    balanceAfter: 180000,
    commissionRate: 20,
    tripId: "...",
    description: "Phí chiết khấu 20%...",
    createdAt: "2026-02-07T10:30:00Z"
  }
]
```

---

## Lưu ý quan trọng

1. **Commission rate KHÔNG lưu trong Driver** → Lấy động từ PricingConfig
2. **Tài xế nhận tiền trực tiếp từ khách** → App CHỈ thu qua ví
3. **Ví bị khóa khi < minimumBalance** → Không nhận cuốc mới
4. **Admin có thể điều chỉnh driverShare** → Ảnh hưởng toàn hệ thống
5. **Transaction log ghi lại commissionRate thực tế** → Audit trail

---

## Testing

```bash
# 1. Tạo driver mới với ví = 200k
POST /api/drivers/register
{ ..., walletBalance: 200000 }

# 2. Hoàn thành cuốc xe 100k
POST /api/rides/complete
{ tripId: "...", amount: 100000 }

# 3. Check wallet balance (nên còn 180k)
GET /api/drivers/wallet/balance
→ { balance: 180000 }  # Đã trừ 20k commission

# 4. Check transaction log
GET /api/drivers/wallet/transactions
→ [ { type: "commission", amount: -20000, commissionRate: 20 } ]
```

---

## Tài liệu liên quan
- [WALLET_SYSTEM.md](./WALLET_SYSTEM.md) - Hệ thống ví tài xế
- [PRICING_CONFIG.md](./PRICING_CONFIG.md) - Cấu hình giá
- [AUTO_DEDUCT_COMMISSION.md](./AUTO_DEDUCT_COMMISSION.md) - Hook tự động trừ tiền
