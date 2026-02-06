import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { useSelector, useDispatch } from 'react-redux'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { COLORS, SPACING, BORDER_RADIUS } from '../constants'
import { RideCard, BalanceCard } from '../components'
import AssignmentRequestModal from '../components/AssignmentRequestModal'
import { driverService } from '../services/driverService'
import { locationTrackingService } from '../services/locationTrackingService'
import { assignmentRequestPollingService } from '../services/assignmentRequestPollingService'
import type { RootState } from '../redux/store'
import type { RideItem } from '../types'
import { updateUser } from '../redux/slices/authSlice'

export default function HomeScreen() {
  const [isOnline, setIsOnline] = useState(false) // Default offline until loaded from API
  const [autoAssignEnabled, setAutoAssignEnabled] = useState(true)
  const [activeFilter, setActiveFilter] = useState<'all' | 'pool' | 'assist'>('all')
  const [rides, setRides] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  
  // Assignment request modal state
  const [showAssignmentModal, setShowAssignmentModal] = useState(false)
  const [currentRequest, setCurrentRequest] = useState<any>(null)
  const [requestCountdown, setRequestCountdown] = useState(15)
  
  const { user } = useSelector((state: RootState) => state.auth)
  const dispatch = useDispatch()
  const navigation = useNavigation<NativeStackNavigationProp<any>>()

  // Fetch driver profile on mount to get current online status
  useEffect(() => {
    const fetchDriverProfile = async () => {
      try {
        console.log('[HomeScreen] 📥 Fetching driver profile...')
        const profile = await driverService.getProfile()
        console.log('[HomeScreen] ✅ Profile loaded:', { 
          isOnline: profile.isOnline, 
          status: profile.status,
          driverTypes: profile.driverTypes,
        })
        
        // 🔥 UPDATE Redux user with fresh profile data including driverTypes
        dispatch(updateUser({
          driverTypes: profile.driverTypes,
          isOnline: profile.isOnline,
          isAvailable: profile.isAvailable,
          status: profile.status,
        }))
        
        // Set online status from profile
        setIsOnline(profile.isOnline || false)
      } catch (error) {
        console.error('[HomeScreen] ❌ Error fetching profile:', error)
        // Default to offline if failed to fetch
        setIsOnline(false)
      }
    }
    
    fetchDriverProfile()
  }, [])

  // Handle online/offline toggle with API call
  const handleToggleOnline = async (value: boolean) => {
    try {
      console.log('[HomeScreen] Toggling online status:', value)
      setIsOnline(value)
      
      // Call API to update online status in database
      await driverService.setOnlineStatus(value)
      
      // Also update available status
      await driverService.setAvailableStatus(value)
      
      console.log('[HomeScreen] ✅ Online status updated in database')
    } catch (error) {
      console.error('[HomeScreen] Error updating online status:', error)
      // Revert the local state if API call fails
      setIsOnline(!value)
    }
  }

  // Start/stop location tracking based on online status
  useEffect(() => {
    if (isOnline && user?.id) {
      console.log('[HomeScreen] 🟢 Driver is online, starting location tracking')
      locationTrackingService.startTracking(user.id)
      
      console.log('[HomeScreen] 🔄 Starting assignment polling')
      console.log('[HomeScreen] 👤 User driverTypes:', user?.driverTypes)
      
      assignmentRequestPollingService.startPolling((request) => {
        console.log('[HomeScreen] 📨 New assignment request:', {
          requestId: request?._id,
          type: request?.type,
          status: request?.status,
          rideType: request?.rideId?.rideType,
          isShared: request?.rideId?.isShared,
        })
        
        // Chỉ hiển thị modal nếu request có status là "pending"
        if (request && request.status === 'pending') {
          console.log('[HomeScreen] ✅ Request is pending, showing modal')
          setCurrentRequest(request)
          setShowAssignmentModal(true)
          setRequestCountdown(15)
        } else {
          // Clear state nếu request timeout hoặc không hợp lệ
          console.log('[HomeScreen] ⚠️ Request not pending (status:', request?.status, '), clearing modal state')
          setShowAssignmentModal(false)
          setCurrentRequest(null)
        }
      }, user.id) // Truyền driverId vào polling
    } else if (!isOnline) {
      console.log('[HomeScreen] 🔴 Driver is offline, stopping location tracking and polling')
      locationTrackingService.stopTracking()
      assignmentRequestPollingService.stopPolling()
    }

    return () => {
      console.log('[HomeScreen] Component unmounting, but keeping location tracking active')
    }
  }, [isOnline, user?.id])

  // Countdown timer cho assignment request modal
  useEffect(() => {
    let timer: NodeJS.Timeout
    
    if (showAssignmentModal && currentRequest && requestCountdown > 0) {
      timer = setTimeout(() => {
        setRequestCountdown(requestCountdown - 1)
      }, 1000)
    } else if (showAssignmentModal && currentRequest && requestCountdown === 0) {
      // Tự động từ chối khi hết thời gian (chỉ khi modal đang hiển thị và có request)
      console.log('[HomeScreen] ⏰ Auto-rejecting due to timeout')
      handleRejectRequest()
    }
    
    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [showAssignmentModal, currentRequest, requestCountdown])

  // Lấy danh sách cuốc từ API
  useEffect(() => {
    fetchAvailableRides()
  }, [])

  const fetchAvailableRides = async () => {
    setLoading(true)
    try {
      // Fetch both Rides and CombinedTrips in parallel
      const [allRides, allCombinedTrips] = await Promise.all([
        driverService.getAvailableRides(),
        driverService.getMyCombinedTrips(),
      ])

      console.log('📱 Rides từ API:', JSON.stringify(allRides, null, 2))
      console.log('📱 Combined trips từ API:', JSON.stringify(allCombinedTrips, null, 2))
      console.log('👤 User ID hiện tại:', user?.id)

      // Filter rides: show both my rides AND available rides (no driver assigned)
      const relevantRides = allRides.filter((ride: any) => {
        const rideDriverId = typeof ride.driverId === 'string' ? ride.driverId : ride.driverId?._id
        const isMyRide = String(rideDriverId) === String(user?.id)
        const isAvailable = !rideDriverId && ride.status === 'pending'
        const shouldShow = isMyRide || isAvailable
        console.log(`🚗 Ride ${ride._id}:`, {
          driverId: rideDriverId,
          userId: user?.id,
          status: ride.status,
          isMyRide,
          isAvailable,
          shouldShow,
        })
        return shouldShow
      })

      // Filter combined trips: show both my trips AND available trips (no driver assigned)
      const relevantCombinedTrips = allCombinedTrips.filter((trip: any) => {
        const tripDriverId = typeof trip.driverId === 'string' ? trip.driverId : trip.driverId?._id
        const isMyTrip = String(tripDriverId) === String(user?.id)
        const isAvailable = !tripDriverId && trip.status === 'pending'
        const shouldShow = isMyTrip || isAvailable
        console.log(`🛴 Combined trip ${trip._id}:`, {
          driverId: tripDriverId,
          userId: user?.id,
          status: trip.status,
          isMyTrip,
          isAvailable,
          shouldShow,
        })
        return shouldShow
      })

      // Merge both arrays
      const allMyRides = [
        ...relevantRides.map((ride: any) => ({ ...ride, sourceType: 'ride' })),
        ...relevantCombinedTrips.map((trip: any) => ({ ...trip, sourceType: 'combined_trip' })),
      ]

      console.log('✅ Relevant rides:', relevantRides.length)
      console.log('✅ Relevant combined trips:', relevantCombinedTrips.length)
      console.log('✅ Total merged rides:', allMyRides.length)

      setRides(allMyRides)
    } catch (error) {
      console.error('❌ Lỗi khi lấy danh sách cuốc:', error)
      Alert.alert('Lỗi', 'Không thể lấy danh sách cuốc. Vui lòng thử lại.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchAvailableRides()
  }

  // Handle accept assignment request
  const handleAcceptRequest = async () => {
    console.log('[HomeScreen] 🎯 handleAcceptRequest CALLED')
    console.log('[HomeScreen] 🔍 currentRequest:', currentRequest)
    
    try {
      if (!currentRequest) {
        console.log('[HomeScreen] ⚠️ currentRequest is null/undefined, aborting')
        return
      }
      
      console.log('[HomeScreen] 🟢 Accepting request:', currentRequest._id)
      console.log('[HomeScreen] 📋 Full request data:', JSON.stringify(currentRequest, null, 2))
      
      const isDelivery = currentRequest.type === 'delivery'
      const isRideshare = currentRequest.type === 'rideshare' // Combined trip
      const requestId = currentRequest._id
      
      if (isDelivery) {
        // Accept delivery request
        const response = await driverService.acceptDeliveryAssignment(requestId)
        console.log('[HomeScreen] ✅ Delivery assignment accepted:', response)
        
        // Lấy deliveryId từ response hoặc từ currentRequest
        const deliveryId = response?.deliveryId || currentRequest.deliveryId?._id || currentRequest.deliveryId
        
        // Navigate vào ActiveDelivery cho vận chuyển (note: screen name is "ActiveDelivery" not "ActiveDeliveryScreen")
        navigation.navigate('ActiveDelivery', { 
          deliveryId,
          sourceType: 'delivery'
        })
      } else if (isRideshare) {
        // Accept combined trip request (ghép xe)
        const combinedTripId = currentRequest.combinedTripId?._id || currentRequest.combinedTripId
        console.log('[HomeScreen] 🔄 Accepting combined trip request:', { requestId, combinedTripId })
        
        const response = await driverService.acceptCombinedTripRequest(combinedTripId, requestId)
        console.log('[HomeScreen] ✅ Combined trip request accepted:', response)
        
        // Navigate vào ActiveRideScreen cho ghép xe
        navigation.navigate('ActiveRideScreen', { 
          combinedTripId,
          sourceType: 'combined_trip' 
        })
      } else {
        // Accept ride request (lái xe hộ - hire)
        console.log('[HomeScreen] 🔵 About to accept ride assignment, requestId:', requestId)
        
        try {
          const response = await driverService.acceptRideAssignment(requestId)
          console.log('[HomeScreen] ✅ Ride assignment accepted - FULL RESPONSE:', JSON.stringify(response, null, 2))
          
          // Response là ride object với _id
          const rideId = response?._id || response?.id || currentRequest.rideId?._id || currentRequest.rideId
          
          console.log('[HomeScreen] 🚗 Extracted rideId:', rideId)
          console.log('[HomeScreen] 🔍 Response keys:', Object.keys(response || {}))
          
          if (!rideId) {
            console.error('[HomeScreen] ❌ Cannot find rideId from response or currentRequest')
            console.error('[HomeScreen] 📋 currentRequest:', JSON.stringify(currentRequest, null, 2))
            throw new Error('Không tìm thấy ID chuyến đi')
          }
          
          console.log('[HomeScreen] 🚗 Navigating to TripActivities with rideId:', rideId)
          
          // Navigate vào TripActivities cho lái xe hộ (hire)
          navigation.navigate('TripActivities', { 
            rideId
          })
        } catch (acceptError: any) {
          console.error('[HomeScreen] ❌ Error in acceptRideAssignment:', acceptError)
          console.error('[HomeScreen] 📋 Error details:', {
            message: acceptError?.message,
            response: acceptError?.response?.data,
            status: acceptError?.response?.status,
          })
          throw acceptError
        }
      }
      
      // Close modal
      setShowAssignmentModal(false)
      setCurrentRequest(null)
      
      // Refresh rides list
      fetchAvailableRides()
    } catch (error) {
      console.error('[HomeScreen] ❌ Error accepting request:', error)
      Alert.alert('Lỗi', 'Không thể nhận cuốc. Vui lòng thử lại.')
      setShowAssignmentModal(false)
    }
  }

  // Handle reject assignment request
  const handleRejectRequest = async () => {
    try {
      if (!currentRequest || !currentRequest._id) {
        console.log('[HomeScreen] ⚠️ No request to reject, closing modal')
        setShowAssignmentModal(false)
        setCurrentRequest(null)
        return
      }
      
      // Kiểm tra request status trước khi reject
      if (currentRequest.status !== 'pending') {
        console.log('[HomeScreen] ⚠️ Request not pending (status:', currentRequest.status, '), cannot reject')
        setShowAssignmentModal(false)
        setCurrentRequest(null)
        return
      }
      
      console.log('[HomeScreen] 🔴 Rejecting request:', currentRequest._id)
      
      const isDelivery = currentRequest.type === 'delivery'
      const isRideshare = currentRequest.type === 'rideshare'
      const requestId = currentRequest._id
      
      if (isDelivery) {
        await driverService.rejectDeliveryAssignment(requestId)
      } else if (isRideshare) {
        // Reject combined trip request
        const combinedTripId = currentRequest.combinedTripId?._id || currentRequest.combinedTripId
        await driverService.rejectCombinedTripRequest(combinedTripId, requestId)
      } else {
        await driverService.rejectRideAssignment(requestId)
      }
      
      console.log('[HomeScreen] ✅ Request rejected')
      
      // Close modal
      setShowAssignmentModal(false)
      setCurrentRequest(null)
    } catch (error: any) {
      console.error('[HomeScreen] ❌ Error rejecting request:', error?.message || error)
      // Vẫn đóng modal dù có lỗi
      setShowAssignmentModal(false)
      setCurrentRequest(null)
    }
  }

  const formatRideData = (ride: any): RideItem => {
    // Determine if it's a combined trip or regular ride
    const isCombinedTrip = ride.sourceType === 'combined_trip'
    const isShareRide = isCombinedTrip || ride.rideType === 'share'

    const pickupAddr = ride.pickupAddress || 'Điểm đón'
    
    console.log('📍 [formatRideData] Ride data:', {
      _id: ride._id,
      sourceType: ride.sourceType,
      pickupAddress: ride.pickupAddress,
      dropoffAddress: ride.dropoffAddress,
      totalFare: ride.totalFare,
      duration: ride.duration,
    })

    let dropoffAddr = ride.dropoffAddress || ride.dropoffLocationAddress || 'Địa điểm đến'
    if (typeof dropoffAddr === 'object' && dropoffAddr?.type === 'Point') {
      dropoffAddr = ride.dropoffLocationAddress || 'Địa điểm đến'
    }

    const shortPickupAddr = pickupAddr.length > 30 ? pickupAddr.substring(0, 30) + '...' : pickupAddr
    const shortDropoffAddr = dropoffAddr.length > 30 ? dropoffAddr.substring(0, 30) + '...' : dropoffAddr

    return {
      id: ride._id,
      type: isShareRide ? 'POOL' : 'ASSIST',
      price: ride.totalFare || 0,
      pickupLocation: shortPickupAddr,
      dropoffLocation: shortDropoffAddr,
      pickupTime: ride.startDateTime || ride.scheduledTime
        ? new Date(ride.startDateTime || ride.scheduledTime).toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
        })
        : 'Ngay lập tức',
      time: ride.duration ? `~${Math.ceil(ride.duration / 60)} phút` : '~15 phút',
      rating: 4.8,
      badge: isShareRide ? 'GHÉP XE' : 'LAI XE HỘ',
      badgeColor: isShareRide ? '#ff9900' : '#6200ea',
      sourceType: ride.sourceType,
      _id: ride._id,
    }
  }

  const handleAcceptRide = async (ride: any) => {
    try {
      if (!user?.id) {
        Alert.alert('Lỗi', 'Không tìm thấy thông tin tài xế')
        return
      }

      const rideId = ride._id || ride.id
      const sourceType = ride.sourceType // 'ride' or 'combined_trip'
      
      console.log('🚗 Viewing ride:', { 
        rideId, 
        sourceType, 
        rideType: ride.rideType,
        badge: ride.badge 
      })

      const isCombinedTrip = sourceType === 'combined_trip'
      const isHire = ride.rideType === 'hire' || ride.badge === 'LAI XE HỘ'
      
      // 1. Lái xe hộ (hire) - không phải combined trip
      if (isHire && !isCombinedTrip) {
        console.log('📍 Navigating to ActiveRideScreen for HIRE ride')
        navigation.navigate('ActiveRideScreen', { rideId, sourceType: 'ride' })
        return
      }

      // 2. Ghép xe (combined trips) - accept nếu chưa phải của mình
      if (isCombinedTrip) {
        const rideDriverId = typeof ride.driverId === 'string' ? ride.driverId : ride.driverId?._id
        const isMyTrip = rideDriverId === user.id

        if (!isMyTrip) {
          await driverService.acceptCombinedTrip(rideId, user.id)
          console.log('✅ Combined trip accepted')
        } else {
          console.log('✅ This is your own combined trip, skipping accept')
        }
        
        console.log('📍 Navigating to ActiveRideScreen for COMBINED TRIP')
        navigation.navigate('ActiveRideScreen', { 
          combinedTripId: rideId, 
          sourceType: 'combined_trip' 
        })
        return
      }

      // 3. Ride thông thường khác (fallback)
      await driverService.acceptRide(rideId, user.id)
      Alert.alert('Thành công', `Bạn đã nhận cuốc`)
      
      console.log('📍 Navigating to ActiveRideScreen for regular ride')
      navigation.navigate('ActiveRideScreen', { rideId, sourceType: 'ride' })
      
    } catch (error: any) {
      console.error('Lỗi khi nhận cuốc:', error)
      let msg = 'Không thể nhận cuốc. Vui lòng thử lại.'
      if (error && error.message) {
        msg = Array.isArray(error.message) ? error.message.join(', ') : String(error.message)
      }
      Alert.alert('Lỗi', msg)
    }
  }

  const filteredRides = rides
    .map(formatRideData)
    .filter((ride) => {
      if (activeFilter === 'all') return true
      if (activeFilter === 'pool') return ride.type === 'POOL'
      if (activeFilter === 'assist') return ride.type === 'ASSIST'
      return false
    })

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Xin chào,</Text>
            <Text style={styles.driverName}>
              {user?.firstName && user?.lastName
                ? `${user.firstName} ${user.lastName}`
                : user?.name || 'Tài xế'}
            </Text>
          </View>
          <View style={styles.statusBadge}>
            <View style={[styles.statusDot, isOnline && styles.statusOnline]} />
            <Text style={styles.statusText}>{isOnline ? 'Trực tuyến' : 'Ngoại tuyến'}</Text>
          </View>
        </View>

        {/* Balance Card */}
        <BalanceCard
          amount={1250000}
          dailyAmount={1200000}
          increase={2}
          isOnline={isOnline}
          onToggleOnline={handleToggleOnline}
        />
        {/* Filter Buttons */}
        <FilterButtons activeFilter={activeFilter} onFilterChange={setActiveFilter} />

        {/* Delivery Button */}
        <TouchableOpacity
          style={styles.deliveryButton}
          onPress={() => navigation.navigate('DeliveryRequests')}
        >
          <View style={styles.deliveryButtonContent}>
            <View style={styles.deliveryIconBox}>
              <MaterialIcons name="local-shipping" size={28} color="#FF6B00" />
            </View>
            <View style={styles.deliveryInfo}>
              <Text style={styles.deliveryTitle}>Giao hàng</Text>
              <Text style={styles.deliverySubtitle}>Xem đơn giao hàng gần bạn</Text>
            </View>
            <MaterialIcons name="arrow-forward-ios" size={20} color="#666" />
          </View>
        </TouchableOpacity>

        {/* Rides List */}
        <View style={styles.ridesSection}>
          <View style={styles.sectionTitleContainer}>
            <Text style={styles.sectionTitle}>Chuyến đi có sẵn</Text>
            <View style={styles.buttonGroup}>
              <TouchableOpacity
                style={styles.refreshButton}
                onPress={handleRefresh}
                disabled={refreshing}
              >
                <MaterialIcons
                  name="refresh"
                  size={20}
                  color={refreshing ? COLORS.textSecondary : COLORS.primary}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.createRideButton}
                onPress={() => navigation.navigate('CreateRide')}
              >
                <MaterialIcons name="add" size={22} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          {loading && !refreshing ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>Đang tải danh sách cuốc...</Text>
            </View>
          ) : filteredRides.length > 0 ? (
            filteredRides.map((ride) => {
              const originalRide = rides.find(r => r._id === ride.id)
              const completeRide = originalRide ? { ...ride, ...originalRide } : ride
              return (
                <RideCard key={ride.id} ride={completeRide} onAccept={handleAcceptRide} />
              )
            })
          ) : (
            <View style={styles.emptyState}>
              <MaterialIcons name="inbox" size={48} color={COLORS.textSecondary} />
              <Text style={styles.emptyText}>Không có chuyến đi nào</Text>
              <Text style={styles.emptySubText}>
                Hãy quay lại sau để kiểm tra những cuốc mới
              </Text>
            </View>

          )}
        </View>
      </ScrollView>

      {/* Floating Map Button */}
      <TouchableOpacity
        style={styles.mapButton}
        onPress={() => navigation.navigate('MapScreen')}
        activeOpacity={0.8}
      >
        <MaterialIcons name="location-on" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Assignment Request Modal */}
      <AssignmentRequestModal
        visible={showAssignmentModal}
        request={currentRequest}
        onAccept={handleAcceptRequest}
        onReject={handleRejectRequest}
        countdown={requestCountdown}
        driverTypes={user?.driverTypes || ['rideshare']}
      />
    </SafeAreaView>
  )
}

