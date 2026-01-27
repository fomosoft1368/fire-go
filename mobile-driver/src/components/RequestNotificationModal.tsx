import React, { useEffect, useState } from 'react'
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { COLORS, SPACING, BORDER_RADIUS } from '../constants'

const { height } = Dimensions.get('window')

interface RequestNotificationModalProps {
  visible: boolean
  request: any
  onAccept: () => Promise<void>
  onReject: () => Promise<void>
  onDismiss: () => void
  timeoutSeconds?: number
}

export const RequestNotificationModal: React.FC<RequestNotificationModalProps> = ({
  visible,
  request,
  onAccept,
  onReject,
  onDismiss,
  timeoutSeconds = 30,
}) => {
  const [remainingTime, setRemainingTime] = useState(timeoutSeconds)
  const [isAccepting, setIsAccepting] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)
  const [isExpired, setIsExpired] = useState(false)

  // Timer countdown
  useEffect(() => {
    if (!visible || isExpired || isAccepting || isRejecting) return

    const timer = setInterval(() => {
      setRemainingTime(prev => {
        if (prev <= 1) {
          setIsExpired(true)
          handleAutoReject()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [visible, isExpired, isAccepting, isRejecting])

  // Reset timer when modal appears
  useEffect(() => {
    if (visible) {
      setRemainingTime(timeoutSeconds)
      setIsExpired(false)
      setIsAccepting(false)
      setIsRejecting(false)
    }
  }, [visible, timeoutSeconds])

  const handleAutoReject = async () => {
    console.log('⏰ Auto-rejecting request after timeout')
    setIsRejecting(true)
    try {
      await onReject()
      onDismiss()
    } catch (error) {
      console.error('Error auto-rejecting:', error)
    } finally {
      setIsRejecting(false)
    }
  }

  const handleAccept = async () => {
    setIsAccepting(true)
    try {
      console.log('✅ Driver accepting request:', request._id)
      await onAccept()
      onDismiss()
    } catch (error) {
      console.error('Error accepting request:', error)
      Alert.alert('Lỗi', 'Không thể chấp nhận yêu cầu')
    } finally {
      setIsAccepting(false)
    }
  }

  const handleReject = async () => {
    setIsRejecting(true)
    try {
      console.log('❌ Driver rejecting request:', request._id)
      await onReject()
      onDismiss()
    } catch (error) {
      console.error('Error rejecting request:', error)
      Alert.alert('Lỗi', 'Không thể từ chối yêu cầu')
    } finally {
      setIsRejecting(false)
    }
  }

  if (!request) return null

  const progressPercent = (remainingTime / timeoutSeconds) * 100
  const timerColor = remainingTime <= 10 ? '#FF6B00' : '#4CAF50'

  return (
    <Modal visible={visible} transparent animationType="fade">
      <SafeAreaView style={styles.overlay}>
        <View style={styles.centeredView}>
          <View style={styles.modalContainer}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerContent}>
                <MaterialIcons name="notifications-active" size={28} color={COLORS.primary} />
                <Text style={styles.headerTitle}>Yêu cầu mới</Text>
              </View>
              <Text style={styles.timerText}>{remainingTime}s</Text>
            </View>

            {/* Timer Progress Bar */}
            <View style={styles.timerBar}>
              <View
                style={[
                  styles.timerProgress,
                  { width: `${progressPercent}%`, backgroundColor: timerColor },
                ]}
              />
            </View>

            {/* Customer Info */}
            <View style={styles.customerSection}>
              <View style={styles.avatar}>
                <MaterialIcons name="person" size={32} color={COLORS.primary} />
              </View>
              <View style={styles.customerInfo}>
                <Text style={styles.customerName}>
                  {request.customerId?.name || 'Khách hàng'}
                </Text>
                <View style={styles.ratingRow}>
                  <MaterialIcons name="star" size={14} color="#FFB800" />
                  <Text style={styles.ratingText}>
                    {request.customerId?.rating || 5.0} • {request.seats || 1} chỗ
                  </Text>
                </View>
              </View>
              <View style={styles.priceBox}>
                <Text style={styles.price}>+{(request.fare / 1000).toFixed(0)}k</Text>
              </View>
            </View>

            {/* Route Info */}
            <View style={styles.routeSection}>
              <View style={styles.routeLine} />
              <View style={styles.routePoints}>
                {/* Pickup */}
                <View style={styles.routePoint}>
                  <View style={styles.dotPickup} />
                  <View style={styles.pointContent}>
                    <Text style={styles.pointLabel}>Điểm đón</Text>
                    <Text style={styles.pointAddress} numberOfLines={2}>
                      {request.pickupAddress}
                    </Text>
                  </View>
                </View>

                {/* Dropoff */}
                <View style={styles.routePoint}>
                  <View style={styles.dotDropoff} />
                  <View style={styles.pointContent}>
                    <Text style={styles.pointLabel}>Điểm đến</Text>
                    <Text style={styles.pointAddress} numberOfLines={2}>
                      {request.dropoffAddress}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Notes */}
            {request.notes && (
              <View style={styles.notesBox}>
                <MaterialIcons name="note" size={16} color={COLORS.primary} />
                <Text style={styles.notesText}>{request.notes}</Text>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.btn, styles.rejectBtn]}
                onPress={handleReject}
                disabled={isRejecting || isAccepting}
              >
                {isRejecting ? (
                  <ActivityIndicator size="small" color="#f44336" />
                ) : (
                  <>
                    <MaterialIcons name="close" size={20} color="#f44336" />
                    <Text style={styles.rejectBtnText}>Từ chối</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btn, styles.acceptBtn]}
                onPress={handleAccept}
                disabled={isAccepting || isRejecting}
              >
                {isAccepting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <MaterialIcons name="check-circle" size={20} color="#fff" />
                    <Text style={styles.acceptBtnText}>Chấp nhận</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Auto-reject message */}
            {isExpired && (
              <Text style={styles.expiredText}>Yêu cầu đã hết hạn (tự động từ chối)</Text>
            )}
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  modalContainer: {
    backgroundColor: COLORS.darkCard,
    borderRadius: BORDER_RADIUS.xl,
    width: '90%',
    maxHeight: height * 0.9,
    padding: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.darkBorder,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  timerText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },
  timerBar: {
    height: 6,
    backgroundColor: COLORS.darkBg,
    borderRadius: 3,
    marginBottom: SPACING.lg,
    overflow: 'hidden',
  },
  timerProgress: {
    height: '100%',
    borderRadius: 3,
  },
  customerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
    paddingBottom: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.darkBorder,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: `${COLORS.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  ratingText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  priceBox: {
    backgroundColor: `${COLORS.primary}20`,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  price: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  routeSection: {
    marginBottom: SPACING.lg,
    paddingLeft: SPACING.md,
  },
  routeLine: {
    position: 'absolute',
    left: 24,
    top: 30,
    bottom: 0,
    width: 2,
    backgroundColor: COLORS.darkBg,
  },
  routePoints: {
    gap: SPACING.lg,
  },
  routePoint: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  dotPickup: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    marginTop: SPACING.xs,
  },
  dotDropoff: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#f44336',
    marginTop: SPACING.xs,
  },
  pointContent: {
    flex: 1,
  },
  pointLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  pointAddress: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: '500',
    lineHeight: 16,
  },
  notesBox: {
    backgroundColor: COLORS.darkBg,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    flexDirection: 'row',
    gap: SPACING.md,
    alignItems: 'flex-start',
  },
  notesText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    flex: 1,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  rejectBtn: {
    backgroundColor: '#f4433620',
    borderWidth: 1,
    borderColor: '#f44336',
  },
  rejectBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#f44336',
  },
  acceptBtn: {
    backgroundColor: COLORS.primary,
    flex: 1.2,
  },
  acceptBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  expiredText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#f44336',
    fontWeight: '600',
    marginTop: SPACING.md,
  },
})
