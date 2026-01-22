import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { useSelector } from 'react-redux'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { COLORS, SPACING, BORDER_RADIUS, FILTER_TYPES } from '../constants'
import { RideCard, BalanceCard } from '../components'
import { driverService } from '../services/driverService'
import type { RootState } from '../redux/store'
import type { RideItem } from '../types'

export default function HomeScreen() {
  const [isOnline, setIsOnline] = useState(true)
  const [autoAssignEnabled, setAutoAssignEnabled] = useState(true)
  const [activeFilter, setActiveFilter] = useState<'all' | 'pool' | 'assist'>('all')
  const [rides, setRides] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [assignedRide, setAssignedRide] = useState<any>(null)
  const [dismissCountdown, setDismissCountdown] = useState(15)
  const { user } = useSelector((state: RootState) => state.auth)
  const navigation = useNavigation<NativeStackNavigationProp<any>>()

  // Lấy danh sách cuốc từ API
  useEffect(() => {
    fetchAvailableRides()
  }, [])

  // Countdown timer cho assigned ride notification
  useEffect(() => {
    if (!assignedRide) return

    const timer = setTimeout(() => {
      setDismissCountdown(dismissCountdown - 1)
      if (dismissCountdown <= 0) {
        setAssignedRide(null)
        setDismissCountdown(15)
      }
    }, 1000)

    return () => clearTimeout(timer)
  }, [assignedRide, dismissCountdown])

  // Kiểm tra xem có cuốc nào được assign cho tài xế này không
  useEffect(() => {
    const assignedRideData = rides.find((ride) => {
      return (
        ride.driverId === user?.id &&
        (ride.status === 'assigned' || ride.status === 'accepted')
      )
    })

    if (assignedRideData && !assignedRide) {
      setAssignedRide(assignedRideData)
      setDismissCountdown(15)
    }
  }, [rides, user?.id])

  const fetchAvailableRides = async () => {
    setLoading(true)
    try {
      // Fetch both Rides and CombinedTrips in parallel
      const [allRides, allCombinedTrips] = await Promise.all([
        driverService.getAvailableRides(),
        driverService.getMyCombinedTrips(),
      ])

      console.log('📱 Rides từ API:', allRides)
      console.log('📱 Combined trips từ API:', allCombinedTrips)
      console.log('👤 User ID hiện tại:', user?.id)

      // Filter: only my rides (driverId = current driver)
      const myRides = allRides.filter((ride: any) => {
        const rideDriverId = typeof ride.driverId === 'string' ? ride.driverId : ride.driverId?._id
        const isMyRide = rideDriverId === user?.id
        console.log(`🚗 Ride ${ride._id}:`, {
          driverId: rideDriverId,
          isMyRide,
          status: ride.status,
        })
        return isMyRide
      })

      // Filter: only my combined trips (driverId = current driver)
      const myCombinedTrips = allCombinedTrips.filter((trip: any) => {
        const tripDriverId = typeof trip.driverId === 'string' ? trip.driverId : trip.driverId?._id
        const isMyTrip = tripDriverId === user?.id
        console.log(`🛴 Combined trip ${trip._id}:`, {
          driverId: tripDriverId,
          isMyTrip,
          status: trip.status,
        })
        return isMyTrip
      })

      // Merge both arrays
      const allMyRides = [
        ...myRides.map((ride: any) => ({ ...ride, sourceType: 'ride' })),
        ...myCombinedTrips.map((trip: any) => ({ ...trip, sourceType: 'combined_trip' })),
      ]

      console.log('✅ My rides:', myRides.length)
      console.log('✅ My combined trips:', myCombinedTrips.length)
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
    const isCombinedTrip = ride.sourceType === 'combined_trip' || !ride.rideType
    const isShareRide = ride.rideType === 'share' || isCombinedTrip

    // Get pickup address (not mock)
    const pickupAddr = ride.pickupAddress || 'Điểm đón'
    
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
      
      console.log('🚗 Accepting ride:', { rideId, sourceType })
      
      // For regular rides, call accept endpoint
      if (sourceType === 'combined_trip') {
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
        await driverService.acceptRide(rideId, user.id)
        Alert.alert('Thành công', `Bạn đã nhận cuốc`)
      }
      
      // Both combined trips and regular rides go to RideRequestsScreen to manage requests
      const params = sourceType === 'combined_trip' 
        ? { combinedTripId: rideId, sourceType: 'combined_trip' }
        : { rideId, sourceType: 'ride' }
      
      navigation.navigate('RideRequestsScreen', params)
    } catch (error) {
      console.error('Lỗi khi nhận cuốc:', error)
      Alert.alert('Lỗi', 'Không thể nhận cuốc. Vui lòng thử lại.')
    }
  }

  // Edit my created ride
  const handleEditRide = (rideId: string) => {
    navigation.navigate('EditRideScreen', { rideId })
  }

  // Update ride status (cancel, start, complete)
  const handleUpdateRideStatus = async (rideId: string, newStatus: string) => {
    Alert.alert(
      'Xác nhận',
      `Bạn muốn thay đổi trạng thái chuyến?`,
      [
        { text: 'Hủy', onPress: () => {}, style: 'cancel' },
        {
          text: 'Xác nhận',
          onPress: async () => {
            try {
              await driverService.updateRide(rideId, { status: newStatus })
              Alert.alert('Thành công', 'Cập nhật trạng thái thành công')
              await fetchAvailableRides()
            } catch (error) {
              console.error('Lỗi cập nhật:', error)
              Alert.alert('Lỗi', 'Không thể cập nhật trạng thái')
            }
          },
        },
      ]
    )
  }

  const handleAcceptAssignedRide = async () => {
    if (!assignedRide || !user?.id) return
    try {
      await driverService.acceptRide(assignedRide._id, user.id)
      Alert.alert('Thành công', 'Bạn đã nhận cuốc')
      setAssignedRide(null)
      setDismissCountdown(15)
      // Navigate to ride requests screen (manage incoming requests)
      navigation.navigate('RideRequestsScreen', { rideId: assignedRide._id })
    } catch (error) {
      console.error('Lỗi khi nhận cuốc:', error)
      Alert.alert('Lỗi', 'Không thể nhận cuốc. Vui lòng thử lại.')
    }
  }

  const handleRejectRide = () => {
    Alert.alert('Từ chối cuốc', 'Bạn chắc chắn muốn từ chối cuốc này?', [
      { text: 'Hủy', onPress: () => {}, style: 'cancel' },
      {
        text: 'Từ chối',
        onPress: () => {
          setAssignedRide(null)
          setDismissCountdown(15)
        },
        style: 'destructive',
      },
    ])
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
      {/* Assigned Ride Notification Card */}
      {assignedRide && (
        <View style={styles.assignedRideNotification}>
          <View style={styles.assignedRideContent}>
            <View style={styles.assignedRideIconContainer}>
              <MaterialIcons name="check-circle" size={28} color="#4caf50" />
            </View>
            <View style={styles.assignedRideInfo}>
              <Text style={styles.assignedRideTitle}>🎉 Bạn nhận được cuốc xe!</Text>
              <Text style={styles.assignedRideLocation}>
                {assignedRide.pickupAddress?.substring(0, 40)}...
              </Text>
              <Text style={styles.assignedRideTime}>
                Lương: {(assignedRide.totalFare || 0).toLocaleString('vi-VN')}đ
              </Text>
            </View>

            <View style={styles.assignedRideTimer}>
              <Text style={styles.timerText}>{dismissCountdown}s</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.assignedRideClose}
            onPress={() => {
              setAssignedRide(null)
              setDismissCountdown(15)
            }}
          >
            <MaterialIcons name="close" size={20} color="#fff" />
          </TouchableOpacity>
          {/* Progress Bar */}
          <View style={styles.timerProgressBar}>
            <View
              style={[
                styles.timerProgressFill,
                { width: `${(dismissCountdown / 15) * 100}%` },
              ]}
            />
          </View>
          {/* Action Buttons */}
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={handleRejectRide}
            >
              <MaterialIcons name="close" size={18} color="#fff" />
              <Text style={styles.actionButtonText}>Từ chối</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.acceptButton]}
              onPress={handleAcceptAssignedRide}
            >
              <MaterialIcons name="check" size={18} color="#fff" />
              <Text style={styles.actionButtonText}>Nhận cuốc</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

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
