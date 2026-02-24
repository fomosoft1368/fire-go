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
  sourceType?: 'ride' | 'combined_trip' | 'delivery' // Track which type of trip
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
      const formattedTrips = (Array.isArray(filteredTripsData) ? filteredTripsData : []).map((ride: any) => {
        // Safely handle distance - could be number, string, or undefined
        let formattedDistance = '0 km'
        if (ride.distance !== undefined && ride.distance !== null) {
          try {
            const numDistance = typeof ride.distance === 'number' ? ride.distance : parseFloat(ride.distance)
            formattedDistance = !isNaN(numDistance) ? `${numDistance.toFixed(1)} km` : '0 km'
          } catch {
            formattedDistance = '0 km'
          }
        }

        return {
          _id: ride._id,
          id: ride._id || ride.id,
          status: ride.status || 'completed',
          pickupLocation: ride.pickupAddress || 'Điểm đón',
          dropoffLocation: ride.dropoffAddress || ride.dropoffLocationAddress || 'Địa điểm đến',
          pickupAddress: ride.pickupAddress,
          dropoffAddress: ride.dropoffAddress || ride.dropoffLocationAddress,
          distance: formattedDistance,
          amount: ride.totalFare || ride.fare || 0,
          totalFare: ride.totalFare || ride.fare,
          date: formatDate(ride.createdAt || ride.date),
          rating: ride.rating,
          customerName: ride.customerName,
          sourceType: ride.sourceType || 'ride', // Default to 'ride' if undefined
        }
      })

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
      completed: { label: 'Hoàn thành', color: '#10b981', icon: 'check-circle' },
      cancelled: { label: 'Đã hủy', color: '#ef4444', icon: 'cancel' },
      upcoming: { label: 'Sắp tới', color: '#f59e0b', icon: 'schedule' },
      pending: { label: 'Chờ xử lý', color: '#f59e0b', icon: 'hourglass-empty' },
      accepted: { label: 'Đã chấp nhận', color: '#FF6B00', icon: 'thumb-up' },
      in_progress: { label: 'Đang thực hiện', color: '#FF6B00', icon: 'directions-car' },
    }

    const config = statusConfig[trip.status] || { label: trip.status || 'Không xác định', color: '#64748b', icon: 'help' }
    
    // Get sourceType with default fallback
    const tripSourceType = trip.sourceType || 'ride'

    const handleViewDetails = () => {
      console.log('📍 View trip details:', { 
        tripId: trip.id || trip._id, 
        sourceType: trip.sourceType 
      })
      
      // Get sourceType with default fallback
      const tripSourceType = trip.sourceType || 'ride'
      
      // Navigate based on trip type
      if (tripSourceType === 'combined_trip') {
        // Xe ghép -> ActiveRideScreen
        // @ts-ignore
        navigation.navigate('ActiveRideScreen', { 
          combinedTripId: trip.id || trip._id,
          sourceType: 'combined_trip'
        })
      } else if (tripSourceType === 'delivery') {
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
        {/* Trip Type Badge - Top Right */}
        <View style={[
          styles.tripTypeBadge,
          { backgroundColor: tripSourceType === 'combined_trip' ? '#10b981' : tripSourceType === 'delivery' ? '#f59e0b' : '#6366f1' }
        ]}>
          <MaterialIcons 
            name={tripSourceType === 'combined_trip' ? 'group' : tripSourceType === 'delivery' ? 'local-shipping' : 'drive-eta'}
            size={14}
            color="#fff"
          />
          <Text style={styles.tripTypeBadgeText}>
            {tripSourceType === 'combined_trip' ? 'Ghép xe' : tripSourceType === 'delivery' ? 'Giao hàng' : 'Lái xe hộ'}
          </Text>
        </View>

        {/* Location Section */}
        <View style={styles.locationSection}>
          <View style={styles.locationRow}>
            <View style={styles.locationIconWrapper}>
              <View style={styles.pickupDot} />
            </View>
            <View style={styles.locationTextWrapper}>
              <Text style={styles.locationLabel}>Điểm đón</Text>
              <Text style={styles.locationText} numberOfLines={1}>{trip.pickupLocation}</Text>
            </View>
          </View>
          
          <View style={styles.locationConnector} />
          
          <View style={styles.locationRow}>
            <View style={styles.locationIconWrapper}>
              <MaterialIcons name="location-on" size={20} color="#FF6B00" />
            </View>
            <View style={styles.locationTextWrapper}>
              <Text style={styles.locationLabel}>Điểm đến</Text>
              <Text style={styles.locationText} numberOfLines={1}>{trip.dropoffLocation}</Text>
            </View>
          </View>
        </View>

        {/* Info Row */}
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <View style={styles.infoIconBox}>
              <MaterialIcons name="route" size={18} color="#FF6B00" />
            </View>
            <Text style={styles.infoText}>{trip.distance}</Text>
          </View>
          
          <View style={styles.infoItem}>
            <View style={styles.infoIconBox}>
              <MaterialIcons name="schedule" size={18} color="#64748b" />
            </View>
            <Text style={styles.infoText}>{trip.date}</Text>
          </View>
        </View>

        {/* Bottom Section */}
        <View style={styles.bottomSection}>
          <View style={[styles.statusChip, { backgroundColor: config.color + '15' }]}>
            <MaterialIcons name={config.icon} size={16} color={config.color} />
            <Text style={[styles.statusChipText, { color: config.color }]}>{config.label}</Text>
          </View>
          
          <View style={styles.amountBox}>
            <Text style={styles.amountLabel}>Thu nhập</Text>
            <Text style={styles.amountValue}>{trip.amount.toLocaleString('vi-VN')}đ</Text>
          </View>
        </View>

        {trip.rating && (
          <View style={styles.ratingBanner}>
            <MaterialIcons name="star" size={16} color="#fbbf24" />
            <Text style={styles.ratingText}>Đánh giá: {trip.rating}/5</Text>
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
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Chuyến đi của tôi</Text>
            <Text style={styles.subtitle}>{filteredTrips.length} chuyến đi</Text>
          </View>
          <TouchableOpacity style={styles.filterIconButton}>
            <MaterialIcons name="filter-list" size={24} color="#0f172a" />
          </TouchableOpacity>
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterContainer}>
          <TouchableOpacity 
            style={[styles.filterTab, activeFilter === 'all' && styles.filterTabActive]}
            onPress={() => setActiveFilter('all')}
            activeOpacity={0.7}
          >
            <MaterialIcons 
              name="apps" 
              size={20} 
              color={activeFilter === 'all' ? '#fff' : '#64748b'} 
            />
            <Text style={[styles.filterTabText, activeFilter === 'all' && styles.filterTabTextActive]}>
              Tất cả
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.filterTab, activeFilter === 'completed' && styles.filterTabActive]}
            onPress={() => setActiveFilter('completed')}
            activeOpacity={0.7}
          >
            <MaterialIcons 
              name="check-circle" 
              size={20} 
              color={activeFilter === 'completed' ? '#fff' : '#64748b'} 
            />
            <Text style={[styles.filterTabText, activeFilter === 'completed' && styles.filterTabTextActive]}>
              Hoàn thành
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.filterTab, activeFilter === 'upcoming' && styles.filterTabActive]}
            onPress={() => setActiveFilter('upcoming')}
            activeOpacity={0.7}
          >
            <MaterialIcons 
              name="schedule" 
              size={20} 
              color={activeFilter === 'upcoming' ? '#fff' : '#64748b'} 
            />
            <Text style={[styles.filterTabText, activeFilter === 'upcoming' && styles.filterTabTextActive]}>
              Sắp tới
            </Text>
          </TouchableOpacity>
        </View>

        {/* Loading State */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FF6B00" />
            <Text style={styles.loadingText}>Đang tải danh sách chuyến đi...</Text>
          </View>
        )}

        {/* Error State */}
        {error && !loading && (
          <View style={styles.errorContainer}>
            <View style={styles.errorIconBox}>
              <MaterialIcons name="error-outline" size={56} color="#ef4444" />
            </View>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchTrips}>
              <MaterialIcons name="refresh" size={20} color="#fff" />
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
                <View style={styles.emptyIconBox}>
                  <MaterialIcons name="inbox" size={56} color="#cbd5e1" />
                </View>
                <Text style={styles.emptyText}>Chưa có chuyến đi nào</Text>
                <Text style={styles.emptySubText}>Các chuyến đi của bạn sẽ hiển thị ở đây</Text>
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
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  filterIconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterContainer: {
    flexDirection: 'row',
    gap: SPACING.md,
    paddingHorizontal: SPACING.xl,
    marginTop: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  filterTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: 12,
    backgroundColor: '#f1f5f9',
    borderRadius: 24,
  },
  filterTabActive: {
    backgroundColor: '#FF6B00',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: -0.2,
  },
  filterTabTextActive: {
    color: '#fff',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl * 3,
  },
  loadingText: {
    marginTop: SPACING.lg,
    color: '#64748b',
    fontSize: 15,
    fontWeight: '500',
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl * 3,
    paddingHorizontal: SPACING.xl,
  },
  errorText: {
    marginTop: SPACING.lg,
    color: '#ef4444',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    backgroundColor: '#FF6B00',
    borderRadius: 24,
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl * 3,
    paddingHorizontal: SPACING.xl,
  },
  emptyText: {
    marginTop: SPACING.lg,
    color: '#0f172a',
    fontSize: 17,
    fontWeight: '700',
  },
  emptySubText: {
    marginTop: SPACING.sm,
    color: '#64748b',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  emptyIconBox: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorIconBox: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tripsList: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xl,
  },
  tripCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    position: 'relative',
    overflow: 'visible',
  },
  tripTypeBadge: {
    position: 'absolute',
    top: -8,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  tripTypeBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#fff',
  },
  locationSection: {
    marginBottom: SPACING.lg,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
  },
  locationIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  pickupDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10b981',
  },
  locationConnector: {
    width: 2,
    height: 16,
    backgroundColor: '#e2e8f0',
    marginLeft: 15,
    marginVertical: 4,
  },
  locationTextWrapper: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  locationText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: -0.2,
  },
  infoRow: {
    flexDirection: 'row',
    gap: SPACING.lg,
    marginBottom: SPACING.lg,
    paddingBottom: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  infoIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff5eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
  },
  bottomSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
  },
  statusChipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  amountBox: {
    alignItems: 'flex-end',
  },
  amountLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 2,
  },
  amountValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FF6B00',
    letterSpacing: -0.5,
  },
  ratingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: '#fef3c7',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 12,
    marginTop: SPACING.md,
  },
  ratingText: {
    fontSize: 13,
    color: '#92400e',
    fontWeight: '700',
  },
})
