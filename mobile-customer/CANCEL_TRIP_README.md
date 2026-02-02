# 🚫 Màn Hình Hủy Chuyến Đi (CancelTripScreen)

## 📋 Tổng quan

Màn hình **CancelTripScreen** là một giải pháp chung để xử lý việc hủy các loại chuyến đi khác nhau trong ứng dụng mobile-customer của hệ thống Fire-Go.

## ✅ Các File Đã Tạo

### 1. **CancelTripScreen.tsx** 
Màn hình chính để khách hàng hủy chuyến đi.

**Đường dẫn**: `src/screens/CancelTripScreen.tsx`

**Tính năng chính**:
- ✅ Hỗ trợ 3 loại chuyến đi: Ride, Delivery, Combined Trip
- ✅ 7 lý do hủy chuyến có sẵn + tùy chọn "Lý do khác"
- ✅ Hiển thị thông tin chuyến đi (pickup/dropoff)
- ✅ Validation đầy đủ
- ✅ Xác nhận trước khi hủy
- ✅ Loading state
- ✅ Error handling
- ✅ Thông báo chính sách

### 2. **CANCEL_TRIP_GUIDE.md**
Tài liệu hướng dẫn chi tiết cách sử dụng.

**Đường dẫn**: `CANCEL_TRIP_GUIDE.md`

**Nội dung**:
- Mô tả tính năng
- Cách sử dụng trong các màn hình khác
- Route parameters
- API calls
- UI/UX features
- Best practices
- Troubleshooting

### 3. **CancelTripScreen.examples.tsx**
File chứa 10+ ví dụ thực tế về cách sử dụng.

**Đường dẫn**: `src/screens/CancelTripScreen.examples.tsx`

**Các ví dụ**:
1. Sử dụng trong RideTracking
2. Sử dụng trong DeliveryTracking
3. Sử dụng trong BookingsScreen
4. Sử dụng trong FindingDriverScreen
5. Xử lý Combined Trips
6. Kiểm tra status trước khi hủy
7. Styling các loại nút
8. Custom hook
9. Analytics tracking
10. Testing

### 4. **Cập nhật types**
Đã thêm route params vào `src/types/index.ts`:

```typescript
CancelTrip: {
  tripId: string
  tripType: 'ride' | 'delivery' | 'combined_trip'
  tripDetails?: {
    pickupAddress?: string
    dropoffAddress?: string
  }
}
```

### 5. **Cập nhật exports**
Đã thêm export trong `src/screens/index.ts`:

```typescript
export { default as CancelTripScreen } from './CancelTripScreen'
```

## 🎯 Cách Sử Dụng Nhanh

### Bước 1: Navigate đến màn hình

```typescript
import { useNavigation } from '@react-navigation/native'

const navigation = useNavigation()

// Hủy chuyến xe
navigation.navigate('CancelTrip', {
  tripId: '123',
  tripType: 'ride',
  tripDetails: {
    pickupAddress: 'Từ: Quận 1, TP.HCM',
    dropoffAddress: 'Đến: Quận 7, TP.HCM',
  }
})

// Hủy giao hàng
navigation.navigate('CancelTrip', {
  tripId: '456',
  tripType: 'delivery',
  tripDetails: {
    pickupAddress: 'Lấy hàng tại: ...',
    dropoffAddress: 'Giao đến: ...',
  }
})
```

### Bước 2: Thêm vào Navigation Stack

Nếu sử dụng React Navigation, thêm screen vào navigator:

```typescript
import { CancelTripScreen } from './screens'

<Stack.Screen 
  name="CancelTrip" 
  component={CancelTripScreen}
  options={{
    headerShown: false,
    presentation: 'modal', // Optional: hiển thị dạng modal
  }}
/>
```

## 🔌 API Integration

Màn hình tự động gọi đúng service:

| Trip Type | Service Call |
|-----------|-------------|
| `ride` | `rideService.cancelRide(tripId, 'customer', reason)` |
| `delivery` | `deliveryService.cancelDelivery(tripId, reason)` |
| `combined_trip` | `rideService.cancelRide(tripId, 'customer', reason)` |

## 🎨 UI Components

### Các lý do hủy chuyến:
1. ⏰ Đợi quá lâu
2. 📅 Thay đổi kế hoạch
3. 📍 Nhập sai địa chỉ
4. 🚗 Tìm được phương tiện khác
5. 👤 Vấn đề với tài xế
6. 💰 Giá cước không phù hợp
7. ➕ Lý do khác

### Features:
- ✅ Single selection reasons
- ✅ Custom input cho "Lý do khác" (max 200 ký tự)
- ✅ Trip info card (optional)
- ✅ Warning notice về chính sách
- ✅ Confirm & Keep buttons

