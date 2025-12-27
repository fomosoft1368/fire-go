import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { COLORS, SPACING, BORDER_RADIUS } from '../constants'
import { driverService } from '../services/driverService'

interface Trip {
  _id?: string
  id?: string
  status: 'completed' | 'cancelled' | 'upcoming'
  pickupLocation?: string
  dropoffLocation?: string
  pickupAddress?: string
  dropoffAddress?: string
  distance: string
  amount: number
  totalFare?: number
  date: string
  rating?: number
  customerName?: string
  createdAt?: string
  updatedAt?: string
}

export default function TripsScreen() {
  const [trips, setTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState<'all' | 'completed' | 'upcoming'>('all')

  useEffect(() => {
    fetchTrips()
  }, [activeFilter])

  const fetchTrips = async () => {
    try {
      setLoading(true)
      setError(null)
      console.log('📱 Fetching trips with filter:', activeFilter)
      
      let data: any[] = []
      
      if (activeFilter === 'completed') {
        // Lấy cuốc đã hoàn thành
        data = await driverService.getCompletedTrips('completed')
      } else if (activeFilter === 'upcoming') {
        // Lấy cuốc sắp tới (status = pending hoặc accepted)
        data = await driverService.getAvailableRides()
      } else {
        // Lấy tất cả cuốc đã hoàn thành (gồi cả completed và cancelled)
        // Vì API có thể không hỗ trợ array status, nên gọi riêng từng cái rồi combine
        const completedTrips = await driverService.getCompletedTrips('completed')
        const cancelledTrips = await driverService.getCompletedTrips('cancelled')
        data = [...(completedTrips || []), ...(cancelledTrips || [])]
      }

      console.log('📊 Trips data:', data)
      
      // Format dữ liệu từ API thành Trip interface
      const formattedTrips = (Array.isArray(data) ? data : []).map((ride: any) => ({
        _id: ride._id,
        id: ride._id || ride.id,
        status: ride.status || 'completed',
        pickupLocation: ride.pickupAddress || 'Điểm đón',
        dropoffLocation: ride.dropoffAddress || 'Điểm trả',
        pickupAddress: ride.pickupAddress,
        dropoffAddress: ride.dropoffAddress,
        distance: ride.distance ? `${ride.distance} km` : '0 km',
        amount: ride.totalFare || 0,
        totalFare: ride.totalFare,
        date: formatDate(ride.createdAt || ride.date),
        rating: ride.rating,
        customerName: ride.customerName,
      }))

      console.log('✅ Formatted trips:', formattedTrips)
      setTrips(formattedTrips)
    } catch (err: any) {
      console.error('❌ Error fetching trips:', err)
      setError('Không thể tải danh sách chuyến đi')
      setTrips([])
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'N/A'
    try {
      const date = new Date(dateString)
      const today = new Date()
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      
      // Format time
      const time = date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
      
      // Format date prefix
      if (date.toDateString() === today.toDateString()) {
        return `Hôm nay ${time}`
      } else if (date.toDateString() === yesterday.toDateString()) {
        return `Hôm qua ${time}`
      } else {
        const day = date.toLocaleDateString('vi-VN')
        return `${day} ${time}`
      }
    } catch {
      return 'N/A'
    }
  }
  const renderTripCard = (trip: Trip) => {
    const statusConfig = {
      completed: { label: 'Hoàn thành', color: COLORS.success },
      cancelled: { label: 'Đã hủy', color: COLORS.danger },
      upcoming: { label: 'Sắp tới', color: COLORS.warning },
    }

    const config = statusConfig[trip.status]

    return (
      <View key={trip.id || trip._id} style={styles.tripCard}>
        <View style={styles.tripHeader}>
          <View style={styles.tripLocation}>
            <View style={styles.locationDot} />
            <View style={styles.locationInfo}>
              <Text style={styles.pickupText} numberOfLines={1}>{trip.pickupLocation}</Text>
              <Text style={styles.arrow}>↓</Text>
              <Text style={styles.dropoffText} numberOfLines={1}>{trip.dropoffLocation}</Text>
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

  const filteredTrips = trips.filter((trip) => {
    if (activeFilter === 'completed') {
      return trip.status === 'completed'
    } else if (activeFilter === 'upcoming') {
      return trip.status === 'upcoming'
    }
    return true
  })

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Chuyến đi</Text>
        </View>

        <View style={styles.filterTabs}>
          <TouchableOpacity 
            style={activeFilter === 'all' ? styles.filterTabActive : styles.filterTab}
            onPress={() => setActiveFilter('all')}
          >
            <Text style={activeFilter === 'all' ? styles.filterTabTextActive : styles.filterTabText}>Tất cả</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={activeFilter === 'completed' ? styles.filterTabActive : styles.filterTab}
            onPress={() => setActiveFilter('completed')}
          >
            <Text style={activeFilter === 'completed' ? styles.filterTabTextActive : styles.filterTabText}>Hoàn thành</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={activeFilter === 'upcoming' ? styles.filterTabActive : styles.filterTab}
            onPress={() => setActiveFilter('upcoming')}
          >
            <Text style={activeFilter === 'upcoming' ? styles.filterTabTextActive : styles.filterTabText}>Sắp tới</Text>
          </TouchableOpacity>
        </View>

        {/* Loading State */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Đang tải danh sách chuyến đi...</Text>
          </View>
        )}

        {/* Error State */}
        {error && !loading && (
          <View style={styles.errorContainer}>
            <MaterialIcons name="error-outline" size={48} color={COLORS.danger} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchTrips}>
              <Text style={styles.retryButtonText}>Thử lại</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Trips List */}
        {!loading && !error && (
          <>
            {filteredTrips.length > 0 ? (
              <View style={styles.tripsList}>
                {filteredTrips.map((trip) => renderTripCard(trip))}
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <MaterialIcons name="directions-car" size={48} color={COLORS.textSecondary} />
                <Text style={styles.emptyText}>Chưa có chuyến đi nào</Text>
              </View>
            )}
          </>
        )}
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
    paddingTop: SPACING.xl,
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
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl * 2,
  },
  loadingText: {
    marginTop: SPACING.lg,
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl * 2,
  },
  errorText: {
    marginTop: SPACING.lg,
    color: COLORS.danger,
    fontSize: 14,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
  },
  retryButtonText: {
    color: COLORS.white,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl * 2,
  },
  emptyText: {
    marginTop: SPACING.lg,
    color: COLORS.textSecondary,
    fontSize: 14,
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
