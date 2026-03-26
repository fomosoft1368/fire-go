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
  Animated,
  PanResponder,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { MaterialIcons } from '@expo/vector-icons'
import { useSelector } from 'react-redux'
import { useNavigation, useRoute } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { RootState } from '../redux/store'
import type { RootStackParamList } from '../types'
import { COLORS_DARK, COLORS_LIGHT, SPACING, BORDER_RADIUS, API_BASE_URL } from '../constants'
import { combinedTripsService } from '../services/combinedTripsService'
import { rideService } from '../services/rideService'
import MapViewComponent from '../components/MapView'

const { height } = Dimensions.get('window')

// Bottom Sheet Constants - 2 states only
const COLLAPSED_HEIGHT = height * 0.42 // 42% of screen
const EXPANDED_HEIGHT = height * 0.85 // 85% of screen

type Navigation = NativeStackNavigationProp<RootStackParamList>

const getStatusLabel = (status: string) => {
  const statusMap: { [key: string]: string } = {
    pending: 'Chuyến đi mới',
    accepted: 'Tài xế đã chấp nhận',
    rejected: 'Tài xế từ chối',
    timeout: 'Tài xế không phản hồi',
    cancelled: 'Đã hủy',
    arrived_at_pickup: 'Tài xế đã đến',
    in_progress: 'Bắt đầu chuyến đi',
    completed: 'Hoàn thành',
  }
  return statusMap[status] || 'Chờ xử lý'
}

