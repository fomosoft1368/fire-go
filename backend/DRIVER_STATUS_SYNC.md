# Đồng bộ hóa Driver Status

## Vấn đề đã khắc phục

Trước đây, hệ thống có 2 trường trạng thái cho driver:
- `status`: enum ('offline', 'online', 'on_trip', 'break')
- `isOnline`: boolean

Điều này gây ra **inconsistency** khi:
- Một số driver có `status='offline'` nhưng `isOnline=true`
- Query tìm driver chỉ check một trong hai trường → bỏ sót driver

## Giải pháp

### 1. Đồng bộ trong Code

**drivers.service.ts:**
- ✅ `updateStatus()`: Tự động sync `isOnline` với `status`
- ✅ `updateOnlineStatus()`: Sync cả 2 trường
- ✅ `updateHeartbeat()`: Đảm bảo driver online có cả 2 trường đúng
- ✅ `autoOfflineInactiveDrivers()`: Sync khi offline tự động

**seed.ts:**
- ✅ Tạo driver mẫu với cả 2 trường được sync ngay từ đầu

### 2. Đồng bộ Query tìm driver

**Trước:**
```typescript
driverModel.find({ status: 'online' })
```

**Sau:**
```typescript
driverModel.find({
  $or: [
    { status: 'online' },
    { isOnline: true }
  ]
})
```

**Files đã sửa:**
- ✅ `auto-assign.service.ts` (rides)
- ✅ `combined-trips.service.ts` (2 vị trí)
- ✅ `rides.service.ts` (nearby drivers)

### 3. Script đồng bộ Database

Chạy một lần để sync dữ liệu hiện có:
```bash
node backend/sync-driver-status.js
```

Script này sẽ:
- Tìm tất cả driver có status và isOnline không khớp
- Cập nhật `isOnline` theo `status`
- Đặt `isAvailable` và `lastOnlineTime` cho driver online

## Kết quả

### Trước khi sync:
- 5 drivers tổng
- 2 drivers có status='online' & isOnline=true ✅
- **3 drivers có status='offline' nhưng isOnline=true** ❌

### Sau khi sync:
- 5 drivers tổng  
- 2 drivers có status='online' & isOnline=true ✅
- 3 drivers có status='offline' & isOnline=false ✅
- **Tất cả driver đều đồng bộ!** ✨

## Lưu ý cho Developer

### Khi update driver status:
1. **LUÔN** dùng `updateStatus()` hoặc `updateOnlineStatus()` từ DriversService
2. **ĐỪNG** update trực tiếp trong database với `findByIdAndUpdate({ status: ... })`
3. Heartbeat tự động giữ driver online (update cả 2 trường)

### Khi query drivers:
- Sử dụng `$or: [{ status: 'online' }, { isOnline: true }]` để tìm tất cả driver online
- Hoặc chỉ dùng `isOnline: true` nếu muốn đơn giản hơn

### Cron job:
- `autoOfflineInactiveDrivers()` chạy mỗi phút để offline driver không heartbeat > 3 phút
- Tự động sync cả 2 trường khi offline

## Maintenance

Nếu phát hiện inconsistency trong tương lai:
```bash
# Kiểm tra trạng thái
node backend/check-all-drivers.js

# Đồng bộ lại
node backend/sync-driver-status.js

# Kiểm tra chi tiết
node backend/check-drivers-status.js
```
