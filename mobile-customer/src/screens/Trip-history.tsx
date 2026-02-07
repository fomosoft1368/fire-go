import { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '../redux/store'
import { rideService } from '../services/rideService'
import { combinedTripsService } from '../services/combinedTripsService'
import { deliveryService } from '../services/deliveryService'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../types'
import { SPACING, BORDER_RADIUS } from '../constants'
import type { RideBooking } from '../types'

type Navigation = NativeStackNavigationProp<RootStackParamList>

export default function TripHistoryScreen() {
  const navigation = useNavigation<Navigation>()
  const user = useSelector((state: RootState) => state.auth.user)
  const [activeFilter, setActiveFilter] = useState('all')
  const [bookings, setBookings] = useState<RideBooking[]>([])
  const [loading, setLoading] = useState(true)
  
  // Rating modal state
  const [isRatingModalVisible, setIsRatingModalVisible] = useState(false)
  const [selectedRide, setSelectedRide] = useState<RideBooking | null>(null)
  const [rating, setRating] = useState(5)
  const [reviewText, setReviewText] = useState('')
  const [isSubmittingRating, setIsSubmittingRating] = useState(false)

  const filterOptions = [
    { key: 'all', label: 'Tất cả' },
    { key: 'share', label: 'Ghép xe' },
    { key: 'hire', label: 'Lái xe hộ' },
    { key: 'delivery', label: 'Giao hàng' },
  ]

  // Fetch ride history on component mount and when user changes
  useEffect(() => {
    console.log('[BookingsScreen] useEffect triggered, user:', user)
    
    if (!user) {
      console.log('[BookingsScreen] User not yet loaded, waiting...')
      setLoading(false)
      return
    }
    
    fetchRideHistory()
  }, [user])

  const fetchRideHistory = async () => {
    if (!user) {
      console.warn('[BookingsScreen] User not available')
      setLoading(false)
      return
    }

    const userId = user._id || user.id
    console.log('[BookingsScreen] fetchRideHistory called with userId:', userId)
    console.log('[BookingsScreen] Full user object:', user)
    
    if (!userId) {
      console.warn('[BookingsScreen] User ID not available')
      console.warn('[BookingsScreen] Available user keys:', Object.keys(user || {}))
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      console.log('[BookingsScreen] Starting fetch for user:', userId)
      
      // Fetch HIRE rides, SHARE combined trips, và DELIVERIES
      const [rideHistory, combinedTrips, deliveries] = await Promise.all([
        rideService.getRideHistory(userId).catch((err) => {
          console.error('[BookingsScreen] Error fetching rides:', err)
          return []
        }),
        combinedTripsService.getCustomerTrips(userId).catch((err) => {
          console.error('[BookingsScreen] Error fetching combined trips:', err)
          return []
        }),
        deliveryService.getMyDeliveries().catch((err) => {
          console.error('[BookingsScreen] Error fetching deliveries:', err)
          return []
        }),
      ])

      console.log('[BookingsScreen] Fetch completed:')
      console.log('  - HIRE rides:', rideHistory?.length || 0)
      console.log('  - SHARE combined-trips:', combinedTrips?.length || 0)
      console.log('  - DELIVERIES:', deliveries?.length || 0)
      if (combinedTrips && combinedTrips.length > 0) {
        console.log('[BookingsScreen] First combined trip data:', JSON.stringify(combinedTrips[0], null, 2))
      }

      // Format combined trips thành RideBooking structure
      // Use customer's specific pickup/dropoff from RideRequest, not driver's route
      // Filter out rejected and timeout requests
      const formattedCombinedTrips = (combinedTrips || [])
        .filter((trip: any) => {
          const status = trip.requestStatus?.toLowerCase() || trip.status?.toLowerCase()
          const isRejectedOrTimeout = status === 'rejected' || status === 'timeout'
          
          if (isRejectedOrTimeout) {
            console.log('[BookingsScreen] ⚠️ Filtering out rejected/timeout trip:', {
              tripId: trip._id,
              status: status,
              reason: 'Driver rejected or did not respond',
            })
          }
          
          return !isRejectedOrTimeout
        })
        .map((trip: any) => {
        const formatted = {
          id: trip._id || trip.id,
          rideType: 'share',
          estimatedFare: trip.customerFare || trip.totalFare || 0,
          bookingTime: trip.createdAt 
            ? new Date(trip.createdAt).toLocaleString('vi-VN')
            : 'N/A',
          // Use CUSTOMER's pickup/dropoff, not driver's route
          pickupLocation: trip.customerPickupAddress || trip.pickupLocationAddress || trip.pickupAddress || 'Điểm đón',
          dropoffLocation: trip.customerDropoffAddress || trip.dropoffLocationAddress || trip.dropoffAddress || 'Điểm đến',
          pickupDistrict: 'Hà Nội',
          dropoffDistrict: 'Hà Nội',
          status: trip.requestStatus?.toLowerCase() || trip.status?.toLowerCase() || 'pending',
          driverName: trip.driverId?.firstName + ' ' + trip.driverId?.lastName || 'N/A',
          carPlate: trip.driverId?.vehiclePlate || 'N/A',
          // Thêm trường để track combined trip ID
          combinedTripId: trip._id || trip.id,
        }
        console.log('[BookingsScreen] Formatted trip:', {
          pickupLocation: formatted.pickupLocation,
          dropoffLocation: formatted.dropoffLocation,
          customerPickupAddress: trip.customerPickupAddress,
          customerDropoffAddress: trip.customerDropoffAddress,
          pickupAddress: trip.pickupAddress,
          dropoffAddress: trip.dropoffAddress,
        })
        return formatted
      })

      // Format deliveries thành RideBooking structure
      const formattedDeliveries = (deliveries || []).map((delivery: any) => ({
        id: delivery._id || delivery.id,
        rideType: 'delivery',
        estimatedFare: delivery.estimatedPrice || delivery.totalPrice || 0,
        bookingTime: delivery.createdAt 
          ? new Date(delivery.createdAt).toLocaleString('vi-VN')
          : 'N/A',
        pickupLocation: delivery.pickupAddress || 'Điểm lấy hàng',
        dropoffLocation: delivery.dropoffAddress || 'Điểm giao hàng',
        pickupDistrict: 'Hà Nội',
        dropoffDistrict: 'Hà Nội',
        status: delivery.status?.toLowerCase() || 'pending',
        driverName: delivery.driverId?.firstName && delivery.driverId?.lastName
          ? `${delivery.driverId.firstName} ${delivery.driverId.lastName}`
          : 'N/A',
        carPlate: delivery.driverId?.vehiclePlate || 'N/A',
        deliveryId: delivery._id || delivery.id,
      }))

      // Merge rides + combined trips + deliveries
      const allBookings = [...rideHistory, ...formattedCombinedTrips, ...formattedDeliveries]
      
      // ✅ Remove duplicates based on unique combination of id + rideType
      const uniqueBookings = allBookings.filter((booking, index, self) => {
        const uniqueKey = `${booking.id}_${booking.rideType}`
        return index === self.findIndex((b) => `${b.id}_${b.rideType}` === uniqueKey)
      })
      
      console.log('[BookingsScreen] Duplicate check:', {
        total: allBookings.length,
        unique: uniqueBookings.length,
        removed: allBookings.length - uniqueBookings.length,
      })
      
      // Sort by booking time (newest first)
      uniqueBookings.sort((a, b) => {
        const timeA = new Date(a.bookingTime).getTime()
        const timeB = new Date(b.bookingTime).getTime()
        return timeB - timeA
      })

      console.log('[BookingsScreen] Total bookings:', uniqueBookings.length)
      
      setBookings(uniqueBookings)
      
      if (uniqueBookings.length === 0) {
        console.log('[BookingsScreen] No bookings found')
      } else {
        console.log('[BookingsScreen] First booking:', JSON.stringify(uniqueBookings[0], null, 2))
      }
    } catch (error: any) {
      console.error('[BookingsScreen] Error fetching rides:', {
        message: error.message,
        stack: error.stack
      })
      Alert.alert('Lỗi', 'Lỗi: ' + error.message)
      setBookings([])
    } finally {
      setLoading(false)
    }
  }

  const openRatingModal = (ride: RideBooking) => {
    setSelectedRide(ride)
    setRating(5)
    setReviewText('')
    setIsRatingModalVisible(true)
  }

  const closeRatingModal = () => {
    setIsRatingModalVisible(false)
    setSelectedRide(null)
    setRating(5)
    setReviewText('')
  }

  const submitRating = async () => {
    if (!selectedRide) return

    setIsSubmittingRating(true)
    try {
      console.log('[BookingsScreen] Submitting rating:', {
        rideId: selectedRide.id,
        rating,
        reviewText,
      })

      // TODO: Call API to submit rating
      // await rideService.submitRating(selectedRide.id, { rating, review: reviewText })
      
      Alert.alert('Thành công', 'Cảm ơn bạn đã đánh giá!')
      closeRatingModal()
    } catch (error: any) {
      console.error('[BookingsScreen] Error submitting rating:', error)
      Alert.alert('Lỗi', 'Không thể gửi đánh giá. Vui lòng thử lại!')
    } finally {
      setIsSubmittingRating(false)
    }
  }

  const handleViewDetail = (booking: RideBooking) => {
    // Nếu là combined trip (share ride)
    if (booking.rideType === 'share' && booking.combinedTripId) {
      console.log('[BookingsScreen] Navigating to DriverFoundScreen:', booking.combinedTripId)
      navigation.navigate('DriverFound', {
        combinedTripId: booking.combinedTripId,
      })
    } else if (booking.rideType === 'delivery' && booking.deliveryId) {
      // Nếu là delivery
      console.log('[BookingsScreen] Navigating to DeliveryTracking:', booking.deliveryId)
      navigation.navigate('DeliveryTracking', {
        deliveryId: booking.deliveryId,
      })
    } else {
      // Nếu là hire ride
      Alert.alert('Chi tiết', `Chuyến đi ${booking.id}`)
    }
  }

  const filteredBookings = bookings.filter((booking) => {
    if (activeFilter === 'all') return true
    return booking.rideType === activeFilter
  })

  const getStatusBadge = (status: string) => {
    if (status === 'completed') {
      return { label: 'HOÀN THÀNH', color: '#10b981', bgColor: '#dcfce7' }
    } else if (status === 'cancelled') {
      return { label: 'ĐÃ HỦY', color: '#ef4444', bgColor: '#fee2e2' }
    } else if (status === 'in_progress') {
      return { label: 'ĐANG ĐI', color: '#3b82f6', bgColor: '#dbeafe' }
    }
  }

  const getRideTypeIcon = (rideType: string) => {
    if (rideType === 'hire') return 'person-apron'
    if (rideType === 'delivery') return 'local-shipping'
    return 'commute'
  }

  const getRideTypeLabel = (rideType: string) => {
    if (rideType === 'hire') return 'Lái xe hộ'
    if (rideType === 'delivery') return 'Giao hàng'
    return 'Ghép xe'
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {/* <TouchableOpacity style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity> */}
        <Text style={styles.headerTitle}>Lịch sử chuyến đi</Text>
        <TouchableOpacity style={styles.calendarButton} onPress={fetchRideHistory}>
          <MaterialIcons name="refresh" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.listContainer}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Loading State */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FF6B00" />
            <Text style={styles.loadingText}>Đang tải lịch sử chuyến đi...</Text>
          </View>
        ) : (
          <>
            {/* Filter Tabs - Always show if we have any bookings */}
            {bookings.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.filterContainer}
                contentContainerStyle={styles.filterContent}
              >
                {filterOptions.map((option, index) => (
                  <TouchableOpacity
                    key={option.key}
                    style={[
                      styles.filterTab,
                      activeFilter === option.key && styles.filterTabActive,
                      index === 0 && styles.filterTabFirst,
                    ]}
                    onPress={() => setActiveFilter(option.key)}
                  >
                    <Text
                      style={[
                        styles.filterTabText,
                        activeFilter === option.key && styles.filterTabTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {/* Empty State */}
            {filteredBookings.length === 0 ? (
              <View style={styles.emptyContainer}>
                <MaterialIcons name="history" size={48} color="#64748b" />
                <Text style={styles.emptyText}>
                  {bookings.length === 0 
                    ? 'Không có chuyến đi nào' 
                    : `Không có chuyến đi loại "${filterOptions.find(f => f.key === activeFilter)?.label}"`
                  }
                </Text>
                {bookings.length > 0 && (
                  <TouchableOpacity 
                    style={styles.resetFilterButton}
                    onPress={() => setActiveFilter('all')}
                  >
                    <Text style={styles.resetFilterText}>Xem tất cả</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <>
                {/* Bookings List */}
                {filteredBookings.map((booking) => {
          const badge = getStatusBadge(booking.status)
          const isCompleted = booking.status === 'completed'
          const isCancelled = booking.status === 'cancelled'

          return (
            <View
              key={`${booking.id}_${booking.rideType}`}
              style={[styles.bookingCard, isCancelled && styles.bookingCardCancelled]}
            >
              {/* Card Header */}
              <View style={styles.cardHeader}>
                <View style={styles.headerLeft}>
                  <View
                    style={[
                      styles.iconContainer,
                      booking.rideType === 'hire' ? styles.iconContainerHire : styles.iconContainerShare,
                    ]}
                  >
                    <MaterialIcons name={getRideTypeIcon(booking.rideType) as any} size={20} color="#FF6B00" />
                  </View>
                  <View style={styles.headerInfo}>
                    <View style={styles.titleRow}>
                      <Text style={styles.rideTypeText}>{getRideTypeLabel(booking.rideType)}</Text>
                      {badge && (
                        <View
                          style={[
                            styles.statusBadge,
                            { backgroundColor: badge.bgColor },
                          ]}
                        >
                          <Text
                            style={[styles.statusBadgeText, { color: badge.color }]}
                          >
                            {badge.label}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.bookingTime}>{booking.bookingTime}</Text>
                  </View>
                </View>
                <Text style={styles.fareText}>
                  {isCancelled ? (
                    <Text style={styles.fareTextCancelled}>0đ</Text>
                  ) : (
                    booking.estimatedFare.toLocaleString('vi-VN') + 'đ'
                  )}
                </Text>
              </View>

              <View style={styles.routeSection}>
                <View style={styles.routeTimeline}>
                  <View style={[styles.dot, { backgroundColor: isCancelled ? '#9ca3af' : '#10b981' }, isCancelled && styles.dotCancelled]} />
                  <View style={[styles.connectorLine, isCancelled && styles.connectorLineCancelled]} />
                  <View style={[styles.dot, { backgroundColor: isCancelled ? '#9ca3af' : '#ef4444' }, isCancelled && styles.dotCancelled]} />
                </View>

                <View style={styles.routeInfo}>
                  <View style={styles.locationItem}>
                    <Text style={styles.locationName}>{booking.pickupLocation}</Text>
                    {booking.pickupDistrict && <Text style={styles.locationSubtitle}>{booking.pickupDistrict}</Text>}
                  </View>
                  <View style={styles.locationItem}>
                    <Text style={styles.locationName}>{booking.dropoffLocation}</Text>
                    {booking.dropoffDistrict && <Text style={styles.locationSubtitle}>{booking.dropoffDistrict}</Text>}
                  </View>
                </View>
              </View>

              {/* Card Footer */}
              {booking.rideType === 'hire' && isCompleted ? (
                <TouchableOpacity 
                  style={styles.rateButton}
                  onPress={() => openRatingModal(booking)}
                >
                  <MaterialIcons name="star-rate" size={18} color="#fff" style={{ marginRight: SPACING.sm }} />
                  <Text style={styles.rateButtonText}>Đánh giá tài xế</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.cardFooter}>
                  {isCompleted && booking.rideType === 'share' && (
                    <View style={styles.starsContainer}>
                      {[0, 1, 2, 3, 4].map((i) => (
                        <MaterialIcons key={i} name="star" size={20} color="#fbbf24" style={{ marginRight: 2 }} />
                      ))}
                    </View>
                  )}
                  <View style={styles.footerButtonGroup}>
                    <TouchableOpacity style={styles.detailButton} onPress={() => handleViewDetail(booking)}>
                      <MaterialIcons name="info" size={14} color="#53d22d" />
                      <Text style={styles.detailButtonText}>Chi tiết</Text>
                    </TouchableOpacity>
                    {isCompleted && booking.rideType === 'share' && (
                      <TouchableOpacity style={styles.rebookButton}>
                        <MaterialIcons name="replay" size={16} color="#94a3b8" />
                        <Text style={styles.rebookText}>Đặt lại</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}
            </View>
          )
        })}
              </>
            )}
          </>
        )}
      </ScrollView>

      {/* Rating Modal */}
      <Modal
        visible={isRatingModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeRatingModal}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardAvoidingView}
          >
            <View style={styles.modalContent}>
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Đánh giá tài xế</Text>
                <TouchableOpacity 
                  onPress={closeRatingModal}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: '#f1f5f9',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <MaterialIcons name="close" size={20} color="#64748b" />
                </TouchableOpacity>
              </View>

              {/* Driver Info */}
              {selectedRide && (
                <View style={styles.driverInfo}>
                  <Text style={styles.driverName}>{selectedRide.driverName}</Text>
                  <Text style={styles.driverPlate}>{selectedRide.carPlate}</Text>
                </View>
              )}

              {/* Star Rating */}
              <View style={styles.ratingSection}>
                <Text style={styles.ratingLabel}>Mức độ hài lòng</Text>
                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity
                      key={star}
                      onPress={() => setRating(star)}
                      style={styles.starButton}
                    >
                      <MaterialIcons
                        name={star <= rating ? 'star' : 'star-outline'}
                        size={40}
                        color={star <= rating ? '#fbbf24' : '#64748b'}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Review Text */}
              <View style={styles.reviewSection}>
                <Text style={styles.reviewLabel}>Bình luận (tùy chọn)</Text>
                <TextInput
                  style={styles.reviewInput}
                  placeholder="Chia sẻ trải nghiệm của bạn..."
                  placeholderTextColor="#64748b"
                  value={reviewText}
                  onChangeText={setReviewText}
                  multiline
                  numberOfLines={4}
                  maxLength={500}
                />
                <Text style={styles.charCount}>
                  {reviewText.length}/500
                </Text>
              </View>

              {/* Buttons */}
              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={closeRatingModal}
                  disabled={isSubmittingRating}
                >
                  <Text style={styles.cancelButtonText}>Hủy</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={submitRating}
                  disabled={isSubmittingRating}
                >
                  {isSubmittingRating ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.submitButtonText}>Gửi đánh giá</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingTop: SPACING.xxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.lg,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  calendarButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF6B00',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  filterContainer: {
    backgroundColor: '#fff',
    paddingBottom: SPACING.sm,
  },
  filterContent: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
    gap: SPACING.sm,
  },
  filterTab: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 24,
    backgroundColor: '#f1f5f9',
    borderWidth: 0,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterTabFirst: {
    marginRight: 0,
  },
  filterTabActive: {
    backgroundColor: '#FF6B00',
    borderColor: 'transparent',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 5,
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    letterSpacing: -0.2,
  },
  filterTabTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  listContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  listContent: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 300,
    gap: SPACING.lg,
  },
  loadingText: {
    fontSize: 15,
    color: '#64748b',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 300,
    gap: SPACING.md,
    paddingHorizontal: SPACING.xl,
  },
  emptyText: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    fontWeight: '500',
  },
  resetFilterButton: {
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    paddingVertical: 12,
    backgroundColor: '#FF6B00',
    borderRadius: 24,
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  resetFilterText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.2,
  },
  bookingCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 0,
    marginBottom: SPACING.lg,
    overflow: 'hidden',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  bookingCardCancelled: {
    opacity: 0.6,
    backgroundColor: '#f8fafc',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    gap: SPACING.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  iconContainerShare: {
    backgroundColor: '#fff5eb',
  },
  iconContainerHire: {
    backgroundColor: '#fef3e8',
  },
  headerInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: 4,
  },
  rideTypeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bookingTime: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  fareText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FF6B00',
    textAlign: 'right',
    letterSpacing: -0.5,
  },
  fareTextCancelled: {
    color: '#94a3b8',
    textDecorationLine: 'line-through',
  },
  routeSection: {
    flexDirection: 'row',
    gap: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
  },
  routeTimeline: {
    width: 20,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: SPACING.xs,
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  dotCancelled: {
    shadowOpacity: 0.08,
    borderColor: '#f8fafc',
  },
  connectorLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#e2e8f0',
    minHeight: 64,
  },
  connectorLineCancelled: {
    width: 2,
    flex: 1,
    backgroundColor: '#f1f5f9',
    minHeight: 64,
  },
  routeInfo: {
    flex: 1,
    justifyContent: 'space-around',
  },
  locationItem: {
    paddingVertical: SPACING.sm,
  },
  locationName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
    letterSpacing: -0.2,
    lineHeight: 20,
  },
  locationSubtitle: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#fafbfc',
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 3,
  },
  footerButtonGroup: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  detailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
    backgroundColor: '#ecfdf5',
    borderWidth: 0,
  },
  detailButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#10b981',
    letterSpacing: -0.2,
  },
  rebookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  rebookText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  rateButton: {
    backgroundColor: '#FF6B00',
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  rateButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'flex-end',
  },
  keyboardAvoidingView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.xxl,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  driverInfo: {
    backgroundColor: '#fff5eb',
    borderRadius: 16,
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B00',
  },
  driverName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  driverPlate: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
  },
  ratingSection: {
    marginBottom: SPACING.xl,
    alignItems: 'center',
  },
  ratingLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: SPACING.lg,
    letterSpacing: -0.3,
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  starButton: {
    padding: SPACING.xs,
  },
  reviewSection: {
    marginBottom: SPACING.xl,
  },
  reviewLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: SPACING.md,
    letterSpacing: -0.2,
  },
  reviewInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    color: '#0f172a',
    fontSize: 14,
    textAlignVertical: 'top',
    minHeight: 120,
    fontWeight: '500',
  },
  charCount: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: SPACING.sm,
    textAlign: 'right',
    fontWeight: '500',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: -0.2,
  },
  submitButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#FF6B00',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.2,
  },
})
