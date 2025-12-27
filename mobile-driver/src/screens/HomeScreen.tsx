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
} from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { useSelector } from 'react-redux'
import { COLORS, SPACING, BORDER_RADIUS, FILTER_TYPES } from '../constants'
import { RideCard, BalanceCard } from '../components'
import { driverService } from '../services/driverService'
import type { RootState } from '../redux/store'
import type { RideItem } from '../types'

export default function HomeScreen() {
  const [isOnline, setIsOnline] = useState(true)
  const [activeFilter, setActiveFilter] = useState<'all' | 'pool' | 'assist'>('all')
  const [rides, setRides] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const { user } = useSelector((state: RootState) => state.auth)

  // Lấy danh sách cuốc từ API
  useEffect(() => {
    fetchAvailableRides()
  }, [])

  const fetchAvailableRides = async () => {
    setLoading(true)
    try {
      const allRides = await driverService.getAvailableRides()
      console.log('📱 Tất cả cuốc từ API:', allRides)
      console.log('📊 Số lượng cuốc:', allRides.length)
      
      // Chỉ lấy những cuốc:
      // - Status = pending (chưa được ai nhận)
      // - Không có driverId (chưa có tài xế nhận)
      const availableRides = allRides.filter((ride: any) => {
        const isPending = ride.status === 'pending'
        const noDriver = !ride.driverId
        console.log(`🚗 Cuốc ${ride._id}:`, {
          status: ride.status,
          driverId: ride.driverId,
          isPending,
          noDriver,
          willShow: isPending && noDriver,
        })
        return isPending && noDriver
      })
      
      console.log('✅ Cuốc có sẵn:', availableRides)
      setRides(availableRides)
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

  const formatRideData = (ride: any): RideItem => {
    const isShareRide = ride.rideType === 'share'
    const pickupDistance = Math.random() * 5 + 1 // Mock: 1-6km
    const estimatedTime = Math.ceil(pickupDistance * 1.5) // Khoảng 1.5 phút per km

    return {
      id: ride._id,
      type: isShareRide ? 'POOL' : 'ASSIST',
      price: ride.totalFare || 0,
      pickupLocation: `Điểm đón ở ${pickupDistance.toFixed(1)}km`,
      dropoffLocation: ride.dropoffAddress,
      pickupTime: ride.isScheduled
        ? new Date(ride.scheduledTime).toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
          })
        : 'Ngay lập tức',
      time: `~${estimatedTime} phút`,
      rating: 4.8,
      badge: isShareRide ? 'GHÉP XE' : 'LAI XE HỘ',
      badgeColor: isShareRide ? '#ff9900' : '#6200ea',
    }
  }

  const handleAcceptRide = async (rideId: string) => {
    try {
      if (!user?.id) {
        Alert.alert('Lỗi', 'Không tìm thấy thông tin tài xế')
        return
      }
      await driverService.acceptRide(rideId, user.id)
      Alert.alert('Thành công', `Bạn đã nhận cuốc`)
      // Làm mới danh sách cuốc
      await fetchAvailableRides()
    } catch (error) {
      console.error('Lỗi khi nhận cuốc:', error)
      Alert.alert('Lỗi', 'Không thể nhận cuốc. Vui lòng thử lại.')
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
          onToggleOnline={setIsOnline}
        />

        {/* Filter Buttons */}
        <FilterButtons activeFilter={activeFilter} onFilterChange={setActiveFilter} />

        {/* Rides List */}
        <View style={styles.ridesSection}>
          <View style={styles.sectionTitleContainer}>
            <Text style={styles.sectionTitle}>Chuyến đi có sẵn</Text>
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

          {loading && !refreshing ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>Đang tải danh sách cuốc...</Text>
            </View>
          ) : filteredRides.length > 0 ? (
            filteredRides.map((ride) => (
              <RideCard key={ride.id} ride={ride} onAccept={handleAcceptRide} />
            ))
          ) : (
            <View style={styles.emptyState}>
              <MaterialIcons name="inbox" size={48} color={COLORS.textSecondary} />
              <Text style={styles.emptyText}>Không có chuyến đi nào</Text>
              <Text style={styles.emptySubText}>
                Hãy quay lại sau để kiểm tra những cuốc mới
              </Text>
              <View style={styles.debugInfo}>
                <Text style={styles.debugText}>
                  Tổng cuốc: {rides.length} | Lọc: {activeFilter} | Còn lại: {filteredRides.length}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* View More */}
        <TouchableOpacity style={styles.viewMoreButton}>
          <Text style={styles.viewMoreText}>Xem thêm</Text>
          <MaterialIcons name="chevron-right" size={20} color={COLORS.primary} />
        </TouchableOpacity>
      </ScrollView>
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
})
