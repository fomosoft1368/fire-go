import { useState, useEffect, useRef } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Dimensions,
  StatusBar,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { MaterialIcons } from '@expo/vector-icons'
import { useSelector } from 'react-redux'
import { useNavigation, useRoute } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RootState } from '../redux/store'
import type { RootStackParamList } from '../types'
import { COLORS_DARK, COLORS_LIGHT, SPACING, BORDER_RADIUS } from '../constants'
import { combinedTripsService } from '../services/combinedTripsService'
import { rideService } from '../services/rideService'
import MapViewComponent from '../components/MapView'

const { height } = Dimensions.get('window')

type Navigation = NativeStackNavigationProp<RootStackParamList>

const getStatusLabel = (status: string) => {
  const statusMap: { [key: string]: string } = {
    pending: 'Chuyến đi mới',
    accepted: 'Tài xế đã chấp nhận',
    arrived_at_pickup: 'Tài xế đã đến',
    in_progress: 'Bắt đầu chuyến đi',
    completed: 'Hoàn thành',
    cancelled: 'Đã hủy',
  }
  return statusMap[status] || 'Chờ xử lý'
}

const getEstimatedTime = (status: string) => {
  const timeMap: { [key: string]: string } = {
    pending: '~10 phút',
    accepted: '~5 phút',
    arrived_at_pickup: '0 phút',
    in_progress: 'Đang di chuyển',
    completed: 'Hoàn thành',
  }
  return timeMap[status] || '~10 phút'
}

