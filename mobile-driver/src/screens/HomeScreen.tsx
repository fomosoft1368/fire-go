import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native'
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
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
  const [isOnline, setIsOnline] = useState(false)
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

        dispatch(updateUser({
          driverTypes: profile.driverTypes,
          isOnline: profile.isOnline,
          isAvailable: profile.isAvailable,
          status: profile.status,
        }))

        setIsOnline(profile.isOnline || false)
      } catch (error) {
        console.error('[HomeScreen] ❌ Error fetching profile:', error)
        setIsOnline(false)
      }
    }

    fetchDriverProfile()
  }, [dispatch])

  // Handle online/offline toggle with API call
  const handleToggleOnline = useCallback(async (value: boolean) => {
    try {
      console.log('[HomeScreen] Toggling online status:', value)
      setIsOnline(value)

      await Promise.all([
        driverService.setOnlineStatus(value),
        driverService.setAvailableStatus(value)
      ])

      console.log('[HomeScreen] ✅ Online status updated in database')
    } catch (error) {
      console.error('[HomeScreen] Error updating online status:', error)
      setIsOnline(!value)
    }
  }, [])

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

        if (request?.status === 'pending') {
          console.log('[HomeScreen] ✅ Request is pending, showing modal')
          setCurrentRequest(request)
          setShowAssignmentModal(true)
          setRequestCountdown(15)
        } else {
          console.log('[HomeScreen] ⚠️ Request not pending (status:', request?.status, '), clearing modal state')
          setShowAssignmentModal(false)
          setCurrentRequest(null)
        }
      }, user.id)
    } else if (!isOnline) {
      console.log('[HomeScreen] 🔴 Driver is offline, stopping location tracking and polling')
      locationTrackingService.stopTracking()
      assignmentRequestPollingService.stopPolling()
    }
  }, [isOnline, user?.id])

  // Countdown timer cho assignment request modal
  useEffect(() => {
    if (!showAssignmentModal || !currentRequest) return

    if (requestCountdown === 0) {
      console.log('[HomeScreen] ⏰ Auto-rejecting due to timeout')
      handleRejectRequest()
      return
    }

    const timer = setTimeout(() => {
      setRequestCountdown(requestCountdown - 1)
    }, 1000)

    return () => clearTimeout(timer)
  }, [showAssignmentModal, currentRequest, requestCountdown])

  const fetchAvailableRides = useCallback(async () => {
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

      const relevantRides = allRides.filter((ride: any) => {
        const rideDriverId = typeof ride.driverId === 'string' ? ride.driverId : ride.driverId?._id
        const isMyRide = String(rideDriverId) === String(user?.id)
        const isAvailable = !rideDriverId && ride.status === 'pending'
        return isMyRide || isAvailable
      })

      const relevantCombinedTrips = allCombinedTrips.filter((trip: any) => {
        const tripDriverId = typeof trip.driverId === 'string' ? trip.driverId : trip.driverId?._id
        const isMyTrip = String(tripDriverId) === String(user?.id)
        const isAvailable = !tripDriverId && trip.status === 'pending'
        return isMyTrip || isAvailable
      })

      // Merge both arrays
      const allMyRides = [
        ...relevantRides.map((ride: any) => ({ ...ride, sourceType: 'ride' })),
        ...relevantCombinedTrips.map((trip: any) => ({ ...trip, sourceType: 'combined_trip' })),
      ]

      setRides(allMyRides)
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể lấy danh sách cuốc. Vui lòng thử lại.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [user?.id])

  // Lấy danh sách cuốc từ API
  useEffect(() => {
    fetchAvailableRides()
  }, [fetchAvailableRides])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchAvailableRides()
  }, [fetchAvailableRides])

  // Handle accept assignment request
  const handleAcceptRequest = useCallback(async () => {
    try {
      if (!currentRequest) return

      const isDelivery = currentRequest.type === 'delivery'
      const isRideshare = currentRequest.type === 'rideshare' // Combined trip
      const requestId = currentRequest._id

      if (isDelivery) {
        const response = await driverService.acceptDeliveryAssignment(requestId)

        const deliveryId = response?.deliveryId || currentRequest.deliveryId?._id || currentRequest.deliveryId
        navigation.navigate('ActiveDelivery', {
          deliveryId,
          sourceType: 'delivery'
        })
      } else if (isRideshare) {
        const combinedTripId = currentRequest.combinedTripId?._id || currentRequest.combinedTripId
        const response = await driverService.acceptCombinedTripRequest(combinedTripId, requestId)

        navigation.navigate('ActiveRideScreen', {
          combinedTripId,
          sourceType: 'combined_trip'
        })
      } else {
        try {
          const response = await driverService.acceptRideAssignment(requestId)
          const rideId = response?._id || response?.id || currentRequest.rideId?._id || currentRequest.rideId

          if (!rideId) throw new Error('Không tìm thấy ID chuyến đi')
          navigation.navigate('TripActivities', { rideId })
        } catch (acceptError: any) {
          throw acceptError
        }
      }

      // Close modal
      setShowAssignmentModal(false)
      setCurrentRequest(null)

      fetchAvailableRides()
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể nhận cuốc. Vui lòng thử lại.')
      setShowAssignmentModal(false)
    }
  }, [currentRequest, navigation, fetchAvailableRides])

  // Handle reject assignment request
  const handleRejectRequest = useCallback(async () => {
    try {
      if (!currentRequest || !currentRequest._id) {
        setShowAssignmentModal(false)
        setCurrentRequest(null)
        return
      }

      if (currentRequest.status !== 'pending') {
        setShowAssignmentModal(false)
        setCurrentRequest(null)
        return
      }

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

      setShowAssignmentModal(false)
      setCurrentRequest(null)
    } catch (error: any) {
      setShowAssignmentModal(false)
      setCurrentRequest(null)
    }
  }, [currentRequest])

  const formatRideData = useCallback((ride: any): RideItem => {
    // Determine if it's a combined trip or regular ride
    const isCombinedTrip = ride.sourceType === 'combined_trip'
    const isShareRide = isCombinedTrip || ride.rideType === 'share'

    const pickupAddr = ride.pickupAddress || 'Điểm đón'
    const dropoffAddr = ride.dropoffAddress || 'Điểm trả'

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
  }, [])

  const handleAcceptRide = useCallback(async (ride: any) => {
    try {
      if (!user?.id) {
        Alert.alert('Lỗi', 'Không tìm thấy thông tin tài xế')
        return
      }

      const rideId = ride._id || ride.id
      const sourceType = ride.sourceType
      const isCombinedTrip = sourceType === 'combined_trip'
      const isHire = ride.rideType === 'hire' || ride.badge === 'LAI XE HỘ'

      if (isHire && !isCombinedTrip) {
        navigation.navigate('ActiveRideScreen', { rideId, sourceType: 'ride' })
        return
      }

      if (isCombinedTrip) {
        const rideDriverId = typeof ride.driverId === 'string' ? ride.driverId : ride.driverId?._id
        const isMyTrip = rideDriverId === user.id

        if (!isMyTrip) {
          await driverService.acceptCombinedTrip(rideId, user.id)
        }

        navigation.navigate('ActiveRideScreen', {
          combinedTripId: rideId,
          sourceType: 'combined_trip'
        })
        return
      }

      await driverService.acceptRide(rideId, user.id)
      Alert.alert('Thành công', `Bạn đã nhận cuốc`)
      navigation.navigate('ActiveRideScreen', { rideId, sourceType: 'ride' })
    } catch (error: any) {
      let msg = 'Không thể nhận cuốc. Vui lòng thử lại.'
      if (error && error.message) {
        msg = Array.isArray(error.message) ? error.message.join(', ') : String(error.message)
      }
      Alert.alert('Lỗi', msg)
    }
  }, [user?.id, navigation])

  const filteredRides = useMemo(() => {
    return rides
      .map(formatRideData)
      .filter((ride) => {
        if (activeFilter === 'all') return true
        if (activeFilter === 'pool') return ride.type === 'POOL'
        if (activeFilter === 'assist') return ride.type === 'ASSIST'
        return false
      })
  }, [rides, activeFilter, formatRideData])

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.avatarContainer}>
              {user?.avatar ? (
                <Image source={{ uri: user.avatar }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>
                    {user?.firstName?.[0] || user?.name?.[0] || 'T'}
                  </Text>
                </View>
              )}
            </View>
            <View>
              <Text style={styles.greeting}>Xin chào, Tài xế</Text>
              <Text style={styles.driverName}>
                {user?.firstName && user?.lastName
                  ? `${user.firstName} ${user.lastName}`
                  : user?.name || 'Tài xế'}
              </Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.notificationButton}
              onPress={() => navigation.navigate('Notifications' as never)}
            >
              <Ionicons name="notifications-outline" size={24} color="#333" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Balance Card */}
        <BalanceCard
          amount={1250000}
          dailyAmount={1200000}
          increase={2}
          isOnline={isOnline}
          onToggleOnline={handleToggleOnline}
          onViewDetails={() => navigation.navigate('Earnings' as never)}
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
        <MaterialIcons name="location-on" size={28} color="#fff" />
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
        color={active ? '#fff' : '#64748b'}
      />
      <Text style={[styles.filterText, active && styles.filterTextActive]}>{label}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xxl + SPACING.lg,
    paddingBottom: SPACING.xl,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: '#fff',
  },
  notificationBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#fff',
  },
  avatarContainer: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: '#fff',
  },
  avatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FF6B00',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    textTransform: 'uppercase',
  },
  greeting: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 4,
    fontWeight: '500',
  },
  driverName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingVertical: 8,
    paddingHorizontal: SPACING.lg,
    borderRadius: 24,
    gap: SPACING.sm,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ef4444',
  },
  statusOnline: {
    backgroundColor: '#10b981',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: -0.2,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: SPACING.md,
    paddingHorizontal: SPACING.xl,
    marginTop: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: 12,
    backgroundColor: '#f1f5f9',
    borderRadius: 24,
    borderWidth: 0,
  },
  filterButtonActive: {
    backgroundColor: '#FF6B00',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: -0.2,
  },
  filterTextActive: {
    color: '#fff',
  },
  ridesSection: {
    marginBottom: SPACING.lg,
    paddingHorizontal: SPACING.xl,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  refreshButton: {
    padding: SPACING.sm,
    borderRadius: 20,
    backgroundColor: '#fff5eb',
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: SPACING.sm,
    alignItems: 'center',
  },
  createRideButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxl * 2,
    gap: SPACING.lg,
  },
  loadingText: {
    fontSize: 15,
    color: '#64748b',
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxl * 2,
    gap: SPACING.md,
  },
  emptyText: {
    fontSize: 16,
    color: '#0f172a',
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  emptySubText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    fontWeight: '500',
  },
  mapButton: {
    position: 'absolute',
    bottom: 32,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  deliveryButton: {
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.lg,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: SPACING.lg,
    shadowColor: '#0f172a',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  deliveryButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.lg,
  },
  deliveryIconBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff5eb',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  deliveryInfo: {
    flex: 1,
  },
  deliveryTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  deliverySubtitle: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
})
