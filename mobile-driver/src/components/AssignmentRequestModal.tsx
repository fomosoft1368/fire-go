import React, { useEffect, useState, useMemo, useCallback } from 'react'
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
} from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { COLORS, SPACING, BORDER_RADIUS } from '../constants'

const { height } = Dimensions.get('window')

interface AssignmentRequestModalProps {
  visible: boolean
  request: any | null
  onAccept: () => Promise<void>
  onReject: () => Promise<void>
  countdown: number
  driverTypes?: string[]
}

const AssignmentRequestModal: React.FC<AssignmentRequestModalProps> = ({
  visible,
  request,
  onAccept,
  onReject,
  countdown,
  driverTypes = ['hire'],
}) => {
  const [isAccepting, setIsAccepting] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)

  const requestData = useMemo(() => {
    if (!request) return null

    const isDelivery = request.type === 'delivery'
    const data = request.rideId || request.deliveryId || request
    const rideType = data.rideType || request.rideType
    const isShared = data.isShared || request.rideId?.isShared
    
    // Xác định loại dịch vụ
    let serviceType: 'delivery' | 'rideshare' | 'hire' = 'hire'
    let serviceBadge = 'LÁI XE HỘ'
    let serviceBadgeColor = '#6200ea'
    
    if (isDelivery) {
      serviceType = 'delivery'
      serviceBadge = 'GIAO HÀNG'
      serviceBadgeColor = '#FF6B00'
    } else if (rideType === 'share' || isShared) {
      serviceType = 'rideshare'
      serviceBadge = 'GHÉP XE'
      serviceBadgeColor = '#ff9900'
    } else if (rideType === 'hire') {
      serviceType = 'hire'
      serviceBadge = 'LÁI XE HỘ'
      serviceBadgeColor = '#6200ea'
    }

    return {
      serviceType,
      serviceBadge,
      serviceBadgeColor,
      isDelivery,
      pickupAddress: data.pickupAddress || 'Địa điểm đón',
      dropoffAddress: data.dropoffAddress || data.deliveryAddress || 'Địa điểm đến',
      fare: data.totalFare || data.deliveryFee || 0,
      customerName: request.customerId?.name || data.customerId?.name || 'Khách hàng',
      customerRating: request.customerId?.rating || data.customerId?.rating || 5.0,
      seats: data.seats || request.seats || 1,
      notes: data.notes || request.notes,
      distance: data.distance || request.distance,
      duration: data.duration || request.duration,
    }
  }, [request])

  const handleAccept = useCallback(async () => {
    setIsAccepting(true)
    try {
      await onAccept()
    } catch (error) {
      console.error('Error accepting:', error)
    } finally {
      setIsAccepting(false)
    }
  }, [onAccept])

  const handleReject = useCallback(async () => {
    setIsRejecting(true)
    try {
      await onReject()
    } catch (error) {
      console.error('Error rejecting:', error)
    } finally {
      setIsRejecting(false)
    }
  }, [onReject])

  if (!request || !visible || !requestData) return null

  // Filter delivery requests if driver doesn't have delivery type
  if (requestData.isDelivery && !driverTypes.includes('delivery')) {
    return null
  }

  const progressPercent = (countdown / 15) * 100
  const timerColor = countdown <= 5 ? '#f44336' : countdown <= 10 ? '#FF6B00' : '#4CAF50'

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleReject}>
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <MaterialIcons
                name={requestData.isDelivery ? 'local-shipping' : 'notifications-active'}
                size={28}
                color={COLORS.primary}
              />
              <View style={styles.headerTextContainer}>
                <Text style={styles.headerTitle}>Yêu cầu mới</Text>
                <View style={[styles.serviceBadge, { backgroundColor: `${requestData.serviceBadgeColor}20` }]}>
                  <Text style={[styles.serviceBadgeText, { color: requestData.serviceBadgeColor }]}>
                    {requestData.serviceBadge}
                  </Text>
                </View>
              </View>
            </View>
            <Text style={styles.timerText}>{countdown}s</Text>
          </View>

          {/* Timer Progress Bar */}
          <View style={styles.timerBar}>
            <View
              style={[styles.timerProgress, { width: `${progressPercent}%`, backgroundColor: timerColor }]}
            />
          </View>

          {/* Customer Info - Hiển thị cho Ghép xe và Lái xe hộ */}
          {!requestData.isDelivery && (
            <View style={styles.customerSection}>
              <View style={styles.avatar}>
                <MaterialIcons name="person" size={32} color={COLORS.primary} />
              </View>
              <View style={styles.customerInfo}>
                <Text style={styles.customerName}>{requestData.customerName}</Text>
                <View style={styles.ratingRow}>
                  <MaterialIcons name="star" size={14} color="#FFB800" />
                  <Text style={styles.ratingText}>
                    {requestData.customerRating.toFixed(1)}
                  </Text>
                  {requestData.serviceType === 'rideshare' && (
                    <Text style={styles.ratingText}> • {requestData.seats} chỗ</Text>
                  )}
                </View>
              </View>
              <View style={styles.priceBox}>
                <Text style={styles.price}>+{(requestData.fare / 1000).toFixed(0)}k</Text>
              </View>
            </View>
          )}

          {/* Route Info */}
          <View style={styles.routeSection}>
            <View style={styles.routeLine} />
            <View style={styles.routePoints}>
              {/* Pickup */}
              <View style={styles.routePoint}>
                <View style={styles.dotPickup} />
                <View style={styles.pointContent}>
                  <Text style={styles.pointLabel}>
                    {requestData.isDelivery ? 'Lấy hàng' : 'Điểm đón'}
                  </Text>
                  <Text style={styles.pointAddress} numberOfLines={2}>
                    {requestData.pickupAddress}
                  </Text>
                </View>
              </View>

              {/* Dropoff */}
              <View style={styles.routePoint}>
                <View style={styles.dotDropoff} />
                <View style={styles.pointContent}>
                  <Text style={styles.pointLabel}>
                    {requestData.isDelivery ? 'Giao hàng' : 'Điểm đến'}
                  </Text>
                  <Text style={styles.pointAddress} numberOfLines={2}>
                    {requestData.dropoffAddress}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Trip Info - Distance & Duration */}
          {(requestData.distance || requestData.duration) && (
            <View style={styles.tripInfoContainer}>
              {requestData.distance && (
                <View style={styles.tripInfoItem}>
                  <MaterialIcons name="straighten" size={16} color="#6b7280" />
                  <Text style={styles.tripInfoText}>
                    {(requestData.distance / 1000).toFixed(1)} km
                  </Text>
                </View>
              )}
              {requestData.duration && (
                <View style={styles.tripInfoItem}>
                  <MaterialIcons name="schedule" size={16} color="#6b7280" />
                  <Text style={styles.tripInfoText}>
                    ~{Math.ceil(requestData.duration / 60)} phút
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Delivery Fare or Notes */}
          {requestData.isDelivery ? (
            <View style={styles.fareContainer}>
              <MaterialIcons name="attach-money" size={24} color="#4caf50" />
              <Text style={styles.fareText}>{requestData.fare.toLocaleString('vi-VN')} đ</Text>
            </View>
          ) : (
            requestData.notes && (
              <View style={styles.notesBox}>
                <MaterialIcons name="note" size={16} color={COLORS.primary} />
                <Text style={styles.notesText}>{requestData.notes}</Text>
              </View>
            )
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
                  <Text style={styles.acceptBtnText}>
                    {requestData.serviceType === 'delivery' 
                      ? 'Nhận đơn' 
                      : requestData.serviceType === 'rideshare'
                      ? 'Nhận ghép'
                      : 'Nhận cuốc'
                    }
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: BORDER_RADIUS.xl,
    width: '90%',
    maxWidth: 420,
    maxHeight: height * 0.85,
    padding: SPACING.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    flex: 1,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
    marginBottom: SPACING.xs,
  },
  serviceBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
  },
  serviceBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  timerText: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.primary,
  },
  timerBar: {
    height: 6,
    backgroundColor: '#f3f4f6',
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
    borderBottomColor: '#e5e7eb',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: `${COLORS.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
    marginBottom: SPACING.xs,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  ratingText: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  priceBox: {
    backgroundColor: `${COLORS.primary}15`,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  price: {
    fontSize: 16,
    fontWeight: '800',
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
    backgroundColor: '#e5e7eb',
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
    backgroundColor: '#4caf50',
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
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  pointAddress: {
    fontSize: 14,
    color: '#111',
    fontWeight: '600',
    lineHeight: 20,
  },
  notesBox: {
    backgroundColor: '#f3f4f6',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    flexDirection: 'row',
    gap: SPACING.md,
    alignItems: 'flex-start',
  },
  notesText: {
    fontSize: 13,
    color: '#4b5563',
    flex: 1,
    lineHeight: 18,
  },
  tripInfoContainer: {
    flexDirection: 'row',
    gap: SPACING.lg,
    marginBottom: SPACING.lg,
    paddingHorizontal: SPACING.sm,
  },
  tripInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  tripInfoText: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '600',
  },
  fareContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e8f5e9',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  fareText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#4caf50',
    marginLeft: 8,
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
    paddingVertical: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    minHeight: 52,
  },
  rejectBtn: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#f44336',
  },
  rejectBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f44336',
  },
  acceptBtn: {
    backgroundColor: '#4caf50',
    flex: 1.3,
  },
  acceptBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
})

export default AssignmentRequestModal
