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
import { useSelector } from 'react-redux'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { COLORS, SPACING, BORDER_RADIUS } from '../constants'
import { RideCard, BalanceCard } from '../components'
import { driverService } from '../services/driverService'
import { locationTrackingService } from '../services/locationTrackingService'
import type { RootState } from '../redux/store'
import type { RideItem } from '../types'

export default function HomeScreen() {
  const [isOnline, setIsOnline] = useState(true)
  const [autoAssignEnabled, setAutoAssignEnabled] = useState(true)
  const [activeFilter, setActiveFilter] = useState<'all' | 'pool' | 'assist'>('all')
  const [rides, setRides] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  
  const { user } = useSelector((state: RootState) => state.auth)
  const navigation = useNavigation<NativeStackNavigationProp<any>>()

  // Start/stop location tracking based on online status
  useEffect(() => {
    if (isOnline && user?.id) {
      console.log('[HomeScreen] 🟢 Driver is online, starting location tracking')
      locationTrackingService.startTracking(user.id)
    } else if (!isOnline) {
      console.log('[HomeScreen] 🔴 Driver is offline, stopping location tracking')
      locationTrackingService.stopTracking()
    }

    return () => {
      // Don't stop tracking on unmount, let it continue in background
      console.log('[HomeScreen] Component unmounting, but keeping location tracking active')
    }
  }, [isOnline, user?.id])

  // Lấy danh sách cuốc từ API
  useEffect(() => {
    fetchAvailableRides()
  }, [])

  // ✅ REMOVED: Modal logic moved to GlobalRequestModal component in App.js
  // Assignment request modal also moved to App.js (global AssignmentRequestModal)

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

  const formatRideData = (ride: any): RideItem & { sourceType?: string; _id?: string } => {
    // Determine if it's a combined trip or regular ride
    const isCombinedTrip = ride.sourceType === 'combined_trip'
    // Combined trips are always POOL, otherwise check rideType
    const isShareRide = isCombinedTrip || ride.rideType === 'share'

    // Get pickup address (not mock)
    const pickupAddr = ride.pickupAddress || 'Điểm đón'
    
    console.log('📍 [formatRideData] Ride data:', {
      _id: ride._id,
      sourceType: ride.sourceType,
      pickupAddress: ride.pickupAddress,
      dropoffAddress: ride.dropoffAddress,
      totalFare: ride.totalFare,
      duration: ride.duration,
    })

    // Handle dropoff location - could be string or GeoJSON object
    let dropoffAddr = ride.dropoffAddress || ride.dropoffLocationAddress || 'Địa điểm đến'
    if (typeof dropoffAddr === 'object' && dropoffAddr?.type === 'Point') {
      dropoffAddr = ride.dropoffLocationAddress || 'Địa điểm đến'
    }

    // For display, show short version of address
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
      const type = ride.type // 'ASSIST' or 'POOL'

      console.log('🚗 Viewing ride:', { rideId, sourceType, type })

      // Determine which screen to navigate to based on ride type
      const isCombinedTrip = sourceType === 'combined_trip'
      const isAssistRide = type === 'ASSIST'

      // For lái xe hộ (ASSIST), go to RideDetailScreen
      if (isAssistRide && !isCombinedTrip) {
        console.log('📍 Navigating to RideDetailScreen for ASSIST ride')
        navigation.navigate('RideDetailScreen', { rideId })
        return
      }

      // For ghép xe (POOL/combined trips), accept and go to RideRequestsScreen
      if (isCombinedTrip) {
        // Check if this driver created the combined trip (driverId is already set)
        const rideDriverId = typeof ride.driverId === 'string' ? ride.driverId : ride.driverId?._id
        const isMyTrip = rideDriverId === user.id

        if (!isMyTrip) {
          // This is someone else's trip, we need to accept it
          await driverService.acceptCombinedTrip(rideId, user.id)
          console.log('✅ Combined trip accepted')
        } else {
          // This is my own trip, skip accept and go straight to manage requests
          console.log('✅ This is your own combined trip, skipping accept')
        }
      } else {
        // Regular share ride
        await driverService.acceptRide(rideId, user.id)
        Alert.alert('Thành công', `Bạn đã nhận cuốc`)
      }

      // Navigate to RideRequestsScreen for share rides and combined trips
      const params = isCombinedTrip
        ? { combinedTripId: rideId, sourceType: 'combined_trip' }
        : { rideId, sourceType: 'ride' }

      // Start polling for pending requests if combined trip
      if (isCombinedTrip) {
        console.log('🔄 Navigating to combined trip:', rideId)
      }

      console.log('📍 Navigating to RideRequestsScreen for POOL ride')
      navigation.navigate('RideRequestsScreen', params)
    } catch (error: any) {
      console.error('Lỗi khi nhận cuốc:', error)
      let msg = 'Không thể nhận cuốc. Vui lòng thử lại.'
      if (error && error.message) {
        msg = Array.isArray(error.message) ? error.message.join(', ') : String(error.message)
      }
      Alert.alert('Lỗi', msg)
    }
  }
  // Update ride status (cancel, start, complete)
  const handleUpdateRideStatus = async (rideId: string, newStatus: string) => {
    Alert.alert(
      'Xác nhận',
      `Bạn muốn thay đổi trạng thái chuyến?`,
      [
        { text: 'Hủy', onPress: () => { }, style: 'cancel' },
        {
          text: 'Xác nhận',
          onPress: async () => {
            try {
              await driverService.updateRide(rideId, { status: newStatus })
              Alert.alert('Thành công', 'Cập nhật trạng thái thành công')
              await fetchAvailableRides()
            } catch (error: any) {
              console.error('Lỗi cập nhật:', error)
              let msg = 'Không thể cập nhật trạng thái'
              if (error && error.message) {
                msg = Array.isArray(error.message) ? error.message.join(', ') : String(error.message)
              }
              Alert.alert('Lỗi', msg)
            }
          },
        },
      ]
    )
  }

  // ✅ REMOVED: handleAcceptAssignedRide, handleEditRide, handleRejectRide
  // Now handled by global AssignmentRequestModal in App.js

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
      {/* ✅ REMOVED: All notification modals moved to App.js */}
      {/* - GlobalRequestModal (for ride requests) */}
      {/* - AssignmentRequestModal (for auto-assign driver confirmation) */}

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
          onToggleOnline={setIsOnline}
        />

        {/* Auto-Assign Card */}
        <View style={styles.autoAssignCard}>
          <View style={styles.autoAssignHeader}>
            <View style={styles.autoAssignTitleSection}>
              <View style={[styles.autoAssignIcon, autoAssignEnabled && styles.autoAssignIconActive]}>
                <MaterialIcons
                  name="auto-awesome"
                  size={24}
                  color={autoAssignEnabled ? '#FF6B00' : COLORS.textSecondary}
                />
              </View>
              <View style={styles.autoAssignTitle}>
                <Text style={styles.autoAssignTitleText}>Tự động chỉ định</Text>
                <Text style={styles.autoAssignSubtext}>
                  {autoAssignEnabled ? 'Đang tìm kiếm cuốc phù hợp' : 'Bật để nhận cuốc tự động'}
                </Text>
              </View>
            </View>
            <Switch
              value={autoAssignEnabled}
              onValueChange={setAutoAssignEnabled}
              trackColor={{ false: COLORS.darkBorder, true: '#FF6B0050' }}
              thumbColor={autoAssignEnabled ? '#FF6B00' : COLORS.textSecondary}
            />
          </View>

          {autoAssignEnabled && (
            <View style={styles.autoAssignStats}>
              <View style={styles.statItem}>
                <View style={styles.statIcon}>
                  <MaterialIcons name="location-on" size={16} color="#FF6B00" />
                </View>
                <View style={styles.statContent}>
                  <Text style={styles.statLabel}>Bán kính tìm</Text>
                  <Text style={styles.statValue}>2 km</Text>
                </View>
              </View>

              <View style={styles.statDivider} />

              <View style={styles.statItem}>
                <View style={styles.statIcon}>
                  <MaterialIcons name="schedule" size={16} color="#4caf50" />
                </View>
                <View style={styles.statContent}>
                  <Text style={styles.statLabel}>Cuốc chờ</Text>
                  <Text style={styles.statValue}>{rides.length}</Text>
                </View>
              </View>

              <View style={styles.statDivider} />

              <View style={styles.statItem}>
                <View style={styles.statIcon}>
                  <MaterialIcons name="star" size={16} color="#8b5cf6" />
                </View>
                <View style={styles.statContent}>
                  <Text style={styles.statLabel}>Điểm số</Text>
                  <Text style={styles.statValue}>4.8</Text>
                </View>
              </View>
            </View>
          )}
        </View>

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
              // Tìm ride gốc để có full data (including sourceType)
              const originalRide = rides.find(r => r._id === ride.id)
              // Merge formatted ride with original data to preserve sourceType
              const completeRide = originalRide ? { ...ride, ...originalRide } : ride
              return (
                <View key={ride.id} style={styles.rideWithActions}>
                  <RideCard ride={completeRide} onAccept={handleAcceptRide} />
                  {originalRide && (
                    <View style={styles.rideActions}>

                    </View>
                  )}
                </View>
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
  debugInfo: {
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.darkCard,
    borderRadius: BORDER_RADIUS.md,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  debugText: {
    fontSize: 11,
    color: COLORS.primary,
    fontFamily: 'monospace',
  },
  viewMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    marginBottom: SPACING.xl,
  },
  viewMoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
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
  // ============ Assigned Ride Notification Styles ============
  assignedRideNotification: {
    backgroundColor: '#FF6B00',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    marginBottom: 0,
    overflow: 'hidden',
    paddingTop: 40,
  },
  assignedRideContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingTop: 40,
  },
  assignedRideIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  assignedRideInfo: {
    flex: 1,
    gap: SPACING.xs,
  },
  assignedRideTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  assignedRideLocation: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  assignedRideTime: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '600',
  },
  assignedRideTimer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  assignedRideClose: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  timerProgressBar: {
    marginTop: SPACING.md,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  timerProgressFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 1.5,
  },
  // ============ Action Buttons Styles ============
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.lg,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  acceptButton: {
    backgroundColor: 'rgba(76, 175, 80, 0.9)',
  },
  rejectButton: {
    backgroundColor: 'rgba(244, 67, 54, 0.9)',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  // ============ Test Button ============
  testButton: {
    marginHorizontal: SPACING.lg,
    marginVertical: SPACING.lg,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    backgroundColor: '#ff6b6b',
    borderRadius: BORDER_RADIUS.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  testButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  // ============ Delivery Button ============
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
  // ============ Ride Actions Styles ============
  rideWithActions: {
    marginBottom: SPACING.lg,
  },
  rideActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.sm,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  detailBtn: {
    backgroundColor: '#2196F3',
  },
  editBtn: {
    backgroundColor: '#2196F3',
  },
  startBtn: {
    backgroundColor: '#4CAF50',
  },
  completeBtn: {
    backgroundColor: '#8BC34A',
  },
  cancelBtn: {
    backgroundColor: '#f44336',
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
})
