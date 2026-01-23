import { useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  FlatList,
  ActivityIndicator,
  Alert,
  Animated,
  ScrollView,
  Image,
} from 'react-native'
import { useRoute } from '@react-navigation/native'
import { MaterialIcons } from '@expo/vector-icons'
import { useSelector } from 'react-redux'
import type { RootState } from '../redux/store'
import { COLORS_DARK, COLORS_LIGHT, SPACING, BORDER_RADIUS } from '../constants'
import { combinedTripsService } from '../services/combinedTripsService'

export default function FindingRideScreen({ navigation }: any) {
  const route = useRoute()
  const params = route.params as any
  
  const pickupAddress = params?.pickupAddress ?? ''
  const dropoffAddress = params?.dropoffAddress ?? ''
  const distance = params?.distance ?? 0
  const duration = params?.duration ?? 0
  const startLng = params?.startLng ?? 105.8542  // Default Hanoi
  const startLat = params?.startLat ?? 21.0285
  const endLng = params?.endLng ?? 105.8542  // Customer's dropoff longitude
  const endLat = params?.endLat ?? 21.0285  // Customer's dropoff latitude

  const themeMode = useSelector((state: RootState) => state.theme.mode)
  const colors = themeMode === 'dark' ? COLORS_DARK : COLORS_LIGHT
  const user = useSelector((state: RootState) => state.auth.user)

  // State
  const [rides, setRides] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isScanning, setIsScanning] = useState(true)
  const [activeFilter, setActiveFilter] = useState('all')
  
  // Animation
  const scanAnim = useRef(new Animated.Value(0)).current
  const isMountedRef = useRef(true)
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Fetch SHARE rides on mount
  useEffect(() => {
    isMountedRef.current = true
    fetchShareRides()
    
    // Setup auto-refresh every 30 seconds
    refreshIntervalRef.current = setInterval(() => {
      if (isMountedRef.current) {
        console.log('[FindingRideScreen] Auto-refreshing rides...')
        fetchShareRides(false)
      }
    }, 30000)
    
    // Scanning animation
    startScanAnimation()
    
    return () => {
      isMountedRef.current = false
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
      }
    }
  }, [])

  const startScanAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(scanAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    ).start()
  }

  const scanOpacity = scanAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0.8, 0],
  })

  const scanScale = scanAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 1.5],
  })

  const fetchShareRides = async (showLoading: boolean = true) => {
    try {
      if (showLoading) {
        setLoading(true)
      }
      setError('')

      if (!pickupAddress.trim()) {
        setError('Vui lòng nhập điểm đón')
setLoading(false)
        return
      }

      console.log('[FindingRideScreen] Fetching COMBINED TRIPS for:', {
        pickupAddress,
        latitude: startLat,
        longitude: startLng,
      })

      const result = await combinedTripsService.findCombinedTrips(startLng, startLat, pickupAddress, 10000)
      console.log('[FindingRideScreen] Found combined trips:', result.length)

      // Map and enrich ride data with safe defaults
      const enrichedRides = result.map((trip: any) => ({
        ...trip,
        pickupAddress: trip.pickupAddress || trip.pickup || pickupAddress,
        dropoffAddress: trip.dropoffAddress || 'Địa điểm đến',
        driverId: trip.driverId || { name: 'Tài xế', firstName: 'Tài', lastName: 'xế', rating: 5, totalReviews: 0 },
        totalFare: trip.totalFare || trip.baseFare || 50000,
        distance: trip.distance || 5,
        totalSeats: trip.totalSeats || 4,
        availableSeats: (trip.totalSeats || 4) - (trip.customerId?.length || 0),
        pickupCoordinates: trip.pickupCoordinates || [startLng, startLat],
        dropoffCoordinates: trip.dropoffCoordinates || [startLng + 0.05, startLat + 0.05],
        estimatedDuration: trip.duration || 600,
        baseFare: trip.baseFare || 50000,
        customerId: trip.customerId || [],
      }))

      if (isMountedRef.current) {
        setRides(enrichedRides)
        setIsScanning(false)
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        console.error('[FindingRideScreen] Fetch error:', err)
        setError(err.message || 'Không thể tải danh sách chuyến xe')
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false)
      }
    }
  }

  const handleSelectRide = (trip: any) => {
    // Navigate to ride detail screen to request joining
    console.log('[FindingRideScreen] Selecting combined trip with customer coordinates:', {
      combinedTripId: trip._id,
      pickupCoordinates: [startLng, startLat],
      dropoffCoordinates: [endLng, endLat],  // ✅ Use CUSTOMER's dropoff, not trip's
    })
    navigation.navigate('RideDetailRequest', {
      combinedTripId: trip._id,
      ride: trip,
      pickupCoordinates: [startLng, startLat],
      dropoffCoordinates: [endLng, endLat],  // ✅ Use CUSTOMER's dropoff, not trip's
      pickupAddress: pickupAddress,
      dropoffAddress: dropoffAddress,
      tripType: 'combined_trip',
    })
  }

  const rideItem = ({ item, index }: { item: any; index: number }) => {
    const isFirstCard = index === 0
    return (
      <TouchableOpacity
        style={[
          styles.rideCard,
          {
            backgroundColor: colors.bgSecondary,
            borderColor: colors.border,
          },
          isFirstCard && styles.bestMatchCard,
        ]}
        activeOpacity={0.7}
        onPress={() => handleSelectRide(item)}
      >
        {/* Best Match Badge */}
        {isFirstCard && (
          <View style={styles.bestMatchBadge}>
            <Text style={styles.badgeText}>PHÙ HỢP NHẤT</Text>
          </View>
        )}

        {/* Card Header */}
        <View style={styles.cardHeader}>
          {/* Driver Info */}
          <View style={styles.driverSection}>
            <View style={[styles.driverAvatar, { borderColor: isFirstCard ? '#38e07b' : colors.border }]}>
              <MaterialIcons name="person" size={32} color={colors.textSecondary} />
            </View>
            <View style={styles.driverInfo}>
              <Text style={[styles.driverName, { color: colors.text }]}>
                {item.driverId?.firstName || 'Tài'} {item.driverId?.lastName || 'xế'}
              </Text>
              <View style={styles.driverMeta}>
                <View style={styles.ratingBadge}>
                  <Text style={styles.ratingBadgeText}>
                    {item.driverId?.rating?.toFixed(1) || '5.0'}
                  </Text>
                </View>
                <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                  • {item.driverId?.vehicleModel || 'Xe'} • {isFirstCard ? 'Đang online' : 'Chờ 10 phút'}
                </Text>
              </View>
            </View>
          </View>

          {/* Price */}
          <View style={styles.priceSection}>
            <Text style={styles.price}>₫{(item.baseFare || 0).toLocaleString('vi-VN')}</Text>
            {isFirstCard && (
              <Text style={styles.oldPrice}>₫{Math.round((item.baseFare || 0) * 1.2).toLocaleString('vi-VN')}</Text>
            )}
          </View>
        </View>

        {/* Match & Metrics Bar */}
        {isFirstCard && (
          <View style={[styles.metricsBar, { backgroundColor: colors.bg + '40', borderColor: colors.border }]}>
            <View style={styles.matchSection}>
              <View style={styles.progressBarContainer}>
                <Text style={styles.matchPercent}>98% Trùng khớp</Text>
                <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                  <View
                    style={[
                      styles.progressFill,
                      { backgroundColor: '#38e07b', width: '98%' },
                    ]}
                  />
                </View>
              </View>
            </View>
            <View style={[styles.metricsDivider, { backgroundColor: colors.border }]} />
            <View style={styles.seatsSection}>
              <Text style={[styles.seatsNumber, { color: colors.text }]}>
                {item.availableSeats || 1}
              </Text>
              <Text style={[styles.seatsLabel, { color: colors.textSecondary }]}>Ghế trống</Text>
            </View>
          </View>
        )}

        {/* Info Tags */}
        {!isFirstCard && (
          <View style={styles.infoTags}>
            <View style={[styles.tag, { backgroundColor: colors.bg }]}>
              <Text style={[styles.tagText, { color: colors.textSecondary }]}>85% Trùng đường</Text>
            </View>
            <View style={[styles.tag, { backgroundColor: colors.bg }]}>
              <Text style={[styles.tagText, { color: colors.textSecondary }]}>Chờ 15p</Text>
            </View>
            <View style={[styles.tag, { backgroundColor: colors.bg }]}>
              <Text style={[styles.tagText, { color: colors.textSecondary }]}>{item.availableSeats || 1} Ghế</Text>
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {isFirstCard ? (
            <>
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: '#38e07b' }]}
                onPress={() => handleSelectRide(item)}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryButtonText}>Ghép ngay</Text>
                <MaterialIcons name="arrow-forward" size={18} color="#000" />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.secondaryButton, { borderColor: colors.border }]}>
                <MaterialIcons name="chat" size={20} color={colors.text} />
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={[styles.secondaryFullButton, { backgroundColor: colors.bg, borderColor: colors.border }]}
              onPress={() => handleSelectRide(item)}
            >
              <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Xem chi tiết</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    )
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar
        barStyle={themeMode === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={colors.bg}
      />

      {/* Header with Route Info */}
      <View style={[styles.header, { backgroundColor: colors.bgSecondary, borderBottomColor: colors.border }]}>
        {/* Back Button */}
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerMeta, { color: colors.textSecondary }]}>
            Hôm nay, 1 Người
          </Text>
          <TouchableOpacity>
            <MaterialIcons name="tune" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Route Visualization */}
        <View style={styles.routeVisualization}>
          <View style={styles.routeMarkers}>
            <View style={styles.pickupMarker}>
              <View style={[styles.markerDot, { borderColor: '#38e07b' }]} />
            </View>
            <View style={styles.routeConnector} />
            <View style={styles.dropoffMarker}>
              <View style={[styles.markerDot, { backgroundColor: '#fff' }]} />
            </View>
          </View>

          <View style={styles.routeLabels}>
            <View>
              <Text style={[styles.routeLabel, { color: colors.textSecondary }]}>Điểm đón</Text>
              <Text style={[styles.routeAddress, { color: colors.text }]} numberOfLines={1}>
                {pickupAddress}
              </Text>
            </View>
            <View style={styles.distanceBadge}>
              <Text style={styles.distanceText}>~{distance.toFixed(0)}km</Text>
            </View>
            <View>
              <Text style={[styles.routeLabel, { color: colors.textSecondary }]}>Điểm đến</Text>
              <Text style={[styles.routeAddress, { color: colors.text }]} numberOfLines={1}>
                {dropoffAddress}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.filterScroll, { backgroundColor: colors.bgSecondary }]}
        contentContainerStyle={styles.filterContainer}
      >
        {[
          { id: 'all', label: 'Tất cả', icon: 'bolt' },
          { id: 'cheap', label: 'Giá rẻ nhất', icon: null },
          { id: 'female', label: 'Tài xế nữ', icon: 'female' },
          { id: '5star', label: '5.0 Sao', icon: 'star' },
          { id: 'van', label: 'Xe 7 chỗ', icon: 'airport_shuttle' },
        ].map((filter) => (
          <TouchableOpacity
            key={filter.id}
            style={[
              styles.filterChip,
              {
                backgroundColor: activeFilter === filter.id ? '#38e07b' : colors.bg,
                borderColor: activeFilter === filter.id ? '#38e07b' : colors.border,
              },
            ]}
            onPress={() => setActiveFilter(filter.id)}
          >
            {filter.icon && (
              <MaterialIcons
                name={filter.icon as any}
                size={16}
                color={activeFilter === filter.id ? '#000' : colors.text}
              />
            )}
            <Text
              style={[
                styles.filterText,
                { color: activeFilter === filter.id ? '#000' : colors.text },
              ]}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Results Header */}
      <View style={[styles.resultsHeader, { borderBottomColor: colors.border }]}>
        <Text style={[styles.resultsTitle, { color: colors.text }]}>
          Kết quả: {rides.length} chuyến
        </Text>
        <Text style={[styles.sortText, { color: '#38e07b' }]}>Sắp xếp: Phù hợp nhất</Text>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#38e07b" />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Đang tải chuyến xe...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={48} color={colors.textSecondary} />
          <Text style={[styles.errorText, { color: colors.text }]}>{error}</Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: '#38e07b' }]}
            onPress={() => fetchShareRides()}
          >
            <Text style={styles.retryButtonText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={rides}
          renderItem={rideItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          scrollEnabled={true}
          ListFooterComponent={
            rides.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={[styles.emptyIcon, { backgroundColor: colors.bgSecondary }]}>
                  <MaterialIcons name="radar" size={32} color={colors.textSecondary} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  Không tìm thấy chuyến phù hợp?
                </Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                  Thử mở rộng bán kính tìm kiếm hoặc thay đổi thời gian xuất phát.
                </Text>
                <TouchableOpacity>
                  <Text style={styles.expandLink}>Mở rộng tìm kiếm</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.promoCard}>
                <View style={styles.promoContent}>
                  <View style={styles.promoIcon}>
                    <MaterialIcons name="directions-car" size={24} color="#fff" />
                  </View>
                  <View style={styles.promoText}>
                    <Text style={styles.promoTitle}>Bạn đã có xe?</Text>
                    <Text style={styles.promoSubtitle}>Thuê tài xế lái xe của bạn về nhà an toàn.</Text>
                  </View>
                  <TouchableOpacity style={styles.promoButton}>
                    <Text style={styles.promoButtonText}>Đặt Tài Xế</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )
          }
        />
      )}
    </SafeAreaView>
  )
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.lg,
    borderBottomWidth: 1,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  headerMeta: {
    fontSize: 12,
    fontWeight: '500',
  },
  routeVisualization: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
  },
  routeMarkers: {
    alignItems: 'center',
    gap: 12,
  },
  pickupMarker: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropoffMarker: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  markerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 3,
  },
  routeConnector: {
    width: 2,
    height: 32,
    backgroundColor: '#38e07b',
    opacity: 0.5,
  },
  routeLabels: {
    flex: 1,
    gap: SPACING.lg,
  },
  routeLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  routeAddress: {
    fontSize: 14,
    fontWeight: '700',
  },
  distanceBadge: {
    backgroundColor: '#38e07b20',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.lg,
    alignSelf: 'flex-start',
  },
  distanceText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#38e07b',
  },

  /* Filter Chips */
  filterScroll: {
    backgroundColor: 'transparent',
  },
  filterContainer: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
    borderWidth: 1,
    gap: SPACING.xs,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '500',
  },

  /* Results Header */
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  sortText: {
    fontSize: 12,
    fontWeight: '500',
  },

  /* Ride Card */
  rideCard: {
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    marginBottom: SPACING.md,
  },
  bestMatchCard: {
    borderWidth: 1,
    position: 'relative',
    overflow: 'visible',
  },
  bestMatchBadge: {
    position: 'absolute',
    top: -10,
    left: SPACING.lg,
    backgroundColor: '#38e07b',
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.md,
    zIndex: 10,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#000',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.lg,
    marginTop: SPACING.xs,
  },
  driverSection: {
    flex: 1,
    flexDirection: 'row',
    gap: SPACING.md,
  },
  driverAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a2b22',
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  driverMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  ratingBadge: {
    backgroundColor: '#ffffff10',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  ratingBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  metaText: {
    fontSize: 12,
  },
  priceSection: {
    alignItems: 'flex-end',
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  oldPrice: {
    fontSize: 11,
    fontWeight: '400',
    color: '#888',
    textDecorationLine: 'line-through',
  },

  /* Metrics Bar */
  metricsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    marginBottom: SPACING.lg,
  },
  matchSection: {
    flex: 1,
  },
  progressBarContainer: {
    gap: 6,
  },
  matchPercent: {
    fontSize: 11,
    fontWeight: '700',
    color: '#38e07b',
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  metricsDivider: {
    width: 1,
    height: 40,
    marginHorizontal: SPACING.md,
    opacity: 0.2,
  },
  seatsSection: {
    alignItems: 'center',
    gap: 4,
  },
  seatsNumber: {
    fontSize: 14,
    fontWeight: '700',
  },
  seatsLabel: {
    fontSize: 10,
    fontWeight: '500',
    textTransform: 'uppercase',
  },

  /* Info Tags */
  infoTags: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  tag: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.md,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '500',
  },

  /* Action Buttons */
  actionButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.md,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.xl,
    gap: SPACING.sm,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
  },
  secondaryButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryFullButton: {
    width: '100%',
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
  },
  errorText: {
    marginTop: SPACING.md,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: SPACING.xl,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  retryButtonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xl,
    gap: SPACING.sm,
  },

  /* Empty State */
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
    paddingHorizontal: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: '#ffffff10',
    marginTop: SPACING.lg,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: SPACING.sm,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  expandLink: {
    fontSize: 13,
    fontWeight: '700',
    color: '#38e07b',
  },

  /* Promo Card */
  promoCard: {
    marginTop: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  promoContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderRadius: BORDER_RADIUS.xl,
    backgroundColor: '#ff6b3520',
    borderWidth: 1,
    borderColor: '#ff6b3520',
  },
  promoIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ff6b35',
    justifyContent: 'center',
    alignItems: 'center',
  },
  promoText: {
    flex: 1,
  },
  promoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    marginBottom: SPACING.xs,
  },
  promoSubtitle: {
    fontSize: 12,
    color: '#ffb3a1',
  },
  promoButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: '#fff',
    borderRadius: BORDER_RADIUS.lg,
  },
  promoButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ff6b35',
  },
})