interface FilterButtonsProps {
  activeFilter: 'all' | 'pool' | 'assist'
  onFilterChange: (filter: 'all' | 'pool' | 'assist') => void
}

const FilterButtons: React.FC<FilterButtonsProps> = ({ activeFilter, onFilterChange }) => {
  return (
    <View style={styles.filterContainer}>
      <FilterButton
        label="Tất cả"
        icon="apps"
        active={activeFilter === 'all'}
        onPress={() => onFilterChange('all')}
      />
      <FilterButton
        label="Ghép xe"
        icon="group"
        active={activeFilter === 'pool'}
        onPress={() => onFilterChange('pool')}
      />
      <FilterButton
        label="Lái xe hộ"
        icon="support-agent"
        active={activeFilter === 'assist'}
        onPress={() => onFilterChange('assist')}
      />
    </View>
  )
}

interface FilterButtonProps {
  label: string
  icon: string
  active: boolean
  onPress: () => void
}

const FilterButton: React.FC<FilterButtonProps> = ({ label, icon, active, onPress }) => {
  return (
    <TouchableOpacity
      style={[styles.filterButton, active && styles.filterButtonActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <MaterialIcons
        name={icon as any}
        size={20}
        color={active ? COLORS.primary : COLORS.textSecondary}
      />
      <Text style={[styles.filterText, active && styles.filterTextActive]}>{label}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.darkBg,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.darkBg,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  greeting: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  driverName: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.darkCard,
    paddingVertical: 6,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.full,
    gap: SPACING.sm,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.danger,
  },
  statusOnline: {
    backgroundColor: COLORS.success,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.darkCard,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.darkBorder,
  },
  filterButtonActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '10',
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  filterTextActive: {
    color: COLORS.primary,
  },
  ridesSection: {
    marginBottom: SPACING.lg,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  refreshButton: {
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: SPACING.sm,
    alignItems: 'center',
  },
  createRideButton: {
    width: 36,
    height: 36,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxl,
    gap: SPACING.md,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxl,
    gap: SPACING.md,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  emptySubText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  mapButton: {
    position: 'absolute',
    bottom: 32,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  // ============ Auto-Assign Card Styles ============
  autoAssignCard: {
    backgroundColor: COLORS.darkCard,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.darkBorder,
  },
  autoAssignHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  autoAssignTitleSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  autoAssignIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 107, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  autoAssignIconActive: {
    backgroundColor: 'rgba(255, 107, 0, 0.15)',
  },
  autoAssignTitle: {
    flex: 1,
  },
  autoAssignTitleText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  autoAssignSubtext: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  autoAssignStats: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.darkBorder,
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 107, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statContent: {
    flex: 1,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: COLORS.darkBorder,
    marginHorizontal: SPACING.sm,
  },
  deliveryButton: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    backgroundColor: '#fff',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  deliveryButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  deliveryIconBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFE8DC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deliveryInfo: {
    flex: 1,
  },
  deliveryTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111',
    marginBottom: 4,
  },
  deliverySubtitle: {
    fontSize: 14,
    color: '#666',
  },
})
