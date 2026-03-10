import React, { useState, useMemo, useCallback, useEffect } from 'react'
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  Alert,
} from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { COLORS, SPACING, BORDER_RADIUS } from '../constants'

const { height } = Dimensions.get('window')

interface AssignmentRequestModalProps {
  visible: boolean
  request: any | null
  onAccept: (requestData?: any) => Promise<void>
  onReject: (requestData?: any) => Promise<void>
  countdown: number
  timeoutSeconds?: number // ✅ Dynamic timeout from backend (default 45s)
  driverTypes?: string[]
}

const AssignmentRequestModal: React.FC<AssignmentRequestModalProps> = ({
  visible,
  request,
  onAccept,
  onReject,
  countdown,
  timeoutSeconds = 45, // ✅ Default to 45s if not provided
  driverTypes = ['hire'],
}) => {
  const [isAccepting, setIsAccepting] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)
  const [lastFareValue, setLastFareValue] = useState<number | null>(null) // ⭐ Track fare changes to force re-render

  // 🔴 HOOKS MUST BE AT TOP - Before any conditional logic
  const requestData = useMemo(() => {
    if (!request) {
      console.log('❌ [useMemo] No request provided')
      return null
    }

    try {
      console.log('📦 [useMemo] Full request object:', JSON.stringify(request, null, 2))

      // 🔥 CRITICAL: Check BOTH type AND tripType
      // Polling service sets type: 'rideshare'
      // Backend sends tripType: 'combined_trip'
      const isCombinedTrip = request.type === 'rideshare' || request.tripType === 'combined_trip' || !!request.combinedTripId
      const isDelivery = request.type === 'delivery'
      const isRegularRide = request.type === 'ride' && !isCombinedTrip
      
      console.log('🔍 [useMemo] Request type analysis:', {
        requestType: request.type,
        requestTripType: request.tripType,
        isCombinedTrip,
        isDelivery,
        isRegularRide,
                requestFareField: request.fare, // ⭐ DEBUG: Show request.fare value
        combinedTripTotalFare: request.combinedTripId?.totalFare, // ⭐ DEBUG: Show combinedTripId.totalFare
      })
      
      // Extract coordinates - they can be nested or at request level
      let pickupCoords = request.pickupCoordinates
      let dropoffCoords = request.dropoffCoordinates
      
      // ⭐ CRITICAL: DO NOT assign data = combinedTripId for combined trips!
      // This prevents accidental fallback to totalFare which is WRONG
      // For regular rides & delivery, we need to look at rideId/deliveryId
      let data = request
      if (!isCombinedTrip) {
        // ONLY for regular rides and delivery
        if (request.rideId && typeof request.rideId === 'object') {
          data = request.rideId
        } else if (request.deliveryId && typeof request.deliveryId === 'object') {
          data = request.deliveryId
        }
      }

      // ⭐ CRITICAL FIX: Lấy giá đúng cho ghép xe (rideshare)
      // ⚠️ IMPORTANT: request.fare là giá khách hàng nhập (giá thực) - LUÔN DÙNG CÁI NÀY
      //              combinedTripId.totalFare là giá tài xế tạo ban đầu (KHÔNG DÙNG)
      // 🔥 FIX: Khi tài xế tạo combined trip, request.fare sẽ = 0 đầu tiên
      //         Chỉ dùng totalFare nếu request.fare === 0 ĐỂ HỎI LẠI khi "5s đầu"
      //         Nhưng theo business logic: Không được hiển thị giá từ tài xế, chỉ hiển thị khi khách gửi
      let fare = 0
      if (isCombinedTrip) {
        // Ghép xe: ⭐ CRITICAL - CHỈ DÙNG request.fare (từ khách hàng gửi)
        // request.fare = giá khách trả (ĐÚNG)
        // combinedTripId.totalFare = giá tài xế tạo (KHÔNG sử dụng - không được tính giá ban đầu)
        
        // ⭐ NEW RULE: ONLY use request.fare, NO fallback whatsoever!
        // Nếu request.fare = 0, nghĩa là khách chưa nhập giá → show 0 (không hiển thị)
        fare = request.fare ?? 0
        
        console.log('💰 [Rideshare] ⭐ Using request.fare ONLY (NO fallback to totalFare):', {
          fare,
          requestFareField: request.fare,
          tripTotalFare: request.combinedTripId?.totalFare,
          NOTE: fare === 0 ? '⚠️ Khách chưa gửi giá' : '✅ Khách đã gửi giá',
        })      } else {
        // Regular ride hoặc delivery: lấy từ nested object
        // ⭐ CRITICAL FIX for hire rides: Check baseFare and totalFare
        fare = request.fare ?? data.fare ?? data.baseFare ?? data.totalFare ?? data.estimatedPrice ?? data.deliveryFee ?? 0
        console.log(`💰 [${isDelivery ? 'Delivery' : 'RegularRide/Hire'}] Fare:`, fare, {
          requestFare: request.fare,
          dataFare: data.fare,
          dataBaseFare: data.baseFare,
          dataTotalFare: data.totalFare,
          finalFare: fare,
        })
      }

      // Ensure we have basic data with proper fallbacks
      const pickupAddress = request.pickupAddress || data.pickupAddress || 'Địa điểm đón'
      const dropoffAddress = request.dropoffAddress || data.dropoffAddress || data.deliveryAddress || 'Địa điểm đến'
      const customerName = request.customerId?.name || data.customerId?.name || request.customerName || 'Khách hàng'
      const customerRating = request.customerId?.rating || data.customerId?.rating || request.rating || 5.0

      // Determine service type and badge - FLEXIBLE logic
      let serviceType: 'delivery' | 'rideshare' | 'hire' = 'hire'
      let serviceBadge = 'LÁI XE HỘ'
      let serviceBadgeColor = '#6200ea'
      
      if (isDelivery) {
        serviceType = 'delivery'
        serviceBadge = 'GIAO HÀNG'
        serviceBadgeColor = '#FF6B00'
      } else if (isCombinedTrip) {
        serviceType = 'rideshare'
        serviceBadge = 'GHÉP XE'
        serviceBadgeColor = '#ff9900'
      } else {
        serviceType = 'hire'
        serviceBadge = 'LÁI XE HỘ'
        serviceBadgeColor = '#6200ea'
      }

      // ============ HELPER: Parse distance/duration from various formats ============
      const parseDistance = (val: any) => {
        if (typeof val === 'number') return val
        if (!val) return 0
        // Handle "5.2 km" → 5.2, or "5.2" → 5.2
        const numStr = String(val).replace(/[^\d.]/g, '')
        const parsed = parseFloat(numStr)
        return isNaN(parsed) ? 0 : Math.round(parsed * 10) / 10 // Round to 1 decimal
      }

      const parseDuration = (val: any) => {
        if (typeof val === 'number') return val
        if (!val) return 0
        // Handle "15 phút" → 15, or "~15 phút" → 15, or "15" → 15
        const numStr = String(val).replace(/[^\d]/g, '')
        const parsed = parseInt(numStr)
        return isNaN(parsed) ? 0 : parsed
      }
      // ============ END HELPER ============

      const parsedDistance = parseDistance(data.distance || request.distance)
      const parsedDuration = parseDuration(data.duration || request.duration)

      const resultData = {
        serviceType,
        serviceBadge,
        serviceBadgeColor,
        isDelivery,
        isCombinedTrip,
        isRegularRide,
        pickupAddress,
        dropoffAddress,
        pickupCoordinates: pickupCoords,
        dropoffCoordinates: dropoffCoords,
        fare,
        customerName,
        customerRating,
        seats: data.seats || request.seats || 1,
        notes: data.notes || request.notes,
        distance: parsedDistance,
        duration: parsedDuration,
        requestId: request._id,
        combinedTripId: request.combinedTripId,
        rideId: request.rideId?._id || request.rideId,
        deliveryId: request.deliveryId?._id || request.deliveryId,
      }

      console.log('✅ [useMemo] Final requestData ready:', {
        serviceType: resultData.serviceType,
        serviceBadge: resultData.serviceBadge,
        pickupAddress: resultData.pickupAddress,
        dropoffAddress: resultData.dropoffAddress,
        fare: resultData.fare,
        isCombinedTrip: resultData.isCombinedTrip,
        distance: resultData.distance,
        duration: resultData.duration,
        displayDistance: `${Math.round(resultData.distance)} km`,
        displayDuration: `~${Math.round(resultData.duration)} phút`,
        displayFare: `+${(resultData.fare / 1000).toFixed(0)}k`,
      })

      return resultData
    } catch (error) {
      console.error('❌ [useMemo] Error processing request:', error)
      // Return minimum viable data even if processing fails
      return {
        serviceType: 'hire',
        serviceBadge: 'YÊU CẦU MỚI',
        serviceBadgeColor: '#6200ea',
        isDelivery: false,
        isCombinedTrip: false,
        isRegularRide: true,
        pickupAddress: request.pickupAddress || 'Điểm đón',
        dropoffAddress: request.dropoffAddress || 'Điểm đến',
        pickupCoordinates: request.pickupCoordinates,
        dropoffCoordinates: request.dropoffCoordinates,
        fare: request.fare || 0,
        customerName: 'Khách hàng',
        customerRating: 5.0,
        seats: 1,
        notes: '',
        distance: 0,
        duration: 0,
        requestId: request._id,
        combinedTripId: request.combinedTripId,
        rideId: request.rideId?._id || request.rideId,
        deliveryId: request.deliveryId?._id || request.deliveryId,
      }
    }
  }, [request, request?.fare, request?.combinedTripId, request?.type, request?.tripType]) // ⭐ CRITICAL: Add explicit dependencies to force re-compute

  // NOW do the logging after hooks are set up
  console.log('═══════════════════════════════════════════════════')
  console.log('[AssignmentRequestModal] 🎬 COMPONENT RENDERED')
  console.log('═══════════════════════════════════════════════════')
  console.log('[AssignmentRequestModal] Props received:', {
    visible: visible ? '✅ YES' : '❌ NO',
    hasRequest: request ? '✅ YES' : '❌ NO',
    requestId: request?._id,
    requestType: request?.type,
    countdown: countdown,
    hasRequestData: requestData ? '✅ YES' : '❌ NO',
  })

  // ⭐ CRITICAL: Monitor fare changes to ensure re-render when fare updates
  useEffect(() => {
    const currentFare = request?.fare ?? 0
    if (currentFare !== lastFareValue) {
      console.log('🔄 [AssignmentRequestModal] ⭐ FARE CHANGED:', {
        oldFare: lastFareValue,
        newFare: currentFare,
        requestId: request?._id,
      })
      setLastFareValue(currentFare)
    }
  }, [request?.fare, request?._id, lastFareValue])

  const handleAccept = useCallback(async () => {
    // 🔥 CRITICAL: Check request status BEFORE accepting
    const currentStatus = request?.status
    console.log('🔍 [AssignmentRequestModal] Pre-accept status check:', {
      requestId: request?._id,
      currentStatus,
      requestType: request?.type,
    })

    // ⛔ Block if request is already cancelled, completed, or assigned
    if (currentStatus === 'cancelled' || currentStatus === 'canceled') {
      console.error('⛔ [AssignmentRequestModal] Request already CANCELLED by customer!')
      Alert.alert(
        'Chuyến đã bị hủy',
        'Khách hàng đã hủy chuyến này. Không thể nhận cuốc.',
        [{ text: 'Đóng' }]
      )
      return
    }

    if (currentStatus === 'assigned' || currentStatus === 'in_progress' || currentStatus === 'accepted') {
      console.error('⛔ [AssignmentRequestModal] Request already ASSIGNED to another driver!')
      Alert.alert(
        'Chuyến đã có tài xế',
        'Chuyến này đã được tài xế khác nhận. Vui lòng chọn chuyến khác.',
        [{ text: 'Đóng' }]
      )
      return
    }

    if (currentStatus === 'completed') {
      console.error('⛔ [AssignmentRequestModal] Request already COMPLETED!')
      Alert.alert(
        'Chuyến đã hoàn thành',
        'Chuyến này đã được hoàn thành. Không thể nhận cuốc.',
        [{ text: 'Đóng' }]
      )
      return
    }

    setIsAccepting(true)
    try {
      // ✅ CRITICAL: Pass full request data with coordinates to onAccept callback
      console.log('📤 [AssignmentRequestModal] Calling onAccept with request data:', {
        hasRequest: !!request,
        hasPickupCoords: !!request?.pickupCoordinates,
        hasDropoffCoordinates: !!request?.dropoffCoordinates,
        requestStatus: request?.status,
      })
      await onAccept(request)
    } catch (error) {
      console.error('❌ [AssignmentRequestModal] Error in handleAccept:', error)
      console.error('❌ [AssignmentRequestModal] Error message:', error?.message)
      console.error('❌ [AssignmentRequestModal] Request status:', request?.status)
    } finally {
      // ✅ ALWAYS reset loading state, even if error
      setIsAccepting(false)
    }
  }, [onAccept, request])

  const handleReject = useCallback(async () => {
    setIsRejecting(true)
    try {
      // 🔥 CRITICAL: Pass full request data with ID to onReject callback
      console.log('📤 [AssignmentRequestModal] Calling onReject with request data:', {
        requestId: request?._id,
        combinedTripId: request?.combinedTripId,
        requestStatus: request?.status,
      })
      await onReject(request)
    } catch (error) {
      console.error('❌ [AssignmentRequestModal] Error in handleReject:', error)
      console.error('❌ [AssignmentRequestModal] Error message:', error?.message)
      console.error('❌ [AssignmentRequestModal] Request status:', request?.status)
    } finally {
      // ✅ ALWAYS reset loading state, even if error
      setIsRejecting(false)
    }
  }, [onReject, request])

  // ✅ SIMPLE rendering logic: just check core preconditions
  if (!visible) {
    console.log('🔕 [AssignmentRequestModal] Not visible, not rendering')
    return null
  }

  if (!request) {
    console.log('📭 [AssignmentRequestModal] No request, not rendering')
    return null
  }

  if (!requestData) {
    console.log('⚠️  [AssignmentRequestModal] No requestData processed, not rendering')
    return null
  }

  console.log('✅ [AssignmentRequestModal] All conditions met, RENDERING MODAL')

  const progressPercent = (countdown / timeoutSeconds) * 100 // ✅ Use dynamic timeout
  const timerColor = countdown <= 10 ? '#f44336' : countdown <= 20 ? '#FF6B00' : '#4CAF50'

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
              {/* ⭐ CHỈ SHOW GIÁ khi:
                  - Regular rides/delivery: luôn show
                  - Combined trips: chỉ show khi fare > 0 (khách đã nhập giá)
              */}
              {(requestData.serviceType !== 'rideshare' || requestData.fare > 0) && (
                <View style={styles.priceBox}>
                  <Text style={styles.price}>
                    {requestData.fare > 0 
                      ? `+${(requestData.fare / 1000).toFixed(0)}k` 
                      : '...'}
                  </Text>
                </View>
              )}
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
                    {Math.round(requestData.distance)} km
                  </Text>
                </View>
              )}
              {requestData.duration && (
                <View style={styles.tripInfoItem}>
                  <MaterialIcons name="schedule" size={16} color="#6b7280" />
                  <Text style={styles.tripInfoText}>
                    ~{Math.round(requestData.duration)} phút
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
