import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { useSelector } from 'react-redux'
import { COLORS, SPACING, BORDER_RADIUS } from '../constants'
import { driverService } from '../services/driverService'
import type { RootState } from '../redux/store'

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
  sourceType?: 'ride' | 'combined_trip' // Track which type of trip
}

export default function TripsScreen() {
  const navigation = useNavigation()
  const { user } = useSelector((state: RootState) => state.auth)
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
      
      if (!user?.id) {
        console.warn('⚠️ No user ID available')
        setError('Chưa đăng nhập')
        return
      }

      console.log('📱 Fetching trips with filter:', activeFilter, 'userId:', user.id)
      
      // Fetch trips from all sources - pass driverId for backend filtering
      const [allRides, allCombinedTrips, allDeliveries] = await Promise.all([
        driverService.getCompletedTrips(user.id),
        driverService.getCompletedCombinedTrips(user.id),
        driverService.getCompletedDeliveries(user.id),
      ])

      console.log('📊 All rides từ API:', allRides.length)
      if (allRides.length > 0) {
        console.log('📊 Sample ride:', JSON.stringify(allRides[0], null, 2))
      }
      console.log('📊 All combined trips từ API:', allCombinedTrips.length)
      if (allCombinedTrips.length > 0) {
        console.log('📊 Sample combined trip:', JSON.stringify(allCombinedTrips[0], null, 2))
      }
      console.log('📊 All deliveries từ API:', allDeliveries.length)
      if (allDeliveries.length > 0) {
        console.log('📊 Sample delivery:', JSON.stringify(allDeliveries[0], null, 2))
      }
      console.log('👤 User ID hiện tại:', user.id)

      // No need for client-side filtering now - backend already filtered by driverId
      const myRides = allRides
      const myCombinedTrips = allCombinedTrips
      const myDeliveries = allDeliveries

      let allTripsData: any[] = [
        ...myRides.map((r: any) => ({ ...r, sourceType: 'ride' })),
        ...myCombinedTrips.map((c: any) => ({ ...c, sourceType: 'combined_trip' })),
        ...myDeliveries.map((d: any) => ({ ...d, sourceType: 'delivery' })),
      ]

      console.log('✅ My rides:', myRides.length)
      console.log('✅ My combined trips:', myCombinedTrips.length)
      console.log('✅ My deliveries:', myDeliveries.length)
      console.log('✅ Total my trips:', allTripsData.length)
      
      // STRICT filter: ONLY trips where I am THE driver
      // For combined trips: customer creates trip -> driverId is NULL
      //                     driver accepts -> driverId is SET to driver's ID
      // So we ONLY see combined trips we've accepted (driverId === user.id)
      const filteredTripsData = allTripsData.filter((trip: any) => {
        const tripDriverId = typeof trip.driverId === 'string' ? trip.driverId : trip.driverId?._id
        // MUST have driverId AND must match current user
        const isMyTrip = tripDriverId && String(tripDriverId) === String(user.id)
        
        if (!isMyTrip) {
          console.warn(`⚠️ Trip ${trip._id} filtered out - driverId: ${tripDriverId}, user: ${user.id}, sourceType: ${trip.sourceType}`)
        }
        return isMyTrip
      })
      
      console.log('✅ After client-side filter:', filteredTripsData.length)
      console.log('🔍 Trips sourceType check:', filteredTripsData.map(t => ({ 
        id: t._id, 
        sourceType: t.sourceType,
        status: t.status,
        driverId: typeof t.driverId === 'string' ? t.driverId : t.driverId?._id
      })))
      
      // Format dữ liệu từ API thành Trip interface
      const formattedTrips = (Array.isArray(filteredTripsData) ? filteredTripsData : []).map((ride: any) => ({
        _id: ride._id,
        id: ride._id || ride.id,
        status: ride.status || 'completed',
        pickupLocation: ride.pickupAddress || 'Điểm đón',
        dropoffLocation: ride.dropoffAddress || ride.dropoffLocationAddress || 'Địa điểm đến',
        pickupAddress: ride.pickupAddress,
        dropoffAddress: ride.dropoffAddress || ride.dropoffLocationAddress,
        distance: ride.distance ? `${ride.distance.toFixed(1)} km` : '0 km',
        amount: ride.totalFare || ride.fare || 0,
        totalFare: ride.totalFare || ride.fare,
        date: formatDate(ride.createdAt || ride.date),
        rating: ride.rating,
        customerName: ride.customerName,
        sourceType: ride.sourceType,
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
    const statusConfig: any = {
      completed: { label: 'Hoàn thành', color: COLORS.success },
      cancelled: { label: 'Đã hủy', color: COLORS.danger },
      upcoming: { label: 'Sắp tới', color: COLORS.warning },
      pending: { label: 'Chờ xử lý', color: COLORS.warning },
      accepted: { label: 'Đã chấp nhận', color: COLORS.primary },
      in_progress: { label: 'Đang thực hiện', color: COLORS.primary },
    }

    const config = statusConfig[trip.status] || { label: trip.status || 'Không xác định', color: COLORS.textSecondary }

    const handleViewDetails = () => {
      console.log('📍 View trip details:', { 
        tripId: trip.id || trip._id, 
        sourceType: trip.sourceType 
      })
      
      // Navigate based on trip type
      if (trip.sourceType === 'combined_trip') {
        // Xe ghép -> ActiveRideScreen
        // @ts-ignore
        navigation.navigate('ActiveRideScreen', { 
          combinedTripId: trip.id || trip._id,
          sourceType: 'combined_trip'
        })
      } else if (trip.sourceType === 'delivery') {
        // Giao hàng -> DeliveryDetailScreen
        // @ts-ignore
        navigation.navigate('DeliveryDetailScreen', { 
          deliveryId: trip.id || trip._id,
          sourceType: 'delivery'
        })
      } else {
        // Lái xe hộ -> ActiveDelivery (fix: screen name is "ActiveDelivery" not "ActiveDeliveryScreen")
        // @ts-ignore
        navigation.navigate('ActiveDelivery', { 
          tripId: trip.id || trip._id,
          sourceType: 'ride'
        })
      }
    }

    return (
      <TouchableOpacity 
        key={trip.id || trip._id} 
        style={styles.tripCard}
        onPress={handleViewDetails}
        activeOpacity={0.7}
      >
        <View style={styles.tripHeader}>
          <View style={styles.tripLocation}>
            <View style={styles.locationDot} />
            <View style={styles.locationInfo}>
              <Text style={styles.pickupText} numberOfLines={1}>{trip.pickupLocation}</Text>
              <Text style={styles.arrow}>↓</Text>
              <Text style={styles.dropoffText} numberOfLines={1}>{trip.dropoffLocation}</Text>
            </View>
          </View>
          <View style={styles.badgesContainer}>
            {/* Trip Type Badge */}
            <View style={[
              styles.typeBadge, 
              { backgroundColor: trip.sourceType === 'combined_trip' ? '#10b98120' : trip.sourceType === 'delivery' ? '#f5931120' : '#6366f120' }
            ]}>
              <Text style={[
                styles.typeBadgeText,
                { color: trip.sourceType === 'combined_trip' ? COLORS.success : trip.sourceType === 'delivery' ? '#f59311' : '#6366f1' }
              ]}>
                {trip.sourceType === 'combined_trip' ? 'Ghép xe' : trip.sourceType === 'delivery' ? 'Đặt hàng' : 'Lái xe hộ'}
              </Text>
            </View>
            
            {/* Status Badge */}
            <View style={[styles.statusBadge, { backgroundColor: config.color + '20' }]}>
              <Text style={[styles.statusText, { color: config.color }]}>{config.label}</Text>
            </View>
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
      </TouchableOpacity>
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
    color: '#fff',
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
  badgesContainer: {
    flexDirection: 'column',
    gap: SPACING.xs,
    alignItems: 'flex-end',
  },
  typeBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
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
