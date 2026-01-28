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
  Modal,
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
import ChatScreen from './ChatScreen'

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
  const user = useSelector((state: RootState) => state.auth.user)

  // Safe params extraction
  const params = route.params as any
  const combinedTripId = params?.combinedTripId ?? ''

  const [tripData, setTripData] = useState<any>(null)
  const [rideRequest, setRideRequest] = useState<any>(null)
  const [driverLocation, setDriverLocation] = useState<any>(null)
  const [routeData, setRouteData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showChatScreen, setShowChatScreen] = useState(false)
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

    // Poll driver location every 2 seconds (same as trip polling) to stay in sync
    locationInterval.current = setInterval(() => {
      loadDriverLocation()
    }, 2000)

    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current)
      }
      if (locationInterval.current) {
        clearInterval(locationInterval.current)
      }
    }
  }, [combinedTripId])

  // Poll request status when rideRequest changes
  useEffect(() => {
    console.log('[DriverFoundScreen] useEffect: Poll request status triggered', {
      rideRequestId: rideRequest?._id,
      combinedTripId,
      hasIds: !!(rideRequest?._id && combinedTripId),
    })

    if (!rideRequest?._id || !combinedTripId) {
      console.log('[DriverFoundScreen] ❌ Skipping request status poll - missing IDs:', {
        rideRequestId: rideRequest?._id,
        combinedTripId,
      })
      return
    }

    console.log('[DriverFoundScreen] ✅ Starting request status polling for:', {
      combinedTripId,
      rideRequestId: rideRequest._id,
      currentStatus: rideRequest?.status,
    })

    // Poll request status every 2 seconds
    let pollCount = 0
    const statusPollingInterval = setInterval(async () => {
      pollCount++
      console.log(`[DriverFoundScreen] 📡 Poll #${pollCount} - Fetching status...`, {
        combinedTripId,
        rideRequestId: rideRequest._id,
        currentStatus: rideRequest?.status,
      })
      
      try {
        const response = await combinedTripsService.getCombinedTripRequestStatus(
          combinedTripId,
          rideRequest._id
        )
        
        console.log(`[DriverFoundScreen] 📡 Poll #${pollCount} - Response received:`, {
          status: response?.status,
          requestId: response?._id,
          fullResponse: response,
        })
        
        if (response?.status) {
          setRideRequest((prev: any) => {
            const hasStatusChanged = prev?.status !== response?.status
            console.log(`[DriverFoundScreen] 📡 Poll #${pollCount} - Updating state:`, {
              oldStatus: prev?.status,
              newStatus: response?.status,
              hasChanged: hasStatusChanged,
            })
            if (hasStatusChanged) {
              console.log('[DriverFoundScreen] ⚠️⚠️ Request status CHANGED!', {
                oldStatus: prev?.status,
                newStatus: response?.status,
                requestId: response?._id,
              })
              
              // Handle deleted/rejected status
              if (response?.status === 'deleted' || response?.status === 'rejected') {
                Alert.alert(
                  'Yêu cầu bị từ chối',
                  'Tài xế đã từ chối yêu cầu của bạn.',
                  [{ text: 'OK', onPress: () => navigation.goBack() }]
                )
              }
            }
            // IMPORTANT: Merge response with existing rideRequest to preserve _id
            // Backend may only return partial data (status), so merge it
            const merged = { ...prev, ...response }
            console.log(`[DriverFoundScreen] 📡 Poll #${pollCount} - Merged state:`, {
              prevId: prev?._id,
              responseId: response?._id,
              mergedId: merged?._id,
              finalStatus: merged?.status,
            })
            return merged
          })
        } else {
          console.warn(`[DriverFoundScreen] 📡 Poll #${pollCount} - No status in response!`, response)
        }
      } catch (err: any) {
        console.error(`[DriverFoundScreen] 📡 Poll #${pollCount} - Error:`, {
          message: err.message,
          error: err,
          combinedTripId,
          rideRequestId: rideRequest._id,
        })
      }
    }, 2000)

    return () => {
      console.log(`[DriverFoundScreen] 🛑 Clearing polling interval after ${pollCount} polls`)
      clearInterval(statusPollingInterval)
    }
  }, [rideRequest?._id, combinedTripId])

  // Load route when trip starts (status = in_progress) or driver location changes
  // Check BOTH RideRequest status (customer's status) and CombinedTrip status
  useEffect(() => {
    const currentStatus = rideRequest?.status || tripData?.status
    if (currentStatus === 'in_progress' && driverLocation) {
      loadRoute()
    }
  }, [rideRequest?.status, tripData?.status, driverLocation])

  const loadTripDetails = async () => {
    try {
      if (!combinedTripId) {
        setError('Missing trip ID')
        return
      }

      // Fetch CombinedTrip details (driver, locations, route)
      const trip = await combinedTripsService.getCombinedTripDetail(combinedTripId)
      
      // Fetch RideRequest for this customer (status, fare, seats)
      // RideRequest contains customer's specific booking info
      let request = null
      try {
        // Get all ride requests for this combined trip
        console.log('[DriverFoundScreen] Starting to fetch requests for trip:', combinedTripId)
        const requests = await combinedTripsService.getCombinedTripRequests(combinedTripId)
        
        console.log('[DriverFoundScreen] All RideRequests fetched:', {
          count: requests?.length || 0,
          rawRequests: requests, // Log full object
          requests: requests?.map((r: any) => ({
            _id: r._id,
            customerId: r.customerId,
            customerId_id: r.customerId?._id,
            status: r.status,
            fare: r.fare,
            tripType: r.tripType,
          })),
        })

        // Find the ride request for CURRENT USER
        // Match by user ID from Redux
        const currentUserId = user?._id || user?.id
        console.log('[DriverFoundScreen] Current user ID from Redux:', {
          userId: currentUserId,
          type: typeof currentUserId,
          user: user,
        })

        if (currentUserId && Array.isArray(requests) && requests.length > 0) {
          console.log('[DriverFoundScreen] Starting to match', requests.length, 'requests')
          request = requests.find((req: any) => {
            const reqCustomerId = req.customerId?._id || req.customerId
            const isMatch = String(reqCustomerId) === String(currentUserId)
            console.log('[DriverFoundScreen] Matching request:', {
              reqCustomerId,
              reqCustomerId_type: typeof reqCustomerId,
              currentUserId,
              currentUserId_type: typeof currentUserId,
              isMatch,
              status: req.status,
              reqFullObj: req,
            })
            return isMatch
          })
          console.log('[DriverFoundScreen] Found RideRequest for current user:', {
            currentUserId,
            requestFound: !!request,
            requestStatus: request?.status,
            requestId: request?._id,
            requestFullObj: request,
          })
        } else {
          // Fallback: use first request if no user ID available
          request = requests?.[0] || null
          console.log('[DriverFoundScreen] Using fallback request:', {
            reason: !currentUserId ? 'no user ID' : !Array.isArray(requests) ? 'requests not array' : 'empty requests',
            requestStatus: request?.status,
            requestId: request?._id,
            currentUserId,
            requestsCount: requests?.length || 0,
            requestFullObj: request,
          })
        }
      } catch (err) {
        console.warn('[DriverFoundScreen] Could not fetch RideRequest:', {
          error: err,
          combinedTripId,
        })
      }

      console.log('[DriverFoundScreen] Trip & Request updated:', {
        tripId: trip?._id,
        tripStatus: trip?.status,
        requestStatus: request?.status,
        requestId: request?._id,
        pickupLocation: trip?.pickupLocation,
        dropoffLocation: trip?.dropoffLocation,
        driverId: trip?.driverId?.firstName,
        driverCurrentLocation: trip?.driverId?.currentLocation ? {
          type: trip.driverId.currentLocation.type,
          coordinates: trip.driverId.currentLocation.coordinates,
        } : 'NOT_FOUND',
      })
      
      setTripData(trip)
      setRideRequest(request)
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

      // PRIORITY 1: Try to get location from cached tripData first (updated every 2 seconds)
      if (tripData?.driverId?.currentLocation?.coordinates) {
        const coords = tripData.driverId.currentLocation.coordinates
        const [lng, lat] = coords

        // Only use if not fallback [0, 0]
        if (!(lng === 0 && lat === 0)) {
          console.log('[DriverFoundScreen] ✅ Using location from tripData.driverId:', {
            lng,
            lat,
            source: 'tripData.driverId.currentLocation',
          })
          setDriverLocation(tripData.driverId.currentLocation)
          return
        }
      }

      // PRIORITY 2: Fetch from dedicated endpoint if tripData location is not available
      console.log('[DriverFoundScreen] Fetching location from dedicated endpoint...')
      const response = await combinedTripsService.getDriverLocation(combinedTripId)
      
      console.log('[DriverFoundScreen] Full driver location response:', {
        response,
        currentLocation: response?.currentLocation,
        coordinates: response?.currentLocation?.coordinates,
        type: response?.currentLocation?.type,
      })

      if (!response?.currentLocation) {
        console.warn('[DriverFoundScreen] ⚠️ No currentLocation in response')
        return
      }

      // Check if coordinates are [0, 0] (fallback/not updated)
      const [lng, lat] = response.currentLocation.coordinates || [0, 0]
      if (lng === 0 && lat === 0) {
        console.warn('[DriverFoundScreen] ⚠️ Driver location is [0, 0] - driver has not updated location yet')
        // Try to use tripData location as fallback
        if (tripData?.driverId?.currentLocation?.coordinates) {
          console.log('[DriverFoundScreen] Falling back to tripData location')
          setDriverLocation(tripData.driverId.currentLocation)
        }
        return
      }

      setDriverLocation(response.currentLocation)
      console.log('[DriverFoundScreen] ✅ Driver location set from endpoint:', {
        lng,
        lat,
        type: response.currentLocation.type,
      })
    } catch (err: any) {
      console.error('Error loading driver location:', err)
      // Fallback to tripData location on error
      if (tripData?.driverId?.currentLocation?.coordinates) {
        const [lng, lat] = tripData.driverId.currentLocation.coordinates
        if (!(lng === 0 && lat === 0)) {
          console.log('[DriverFoundScreen] Error fallback: Using tripData location')
          setDriverLocation(tripData.driverId.currentLocation)
        }
      }
    }
  }

  const loadRoute = async () => {
    try {
      // Use customer's dropoff coordinates from RideRequest
      const customerDropoffCoords = rideRequest?.dropoffCoordinates || tripData?.dropoffLocation?.coordinates
      
      if (!combinedTripId || !driverLocation || !customerDropoffCoords) return

      console.log('[DriverFoundScreen] Loading route for trip in progress to customer dropoff')
      
      // Fetch route from OSRM - from driver location to CUSTOMER's dropoff
      const directions = await rideService.getDirections(
        driverLocation.coordinates[0],
        driverLocation.coordinates[1],
        customerDropoffCoords[0],
        customerDropoffCoords[1],
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
    if (tripData?.driverId) {
      setShowChatScreen(true)
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
  
  // Use RideRequest status (customer's booking status) instead of CombinedTrip status
  // RideRequest.status reflects customer's actual position in the trip
  const tripStatus = rideRequest?.status || 'pending'
  const statusLabel = getStatusLabel(tripStatus)
  const estimatedTime = getEstimatedTime(tripStatus)
  
  console.log('[DriverFoundScreen] Current trip status:', {
    rideRequest: rideRequest ? {
      _id: rideRequest._id,
      status: rideRequest.status,
      customerId: rideRequest.customerId,
      fare: rideRequest.fare,
    } : null,
    displayStatus: tripStatus,
    statusLabel,
    estimatedTime,
  })
  
  // Debug log
  if (tripData) {
    console.log('[DriverFoundScreen] Rendering with status:', {
      tripStatus,
      statusLabel,
      tripData_status: tripData.status,
      tripData_id: tripData._id,
      rideRequestId: rideRequest?._id,
      rideRequestStatus: rideRequest?.status,
    })
  }
  
  // Use driver location if available (real-time), else use stored coordinates
  const displayDriverLocation = driverLocation || tripData?.driverId?.currentLocation
  
  // ✅ Use customer's pickup/dropoff from RideRequest, NOT driver's route from CombinedTrip
  const pickupCoords = rideRequest?.pickupCoordinates || tripData?.pickupLocation?.coordinates || [105.8542, 21.0285]
  const dropoffCoords = rideRequest?.dropoffCoordinates || tripData?.dropoffLocation?.coordinates || [105.8542, 21.0285]
  const tripId = tripData?._id || combinedTripId

  // Validate driver location - skip if it's fallback [0, 0]
  let validDriverLocation = null
  if (displayDriverLocation?.coordinates) {
    const [lng, lat] = displayDriverLocation.coordinates
    if (!(lng === 0 && lat === 0)) {
      validDriverLocation = displayDriverLocation
    }
  }

  // Debug: Log driver location status
  if (displayDriverLocation) {
    const [drvLng, drvLat] = displayDriverLocation?.coordinates || [null, null]
    console.log('[DriverFoundScreen] Driver location to display:', {
      source: driverLocation ? 'polling' : 'tripData.driverId',
      lng: drvLng,
      lat: drvLat,
      isZero: drvLng === 0 && drvLat === 0,
      isValid: validDriverLocation !== null,
      fullLocation: displayDriverLocation,
    })
  } else {
    console.warn('[DriverFoundScreen] ❌ NO driver location available:', {
      driverLocation: driverLocation ? 'exists' : 'missing',
      tripDataDriverLocation: tripData?.driverId?.currentLocation ? 'exists' : 'missing',
      tripData_driverId: tripData?.driverId ? 'exists' : 'missing',
    })
  }

  // Determine what to show on map based on status
  let mapPickupCoords = null
  let mapDropoffCoords = null
  let mapRouteCoordinates = null

  if (tripStatus === 'pending' || tripStatus === 'accepted' || tripStatus === 'arrived_at_pickup') {
    // Show pickup location
    mapPickupCoords = {
      latitude: pickupCoords[1],
      longitude: pickupCoords[0],
    }
  }

  if (tripStatus === 'in_progress') {
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
            validDriverLocation?.coordinates
              ? [
                  {
                    id: 'driver',
                    latitude: validDriverLocation.coordinates[1],
                    longitude: validDriverLocation.coordinates[0],
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
                ₫{(rideRequest?.fare || 0).toLocaleString()}
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

      {/* Chat Modal */}
      <Modal 
        visible={showChatScreen} 
        animationType="slide"
        transparent={false}
      >
        {showChatScreen && tripData?.driverId && (
          <ChatScreen
            driver={{
              id: tripData.driverId._id,
              name: `${tripData.driverId.firstName} ${tripData.driverId.lastName}`,
              avatar: tripData.driverId.avatar || '',
              rating: tripData.driverId.rating || 5,
              totalRides: tripData.driverId.totalRides || 0,
              carType: tripData.driverId.carType || 'Unknown',
              licensePlate: tripData.driverId.licensePlate || '',
              carColor: tripData.driverId.carColor || '',
              distance: tripData.driverId.distance || 0,
              eta: tripData.driverId.eta || 0,
              phone: tripData.driverId.phone,
              email: tripData.driverId.email,
            } as any}
            rideId={tripData._id}
            onClose={() => setShowChatScreen(false)}
          />
        )}
      </Modal>
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
