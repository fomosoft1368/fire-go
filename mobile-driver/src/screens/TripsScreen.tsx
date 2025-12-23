import React from 'react'
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, FlatList } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { COLORS, SPACING, BORDER_RADIUS } from '../constants'

interface Trip {
  id: string
  status: 'completed' | 'cancelled' | 'upcoming'
  pickupLocation: string
  dropoffLocation: string
  distance: string
  amount: number
  date: string
  rating?: number
}

const mockTrips: Trip[] = [
  {
    id: '1',
    status: 'completed',
    pickupLocation: '123 Nguyễn Huệ',
    dropoffLocation: 'Vincom Center',
    distance: '5.2 km',
    amount: 250000,
    date: 'Hôm nay 22:15',
    rating: 5,
  },
  {
    id: '2',
    status: 'completed',
    pickupLocation: 'Sân bay Tân Sơn Nhất',
    dropoffLocation: 'Đại học Quốc gia',
    distance: '12.5 km',
    amount: 350000,
    date: 'Hôm nay 20:45',
    rating: 4.5,
  },
  {
    id: '3',
    status: 'upcoming',
    pickupLocation: 'Trần Hưng Đạo',
    dropoffLocation: 'Phường Bến Nghé',
    distance: '8.3 km',
    amount: 300000,
    date: 'Ngày mai 09:00',
  },
]

export default function TripsScreen() {
  const renderTripCard = (trip: Trip) => {
    const statusConfig = {
      completed: { label: 'Hoàn thành', color: COLORS.success },
      cancelled: { label: 'Đã hủy', color: COLORS.danger },
      upcoming: { label: 'Sắp tới', color: COLORS.warning },
    }

    const config = statusConfig[trip.status]

    return (
      <View key={trip.id} style={styles.tripCard}>
        <View style={styles.tripHeader}>
          <View style={styles.tripLocation}>
            <View style={styles.locationDot} />
            <View style={styles.locationInfo}>
              <Text style={styles.pickupText}>{trip.pickupLocation}</Text>
              <Text style={styles.arrow}>↓</Text>
              <Text style={styles.dropoffText}>{trip.dropoffLocation}</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: config.color + '20' }]}>
            <Text style={[styles.statusText, { color: config.color }]}>{config.label}</Text>
          </View>
        </View>

        <View style={styles.tripMeta}>
          <View style={styles.metaItem}>
            <MaterialIcons name="route" size={16} color={COLORS.textSecondary} />
            <Text style={styles.metaText}>{trip.distance}</Text>
          </View>
          <View style={styles.metaItem}>
            <MaterialIcons name="schedule" size={16} color={COLORS.textSecondary} />
            <Text style={styles.metaText}>{trip.date}</Text>
          </View>
          <Text style={styles.amount}>{trip.amount.toLocaleString('vi-VN')}đ</Text>
        </View>

        {trip.rating && (
          <View style={styles.ratingRow}>
            <MaterialIcons name="star" size={16} color={COLORS.warning} />
            <Text style={styles.ratingValue}>{trip.rating} sao</Text>
          </View>
        )}
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Chuyến đi</Text>
        </View>

        <View style={styles.filterTabs}>
          <TouchableOpacity style={styles.filterTabActive}>
            <Text style={styles.filterTabTextActive}>Tất cả</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterTab}>
            <Text style={styles.filterTabText}>Hoàn thành</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterTab}>
            <Text style={styles.filterTabText}>Sắp tới</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tripsList}>
          {mockTrips.map((trip) => renderTripCard(trip))}
        </View>
      </ScrollView>
    </SafeAreaView>
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
    paddingVertical: SPACING.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
  },
  filterTabs: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.darkBorder,
    paddingBottom: SPACING.md,
  },
  filterTab: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
  },
  filterTabActive: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },
  filterTabText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  filterTabTextActive: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  tripsList: {
    marginBottom: SPACING.xl,
  },
  tripCard: {
    backgroundColor: COLORS.darkCard,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.darkBorder,
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.lg,
  },
  tripLocation: {
    flex: 1,
    flexDirection: 'row',
    gap: SPACING.md,
  },
  locationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    marginTop: SPACING.xs,
  },
  locationInfo: {
    flex: 1,
  },
  pickupText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  arrow: {
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  dropoffText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  statusBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  tripMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.lg,
    paddingBottom: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.darkBorder,
    marginBottom: SPACING.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  metaText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  amount: {
    marginLeft: 'auto',
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  ratingValue: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '600',
  },
})
