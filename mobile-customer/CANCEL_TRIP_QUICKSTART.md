/**
 * QUICK START - Tích hợp CancelTripScreen vào dự án
 * 
 * File này chứa các bước cần thiết để tích hợp CancelTripScreen vào mobile-customer app
 */

// ============================================================================
// BƯỚC 1: Cập nhật RideTracking.tsx
// ============================================================================

/**
 * File: src/screens/RideTracking.tsx
 * 
 * Tìm dòng handleCancelRide (khoảng dòng 232-246)
 * Thay thế code cũ bằng code mới
 */

// TÌM CODE NÀY (OLD):
/*
const handleCancelRide = () => {
  Alert.alert(
    'Hủy chuyến đi',
    'Bạn có chắc chắn muốn hủy chuyến đi này không?',
    [
      { text: 'Không', style: 'cancel' },
      {
        text: 'Hủy chuyến',
        style: 'destructive',
        onPress: () => {
          navigation?.goBack()
        },
      },
    ]
  )
}
*/

// THAY BẰNG CODE MỚI:
const handleCancelRide = () => {
  if (!rideId) {
    Alert.alert('Lỗi', 'Không tìm thấy thông tin chuyến đi')
    return
  }

  navigation.navigate('CancelTrip', {
    tripId: rideId,
    tripType: 'ride',
    tripDetails: ride ? {
      pickupAddress: ride.pickupAddress,
      dropoffAddress: ride.dropoffAddress,
    } : undefined
  })
}

// ============================================================================
// BƯỚC 2: Cập nhật DeliveryTracking.tsx
// ============================================================================

/**
 * File: src/screens/DeliveryTracking.tsx
 * 
 * Thêm hàm handleCancelDelivery nếu chưa có
 */

// Import cần thiết (thêm vào đầu file nếu chưa có)
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../types'

// Thêm hàm này vào component
const handleCancelDelivery = () => {
  if (!deliveryId) {
    Alert.alert('Lỗi', 'Không tìm thấy thông tin giao hàng')
    return
  }

  navigation.navigate('CancelTrip', {
    tripId: deliveryId,
    tripType: 'delivery',
    tripDetails: delivery ? {
      pickupAddress: delivery.pickupAddress,
      dropoffAddress: delivery.dropoffAddress,
    } : undefined
  })
}

// Thêm button hủy trong JSX (nếu chưa có)
<TouchableOpacity 
  style={styles.cancelButton} 
  onPress={handleCancelDelivery}
>
  <MaterialIcons name="cancel" size={20} color="#fff" />
  <Text style={styles.cancelButtonText}>Hủy giao hàng</Text>
</TouchableOpacity>

// ============================================================================
// BƯỚC 3: Cập nhật BookingsScreen.tsx
// ============================================================================

/**
 * File: src/screens/BookingsScreen.tsx
 * 
 * Thêm nút hủy vào mỗi booking card
 */

// Thêm hàm handleCancelBooking
const handleCancelBooking = (booking: RideBooking) => {
  // Kiểm tra status - chỉ cho phép hủy ở một số status nhất định
  const cancellableStatuses = ['pending', 'accepted', 'finding_driver', 'driver_assigned']
  
  if (!cancellableStatuses.includes(booking.status)) {
    Alert.alert(
      'Không thể hủy',
      'Chuyến đi đã bắt đầu hoặc đã hoàn thành. Bạn không thể hủy lúc này.',
      [{ text: 'OK' }]
    )
    return
  }

  // Xác định loại chuyến đi
  let tripType: 'ride' | 'delivery' | 'combined_trip' = 'ride'
  
  if (booking.rideType === 'delivery') {
    tripType = 'delivery'
  } else if (booking.rideType === 'share' || booking.combinedTripId) {
    tripType = 'combined_trip'
  }

  navigation.navigate('CancelTrip', {
    tripId: booking._id || booking.id,
    tripType: tripType,
    tripDetails: {
      pickupAddress: booking.pickupAddress || booking.pickupLocation,
      dropoffAddress: booking.dropoffAddress || booking.dropoffLocation,
    }
  })
}

// Trong hàm render booking card, thêm button:
const renderBookingCard = (booking: RideBooking) => {
  const cancellableStatuses = ['pending', 'accepted', 'finding_driver', 'driver_assigned']
  const canCancel = cancellableStatuses.includes(booking.status)
  
  return (
    <TouchableOpacity 
      style={styles.bookingCard}
      onPress={() => handleBookingPress(booking)}
    >
      {/* ... existing booking info ... */}
      
      {/* Thêm nút hủy */}
      {canCancel && (
        <TouchableOpacity
          style={styles.cancelBookingButton}
          onPress={() => {
            // Prevent parent onPress
            handleCancelBooking(booking)
          }}
        >
          <MaterialIcons name="cancel" size={16} color="#ef4444" />
          <Text style={styles.cancelBookingButtonText}>Hủy chuyến</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  )
}

// Thêm styles cho button
const styles = StyleSheet.create({
  // ... existing styles ...
  
  cancelBookingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ef4444',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginTop: 8,
  },
  cancelBookingButtonText: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 4,
  },
})

