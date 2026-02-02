import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../types'
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES } from '../constants'
import { rideService } from '../services/rideService'
import { deliveryService } from '../services/deliveryService'

type Navigation = NativeStackNavigationProp<RootStackParamList>

interface CancelTripScreenProps {
  route: {
    params: {
      tripId: string
      tripType: 'ride' | 'delivery' | 'combined_trip' // Loại chuyến đi
      tripDetails?: any // Chi tiết chuyến đi (tùy chọn để hiển thị thông tin)
    }
  }
}

export default function CancelTripScreen({ route }: CancelTripScreenProps) {
  const navigation = useNavigation<Navigation>()
  const { tripId, tripType, tripDetails } = route.params

  const [selectedReason, setSelectedReason] = useState<string>('')
  const [otherReason, setOtherReason] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Các lý do hủy chuyến phổ biến
  const cancelReasons = [
    { id: 'wait_too_long', label: 'Đợi quá lâu', icon: 'access-time' },
    { id: 'change_plan', label: 'Thay đổi kế hoạch', icon: 'event-busy' },
    { id: 'wrong_address', label: 'Nhập sai địa chỉ', icon: 'location-off' },
    { id: 'found_alternative', label: 'Tìm được phương tiện khác', icon: 'directions-car' },
    { id: 'driver_issue', label: 'Vấn đề với tài xế', icon: 'person-off' },
    { id: 'price_issue', label: 'Giá cước không phù hợp', icon: 'money-off' },
    { id: 'other', label: 'Lý do khác', icon: 'more-horiz' },
  ]

  const handleSelectReason = (reasonId: string) => {
    setSelectedReason(reasonId)
    if (reasonId !== 'other') {
      setOtherReason('')
    }
  }

  const handleCancel = async () => {
    // Validate
    if (!selectedReason) {
      Alert.alert('Thông báo', 'Vui lòng chọn lý do hủy chuyến')
      return
    }

    if (selectedReason === 'other' && !otherReason.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập lý do hủy chuyến')
      return
    }

    // Hiển thị xác nhận
    Alert.alert(
      'Xác nhận hủy chuyến',
      'Bạn có chắc chắn muốn hủy chuyến đi này không?',
      [
        {
          text: 'Không',
          style: 'cancel',
        },
        {
          text: 'Hủy chuyến',
          style: 'destructive',
          onPress: confirmCancel,
        },
      ]
    )
  }

  const confirmCancel = async () => {
    setIsSubmitting(true)

    try {
      const reason =
        selectedReason === 'other'
          ? otherReason
          : cancelReasons.find((r) => r.id === selectedReason)?.label || ''

      // Gọi API hủy chuyến tùy theo loại
      if (tripType === 'ride') {
        await rideService.cancelRide(tripId, 'customer', reason)
      } else if (tripType === 'delivery') {
        await deliveryService.cancelDelivery(tripId, reason)
      } else if (tripType === 'combined_trip') {
        // Nếu có API riêng cho combined trips
        // await combinedTripsService.cancelTrip(tripId, reason)
        await rideService.cancelRide(tripId, 'customer', reason)
      }

      Alert.alert(
        'Thành công',
        'Chuyến đi đã được hủy thành công',
        [
          {
            text: 'OK',
            onPress: () => {
              // Quay về màn hình trước hoặc màn hình chính
              if (navigation.canGoBack()) {
                navigation.goBack()
              } else {
                navigation.navigate('Home' as any)
              }
            },
          },
        ]
      )
    } catch (error: any) {
      console.error('[CancelTripScreen] Error canceling trip:', error)
      Alert.alert(
        'Lỗi',
        error.message || 'Không thể hủy chuyến đi. Vui lòng thử lại sau.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const getTripTypeName = () => {
    switch (tripType) {
      case 'ride':
        return 'Chuyến xe'
      case 'delivery':
        return 'Giao hàng'
      case 'combined_trip':
        return 'Chuyến ghép'
      default:
        return 'Chuyến đi'
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          disabled={isSubmitting}
        >
          <MaterialIcons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Hủy {getTripTypeName()}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Trip Info (Optional) */}
        {tripDetails && (
          <View style={styles.tripInfoCard}>
            <MaterialIcons
              name="info-outline"
              size={24}
              color={COLORS.primary}
              style={styles.infoIcon}
            />
            <View style={styles.tripInfoText}>
              <Text style={styles.tripInfoTitle}>Thông tin chuyến đi</Text>
              {tripDetails.pickupAddress && (
                <Text style={styles.tripInfoDetail} numberOfLines={1}>
                  Từ: {tripDetails.pickupAddress}
                </Text>
              )}
              {tripDetails.dropoffAddress && (
                <Text style={styles.tripInfoDetail} numberOfLines={1}>
                  Đến: {tripDetails.dropoffAddress}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Instructions */}
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsTitle}>
            Vui lòng cho chúng tôi biết lý do bạn muốn hủy chuyến đi
          </Text>
          <Text style={styles.instructionsSubtitle}>
            Điều này giúp chúng tôi cải thiện dịch vụ tốt hơn
          </Text>
        </View>

        {/* Cancel Reasons */}
        <View style={styles.reasonsContainer}>
          {cancelReasons.map((reason) => (
            <TouchableOpacity
              key={reason.id}
              style={[
                styles.reasonButton,
                selectedReason === reason.id && styles.reasonButtonSelected,
              ]}
              onPress={() => handleSelectReason(reason.id)}
              disabled={isSubmitting}
            >
              <MaterialIcons
                name={reason.icon as any}
                size={24}
                color={
                  selectedReason === reason.id
                    ? COLORS.primary
                    : COLORS.textSecondary
                }
              />
              <Text
                style={[
                  styles.reasonText,
                  selectedReason === reason.id && styles.reasonTextSelected,
                ]}
              >
                {reason.label}
              </Text>
              {selectedReason === reason.id && (
                <MaterialIcons
                  name="check-circle"
                  size={24}
                  color={COLORS.primary}
                  style={styles.checkIcon}
                />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Other Reason Input */}
        {selectedReason === 'other' && (
          <View style={styles.otherReasonContainer}>
            <Text style={styles.otherReasonLabel}>Chi tiết lý do</Text>
            <TextInput
              style={styles.otherReasonInput}
              placeholder="Nhập lý do hủy chuyến..."
              placeholderTextColor={COLORS.textSecondary}
              value={otherReason}
              onChangeText={setOtherReason}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              editable={!isSubmitting}
              maxLength={200}
            />
            <Text style={styles.characterCount}>
              {otherReason.length}/200
            </Text>
          </View>
        )}

        {/* Policy Notice */}
        <View style={styles.policyNotice}>
          <MaterialIcons
            name="warning"
            size={20}
            color={COLORS.warning}
            style={styles.warningIcon}
          />
          <Text style={styles.policyText}>
            Lưu ý: Hủy chuyến nhiều lần có thể ảnh hưởng đến tài khoản của bạn.
            Vui lòng chỉ hủy khi thực sự cần thiết.
          </Text>
        </View>
      </ScrollView>

      {/* Bottom Buttons */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={[
            styles.cancelButton,
            (!selectedReason || isSubmitting) && styles.cancelButtonDisabled,
          ]}
          onPress={handleCancel}
          disabled={!selectedReason || isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <MaterialIcons name="cancel" size={20} color="#fff" />
              <Text style={styles.cancelButtonText}>Xác nhận hủy chuyến</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.keepTripButton}
          onPress={() => navigation.goBack()}
          disabled={isSubmitting}
        >
          <Text style={styles.keepTripButtonText}>Giữ chuyến đi</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: SPACING.xs,
  },
  headerTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
  },
  content: {
    flex: 1,
  },
  tripInfoCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    margin: SPACING.md,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  infoIcon: {
    marginRight: SPACING.sm,
  },
  tripInfoText: {
    flex: 1,
  },
  tripInfoTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  tripInfoDetail: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xxs,
  },
  instructionsContainer: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  instructionsTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  instructionsSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  reasonsContainer: {
    paddingHorizontal: SPACING.md,
  },
  reasonButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  reasonButtonSelected: {
    borderColor: COLORS.primary,
    backgroundColor: `${COLORS.primary}10`,
  },
  reasonText: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    marginLeft: SPACING.sm,
  },
  reasonTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  checkIcon: {
    marginLeft: SPACING.sm,
  },
  otherReasonContainer: {
    paddingHorizontal: SPACING.md,
    marginTop: SPACING.sm,
  },
  otherReasonLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  otherReasonInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    minHeight: 100,
  },
  characterCount: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    textAlign: 'right',
    marginTop: SPACING.xs,
  },
  policyNotice: {
    flexDirection: 'row',
    backgroundColor: `${COLORS.warning}15`,
    margin: SPACING.md,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.warning,
  },
  warningIcon: {
    marginRight: SPACING.sm,
    marginTop: 2,
  },
  policyText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    lineHeight: 20,
  },
  bottomContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.error,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
  },
  cancelButtonDisabled: {
    backgroundColor: COLORS.border,
    opacity: 0.6,
  },
  cancelButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: '#fff',
    marginLeft: SPACING.xs,
  },
  keepTripButton: {
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  keepTripButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.primary,
  },
})