## 📱 Screenshots Flow

```
┌─────────────────────────┐
│   Header: Hủy Chuyến    │
├─────────────────────────┤
│  ╔═══════════════════╗  │
│  ║  Trip Info Card   ║  │ (Optional)
│  ╚═══════════════════╝  │
├─────────────────────────┤
│  Instructions Text       │
├─────────────────────────┤
│  ┌───────────────────┐  │
│  │ ○ Reason 1        │  │
│  ├───────────────────┤  │
│  │ ● Reason 2    ✓   │  │ (Selected)
│  ├───────────────────┤  │
│  │ ○ Reason 3        │  │
│  └───────────────────┘  │
├─────────────────────────┤
│  ┌───────────────────┐  │
│  │ Custom Input...   │  │ (If "Other")
│  └───────────────────┘  │
├─────────────────────────┤
│  ⚠️ Policy Warning      │
└─────────────────────────┘
┌─────────────────────────┐
│ [Xác nhận hủy chuyến]   │ (Red button)
│ [Giữ chuyến đi]         │ (Text link)
└─────────────────────────┘
```

## 🔧 Customization

### Thêm lý do hủy mới:
```typescript
const cancelReasons = [
  // ... existing reasons
  { 
    id: 'your_reason', 
    label: 'Your Reason Text', 
    icon: 'icon-name' 
  },
]
```

### Custom styling:
```typescript
const styles = StyleSheet.create({
  // Override styles here
})
```

### Custom validation:
```typescript
const handleCancel = async () => {
  // Your validation logic
  if (customCondition) {
    Alert.alert('Warning', 'Custom message')
    return
  }
  // ... proceed
}
```

## 🧪 Testing

Để test màn hình:

```bash
# Run app
cd mobile-customer
npm start

# Test navigation
- Navigate to any trip tracking screen
- Click "Hủy chuyến" button
- Should open CancelTripScreen
```

## 📚 Related Files

### Services sử dụng:
- `src/services/rideService.ts` - `cancelRide()`
- `src/services/deliveryService.ts` - `cancelDelivery()`

### Screens liên quan:
- `src/screens/RideTracking.tsx` - Track ride và hủy
- `src/screens/DeliveryTracking.tsx` - Track delivery và hủy
- `src/screens/BookingsScreen.tsx` - Xem lịch sử và hủy
- `src/screens/FindingDriverScreen.tsx` - Tìm tài xế và hủy

## ⚠️ Lưu Ý Quan Trọng

### 1. Status Check
Trước khi navigate, nên kiểm tra status của trip:
```typescript
const cancellableStatuses = ['pending', 'finding_driver', 'accepted']
if (!cancellableStatuses.includes(trip.status)) {
  Alert.alert('Không thể hủy', 'Chuyến đi đã bắt đầu')
  return
}
```

### 2. Driver Assignment
Nếu đã có tài xế, nên hiển thị warning:
```typescript
if (trip.driverId) {
  Alert.alert('Cảnh báo', 'Tài xế đã nhận chuyến. Hủy có thể ảnh hưởng đến đánh giá.')
}
```

### 3. Cancellation Policy
Cân nhắc thêm chính sách hủy:
- Phí hủy chuyến (nếu có)
- Số lần hủy tối đa
- Thời gian hủy miễn phí

## 🚀 Next Steps

Để sử dụng màn hình này trong dự án:

1. **Thêm vào Navigation**
   - Import screen vào navigator
   - Đăng ký route

2. **Update UI của màn hình hiện tại**
   - Thay đổi logic cancel cũ
   - Navigate đến CancelTripScreen

3. **Test kỹ càng**
   - Test với các loại trip khác nhau
   - Test validation
   - Test API calls

4. **Tùy chỉnh (nếu cần)**
   - Thêm lý do hủy
   - Thay đổi styling
   - Thêm analytics

## 📞 Support

Nếu gặp vấn đề, tham khảo:
- `CANCEL_TRIP_GUIDE.md` - Hướng dẫn chi tiết
- `CancelTripScreen.examples.tsx` - Ví dụ thực tế
- Backend API documentation

## 📝 Changelog

### Version 1.0.0 (2026-02-02)
- ✅ Tạo CancelTripScreen component
- ✅ Hỗ trợ 3 loại trip: ride, delivery, combined_trip
- ✅ 7 lý do hủy có sẵn + custom reason
- ✅ Full validation và error handling
- ✅ Tích hợp với existing services
- ✅ Documentation đầy đủ
- ✅ 10+ examples

---

Made with ❤️ for Fire-Go Project