export default function DriverFoundScreen() {
  const navigation = useNavigation<Navigation>()
  const route = useRoute()
  const themeMode = useSelector((state: RootState) => state.theme.mode)
  const colors = themeMode === 'dark' ? COLORS_DARK : COLORS_LIGHT
  const user = useSelector((state: RootState) => state.auth.user) // Get current user

  // Safe params extraction
  const params = route.params as any
  const combinedTripId = params?.combinedTripId ?? ''

  const [tripData, setTripData] = useState<any>(null)
  const [driverLocation, setDriverLocation] = useState<any>(null)
  const [routeData, setRouteData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const pollingInterval = useRef<NodeJS.Timeout | null>(null)
  const locationInterval = useRef<NodeJS.Timeout | null>(null)

  // Load trip details on mount
  useEffect(() => {
    loadTripDetails()
    loadDriverLocation() // Load location immediately on mount
    
    // Poll trip status every 2 seconds
    pollingInterval.current = setInterval(() => {
      loadTripDetails()
    }, 2000)

    // Poll driver location every 3 seconds (faster updates)
    locationInterval.current = setInterval(() => {
      loadDriverLocation()
    }, 3000)

    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current)
      }
      if (locationInterval.current) {
        clearInterval(locationInterval.current)
      }
    }
  }, [combinedTripId])

  // Load route when request starts (status = in_progress) or driver location changes
  useEffect(() => {
    if (tripData && driverLocation) {
      // Get current customer's request status
      const currentRequest = tripData?.customerId?.find(
        (customer: any) => customer._id === user?.id || customer._id === user?._id
      )
      if (currentRequest?.status === 'in_progress') {
        loadRoute()
      }
    }
  }, [tripData, driverLocation, user?.id, user?._id])

  const loadTripDetails = async () => {
    try {
      if (!combinedTripId) {
        setError('Missing trip ID')
        return
      }

      const trip = await combinedTripsService.getCombinedTripDetail(combinedTripId)
      console.log('[DriverFoundScreen] Trip updated - Full data:', {
        _id: trip?._id,
        status: trip?.status,
        statusFromAPI: trip?.status,
        pickupLocation: trip?.pickupLocation,
        dropoffLocation: trip?.dropoffLocation,
        driverId: trip?.driverId?.firstName,
        allData: JSON.stringify(trip, null, 2),
      })
      console.log('[DriverFoundScreen] ⚠️ Status value type:', typeof trip?.status, 'Value:', trip?.status)
      setTripData(trip)
      setLoading(false)
      setError(null)
    } catch (err: any) {
      console.error('Error loading trip details:', err)
      setError(err.message || 'Failed to load trip details')
      setLoading(false)
    }
  }

  const loadDriverLocation = async () => {
    try {
      if (!combinedTripId) return

      const response = await combinedTripsService.getDriverLocation(combinedTripId)
      console.log('[DriverFoundScreen] Driver location updated:', response.currentLocation)
      setDriverLocation(response.currentLocation)
    } catch (err: any) {
      console.error('Error loading driver location:', err)
    }
  }

  const loadRoute = async () => {
    try {
      if (!combinedTripId || !driverLocation || !tripData?.dropoffLocation) return

      console.log('[DriverFoundScreen] Loading route for trip in progress')
      
      // Fetch route from OSRM
      const directions = await rideService.getDirections(
        driverLocation.coordinates[0],
        driverLocation.coordinates[1],
        tripData.dropoffLocation.coordinates[0],
        tripData.dropoffLocation.coordinates[1],
      )

      console.log('[DriverFoundScreen] Route fetched')
      setRouteData(directions)
    } catch (err: any) {
      console.error('Error loading route:', err)
    }
  }

  const handleCall = () => {
    if (tripData?.driverId?.phoneNumber) {
      Alert.alert('Gọi tài xế', `Gọi đến ${tripData.driverId.phoneNumber}?`, [
        { text: 'Hủy', onPress: () => {}, style: 'cancel' },
        { text: 'Gọi', onPress: () => console.log('Call driver') },
      ])
    }
  }

  const handleChat = () => {
    if (tripData?.driverId?._id) {
      Alert.alert('Nhắn tin', `Nhắn cho tài xế ${tripData.driverId.firstName} ${tripData.driverId.lastName}`, [
        { text: 'Đóng', onPress: () => {}, style: 'cancel' },
      ])
    }
  }

  const handleCancelTrip = () => {
    Alert.alert('Hủy chuyến đi', 'Bạn có chắc chắn muốn hủy chuyến đi này?', [
      { text: 'Không', onPress: () => {}, style: 'cancel' },
      {
        text: 'Hủy chuyến',
        onPress: async () => {
          try {
            Alert.alert('Thành công', 'Chuyến đi đã bị hủy')
            navigation.goBack()
          } catch (err: any) {
            Alert.alert('Lỗi', err.message || 'Không thể hủy chuyến đi')
          }
        },
        style: 'destructive',
      },
    ])
  }

  const handleShare = () => {
    Alert.alert('Chia sẻ hành trình', 'Sao chép link hành trình đã được copy vào clipboard')
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#53d22d" />
          <Text style={[styles.loadingText, { color: colors.text }]}>Đang tải thông tin chuyến đi...</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (error || !tripData) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={48} color={colors.textSecondary} />
          <Text style={[styles.errorText, { color: colors.text }]}>{error || 'Không thể tải chuyến đi'}</Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: '#53d22d' }]}
            onPress={loadTripDetails}
          >
            <Text style={styles.retryButtonText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  const driver = tripData?.driverId || {
    firstName: 'N/A',
    lastName: 'N/A',
    averageRating: 5,
    rating: 5,
    totalReviews: 0,
    vehicleModel: 'N/A',
    vehiclePlate: 'N/A',
    phoneNumber: 'N/A',
  }
  
  // Get current customer's request status (not combined trip status)
  const currentCustomerRequest = tripData?.customerId?.find(
    (customer: any) => customer._id === user?.id || customer._id === user?._id
  )
  const requestStatus = currentCustomerRequest?.status || 'pending'
  
  console.log('[DriverFoundScreen] 📊 Request status vs Trip status:', {
    requestStatus: requestStatus,
    tripStatus: tripData?.status,
    currentCustomerId: user?.id || user?._id,
    foundCustomer: !!currentCustomerRequest,
  })
  
  const statusLabel = getStatusLabel(requestStatus)
  const estimatedTime = getEstimatedTime(requestStatus)
  
  // Debug log
  if (tripData) {
    console.log('[DriverFoundScreen] 🔄 Rendering with request status:', {
      requestStatus: requestStatus,
      statusLabel,
      tripStatus: tripData?.status,
      tripData_id: tripData._id,
      currentCustomerRequest,
      tripDataKeys: Object.keys(tripData || {}),
    })
  }
  
  // Use driver location if available (real-time), else use stored coordinates
  const displayDriverLocation = driverLocation || tripData?.driverId?.currentLocation
  const pickupCoords = tripData?.pickupLocation?.coordinates || [105.8542, 21.0285]
  const dropoffCoords = tripData?.dropoffLocation?.coordinates || [105.8542, 21.0285]
  const tripId = tripData?._id || combinedTripId

  // Determine what to show on map based on request status
  let mapPickupCoords = null
  let mapDropoffCoords = null
  let mapRouteCoordinates = null

  if (requestStatus === 'pending' || requestStatus === 'accepted' || requestStatus === 'arrived_at_pickup') {
    // Show pickup location
    mapPickupCoords = {
      latitude: pickupCoords[1],
      longitude: pickupCoords[0],
    }
  }

  if (requestStatus === 'in_progress') {
    // Show route from driver to dropoff
    mapDropoffCoords = {
      latitude: dropoffCoords[1],
      longitude: dropoffCoords[0],
    }
    
    // Extract polyline from route data if available
    if (routeData?.features?.[0]?.geometry?.coordinates) {
      mapRouteCoordinates = routeData.features[0].geometry.coordinates.map(
        (coord: [number, number]) => ({
          latitude: coord[1],
          longitude: coord[0],
        })
      )
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={themeMode === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />

      <View style={styles.mapContainer}>
        {/* Map - Updates based on trip status */}
        <MapViewComponent
          height={height * 0.55}
          pickupCoords={mapPickupCoords ?? undefined}
          dropoffCoords={mapDropoffCoords ?? undefined}
          routeCoordinates={mapRouteCoordinates}
          markers={
            displayDriverLocation
              ? [
                  {
                    id: 'driver',
                    latitude: displayDriverLocation.coordinates[1],
                    longitude: displayDriverLocation.coordinates[0],
                    title: 'Tài xế',
                    description: 'Vị trí tài xế',
                  },
                ]
              : []
          }
        />

        {/* Top Gradient Overlay */}
        <LinearGradient
          colors={['rgba(19,19,21,0.9)', 'rgba(19,19,21,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.mapOverlayTop}
        />

        {/* Top Navigation Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.topBarButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialIcons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <View style={styles.topBarCenter}>
            <Text style={styles.topBarTitle}>Ghép xe - Chuyến đi #{tripId?.slice?.(-5)?.toUpperCase?.() || 'N/A'}</Text>
            <Text style={styles.topBarSubtitle}>{statusLabel}</Text>
          </View>
          <TouchableOpacity
            style={styles.topBarButton}
            onPress={() => Alert.alert('Trợ giúp', 'Liên hệ với hỗ trợ khách hàng')}
          >
            <MaterialIcons name="help" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Share Button - Floating */}
        <View style={styles.shareButtonContainer}>
          <TouchableOpacity
            style={[styles.shareButton, { backgroundColor: colors.bgSecondary }]}
            onPress={handleShare}
          >
            <View style={styles.shareIconContainer}>
              <MaterialIcons name="share-location" size={16} color="#53d22d" />
            </View>
            <Text style={[styles.shareButtonText, { color: colors.text }]}>Chia sẻ hành trình</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Bottom Sheet Info Card */}
      <LinearGradient
        colors={[colors.bgSecondary, colors.bgSecondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.bottomSheet, { backgroundColor: colors.bgSecondary }]}
      >
        {/* Drag Handle */}
        <View style={styles.dragHandle}>
          <View style={[styles.dragHandleBar, { backgroundColor: colors.border }]} />
        </View>

        <ScrollView style={styles.bottomSheetContent} showsVerticalScrollIndicator={false}>
          {/* Status Header - DYNAMIC */}
          <View style={styles.statusHeader}>
            <View>
              <Text style={[styles.statusTitle, { color: colors.text }]}>{statusLabel}</Text>
              <View style={styles.estimatedTimeRow}>
                <MaterialIcons name="schedule" size={18} color="#53d22d" />
                <Text style={styles.estimatedTime}>{estimatedTime}</Text>
              </View>
            </View>

            {/* Carpool Visualizer */}
            <View style={styles.carpoolVisualizer}>
              <Text style={styles.carpoolLabel}>Ghép xe</Text>
              <View style={styles.avatarGroup}>
                <View style={[styles.avatarSmall, { backgroundColor: colors.border }]}>
                  <Text style={styles.avatarText}>Tôi</Text>
                </View>
                <View style={[styles.avatarSmall, { backgroundColor: '#53d22d', marginLeft: -8 }]}>
                  <Text style={styles.avatarTextWhite}>K2</Text>
                </View>
                <View
                  style={[
                    styles.avatarSmall,
                    {
                      backgroundColor: 'transparent',
                      borderWidth: 1.5,
                      borderStyle: 'dashed',
                      borderColor: colors.border,
                      marginLeft: -8,
                    },
                  ]}
                >
                  <MaterialIcons name="add" size={14} color={colors.border} />
                </View>
              </View>
            </View>
          </View>

          {/* Driver & Vehicle Profile */}
          <View style={[styles.driverCard, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}>
            <View style={styles.driverCardContent}>
              <View style={styles.driverAvatar}>
                <View style={[styles.avatarPlaceholder, { backgroundColor: colors.border }]}>
                  <MaterialIcons name="person" size={28} color={colors.text} />
                </View>
                <View style={styles.ratingBadge}>
                  <Text style={styles.ratingText}>
                    {(driver.averageRating || driver.rating || 5).toFixed(1)}
                  </Text>
                  <MaterialIcons name="star" size={10} color="black" />
                </View>
              </View>

              <View style={styles.driverInfo}>
                <View style={styles.driverNameRow}>
                  <Text style={[styles.driverName, { color: colors.text }]}>
                    {driver.firstName} {driver.lastName}
                  </Text>
                  <View style={styles.firegoBadge}>
                    <Text style={styles.firegoBadgeText}>FireGo Car</Text>
                  </View>
                </View>
                <Text style={[styles.vehicleInfo, { color: colors.textSecondary }]}>
                  {driver.vehicleModel || 'Xe'} • {driver.vehicleColor || 'N/A'}
                </Text>
                <Text style={[styles.plateNumber, { color: colors.text }]}>{driver.vehiclePlate || 'N/A'}</Text>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtonsGrid}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}
              onPress={handleChat}
            >
              <MaterialIcons name="chat-bubble" size={20} color="#53d22d" />
              <Text style={[styles.actionButtonText, { color: colors.text }]}>Nhắn tin</Text>
              <View style={styles.notificationDot} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}
              onPress={handleCall}
            >
              <MaterialIcons name="call" size={20} color="#4ade80" />
              <Text style={[styles.actionButtonText, { color: colors.text }]}>Gọi điện</Text>
            </TouchableOpacity>
          </View>

          {/* Secondary Action - Cancel */}
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancelTrip}
          >
            <MaterialIcons name="cancel" size={20} color="#ef4444" />
            <Text style={styles.cancelButtonText}>Hủy chuyến đi</Text>
          </TouchableOpacity>

          {/* Trip Details - Optional */}
          <View style={[styles.tripDetailsCard, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}>
            <Text style={[styles.tripDetailsTitle, { color: colors.text }]}>Chi tiết chuyến đi</Text>
            <View style={styles.tripDetailRow}>
              <Text style={[styles.tripDetailLabel, { color: colors.textSecondary }]}>Loại xe</Text>
              <Text style={[styles.tripDetailValue, { color: colors.text }]}>Ghép xe</Text>
            </View>
            <View style={styles.tripDetailRow}>
              <Text style={[styles.tripDetailLabel, { color: colors.textSecondary }]}>Giá cước</Text>
              <Text style={[styles.tripDetailValue, { color: colors.text }]}>
                ₫{(tripData?.totalFare || 0).toLocaleString()}
              </Text>
            </View>
            <View style={styles.tripDetailRow}>
              <Text style={[styles.tripDetailLabel, { color: colors.textSecondary }]}>Quãng đường</Text>
              <Text style={[styles.tripDetailValue, { color: colors.text }]}>
                {(tripData?.distance || 0).toFixed(1)} km
              </Text>
            </View>
          </View>

          {/* Spacer */}
          <View style={{ height: SPACING.xl }} />
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  )
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mapContainer: {
    position: 'relative',
    height: height * 0.55,
  },
  mapOverlayTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    paddingTop: SPACING.lg,
  },
  topBarButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  topBarCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
  },
  topBarTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: 'white',
  },
  topBarSubtitle: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 2,
  },
  shareButtonContainer: {
    position: 'absolute',
    right: 0,
    bottom: 80,
    zIndex: 100,
    paddingRight: SPACING.lg,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: SPACING.lg,
    paddingLeft: SPACING.sm,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    gap: SPACING.sm,
  },
  shareIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(83,210,45,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  bottomSheet: {
    flex: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  dragHandle: {
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dragHandleBar: {
    width: 48,
    height: 4,
    borderRadius: 2,
    opacity: 0.5,
  },
  bottomSheetContent: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.lg,
    paddingTop: SPACING.sm,
  },
  statusTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  estimatedTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.sm,
  },
  estimatedTime: {
    fontSize: 14,
    fontWeight: '700',
    color: '#53d22d',
  },
  carpoolVisualizer: {
    alignItems: 'flex-end',
  },
  carpoolLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.xs,
  },
  avatarGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  avatarText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6b7280',
  },
  avatarTextWhite: {
    fontSize: 10,
    fontWeight: '700',
    color: 'black',
  },
  driverCard: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  driverCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  driverAvatar: {
    position: 'relative',
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  ratingBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#eab308',
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  ratingText: {
    fontSize: 10,
    fontWeight: '700',
    color: 'black',
  },
  driverInfo: {
    flex: 1,
  },
  driverNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  driverName: {
    fontSize: 16,
    fontWeight: '700',
  },
  firegoBadge: {
    backgroundColor: 'rgba(83,210,45,0.2)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: 4,
  },
  firegoBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#53d22d',
  },
  vehicleInfo: {
    fontSize: 13,
    marginBottom: SPACING.xs,
  },
  plateNumber: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  actionButtonsGrid: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING.lg,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  notificationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
    marginLeft: SPACING.xs,
  },
  cancelButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ef4444',
  },
  tripDetailsCard: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginTop: SPACING.lg,
  },
  tripDetailsTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: SPACING.md,
  },
  tripDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  tripDetailLabel: {
    fontSize: 13,
  },
  tripDetailValue: {
    fontSize: 13,
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
    fontSize: 14,
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'black',
  },
})
