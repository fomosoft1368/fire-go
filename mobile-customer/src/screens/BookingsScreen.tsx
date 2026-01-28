import { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '../redux/store'
import { rideService } from '../services/rideService'
import { combinedTripsService } from '../services/combinedTripsService'
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

export default function BookingsScreen() {
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
      
      // Fetch cả HIRE rides và SHARE combined trips
      const [rideHistory, combinedTrips] = await Promise.all([
        rideService.getRideHistory(userId).catch((err) => {
          console.error('[BookingsScreen] Error fetching rides:', err)
          return []
        }),
        combinedTripsService.getCustomerTrips(userId).catch((err) => {
          console.error('[BookingsScreen] Error fetching combined trips:', err)
          return []
        }),
      ])

      console.log('[BookingsScreen] Fetch completed:')
      console.log('  - HIRE rides:', rideHistory?.length || 0)
      console.log('  - SHARE combined-trips:', combinedTrips?.length || 0)
      if (combinedTrips && combinedTrips.length > 0) {
        console.log('[BookingsScreen] First combined trip data:', JSON.stringify(combinedTrips[0], null, 2))
      }

      // Format combined trips thành RideBooking structure
      // Use customer's specific pickup/dropoff from RideRequest, not driver's route
      const formattedCombinedTrips = (combinedTrips || []).map((trip: any) => {
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

      // Merge rides + combined trips
      const allBookings = [...rideHistory, ...formattedCombinedTrips]
      
      // Sort by booking time (newest first)
      allBookings.sort((a, b) => {
        const timeA = new Date(a.bookingTime).getTime()
        const timeB = new Date(b.bookingTime).getTime()
        return timeB - timeA
      })

      console.log('[BookingsScreen] Total bookings:', allBookings.length)
      
      if (allBookings.length === 0) {
        Alert.alert('Thông báo', 'Không có chuyến đi nào')
      }
      
      setBookings(allBookings)
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
      console.log('[BookingsScreen] Navigating to DriverFound:', booking.combinedTripId)
      navigation.navigate('DriverFound', {
        combinedTripId: booking.combinedTripId,
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
    return rideType === 'hire' ? 'person-apron' : 'commute'
  }

  const getRideTypeLabel = (rideType: string) => {
    return rideType === 'hire' ? 'Lái xe hộ' : 'Ghép xe'
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
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
        ) : filteredBookings.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="history" size={48} color="#64748b" />
            <Text style={styles.emptyText}>Không có chuyến đi nào</Text>
          </View>
        ) : (
          <>
      {/* Filter Tabs */}
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
      {/* Bookings List */}
        {filteredBookings.map((booking) => {
          const badge = getStatusBadge(booking.status)
          const isCompleted = booking.status === 'completed'
          const isCancelled = booking.status === 'cancelled'
          const rideIcon = getRideTypeIcon(booking.rideType)
          const rideLabel = getRideTypeLabel(booking.rideType)

          return (
            <View
              key={booking.id}
              style={[styles.bookingCard, isCancelled && styles.bookingCardCancelled]}
            >
              {/* Card Header */}
              <View style={styles.cardHeader}>
                <View style={styles.headerLeft}>
                  <View
                    style={[
                      styles.iconContainer,
                      booking.rideType === 'hire'
                        ? styles.iconContainerHire
                        : styles.iconContainerShare,
                    ]}
                  >
                    <MaterialIcons
                      name={rideIcon as any}
                      size={20}
                      color={booking.rideType === 'hire' ? '#FF6B00' : '#FF6B00'}
                    />
                  </View>
                  <View style={styles.headerInfo}>
                    <View style={styles.titleRow}>
                      <Text style={styles.rideTypeText}>{rideLabel}</Text>
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

              {/* Route Visualization */}
              <View style={styles.routeSection}>
                <View style={styles.routeTimeline}>
                  {/* Pickup Dot */}
                  <View
                    style={[
                      styles.dot,
                      { backgroundColor: isCancelled ? '#9ca3af' : '#10b981' },
                      isCancelled && styles.dotCancelled,
                    ]}
                  />
                  {/* Connector Line */}
                  <View
                    style={[
                      styles.connectorLine,
                      isCancelled && styles.connectorLineCancelled,
                    ]}
                  />
                  {/* Dropoff Dot */}
                  <View
                    style={[
                      styles.dot,
                      { backgroundColor: isCancelled ? '#9ca3af' : '#ef4444' },
                      isCancelled && styles.dotCancelled,
                    ]}
                  />
                </View>

                <View style={styles.routeInfo}>
                  {/* Pickup Location */}
                  <View style={styles.locationItem}>
                    <Text style={styles.locationName}>{booking.pickupLocation}</Text>
                    {booking.pickupDistrict && (
                      <Text style={styles.locationSubtitle}>
                        {booking.pickupDistrict}
                      </Text>
                    )}
                  </View>

                  {/* Dropoff Location */}
                  <View style={styles.locationItem}>
                    <Text style={styles.locationName}>
                      {booking.dropoffLocation}
                    </Text>
                    {booking.dropoffDistrict && (
                      <Text style={styles.locationSubtitle}>
                        {booking.dropoffDistrict}
                      </Text>
                    )}
                  </View>
                </View>
              </View>

              {/* Card Footer */}
              {isCompleted && booking.rideType === 'share' && (
                <View style={styles.cardFooter}>
                  <View style={styles.starsContainer}>
                    {[0, 1, 2, 3, 4].map((i) => (
                      <MaterialIcons
                        key={i}
                        name="star"
                        size={20}
                        color="#fbbf24"
                        style={{ marginRight: 2 }}
                      />
                    ))}
                  </View>
                  <View style={styles.footerButtonGroup}>
                    <TouchableOpacity 
                      style={styles.detailButton}
                      onPress={() => handleViewDetail(booking)}
                    >
                      <MaterialIcons name="info" size={14} color="#53d22d" />
                      <Text style={styles.detailButtonText}>Chi tiết</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.rebookButton}>
                      <MaterialIcons name="replay" size={16} color="#94a3b8" />
                      <Text style={styles.rebookText}>Đặt lại</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              {isCompleted && booking.rideType === 'share' && !booking.combinedTripId && (
                <View style={styles.cardFooter}>
                  <TouchableOpacity 
                    style={styles.detailButton}
                    onPress={() => handleViewDetail(booking)}
                  >
                    <MaterialIcons name="info" size={14} color="#53d22d" />
                    <Text style={styles.detailButtonText}>Chi tiết</Text>
                  </TouchableOpacity>
                </View>
              )}
              {!isCompleted && booking.rideType === 'share' && (
                <View style={styles.cardFooter}>
                  <TouchableOpacity 
                    style={styles.detailButton}
                    onPress={() => handleViewDetail(booking)}
                  >
                    <MaterialIcons name="info" size={14} color="#53d22d" />
                    <Text style={styles.detailButtonText}>Chi tiết</Text>
                  </TouchableOpacity>
                </View>
              )}
              {isCompleted && booking.rideType === 'hire' && (
                <TouchableOpacity 
                  style={styles.rateButton}
                  onPress={() => openRatingModal(booking)}
                >
                  <MaterialIcons
                    name="star-rate"
                    size={18}
                    color="#fff"
                    style={{ marginRight: SPACING.sm }}
                  />
                  <Text style={styles.rateButtonText}>Đánh giá tài xế</Text>
                </TouchableOpacity>
              )}
            </View>
          )
        })}

        <View style={{ height: SPACING.xxl }} />
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
                <TouchableOpacity onPress={closeRatingModal}>
                  <MaterialIcons name="close" size={24} color="#fff" />
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
    backgroundColor: '#0f172a',
    paddingTop: SPACING.xxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  calendarButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterContainer: {
    backgroundColor: '#0f172a',
    borderBottomWidth: 1,
    paddingBottom: 4,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  filterContent: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    gap: SPACING.md,

  },
  filterTab: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: 20,
    backgroundColor: '#1a202c',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterTabFirst: {
    marginRight: SPACING.xs,
  },
  filterTabActive: {
    backgroundColor: '#FF6B00',
    borderColor: '#FF6B00',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
  },
  filterTabTextActive: {
    color: '#fff',
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 300,
    gap: SPACING.lg,
  },
  loadingText: {
    fontSize: 14,
    color: '#94a3b8',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 300,
    gap: SPACING.lg,
  },
  emptyText: {
    fontSize: 14,
    color: '#94a3b8',
  },
  bookingCard: {
    backgroundColor: '#1a202c',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: SPACING.lg,
    overflow: 'hidden',
  },
  bookingCardCancelled: {
    opacity: 0.65,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    gap: SPACING.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainerShare: {
    backgroundColor: 'rgba(255, 107, 0, 0.1)',
  },
  iconContainerHire: {
    backgroundColor: 'rgba(255, 107, 0, 0.15)',
  },
  headerInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  rideTypeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bookingTime: {
    fontSize: 11,
    color: '#94a3b8',
  },
  fareText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF6B00',
    textAlign: 'right',
  },
  fareTextCancelled: {
    color: '#9ca3af',
    textDecorationLine: 'line-through',
  },
  routeSection: {
    flexDirection: 'row',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
  },
  routeTimeline: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginBottom: SPACING.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  dotCancelled: {
    shadowOpacity: 0.1,
  },
  connectorLine: {
    width: 2,
    flex: 1,
    backgroundColor: 'rgba(200, 200, 200, 0.4)',
    minHeight: 80,
  },
  connectorLineCancelled: {
    width: 2,
    flex: 1,
    backgroundColor: 'rgba(150, 150, 150, 0.3)',
    minHeight: 80,
  },
  routeInfo: {
    flex: 1,
    justifyContent: 'space-around',
  },
  locationItem: {
    paddingVertical: SPACING.md,
  },
  locationName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
    marginBottom: SPACING.xs,
  },
  locationSubtitle: {
    fontSize: 11,
    color: '#94a3b8',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  footerButtonGroup: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  detailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: 'rgba(83, 210, 45, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(83, 210, 45, 0.3)',
  },
  detailButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#53d22d',
  },
  rebookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  rebookText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
  },
  rateButton: {
    backgroundColor: '#FF6B00',
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  rateButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  keyboardAvoidingView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1a202c',
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xl,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  driverInfo: {
    backgroundColor: 'rgba(255, 107, 0, 0.1)',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B00',
  },
  driverName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: SPACING.xs,
  },
  driverPlate: {
    fontSize: 12,
    color: '#94a3b8',
  },
  ratingSection: {
    marginBottom: SPACING.xl,
  },
  ratingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: SPACING.lg,
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.md,
  },
  starButton: {
    padding: SPACING.sm,
  },
  reviewSection: {
    marginBottom: SPACING.lg,
  },
  reviewLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: SPACING.md,
  },
  reviewInput: {
    backgroundColor: '#0f172a',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    color: '#fff',
    fontSize: 13,
    textAlignVertical: 'top',
    minHeight: 100,
  },
  charCount: {
    fontSize: 11,
    color: '#64748b',
    marginTop: SPACING.xs,
    textAlign: 'right',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.lg,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94a3b8',
  },
  submitButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: '#FF6B00',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
})