// ============================================================================
// BƯỚC 4: Cập nhật Navigation Stack
// ============================================================================

/**
 * File: src/navigation/AppNavigator.tsx (hoặc tương tự)
 * 
 * Thêm CancelTripScreen vào stack
 */

import { CancelTripScreen } from '../screens'

// Trong Stack.Navigator, thêm:
<Stack.Screen 
  name="CancelTrip" 
  component={CancelTripScreen}
  options={{
    headerShown: false,
    presentation: 'card', // hoặc 'modal' để hiển thị dạng modal
    animation: 'slide_from_bottom', // Optional
  }}
/>

// ============================================================================
// BƯỚC 5: Test
// ============================================================================

/**
 * Các bước test:
 * 
 * 1. Chạy app: npm start hoặc expo start
 * 2. Tạo một chuyến đi
 * 3. Vào màn hình tracking
 * 4. Click nút "Hủy chuyến"
 * 5. Kiểm tra:
 *    - CancelTripScreen mở ra
 *    - Hiển thị thông tin chuyến đi
 *    - Chọn lý do hủy
 *    - Click "Xác nhận hủy chuyến"
 *    - API call thành công
 *    - Navigate về màn hình trước
 */

// ============================================================================
// STYLING TIPS
// ============================================================================

/**
 * Nếu muốn custom style cho nút hủy trong các màn hình:
 */

// Style 1: Primary Cancel Button (Red, filled)
const cancelButton = {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#ef4444',
  paddingVertical: 12,
  paddingHorizontal: 20,
  borderRadius: 8,
  marginTop: 16,
}

// Style 2: Secondary Cancel Button (Red, outline)
const cancelButtonOutline = {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 1,
  borderColor: '#ef4444',
  paddingVertical: 10,
  paddingHorizontal: 16,
  borderRadius: 8,
  backgroundColor: 'transparent',
}

// Style 3: Text-only Cancel Link
const cancelLink = {
  alignItems: 'center',
  paddingVertical: 8,
}

const cancelLinkText = {
  color: '#ef4444',
  fontSize: 15,
  fontWeight: '600',
}

// ============================================================================
// TROUBLESHOOTING
// ============================================================================

/**
 * Lỗi thường gặp và cách fix:
 */

// Lỗi 1: "Cannot navigate to CancelTrip"
// Fix: Đảm bảo đã thêm screen vào navigation stack (Bước 4)

// Lỗi 2: "COLORS is not defined"
// Fix: Import COLORS từ constants
import { COLORS } from '../constants'

// Lỗi 3: "FONT_SIZES is not defined"  
// Fix: Import FONT_SIZES từ constants
import { FONT_SIZES } from '../constants'

// Lỗi 4: Type error với navigation.navigate
// Fix: Đảm bảo đã cập nhật types/index.ts (đã done ở Bước 4 của README)

// Lỗi 5: API call fail
// Fix: Kiểm tra tripId, verify auth token, check network

// ============================================================================
// CHECKLIST
// ============================================================================

/**
 * Checklist để đảm bảo tích hợp thành công:
 * 
 * [ ] File CancelTripScreen.tsx đã được tạo ở src/screens/
 * [ ] Export trong src/screens/index.ts
 * [ ] Types đã được cập nhật trong src/types/index.ts
 * [ ] FONT_SIZES đã được thêm vào src/constants/config.ts
 * [ ] COLORS.error và COLORS.background đã có trong src/constants/colors.ts
 * [ ] Screen đã được thêm vào navigation stack
 * [ ] RideTracking.tsx đã cập nhật handleCancelRide
 * [ ] DeliveryTracking.tsx đã thêm handleCancelDelivery (nếu cần)
 * [ ] BookingsScreen.tsx đã thêm button hủy (nếu cần)
 * [ ] Test trên simulator/device thành công
 * [ ] API cancel work correctly
 */

// ============================================================================
// DONE! 🎉
// ============================================================================

/**
 * Sau khi hoàn thành checklist trên, màn hình CancelTripScreen đã sẵn sàng sử dụng!
 * 
 * Để biết thêm chi tiết, xem:
 * - CANCEL_TRIP_GUIDE.md - Hướng dẫn đầy đủ
 * - CANCEL_TRIP_README.md - Tổng quan tính năng
 * - CancelTripScreen.examples.tsx - Các ví dụ thực tế
 */
