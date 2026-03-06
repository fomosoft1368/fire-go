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
  KeyboardAvoidingView,
  Platform,
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
          <MaterialIcons name="arrow-back" size={28} color="#FF6B00" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Hủy chuyến</Text>
          <Text style={styles.headerSubtitle}>{getTripTypeName()}</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 20}
        style={{ flex: 1 }}
      >
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Illustration Section */}
          <View style={styles.illustrationContainer}>
          <View style={styles.iconContainer}>
            <MaterialIcons name="cancel" size={64} color="#FF6B00" />
          </View>
        </View>

        {/* Main Message */}
        <View style={styles.messageContainer}>
          <Text style={styles.messageTitle}>Cho chúng tôi biết lý do</Text>
          <Text style={styles.messageSubtitle}>
            Phản hồi của bạn giúp chúng tôi cải thiện dịch vụ
          </Text>
        </View>

        {/* Cancel Reasons - Grid Style */}
        <View style={styles.reasonsGrid}>
          {cancelReasons.map((reason) => (
            <TouchableOpacity
              key={reason.id}
              style={[
                styles.reasonCard,
                selectedReason === reason.id && styles.reasonCardSelected,
              ]}
              onPress={() => handleSelectReason(reason.id)}
              disabled={isSubmitting}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.reasonIconBackground,
                  selectedReason === reason.id && styles.reasonIconBackgroundSelected,
                ]}
              >
                <MaterialIcons
                  name={reason.icon as any}
                  size={32}
                  color={selectedReason === reason.id ? '#FF6B00' : '#6B7280'}
                />
              </View>
              <Text
                style={[
                  styles.reasonCardText,
                  selectedReason === reason.id && styles.reasonCardTextSelected,
                ]}
                numberOfLines={2}
              >
                {reason.label}
              </Text>
              {selectedReason === reason.id && (
                <View style={styles.selectedBadge}>
                  <MaterialIcons name="check" size={16} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Other Reason Input */}
        {selectedReason === 'other' && (
          <View style={styles.customReasonSection}>
            <Text style={styles.customReasonLabel}>Giải thích chi tiết</Text>
            <TextInput
              style={styles.customReasonInput}
              placeholder="Hãy cho chúng tôi biết tại sao bạn muốn hủy..."
              placeholderTextColor="#D1D5DB"
              value={otherReason}
              onChangeText={setOtherReason}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              editable={!isSubmitting}
              maxLength={200}
              cursorColor="#FF6B00"
            />
            <Text style={styles.characterLimit}>
              {otherReason.length}/200 ký tự
            </Text>
          </View>
        )}

        {/* Warning Message */}
        <View style={styles.warningBox}>
          <View style={styles.warningContent}>
            <MaterialIcons
              name="info"
              size={24}
              color="#F59E0B"
              style={styles.warningIconBox}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.warningTitle}>Lưu ý quan trọng</Text>
              <Text style={styles.warningMessage}>
                Hủy liên tục có thể ảnh hưởng đến tài khoản. Chỉ hủy khi thực sự cần thiết.
              </Text>
            </View>
          </View>
        </View>

        {/* Spacer */}
        <View style={{ height: 20 }} />
      </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom Buttons */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={[
            styles.cancelConfirmButton,
            (!selectedReason || isSubmitting) && styles.cancelConfirmButtonDisabled,
          ]}
          onPress={handleCancel}
          disabled={!selectedReason || isSubmitting}
          activeOpacity={0.85}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Text style={styles.cancelConfirmButtonText}>Xác nhận hủy</Text>
              <MaterialIcons name="arrow-forward" size={20} color="#fff" />
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.keepTripButtonNew}
          onPress={() => navigation.goBack()}
          disabled={isSubmitting}
          activeOpacity={0.7}
        >
          <Text style={styles.keepTripButtonTextNew}>Tiếp tục chuyến đi</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    marginRight: SPACING.md,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 2,
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  illustrationContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    paddingTop: SPACING.xl,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 107, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageContainer: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    alignItems: 'center',
  },
  messageTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    marginBottom: SPACING.xs,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  messageSubtitle: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '500',
  },
  reasonsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
    justifyContent: 'space-between',
  },
  reasonCard: {
    width: '48%',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    position: 'relative',
  },
  reasonCardSelected: {
    borderColor: '#FF6B00',
    backgroundColor: 'rgba(255, 107, 0, 0.05)',
  },
  reasonIconBackground: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  reasonIconBackgroundSelected: {
    backgroundColor: 'rgba(255, 107, 0, 0.15)',
  },
  reasonCardText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    textAlign: 'center',
    lineHeight: 18,
  },
  reasonCardTextSelected: {
    color: '#FF6B00',
  },
  selectedBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FF6B00',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  customReasonSection: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: SPACING.md,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  customReasonLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
    marginBottom: SPACING.sm,
    letterSpacing: 0.2,
  },
  customReasonInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    padding: SPACING.md,
    fontSize: 14,
    color: '#111827',
    minHeight: 100,
    fontFamily: 'System',
    fontWeight: '500',
    lineHeight: 20,
  },
  characterLimit: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'right',
    marginTop: SPACING.xs,
    fontWeight: '600',
  },
  warningBox: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    backgroundColor: '#FEF3C7',
    borderRadius: 16,
    padding: SPACING.md,
    borderLeftWidth: 5,
    borderLeftColor: '#F59E0B',
  },
  warningContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  warningIconBox: {
    marginRight: SPACING.sm,
    marginTop: 2,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#92400E',
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  warningMessage: {
    fontSize: 13,
    color: '#92400E',
    lineHeight: 19,
    fontWeight: '500',
  },
  bottomContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xl,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 12,
  },
  cancelConfirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: 14,
    marginBottom: SPACING.md,
    gap: SPACING.sm,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  cancelConfirmButtonDisabled: {
    backgroundColor: '#D1D5DB',
    shadowOpacity: 0,
  },
  cancelConfirmButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },
  keepTripButtonNew: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 107, 0, 0.08)',
  },
  keepTripButtonTextNew: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FF6B00',
    letterSpacing: 0.2,
  },
})
