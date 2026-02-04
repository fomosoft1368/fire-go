# Hướng Dẫn Sử Dụng CancelTripScreen

## Mô tả
`CancelTripScreen` là màn hình chung dùng để hủy các loại chuyến đi (ride, delivery, combined trip) trong ứng dụng mobile-customer.

## Tính năng

### 1. Hỗ trợ nhiều loại chuyến đi
- **Ride**: Chuyến xe thông thường
- **Delivery**: Giao hàng
- **Combined Trip**: Chuyến ghép

### 2. Các lý do hủy chuyến có sẵn
- Đợi quá lâu
- Thay đổi kế hoạch
- Nhập sai địa chỉ
- Tìm được phương tiện khác
- Vấn đề với tài xế
- Giá cước không phù hợp
- Lý do khác (cho phép nhập tự do)

### 3. Tính năng bổ sung
- Hiển thị thông tin chuyến đi (pickup/dropoff address)
- Validation đầy vào
- Xác nhận trước khi hủy
- Loading state trong quá trình xử lý
- Thông báo chính sách hủy chuyến

## Cách sử dụng

### 1. Navigation từ màn hình khác

#### Ví dụ 1: Hủy chuyến xe (Ride)
```typescript
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../types'

const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()

// Navigate to cancel screen
navigation.navigate('CancelTrip', {
  tripId: ride._id,
  tripType: 'ride',
  tripDetails: {
    pickupAddress: ride.pickupAddress,
    dropoffAddress: ride.dropoffAddress,
  }
})
```

#### Ví dụ 2: Hủy giao hàng (Delivery)
```typescript
navigation.navigate('CancelTrip', {
  tripId: delivery._id,
  tripType: 'delivery',
  tripDetails: {
    pickupAddress: delivery.pickupAddress,
    dropoffAddress: delivery.dropoffAddress,
  }
})
```

#### Ví dụ 3: Hủy chuyến ghép (Combined Trip)
```typescript
navigation.navigate('CancelTrip', {
  tripId: trip._id,
  tripType: 'combined_trip',
  tripDetails: {
    pickupAddress: trip.pickupAddress,
    dropoffAddress: trip.dropoffAddress,
  }
})
```

### 2. Thêm vào Navigation Stack

Cập nhật file navigation/types hoặc routes để thêm màn hình:

```typescript
// types/index.ts hoặc navigation types
export type RootStackParamList = {
  // ... existing screens
  CancelTrip: {
    tripId: string
    tripType: 'ride' | 'delivery' | 'combined_trip'
    tripDetails?: {
      pickupAddress?: string
      dropoffAddress?: string
    }
  }
  // ... other screens
}
```

### 3. Sử dụng trong màn hình Tracking

#### RideTracking.tsx
```typescript
const handleCancelRide = () => {
  navigation.navigate('CancelTrip', {
    tripId: rideId,
    tripType: 'ride',
    tripDetails: {
      pickupAddress: ride.pickupAddress,
      dropoffAddress: ride.dropoffAddress,
    }
  })
}
```

#### DeliveryTracking.tsx
```typescript
const handleCancelDelivery = () => {
  navigation.navigate('CancelTrip', {
    tripId: deliveryId,
    tripType: 'delivery',
    tripDetails: {
      pickupAddress: delivery.pickupAddress,
      dropoffAddress: delivery.dropoffAddress,
    }
  })
}
```

### 4. Sử dụng trong BookingsScreen

```typescript
const handleCancelBooking = (booking: RideBooking) => {
  // Xác định loại chuyến đi
  const tripType = booking.rideType === 'delivery' 
    ? 'delivery' 
    : booking.rideType === 'share' 
      ? 'combined_trip' 
      : 'ride'

  navigation.navigate('CancelTrip', {
    tripId: booking._id,
    tripType: tripType,
    tripDetails: {
      pickupAddress: booking.pickupAddress,
      dropoffAddress: booking.dropoffAddress,
    }
  })
}
```

## Parameters

### Route Params

