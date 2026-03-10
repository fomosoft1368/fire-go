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
import { deliveryService } from '../services/deliveryService'
import { hourlyServiceService } from '../services/hourlyServiceService'
import type { RootState } from '../redux/store'
import type { RideItem } from '../types'
import { updateUser } from '../redux/slices/authSlice'

export default function HomeScreen() {
  const [isOnline, setIsOnline] = useState(false)
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
  const [deliveryCount, setDeliveryCount] = useState(0)
  const [hourlyServiceCount, setHourlyServiceCount] = useState(0)

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
    fetchServiceCounts()
  }, [dispatch])

  // Fetch service counts for badges
  const fetchServiceCounts = useCallback(async () => {
    try {
      const [deliveries, hourlyServices] = await Promise.all([
        deliveryService.findNearbyDeliveries(21.0285, 105.8542, 50000).catch(() => []),
        hourlyServiceService.getPendingServices(100, 0).catch(() => []),
      ])
      setDeliveryCount(deliveries.length)
      setHourlyServiceCount(hourlyServices.length)
    } catch (error) {
      console.error('[HomeScreen] Error fetching service counts:', error)
    }
  }, [])

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
    return rides.map(formatRideData)
  }, [rides, formatRideData])

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={28} color="#FFF" />
            </View>
          </View>
          <View style={styles.userInfoContainer}>
            <Text style={styles.greeting}>Xin chào 👋</Text>
            <Text style={styles.userName}>
              {user?.firstName && user?.lastName
                ? `${user.firstName} ${user.lastName}`
                : user?.name}
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
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>

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

        {/* Services Section */}
        <View style={styles.servicesSection}>
          <Text style={styles.servicesSectionTitle}>Dịch vụ khác</Text>
          <View style={styles.servicesGrid}>
            <ServiceCard
              icon="people"
              iconColor="#f59e0b"
              iconBg="#fef3c7"
              title="Tạo ghép xe"
              subtitle="Tạo chuyến mới"
              count={0}
              onPress={() => navigation.navigate('CreateRide')}
            />
            <ServiceCard
              icon="local-shipping"
              iconColor="#10b981"
              iconBg="#d1fae5"
              title="Giao hàng"
              subtitle="Đơn ship gần bạn"
              count={deliveryCount}
              onPress={() => navigation.navigate('DeliveryRequests')}
            />
            <ServiceCard
              icon="cleaning-services"
              iconColor="#8b5cf6"
              iconBg="#ede9fe"
              title="Dọn dẹp"
              subtitle="Nhiệm vụ dọn dẹp"
              count={hourlyServiceCount}
              onPress={() => navigation.navigate('HourlyRequests')}
            />
          </View>
        </View>
        {/* Rides List */}
        <View style={styles.ridesSection}>
          <View style={styles.sectionTitleContainer}>
            <Text style={styles.sectionTitle}>Hoạt động có sẵn</Text>
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
      </ScrollView>
    </View>
  )
}

interface ServiceCardProps {
  icon: string
  iconColor: string
  iconBg: string
  title: string
  subtitle: string
  count: number
  onPress: () => void
}

const ServiceCard: React.FC<ServiceCardProps> = ({ icon, iconColor, iconBg, title, subtitle, count, onPress }) => {
  return (
    <TouchableOpacity style={styles.serviceCard} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.serviceCardHeader}>
        <View style={[styles.serviceCardIcon, { backgroundColor: iconBg }]}>
          <MaterialIcons name={icon as any} size={32} color={iconColor} />
        </View>
        {count > 0 && (
          <View style={[styles.serviceCardBadge, { backgroundColor: iconColor }]}>
            <Text style={styles.serviceCardBadgeText}>{count}</Text>
          </View>
        )}
      </View>
      <Text style={styles.serviceCardTitle}>{title}</Text>
      <Text style={styles.serviceCardSubtitle}>{subtitle}</Text>
      <View style={styles.serviceCardFooter}>
        <Text style={[styles.serviceCardFooterText, { color: iconColor }]}>Xem ngay</Text>
        <MaterialIcons name="arrow-forward" size={16} color={iconColor} />
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    paddingTop: 48,
    borderBottomWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FF6B35',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 3,
    borderColor: '#FFF',
  },
  userInfoContainer: {
    flex: 1,
    justifyContent: 'center',
    marginLeft: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  notificationButton: {
    padding: 4,
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
  greeting: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '600',
    marginBottom: 2,
    letterSpacing: -0.2,
  },
  userName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.4,
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
  ridesSection: {
    marginTop: SPACING.lg,
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
  servicesSection: {
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.lg,
  },
  servicesSectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: SPACING.lg,
    letterSpacing: -0.5,
  },
  servicesGrid: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  serviceCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: SPACING.lg,
    shadowColor: '#0f172a',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    minHeight: 160,
  },
  serviceCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  serviceCardIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  serviceCardBadge: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
    marginTop: -4,
    marginRight: -4,
  },
  serviceCardBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#fff',
  },
  serviceCardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  serviceCardSubtitle: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
    marginBottom: SPACING.md,
    lineHeight: 18,
  },
  serviceCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 'auto',
  },
  serviceCardFooterText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
})