const getEstimatedTime = (status: string) => {
  const timeMap: { [key: string]: string } = {
    pending: '~10 phút',
    accepted: '~5 phút',
    rejected: 'Đã từ chối',
    timeout: 'Không phản hồi',
    cancelled: 'Đã hủy',
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
  const pollingInterval = useRef<NodeJS.Timeout | null>(null)
  const locationInterval = useRef<NodeJS.Timeout | null>(null)
  const alertedStatuses = useRef<Set<string>>(new Set()) // Track alerted status changes

  // Container will be EXPANDED_HEIGHT tall, positioned at bottom
  // translateY will push it up or down to show different amounts
  // translateY = 0: Show all EXPANDED_HEIGHT (fully expanded)
  // translateY = EXPANDED_HEIGHT - COLLAPSED_HEIGHT: Show only COLLAPSED_HEIGHT (collapsed)
  const initialTranslateY = EXPANDED_HEIGHT - COLLAPSED_HEIGHT
  const translateY = useRef(new Animated.Value(initialTranslateY)).current
  const lastGestureY = useRef(initialTranslateY)
  const scrollViewRef = useRef<ScrollView>(null)

  // Pan Responder for drag gesture - 2 states only
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only respond if dragging vertically with sufficient movement
        return Math.abs(gestureState.dy) > Math.abs(gestureState.dx)
      },
      onPanResponderGrant: () => {
        translateY.setOffset(lastGestureY.current)
        translateY.setValue(0)
      },
      onPanResponderMove: (_, gestureState) => {
        const newY = gestureState.dy
        const minTranslate = 0 // Fully expanded
        const maxTranslate = EXPANDED_HEIGHT - COLLAPSED_HEIGHT // Collapsed
        const calculatedY = lastGestureY.current + newY

        // Clamp the value
        if (calculatedY < minTranslate) {
          translateY.setValue(minTranslate - lastGestureY.current)
        } else if (calculatedY > maxTranslate) {
          translateY.setValue(maxTranslate - lastGestureY.current)
        } else {
          translateY.setValue(newY)
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        translateY.flattenOffset()
        const currentY = lastGestureY.current + gestureState.dy

        // 2 states: expanded (0) and collapsed (EXPANDED_HEIGHT - COLLAPSED_HEIGHT)
        const expandedY = 0
        const collapsedY = EXPANDED_HEIGHT - COLLAPSED_HEIGHT
        const threshold = collapsedY / 2

        // Simple snap logic: snap to nearest state
        const targetY = currentY < threshold ? expandedY : collapsedY

        lastGestureY.current = targetY

        Animated.spring(translateY, {
          toValue: targetY,
          useNativeDriver: true,
          damping: 25,
          stiffness: 120,
        }).start()
      },
    })
  ).current

  // Helper function to snap to specific state - 2 states only
  const snapToState = (state: 'expanded' | 'collapsed') => {
    const targetY = state === 'expanded' ? 0 : EXPANDED_HEIGHT - COLLAPSED_HEIGHT

    lastGestureY.current = targetY

    Animated.spring(translateY, {
      toValue: targetY,
      useNativeDriver: true,
      damping: 25,
      stiffness: 120,
    }).start()
  }

  // Initialize bottom sheet position on mount
  useEffect(() => {
    // Start in collapsed state
    const initialY = EXPANDED_HEIGHT - COLLAPSED_HEIGHT
    translateY.setValue(initialY)
    lastGestureY.current = initialY
  }, [])

  // Load trip details on mount
  useEffect(() => {
    console.log('[DriverFoundScreen] 🚀 Initializing trip loading and polling...')
    loadTripDetails()
    loadDriverLocation() // Load location immediately on mount

    // ✅ CRITICAL: More aggressive polling for real-time updates
    // Poll trip status every 1.5 seconds for faster updates
    pollingInterval.current = setInterval(() => {
      console.log('[DriverFoundScreen] 🔄 Polling trip details...')
      loadTripDetails()
    }, 1500) // Reduced from 2000 to 1500ms

    // Poll driver location every 2 seconds to stay in sync
    locationInterval.current = setInterval(() => {
      console.log('[DriverFoundScreen] 📍 Polling driver location...')
      loadDriverLocation()
    }, 2000)

    return () => {
      console.log('[DriverFoundScreen] 🛑 Cleaning up polling intervals')
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

    // ✅ CRITICAL: Skip polling for synthetic/fallback requests
    const isSyntheticRequest = rideRequest._id.startsWith('synthetic_') ||
      rideRequest._id.startsWith('userapi_') ||
      rideRequest._id.startsWith('fromtrip_') ||
      rideRequest._id.startsWith('fallback-')

    if (isSyntheticRequest) {
      console.log('[DriverFoundScreen] ⚠️ Skipping status poll for synthetic request:', {
        requestId: rideRequest._id,
        reason: 'Synthetic requests don\'t exist in backend, will rely on trip polling instead',
      })
      return
    }

    console.log('[DriverFoundScreen] ✅ Starting request status polling for:', {
      combinedTripId,
      rideRequestId: rideRequest._id,
      currentStatus: rideRequest?.status,
    })

    // ✅ CRITICAL: Aggressive status polling for real-time updates
    // Poll request status every 1 second for immediate status changes
    let pollCount = 0
    const statusPollingInterval = setInterval(async () => {
      pollCount++
      console.log(`[DriverFoundScreen] 📡 Status Poll #${pollCount} - Fetching status...`, {
        combinedTripId,
        rideRequestId: rideRequest._id,
        currentStatus: rideRequest?.status,
      })

      try {
        const response = await combinedTripsService.getCombinedTripRequestStatus(
          combinedTripId,
          rideRequest._id
        )

        // ✅ ENHANCED DEBUG: Log full response to see what backend returns
        console.log(`[DriverFoundScreen] 📡 Status Poll #${pollCount} - Full backend response:`, {
          success: !!response,
          responseStatus: response?.status,
          responseType: typeof response?.status,
          requestId: response?._id,
          oldStatus: rideRequest?.status,
          oldStatusType: typeof rideRequest?.status,
          hasChanged: response?.status && response.status !== rideRequest?.status,
          fullBackendResponse: response,
          pollTimestamp: new Date().toISOString(),
        })

        if (response?.status && response.status !== rideRequest?.status) {
          console.log(`[DriverFoundScreen] 🔄 Status Poll #${pollCount} - STATUS CHANGED:`, {
            oldStatus: rideRequest?.status,
            newStatus: response?.status,
            shouldUpdate: true,
          })

          setRideRequest((prev: any) => {
            console.log('[DriverFoundScreen] ✅ REQUEST STATUS UPDATED!', {
              oldStatus: prev?.status,
              newStatus: response?.status,
              requestId: response?._id,
              timestamp: new Date().toISOString(),
            })
            return {
              ...prev,
              ...response,
              status: response.status, // Ensure status is updated
            }
          })

          // ✅ CRITICAL: Also reload trip data when status changes for complete sync
          console.log('[DriverFoundScreen] 🔄 Status changed, reloading full trip data for consistency...')
          setTimeout(() => loadTripDetails(), 100) // Small delay to avoid race conditions

          // Handle status changes with navigation or alerts
          if (response?.status === 'completed') {
            console.log('🏁 Trip completed - navigating to rating screen')
            // ✅ Navigate to rating screen for combined trips
            navigation.replace('RatingDriver', {
              rideId: combinedTripId, // Use combinedTripId for rating endpoint
              tripType: 'combined', // ✅ Tell RatingDriverScreen this is a combined trip
              driver: {
                name: tripData?.driverId?.firstName && tripData?.driverId?.lastName
                  ? `${tripData.driverId.firstName} ${tripData.driverId.lastName}`
                  : 'Tài xế',
                avatar: tripData?.driverId?.avatar,
                carType: tripData?.driverId?.vehicleType || tripData?.driverId?.vehicleModel,
                licensePlate: tripData?.driverId?.licensePlate || tripData?.driverId?.vehiclePlate,
              }
            })
          } else if (response?.status === 'cancelled' || response?.status === 'deleted' || response?.status === 'rejected' || response?.status === 'timeout') {
            console.log('❌ Trip cancelled/rejected/timeout - should navigate back')
            const alertKey = `cancelled-${response._id}-${response.status}`
            if (!alertedStatuses.current.has(alertKey)) {
              alertedStatuses.current.add(alertKey)
              Alert.alert(
                'Chuyến đi bị hủy',
                'Tài xế đã hủy, từ chối hoặc không phản hồi chuyến đi của bạn.',
                [{ text: 'OK', onPress: () => navigation.goBack() }]
              )
            }
          }
        } else {
          console.log(`[DriverFoundScreen] ⚪ Status Poll #${pollCount} - No change:`, {
            currentStatus: rideRequest?.status,
            responseStatus: response?.status,
          })
        }
      } catch (err: any) {
        console.error(`[DriverFoundScreen] ❌ Status Poll #${pollCount} - Error:`, {
          message: err.message,
          error: err,
          combinedTripId,
          rideRequestId: rideRequest._id,
        })
      }
    }, 1000) // Reduced from 2000 to 1000ms for faster status updates

    return () => {
      console.log(`[DriverFoundScreen] 🛑 Clearing polling interval after ${pollCount} polls`)
      clearInterval(statusPollingInterval)
    }
  }, [rideRequest?._id, combinedTripId, navigation])

  // Load route when driver accepts (shows route to pickup) or trip starts (shows route to dropoff)
  // Check BOTH RideRequest status (customer's status) and CombinedTrip status
  useEffect(() => {
    const currentStatus = rideRequest?.status || tripData?.status
    console.log('[DriverFoundScreen] Route loading check:', {
      currentStatus,
      hasDriverlocation: !!driverLocation,
      driverCoords: driverLocation?.coordinates,
    })

    // ✅ CRITICAL: Call loadRoute immediately when status is in_progress
    // Don't wait for driverLocation - it will be used from current state
    // Map will show polyline even if driver location is still updating
    if (currentStatus === 'in_progress') {
      console.log('[DriverFoundScreen] Status is in_progress - calling loadRoute immediately')
      loadRoute()
    }
  }, [rideRequest?.status, tripData?.status, driverLocation]) // ✅ Add driverLocation to dependency - retry when it updates

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

        // ✅ CRITICAL DEBUG: Log current user info before matching
        const currentUserId = user?._id || user?.id
        console.log('[DriverFoundScreen] 🔍 USER MATCHING DEBUG - Starting user match process:', {
          userId: currentUserId,
          userIdType: typeof currentUserId,
          fullUserObject: user,
          requestsToMatch: requests?.length || 0,
          allRequests: requests?.map((r: any) => ({
            _id: r._id,
            customerId: r.customerId,
            customerIdType: typeof r.customerId,
            customerId_id: r.customerId?._id,
            customerId_id_type: typeof r.customerId?._id,
            status: r.status,
          })) || [],
        })

        if (currentUserId && Array.isArray(requests) && requests.length > 0) {
          console.log('[DriverFoundScreen] Starting to match', requests.length, 'requests')

          // ✅ CRITICAL DEBUG: Show filtering process step by step
          console.log('[DriverFoundScreen] 🔍 FILTERING DEBUG - Before active filter:', {
            allRequests: requests.map((r: any) => ({
              _id: r._id,
              status: r.status,
              customerId: r.customerId?._id || r.customerId,
              isActiveStatus: ['pending', 'accepted', 'arrived_at_pickup', 'in_progress', 'completed'].includes(r.status),
            })),
          })

          // ✅ IMPORTANT: Only find ACTIVE requests (pending/accepted/in_progress)
          // Filter out timeout/rejected requests to avoid showing old driver data
          const activeRequests = requests.filter((r: any) =>
            ['pending', 'accepted', 'arrived_at_pickup', 'in_progress', 'completed'].includes(r.status)
          )
          console.log('[DriverFoundScreen] 🔍 FILTERING DEBUG - After active filter:', {
            originalCount: requests.length,
            activeCount: activeRequests.length,
            filteredOut: requests.length - activeRequests.length,
            activeRequests: activeRequests.map((r: any) => ({
              _id: r._id,
              status: r.status,
              customerId: r.customerId?._id || r.customerId,
            })),
          })

          request = activeRequests.find((req: any) => {
            const reqCustomerId = req.customerId?._id || req.customerId
            const isMatch = String(reqCustomerId) === String(currentUserId)
            console.log('[DriverFoundScreen] 🔍 MATCHING REQUEST DEBUG:', {
              reqCustomerId,
              reqCustomerId_type: typeof reqCustomerId,
              currentUserId,
              currentUserId_type: typeof currentUserId,
              isMatch,
              requestStatus: req.status,
              requestStatusType: typeof req.status,
              requestId: req._id,
              reqFullObj: req,
            })
            return isMatch
          })

          // ✅ CRITICAL DEBUG: Log the final selected request
          console.log('[DriverFoundScreen] 🎯 FINAL SELECTED REQUEST:', {
            currentUserId,
            requestFound: !!request,
            requestStatus: request?.status,
            requestStatusType: typeof request?.status,
            requestId: request?._id,
            allActiveRequests: activeRequests.map(r => ({
              _id: r._id,
              status: r.status,
              customerId: r.customerId?._id || r.customerId,
            })),
            selectedRequestFullObj: request,
          })
          console.log('[DriverFoundScreen] ✅ Found RideRequest for current user:', {
            currentUserId,
            requestFound: !!request,
            requestStatus: request?.status,
            requestId: request?._id,
            requestFullObj: request,
          })
        } else {
          // ✅ CRITICAL DEBUG: Why no matching happened?
          console.log('[DriverFoundScreen] 🚨 NO MATCHING ATTEMPTED - Debug reasons:', {
            hasCurrentUserId: !!currentUserId,
            currentUserId: currentUserId,
            isRequestsArray: Array.isArray(requests),
            requestsLength: requests?.length || 0,
            requests: requests,
            userObject: user,
            reasons: {
              noUserId: !currentUserId,
              notArray: !Array.isArray(requests),
              emptyArray: Array.isArray(requests) && requests.length === 0,
            },
          })

          // ✅ CRITICAL FALLBACK: If no requests found, try alternative method
          if (Array.isArray(requests) && requests.length === 0 && currentUserId) {
            console.log('[DriverFoundScreen] 🔧 EMERGENCY FALLBACK - No requests from API, trying direct database query...')

            // Try direct query to backend for this specific user's request
            try {
              // Use the user API to get current user's active requests
              const userResponse = await fetch(`${API_BASE_URL}/combined-trips/customer/${currentUserId}`, {
                method: 'GET',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${await AsyncStorage.getItem('authToken')}`,
                },
              })

              console.log('[DriverFoundScreen] 🔧 Direct API response status:', userResponse.status)

              if (userResponse.ok) {
                const userTrips = await userResponse.json()
                console.log('[DriverFoundScreen] 🆘 Direct user query result:', {
                  userTripsCount: userTrips?.length || 0,
                  userTrips: userTrips?.slice(0, 2), // Log first 2 trips
                  combinedTripId: combinedTripId,
                })

                // Find trip matching current combinedTripId
                const matchingTrip = userTrips?.find((trip: any) => String(trip._id) === String(combinedTripId))
                if (matchingTrip) {
                  console.log('[DriverFoundScreen] 🎯 Found matching trip from user API:', {
                    tripId: matchingTrip._id,
                    tripStatus: matchingTrip.status,
                    requestStatus: matchingTrip.requestStatus,
                    customerFare: matchingTrip.customerFare,
                    customerSeats: matchingTrip.customerSeats,
                    hasRequest: !!matchingTrip.request,
                    rideRequests: matchingTrip.rideRequests,
                  })

                  // ✅ CRITICAL: This API returns trip WITH customer's RideRequest data embedded
                  // Fields like requestStatus, customerFare, customerSeats come from RideRequest
                  // ⚠️ IMPORTANT: Only create request if we have a valid requestId from backend
                  if (matchingTrip.requestId) {
                    request = {
                      _id: matchingTrip.requestId,
                      combinedTripId: combinedTripId,
                      customerId: currentUserId,
                      status: matchingTrip.requestStatus || matchingTrip.status, // ✅ Use requestStatus (from RideRequest), NOT trip status
                      seats: matchingTrip.customerSeats || matchingTrip.seats || 1,
                      fare: matchingTrip.customerFare || matchingTrip.fare || 0,
                      tripType: 'combined_trip',
                      pickupCoordinates: matchingTrip.customerPickupCoordinates || matchingTrip.pickupCoordinates || trip?.pickupLocation?.coordinates,
                      dropoffCoordinates: matchingTrip.customerDropoffCoordinates || matchingTrip.dropoffCoordinates || trip?.dropoffLocation?.coordinates,
                      pickupAddress: matchingTrip.customerPickupAddress || matchingTrip.pickupAddress || trip?.pickupAddress,
                      dropoffAddress: matchingTrip.customerDropoffAddress || matchingTrip.dropoffAddress || trip?.dropoffAddress,
                      createdAt: matchingTrip.createdAt || new Date().toISOString(),
                      updatedAt: matchingTrip.updatedAt || new Date().toISOString(),
                      driverId: trip?.driverId?._id,
                    }
                  } else {
                    console.log('[DriverFoundScreen] ⚠️ No valid requestId found - cannot create request object')
                  }

                  // console.log('[DriverFoundScreen] ✅ FALLBACK SUCCESS - Created request from user API:', {
                  //   requestId: request._id,
                  //   status: request.status,
                  //   source: 'user API (customer/:id endpoint)',
                  //   usedRequestStatus: !!matchingTrip.requestStatus,
                  //   requestStatusValue: matchingTrip.requestStatus,
                  //   tripStatusValue: matchingTrip.status,
                  // })
                }
              } else {
                const errorText = await userResponse.text()
                console.error('[DriverFoundScreen] 🔧 Direct API error:', userResponse.status, errorText)

                // Try alternative: get combined trip directly
                console.log('[DriverFoundScreen] 🔧 Trying direct combined trip API...')
                const directTripResponse = await fetch(`${API_BASE_URL}/combined-trips/${combinedTripId}`, {
                  method: 'GET',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${await AsyncStorage.getItem('authToken')}`,
                  },
                })

                if (directTripResponse.ok) {
                  const combinedTripData = await directTripResponse.json()
                  console.log('[DriverFoundScreen] 🔧 Direct combined trip result:', {
                    tripId: combinedTripData._id,
                    status: combinedTripData.status,
                    hasRideRequests: !!combinedTripData.rideRequests,
                    rideRequestsCount: combinedTripData.rideRequests?.length || 0,
                  })

                  // Find matching ride request
                  const matchingRequest = combinedTripData.rideRequests?.find((req: any) =>
                    String(req.customerId) === String(currentUserId)
                  )

                  if (matchingRequest) {
                    console.log('[DriverFoundScreen] 🎯 Found matching request from direct trip API:', {
                      requestId: matchingRequest._id,
                      status: matchingRequest.status,
                      customerId: matchingRequest.customerId,
                    })

                    request = {
                      _id: matchingRequest._id,
                      combinedTripId: combinedTripId,
                      customerId: matchingRequest.customerId,
                      status: matchingRequest.status,
                      seats: matchingRequest.seats || 1,
                      fare: matchingRequest.fare || 0,
                      tripType: 'combined_trip',
                      pickupCoordinates: matchingRequest.pickupCoordinates || trip?.pickupLocation?.coordinates,
                      dropoffCoordinates: matchingRequest.dropoffCoordinates || trip?.dropoffLocation?.coordinates,
                      pickupAddress: matchingRequest.pickupAddress || trip?.pickupAddress,
                      dropoffAddress: matchingRequest.dropoffAddress || trip?.dropoffAddress,
                      createdAt: matchingRequest.createdAt || new Date().toISOString(),
                      updatedAt: matchingRequest.updatedAt || new Date().toISOString(),
                      driverId: trip?.driverId?._id,
                    }

                    console.log('[DriverFoundScreen] ✅ FALLBACK SUCCESS - Created request from direct trip API:', {
                      requestId: request._id,
                      status: request.status,
                      source: 'direct trip API',
                    })
                  }
                }
              }
            } catch (apiError) {
              console.warn('[DriverFoundScreen] 🔧 Direct API fallback failed:', apiError)
            }

            // If still no request, create synthetic one as last resort
            if (!request) {
              console.log('[DriverFoundScreen] 🆘 Last resort: Creating synthetic request...')
              request = {
                _id: `synthetic_${combinedTripId}_${currentUserId}`,
                combinedTripId: combinedTripId,
                customerId: currentUserId,
                status: tripData?.status || 'accepted', // Use CombinedTrip status as fallback
                seats: 1,
                fare: tripData?.fare || 0,
                tripType: 'combined_trip',
                pickupCoordinates: trip?.pickupLocation?.coordinates,
                dropoffCoordinates: trip?.dropoffLocation?.coordinates,
                pickupAddress: trip?.pickupLocation?.address,
                dropoffAddress: trip?.dropoffLocation?.address,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                driverId: trip?.driverId?._id,
              }
              console.log('[DriverFoundScreen] 🆘 SYNTHETIC REQUEST CREATED:', {
                synthetic: true,
                requestId: request._id,
                status: request.status,
                basedOnTripStatus: tripData?.status,
                reason: 'All APIs failed - using synthetic data',
              })
            }
          } else {
            // Normal fallback: use first ACTIVE request if no user ID available
            const activeRequests = requests?.filter((r: any) =>
              ['pending', 'accepted', 'arrived_at_pickup', 'in_progress', 'completed'].includes(r?.status)
            ) || []
            request = activeRequests?.[0] || null
          }

          console.log('[DriverFoundScreen] 🔄 FALLBACK REQUEST SELECTION:', {
            reason: !currentUserId ? 'no user ID' : !Array.isArray(requests) ? 'requests not array' : 'empty requests',
            requestStatus: request?.status,
            requestId: request?._id,
            currentUserId,
            requestsCount: requests?.length || 0,
            activeRequestsCount: requests?.filter?.((r: any) =>
              ['pending', 'accepted', 'arrived_at_pickup', 'in_progress', 'completed'].includes(r?.status)
            )?.length || 0,
            selectedRequest: request ? {
              _id: request._id,
              status: request.status,
              customerId: request.customerId,
              fare: request.fare,
              synthetic: request._id?.includes('synthetic_'),
            } : null,
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
        // ✅ NEW: Debug driver matching
        requestDriverId: request?.driverId,
        tripDriverId: trip?.driverId?._id,
      })

      // ✅ CRITICAL: Ensure CombinedTrip shows correct driver from active request
      // Backend should update CombinedTrip.driverId when request accepted, but add safety check
      if (request?.driverId && trip?.driverId?._id &&
        String(request.driverId) !== String(trip.driverId._id)) {
        console.warn('[DriverFoundScreen] ⚠️ Driver ID mismatch! Request driver:', request.driverId, 'vs Trip driver:', trip.driverId._id)
        console.warn('[DriverFoundScreen] Using trip driver (should be updated by backend)')
      }

      setTripData(trip)
      setRideRequest(request)
      setLoading(false)
      setError(null)
    } catch (err: any) {
      console.error('Error loading trip details:', err)

      // ✅ Handle 404 - Trip not found (deleted or doesn't exist)
      if (err.message?.includes('not found') || err.message?.includes('404')) {
        console.log('[DriverFoundScreen] 🚨 Trip not found (404) - Stopping polling and navigating back')

        // Clear polling intervals
        if (pollingInterval.current) {
          clearInterval(pollingInterval.current)
          pollingInterval.current = null
        }
        if (locationInterval.current) {
          clearInterval(locationInterval.current)
          locationInterval.current = null
        }

        // Show alert and navigate back
        Alert.alert(
          'Chuyến đi không tồn tại',
          'Chuyến đi đã bị hủy hoặc không còn tồn tại trong hệ thống.',
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('Home')
            }
          ]
        )
        return
      }

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

      // ✅ Handle 404 - Trip not found
      if (err.message?.includes('not found') || err.message?.includes('404')) {
        console.log('[DriverFoundScreen] 🚨 Trip not found in driver location - skipping location update')
        // Don't clear intervals here - let loadTripDetails handle it
        return
      }

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
      console.log('[DriverFoundScreen] 🗺️ === LOADROUTE CALLED ===', {
        timestamp: new Date().toISOString(),
        combinedTripId,
        tripStatus: rideRequest?.status || tripData?.status,
      })

      // Use customer's dropoff coordinates from RideRequest
      const customerDropoffCoords = rideRequest?.dropoffCoordinates || tripData?.dropoffLocation?.coordinates
      const customerPickupCoords = rideRequest?.pickupCoordinates || tripData?.pickupLocation?.coordinates

      // ✅ CRITICAL FIX: Use pickup location as fallback when driver GPS not ready
      // Driver is usually near pickup when status just changed to in_progress
      // This ensures OSRM always gets valid coordinates instead of [0, 0]
      const driverCoords = driverLocation?.coordinates || customerPickupCoords || [0, 0]

      console.log('[DriverFoundScreen] 🗺️ Loading route with data:', {
        combinedTripId,
        hasDriverLocation: !!driverLocation,
        driverCoords: driverCoords,
        driverLocationSource: driverLocation ? 'polling' : (customerPickupCoords ? 'fallback to pickup' : 'fallback [0,0]'),
        hasCustomerDropoff: !!customerDropoffCoords,
        customerDropoffCoords,
        rideRequestDropoff: rideRequest?.dropoffCoordinates,
        tripDataDropoff: tripData?.dropoffLocation?.coordinates,
      })

      // ✅ Validate dropoff coordinates (critical)
      if (!customerDropoffCoords || !Array.isArray(customerDropoffCoords) || customerDropoffCoords.length < 2) {
        console.warn('[DriverFoundScreen] ❌ VALIDATION FAILED: Invalid customer dropoff coordinates:', {
          value: customerDropoffCoords,
          isNull: !customerDropoffCoords,
          isArray: Array.isArray(customerDropoffCoords),
          length: customerDropoffCoords?.length,
        })
        return
      }

      // Extract coordinates
      const [driverLng, driverLat] = driverCoords
      const [customerLng, customerLat] = customerDropoffCoords

      // ✅ CRITICAL FIX: Skip OSRM call ONLY if coordinates are truly invalid [0, 0]
      // AND we couldn't get pickup location fallback
      if ((driverLng === 0 && driverLat === 0) && (!customerPickupCoords)) {
        console.warn('[DriverFoundScreen] ⚠️ SKIPPED: No valid coordinates available for route', {
          reason: 'Both driver location and pickup fallback are [0, 0]',
          driverCoords: [driverLng, driverLat],
          pickupCoords: customerPickupCoords,
          willRetryWhen: 'driverLocation state updates from polling',
        })
        return
      }

      // ✅ Validate numeric values
      if (typeof driverLng !== 'number' || typeof driverLat !== 'number' ||
        typeof customerLng !== 'number' || typeof customerLat !== 'number') {
        console.warn('[DriverFoundScreen] ❌ Non-numeric coordinates:', {
          driverLng: typeof driverLng,
          driverLat: typeof driverLat,
          customerLng: typeof customerLng,
          customerLat: typeof customerLat,
        })
        return
      }

      if (isNaN(driverLng) || isNaN(driverLat) || isNaN(customerLng) || isNaN(customerLat)) {
        console.warn('[DriverFoundScreen] ❌ NaN coordinates:', {
          driverLng,
          driverLat,
          customerLng,
          customerLat,
        })
        return
      }

      console.log('[DriverFoundScreen] ✅ Calling getDirections with validated coordinates:', {
        from: [driverLng, driverLat],
        to: [customerLng, customerLat],
        callTimestamp: new Date().toISOString(),
        usingFallbackLocation: !driverLocation && !!customerPickupCoords,
      })

      // Fetch route from OSRM - from driver location to CUSTOMER's dropoff
      // ✅ Use combinedTripsService for rideshare (with waypoints optimization)
      const directions = await combinedTripsService.getDirections(
        driverLng,
        driverLat,
        customerLng,
        customerLat,
      )

      console.log('[DriverFoundScreen] ✅ Route fetched successfully:', {
        hasDirections: !!directions,
        distance: directions?.distance,
        duration: directions?.duration,
        hasFeatures: !!directions?.features,
        featuresLength: directions?.features?.length,
        hasGeometry: !!directions?.features?.[0]?.geometry,
        geometryType: directions?.features?.[0]?.geometry?.type,
        coordsLength: directions?.features?.[0]?.geometry?.coordinates?.length,
      })
      setRouteData(directions)
    } catch (err: any) {
      console.error('[DriverFoundScreen] ❌ Error loading route:', {
        message: err.message,
        stack: err.stack,
        errorType: err.constructor.name,
        timestamp: new Date().toISOString(),
        driverLocation: driverLocation ? {
          coordinates: driverLocation.coordinates,
          type: driverLocation.type,
        } : 'NULL',
        customerDropoffCoords: rideRequest?.dropoffCoordinates || tripData?.dropoffLocation?.coordinates,
        rideRequestId: rideRequest?._id,
        combinedTripId,
      })
    }
  }

  const handleCall = () => {
    if (tripData?.driverId?.phoneNumber) {
      Alert.alert('Gọi tài xế', `Gọi đến ${tripData.driverId.phoneNumber}?`, [
        { text: 'Hủy', onPress: () => { }, style: 'cancel' },
        { text: 'Gọi', onPress: () => console.log('Call driver') },
      ])
    }
  }

  const handleChat = () => {
    if (tripData?.driverId && combinedTripId) {
      navigation.navigate('ChatScreen', {
        driver: {
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
        },
        // ✅ FIX: Gửi combinedTripId thay vì rideRequest._id
        rideId: combinedTripId,
        // ✅ FIX: Thêm tripType để ChatScreen biết loại trip

      })
    }
  }

  const handleCancelTrip = async () => {
    // ✅ Chỉ cho phép hủy khi status = 'accepted' hoặc 'pending'
    if (rideRequest?.status !== 'accepted' && rideRequest?.status !== 'pending') {
      Alert.alert(
        'Không thể hủy',
        rideRequest?.status === 'arrived_at_pickup' || rideRequest?.status === 'in_progress'
          ? 'Tài xế đã đến hoặc đang di chuyển, không thể hủy chuyến'
          : 'Chuyến đi không thể hủy ở trạng thái hiện tại'
      )
      return
    }

    Alert.alert('Hủy chuyến đi', 'Bạn có chắc chắn muốn hủy chuyến đi này?', [
      { text: 'Không', onPress: () => { }, style: 'cancel' },
      {
        text: 'Hủy chuyến',
        onPress: async () => {
          try {
            // ✅ CRITICAL: Validate request ID before calling API
            // Check if it's a synthetic/fake ID that was created as fallback
            const isSyntheticId = rideRequest?._id?.startsWith?.('synthetic_') ||
              rideRequest?._id?.startsWith?.('fromtrip_') ||
              rideRequest?._id?.startsWith?.('userapi_') ||
              rideRequest?._id?.startsWith?.('fallback-')

            if (isSyntheticId) {
              console.error('[handleCancelTrip] Cannot cancel with synthetic ID:', rideRequest._id)
              Alert.alert(
                'Lỗi dữ liệu',
                'Không thể hủy chuyến đi do lỗi đồng bộ dữ liệu. Vui lòng tải lại ứng dụng và thử lại.',
                [
                  { text: 'Tải lại', onPress: () => navigation.navigate('Home') },
                  { text: 'Đóng', style: 'cancel' }
                ]
              )
              return
            }

            // ✅ CRITICAL: Check trip type to call correct API
            // - If tripType = 'combined_trip' OR createdBy = 'customer' → Combined trip (ghép xe)
            // - If createdBy = 'driver' OR no tripType → Regular ride (chuyến đi thông thường)
            const isCombinedTrip = rideRequest?.tripType === 'combined_trip' || tripData?.createdBy === 'customer'

            console.log('[handleCancelTrip] Cancelling trip:', {
              tripId: combinedTripId || tripData?._id,
              requestId: rideRequest?._id,
              isCombinedTrip,
              tripType: rideRequest?.tripType,
              createdBy: tripData?.createdBy,
              status: rideRequest?.status,
              isSyntheticId,
            })

            if (isCombinedTrip) {
              // Combined trip - cancel ride request
              if (!rideRequest?._id || !combinedTripId) {
                Alert.alert('Lỗi', 'Không tìm thấy thông tin chuyến đi')
                return
              }

              await combinedTripsService.cancelRideRequest(combinedTripId, rideRequest._id)

              Alert.alert('Thành công', 'Chuyến đi đã bị hủy. Ghế của bạn đã được hoàn lại.', [
                { text: 'OK', onPress: () => navigation.navigate('Home') }
              ])
            } else {
              // Regular ride - cancel entire ride
              const rideId = combinedTripId || tripData?._id
              if (!rideId) {
                Alert.alert('Lỗi', 'Không tìm thấy thông tin chuyến đi')
                return
              }

              await rideService.cancelRide(rideId, 'customer', 'Khách hàng hủy chuyến')

              Alert.alert('Thành công', 'Chuyến đi đã bị hủy.', [
                { text: 'OK', onPress: () => navigation.navigate('Home') }
              ])
            }
          } catch (err: any) {
            console.error('[handleCancelTrip] Error:', err)

            // ✅ Handle specific error cases
            if (err.message?.includes('not found') || err.message?.includes('404')) {
              Alert.alert(
                'Chuyến đi không tồn tại',
                'Chuyến đi đã bị hủy hoặc không còn tồn tại.',
                [{ text: 'OK', onPress: () => navigation.navigate('Home') }]
              )
            } else if (err.message?.includes('500') || err.message?.includes('Internal server error')) {
              Alert.alert(
                'Lỗi hệ thống',
                'Không thể hủy chuyến đi. Vui lòng thử lại sau hoặc liên hệ hỗ trợ.',
                [{ text: 'OK' }]
              )
            } else {
              Alert.alert('Lỗi', err.message || 'Không thể hủy chuyến đi')
            }
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
          <ActivityIndicator size="large" color="#FF6B00" />
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
            style={[styles.retryButton, { backgroundColor: '#FF6B00' }]}
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
  // ✅ CRITICAL: RideRequest.status reflects customer's actual position in the trip
  // This status comes from backend RideRequest collection, NOT CombinedTrip
  const tripStatus = rideRequest?.status || 'pending'
  const statusLabel = getStatusLabel(tripStatus)
  const estimatedTime = getEstimatedTime(tripStatus)

  // ✅ DEBUG: Add detailed logging to see what's happening with status
  console.log('[DriverFoundScreen] ✅ STATUS DEBUG - Current status analysis:', {
    rideRequest: rideRequest ? {
      _id: rideRequest._id,
      status: rideRequest.status, // ← This is the correct status
      customerId: rideRequest.customerId,
      fare: rideRequest.fare,
      timestamp: new Date().toISOString(),
      rawObject: rideRequest, // Log full object to see all fields
    } : 'NULL_RIDE_REQUEST',
    combinedTripStatus: tripData?.status, // ← This is NOT used for display
    finalDisplayStatus: tripStatus,
    statusLabel: statusLabel,
    estimatedTime: estimatedTime,
    getStatusLabelResult: getStatusLabel(tripStatus),
    polling: {
      tripDataPolling: pollingInterval.current ? 'active' : 'inactive',
      statusPolling: 'per useEffect',
      locationPolling: locationInterval.current ? 'active' : 'inactive',
    },
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

  // ✅ Check if this is a synthetic/fallback request (invalid for API calls)
  const isSyntheticRequest = rideRequest?._id?.startsWith?.('synthetic_') ||
    rideRequest?._id?.startsWith?.('fromtrip_') ||
    rideRequest?._id?.startsWith?.('userapi_') ||
    rideRequest?._id?.startsWith?.('fallback-')

  if (isSyntheticRequest) {
    console.warn('[DriverFoundScreen] ⚠️ SYNTHETIC REQUEST DETECTED:', {
      requestId: rideRequest._id,
      warning: 'This request was created as fallback - API operations may fail',
      shouldReload: true,
    })
  }

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
      console.log('[DriverFoundScreen] 📍 MAP UPDATE - Polyline rendered:', {
        status: 'in_progress',
        routeDataExists: !!routeData,
        featuresExists: !!routeData?.features,
        geometryExists: !!routeData?.features?.[0]?.geometry,
        coordinatesLength: mapRouteCoordinates?.length,
        firstCoord: mapRouteCoordinates?.[0],
        lastCoord: mapRouteCoordinates?.[mapRouteCoordinates.length - 1],
      })
    } else {
      console.warn('[DriverFoundScreen] 📍 MAP UPDATE - Polyline NOT available:', {
        status: 'in_progress',
        routeDataExists: !!routeData,
        featuresExists: !!routeData?.features,
        geometryExists: !!routeData?.features?.[0]?.geometry,
        coordinates: routeData?.features?.[0]?.geometry?.coordinates ? 'exists' : 'missing',
        routeDataStructure: {
          distance: routeData?.distance,
          duration: routeData?.duration,
          hasFeatures: !!routeData?.features,
          featureslength: routeData?.features?.length,
        }
      })
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      {/* Map Container - Full Screen */}
      <View style={styles.mapContainer}>
        {/* Map - Updates based on trip status */}
        <MapViewComponent
          height={height}
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
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={[styles.backButton, { backgroundColor: "#fff" }]} onPress={() => navigation.navigate('Home' as never)}>
            <MaterialIcons name="arrow-back" size={24} color="#FF6B00" />
          </TouchableOpacity>
          <Text style={styles.logoText}>firego</Text>
        </View>
        {/* Share Button - Floating */}
        <View style={styles.shareButtonContainer}>
          <TouchableOpacity
            style={[styles.shareButton, { backgroundColor: colors.warning }]}
            onPress={handleShare}
          >
            <View style={styles.shareIconContainer}>
              <MaterialIcons name="share-location" size={16} color="#FF6B00" />
            </View>
            <Text style={[styles.shareButtonText, { color: colors.text }]}>Chia sẻ hành trình</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Bottom Sheet Info Card - Draggable */}
      <Animated.View
        style={[
          styles.bottomSheetContainer,
          {
            transform: [{ translateY }],
            backgroundColor: 'transparent',
          },
        ]}
      >
        <LinearGradient
          colors={[colors.card, colors.card]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[styles.bottomSheet, { backgroundColor: colors.card }]}
        >
          {/* Drag Handle - Touchable area for gestures */}
          <View style={styles.dragHandleWrapper} {...panResponder.panHandlers}>
            <TouchableOpacity
              style={styles.dragHandle}
              activeOpacity={0.8}
              onPress={() => {
                // Toggle between collapsed and expanded on tap
                const currentY = lastGestureY.current
                const expandedY = 0
                const collapsedY = EXPANDED_HEIGHT - COLLAPSED_HEIGHT

                if (Math.abs(currentY - collapsedY) < Math.abs(currentY - expandedY)) {
                  snapToState('expanded')
                } else {
                  snapToState('collapsed')
                }
              }}
            >
              <View style={[styles.dragHandleBar, { backgroundColor: colors.border }]} />
            </TouchableOpacity>
          </View>
          <View style={styles.handleBarContainer} {...panResponder.panHandlers}>
            <View style={styles.handleBar} />
          </View>
          <ScrollView
            ref={scrollViewRef}
            style={styles.bottomSheetContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {/* Status Header - DYNAMIC */}

            <View style={styles.statusHeader}>
              <View>
                <Text style={[styles.statusTitle, { color: colors.text }]}>{statusLabel}</Text>
                <View style={styles.estimatedTimeRow}>
                  <MaterialIcons name="schedule" size={18} color="#FF6B00" />
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
                  <View style={[styles.avatarSmall, { backgroundColor: '#FF6B00', marginLeft: -8 }]}>
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

            {/* Driver & Vehicle Profile - Premium Design */}
            <View style={styles.driverCardWrapper}>
              <LinearGradient
                colors={['#FF6B00', '#FF8534']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.driverCard}
              >
                <View style={styles.driverCardContent}>
                  <View style={styles.driverAvatar}>
                    <LinearGradient
                      colors={['#FFFFFF', '#F8F9FA']}
                      style={styles.avatarPlaceholder}
                    >
                      <MaterialIcons name="person" size={32} color="#FF6B00" />
                    </LinearGradient>
                    <LinearGradient
                      colors={['#FFD700', '#FFA500']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.ratingBadge}
                    >
                      <MaterialIcons name="star" size={12} color="white" />
                      <Text style={styles.ratingText}>
                        {(driver.averageRating || driver.rating || 5).toFixed(1)}
                      </Text>
                    </LinearGradient>
                  </View>

                  <View style={styles.driverInfo}>
                    <View style={styles.driverNameRow}>
                      <Text style={styles.driverName}>
                        {driver.firstName} {driver.lastName}
                      </Text>
                      <LinearGradient
                        colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.15)']}
                        style={styles.firegoBadge}
                      >
                        <MaterialIcons name="verified" size={12} color="white" />
                        <Text style={styles.firegoBadgeText}>Pro</Text>
                      </LinearGradient>
                    </View>
                    <View style={styles.vehicleInfoRow}>
                      <MaterialIcons name="directions-car" size={14} color="rgba(255,255,255,0.9)" />
                      <Text style={styles.vehicleInfo}>
                        {driver.vehicleModel || 'Xe'} • {driver.vehicleColor || 'N/A'}
                      </Text>
                    </View>
                    <View style={styles.plateContainer}>
                      <MaterialIcons name="confirmation-number" size={14} color="rgba(255,255,255,0.9)" />
                      <Text style={styles.plateNumber}>{driver.vehiclePlate || 'N/A'}</Text>
                    </View>
                  </View>
                </View>
              </LinearGradient>
            </View>

            {/* Action Buttons - Premium Design */}
            <View style={styles.actionButtonsGrid}>
              <TouchableOpacity
                style={styles.actionButtonWrapper}
                onPress={handleChat}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#FF6B00', '#FF8534']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.actionButton}
                >
                  <View style={styles.iconCircle}>
                    <MaterialIcons name="chat-bubble" size={22} color="white" />
                  </View>
                  <Text style={styles.actionButtonText}>Nhắn tin</Text>
                  <View style={styles.notificationDot} />
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButtonWrapper}
                onPress={handleCall}
                activeOpacity={0.8}
              >
                <View style={[styles.actionButton, styles.actionButtonOutline]}>
                  <View style={[styles.iconCircle, styles.iconCircleOutline]}>
                    <MaterialIcons name="call" size={22} color="#FF6B00" />
                  </View>
                  <Text style={[styles.actionButtonText, { color: '#FF6B00' }]}>Gọi điện</Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Secondary Action - Cancel */}
            {/* ✅ Hiển thị nút hủy khi status = 'pending' hoặc 'accepted' */}
            {(rideRequest?.status === 'pending' || rideRequest?.status === 'accepted') && (
              <TouchableOpacity
                style={styles.cancelButtonWrapper}
                onPress={handleCancelTrip}
                activeOpacity={0.7}
              >
                <View style={[styles.cancelButton, { backgroundColor: colors.card }]}>
                  <MaterialIcons name="cancel" size={20} color="#EF4444" />
                  <Text style={styles.cancelButtonText}>Hủy chuyến đi</Text>
                </View>
              </TouchableOpacity>
            )}

            {/* ✅ Hiển thị thông báo khi không thể hủy */}
            {(rideRequest?.status === 'arrived_at_pickup' || rideRequest?.status === 'in_progress') && (
              <View style={styles.cannotCancelNotice}>
                <MaterialIcons name="info" size={16} color={colors.textSecondary} />
                <Text style={[styles.cannotCancelText, { color: colors.textSecondary }]}>
                  Tài xế đã đến điểm đón, không thể hủy chuyến
                </Text>
              </View>
            )}

            {/* Trip Details - Premium Design */}
            <View style={[styles.tripDetailsCard, { backgroundColor: colors.card }]}>
              <View style={styles.tripDetailsHeader}>
                <MaterialIcons name="receipt-long" size={20} color="#FF6B00" />
                <Text style={[styles.tripDetailsTitle, { color: colors.text }]}>Chi tiết chuyến đi</Text>
              </View>
              <View style={styles.tripDetailsContent}>
                <View style={styles.tripDetailRow}>
                  <View style={styles.tripDetailLeft}>
                    <View style={styles.iconBadge}>
                      <MaterialIcons name="group" size={16} color="#FF6B00" />
                    </View>
                    <Text style={[styles.tripDetailLabel, { color: colors.textSecondary }]}>Loại xe</Text>
                  </View>
                  <Text style={[styles.tripDetailValue, { color: colors.text }]}>Ghép xe</Text>
                </View>
                <View style={[styles.divider, { backgroundColor: '#FF6B00' }]} />
                <View style={styles.tripDetailRow}>
                  <View style={styles.tripDetailLeft}>
                    <View style={styles.iconBadge}>
                      <MaterialIcons name="payments" size={16} color="#FF6B00" />
                    </View>
                    <Text style={[styles.tripDetailLabel, { color: colors.textSecondary }]}>Giá cước</Text>
                  </View>
                  <LinearGradient
                    colors={['#FF6B00', '#FF8534']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.fareTag}
                  >
                    <Text style={styles.fareText}>
                      ₫{(rideRequest?.fare || 0).toLocaleString()}
                    </Text>
                  </LinearGradient>
                </View>
                <View style={[styles.divider, { backgroundColor: '#FF6B00' }]} />
                <View style={styles.tripDetailRow}>
                  <View style={styles.tripDetailLeft}>
                    <View style={styles.iconBadge}>
                      <MaterialIcons name="straighten" size={16} color="#FF6B00" />
                    </View>
                    <Text style={[styles.tripDetailLabel, { color: colors.textSecondary }]}>Quãng đường</Text>
                  </View>
                  <Text style={[styles.tripDetailValue, { color: colors.text, fontWeight: '700' }]}>
                    {(tripData?.distance || 0).toFixed(1)} km
                  </Text>
                </View>
              </View>
            </View>

            {/* Spacer */}
            <View style={{ height: SPACING.xl }} />
          </ScrollView>
        </LinearGradient>
      </Animated.View>
    </View>
  )
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
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
    paddingTop: 40,
  },
  header: {
    position: 'absolute',
    top: 50,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    zIndex: 10,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  logoText: {
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: -0.5,
    color: '#FF6B00',
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
  bottomSheetContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: EXPANDED_HEIGHT, // Set to max height it can expand to
    zIndex: 10,
    pointerEvents: 'box-none', // Allow touches to pass through to map
  },
  bottomSheet: {
    flex: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    pointerEvents: 'auto', // Bottom sheet should capture touches
  },
  dragHandleWrapper: {
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dragHandle: {
    width: '100%',
    paddingVertical: SPACING.md,
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
    color: '#FF6B00',
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
  // ===== PREMIUM DRIVER CARD STYLES =====
  driverCardWrapper: {
    marginBottom: SPACING.lg,
    shadowColor: '#FF6B00',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
  },
  driverCard: {
    borderRadius: 20,
    padding: SPACING.lg,
    overflow: 'hidden',
  },
  driverCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.lg,
  },
  driverAvatar: {
    position: 'relative',
  },
  avatarPlaceholder: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.5)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
  },
  ratingBadge: {
    position: 'absolute',
    bottom: -6,
    right: -6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderWidth: 2,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  handleBarContainer: {
    paddingVertical: 5,
    paddingTop: 0,
    alignItems: 'center',
  },
  handleBar: {
    width: 40,
    height: 5,
    backgroundColor: '#D1D5DB',
    borderRadius: 3,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '800',
    color: 'white',
  },
  driverInfo: {
    flex: 1,
  },
  driverNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  driverName: {
    fontSize: 18,
    fontWeight: '800',
    color: 'white',
    letterSpacing: 0.3,
  },
  firegoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  firegoBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: 'white',
    letterSpacing: 0.5,
  },
  vehicleInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  vehicleInfo: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.9)',
  },
  plateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  plateNumber: {
    fontSize: 13,
    fontWeight: '800',
    color: 'white',
    letterSpacing: 1.5,
    fontFamily: 'monospace',
  },
  // ===== PREMIUM ACTION BUTTONS =====
  actionButtonsGrid: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  actionButtonWrapper: {
    flex: 1,
    shadowColor: '#FF6B00',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  actionButton: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 16,
    paddingVertical: SPACING.lg,
  },
  actionButtonOutline: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#FF6B00',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircleOutline: {
    backgroundColor: 'rgba(255,107,0,0.1)',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: 'white',
    letterSpacing: 0.3,
  },
  notificationDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: 'white',
  },
  // ===== CANCEL BUTTON =====
  cancelButtonWrapper: {
    marginBottom: SPACING.md,
  },
  cancelButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
  },
  cannotCancelNotice: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.md,
  },
  cannotCancelText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  // ===== PREMIUM TRIP DETAILS =====
  tripDetailsCard: {
    borderRadius: 20,
    padding: SPACING.lg,
    marginTop: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,107,0,0.1)',
  },
  tripDetailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(255,107,0,0.2)',
  },
  tripDetailsTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  tripDetailsContent: {
    gap: SPACING.xs,
  },
  tripDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  tripDetailLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,107,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tripDetailLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  tripDetailValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    opacity: 0.2,
  },
  fareTag: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    shadowColor: '#FF6B00',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  fareText: {
    fontSize: 15,
    fontWeight: '800',
    color: 'white',
    letterSpacing: 0.5,
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
