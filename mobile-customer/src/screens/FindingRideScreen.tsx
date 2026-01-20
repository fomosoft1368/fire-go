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
} from 'react-native'
import { useRoute } from '@react-navigation/native'
import { MaterialIcons } from '@expo/vector-icons'
import { useSelector } from 'react-redux'
import type { RootState } from '../redux/store'
import { COLORS_DARK, COLORS_LIGHT, SPACING, BORDER_RADIUS } from '../constants'
import { rideService } from '../services/rideService'

export default function FindingRideScreen({ navigation }: any) {
  const route = useRoute()
  const params = route.params as any
  
  const pickupAddress = params?.pickupAddress ?? ''
  const dropoffAddress = params?.dropoffAddress ?? ''
  const distance = params?.distance ?? 0
  const duration = params?.duration ?? 0
  const startLng = params?.startLng ?? 105.8542  // Default Hanoi
  const startLat = params?.startLat ?? 21.0285

  const themeMode = useSelector((state: RootState) => state.theme.mode)
  const colors = themeMode === 'dark' ? COLORS_DARK : COLORS_LIGHT
  const user = useSelector((state: RootState) => state.auth.user)

  // State
  const [rides, setRides] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isScanning, setIsScanning] = useState(true)
  
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

      console.log('[FindingRideScreen] Fetching SHARE rides for:', {
        pickupAddress,
        latitude: startLat,
        longitude: startLng,
      })

      const result = await rideService.findShareRides(startLng, startLat, pickupAddress, 10000)
      console.log('[FindingRideScreen] Found rides:', result.length)

      // Map and enrich ride data with safe defaults
      const enrichedRides = result.map((ride: any) => ({
        ...ride,
        pickupAddress: ride.pickupAddress || ride.pickup || pickupAddress,
        dropoffAddress: ride.dropoffAddress || 'Địa điểm đến',
        driverId: ride.driverId || { name: 'Tài xế', firstName: 'Tài', lastName: 'xế', rating: 5, totalReviews: 0 },
        totalFare: ride.totalFare || ride.baseFare || 50000,
        distance: ride.distance || 5,
        totalSeats: ride.totalSeats || 4,
        availableSeats: (ride.totalSeats || 4) - (ride.customerId?.length || 0),
        pickupCoordinates: ride.pickupCoordinates || [startLng, startLat],
        dropoffCoordinates: ride.dropoffCoordinates || [startLng + 0.05, startLat + 0.05],
        estimatedDuration: ride.estimatedDuration || 600,
        baseFare: ride.baseFare || 50000,
        customerId: ride.customerId || [],
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

  const handleSelectRide = (ride: any) => {
    // Navigate to ride detail screen to request joining
    console.log('[FindingRideScreen] Selecting ride with customer coordinates:', {
      pickupCoordinates: [startLng, startLat],
      dropoffCoordinates: ride.dropoffCoordinates,
    })
    navigation.navigate('RideDetailRequest', {
      rideId: ride._id,
      ride: ride,
      pickupCoordinates: [startLng, startLat],
      dropoffCoordinates: ride.dropoffCoordinates,
      pickupAddress: pickupAddress,
      dropoffAddress: dropoffAddress,
    })
  }

  const rideItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[styles.rideCard, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}
      activeOpacity={0.7}
    >
      {/* Driver Info */}
      <View style={styles.driverSection}>
        <View style={[styles.driverAvatar, { backgroundColor: colors.primary + '20' }]}>
          <MaterialIcons name="person" size={28} color={colors.primary} />
        </View>
        <View style={styles.driverInfo}>
          <Text style={[styles.driverName, { color: colors.text }]}>{item.driverId?.name || 'Tài xế'}</Text>
          <View style={styles.ratingRow}>
            <MaterialIcons name="star" size={14} color="#FFD700" />
            <Text style={[styles.rating, { color: colors.textSecondary }]}>
              {item.driverId?.rating?.toFixed(1) || 'N/A'}
            </Text>
            <Text style={[styles.reviewCount, { color: colors.textSecondary }]}>
              ({item.driverId?.totalReviews || 0})
            </Text>
          </View>
        </View>
      </View>

      {/* Divider */}
      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      {/* Route Info */}
      <View style={styles.routeSection}>
        <View style={styles.routePoint}>
          <MaterialIcons name="trip-origin" size={18} color={colors.primary} />
          <Text style={[styles.routeText, { color: colors.text }]} numberOfLines={2}>
            {item.pickupAddress || 'Điểm đón'}
          </Text>
        </View>

        <View style={[styles.routeLine, { backgroundColor: colors.border }]} />

        <View style={styles.routePoint}>
          <MaterialIcons name="location-on" size={18} color="#ef4444" />
          <Text style={[styles.routeText, { color: colors.text }]} numberOfLines={2}>
            {item.dropoffAddress || 'Điểm đến'}
          </Text>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <MaterialIcons name="person" size={16} color={colors.textSecondary} />
          <Text style={[styles.statText, { color: colors.textSecondary }]}>
            {(item.availableSeats || 1)}
          </Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <MaterialIcons name="schedule" size={16} color={colors.textSecondary} />
          <Text style={[styles.statText, { color: colors.textSecondary }]}>
            {Math.round((item.estimatedDuration || 0) / 60)} phút
          </Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.fareText, { color: colors.primary }]}>
            ₫{(item.baseFare || 0).toLocaleString('vi-VN')}
          </Text>
        </View>
      </View>

      {/* Request Button */}
      <TouchableOpacity
        style={[styles.requestButton, { backgroundColor: colors.primary }]}
        onPress={() => handleSelectRide(item)}
        activeOpacity={0.8}
      >
        <MaterialIcons name="check-circle" size={20} color="#fff" />
        <Text style={styles.requestButtonText}>Yêu cầu tham gia</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  )

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar
        barStyle={themeMode === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={colors.bg}
      />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.bgSecondary, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Chuyến xe khả dụng</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Đang tải chuyến xe...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={48} color={colors.textSecondary} />
          <Text style={[styles.errorText, { color: colors.text }]}>{error}</Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
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
          ListHeaderComponent={
            <View style={[styles.scannerSection, { borderBottomColor: colors.border }]}>
              {/* Scanning Animation */}
              <View style={styles.scannerContainer}>
                {/* Background circle */}
                <View style={[styles.scannerBg, { borderColor: colors.primary + '30' }]} />
                
                {/* Animated scanning circle */}
                <Animated.View
                  style={[
                    styles.scanningCircle,
                    {
                      borderColor: colors.primary,
                      transform: [{ scale: scanScale }],
                      opacity: scanOpacity,
                    },
                  ]}
                />
                
                {/* Center dot */}
                <View style={[styles.scannerDot, { backgroundColor: colors.primary }]} />
                
                {/* Scanner line */}
                <Animated.View
                  style={[
                    styles.scannerLine,
                    {
                      backgroundColor: colors.primary,
                      transform: [{ rotate: scanAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '360deg'],
                      }) as any }],
                    },
                  ]}
                />
              </View>

              {/* Status text */}
              <Text style={[styles.scannerTitle, { color: colors.text }]}>
                Đang tìm kiếm chuyến xe
              </Text>
              <Text style={[styles.scannerSubtitle, { color: colors.textSecondary }]}>
                Cập nhật mỗi 30 giây
              </Text>
              
              {/* Rides count */}
              {rides.length > 0 && (
                <View style={[styles.ridesCountBadge, { backgroundColor: colors.primary }]}>
                  <Text style={styles.ridesCountText}>
                    Tìm được {rides.length} chuyến xe
                  </Text>
                </View>
              )}
            </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
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
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    marginTop: SPACING.md,
    fontSize: 16,
    fontWeight: '600',
  },
  emptySubtext: {
    marginTop: SPACING.sm,
    fontSize: 14,
  },
  listContent: {
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  rideCard: {
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
  },
  driverSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  driverAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  rating: {
    fontSize: 12,
  },
  reviewCount: {
    fontSize: 12,
  },
  divider: {
    height: 1,
    marginVertical: SPACING.md,
  },
  routeSection: {
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
  },
  routeText: {
    flex: 1,
    fontSize: 13,
  },
  routeLine: {
    width: 1,
    height: 30,
    marginLeft: 9,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: SPACING.md,
    borderTopWidth: 1,
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
  },
  statText: {
    fontSize: 12,
  },
  fareText: {
    fontSize: 14,
    fontWeight: '700',
  },
  statDivider: {
    width: 1,
    height: 20,
    opacity: 0.2,
  },
  requestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.md,
  },
  requestButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  scannerSection: {
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  scannerContainer: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    position: 'relative',
  },
  scannerBg: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1,
  },
  scanningCircle: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
  },
  scannerDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    zIndex: 10,
  },
  scannerLine: {
    position: 'absolute',
    width: 50,
    height: 1,
  },
  scannerTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: SPACING.xs,
  },
  scannerSubtitle: {
    fontSize: 12,
    marginBottom: SPACING.lg,
  },
  ridesCountBadge: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  ridesCountText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
})
