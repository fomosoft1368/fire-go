import { useState, useEffect, useRef } from 'react'
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
  Dimensions,
  StatusBar,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { MaterialIcons } from '@expo/vector-icons'
import { useSelector } from 'react-redux'
import { useNavigation, useRoute } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RootState } from '../redux/store'
import type { RootStackParamList, NearbyRide } from '../types'
import { COLORS_DARK, COLORS_LIGHT, SPACING, BORDER_RADIUS } from '../constants'
import { combinedTripsService } from '../services/combinedTripsService'
import { calculateFare } from '../utils/pricing'
import MapViewComponent from '../components/MapView'

const { height, width } = Dimensions.get('window')

type Navigation = NativeStackNavigationProp<RootStackParamList>

interface RideDetailRequestScreenProps {
  rideId: string
  ride: NearbyRide
}

export default function RideDetailRequestScreen() {
  const navigation = useNavigation<Navigation>()
  const route = useRoute()
  const user = useSelector((state: RootState) => state.auth.user)
  const themeMode = useSelector((state: RootState) => state.theme.mode)
  const colors = themeMode === 'dark' ? COLORS_DARK : COLORS_LIGHT

  // Safe params extraction with defaults
  const params = route.params as any
  const combinedTripId = params?.combinedTripId ?? ''
  const ride = params?.ride ?? null

  // Get customer's pickup/dropoff coordinates from params (NOT from ride object)
  const pickupCoordinates = params?.pickupCoordinates ?? ride?.pickupCoordinates ?? [105.8542, 21.0285]
  const dropoffCoordinates = params?.dropoffCoordinates ?? [105.8542, 21.0285]
  const pickupAddress = params?.pickupAddress ?? ride?.pickupAddress ?? ''
  const dropoffAddress = params?.dropoffAddress ?? ride?.dropoffAddress ?? ''

  const [requesting, setRequesting] = useState(false)
  const [requestStatus, setRequestStatus] = useState<'pending' | 'accepted' | 'rejected' | null>(null)
  const [selectedSeats, setSelectedSeats] = useState<number[]>([])
  const [customerFare, setCustomerFare] = useState<number | null>(null)
  const [customerDistance, setCustomerDistance] = useState<number | null>(null)
  const [calculatingFare, setCalculatingFare] = useState(false)
  const [tripData, setTripData] = useState(ride) // ✅ Store ride data in state for updates
  const [checkingPendingRequests, setCheckingPendingRequests] = useState(false)
  const statusCheckInterval = useRef<NodeJS.Timeout | null>(null)
  const tripPollInterval = useRef<NodeJS.Timeout | null>(null)

  //  Calculate seat availability BEFORE useEffect
  const totalSeats = tripData?.totalSeats || 4
  
  const bookedSeatsCount = tripData?.bookedSeats ?? (totalSeats - (tripData?.availableSeats ?? totalSeats))
  // ✅ Số ghế trống = tổng ghế - ghế đã đặt - ghế đang chọn
  const availableSeats = totalSeats - bookedSeatsCount - selectedSeats.length

  // Validate ride data
  useEffect(() => {
    if (!tripData || !combinedTripId) {
      Alert.alert('Lỗi', 'Không thể tải thông tin chuyến xe')
      navigation.goBack()
    }
  }, [])

  // ✅ Poll trip data every 2 seconds to get updated availableSeats
  useEffect(() => {
    const pollTripData = async () => {
      try {
        const updatedTrip = await combinedTripsService.getCombinedTripDetail(combinedTripId)
        if (updatedTrip) {
          setTripData(updatedTrip)
          console.log('[RideDetailRequestScreen] Trip data polled:', {
            availableSeats: updatedTrip.availableSeats,
            totalSeats: updatedTrip.totalSeats,
            bookedSeats: updatedTrip.bookedSeats,
          })
        }
      } catch (error: any) {
        console.error('[RideDetailRequestScreen] Error polling trip data:', error)
        
        // ✅ If trip not found (404), stop polling and go back
        if (error?.message?.includes('not found') || error?.message?.includes('404')) {
          console.log('[RideDetailRequestScreen] ⚠️ Trip not found - stopping poll and navigating back')
          if (tripPollInterval.current) {
            clearInterval(tripPollInterval.current)
          }
          Alert.alert(
            'Chuyến đi không tồn tại',
            'Chuyến đi này đã bị hủy hoặc không còn khả dụng.',
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          )
        }
      }
    }

    // Fetch immediately on mount
    pollTripData()

    // Then poll every 2 seconds
    tripPollInterval.current = setInterval(pollTripData, 2000)

    return () => {
      if (tripPollInterval.current) {
        clearInterval(tripPollInterval.current)
      }
    }
  }, [combinedTripId])

  // Calculate customer's fare based on their pickup/dropoff locations
  // Re-calculate when selected seats change (discount changes based on total passengers)
  useEffect(() => {
    const calculateCustomerFare = async () => {
      try {
        setCalculatingFare(true)
        console.log('[RideDetailRequestScreen] Calculating customer fare:', {
          pickup: pickupCoordinates,
          dropoff: dropoffCoordinates,
          selectedSeatsCount: selectedSeats.length,
        })

        // Get route from customer's pickup to dropoff
        // ✅ Use combinedTripsService for rideshare (with waypoints optimization)
        const directions = await combinedTripsService.getDirections(
          pickupCoordinates[0],
          pickupCoordinates[1],
          dropoffCoordinates[0],
          dropoffCoordinates[1],
        )

        // Extract distance and duration
        let distance = 0
        let duration = 0

        if (directions.features?.[0]) {
          const feature = directions.features[0]
          if (feature.properties?.summary) {
            distance = feature.properties.summary.distance
            duration = feature.properties.summary.duration
          }
        } else if (directions.distance !== undefined) {
          distance = directions.distance
          duration = directions.duration
        }

        // Convert to km if needed
        const distanceKm = distance > 500 ? distance / 1000 : distance
        setCustomerDistance(distanceKm)

        // ✅ NGHIỆP VỤ GIẢM GIÁ:
        // - Nếu xe đang có 1 người, mình chọn 1 ghế → TỔNG 2 NGƯỜI → giảm 10% cho MỖI NGƯỜI
        // - Nếu xe đang có 1 người, mình chọn 2 ghế → TỔNG 3 NGƯỜI → giảm 15% cho MỖI NGƯỜI
        // - Nếu xe đang có 2 người, mình chọn 2 ghế → TỔNG 4 NGƯỜI → giảm 20% cho MỖI NGƯỜI
        
        // ✅ TỔNG SỐ NGƯỜI trong xe = người đã đặt + 1 (mình)
        // KHÔNG tính theo số ghế đang chọn, vì 1 người có thể đặt nhiều ghế!
        const totalPassengers = bookedSeatsCount + selectedSeats.length
        
        // Get vehicle type from ride (default to 'sedan' if not available)
        // Valid types: 'sedan', 'suv', 'truck'
        const vehicleType = tripData.vehicleType || tripData.driverId?.vehicleType || 'sedan'
        
        console.log('[RideDetailRequestScreen] Pricing calculation:', {
          distanceKm,
          vehicleType,
          bookedSeatsCount, // 
          selectedSeatsCount: selectedSeats.length, // Số ghế đang chọn
          totalPassengers, // ← TỔNG SỐ NGƯỜI (quyết định % discount)
          discountWillBe: totalPassengers === 2 ? '10%' : totalPassengers === 3 ? '15%' : totalPassengers === 4 ? '20%' : '0%',
        })

        // ✅ Tính giá cho KHÁCH NÀY với discount theo TỔNG SỐ NGƯỜI trong xe
        const fareBreakdown = await calculateFare(
          distanceKm,
          vehicleType,
          totalPassengers, // ✅ Discount dựa trên TỔNG SỐ NGƯỜI (bookedSeats + selectedSeats)
          undefined, // ✅ Tự động check giờ cao điểm hiện tại (không hardcode)
          undefined  // ✅ Không truyền multiplier (để tự động lấy từ config)
        )
       
        // ✅ GIÁ CHO MỖI GHẾ = finalPrice (đã bao gồm discount theo totalPassengers)
        // Ví dụ: 
        // - 1 người trong xe + mình chọn 1 ghế = 2 người → discount 10%
        // - 1 người trong xe + mình chọn 2 ghế = 3 người → discount 15%
        // Giá cho KHÁCH NÀY = giá mỗi ghế × số ghế đã chọn
        const customerTotalFare = fareBreakdown.finalPrice * selectedSeats.length
      
        setCustomerFare(customerTotalFare)

        console.log('[RideDetailRequestScreen] Customer fare calculated:', {
          rawPrice: fareBreakdown.rawPrice,
          basePrice: fareBreakdown.basePrice,
          finalPrice: fareBreakdown.finalPrice, // Giá MỖI GHẾ (đã có discount)
          isPeakTime: fareBreakdown.isPeakTime,
          peakMultiplier: fareBreakdown.peakMultiplier, // ✅ 1.0, 1.3, hoặc 1.5
          discountApplied: fareBreakdown.discountApplied + '%',
          totalPassengers, // Tổng số người trong xe
          selectedSeatsCount: selectedSeats.length, // Số ghế khách chọn
          customerTotalFare, // = finalPrice × số ghế
          explanation: `${bookedSeatsCount} người đã đặt + ${selectedSeats.length} ghế chọn = ${totalPassengers} người → giảm ${fareBreakdown.discountApplied}%`,
        })
      } catch (error) {
        console.error('[RideDetailRequestScreen] Error calculating fare:', error)
        // Fallback to ride totalFare if calculation fails
        setCustomerFare(ride?.totalFare || 0)
      } finally {
        setCalculatingFare(false)
      }
    }

    if (pickupCoordinates && dropoffCoordinates && ride && selectedSeats.length > 0) {
      calculateCustomerFare()
    }
   }, [pickupCoordinates, dropoffCoordinates, ride, selectedSeats, bookedSeatsCount])

  useEffect(() => {
    return () => {
      if (statusCheckInterval.current) {
        clearInterval(statusCheckInterval.current)
      }
    }
  }, [])

  const handleRequestRide = async () => {
    if (!user?.id) {
      Alert.alert('Lỗi', 'Vui lòng đăng nhập trước')
      return
    }

    // ✅ Bước 1: Kiểm tra xem có request nào đang pending không
    setCheckingPendingRequests(true)
    try {
      console.log('[RideDetailRequestScreen] 🔍 Checking for pending requests...')
      
      // Lấy thông tin trip mới nhất để check pending requests
      const latestTrip = await combinedTripsService.getCombinedTripDetail(combinedTripId)
      
      // Đếm số request đang pending (chưa được xử lý)
      const pendingRequests = latestTrip.requests?.filter(
        (req: any) => req.status === 'pending'
      ) || []

      console.log('[RideDetailRequestScreen] Pending requests count:', pendingRequests.length)

      // ✅ Nếu có request đang pending, KHÔNG cho gửi thêm
      if (pendingRequests.length > 0) {
        setCheckingPendingRequests(false)
        Alert.alert(
          'Vui lòng đợi',
          `Tài xế đang xem xét yêu cầu của ${pendingRequests.length} khách hàng khác. Vui lòng đợi trong giây lát và thử lại.`,
          [{ text: 'OK' }]
        )
        return
      }

      // ✅ Kiểm tra lại số ghế available (có thể đã bị đặt trong lúc tính giá)
      const currentBookedSeats = latestTrip.bookedSeats ?? (latestTrip.totalSeats - latestTrip.availableSeats)
      const currentAvailableSeats = latestTrip.totalSeats - currentBookedSeats - selectedSeats.length

      if (currentAvailableSeats < 0) {
        setCheckingPendingRequests(false)
        Alert.alert(
          'Không đủ chỗ',
          'Số ghế bạn chọn vượt quá số ghế còn trống. Vui lòng chọn lại.',
          [{ text: 'OK' }]
        )
        return
      }

      console.log('[RideDetailRequestScreen] ✅ No pending requests, proceeding...')
      setCheckingPendingRequests(false)
      
    } catch (error: any) {
      console.error('[RideDetailRequestScreen] Error checking pending requests:', error)
      setCheckingPendingRequests(false)
      Alert.alert('Lỗi', 'Không thể kiểm tra trạng thái chuyến xe. Vui lòng thử lại.')
      return
    }

    // ✅ Bước 2: Gửi request (chỉ khi không có pending request)
    setRequesting(true)
    try {
      console.log('[RideDetailRequestScreen] Creating combined trip request with customer coordinates:', {
        combinedTripId,
        pickupCoordinates,
        dropoffCoordinates,
        pickupAddress,
        dropoffAddress,
        customerFare,
        customerDistance,
      })

      // ⚠️ CRITICAL FIX: customerFare đã là tổng tiền cho TẤT CẢ ghế đã chọn
      // KHÔNG được nhân với selectedSeats.length nữa!
      const fareToUse = customerFare || ride.totalFare
      const distanceToUse = customerDistance || ride.distance

      // ✅ Tính lại fare để lấy peakMultiplier (cần gửi lên backend)
      const fareBreakdownForRequest = await calculateFare(
        distanceToUse,
        tripData.vehicleType || tripData.driverId?.vehicleType || 'sedan',
        bookedSeatsCount + selectedSeats.length,
        undefined,
        undefined
      )

      console.log('💰 [RideDetailRequestScreen] Fare to send to backend:', {
        customerFare,
        selectedSeatsCount: selectedSeats.length,
        fareToUse, // ← Đây là GIÁ TỔNG cho tất cả ghế
        isPeakTime: fareBreakdownForRequest.isPeakTime,
        peakMultiplier: fareBreakdownForRequest.peakMultiplier,
        note: 'customerFare = pricePerSeat × selectedSeats, KHÔNG nhân lại!'
      })
        
      // Create combined trip request
      const request = await combinedTripsService.createCombinedTripRequest(
        combinedTripId,
        user.id,
        pickupAddress,
        dropoffAddress,
        pickupCoordinates,
        dropoffCoordinates,
        distanceToUse,
        fareToUse, // ✅ GIÁ TỔNG, đã bao gồm tất cả ghế
        selectedSeats.length,
        fareBreakdownForRequest.isPeakTime, // ✅ Boolean
        fareBreakdownForRequest.peakMultiplier // ✅ 1.0, 1.3, hoặc 1.5
      )

    
      setRequestStatus('pending')

      // Start polling for status changes
      pollRequestStatus(request._id)

      // Dismiss modal after 3 seconds if not accepted
      setTimeout(() => {
        if (requestStatus === 'pending') {
          setRequesting(false)
          Alert.alert(
            'Yêu cầu gửi thành công',
            'Vui lòng đợi tài xế phản hồi. Bạn có thể tiếp tục sử dụng ứng dụng trong lúc chờ đợi.',
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          )
        }
      }, 3000)
    } catch (error: any) {
      console.error('Error creating request:', error)
      Alert.alert('Lỗi', error.message || 'Không thể gửi yêu cầu. Vui lòng thử lại.')
      setRequesting(false)
    }
  }

  const pollRequestStatus = (requestId: string) => {
    // Poll every 2 seconds
    statusCheckInterval.current = setInterval(async () => {
      try {
        const status = await combinedTripsService.getCombinedTripRequestStatus(combinedTripId, requestId)

        console.log('Request status:', status.status)

        if (status.status === 'accepted') {
          setRequestStatus('accepted')
          setRequesting(false)
          clearInterval(statusCheckInterval.current!)

          // Show success and navigate to ride
          setTimeout(() => {
            Alert.alert(
              'Tuyệt vời!',
              'Tài xế đã chấp nhận yêu cầu của bạn!',
              [
                {
                  text: 'Xem chuyến đi',
                  onPress: () => {
                    navigation.navigate('DriverFound', {
                      combinedTripId: combinedTripId,
                      tripType: 'combined_trip',
                    })
                  },
                },
              ]
            )
          }, 500)
        } else if (status.status === 'rejected' || status.status === 'deleted') {
          setRequestStatus('rejected')
          setRequesting(false)
          clearInterval(statusCheckInterval.current!)
          Alert.alert(
            'Yêu cầu bị từ chối',
            'Tài xế đã từ chối yêu cầu của bạn. Vui lòng thử tìm chuyến khác.',
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          )
        } else if (status.status === 'timeout') {
          setRequestStatus('rejected')
          setRequesting(false)
          clearInterval(statusCheckInterval.current!)
          Alert.alert(
            'Yêu cầu hết hạn',
            'Tài xế không phản hồi trong thời gian quy định. Vui lòng thử tìm chuyến khác.',
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          )
        }
      } catch (error) {
        console.error('Error checking status:', error)
      }
    }, 2000)
  }

  const handleCancel = () => {
    if (statusCheckInterval.current) {
      clearInterval(statusCheckInterval.current)
    }
    navigation.goBack()
  }

  // Car seats layout (4 seats total)
  const getSeatsState = () => {
    const seats = []
    for (let i = 0; i < totalSeats; i++) {
      if (i < bookedSeatsCount) {
        // Ghế đã được người khác đặt
        seats.push('occupied')
      } else {
        // Ghế còn trống
        seats.push('available')
      }
    }
    return seats
  }

  const seatsState = getSeatsState()

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      <StatusBar barStyle={themeMode === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.card} />

      {!ride ? (
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={48} color={colors.textSecondary} />
          <Text style={[styles.errorText, { color: colors.text }]}>Không thể tải thông tin chuyến xe</Text>
        </View>
      ) : (
        <>
          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Map Hero Section with Top App Bar Overlay */}
            <View style={styles.mapHero}>
              
              <MapViewComponent
                height={height * 0.5}
                pickupCoords={{ latitude: pickupCoordinates[1], longitude: pickupCoordinates[0] }}
                dropoffCoords={{ latitude: dropoffCoordinates[1], longitude: dropoffCoordinates[0] }}
              />
              
              {/* Gradient Overlay Bottom - Fade from transparent to BG color */}
              <LinearGradient
                colors={['transparent', colors.bg]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.mapGradientBottom}
              />
              
              {/* Fixed Top App Bar - Overlay on Map */}
              <View style={[styles.topAppBar]}>
                <TouchableOpacity onPress={handleCancel} style={styles.backButton}>
                  <MaterialIcons name="arrow-back" size={24} color="#FF6B00"/>
                </TouchableOpacity>
                <Text style={styles.topBarTitle}>Chi tiết chuyến đi</Text>
                <View style={{ width: 40 }} />
              </View>
            </View>

            {/* Content Below Map */}
            <View style={[styles.contentWrapper, { backgroundColor: colors.card }]}>
              {/* Driver Section - Premium Gradient */}
              <LinearGradient
                colors={['#FFFFFF', '#FFF5F0']}
                style={styles.driverSection}
              >
                <View style={styles.driverRow}>
                  <View style={styles.driverAvatarContainer}>
                    <LinearGradient
                      colors={['#FF6B00', '#FF8534']}
                      style={styles.driverAvatar}
                    >
                      <MaterialIcons name="person" size={32} color="#FFFFFF" />
                    </LinearGradient>
                    <LinearGradient
                      colors={['#4CAF50', '#66BB6A']}
                      style={styles.verifiedBadge}
                    >
                      <MaterialIcons name="verified" size={12} color="#FFFFFF" />
                    </LinearGradient>
                  </View>
                  <View style={styles.driverDetails}>
                    <View style={styles.driverHeaderRow}>
                      <Text style={[styles.driverName, { color: colors.text }]}>
                        {tripData.driverId?.firstName || 'Tài'} {tripData.driverId?.lastName || 'xế'}
                      </Text>
                      <View style={styles.proBadge}>
                        <Text style={styles.proBadgeText}>PRO</Text>
                      </View>
                    </View>
                    <View style={styles.ratingRow}>
                      <View style={styles.starIconBadge}>
                        <MaterialIcons name="star" size={14} color="#FFD700" />
                      </View>
                      <Text style={[styles.ratingValue, { color: colors.text }]}>
                        {(tripData.driverId?.averageRating || tripData.driverId?.rating || 5).toFixed(1)}
                      </Text>
                      <Text style={[styles.ratingCount, { color: colors.textSecondary }]}>
                        ({tripData.driverId?.totalReviews || 0} đánh giá)
                      </Text>
                    </View>
                    <View style={styles.vehicleRow}>
                      <View style={styles.vehicleIconBadge}>
                        <MaterialIcons name="directions-car" size={12} color="#FF6B00" />
                      </View>
                      <Text style={[styles.vehicleText, { color: colors.textSecondary }]}>
                        {tripData.driverId?.vehicleModel || 'Xe'} • {tripData.driverId?.vehiclePlate || 'N/A'}
                      </Text>
                    </View>
                  </View>
                </View>
              </LinearGradient>

              {/* Timeline Section - Premium Gradient */}
              <LinearGradient
                colors={['#FFFFFF', '#FFF5F0']}
                style={styles.timelineSection}
              >
                <View style={styles.timelineContainer}>
                  {/* Pickup Point */}
                  <View style={styles.timelineRow}>
                    <View style={styles.timelineLeft}>
                      <LinearGradient
                        colors={['#4CAF50', '#66BB6A']}
                        style={styles.timelineDot}
                      >
                        <MaterialIcons name="my-location" size={10} color="#FFFFFF" />
                      </LinearGradient>
                      <LinearGradient
                        colors={['#4CAF50', '#66BB6A']}
                        style={styles.timelineLine}
                      />
                    </View>
                    <View style={styles.timelineContent}>
                      <View style={styles.timelineHeader}>
                        <View style={styles.timeIconBadge}>
                          <MaterialIcons name="access-time" size={12} color="#4CAF50" />
                        </View>
                        <Text style={[styles.timelineTime, { color: '#4CAF50' }]}>08:00 • ĐÓN KHÁCH</Text>
                      </View>
                      <Text style={[styles.timelineAddress, { color: colors.text }]} numberOfLines={2}>
                        {pickupAddress}
                      </Text>
                    </View>
                  </View>

                  {/* Dropoff Point */}
                  <View style={styles.timelineRow}>
                    <View style={styles.timelineLeft}>
                      <LinearGradient
                        colors={['#FF6B00', '#FF8534']}
                        style={styles.timelineDotLarge}
                      >
                        <MaterialIcons name="location-on" size={16} color="#FFFFFF" />
                      </LinearGradient>
                    </View>
                    <View style={styles.timelineContent}>
                      <View style={styles.timelineHeader}>
                        <View style={styles.timeIconBadge}>
                          <MaterialIcons name="access-time" size={12} color="#FF6B00" />
                        </View>
                        <Text style={[styles.timelineTime, { color: '#FF6B00' }]}>10:30 • TRẢ KHÁCH</Text>
                      </View>
                      <Text style={[styles.timelineAddress, { color: colors.text }]} numberOfLines={2}>
                        {dropoffAddress}
                      </Text>
                    </View>
                  </View>
                </View>
              </LinearGradient>

            {/* Seat Selection - Car Layout Premium */}
              <LinearGradient
                colors={['#FFFFFF', '#FFF5F0']}
                style={styles.seatSection}
              >
                <View style={styles.seatHeaderSimple}>
                  <View style={styles.seatTitleRow}>
                    <View style={styles.seatIconBadge}>
                      <MaterialIcons name="event-seat" size={18} color="#FF6B00" />
                    </View>
                    <Text style={[styles.seatTitleSimple, { color: colors.text }]}>CHỌN GHẾ NGỒI</Text>
                  </View>
                  <LinearGradient
                    colors={['#4CAF50', '#66BB6A']}
                    style={styles.seatsAvailableBadge}
                  >
                    <Text style={styles.seatsAvailableText}>{availableSeats} GHẾ TRỐNG</Text>
                  </LinearGradient>
                </View>

                {/* Car Layout Visualization */}
                <LinearGradient
                  colors={['rgba(255, 245, 240, 0.5)', 'rgba(255, 255, 255, 0.8)']}
                  style={styles.carLayout}
                >
                  {/* Steering Wheel */}
                  <View style={styles.steeringWheel}>
                    <LinearGradient
                      colors={['#FF6B00', '#FF8534']}
                      style={styles.steeringIconBadge}
                    >
                      <MaterialIcons name="directions-car" size={24} color="#FFFFFF" />
                    </LinearGradient>
                  </View>

                  {/* Seats Grid - Dynamic rendering */}
                  <View style={styles.seatsContainer}>
                    {Array.from({ length: totalSeats }).map((_, index) => {
                      // Layout: ghế 0 ở hàng đầu bên phải (passenger seat)
                      // Ghế 1-6 ở hàng sau, 3 ghế mỗi hàng
                      const isFirstSeat = index === 0
                      const isBackRow = index > 0
                      const backRowIndex = index - 1
                      const showRow = isFirstSeat || (isBackRow && backRowIndex % 3 === 0)

                      return (
                        <View key={index}>
                          {showRow && (
                            <View style={styles.seatsRow}>
                              {isFirstSeat ? (
                                <>
                                  <View style={{ width: 48 }} />
                                  <TouchableOpacity
                                    disabled={seatsState[index] === 'occupied'}
                                    onPress={() => {
                                      if (selectedSeats.includes(index)) {
                                        setSelectedSeats(selectedSeats.filter(s => s !== index))
                                      } else {
                                        setSelectedSeats([...selectedSeats, index])
                                      }
                                    }}
                                    style={styles.seatButtonContainer}
                                  >
                                    {selectedSeats.includes(index) ? (
                                      <LinearGradient
                                        colors={['#FF6B00', '#FF8534']}
                                        style={styles.seatButtonCar}
                                      >
                                        <MaterialIcons name="check" size={24} color="#FFFFFF" />
                                      </LinearGradient>
                                    ) : (
                                      <View
                                        style={[
                                          styles.seatButtonCar,
                                          {
                                            backgroundColor:
                                              seatsState[index] === 'occupied'
                                                ? colors.border
                                                : 'transparent',
                                            borderColor:
                                              seatsState[index] === 'occupied'
                                                ? colors.border
                                                : 'rgba(255, 107, 0, 0.3)',
                                          },
                                        ]}
                                      >
                                        <MaterialIcons
                                          name={seatsState[index] === 'occupied' ? 'person' : 'chair'}
                                          size={24}
                                          color={seatsState[index] === 'occupied' ? colors.textSecondary : '#FF6B00'}
                                        />
                                      </View>
                                    )}
                                  </TouchableOpacity>
                                </>
                              ) : (
                                // Hàng sau: hiển thị tối đa 3 ghế mỗi hàng
                                Array.from({ length: Math.min(3, totalSeats - index) }).map((_, colIndex) => {
                                  const seatIndex = index + colIndex
                                  return (
                                    <TouchableOpacity
                                      key={seatIndex}
                                      disabled={seatsState[seatIndex] === 'occupied'}
                                      onPress={() => {
                                        if (selectedSeats.includes(seatIndex)) {
                                          setSelectedSeats(selectedSeats.filter(s => s !== seatIndex))
                                        } else {
                                          setSelectedSeats([...selectedSeats, seatIndex])
                                        }
                                      }}
                                      style={styles.seatButtonContainer}
                                    >
                                      {selectedSeats.includes(seatIndex) ? (
                                        <LinearGradient
                                          colors={['#FF6B00', '#FF8534']}
                                          style={styles.seatButtonCar}
                                        >
                                          <MaterialIcons name="check" size={24} color="#FFFFFF" />
                                        </LinearGradient>
                                      ) : (
                                        <View
                                          style={[
                                            styles.seatButtonCar,
                                            {
                                              backgroundColor:
                                                seatsState[seatIndex] === 'occupied'
                                                  ? colors.border
                                                  : 'transparent',
                                              borderColor:
                                                seatsState[seatIndex] === 'occupied'
                                                  ? colors.border
                                                  : 'rgba(255, 107, 0, 0.3)',
                                            },
                                          ]}
                                        >
                                          <MaterialIcons
                                            name={seatsState[seatIndex] === 'occupied' ? 'person' : 'chair'}
                                            size={24}
                                            color={seatsState[seatIndex] === 'occupied' ? colors.textSecondary : '#FF6B00'}
                                          />
                                        </View>
                                      )}
                                    </TouchableOpacity>
                                  )
                                })
                              )}
                            </View>
                          )}
                        </View>
                      )
                    })}
                  </View>
                </LinearGradient>

                {/* Legend */}
                <View style={styles.seatLegend}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { borderColor: 'rgba(255, 107, 0, 0.5)', borderWidth: 2 }]} />
                    <Text style={[styles.legendText, { color: colors.textSecondary }]}>Trống</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <LinearGradient
                      colors={['#FF6B00', '#FF8534']}
                      style={[styles.legendDot, { borderWidth: 0 }]}
                    />
                    <Text style={[styles.legendText, { color: colors.text }]}>Đang chọn</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: colors.border, borderWidth: 0 }]} />
                    <Text style={[styles.legendText, { color: colors.textSecondary }]}>Đã đặt</Text>
                  </View>
                </View>
              </LinearGradient>

              {/* Insurance / Policy Card - Premium Gradient */}
              <LinearGradient
                colors={['rgba(76, 175, 80, 0.1)', 'rgba(102, 187, 106, 0.15)']}
                style={styles.policyCard}
              >
                <LinearGradient
                  colors={['#4CAF50', '#66BB6A']}
                  style={styles.policyIconBadge}
                >
                  <MaterialIcons name="shield" size={28} color="#FFFFFF" />
                </LinearGradient>
                <View style={styles.policyContent}>
                  <Text style={[styles.policyTitle, { color: colors.text }]}>BẢO HIỂM CHUYẾN ĐI</Text>
                  <Text style={[styles.policyText, { color: colors.textSecondary }]}>
                    Chuyến đi của bạn được bảo hiểm trọn gói bởi FireGo Care. An tâm trên mọi nẻo đường.
                  </Text>
                </View>
              </LinearGradient>

              {/* Spacer for footer */}
              <View style={{ height: SPACING.xl }} />
            </View>
          </ScrollView>

          {/* Sticky Footer */}
          <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.warning }]}>
            <View style={styles.priceSection}>
              <Text style={[styles.priceLabel, { color: colors.textSecondary }]}>Tổng cộng ({selectedSeats.length} ghế)</Text>
              <View style={styles.priceValue}>
                {calculatingFare ? (
                  <ActivityIndicator size="small" color="#53d22d" />
                ) : (
                  <Text style={[styles.price, { color: colors.text }]}>
                    ₫{(customerFare || ride.totalFare).toLocaleString()}
                  </Text>
                )}
              </View>
            </View>
            <TouchableOpacity
              style={styles.bookButtonContainer}
              onPress={handleRequestRide}
              disabled={requesting || checkingPendingRequests || availableSeats < 0 || calculatingFare || selectedSeats.length === 0}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#FF6B00', '#FF8534']}
                style={styles.bookButton}
              >
                {requesting || checkingPendingRequests ? (
                  <>
                    <ActivityIndicator color="#FFFFFF" size={24} />
                    <Text style={[styles.bookButtonText, { marginLeft: 8 }]}>
                      {checkingPendingRequests ? 'ĐANG KIỂM TRA...' : 'ĐANG GỬI...'}
                    </Text>
                  </>
                ) : (
                  <>
                    <View style={styles.bookBtnIconCircle}>
                      <MaterialIcons name="flash-on" size={22} color="#FFD700" />
                    </View>
                    <Text style={styles.bookButtonText}>ĐẶT CHỖ NGAY</Text>
                    <MaterialIcons name="arrow-forward" size={22} color="#FFFFFF" />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Requesting Modal */}
      <Modal visible={requesting && requestStatus === 'pending'} transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <ActivityIndicator color="#53d22d" size={40} />
            <Text style={[styles.modalTitle, { color: colors.text }]}>Đang gửi yêu cầu</Text>
            <Text style={[styles.modalMessage, { color: colors.textSecondary }]}>
              Vui lòng chờ tài xế phản hồi yêu cầu của bạn...
            </Text>
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal visible={requesting && requestStatus === 'accepted'} transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.bgSecondary }]}>
            <MaterialIcons name="check-circle" size={40} color="#53d22d" />
            <Text style={[styles.modalTitle, { color: colors.text }]}>Yêu cầu được chấp nhận!</Text>
            <Text style={[styles.modalMessage, { color: colors.textSecondary }]}>
              Tài xế {ride?.driverId?.firstName} đã chấp nhận yêu cầu của bạn
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
  },
  errorText: {
    fontSize: 14,
    marginTop: SPACING.md,
  },
  scrollContent: {
    flex: 1,
  },
  mapHero: {
    height: height * 0.5,
    position: 'relative',
  },
  mapGradientBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  topAppBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 60,
    zIndex: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  contentWrapper: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    marginTop: -16,
  },
  driverSection: {
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
  },
  driverAvatarContainer: {
    position: 'relative',
  },
  driverAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  driverDetails: {
    flex: 1,
  },
  driverHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: SPACING.sm,
  },
  driverName: {
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  proBadge: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FFA500',
  },
  proBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FF6B00',
    letterSpacing: 0.5,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  starIconBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ratingValue: {
    fontSize: 14,
    fontWeight: '800',
  },
  ratingCount: {
    fontSize: 12,
    fontWeight: '600',
  },
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  vehicleIconBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(255, 107, 0, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  vehicleText: {
    fontSize: 13,
    fontWeight: '600',
  },
  timelineSection: {
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  timelineContainer: {
    gap: 0,
  },
  timelineRow: {
    flexDirection: 'row',
    marginBottom: SPACING.lg,
  },
  timelineLeft: {
    width: 40,
    alignItems: 'center',
    paddingRight: SPACING.md,
  },
  timelineDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginTop: 4,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  timelineDotLarge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },
  timelineLine: {
    width: 3,
    minHeight: 40,
    marginVertical: 4,
    borderRadius: 2,
  },
  timelineContent: {
    flex: 1,
    paddingTop: 2,
  },
  timelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  timeIconBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  timelineTime: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  timelineAddress: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  locationSection: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.md,
    overflow: 'hidden',
  },
  locationItem: {
    flexDirection: 'row',
    padding: SPACING.lg,
    alignItems: 'flex-start',
    gap: SPACING.md,
  },
  locationIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.8,
  },
  locationContent: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  locationAddress: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  locationDivider: {
    height: 1,
    marginHorizontal: SPACING.lg,
  },
  seatSection: {
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  seatHeaderSimple: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  seatTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  seatIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 107, 0, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  seatTitleSimple: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  seatsAvailableBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  seatsAvailableText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  carLayout: {
    borderRadius: 24,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xl,
    marginBottom: SPACING.lg,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 107, 0, 0.2)',
  },
  steeringWheel: {
    marginBottom: SPACING.lg,
  },
  steeringIconBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  seatsContainer: {
    width: '100%',
  },
  seatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    gap: SPACING.md,
  },
  seatButtonContainer: {
    width: 56,
    height: 56,
  },
  seatButtonCar: {
    width: 56,
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  seatLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.xl,
    paddingTop: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 107, 0, 0.15)',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    fontWeight: '700',
  },
  policyCard: {
    flexDirection: 'row',
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
    gap: SPACING.md,
    alignItems: 'flex-start',
    borderWidth: 2,
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  policyIconBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  policyContent: {
    flex: 1,
  },
  policyTitle: {
    fontSize: 14,
    fontWeight: '900',
    marginBottom: SPACING.xs,
    letterSpacing: 0.5,
  },
  policyText: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '600',
  },
  seatGridSimple: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  seatButtonSimple: {
    width: '23%',
    aspectRatio: 1,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  footer: {
    borderTopWidth: 1,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    paddingBottom: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.lg,
  },
  priceSection: {
    flex: 0.5,
  },
  priceLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  priceValue: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  price: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  bookButtonContainer: {
    flex: 1,
  },
  bookButton: {
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: SPACING.sm,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  bookBtnIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookButtonText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
    width: '80%',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  modalMessage: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: SPACING.md,
  },
})

