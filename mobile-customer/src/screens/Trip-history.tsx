import { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '../redux/store'
import { rideService } from '../services/rideService'
import { combinedTripsService } from '../services/combinedTripsService'
import { deliveryService } from '../services/deliveryService'
import { hourlyServiceService } from '../services/hourlyServiceService'
import AsyncStorage from '@react-native-async-storage/async-storage'
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
import { SPACING } from '../constants'
import type { RideBooking } from '../types'

type Navigation = NativeStackNavigationProp<RootStackParamList>

export default function TripHistoryScreen() {
  const navigation = useNavigation<Navigation>()
  const user = useSelector((state: RootState) => state.auth.user)
  const [activeFilter, setActiveFilter] = useState('all')
  const [bookings, setBookings] = useState<RideBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [deletedTripIds, setDeletedTripIds] = useState<string[]>([])

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
    { key: 'hourly', label: 'Làm sạch' },
  ]

  // Fetch ride history on component mount and when user changes
  useEffect(() => {
    console.log('[BookingsScreen] useEffect triggered, user:', user)

    if (!user) {
      console.log('[BookingsScreen] User not yet loaded, waiting...')
      setLoading(false)
      return
    }

    loadDeletedTripIds()
    fetchRideHistory()
  }, [user])

  const loadDeletedTripIds = async () => {
    if (!user) return
    try {
      const userId = user._id || user.id
      const stored = await AsyncStorage.getItem(`deleted_trips_customer_${userId}`)
      if (stored) {
        setDeletedTripIds(JSON.parse(stored))
      }
    } catch (err) {
      console.error('[BookingsScreen] Error loading deleted trips:', err)
    }
  }

  const saveDeletedTripIds = async (ids: string[]) => {
    if (!user) return
    try {
      const userId = user._id || user.id
      await AsyncStorage.setItem(`deleted_trips_customer_${userId}`, JSON.stringify(ids))
      setDeletedTripIds(ids)
    } catch (err) {
      console.error('[BookingsScreen] Error saving deleted trips:', err)
    }
  }

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

      // Fetch HIRE rides, SHARE combined trips, DELIVERIES, và HOURLY services
      const [rideHistory, combinedTrips, deliveries, hourlyServices] = await Promise.all([
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
        hourlyServiceService.getMyServices().catch((err) => {
          console.error('[BookingsScreen] Error fetching hourly services:', err)
          return []
        }),
      ])

      console.log('[BookingsScreen] Fetch completed:')
      console.log('  - HIRE rides:', rideHistory?.length || 0)
      console.log('  - SHARE combined-trips:', combinedTrips?.length || 0)
      console.log('  - DELIVERIES:', deliveries?.length || 0)
      console.log('  - HOURLY services:', hourlyServices?.length || 0)
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
            createdAtTimestamp: trip.createdAt ? new Date(trip.createdAt).getTime() : 0,
            bookingTime: trip.createdAt
              ? new Date(trip.createdAt).toLocaleString('vi-VN')
              : 'N/A',
            // Use CUSTOMER's pickup/dropoff, not driver's route
            pickupLocation: trip.customerPickupAddress || trip.pickupLocationAddress || trip.pickupAddress || 'Điểm đón',
            dropoffLocation: trip.customerDropoffAddress || trip.dropoffLocationAddress || trip.dropoffAddress || 'Điểm đến',
            pickupDistrict: 'Việt Nam',
            dropoffDistrict: 'Việt Nam',
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
        createdAtTimestamp: delivery.createdAt ? new Date(delivery.createdAt).getTime() : 0,
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

      // Format hourly services thành RideBooking structure
      const formattedHourlyServices = (hourlyServices || []).map((service: any) => ({
        id: service._id || service.id,
        rideType: 'hourly',
        estimatedFare: service.estimatedPrice || service.actualPrice || 0,
        createdAtTimestamp: service.createdAt ? new Date(service.createdAt).getTime() : 0,
        bookingTime: service.createdAt
          ? new Date(service.createdAt).toLocaleString('vi-VN')
          : 'N/A',
        pickupLocation: service.address || 'Địa chỉ làm việc',
        dropoffLocation: `${service.hours} giờ làm việc`,
        pickupDistrict: new Date(service.selectedDate).toLocaleDateString('vi-VN'),
        dropoffDistrict: service.selectedTime || '',
        status: service.status?.toLowerCase() || 'pending',
        driverName: service.workerId?.firstName && service.workerId?.lastName
          ? `${service.workerId.firstName} ${service.workerId.lastName}`
          : 'Chưa có nhân viên',
        carPlate: 'N/A',
        hourlyServiceId: service._id || service.id,
      }))

      // Format hire rides to ensure createdAtTimestamp exists
      const formattedRideHistory = (rideHistory || []).map((ride: any) => ({
        ...ride,
        createdAtTimestamp: ride.createdAt
          ? new Date(ride.createdAt).getTime()
          : ride.bookingTime
            ? new Date(ride.bookingTime).getTime()
            : 0,
      }))

      // Merge rides + combined trips + deliveries + hourly services
      const allBookings = [...formattedRideHistory, ...formattedCombinedTrips, ...formattedDeliveries, ...formattedHourlyServices]

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

      // Sort: chuyến chưa hoàn thành lên đầu, hoàn thành/hủy xuống cuối
      const DONE_STATUSES = ['completed', 'cancelled', 'delivered']
      uniqueBookings.sort((a, b) => {
        const aDone = DONE_STATUSES.includes((a.status || '').toLowerCase()) ? 1 : 0
        const bDone = DONE_STATUSES.includes((b.status || '').toLowerCase()) ? 1 : 0
        if (aDone !== bDone) return aDone - bDone  // active first
        // Same group → newest first
        const timeA = (a as any).createdAtTimestamp || 0
        const timeB = (b as any).createdAtTimestamp || 0
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

  const handleCancelBooking = async (booking: RideBooking) => {
    Alert.alert(
      'Hủy dịch vụ',
      'Bạn có chắc chắn muốn hủy dịch vụ này?',
      [
        { text: 'Không', style: 'cancel' },
        {
          text: 'Hủy dịch vụ',
          style: 'destructive',
          onPress: async () => {
            try {
              // TODO: Call API to cancel service based on type
              if (booking.rideType === 'hourly' && booking.hourlyServiceId) {
                // await hourlyServiceService.cancelService(booking.hourlyServiceId)
                console.log('[BookingsScreen] Cancelling hourly service:', booking.hourlyServiceId)
              } else if (booking.rideType === 'delivery' && booking.deliveryId) {
                // await deliveryService.cancelDelivery(booking.deliveryId)
                console.log('[BookingsScreen] Cancelling delivery:', booking.deliveryId)
              }
              Alert.alert('Thành công', 'Đã hủy dịch vụ')
              fetchRideHistory()
            } catch (error: any) {
              Alert.alert('Lỗi', error.message || 'Không thể hủy dịch vụ')
            }
          },
        },
      ]
    )
  }

  const handleRebookService = (booking: RideBooking) => {
    Alert.alert(
      'Đặt lại dịch vụ',
      'Bạn muốn đặt lại dịch vụ này?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Đặt lại',
          onPress: () => {
            if (booking.rideType === 'hourly') {
              navigation.navigate('HourlyService')
            } else if (booking.rideType === 'delivery') {
              navigation.navigate('Delivery')
            } else if (booking.rideType === 'share') {
              navigation.navigate('Home')
            }
          },
        },
      ]
    )
  }

  const handleDeleteTrip = (tripId: string, tripStatus: string, rideType: string) => {
    // Only allow deleting completed or cancelled trips
    if (tripStatus !== 'completed' && tripStatus !== 'cancelled') {
      Alert.alert(
        'Không thể xóa',
        'Chỉ có thể xóa các chuyến đi đã hoàn thành hoặc đã hủy.',
        [{ text: 'Đồng ý' }]
      )
      return
    }

    Alert.alert(
      'Xóa lịch sử',
      'Bạn có chắc muốn xóa chuyến đi này khỏi lịch sử?',
      [
        {
          text: 'Hủy',
          style: 'cancel',
        },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: () => {
            const uniqueKey = `${tripId}_${rideType}`
            const newDeletedIds = [...deletedTripIds, uniqueKey]
            saveDeletedTripIds(newDeletedIds)
          },
        },
      ],
      { cancelable: true }
    )
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
    } else if (booking.rideType === 'hourly' && booking.hourlyServiceId) {
      // Nếu là hourly service
      console.log('[BookingsScreen] Navigating to ServiceDetail:', booking.hourlyServiceId)
      navigation.navigate('ServiceDetail', {
        serviceId: booking.hourlyServiceId,
        serviceType: 'hourly',
      })
    } else {
      // Nếu là hire ride
      navigation.navigate('RideTracking', {
        rideId: booking.id,
        status: booking.status,
        pickupLocation: booking.pickupLocation,
        dropoffLocation: booking.dropoffLocation,
        driverName: booking.driverName,
        carPlate: booking.carPlate,
        estimatedFare: booking.estimatedFare,
      })
    }
  }

  const filteredBookings = bookings.filter((booking) => {
    // Filter out deleted trips
    const uniqueKey = `${booking.id}_${booking.rideType}`
    if (deletedTripIds.includes(uniqueKey)) {
      return false
    }

    // Filter by ride type
    if (activeFilter === 'all') return true
    return booking.rideType === activeFilter
  })

  const getStatusBadge = (status: string, rideType?: string) => {
    const s = (status || '').toLowerCase()
    // Terminal states
    if (s === 'completed' || s === 'delivered') {
      return { label: 'HOÀN THÀNH', color: '#10b981', bgColor: '#dcfce7' }
    } else if (s === 'cancelled') {
      return { label: 'ĐÃ HỦY', color: '#ef4444', bgColor: '#fee2e2' }
    }
    // Active states
    if (s === 'in_progress' || s === 'delivering') {
      return {
        label: rideType === 'hourly' ? 'ĐANG LÀM VIỆC' : rideType === 'delivery' ? 'ĐANG GIAO' : 'ĐANG ĐI',
        color: '#3b82f6', bgColor: '#dbeafe',
      }
    } else if (s === 'picking_up') {
      return { label: 'ĐI LẤY HÀNG', color: '#f59e0b', bgColor: '#fef3c7' }
    } else if (s === 'driver_arrived' || s === 'arrived_at_pickup') {
      return { label: 'TÀI XẾ ĐÃ ĐẾN', color: '#0ea5e9', bgColor: '#e0f2fe' }
    } else if (s === 'started') {
      return { label: 'ĐÃ BẮT ĐẦU', color: '#3b82f6', bgColor: '#dbeafe' }
    } else if (s === 'pending' || s === 'finding') {
      return { label: 'ĐANG TÌM NGƯỜI', color: '#f59e0b', bgColor: '#fef3c7' }
    } else if (s === 'confirmed' || s === 'accepted' || s === 'assigned') {
      return { label: 'ĐÃ CÓ NGƯỜI NHẬN', color: '#8b5cf6', bgColor: '#ede9fe' }
    }
    // Fallback: show raw status in orange
    return { label: status.toUpperCase().replace(/_/g, ' '), color: '#f59e0b', bgColor: '#fef3c7' }
  }

  const getRideTypeIcon = (rideType: string) => {
    if (rideType === 'hire') return 'drive-eta'
    if (rideType === 'delivery') return 'local-shipping'
    if (rideType === 'hourly') return 'cleaning-services'
    return 'commute'
  }

  const getRideTypeLabel = (rideType: string) => {
    if (rideType === 'hire') return 'Lái xe hộ'
    if (rideType === 'delivery') return 'Giao hàng'
    if (rideType === 'hourly') return 'Làm sạch'
    return 'Ghép xe'
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Hoạt động</Text>
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
            <Text style={styles.loadingText}>Đang tải lịch sử...</Text>
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
                  const badge = getStatusBadge(booking.status, booking.rideType)
                  const isCompleted = booking.status === 'completed'
                  const isCancelled = booking.status === 'cancelled'
                  const isPending = ['pending', 'finding'].includes(booking.status)
                  const canDelete = isCompleted || isCancelled

                  return (
                    <View
                      key={`${booking.id}_${booking.rideType}`}
                      style={[styles.bookingCard, isCancelled && styles.bookingCardCancelled]}
                    >
                      {/* Delete Button - Only for completed/cancelled */}
                      {canDelete && (
                        <TouchableOpacity
                          style={styles.deleteButton}
                          onPress={() => handleDeleteTrip(booking.id, booking.status, booking.rideType)}
                          activeOpacity={0.7}
                        >
                          <MaterialIcons name="delete-outline" size={20} color="#ef4444" />
                        </TouchableOpacity>
                      )}

                      {/* Card Header */}
                      <View style={styles.cardHeader}>
                        <View style={styles.headerLeft}>
                          <View
                            style={[
                              styles.iconContainer,
                              booking.rideType === 'hire' && styles.iconContainerHire,
                              booking.rideType === 'share' && styles.iconContainerShare,
                              booking.rideType === 'delivery' && styles.iconContainerDelivery,
                              booking.rideType === 'hourly' && styles.iconContainerHourly,
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

                      {/* Price Section */}
                      <View style={styles.priceSection}>
                        <View style={styles.priceBox}>
                          <Text style={styles.priceLabel}>Tổng cộng</Text>
                          <Text style={[styles.priceValue, isCancelled && styles.priceValueCancelled]}>
                            {isCancelled ? '0đ' : booking.estimatedFare.toLocaleString('vi-VN') + 'đ'}
                          </Text>
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
                      ) : isPending ? (
                        <View style={styles.cardFooter}>
                          <TouchableOpacity style={styles.detailButton} onPress={() => handleViewDetail(booking)}>
                            <MaterialIcons name="info" size={14} color="#53d22d" />
                            <Text style={styles.detailButtonText}>Chi tiết</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.cardCancelButton}
                            onPress={() => handleCancelBooking(booking)}
                          >
                            <MaterialIcons name="close" size={16} color="#ef4444" />
                            <Text style={styles.cardCancelButtonText}>Hủy</Text>
                          </TouchableOpacity>
                        </View>
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
                            {isCompleted && (booking.rideType === 'share' || booking.rideType === 'hourly' || booking.rideType === 'delivery') && (
                              <TouchableOpacity
                                style={styles.rebookButton}
                                onPress={() => handleRebookService(booking)}
                              >
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
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xxl + SPACING.lg,
    paddingBottom: SPACING.xl,
    backgroundColor: '#fff',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
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
    fontSize: 28,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.8,
  },
  calendarButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FF6B00',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  filterContainer: {
    paddingBottom: SPACING.sm,
  },
  filterContent: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
    gap: SPACING.md,
  },
  filterTab: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterTabFirst: {
    marginRight: 0,
  },
  filterTabActive: {
    backgroundColor: '#FF6B00',
    borderColor: '#FF6B00',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  filterTabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748b',
    letterSpacing: -0.3,
  },
  filterTabTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  listContainer: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  listContent: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xl,
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
    fontSize: 16,
    color: '#64748b',
    fontWeight: '600',
    letterSpacing: -0.2,
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
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 24,
    letterSpacing: -0.2,
  },
  resetFilterButton: {
    marginTop: SPACING.xl,
    paddingHorizontal: SPACING.xl,
    paddingVertical: 14,
    backgroundColor: '#FF6B00',
    borderRadius: 20,
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  resetFilterText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.3,
  },
  bookingCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginBottom: SPACING.xl,
    overflow: 'hidden',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  bookingCardCancelled: {
    opacity: 0.6,
    backgroundColor: '#f8fafc',
  },
  deleteButton: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
    zIndex: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.lg,
    borderBottomWidth: 0,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    gap: SPACING.md,
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  iconContainerShare: {
    backgroundColor: '#fff5eb',
    borderColor: '#fecb03',
  },
  iconContainerHire: {
    backgroundColor: '#fef3e8',
    borderColor: '#FFB84D',
  },
  iconContainerDelivery: {
    backgroundColor: '#e0f2fe',
    borderColor: '#0ea5e9',
  },
  iconContainerHourly: {
    backgroundColor: '#f3e8ff',
    borderColor: '#d946ef',
  },
  headerInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: 6,
  },
  rideTypeText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.4,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  bookingTime: {
    fontSize: 14,
    color: '#74808b',
    fontWeight: '500',
    marginTop: 6,
  },
  fareText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FF6B00',
    textAlign: 'right',
    letterSpacing: -0.6,
  },
  fareTextCancelled: {
    color: '#94a3b8',
    textDecorationLine: 'line-through',
  },
  priceSection: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
    backgroundColor: '#f9fafb',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  priceBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },
  priceLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748b',
    letterSpacing: -0.2,
  },
  priceValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FF6B00',
    letterSpacing: -0.5,
  },
  priceValueCancelled: {
    color: '#94a3b8',
    textDecorationLine: 'line-through',
  },
  routeSection: {
    flexDirection: 'row',
    gap: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.xl,
    backgroundColor: '#f9fafb',
  },
  routeTimeline: {
    width: 20,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  dot: {
    width: 13,
    height: 13,
    borderRadius: 6.5,
    marginBottom: SPACING.xs,
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  dotCancelled: {
    shadowOpacity: 0.08,
    borderColor: '#f8fafc',
  },
  connectorLine: {
    width: 2.5,
    flex: 1,
    backgroundColor: '#e2e8f0',
    minHeight: 64,
  },
  connectorLineCancelled: {
    width: 2.5,
    flex: 1,
    backgroundColor: '#f1f5f9',
    minHeight: 64,
  },
  routeInfo: {
    flex: 1,
    justifyContent: 'space-around',
  },
  locationItem: {
    paddingVertical: SPACING.md,
  },
  locationName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
    letterSpacing: -0.3,
    lineHeight: 21,
  },
  locationSubtitle: {
    fontSize: 13,
    color: '#74808b',
    fontWeight: '500',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
    borderTopWidth: 0,
    backgroundColor: '#fff',
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 4,
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
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: '#ecfdf5',
    borderWidth: 1.5,
    borderColor: '#d1fae5',
  },
  detailButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10b981',
    letterSpacing: -0.3,
  },
  rebookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  rebookText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: -0.2,
  },
  cardCancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: '#fef2f2',
    borderWidth: 1.5,
    borderColor: '#fecaca',
  },
  cardCancelButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ef4444',
    letterSpacing: -0.2,
  },
  rateButton: {
    backgroundColor: '#FF6B00',
    marginHorizontal: 0,
    marginBottom: 0,
    paddingVertical: 16,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  rateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
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
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xxl,
    paddingBottom: SPACING.xxl,
    maxHeight: '85%',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xl,
    paddingBottom: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.6,
  },
  driverInfo: {
    backgroundColor: '#fff5eb',
    borderRadius: 18,
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
    borderLeftWidth: 5,
    borderLeftColor: '#FF6B00',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  driverName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 6,
    letterSpacing: -0.4,
  },
  driverPlate: {
    fontSize: 14,
    color: '#74808b',
    fontWeight: '600',
    marginTop: 2,
  },
  ratingSection: {
    marginBottom: SPACING.xl,
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  ratingLabel: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: SPACING.lg,
    letterSpacing: -0.4,
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.lg,
  },
  starButton: {
    padding: SPACING.xs,
  },
  reviewSection: {
    marginBottom: SPACING.xl,
  },
  reviewLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: SPACING.md,
    letterSpacing: -0.3,
  },
  reviewInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    color: '#0f172a',
    fontSize: 15,
    textAlignVertical: 'top',
    minHeight: 130,
    fontWeight: '500',
  },
  charCount: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: SPACING.sm,
    textAlign: 'right',
    fontWeight: '600',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.xl,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: -0.3,
  },
  submitButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: '#FF6B00',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.3,
  },
})
