import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  Alert,
} from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { useSelector } from 'react-redux'
import { COLORS, SPACING, BORDER_RADIUS, FILTER_TYPES } from '../constants'
import { RideCard, BalanceCard } from '../components'
import type { RootState } from '../redux/store'
import type { RideItem } from '../types'

const mockRides: RideItem[] = [
  {
    id: '1',
    type: 'POOL',
    price: 250000,
    pickupLocation: 'Điểm đón ở 2.8km',
    dropoffLocation: '123 Nguyễn Huệ, Quận 1',
    pickupTime: '22:00 hôm nay',
    time: '~7 phút',
    rating: 4.9,
    badge: 'GHÉP XE',
    badgeColor: '#ff9900',
  },
  {
    id: '2',
    type: 'ASSIST',
    price: 300000,
    pickupLocation: 'Điểm đón ở 3.0km',
    dropoffLocation: 'Nhà hàng Bến Đông, Q3',
    pickupTime: '22:30 hôm nay',
    time: '~5 phút',
    rating: 4.8,
    badge: 'LAI XE HỘ',
    badgeColor: '#6200ea',
  },
  {
    id: '3',
    type: 'POOL',
    price: 450000,
    pickupLocation: 'Điểm đón ở 2.9km',
    dropoffLocation: 'Vincom Center, Đống Khôi',
    pickupTime: 'Ngay lập tức',
    time: '~3 phút',
    rating: 4.7,
    badge: 'GHÉP XE',
    badgeColor: '#ff9900',
  },
]

export default function HomeScreen() {
  const [isOnline, setIsOnline] = useState(true)
  const [activeFilter, setActiveFilter] = useState<'all' | 'pool' | 'assist'>('all')
  const { user } = useSelector((state: RootState) => state.auth)

  const handleAcceptRide = (rideId: string) => {
    Alert.alert('Thành công', `Bạn đã nhận cuốc ${rideId}`)
  }

  const filteredRides = mockRides.filter((ride) => {
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
            <Text style={styles.greeting}>Xin chào</Text>
            <Text style={styles.driverName}>{user?.name || 'Tài xế'}</Text>
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
          <Text style={styles.sectionTitle}>Chuyến đi có sẵn</Text>
          {filteredRides.length > 0 ? (
            filteredRides.map((ride) => (
              <RideCard key={ride.id} ride={ride} onAccept={handleAcceptRide} />
            ))
          ) : (
            <View style={styles.emptyState}>
              <MaterialIcons name="inbox" size={48} color={COLORS.textSecondary} />
              <Text style={styles.emptyText}>Không có chuyến đi nào</Text>
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  greeting: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  driverName: {
    fontSize: 24,
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.md,
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
