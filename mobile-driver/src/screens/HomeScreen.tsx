import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
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
  PanResponder,
  Animated,
  RefreshControl,
} from 'react-native'
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { COLORS, SPACING } from '../constants'
import { RideCard, BalanceCard } from '../components'
import { driverService, type EarningsData } from '../services/driverService'
import { locationTrackingService } from '../services/locationTrackingService'
import { pricingService } from '../services/pricingService'
import type { RootState } from '../redux/store'
import type { RideItem } from '../types'
import { updateUser } from '../redux/slices/authSlice'

export default function HomeScreen() {
  const [isOnline, setIsOnline] = useState(false)
  const [activeFilter, setActiveFilter] = useState<'all' | 'pool' | 'assist'>('all')
  const [rides, setRides] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [earnings, setEarnings] = useState<Omit<EarningsData, 'totalTrips' | 'driverShare'> & { 
    breakdown: NonNullable<EarningsData['breakdown']> 
  }>({ 
    amount: 0, 
    increase: 0,
    breakdown: {
      rides: { trips: 0, totalFare: 0, driverEarnings: 0 },
      combinedTrips: { trips: 0, requests: 0, totalFare: 0, driverEarnings: 0 },
      deliveries: { deliveries: 0, totalFare: 0, driverEarnings: 0 },
    }
  })
  const [walletBalance, setWalletBalance] = useState(0)
  const [walletWarning, setWalletWarning] = useState(false)

  // Draggable map button state
  const mapButtonPan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: Animated.event(
        [
          null,
          { dx: mapButtonPan.x, dy: mapButtonPan.y },
        ],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: (_evt, gestureState) => {
        // Optional: Add snapback animation or boundary checking here
        Animated.spring(mapButtonPan, {
          toValue: { x: gestureState.dx, y: gestureState.dy },
          useNativeDriver: false,
        }).start()
      },
    })
  ).current

  const { user } = useSelector((state: RootState) => state.auth)
  const dispatch = useDispatch()
  const navigation = useNavigation<NativeStackNavigationProp<any>>()

  // Fetch today's earnings and wallet balance on mount
  useEffect(() => {
    const fetchEarningsAndWallet = async () => {
      try {
        console.log('[HomeScreen] 📊 Fetching today\'s earnings...')
        const earningsData = await driverService.getTodayEarnings()
        console.log('[HomeScreen] ✅ Earnings loaded:', earningsData)
        console.log('[HomeScreen] 💰 Breakdown:', {
          rides: earningsData.breakdown?.rides?.driverEarnings || 0,
          combined: earningsData.breakdown?.combinedTrips?.driverEarnings || 0,
          delivery: earningsData.breakdown?.deliveries?.driverEarnings || 0,
        })
        setEarnings({
          amount: earningsData.amount || 0,
          increase: earningsData.increase || 0,
          breakdown: earningsData.breakdown || {
            rides: { trips: 0, totalFare: 0, driverEarnings: 0 },
            combinedTrips: { trips: 0, requests: 0, totalFare: 0, driverEarnings: 0 },
            deliveries: { deliveries: 0, totalFare: 0, driverEarnings: 0 },
          }
        })


      } catch (error) {
        console.error('[HomeScreen] ❌ Error fetching earnings/wallet:', error)
        setEarnings({ 
          amount: 0, 
          increase: 0,
          breakdown: {
            rides: { trips: 0, totalFare: 0, driverEarnings: 0 },
            combinedTrips: { trips: 0, requests: 0, totalFare: 0, driverEarnings: 0 },
            deliveries: { deliveries: 0, totalFare: 0, driverEarnings: 0 },
          }
        })
        setWalletBalance(0)
      }
    }

    fetchEarningsAndWallet()
  }, [])

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
          walletBalance: profile.walletBalance,
          licenseStatus: profile.licenseStatus,
        })

        dispatch(updateUser({
          driverTypes: profile.driverTypes,
          isOnline: profile.isOnline,
          isAvailable: profile.isAvailable,
          status: profile.status,
          walletBalance: profile.walletBalance,
          licenseStatus: profile.licenseStatus,
          totalRides: profile.totalRides,
          completedRides: profile.completedRides,
          averageRating: profile.averageRating,
          onlineHours: profile.onlineHours,
        }))

        setIsOnline(profile.isOnline || false)
        
        // ✅ Check wallet warning on mount
        const balance = profile.walletBalance || 0
        setWalletBalance(balance)
        const minBalance = await pricingService.getMinWalletBalanceToGoOnline()
        setWalletWarning(balance < minBalance)
        
        console.log('[HomeScreen] Wallet check on mount:', {
          balance,
          minBalance,
          hasWarning: balance < minBalance,
        })
      } catch (error) {
        console.error('[HomeScreen] ❌ Error fetching profile:', error)
        setIsOnline(false)
      }
    }

    fetchDriverProfile()
  }, [dispatch])

  // Refresh wallet and earnings
  const refreshWalletAndEarnings = useCallback(async () => {
    try {
      setRefreshing(true)
      const earningsData = await driverService.getTodayEarnings()
      setEarnings({
        amount: earningsData.amount || 0,
        increase: earningsData.increase || 0,
        breakdown: earningsData.breakdown || {
          rides: { trips: 0, totalFare: 0, driverEarnings: 0 },
          combinedTrips: { trips: 0, requests: 0, totalFare: 0, driverEarnings: 0 },
          deliveries: { deliveries: 0, totalFare: 0, driverEarnings: 0 },
        }
      })

      const profile = await driverService.getProfile()
      const balance = profile?.walletBalance || 0
      setWalletBalance(balance)
      
      // Update Redux with latest profile data
      dispatch(updateUser({
        walletBalance: balance,
        totalRides: profile.totalRides,
        completedRides: profile.completedRides,
        averageRating: profile.averageRating,
        onlineHours: profile.onlineHours,
      }))
      
      // ✅ Get dynamic minimum balance from config
      const minBalance = await pricingService.getMinWalletBalanceToGoOnline()
      setWalletWarning(balance < minBalance)
      
      console.log('[HomeScreen] Wallet check:', {
        balance,
        minBalance,
        hasWarning: balance < minBalance,
      })
    } catch (error) {
      console.error('[HomeScreen] Error refreshing:', error)
    } finally {
      setRefreshing(false)
    }
  }, [])

  // Handle online/offline toggle with API call
  const handleToggleOnline = useCallback(async (value: boolean) => {
    try {
      // Only validate when turning ON
      if (value) {
        console.log('[HomeScreen] Validating before turning online...', {
          walletBalance: user?.walletBalance,
          licenseStatus: user?.licenseStatus,
          fullUser: user,
        })

        // Get dynamic minimum balance requirement
        const minBalance = await pricingService.getMinWalletBalanceToGoOnline()

        // Check wallet balance
        const balance = user?.walletBalance || 0
        if (balance < minBalance) {
          console.log('[HomeScreen] Wallet too low:', balance, 'required:', minBalance)
          Alert.alert(
            'Số dư không đủ',
            `Số dư ví phải từ ${minBalance.toLocaleString('vi-VN')} đ trở lên để nhận cuốc. Hiện tại: ${(balance || 0).toLocaleString('vi-VN')}đ`,
            [{ text: 'OK' }]
          )
          return
        }

        // Check license status
        if (user?.licenseStatus !== 'approved') {
          console.log('[HomeScreen] License not approved:', user?.licenseStatus)
          Alert.alert(
            'Giấy phép lái xe chưa được phê duyệt',
            'Giấy phép lái xe của bạn chưa được phê duyệt. Vui lòng chờ admin duyệt hồ sơ của bạn',
            [{ text: 'OK' }]
          )
          return
        }
      }

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
  }, [user])

  // ✅ REMOVED: Assignment polling is now GLOBAL in App.js
  // Only keep location tracking here
  useEffect(() => {
    if (isOnline && user?.id) {
      console.log('[HomeScreen] 🟢 Driver is online, starting location tracking')
      locationTrackingService.startTracking(user.id)
    } else if (!isOnline) {
      console.log('[HomeScreen] 🔴 Driver is offline, stopping location tracking')
      locationTrackingService.stopTracking()
    }
  }, [isOnline, user?.id])

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
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refreshWalletAndEarnings} />
        }
      >
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
          amount={earnings.amount}
          dailyAmount={earnings.amount}
          increase={earnings.increase}
          breakdown={earnings.breakdown}
          isOnline={isOnline}
          onToggleOnline={handleToggleOnline}
          onViewDetails={() => navigation.navigate('Earnings' as never)}
          totalRides={user?.totalRides || 0}
          averageRating={user?.averageRating || 0}
          onlineHours={user?.onlineHours || 0}
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

      {/* Floating Map Button - Draggable */}
      <Animated.View
        style={[
          styles.mapButton,
          {
            transform: [
              { translateX: mapButtonPan.x },
              { translateY: mapButtonPan.y },
            ],
          },
        ]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          style={styles.mapButtonInner}
          onPress={() => navigation.navigate('MapScreen')}
          activeOpacity={0.8}
        >
          <MaterialIcons name="location-on" size={28} color="#fff" />
        </TouchableOpacity>
      </Animated.View>
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
    zIndex: 999,
  },
  mapButtonInner: {
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
