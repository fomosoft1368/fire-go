import { useState, useEffect, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
  Animated,
} from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import MapView, { Marker, Polyline } from 'react-native-maps'
import * as Location from 'expo-location'
import { COLORS } from '../constants'
import { API_BASE_URL } from '../constants/config'
import ChatScreen from './ChatScreen'

// Google Maps API Key from .env
const GOOGLE_MAPS_API_KEY = 'AIzaSyCIcSzPA0jWhg0RvrN-kwxqxNcR4IJx3fY'

interface RideDetailScreenProps {
  navigation: any
  route: any
}

interface Customer {
  _id: string
  name: string
  phone: string
  rating: number
  avatar?: string
  address?: string
}

export default function ActiveRideScreen({ navigation, route }: RideDetailScreenProps) {
  const [ride, setRide] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [currentLocation, setCurrentLocation] = useState<[number, number] | null>(null)
  const [showCustomerModal, setShowCustomerModal] = useState(false)
  const [showChatScreen, setShowChatScreen] = useState(false)
  const [requestingCustomer, setRequestingCustomer] = useState<Customer | null>(null)
  const [modalCountdown, setModalCountdown] = useState(60)
  const [currentPassengerIndex, setCurrentPassengerIndex] = useState(0)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [fetchAttempts, setFetchAttempts] = useState(0)
  const [routeCoordinates, setRouteCoordinates] = useState<Array<{latitude: number, longitude: number}>>([])
  
  const statusFadeAnim = useRef(new Animated.Value(0)).current
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const isMountedRef = useRef(true)
  const mapRef = useRef<any>(null)

  // Lấy ride ID từ route params
  const rideId = route?.params?.rideId
  const combinedTripId = route?.params?.combinedTripId
  const sourceType = route?.params?.sourceType // 'ride' or 'combined_trip'
  
  // Use whichever ID is provided
  const tripId = combinedTripId || rideId

  // Current passenger
  const currentPassenger = ride?.customerId?.[currentPassengerIndex]

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
      }
    }
  }, [])

  // Get real driver location using geolocation
  useEffect(() => {
    let locationWatchId: any = null
    let isMounted = true

    const startLocationTracking = async () => {
      try {
        console.log('🔍 Starting location tracking...')
        
        // Request location permissions
        const { status } = await Location.requestForegroundPermissionsAsync()
        console.log('📍 Location permission status:', status)
        
        if (status !== 'granted') {
          console.warn('⚠️ Location permission denied, using fallback location')
          setCurrentLocation([105.8386, 21.0722])
          return
        }

        console.log('✅ Location permission granted, getting location...')

        // Get initial location first
        try {
          const location = await Location.getCurrentPositionAsync({ 
            accuracy: Location.Accuracy.High
          })
          
          if (isMounted && location) {
            const { longitude, latitude } = location.coords
            
            console.log('📍 Initial driver location obtained:', { latitude, longitude })
            
            if (typeof latitude === 'number' && typeof longitude === 'number' && 
                !isNaN(latitude) && !isNaN(longitude)) {
              console.log('✅ Setting initial location:', { latitude, longitude })
              setCurrentLocation([longitude, latitude])
              
              // Animate map to initial driver location
              setTimeout(() => {
                mapRef.current?.animateToRegion({
                  latitude,
                  longitude,
                  latitudeDelta: 0.05,
                  longitudeDelta: 0.05,
                }, 500)
              }, 500)
            }
          }
        } catch (locError) {
          console.error('❌ Error getting initial location:', locError)
        }

        // Start watching location for continuous updates
        locationWatchId = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 2000,
            distanceInterval: 10,
          },
          (location) => {
            if (isMounted && location) {
              const { longitude, latitude } = location.coords
              
              console.log('📍 Location watch update:', { latitude, longitude })
              
              if (typeof latitude === 'number' && typeof longitude === 'number' && 
                  !isNaN(latitude) && !isNaN(longitude)) {
                setCurrentLocation([longitude, latitude])
                console.log('✅ Location state updated')
              }
            }
          }
        )
        
        console.log('✅ Location watch started:', locationWatchId)
      } catch (error) {
        console.error('❌ Error in location tracking:', error)
        setCurrentLocation([105.8386, 21.0722])
      }
    }

    startLocationTracking()

    return () => {
      isMounted = false
      if (locationWatchId !== null) {
        console.log('🛑 Stopping location watch:', locationWatchId)
        // locationWatchId has a .remove() method to unsubscribe from location updates
        if (locationWatchId.remove) {
          locationWatchId.remove()
        }
      }
    }
  }, [])

  // Fetch ride detail từ API
  useEffect(() => {
    console.log('🚗 RideDetailScreen - rideId:', rideId, 'combinedTripId:', combinedTripId, 'sourceType:', sourceType)
    if (tripId) {
      fetchRideDetail()
      
      // Setup auto-refresh every 5 seconds to get updated customer data
      refreshIntervalRef.current = setInterval(() => {
        if (isMountedRef.current) {
          console.log('🔄 Auto-refreshing ride data...')
          fetchRideDetail(false) // false = don't show loading spinner
        }
      }, 8000)
    } else {
      console.warn('⚠️ No rideId or combinedTripId provided in route params')
      setLoading(false)
    }
    
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
      }
    }
  }, [tripId])

  // Modal countdown
  useEffect(() => {
    if (!showCustomerModal) return
    const timer = setInterval(() => {
      setModalCountdown(prev => {
        if (prev <= 1) {
          setShowCustomerModal(false)
          return 60
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [showCustomerModal])

  // Monitor routeCoordinates changes
  useEffect(() => {
    console.log('🎨 routeCoordinates updated:', routeCoordinates.length, 'points')
    if (routeCoordinates.length > 0) {
      console.log('   First point:', routeCoordinates[0])
      console.log('   Last point:', routeCoordinates[routeCoordinates.length - 1])
    }
  }, [routeCoordinates])

  // Update map when passenger changes
  useEffect(() => {
    if (!currentPassenger?.pickupCoordinates || !currentLocation) {
      console.log('⚠️ Skipping map update - missing data:', {
        hasPickup: !!currentPassenger?.pickupCoordinates,
        hasLocation: !!currentLocation,
        hasMapRef: !!mapRef.current,
      })
      return
    }

    console.log('🔄 Passenger changed, updating map to:', {
      index: currentPassengerIndex,
      name: currentPassenger.name,
      pickup: currentPassenger.pickupCoordinates,
      dropoff: currentPassenger.dropoffCoordinates,
      status: currentPassenger.status,
    })

    // Check if mapRef is ready
    if (!mapRef.current) {
      console.warn('⚠️ Map reference not ready yet, will retry on next update')
      return
    }

    // Don't reset route coordinates - keep polyline visible while fetching new route
    // Reset route coordinates immediately
    console.log('🔄 Clearing route coordinates for new route fetch...')
    setRouteCoordinates([])

    // Fetch route and update map
    const updateMapAndRoute = async () => {
      // Validate current location and passenger
      if (!currentLocation || !currentPassenger?.pickupCoordinates) {
        console.warn('⚠️ Missing current location or passenger pickup coordinates')
        return
      }
      
      // First, get the route
      let startCoord = currentLocation
      let endCoord: [number, number] = [0, 0]
      let targetMarkerCoord: [number, number] = [0, 0]
      
      // Determine destination based on current status
      // pending/accepted → pickup | arrived_at_pickup → pickup | in_progress → dropoff
      if (currentPassenger?.status === 'pending' || currentPassenger?.status === 'accepted' || currentPassenger?.status === 'arrived_at_pickup') {
        // Route to pickup location
        if (!isValidCoordinates(currentPassenger.pickupCoordinates)) {
          console.warn('❌ Invalid pickup coordinates:', currentPassenger.pickupCoordinates)
          return
        }
        endCoord = [currentPassenger.pickupCoordinates[0], currentPassenger.pickupCoordinates[1]]
        targetMarkerCoord = endCoord
      } else if (currentPassenger?.status === 'in_progress') {
        // Route to dropoff location
        if (!isValidCoordinates(currentPassenger.dropoffCoordinates)) {
          console.warn('❌ Invalid dropoff coordinates:', currentPassenger.dropoffCoordinates)
          return
        }
        endCoord = [currentPassenger.dropoffCoordinates[0], currentPassenger.dropoffCoordinates[1]]
        targetMarkerCoord = endCoord
      } else {
        return
      }
      
      console.log('🗺️ Getting route from', startCoord, 'to', endCoord)
      console.log('📋 Current passenger details:', {
        index: currentPassengerIndex,
        name: currentPassenger.name,
        pickupCoordinates: currentPassenger.pickupCoordinates,
        dropoffCoordinates: currentPassenger.dropoffCoordinates,
        status: currentPassenger.status,
        requestId: currentPassenger.requestId,
      })
      const route = await getDirectionsRoute(startCoord, endCoord)
      console.log('✅ Route received with', route.length, 'points')
      console.log('🎨 Setting routeCoordinates state:', route.length, 'points')
      setRouteCoordinates(route)
      
      // Fit map to show both driver and destination
      if (mapRef.current) {
        try {
          console.log('🎬 Fitting map to show full route from', startCoord, 'to', endCoord)
          const coords = [
            { latitude: startCoord[1], longitude: startCoord[0] }, // Driver location
            { latitude: endCoord[1], longitude: endCoord[0] }, // Destination (pickup or dropoff)
          ]
          mapRef.current.fitToCoordinates(coords, {
            edgePadding: { top: 100, right: 50, bottom: 150, left: 50 },
            animated: true,
          })
        } catch (error) {
          console.error('❌ Error fitting map:', error)
          // Fallback: animate to target
          try {
            console.log('🎬 Fallback: Animating map to target location:', {
              latitude: targetMarkerCoord[1],
              longitude: targetMarkerCoord[0],
            })
            mapRef.current.animateToRegion({
              latitude: targetMarkerCoord[1],
              longitude: targetMarkerCoord[0],
              latitudeDelta: 0.1,
              longitudeDelta: 0.1,
            }, 500)
          } catch (err) {
            console.error('❌ Error animating map:', err)
          }
        }
      } else {
        console.warn('⚠️ Map reference not available, will retry in 500ms')
        // Retry after map is ready
        setTimeout(() => {
          if (mapRef.current) {
            try {
              console.log('🎬 Retrying fitToCoordinates after delay')
              const coords = [
                { latitude: startCoord[1], longitude: startCoord[0] },
                { latitude: endCoord[1], longitude: endCoord[0] },
              ]
              mapRef.current.fitToCoordinates(coords, {
                edgePadding: { top: 100, right: 50, bottom: 150, left: 50 },
                animated: true,
              })
            } catch (error) {
              console.error('❌ Error on retry fitToCoordinates:', error)
            }
          }
        }, 500)
      }
    }
    
    updateMapAndRoute()
  }, [
    currentPassengerIndex, 
    JSON.stringify(currentPassenger?.pickupCoordinates),
    JSON.stringify(currentPassenger?.dropoffCoordinates),
    currentPassenger?.status,
    currentLocation,
  ])

  // Setup passenger request listener when ride is in_progress
  useEffect(() => {
    if (ride?.status !== 'in_progress') return
    
    // Simulate passenger request (in real app, use WebSocket or polling)
    const timer = setTimeout(() => {
      if (!showCustomerModal) {
        setRequestingCustomer({
          _id: 'customer-' + Date.now(),
          name: 'Anh Minh',
          phone: '0905 123 456',
          rating: 4.8,
          address: 'Tây Hồ, Hà Nội',
        })
        setShowCustomerModal(true)
        setModalCountdown(60)
      }
    }, 3000)
    
    return () => clearTimeout(timer)
  }, [ride?.status, showCustomerModal])

  const fetchRideDetail = async (showLoading: boolean = true) => {
    if (showLoading) {
      setLoading(true)
      setFetchError(null)
    }
    
    try {
      const attempt = fetchAttempts + 1
      setFetchAttempts(attempt)
      
      // Determine endpoint based on source type
      let endpoint = ''
      if (sourceType === 'combined_trip' || combinedTripId) {
        endpoint = `${API_BASE_URL}/combined-trips/${combinedTripId || tripId}`
      } else {
        endpoint = `${API_BASE_URL}/rides/driver/${rideId || tripId}`
      }
      
      console.log(`🚗 [Attempt ${attempt}] Fetching ride detail from:`, endpoint)
      
      // Add timeout to prevent infinite loading
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout
      
      let response
      let data
      
      try {
        response = await fetch(endpoint, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        })
        
        clearTimeout(timeoutId)
        console.log(`📡 [Attempt ${attempt}] Response status:`, response.status)
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        try {
          data = await response.json()
        } catch (parseError) {
          console.error(`❌ [Attempt ${attempt}] Failed to parse JSON:`, parseError)
          throw new Error('Server returned invalid JSON')
        }

        console.log(`✅ [Attempt ${attempt}] Response received, customers: ${data?.customerId?.length || 0}`)

        if (!data || !data._id) {
          console.error(`❌ [Attempt ${attempt}] Invalid data structure:`, { 
            hasData: !!data,
            hasId: !!data?._id,
            keys: data ? Object.keys(data).length : 0
          })
          throw new Error('Server returned invalid ride data')
        }

        // ✅ Ride found
        if (isMountedRef.current) {
          setRide(data)
          setFetchError(null) // Clear error on success
          console.log(`✅ [Attempt ${attempt}] Ride loaded. Passengers: ${data.customerId?.length || 0}`)
          
          // If customer has pickup location, center map on it
          const firstCustomer = data?.customerId?.[0]
          if (firstCustomer?.pickupCoordinates) {
            mapRef.current?.animateToRegion({
              latitude: firstCustomer.pickupCoordinates[1],
              longitude: firstCustomer.pickupCoordinates[0],
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }, 500)
          }
        }
      } catch (fetchError: any) {
        clearTimeout(timeoutId)
        
        if (fetchError.name === 'AbortError') {
          const msg = 'Request timeout (10s) - backend not responding'
          console.error(`❌ [Attempt ${attempt}] ${msg}`)
          setFetchError(msg)
          throw new Error(msg)
        }
        
        console.error(`❌ [Attempt ${attempt}] Fetch error:`, fetchError.message)
        setFetchError(fetchError.message)
        throw fetchError
      }
    } catch (error: any) {
      console.error(`❌ Error in fetchRideDetail (attempt ${fetchAttempts}):`, error.message)
      
      if (showLoading && isMountedRef.current) {
        const errorMsg = error.message || 'Unknown error'
        const displayId = combinedTripId || rideId || tripId
        Alert.alert(
          'Lỗi kết nối',
          `Không thể tải chuyến đi.\n\n${errorMsg}\n\nID: ${displayId}`,
          [
            { text: 'Thử lại', onPress: () => fetchRideDetail(true) },
            { text: 'Hủy', style: 'cancel' }
          ]
        )
      }
    } finally {
      console.log(`🏁 fetchRideDetail finally block - showLoading=${showLoading}, isMounted=${isMountedRef.current}`)
      if (showLoading && isMountedRef.current) {
        console.log('✅ Setting loading to false')
        setLoading(false)
      } else {
        console.log('⚠️ Skipping setLoading - silent refresh or unmounted')
      }
    }
  }

  const handleStartRide = async () => {
    if (!currentPassenger) return
    Alert.alert(
      'Bắt đầu chuyến',
      `Bắt đầu chuyến cho ${currentPassenger.name}?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Bắt đầu',
          onPress: async () => {
            setUpdating(true)
            try {
              // Check if using mock - update local state
              if (!ride || !ride._id) {
                const updatedCustomers = ride.customerId.map((p: any, idx: number) =>
                  idx === currentPassengerIndex ? { ...p, status: 'in_progress' } : p
                )
                setRide({ ...ride, customerId: updatedCustomers })
                setUpdating(false)
                Alert.alert('Thành công', 'Chuyến đi đã bắt đầu')
                return
              }

              const requestId = currentPassenger.requestId || currentPassenger._id
              console.log('📡 Calling start-journey with:', { combinedTripId, requestId })
              
              // Use combined-trips endpoint for RideRequest status update
              const endpoint = `${API_BASE_URL}/combined-trips/${combinedTripId}/requests/${requestId}/start-journey`
              
              const response = await fetch(endpoint, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
              })
              
              if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                console.error('❌ Start journey error:', response.status, errorData)
                throw new Error(`Failed: ${response.status}${errorData?.message ? ' - ' + errorData.message : ''}`)
              }
              
              // Don't use incomplete response - reload full ride data
              console.log('✅ Start journey successful, reloading ride data')
              await fetchRideDetail(false)
              Alert.alert('Thành công', 'Chuyến đi đã bắt đầu')
            } catch (error: any) {
              Alert.alert('Lỗi', error.message)
            } finally {
              setUpdating(false)
            }
          },
        },
      ]
    )
  }

  const handleMarkArrived = async () => {
    if (!currentPassenger) return
    Alert.alert(
      'Đã đến điểm đón',
      `Đánh dấu đã đến để đón ${currentPassenger.name}?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xác nhận',
          onPress: async () => {
            setUpdating(true)
            try {
              // Check if using mock - update local state
              if (!ride || !ride._id) {
                const updatedCustomers = ride.customerId.map((p: any, idx: number) =>
                  idx === currentPassengerIndex ? { ...p, status: 'arrived_at_pickup' } : p
                )
                setRide({ ...ride, customerId: updatedCustomers })
                setUpdating(false)
                Alert.alert('Thành công', 'Đã đến điểm đón')
                return
              }

              console.log('📋 currentPassenger object:', JSON.stringify(currentPassenger, null, 2))
              console.log('🔍 DEBUG markArrived:', { rideId, combinedTripId, sourceType, tripId })
              
              const requestId = currentPassenger.requestId || currentPassenger._id
              if (!requestId) {
                throw new Error('No requestId found in passenger data. Passenger: ' + JSON.stringify(currentPassenger))
              }
              console.log('📡 Calling mark-arrived with:', { combinedTripId, requestId, passengerName: currentPassenger.name })
              
              // Use combined-trips endpoint for RideRequest status update
              const endpoint = `${API_BASE_URL}/combined-trips/${combinedTripId}/requests/${requestId}/mark-arrived`
              console.log('🔗 ENDPOINT:', endpoint)
              
              const response = await fetch(endpoint, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
              })
              
              console.log('📨 Response status:', response.status, 'OK:', response.ok)
              
              if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                console.error('❌ Mark arrived error:', response.status, errorData)
                throw new Error(`Failed: ${response.status}${errorData?.message ? ' - ' + errorData.message : ''}`)
              }
              
              // Don't use incomplete response - reload full ride data
              console.log('✅ Mark arrived successful, reloading ride data')
              await fetchRideDetail(false)
              Alert.alert('Thành công', 'Đã đến điểm đón')
            } catch (error: any) {
              Alert.alert('Lỗi', error.message)
            } finally {
              setUpdating(false)
            }
          },
        },
      ]
    )
  }

  const handleCompletePassenger = async () => {
    if (!currentPassenger) return
    Alert.alert(
      'Hoàn thành chuyến',
      `Đã thả hết khách ${currentPassenger.name} chưa?`,
      [
        { text: 'Không', style: 'cancel' },
        {
          text: 'Đã xong',
          onPress: async () => {
            setUpdating(true)
            try {
              // Check if using mock - update local state
              if (!ride || !ride._id) {
                const updatedCustomers = ride.customerId.map((p: any, idx: number) =>
                  idx === currentPassengerIndex ? { ...p, status: 'completed' } : p
                )
                setRide({ ...ride, customerId: updatedCustomers })
                setUpdating(false)
                Alert.alert('Thành công', 'Chuyến hoàn thành')
                return
              }

              const requestId = currentPassenger.requestId || currentPassenger._id
              console.log('📡 Calling complete with:', { combinedTripId, requestId })
              
              // Use combined-trips endpoint for RideRequest status update
              const endpoint = `${API_BASE_URL}/combined-trips/${combinedTripId}/requests/${requestId}/complete`
              
              const response = await fetch(endpoint, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
              })
              
              if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                console.error('❌ Complete error:', response.status, errorData)
                throw new Error(`Failed: ${response.status}${errorData?.message ? ' - ' + errorData.message : ''}`)
              }
              
              // Don't use incomplete response - reload full ride data
              console.log('✅ Complete successful, reloading ride data')
              await fetchRideDetail(false)
              Alert.alert('Thành công', 'Chuyến hoàn thành')
            } catch (error: any) {
              Alert.alert('Lỗi', error.message)
            } finally {
              setUpdating(false)
            }
          },
        },
      ]
    )
  }

  const handleAcceptCustomer = async () => {
    if (!requestingCustomer) return
    try {
      setUpdating(true)
      
      // Send customer's coordinates if available
      // Note: In real app, this should come from customer's booking request
      const pickupCoords = (requestingCustomer as any)?.pickupCoordinates || [105.79, 21.03];
      const dropoffCoords = (requestingCustomer as any)?.dropoffCoordinates || [105.85, 21.05];
      const pickupAddr = (requestingCustomer as any)?.pickupAddress || 'Điểm đón khách';
      const dropoffAddr = (requestingCustomer as any)?.dropoffAddress || 'Điểm đến khách';
      
      const response = await fetch(`${API_BASE_URL}/rides/${rideId}/add-passenger`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          customerId: requestingCustomer._id,
          pickupCoordinates: pickupCoords,
          dropoffCoordinates: dropoffCoords,
          pickupAddress: pickupAddr,
          dropoffAddress: dropoffAddr,
        }),
      })
      
      if (!response.ok) throw new Error(`Failed: ${response.status}`)
      
      const updated = await response.json()
      setRide(updated)
      setShowCustomerModal(false)
      setRequestingCustomer(null)
      setModalCountdown(60)
      
      // Refresh immediately to get full customer data with pickup/dropoff details
      await fetchRideDetail(false)
      
      Alert.alert('Thành công', 'Đã thêm khách hàng')
    } catch (error: any) {
      Alert.alert('Lỗi', error.message)
    } finally {
      setUpdating(false)
    }
  }

  const handleRejectCustomer = () => {
    setShowCustomerModal(false)
    setRequestingCustomer(null)
    setModalCountdown(60)
  }

  // Get directions route from Google Directions API
  const getDirectionsRoute = async (startCoord: [number, number], endCoord: [number, number]) => {
    try {
      if (!startCoord || !endCoord || startCoord.length < 2 || endCoord.length < 2) {
        console.warn('❌ Invalid coordinates for directions:', { startCoord, endCoord })
        return []
      }

      const origin = `${startCoord[1]},${startCoord[0]}`
      const destination = `${endCoord[1]},${endCoord[0]}`
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&key=${GOOGLE_MAPS_API_KEY}&mode=driving`
      
      console.log('🗺️ Fetching directions route...')
      console.log('📍 Origin:', origin, '→ Destination:', destination)
      
      const response = await fetch(url)
      const data = await response.json()

      console.log('📡 Google API Response status:', data.status, 'Routes:', data.routes?.length || 0)

      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0]
        const encodedPolyline = route.overview_polyline.points
        const decoded = decodePolyline(encodedPolyline)
        
        console.log('✅ Route decoded:', decoded.length, 'points')
        
        return decoded.map(([lat, lng]) => ({
          latitude: lat,
          longitude: lng
        }))
      }
      
      // Fallback: return direct line if no route found
      console.warn('⚠️ No route found (status:', data.status, '), using direct line')
      return [
        { latitude: startCoord[1], longitude: startCoord[0] },
        { latitude: endCoord[1], longitude: endCoord[0] }
      ]
    } catch (error) {
      console.error('❌ Error getting directions:', error)
      // Fallback to direct line
      return [
        { latitude: startCoord[1], longitude: startCoord[0] },
        { latitude: endCoord[1], longitude: endCoord[0] }
      ]
    }
  }

  // Decode polyline from Google Directions API
  const decodePolyline = (encoded: string): Array<[number, number]> => {
    const points: Array<[number, number]> = []
    let index = 0, lat = 0, lng = 0
    
    while (index < encoded.length) {
      let result = 0
      let shift = 0
      let b
      
      // Decode latitude
      do {
        b = encoded.charCodeAt(index++) - 63
        result |= (b & 0x1f) << shift
        shift += 5
      } while (b >= 0x20)
      
      const dlat = (result & 1) ? ~(result >> 1) : result >> 1
      lat += dlat
      
      // Decode longitude
      result = 0
      shift = 0
      
      do {
        b = encoded.charCodeAt(index++) - 63
        result |= (b & 0x1f) << shift
        shift += 5
      } while (b >= 0x20)
      
      const dlng = (result & 1) ? ~(result >> 1) : result >> 1
      lng += dlng
      
      points.push([lat / 1e5, lng / 1e5])
    }
    
    return points
  }

  const handleZoomIn = () => {
    if (!mapRef.current || !currentLocation) return
    mapRef.current.animateToRegion({
      latitude: currentLocation[1],
      longitude: currentLocation[0],
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    }, 300)
  }

  const handleZoomOut = () => {
    if (!mapRef.current || !currentLocation) return
    mapRef.current.animateToRegion({
      latitude: currentLocation[1],
      longitude: currentLocation[0],
      latitudeDelta: 0.1,
      longitudeDelta: 0.1,
    }, 300)
  }

  // Helper to validate coordinates
  const isValidCoordinates = (coords: any): boolean => {
    return (
      Array.isArray(coords) &&
      coords.length >= 2 &&
      typeof coords[0] === 'number' &&
      typeof coords[1] === 'number' &&
      !isNaN(coords[0]) &&
      !isNaN(coords[1]) &&
      coords[0] !== null &&
      coords[1] !== null
    );
  }

  // Helper to fit both driver and customer on map
  const fitToCoordinates = () => {
    if (!currentLocation || !currentPassenger?.pickupCoordinates) return

    const coords = [
      { latitude: currentLocation[1], longitude: currentLocation[0] },
      { latitude: currentPassenger.pickupCoordinates[1], longitude: currentPassenger.pickupCoordinates[0] },
    ]

    // Add dropoff if journey started
    if (currentPassenger?.dropoffCoordinates && currentPassenger?.status === 'in_progress') {
      coords.push({
        latitude: currentPassenger.dropoffCoordinates[1],
        longitude: currentPassenger.dropoffCoordinates[0],
      })
    }

    if (mapRef.current) {
      mapRef.current.fitToCoordinates(coords, {
        edgePadding: { top: 100, right: 50, bottom: 200, left: 50 },
        animated: true,
      })
    }
  }

  useEffect(() => {
    Animated.timing(statusFadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start()
  }, [ride?.status])

  return (
    <SafeAreaView style={styles.safeArea}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Đang tải chi tiết chuyến đi...</Text>
          {fetchError && (
            <View style={{ marginTop: 16, alignItems: 'center' }}>
              <Text style={{ color: COLORS.danger, fontSize: 14, marginBottom: 8 }}>
                ❌ {fetchError}
              </Text>
              <Text style={{ color: '#888', fontSize: 12 }}>
                URL: {API_BASE_URL}/rides/driver/{rideId}
              </Text>
              <Text style={{ color: '#888', fontSize: 12, marginTop: 4 }}>
                Attempt: {fetchAttempts}
              </Text>
              <TouchableOpacity
                style={{
                  marginTop: 12,
                  paddingHorizontal: 24,
                  paddingVertical: 10,
                  backgroundColor: COLORS.primary,
                  borderRadius: 8,
                }}
                onPress={() => {
                  setFetchError(null)
                  fetchRideDetail(true)
                }}
              >
                <Text style={{ color: 'white', fontWeight: '600' }}>Thử lại ngay</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      ) : !ride ? (
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={48} color={COLORS.danger} />
          <Text style={styles.errorText}>Không tìm thấy chuyến đi</Text>
          {fetchError && (
            <Text style={{ color: COLORS.danger, fontSize: 13, marginVertical: 8, paddingHorizontal: 16 }}>
              {fetchError}
            </Text>
          )}
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => rideId && fetchRideDetail()}
          >
            <Text style={styles.retryButtonText}>Thử lại (Lần {fetchAttempts + 1})</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* Debug Info */}
          <View style={{ backgroundColor: '#f5f5f5', padding: 8, marginBottom: 4 }}>
            <Text style={{ fontSize: 10, color: '#666' }}>
              💡 Debug: Khách {currentPassengerIndex + 1}/{ride.customerId?.length}, Status: {currentPassenger?.status || 'N/A'}, Route points: {routeCoordinates.length}
            </Text>
            <Text style={{ fontSize: 10, color: '#666' }}>
              Pickup: [{currentPassenger?.pickupCoordinates?.[0]?.toFixed(4)}, {currentPassenger?.pickupCoordinates?.[1]?.toFixed(4)}]
            </Text>
            <Text style={{ fontSize: 10, color: '#666' }}>
              Dropoff: [{currentPassenger?.dropoffCoordinates?.[0]?.toFixed(4)}, {currentPassenger?.dropoffCoordinates?.[1]?.toFixed(4)}]
            </Text>
            <Text style={{ fontSize: 10, color: '#666' }}>
              Marker showing: {currentPassenger?.status === 'in_progress' ? '📍 Dropoff' : currentPassenger?.status === 'pending' || currentPassenger?.status === 'accepted' ? '🟢 Pickup' : '🟡 Arrived'}
            </Text>
            <Text style={{ fontSize: 10, color: '#666' }}>
              Pickup valid: {isValidCoordinates(currentPassenger?.pickupCoordinates) ? '✅' : '❌'}, Dropoff valid: {isValidCoordinates(currentPassenger?.dropoffCoordinates) ? '✅' : '❌'}
            </Text>
          </View>
          {/* Map Section */}
          <View style={styles.mapContainer}>
            <MapView
              ref={mapRef}
              style={styles.map}
              initialRegion={{
                latitude: currentPassenger?.pickupCoordinates?.[1] ?? 21.0285,
                longitude: currentPassenger?.pickupCoordinates?.[0] ?? 105.8542,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
              }}
            >
              {/* Driver location (current location) */}
              {currentLocation && (
                <Marker
                  coordinate={{
                    latitude: currentLocation[1],
                    longitude: currentLocation[0],
                  }}
                  title="Vị trí tài xế"
                  pinColor="blue"
                />
              )}

              {/* PENDING/ACCEPTED state: Show only pickup marker */}
              {(currentPassenger?.status === 'pending' || currentPassenger?.status === 'accepted') && isValidCoordinates(currentPassenger?.pickupCoordinates) && (
                <>
                  <Marker
                    key={`pickup-${currentPassengerIndex}`}
                    coordinate={{
                      latitude: currentPassenger.pickupCoordinates[1],
                      longitude: currentPassenger.pickupCoordinates[0],
                    }}
                    title={`Đón ${currentPassenger.name}`}
                    description={currentPassenger.pickupAddress}
                    pinColor="green"
                  />
                  {currentLocation && isValidCoordinates(currentPassenger?.pickupCoordinates) && (
                    <Polyline
                      key={`polyline-pending-${routeCoordinates.length}`}
                      coordinates={routeCoordinates.length > 0 ? routeCoordinates : [
                        { latitude: currentLocation[1], longitude: currentLocation[0] },
                        { latitude: currentPassenger.pickupCoordinates[1], longitude: currentPassenger.pickupCoordinates[0] },
                      ]}
                      strokeColor={COLORS.primary}
                      strokeWidth={3}
                    />
                  )}
                </>
              )}

              {/* IN_PROGRESS state: Show only dropoff marker (already picked up) */}
              {currentPassenger?.status === 'in_progress' && isValidCoordinates(currentPassenger?.dropoffCoordinates) && (
                <>
                  {console.log('✅ Rendering dropoff marker:', {
                    status: currentPassenger?.status,
                    dropoffCoords: currentPassenger?.dropoffCoordinates,
                    isValid: isValidCoordinates(currentPassenger?.dropoffCoordinates),
                    markerCoord: {
                      latitude: currentPassenger.dropoffCoordinates[1],
                      longitude: currentPassenger.dropoffCoordinates[0],
                    }
                  })}
                  <Marker
                    key={`dropoff-${currentPassengerIndex}`}
                    coordinate={{
                      latitude: currentPassenger.dropoffCoordinates[1],
                      longitude: currentPassenger.dropoffCoordinates[0],
                    }}
                    title={`Thả ${currentPassenger.name}`}
                    description={currentPassenger.dropoffAddress}
                    pinColor="red"
                  />
                  {currentLocation && isValidCoordinates(currentPassenger?.dropoffCoordinates) && (
                    <Polyline
                      key={`polyline-inprogress-${routeCoordinates.length}`}
                      coordinates={routeCoordinates.length > 0 ? routeCoordinates : [
                        { latitude: currentLocation[1], longitude: currentLocation[0] },
                        { latitude: currentPassenger.dropoffCoordinates[1], longitude: currentPassenger.dropoffCoordinates[0] },
                      ]}
                      strokeColor={COLORS.primary}
                      strokeWidth={3}
                    />
                  )}
                </>
              )}

              {/* ARRIVED_AT_PICKUP state: Show pickup marker (waiting for start) */}
              {currentPassenger?.status === 'arrived_at_pickup' && isValidCoordinates(currentPassenger?.pickupCoordinates) && (
                <>
                  <Marker
                    key={`pickup-arrived-${currentPassengerIndex}`}
                    coordinate={{
                      latitude: currentPassenger.pickupCoordinates[1],
                      longitude: currentPassenger.pickupCoordinates[0],
                    }}
                    title={`Đã đến đón ${currentPassenger.name}`}
                    description={currentPassenger.pickupAddress}
                    pinColor="yellow"
                  />
                  {currentLocation && isValidCoordinates(currentPassenger?.pickupCoordinates) && (
                    <Polyline
                      key={`polyline-arrived-${routeCoordinates.length}`}
                      coordinates={routeCoordinates.length > 0 ? routeCoordinates : [
                        { latitude: currentLocation[1], longitude: currentLocation[0] },
                        { latitude: currentPassenger.pickupCoordinates[1], longitude: currentPassenger.pickupCoordinates[0] },
                      ]}
                      strokeColor={COLORS.primary}
                      strokeWidth={3}
                    />
                  )}
                </>
              )}
            </MapView>

            {/* Zoom Controls */}
            <View style={styles.zoomControls}>
              <TouchableOpacity style={styles.zoomBtn} onPress={handleZoomIn}>
                <MaterialIcons name="add" size={20} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.zoomBtn} onPress={handleZoomOut}>
                <MaterialIcons name="remove" size={20} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.zoomBtn} onPress={fitToCoordinates}>
                <MaterialIcons name="fit-screen" size={18} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Status Badge */}
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(currentPassenger?.status) }]}>
              <Text style={styles.statusText}>
                {getStatusLabel(currentPassenger?.status)} • {currentPassenger?.distance || 0} km
              </Text>
            </View>

            {/* Price Badge */}
            <View style={styles.priceBadge}>
              <Text style={styles.priceText}>{((currentPassenger?.fare || 0) / 1000).toFixed(0)}k</Text>
            </View>
          </View>
          

          {/* Details Section */}
          <ScrollView style={styles.detailsContainer} showsVerticalScrollIndicator={false}>
            {/* Empty State - No passengers yet */}
            {(!ride.customerId || ride.customerId.length === 0) ? (
              <View style={styles.emptyPassengerState}>
                <MaterialIcons name="people-outline" size={64} color={COLORS.primary} />
                <Text style={styles.emptyPassengerTitle}>Chờ khách yêu cầu</Text>
                <Text style={styles.emptyPassengerSubtitle}>
                  Khách sẽ được thêm vào khi họ chấp nhận chuyến đi
                </Text>
                <TouchableOpacity 
                  style={styles.refreshPassengerBtn}
                  onPress={() => fetchRideDetail()}
                >
                  <MaterialIcons name="refresh" size={20} color="#fff" />
                  <Text style={styles.refreshPassengerBtnText}>Làm mới</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {/* Ride Info Card - Only show when needed */}
                {currentPassenger && (currentPassenger.status === 'arrived_at_pickup' || currentPassenger.status === 'in_progress') && (
                  <View style={styles.infoCard}>
                    {currentPassenger.status === 'arrived_at_pickup' && (
                      <View style={styles.infoRow}>
                        <MaterialIcons name="location-on" size={20} color={COLORS.primary} />
                        <View style={styles.infoContent}>
                          <Text style={styles.infoLabel}>Điểm đón</Text>
                          <Text style={styles.infoText} numberOfLines={2}>{currentPassenger?.pickupAddress || 'N/A'}</Text>
                        </View>
                      </View>
                    )}

                    {currentPassenger.status === 'in_progress' && (
                      <View style={[styles.infoRow, currentPassenger.status === 'in_progress' && { borderTopWidth: 0, paddingTop: 0, marginTop: 0 }]}>
                        <MaterialIcons name="location-on" size={20} color="#f44336" />
                        <View style={styles.infoContent}>
                          <Text style={styles.infoLabel}>Điểm dừa</Text>
                          <Text style={styles.infoText} numberOfLines={2}>{currentPassenger?.dropoffAddress || 'N/A'}</Text>
                        </View>
                      </View>
                    )}
                  </View>
                )}

                {/* Passengers Info - Horizontal Carousel */}
                {ride.customerId && ride.customerId.length > 1 && (
                  <View style={styles.passengerCard}>
                    <Text style={styles.cardTitle}>Hành khách ({ride.customerId?.length || 0}/{ride.totalSeats})</Text>
                
                <FlatList
                  data={ride.customerId}
                  keyExtractor={(_, idx) => `passenger-${idx}`}
                  horizontal
                  scrollEnabled={true}
                  showsHorizontalScrollIndicator={false}
                  pagingEnabled={true}
                  scrollEventThrottle={16}
                  onScroll={(e) => {
                    const contentOffsetX = e.nativeEvent.contentOffset.x
                    // Calculate item width: 280 (card) + 12 (margin right) = 292
                    const ITEM_WIDTH = 292
                    const newIndex = Math.round(contentOffsetX / ITEM_WIDTH)
                    const maxIndex = (ride.customerId?.length || 1) - 1
                    const finalIndex = Math.max(0, Math.min(newIndex, maxIndex))
                    
                    console.log('🔄 Scroll event:', {
                      offsetX: contentOffsetX,
                      calculatedIndex: newIndex,
                      finalIndex: finalIndex,
                      currentIndex: currentPassengerIndex,
                      maxIndex: maxIndex,
                    })
                    
                    if (finalIndex !== currentPassengerIndex) {
                      console.log('✅ Updating passenger index to:', finalIndex)
                      setCurrentPassengerIndex(finalIndex)
                    }
                  }}
                  renderItem={({ item, index }) => (
                    <View style={[styles.passengerCardItem, index === currentPassengerIndex && styles.passengerCardItemActive]}>
                      {/* Avatar */}
                      <View style={styles.passengerCardAvatar}>
                        <MaterialIcons name="person" size={28} color={COLORS.primary} />
                      </View>

                      {/* Info */}
                      <View style={styles.passengerCardInfo}>
                        <Text style={styles.passengerCardName}>
                          {typeof item === 'string' ? item : item.name || 'Khách hàng'}
                        </Text>
                        <View style={styles.ratingRow}>
                          <MaterialIcons name="star" size={14} color="#FFD700" />
                          <Text style={styles.ratingText}>
                            {typeof item === 'object' ? item.rating || 4.5 : 4.5}
                          </Text>
                        </View>
                        <Text style={styles.passengerCardPhone}>
                          {typeof item === 'object' ? item.phone : 'N/A'}
                        </Text>
                      </View>

                      {/* Action Buttons */}
                      <View style={styles.passengerCardActions}>
                        <TouchableOpacity 
                          style={styles.passengerActionBtn}
                          onPress={() => {
                            if (currentPassenger) {
                              setShowChatScreen(true)
                            }
                          }}
                        >
                          <MaterialIcons name="chat" size={18} color="#fff" />
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={styles.passengerActionBtn}
                          onPress={() => {
                            if (currentPassenger?.phone) {
                              Alert.alert('Gọi khách', `Gọi ${currentPassenger.name}?`, [
                                { text: 'Hủy', style: 'cancel' },
                                { text: 'Gọi', onPress: () => console.log('Call:', currentPassenger.phone) },
                              ])
                            }
                          }}
                        >
                          <MaterialIcons name="call" size={18} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                />
              </View>
            )}

            {/* Single passenger info - when only 1 passenger */}
            {ride.customerId && ride.customerId.length === 1 && currentPassenger && (
              <View style={styles.passengerCard}>
                <Text style={styles.cardTitle}>Khách hàng</Text>
                <View style={styles.singlePassengerInfo}>
                  <View style={styles.passengerCardAvatar}>
                    <MaterialIcons name="person" size={32} color={COLORS.primary} />
                  </View>
                  <View style={{flex: 1}}>
                    <Text style={styles.passengerCardName}>{currentPassenger.name}</Text>
                    <View style={styles.ratingRow}>
                      <MaterialIcons name="star" size={14} color="#FFD700" />
                      <Text style={styles.ratingText}>{currentPassenger.rating || 4.5}</Text>
                    </View>
                    <Text style={styles.passengerCardPhone}>{currentPassenger.phone}</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Action Buttons - Based on passenger status */}
            <View style={styles.actionsContainer}>
              {(currentPassenger?.status === 'pending' || currentPassenger?.status === 'accepted') && (
                <TouchableOpacity 
                  style={[styles.actionBtn, styles.arrivingBtn]} 
                  onPress={handleMarkArrived}
                  disabled={updating}
                >
                  <MaterialIcons name="location-on" size={20} color="#fff" />
                  <Text style={styles.actionBtnText}>Bắt đầu đến điểm đón</Text>
                </TouchableOpacity>
              )}

              {currentPassenger?.status === 'arrived_at_pickup' && (
                <TouchableOpacity 
                  style={[styles.actionBtn, styles.startBtn]} 
                  onPress={handleStartRide}
                  disabled={updating}
                >
                  <MaterialIcons name="play-arrow" size={20} color="#fff" />
                  <Text style={styles.actionBtnText}>Bắt đầu chuyến đi</Text>
                </TouchableOpacity>
              )}

              {currentPassenger?.status === 'in_progress' && (
                <TouchableOpacity 
                  style={[styles.actionBtn, styles.completeBtn]} 
                  onPress={handleCompletePassenger}
                  disabled={updating}
                >
                  <MaterialIcons name="check-circle" size={20} color="#fff" />
                  <Text style={styles.actionBtnText}>Hoàn thành chuyến đi</Text>
                </TouchableOpacity>
              )}

              {currentPassenger?.status === 'completed' && (
                <View style={[styles.actionBtn, styles.completedBtn]}>
                  <MaterialIcons name="done-all" size={20} color="#fff" />
                  <Text style={styles.actionBtnText}>Đã hoàn thành</Text>
                </View>
              )}
            </View>
              </>
            )}
          </ScrollView>

          {/* Customer Request Modal */}
          <Modal
            visible={showCustomerModal}
            transparent
            animationType="slide"
            onRequestClose={handleRejectCustomer}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Khách hàng yêu cầu vào xe</Text>
                  <Text style={styles.modalCountdown}>{modalCountdown}s</Text>
                </View>

                {requestingCustomer && (
                  <View style={styles.customerCard}>
                    <View style={styles.customerAvatar}>
                      <MaterialIcons name="person" size={32} color={COLORS.primary} />
                    </View>
                    <View style={styles.customerDetails}>
                      <Text style={styles.customerName}>{requestingCustomer.name}</Text>
                      <Text style={styles.customerPhone}>{requestingCustomer.phone}</Text>
                      <View style={styles.ratingRow}>
                        <MaterialIcons name="star" size={14} color="#FFD700" />
                        <Text style={styles.ratingText}>{requestingCustomer.rating}⭐</Text>
                      </View>
                    </View>
                  </View>
                )}

                <View style={styles.modalButtons}>
                  <TouchableOpacity 
                    style={[styles.modalBtn, styles.rejectBtn]} 
                    onPress={handleRejectCustomer}
                    disabled={updating}
                  >
                    <Text style={styles.modalBtnText}>Từ chối</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.modalBtn, styles.acceptBtn]} 
                    onPress={handleAcceptCustomer}
                    disabled={updating}
                  >
                    <Text style={styles.modalBtnText}>Xác nhận</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          {/* Chat Modal */}
          <Modal 
            visible={showChatScreen} 
            animationType="slide"
            transparent={false}
          >
            {showChatScreen && currentPassenger && (
              <ChatScreen
                customer={{
                  id: currentPassenger._id,
                  name: currentPassenger.name,
                  phone: currentPassenger.phone,
                }}
                rideId={ride._id}
                onClose={() => setShowChatScreen(false)}
              />
            )}
          </Modal>

        </>
      )}
    </SafeAreaView>
  )
}

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'pending':
      return '⏱️ Chờ tài xế'
    case 'available':
      return '📍 Sẵn sàng'
    case 'in_progress':
      return '🚗 Đang chạy'
    case 'completed':
      return '✓ Hoàn thành'
    case 'cancelled':
      return '✗ Đã hủy'
    default:
      return status
  }
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending':
      return '#FFA500'
    case 'available':
      return '#2196F3'
    case 'in_progress':
      return '#4CAF50'
    case 'completed':
      return '#8BC34A'
    case 'cancelled':
      return '#f44336'
    default:
      return '#666'
  }
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.darkBg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.danger,
    fontWeight: '600',
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
  },
  retryButtonText: {
    color: COLORS.text,
    fontWeight: '600',
  },
  mapContainer: {
    height: '40%',
    position: 'relative',
    backgroundColor: COLORS.darkBg,
  },
  map: {
    flex: 1,
  },
  mapControls: {
    position: 'absolute',
    top: 42,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.darkCard,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spacer: {
    flex: 1,
  },
  zoomControls: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    gap: 8,
    zIndex: 10,
  },
  zoomBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  callButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${COLORS.success}20`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  sosButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF5252',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sosText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  statusBadge: {
    position: 'absolute',
    bottom: 60,
    left: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  priceBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.darkCard,
  },
  priceText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  detailsContainer: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  // Empty passenger state
  emptyPassengerState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 40,
  },
  emptyPassengerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 8,
  },
  emptyPassengerSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
  },
  refreshPassengerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    marginTop: 8,
  },
  refreshPassengerBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  infoCard: {
    backgroundColor: COLORS.darkCard,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginBottom: 2,
  },
  infoText: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '500',
  },
  passengerCard: {
    backgroundColor: COLORS.darkCard,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  // Horizontal Carousel Card
  passengerCardItem: {
    width: 280,
    backgroundColor: `${COLORS.primary}15`,
    borderRadius: 12,
    padding: 14,
    marginRight: 12,
    borderWidth: 1,
    borderColor: `${COLORS.primary}40`,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    opacity: 0.6,
  },
  passengerCardItemActive: {
    opacity: 1,
    borderColor: COLORS.primary,
    borderWidth: 2,
    backgroundColor: `${COLORS.primary}25`,
  },
  passengerCardAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: `${COLORS.primary}25`,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  passengerCardInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  singlePassengerInfo: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    padding: 12,
    backgroundColor: `${COLORS.primary}15`,
    borderRadius: 8,
  },
  passengerCardName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  passengerCardPhone: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  passengerCardActions: {
    gap: 8,
  },
  passengerActionBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Old vertical list styles (keep for compatibility)
  passengerItem: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.darkBg,
    alignItems: 'center',
  },
  passengerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${COLORS.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  passengerInfo: {
    flex: 1,
  },
  passengerName: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  passengerPhone: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  noPassenger: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 12,
  },
  waitingText: {
    fontSize: 12,
    color: COLORS.primary,
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  smallBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  editBtn: {
    backgroundColor: '#2196F3',
  },
  cancelBtn: {
    backgroundColor: '#f44336',
  },
  smallBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  // Action buttons
  actionsContainer: {
    gap: 12,
    marginBottom: 20,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  arrivingBtn: {
    backgroundColor: '#FFA500',
  },
  startBtn: {
    backgroundColor: '#2196F3',
  },
  completeBtn: {
    backgroundColor: '#4CAF50',
  },
  completedBtn: {
    backgroundColor: '#8BC34A',
    opacity: 0.6,
  },
  actionBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.darkCard,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    padding: 16,
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  modalCountdown: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  customerCard: {
    backgroundColor: COLORS.darkBg,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    flexDirection: 'row',
    gap: 12,
  },
  customerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${COLORS.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customerDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  customerName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  customerPhone: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
 ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  acceptBtn: {
    backgroundColor: '#4CAF50',
  },
  rejectBtn: {
    backgroundColor: '#f44336',
  },
  modalBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
})