| Tham số | Kiểu | Bắt buộc | Mô tả |
|---------|------|----------|-------|
| `tripId` | string | ✅ | ID của chuyến đi cần hủy |
| `tripType` | 'ride' \| 'delivery' \| 'combined_trip' | ✅ | Loại chuyến đi |
| `tripDetails` | object | ❌ | Thông tin chi tiết để hiển thị |
| `tripDetails.pickupAddress` | string | ❌ | Địa chỉ điểm đón |
| `tripDetails.dropoffAddress` | string | ❌ | Địa chỉ điểm đến |

## API Calls

Màn hình sẽ tự động gọi đúng service dựa trên `tripType`:

- **ride**: `rideService.cancelRide(tripId, 'customer', reason)`
- **delivery**: `deliveryService.cancelDelivery(tripId, reason)`
- **combined_trip**: `rideService.cancelRide(tripId, 'customer', reason)`

## UI/UX Features

### Responsive Design
- Tự động điều chỉnh cho các kích thước màn hình khác nhau
- Scroll view để hiển thị tất cả nội dung
- Keyboard aware cho input fields

### User Feedback
- Loading indicator trong quá trình xử lý
- Alert xác nhận trước khi hủy
- Success/Error messages
- Disabled states cho buttons

### Validation
- Yêu cầu chọn lý do hủy
- Yêu cầu nhập chi tiết nếu chọn "Lý do khác"
- Giới hạn 200 ký tự cho lý do tự nhập

## Styling

Màn hình sử dụng constants từ theme:
- `COLORS`: Màu sắc chính của app
- `SPACING`: Khoảng cách chuẩn
- `BORDER_RADIUS`: Bo góc
- `FONT_SIZES`: Kích thước chữ

## Error Handling

```typescript
try {
  // Cancel logic
} catch (error: any) {
  console.error('[CancelTripScreen] Error:', error)
  Alert.alert('Lỗi', error.message || 'Không thể hủy chuyến đi')
}
```

## Best Practices

1. **Luôn validate tripId trước khi navigate**
```typescript
if (!tripId) {
  Alert.alert('Lỗi', 'Không tìm thấy thông tin chuyến đi')
  return
}
```

2. **Provide tripDetails khi có thể** để cải thiện UX
```typescript
tripDetails: {
  pickupAddress: ride.pickupAddress,
  dropoffAddress: ride.dropoffAddress,
}
```

3. **Handle navigation sau khi hủy thành công**
```typescript
// Quay về Home hoặc Bookings screen
navigation.navigate('Home')
// hoặc
navigation.navigate('Bookings')
```

## Customization

### Thêm lý do hủy mới
```typescript
const cancelReasons = [
  // ... existing reasons
  { id: 'weather', label: 'Thời tiết xấu', icon: 'cloud' },
]
```

### Thay đổi style
Chỉnh sửa `styles` object trong component hoặc override bằng theme colors.

### Custom validation
```typescript
const handleCancel = async () => {
  // Your custom validation
  if (customCondition) {
    Alert.alert('Warning', 'Custom message')
    return
  }
  // ... rest of the code
}
```

## Testing

### Test Cases
1. ✅ Hủy chuyến xe thành công
2. ✅ Hủy giao hàng thành công
3. ✅ Validation khi chưa chọn lý do
4. ✅ Validation khi chọn "Lý do khác" nhưng không nhập
5. ✅ Xác nhận trước khi hủy
6. ✅ Error handling khi API fail
7. ✅ Loading state hiển thị đúng
8. ✅ Navigation sau khi hủy thành công

## Troubleshooting

### Lỗi "Cannot navigate to CancelTrip"
- Đảm bảo đã thêm screen vào navigation stack
- Kiểm tra types đã được định nghĩa đúng

### API call fail
- Kiểm tra tripId có hợp lệ
- Verify token authentication
- Check network connection

### UI không hiển thị đúng
- Verify constants (COLORS, SPACING) đã được import
- Check theme configuration

## Future Enhancements

- [ ] Thêm thống kê lý do hủy phổ biến
- [ ] Hiển thị phí hủy chuyến (nếu có)
- [ ] Gợi ý thay vì hủy (reschedule, change address, etc.)
- [ ] Lưu lịch sử lý do hủy của user
- [ ] Multi-language support
