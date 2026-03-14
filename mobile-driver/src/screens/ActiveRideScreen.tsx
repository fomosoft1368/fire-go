import { useState, useEffect, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
  Animated,
  Dimensions,
  PanResponder,
  StatusBar,
} from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import * as Location from 'expo-location'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { LinearGradient } from 'expo-linear-gradient'
import { COLORS } from '../constants'
import MapViewComponent from '../components/MapView'
import { API_BASE_URL } from '../constants/config'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../types'
import { driverService } from '../services/driverService'
import { useSelector } from 'react-redux'
import type { RootState } from '../redux/store'

// Google Maps API Key from .env
const GOOGLE_MAPS_API_KEY = 'AIzaSyCR0-z2gtK6ax9qhn3Mhz87oclK84QXrIo'

const { height } = Dimensions.get('window')

// Bottom Sheet Constants - 2 states only
const COLLAPSED_HEIGHT = height * 0.20 // 20% of screen
const EXPANDED_HEIGHT = height * 0.85 // 85% of screen

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
  pickupCoordinates?: [number, number]
  dropoffCoordinates?: [number, number]
  pickupAddress?: string
  dropoffAddress?: string
}

export default function ActiveRideScreen({ navigation, route }: RideDetailScreenProps) {
  const [ride, setRide] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [currentLocation, setCurrentLocation] = useState<[number, number] | null>(null)
  const [showCustomerModal, setShowCustomerModal] = useState(false)
  const [requestingCustomer, setRequestingCustomer] = useState<Customer | null>(null)
  const screenNavigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const [modalCountdown, setModalCountdown] = useState(60)
  const [currentPassengerIndex, setCurrentPassengerIndex] = useState(0)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [fetchAttempts, setFetchAttempts] = useState(0)
  const [routeCoordinates, setRouteCoordinates] = useState<Array<{latitude: number, longitude: number}>>([])
  
  // Get driver from Redux
  const driver = useSelector((state: RootState) => state.auth.user)
  const statusFadeAnim = useRef(new Animated.Value(0)).current
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const isMountedRef = useRef(true)
  const mapRef = useRef<any>(null)

  // Bottom Sheet Animation - 2 states only
  const initialTranslateY = EXPANDED_HEIGHT - COLLAPSED_HEIGHT
  const translateY = useRef(new Animated.Value(initialTranslateY)).current
  const lastGestureY = useRef(initialTranslateY)
  const scrollViewRef = useRef<ScrollView>(null)

  // Lấy ride ID từ route params
  const rideId = route?.params?.rideId
  const combinedTripId = route?.params?.combinedTripId
  const sourceType = route?.params?.sourceType // 'ride' or 'combined_trip'
  
  // Use whichever ID is provided
  const tripId = combinedTripId || rideId

  // Current passenger
  const currentPassenger = ride?.customerId?.[currentPassengerIndex]

  // PanResponder for bottom sheet gestures - 2 states only
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only respond to vertical swipes
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
        console.log('🔍 [ActiveRideScreen] Starting location tracking for driver:', driver?._id)
        
        // ✅ CRITICAL FIX: Set fallback location immediately for 2nd driver onwards
        console.log('🎯 [ActiveRideScreen] Setting fallback location immediately...')
        setCurrentLocation([105.8542, 21.0285]) // Hanoi center as immediate fallback
        
        // Request location permissions
        const { status } = await Location.requestForegroundPermissionsAsync()
        console.log('📍 [ActiveRideScreen] Location permission status:', status)
        
        if (status !== 'granted') {
          console.warn('⚠️ [ActiveRideScreen] Location permission denied, keeping fallback location')
          return // Keep fallback location
        }

        console.log('✅ [ActiveRideScreen] Location permission granted, getting real location...')

        // ✅ TRY LAST KNOWN LOCATION FIRST (instant)
        try {
          console.log('📍 [ActiveRideScreen] Trying last known location first...')
          const lastLocation = await Location.getLastKnownPositionAsync({
            maxAge: 60000, // Accept locations up to 1 minute old
            requiredAccuracy: 100, // Accept accuracy up to 100 meters
          })
          
          if (lastLocation?.coords) {
            const { longitude, latitude } = lastLocation.coords
            console.log('✅ [ActiveRideScreen] Last known location obtained:', { latitude, longitude })
            if (typeof latitude === 'number' && typeof longitude === 'number' && 
                !isNaN(latitude) && !isNaN(longitude)) {
              setCurrentLocation([longitude, latitude])
              console.log('✅ [ActiveRideScreen] Using last known location as initial position')
            }
          }
        } catch (lastLocError) {
          console.warn('⚠️ [ActiveRideScreen] Could not get last known location:', lastLocError)
        }

        // ✅ AGGRESSIVE GPS FETCHING: Try multiple times to get real location
        let realLocationObtained = false
        const maxRetries = 3
        
        for (let attempt = 1; attempt <= maxRetries && !realLocationObtained; attempt++) {
          try {
            console.log(`🔍 [ActiveRideScreen] GPS attempt ${attempt}/${maxRetries}...`)
            const timeoutMs = 15000 // 15 seconds - enough time for GPS cold start
            const location = await Promise.race([
              Location.getCurrentPositionAsync({ 
                accuracy: Location.Accuracy.Balanced, // Balanced is faster than High
              }),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Location timeout')), timeoutMs)
              )
            ]) as any
            
            if (isMounted && location?.coords) {
              const { longitude, latitude } = location.coords
              
              console.log(`✅ [ActiveRideScreen] Real GPS location obtained (attempt ${attempt}):`, { latitude, longitude })
              
              if (typeof latitude === 'number' && typeof longitude === 'number' && 
                  !isNaN(latitude) && !isNaN(longitude)) {
                console.log('✅ [ActiveRideScreen] Updating to real GPS location:', { latitude, longitude })
                setCurrentLocation([longitude, latitude])
                realLocationObtained = true
                
                // Animate map to real driver location
                setTimeout(() => {
                  if (mapRef.current) {
                    console.log('🗺️ [ActiveRideScreen] Animating map to real driver location')
                    mapRef.current.animateToRegion({
                      latitude,
                      longitude,
                      latitudeDelta: 0.05,
                      longitudeDelta: 0.05,
                    }, 500)
                  }
                }, 300)
                break // Exit retry loop
              }
            }
          } catch (locError) {
            console.error(`❌ [ActiveRideScreen] GPS attempt ${attempt} failed:`, locError)
            if (attempt === maxRetries) {
              console.warn('❌ [ActiveRideScreen] All GPS attempts failed, keeping fallback location')
            } else {
              console.log(`⏳ [ActiveRideScreen] Retrying GPS in 1 second...`)
              await new Promise(resolve => setTimeout(resolve, 1000))
            }
          }
        }

        // Start watching location for continuous updates (prioritize getting real GPS)
        if (!realLocationObtained) {
          console.log('⚠️ [ActiveRideScreen] No real GPS yet, starting aggressive location watch...')
        }
        
        locationWatchId = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced, // Balanced is faster and sufficient
            timeInterval: realLocationObtained ? 5000 : 2000, // More frequent if still using fallback
            distanceInterval: realLocationObtained ? 20 : 5, // More sensitive if still using fallback
          },
          (location) => {
            if (isMounted && location?.coords) {
              const { longitude, latitude } = location.coords
              
              console.log('📍 [ActiveRideScreen] Location watch update:', { 
                latitude, 
                longitude,
                isRealGPS: realLocationObtained ? 'yes' : 'upgrading from fallback'
              })
              
              if (typeof latitude === 'number' && typeof longitude === 'number' && 
                  !isNaN(latitude) && !isNaN(longitude)) {
                setCurrentLocation([longitude, latitude])
                
                if (!realLocationObtained) {
                  console.log('✅ [ActiveRideScreen] Successfully upgraded from fallback to real GPS!')
                  realLocationObtained = true
                } else {
                  console.log('✅ [ActiveRideScreen] GPS location updated via watch')
                }
              }
            }
          }
        )
        
        console.log('✅ [ActiveRideScreen] Location watch started:', locationWatchId)
      } catch (error) {
        console.error('❌ [ActiveRideScreen] Error in location tracking:', error)
        // Ensure we always have some location set, even on error
        if (isMounted && !currentLocation) {
          console.log('🎯 [ActiveRideScreen] Setting fallback location due to error')
          setCurrentLocation([105.8542, 21.0285])
        }
      }
    }

    startLocationTracking()

    return () => {
      isMounted = false
      if (locationWatchId !== null) {
        console.log('🛑 [ActiveRideScreen] Stopping location watch:', locationWatchId)
        // locationWatchId has a .remove() method to unsubscribe from location updates
        if (locationWatchId.remove) {
          locationWatchId.remove()
        }
      }
    }
  }, [driver?._id]) // ✅ Add driver._id dependency to restart tracking when driver changes

  // Update driver location on server when currentLocation changes
  useEffect(() => {
    if (!currentLocation || !driver?._id) {
      console.log('[ActiveRideScreen] ⏭️ Skipping location update:', {
        hasLocation: !!currentLocation,
        hasDriver: !!driver?._id,
      })
      return
    }

    const updateServerLocation = async () => {
      try {
        const [lng, lat] = currentLocation
        console.log('[ActiveRideScreen] 📤 Updating driver location on server:', {
          lng,
          lat,
          driverId: driver._id,
        })

        const response = await driverService.updateLocation(driver._id, {
          coordinates: [lng, lat],
        })

        console.log('[ActiveRideScreen] ✅ Location updated on server:', {
          lng,
          lat,
          response: response ? 'success' : 'no response',
        })
      } catch (error: any) {
        console.warn('[ActiveRideScreen] ⚠️ Failed to update location on server:', {
          error: error.message,
          location: currentLocation,
        })
      }
    }

    updateServerLocation()
  }, [currentLocation, driver?._id])


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

  // ✅ CRITICAL FIX: Force route update when ride data changes
  // This ensures 2nd driver onwards get routes immediately after accepting
  useEffect(() => {
    console.log('🎯 [ActiveRideScreen] Ride data changed - checking for route update need:', {
      hasRide: !!ride,
      hasCustomers: ride?.customerId?.length > 0,
      currentPassenger: currentPassenger ? {
        name: currentPassenger.name,
        status: currentPassenger.status,
        hasPickup: !!currentPassenger.pickupCoordinates,
      } : null,
      currentLocation: currentLocation ? 'available' : 'waiting...',
    })

    // If we have a ride with customers but no route yet, trigger route calculation
    if (ride && currentPassenger && routeCoordinates.length === 0) {
      const needsRoute = ['pending', 'accepted', 'arrived_at_pickup', 'in_progress'].includes(currentPassenger.status)
      if (needsRoute) {
        console.log('🚀 [ActiveRideScreen] Triggering immediate route calculation for new driver...')
        // Small delay to ensure map is ready
        setTimeout(() => {
          if (isMountedRef.current) {
            setCurrentPassengerIndex(0) // This will trigger the map update useEffect
          }
        }, 100)
      }
    }
  }, [ride?._id, ride?.customerId?.length])

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
    console.log('🗺️ [ActiveRideScreen] Map update triggered:', {
      hasPassenger: !!currentPassenger,
      hasPickup: !!currentPassenger?.pickupCoordinates,
      hasLocation: !!currentLocation,
      hasMapRef: !!mapRef.current,
      passengerStatus: currentPassenger?.status,
      driverId: driver?._id,
    })

    // ✅ CRITICAL FIX: Even if currentLocation is null, still try to get route
    // This is especially important for 2nd driver onwards who need location + route
    if (!currentPassenger?.pickupCoordinates) {
      console.log('⚠️ Skipping map update - missing passenger pickup coordinates')
      return
    }

    console.log('🔄 Passenger changed, updating map to:', {
      index: currentPassengerIndex,
      name: currentPassenger.name,
      pickup: currentPassenger.pickupCoordinates,
      dropoff: currentPassenger.dropoffCoordinates,
      status: currentPassenger.status,
      currentLocation: currentLocation,
    })

    // Check if mapRef is ready
    if (!mapRef.current) {
      console.warn('⚠️ Map reference not ready yet, will retry on next update')
      return
    }

    // Reset route coordinates immediately to clear old routes
    console.log('🔄 Clearing route coordinates for new route fetch...')
    setRouteCoordinates([])

    // Fetch route and update map
    const updateMapAndRoute = async () => {
      // ✅ CRITICAL FIX: Wait for currentLocation if not available yet
      // This is especially important for 2nd driver onwards
      if (!currentLocation) {
        console.log('⏳ [ActiveRideScreen] Waiting for driver location before drawing route...')
        
        // Try to get location immediately for route drawing
        try {
          console.log('🔍 [ActiveRideScreen] Attempting to get current location for route...')
          const location = await Promise.race([
            Location.getCurrentPositionAsync({ 
              accuracy: Location.Accuracy.High,
            }),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Location timeout')), 5000)
            )
          ]) as any
          
          if (location?.coords) {
            const { longitude, latitude } = location.coords
            console.log('✅ [ActiveRideScreen] Got current location for route:', { latitude, longitude })
            
            if (typeof latitude === 'number' && typeof longitude === 'number' && 
                !isNaN(latitude) && !isNaN(longitude)) {
              // Update currentLocation state and proceed with route
              setCurrentLocation([longitude, latitude])
              
              // Use this fresh location for route calculation
              await calculateAndDrawRoute([longitude, latitude])
              return
            }
          }
        } catch (locError) {
          console.error('❌ [ActiveRideScreen] Could not get location for route:', locError)
        }
        
        // If we can't get location, use fallback Hanoi location
        console.log('⚠️ [ActiveRideScreen] Using fallback location for route drawing')
        const fallbackLocation: [number, number] = [105.8542, 21.0285] // Hanoi center
        setCurrentLocation(fallbackLocation)
        await calculateAndDrawRoute(fallbackLocation)
        return
      }
      
      // Use existing currentLocation
      await calculateAndDrawRoute(currentLocation)
    }
    
    // Helper function to calculate and draw route
    const calculateAndDrawRoute = async (startLocation: [number, number]) => {
      // Validate current location and passenger
      if (!startLocation || !currentPassenger?.pickupCoordinates) {
        console.warn('⚠️ Missing start location or passenger pickup coordinates')
        return
      }
      
      // First, get the route
      let startCoord = startLocation
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
        console.log('⚠️ [ActiveRideScreen] No route needed for status:', currentPassenger?.status)
        return
      }
      
      console.log('🗺️ [ActiveRideScreen] Getting route from', startCoord, 'to', endCoord)
      console.log('📋 [ActiveRideScreen] Current passenger details:', {
        index: currentPassengerIndex,
        name: currentPassenger.name,
        pickupCoordinates: currentPassenger.pickupCoordinates,
        dropoffCoordinates: currentPassenger.dropoffCoordinates,
        status: currentPassenger.status,
        requestId: currentPassenger.requestId,
      })
      
      // ✅ ALWAYS try to get route, even with fallback location
      const route = await getDirectionsRoute(startCoord, endCoord)
      console.log('✅ [ActiveRideScreen] Route received with', route.length, 'points')
      console.log('🎨 [ActiveRideScreen] Setting routeCoordinates state:', route.length, 'points')
      
      // ✅ Always set route coordinates, even if empty (clears old routes)
      setRouteCoordinates(route)
      
      // Fit map to show both driver and destination
      if (mapRef.current && route.length > 0) {
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
      } else if (mapRef.current) {
        // No route but we have map - just center on pickup location
        try {
          console.log('🎬 No route available, centering on pickup location')
          mapRef.current.animateToRegion({
            latitude: currentPassenger.pickupCoordinates[1],
            longitude: currentPassenger.pickupCoordinates[0],
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }, 500)
        } catch (error) {
          console.error('❌ Error centering on pickup:', error)
        }
      } else {
        console.warn('⚠️ Map reference not available for route display')
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
          pickupCoordinates: [105.79, 21.03], // 🔥 ADD pickup coordinates
          dropoffCoordinates: [105.85, 21.05], // 🔥 ADD dropoff coordinates
          pickupAddress: 'Điểm đón - Tây Hồ',
          dropoffAddress: 'Điểm đến - Hoàn Kiếm',
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
      
      // Get auth token
      const token = await AsyncStorage.getItem('token')
      if (!token) {
        throw new Error('No authentication token found')
      }
      
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
            'Authorization': `Bearer ${token}`,
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
        console.log(`📊 [ActiveRideScreen] [Attempt ${attempt}] Response analysis:`, {
          hasData: !!data,
          dataId: data?._id,
          dataStatus: data?.status,
          customerId: data?.customerId ? {
            isArray: Array.isArray(data.customerId),
            length: data.customerId.length,
            firstCustomer: data.customerId[0] ? {
              name: data.customerId[0].name,
              status: data.customerId[0].status,
              hasPickup: !!data.customerId[0].pickupCoordinates,
              hasDropoff: !!data.customerId[0].dropoffCoordinates,
            } : null,
          } : 'NOT_FOUND',
          driverId: data?.driverId,
          currentDriverId: data?.currentDriverId,
        })

        if (!data || !data._id) {
          console.error(`❌ [Attempt ${attempt}] Invalid data structure:`, { 
            hasData: !!data,
            hasId: !!data?._id,
            keys: data ? Object.keys(data).length : 0,
            fullData: data,
          })
          throw new Error('Server returned invalid ride data')
        }

        // ✅ CRITICAL: Filter out inactive customers to prevent UI errors
        // When driver 1 timeout → driver 2 accept, we only want active customers
        if (data.customerId && Array.isArray(data.customerId)) {
          const originalCount = data.customerId.length
          console.log(`🔍 [ActiveRideScreen] Before filter - customers:`, data.customerId.map((c: any) => ({
            id: c._id,
            name: c.name,
            status: c.status,
            hasStatus: !!c.status,
          })))
          
          // 🚨 CRITICAL FIX: Detect cancelled customers BEFORE filtering
          const oldCustomerIds = new Set((ride?.customerId || []).map((c: any) => c._id))
          const cancelledCustomers = data.customerId.filter((customer: any) => 
            customer.status === 'cancelled' && oldCustomerIds.has(customer._id)
          )
          
          // Filter out inactive customers
          data.customerId = data.customerId.filter((customer: any) => {
            // ✅ RELAXED FILTER: Keep customers that are active OR have no status (legacy data)
            // Only exclude customers explicitly marked as 'timeout', 'rejected', or 'cancelled'
            const excludedStatuses = ['timeout', 'rejected', 'cancelled']
            const shouldExclude = customer.status && excludedStatuses.includes(customer.status)
            
            if (shouldExclude) {
              console.log(`🗑️ [ActiveRideScreen] Filtered out inactive customer:`, {
                id: customer._id,
                name: customer.name,
                status: customer.status,
                reason: 'excluded status',
              })
            }
            return !shouldExclude // Keep if NOT in excluded list
          })
          
          // ✅ Show alert for cancelled customers (AFTER filtering, to avoid duplicate alerts)
          cancelledCustomers.forEach((customer: any) => {
            console.log(`🚨 [ActiveRideScreen] Customer cancelled:`, {
              id: customer._id,
              name: customer.name,
              status: customer.status,
            })
            
            setTimeout(() => {
              Alert.alert(
                'Khách hàng đã hủy chuyến',
                `${customer.name} đã hủy yêu cầu đặt xe. Ghế đã được hoàn lại.`,
                [{ text: 'OK' }]
              )
            }, 300) // Small delay to avoid alert during render
          })
          
          console.log(`🔄 [ActiveRideScreen] Customer filter: ${originalCount} → ${data.customerId.length} active`)
          console.log(`✅ [ActiveRideScreen] After filter - customers:`, data.customerId.map((c: any) => ({
            id: c._id,
            name: c.name,
            status: c.status,
          })))
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

  // Check if all passengers are completed
  const allPassengersCompleted = () => {
    if (!ride?.customerId || ride.customerId.length === 0) return true // Allow ending trip when no passengers
    return ride.customerId.every((passenger: any) => passenger.status === 'completed')
  }

  // Calculate total revenue from all passengers
  const getTotalRevenue = () => {
    if (!ride?.customerId || ride.customerId.length === 0) return 0
    return ride.customerId.reduce((total: number, passenger: any) => {
      return total + (passenger.totalFare || passenger.fare || 0)
    }, 0)
  }

  // Handle complete ride (end trip)
  const handleCompleteRide = async () => {
    if (!ride || !ride._id) {
      Alert.alert('Lỗi', 'Không thể tìm thấy thông tin chuyến đi')
      return
    }

    const totalRevenue = getTotalRevenue()

    Alert.alert(
      'Kết thúc chuyến đi',
      `Bạn chắc chắn muốn kết thúc chuyến đi này? Tổng tiền: ${totalRevenue.toLocaleString('vi-VN')}đ`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Kết thúc',
          onPress: async () => {
            setUpdating(true)
            try {
              // Determine correct endpoint based on source type
              let endpoint = ''
              if (sourceType === 'combined_trip' || combinedTripId) {
                endpoint = `${API_BASE_URL}/combined-trips/${combinedTripId || ride._id}/complete`
              } else {
                endpoint = `${API_BASE_URL}/rides/${rideId || ride._id}/complete`
              }

              console.log('📡 Calling complete ride with:', { endpoint, totalFare: totalRevenue })
              
              const response = await fetch(endpoint, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ totalFare: totalRevenue }),
              })
              
              if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                console.error('❌ Complete ride error:', response.status, errorData)
                throw new Error(`Failed: ${response.status}${errorData?.message ? ' - ' + errorData.message : ''}`)
              }
              
              console.log('✅ Ride completed successfully')
              Alert.alert('Thành công', 'Chuyến đi đã kết thúc', [
                { 
                  text: 'OK', 
                  onPress: () => {
                    // Navigate to Earnings tab to see updated earnings
                    screenNavigation.navigate('Earnings' as never)
                  }
                }
              ])
            } catch (error: any) {
              console.error('❌ Error:', error)
              Alert.alert('Lỗi', error.message)
            } finally {
              setUpdating(false)
            }
          },
        },
      ]
    )
  }

  const handleAcceptCustomer = async (requestData?: any) => {
    // 🔥 CRITICAL: Get coordinates from request data, NOT from mock requestingCustomer
    const customer = requestData || requestingCustomer
    
    if (!customer) {
      console.error('❌ [handleAcceptCustomer] No customer/request data provided')
      return
    }

    try {
      setUpdating(true)
      
      // 🔥 CRITICAL: Use ACTUAL coordinates from request, not fallback
      const pickupCoords = customer.pickupCoordinates
      const dropoffCoords = customer.dropoffCoordinates
      const pickupAddr = customer.pickupAddress || 'Điểm đón khách'
      const dropoffAddr = customer.dropoffAddress || 'Điểm đến khách'
      
      console.log('📍 [handleAcceptCustomer] Accepting customer with coordinates:', {
        customerName: customer.name || customer.customerId?.name,
        hasPickupCoords: !!pickupCoords,
        hasDropoffCoords: !!dropoffCoords,
        pickupCoords,
        dropoffCoords,
        pickupAddr,
        dropoffAddr,
        rideId,
        combinedTripId,
        sourceType,
        requestDataKeys: Object.keys(customer || {}).slice(0, 15),
      })
      
      // 🔥 CRITICAL: Validate we have coordinates before sending
      if (!pickupCoords || !dropoffCoords) {
        console.warn('⚠️ [handleAcceptCustomer] Missing coordinates:', {
          hasPickup: !!pickupCoords,
          hasDropoff: !!dropoffCoords,
        })
        Alert.alert('Lỗi', 'Dữ liệu địa chỉ không đầy đủ. Vui lòng thử lại.')
        return
      }
      
      // 🔥 CRITICAL: Use correct endpoint based on ride type
      let endpoint = ''
      let customerId = customer._id || customer.customerId?._id || customer.customerId
      
      if (sourceType === 'combined_trip' || combinedTripId) {
        // For combined trips, use the request endpoint with request ID
        const requestId = requestData?._id || customer._id
        endpoint = `${API_BASE_URL}/combined-trips/${combinedTripId}/requests/${requestId}/accept`
        console.log('🚗 Using combined-trips endpoint:', endpoint)
      } else {
        endpoint = `${API_BASE_URL}/rides/${rideId}/add-passenger`
        console.log('🚗 Using regular rides endpoint:', endpoint)
      }
      
      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          customerId: customerId,
          pickupCoordinates: pickupCoords,
          dropoffCoordinates: dropoffCoords,
          pickupAddress: pickupAddr,
          dropoffAddress: dropoffAddr,
        }),
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('❌ Accept customer error:', response.status, errorData)
        throw new Error(`Failed: ${response.status}${errorData?.message ? ' - ' + errorData.message : ''}`)
      }
      
      const updated = await response.json()
      console.log('✅ [handleAcceptCustomer] Server response:', {
        hasCustomers: !!updated?.customerId,
        customerCount: updated?.customerId?.length,
        firstCustomer: updated?.customerId?.[0] ? {
          name: updated.customerId[0].name,
          status: updated.customerId[0].status,
          hasPickupCoords: !!updated.customerId[0].pickupCoordinates,
          pickupCoords: updated.customerId[0].pickupCoordinates,
        } : null,
      })
      
      setRide(updated)
      setShowCustomerModal(false)
      setRequestingCustomer(null)
      setModalCountdown(60)
      
      // Refresh immediately to get full customer data with pickup/dropoff details
      await fetchRideDetail(false)
      
      Alert.alert('Thành công', 'Đã thêm khách hàng')
    } catch (error: any) {
      console.error('❌ [handleAcceptCustomer] Error:', error)
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

  // Các hàm zoom đã được di chuyển vào MapViewComponent
  /*
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
  */

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

  /*
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
  */

  useEffect(() => {
    Animated.timing(statusFadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start()
  }, [ride?.status])

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
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
          {/* Map - Full Screen like CreateRideScreen */}
          <MapViewComponent
            ref={mapRef}
            height={height}
            initialRegion={{
              latitude: currentPassenger?.pickupCoordinates?.[1] ?? 21.0285,
              longitude: currentPassenger?.pickupCoordinates?.[0] ?? 105.8542,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
            pickupCoords={currentPassenger?.pickupCoordinates && isValidCoordinates(currentPassenger.pickupCoordinates) ? {
              latitude: currentPassenger.pickupCoordinates[1],
              longitude: currentPassenger.pickupCoordinates[0]
            } : undefined}
            dropoffCoords={currentPassenger?.dropoffCoordinates && isValidCoordinates(currentPassenger.dropoffCoordinates) && currentPassenger?.status === 'in_progress' ? {
              latitude: currentPassenger.dropoffCoordinates[1],
              longitude: currentPassenger.dropoffCoordinates[0]
            } : undefined}
            driverCoords={currentLocation ? {
              latitude: currentLocation[1],
              longitude: currentLocation[0]
            } : undefined}
            routeCoordinates={routeCoordinates}
          />

          {/* Home Button */}
          <TouchableOpacity 
            style={styles.homeButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <MaterialIcons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>

          {/* Status Badge với gradient */}
          {/* <LinearGradient
            colors={['#FFFFFF', '#FFF5F0']}
            style={styles.statusBadge}
          >
            <View style={styles.statusBadgeContent}>
              <View style={[styles.statusDot, { backgroundColor: getStatusColor(currentPassenger?.status) }]} />
              <Text style={styles.statusText}>
                {getStatusLabel(currentPassenger?.status)}
              </Text>
            </View>
            <Text style={styles.statusDistance}>{currentPassenger?.distance || 0} km</Text>
          </LinearGradient> */}

          {/* Price Badge với gradient cam */}
          <LinearGradient
            colors={['#FF6B00', '#FF8534']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.priceBadge}
          >
            <View style={styles.priceIconBadge}>
              <MaterialIcons name="attach-money" size={18} color="#fff" />
            </View>
            <Text style={styles.priceText}>{((currentPassenger?.fare || 0) / 1000).toFixed(0)}k</Text>
          </LinearGradient>
          

          {/* Details Section - Draggable Bottom Sheet */}
          <Animated.View
            style={[
              styles.bottomSheetContainer,
              { transform: [{ translateY }], backgroundColor: 'transparent' }
            ]}
          >
            <View style={styles.bottomSheet}>
              {/* Drag Handle */}
              <View style={styles.dragHandleWrapper} {...panResponder.panHandlers}>
                <TouchableOpacity
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
                  <View style={styles.dragHandleBar} />
                </TouchableOpacity>
              </View>

              <ScrollView
                ref={scrollViewRef}
                style={styles.detailsContainer}
                showsVerticalScrollIndicator={false}
                bounces={false}
              >
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

                {/* End Trip Button for empty trips */}
                {ride && ride.status !== 'completed' && (
                  <TouchableOpacity 
                    onPress={handleCompleteRide}
                    disabled={updating}
                    activeOpacity={0.8}
                    style={{ marginTop: 16, width: '100%', paddingHorizontal: 20 }}
                  >
                    <LinearGradient
                      colors={['#10b981', '#059669']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={[styles.actionBtn, styles.endTripBtn]}
                    >
                      <View style={styles.actionBtnIconCircle}>
                        <MaterialIcons 
                          name="stop-circle" 
                          size={20} 
                          color="#10b981"
                        />
                      </View>
                      <Text style={styles.actionBtnText}>
                        Kết thúc chuyến đi
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <>
                {/* Ride Info Card với gradient - Only show when needed */}
                {currentPassenger && (currentPassenger.status === 'arrived_at_pickup' || currentPassenger.status === 'in_progress') && (
                  <LinearGradient
                    colors={['#FFF5F0', '#FFFFFF']}
                    style={styles.infoCard}
                  >
                    {currentPassenger.status === 'arrived_at_pickup' && (
                      <View style={styles.infoRow}>
                        <View style={styles.infoIconBadge}>
                          <MaterialIcons name="location-on" size={20} color="#fff" />
                        </View>
                        <View style={styles.infoContent}>
                          <Text style={styles.infoLabel}>ĐIỂM ĐÓN</Text>
                          <Text style={styles.infoText} numberOfLines={2}>{currentPassenger?.pickupAddress || 'N/A'}</Text>
                        </View>
                      </View>
                    )}

                    {currentPassenger.status === 'in_progress' && (
                      <View style={[styles.infoRow, currentPassenger.status === 'in_progress' && { borderTopWidth: 0, paddingTop: 0, marginTop: 0 }]}>
                        <View style={[styles.infoIconBadge, { backgroundColor: '#f44336' }]}>
                          <MaterialIcons name="flag" size={20} color="#fff" />
                        </View>
                        <View style={styles.infoContent}>
                          <Text style={styles.infoLabel}>ĐIỂM TRẢ</Text>
                          <Text style={styles.infoText} numberOfLines={2}>{currentPassenger?.dropoffAddress || 'N/A'}</Text>
                        </View>
                      </View>
                    )}
                  </LinearGradient>
                )}

                {/* Passengers Info - Horizontal Carousel */}
                {ride.customerId && ride.customerId.length > 1 && (
                  <View style={styles.passengerCard}>
                    <View style={styles.cardTitleRow}>
                      <View style={styles.cardTitleIconBadge}>
                        <MaterialIcons name="people" size={20} color="#FF6B00" />
                      </View>
                      <Text style={styles.cardTitle}>HÀNH KHÁCH ({ride.customerId?.length || 0}/{ride.totalSeats})</Text>
                    </View>
                
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
                    // Calculate item width: 330 (card) + 16 (margin right) = 346
                    const ITEM_WIDTH = 346
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
                    <View
                      style={[styles.passengerCardItem, index === currentPassengerIndex && styles.passengerCardItemActive]}
                    >
                      <View style={styles.passengerCardAvatar}>
                        <MaterialIcons name="person" size={32} color={COLORS.primary} />
                      </View>

                      <View style={styles.passengerCardInfo}>
                        <Text style={styles.passengerCardName}>
                          {typeof item === 'string' ? item : item.name || 'Khách hàng'}
                        </Text>
                        <View style={styles.ratingRow}>
                          <View style={styles.ratingBadge}>
                            <MaterialIcons name="star" size={14} color="#FFD700" />
                          </View>
                          <Text style={styles.ratingText}>
                            {typeof item === 'object' ? item.rating || 4.5 : 4.5}
                          </Text>
                        </View>
                        <Text style={styles.passengerCardPhone}>
                          {typeof item === 'object' ? item.phone : 'N/A'}
                        </Text>
                      </View>

                      <View style={styles.passengerCardActions}>
                        <TouchableOpacity 
                          style={styles.passengerActionBtn}
                          onPress={() => {
                            if (currentPassenger && ride) {
                              screenNavigation.navigate('ChatScreen', {
                                customer: {
                                  id: currentPassenger._id,
                                  name: currentPassenger.name,
                                  phone: currentPassenger.phone,
                                },
                                rideId: ride._id,
                              } as any)
                            }
                          }}
                        >
                          <MaterialIcons name="chat" size={20} color="#fff" />
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
                          <MaterialIcons name="call" size={20} color="#fff" />
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
                <View style={styles.cardTitleRow}>
                  <View style={styles.cardTitleIconBadge}>
                    <MaterialIcons name="person" size={20} color="#FF6B00" />
                  </View>
                  <Text style={styles.cardTitle}>KHÁCH HÀNG</Text>
                </View>
                <View style={styles.singlePassengerInfo}>
                  <View style={styles.passengerCardAvatar}>
                    <MaterialIcons name="person" size={32} color={COLORS.primary} />
                  </View>
                  <View style={{flex: 1}}>
                    <Text style={styles.passengerCardName}>{currentPassenger.name}</Text>
                    <View style={styles.ratingRow}>
                      <View style={styles.ratingBadge}>
                        <MaterialIcons name="star" size={14} color="#FFD700" />
                      </View>
                      <Text style={styles.ratingText}>{currentPassenger.rating || 4.5}</Text>
                    </View>
                    <Text style={styles.passengerCardPhone}>{currentPassenger.phone}</Text>
                  </View>
                  
                  {/* Chat and Call Buttons */}
                  <View style={styles.passengerCardActions}>
                    <TouchableOpacity 
                      style={styles.passengerActionBtn}
                      onPress={() => {
                        if (currentPassenger && ride) {
                          screenNavigation.navigate('ChatScreen', {
                            customer: {
                              id: currentPassenger._id,
                              name: currentPassenger.name,
                              phone: currentPassenger.phone,
                            },
                            rideId: ride._id,
                          } as any)
                        }
                      }}
                    >
                      <MaterialIcons name="chat" size={20} color="#fff" />
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
                      <MaterialIcons name="call" size={20} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </View>
                
              </View>
            )}

            {/* Action Buttons với gradient - Based on passenger status */}
            <View style={styles.actionsContainer}>
              {(currentPassenger?.status === 'pending' || currentPassenger?.status === 'accepted') && (
                <TouchableOpacity 
                  onPress={handleMarkArrived}
                  disabled={updating}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#FFA500', '#FF8C00']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.actionBtn, styles.arrivingBtn]}
                  >
                    <View style={styles.actionBtnIconCircle}>
                      <MaterialIcons name="location-on" size={20} color="#FFA500" />
                    </View>
                    <Text style={styles.actionBtnText}>Bắt đầu đến điểm đón</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}

              {currentPassenger?.status === 'arrived_at_pickup' && (
                <TouchableOpacity 
                  onPress={handleStartRide}
                  disabled={updating}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#2196F3', '#1976D2']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.actionBtn, styles.startBtn]}
                  >
                    <View style={styles.actionBtnIconCircle}>
                      <MaterialIcons name="play-arrow" size={20} color="#2196F3" />
                    </View>
                    <Text style={styles.actionBtnText}>Bắt đầu chuyến đi</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}

              {currentPassenger?.status === 'in_progress' && (
                <TouchableOpacity 
                  onPress={handleCompletePassenger}
                  disabled={updating}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#4CAF50', '#388E3C']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.actionBtn, styles.completeBtn]}
                  >
                    <View style={styles.actionBtnIconCircle}>
                      <MaterialIcons name="check-circle" size={20} color="#4CAF50" />
                    </View>
                    <Text style={styles.actionBtnText}>Hoàn thành chuyến đi</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}

              {currentPassenger?.status === 'completed' && (
                <LinearGradient
                  colors={['#8BC34A', '#689F38']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.actionBtn, styles.completedBtn]}
                >
                  <View style={styles.actionBtnIconCircle}>
                    <MaterialIcons name="done-all" size={20} color="#8BC34A" />
                  </View>
                  <Text style={styles.actionBtnText}>Đã hoàn thành</Text>
                </LinearGradient>
              )}

              {/* Total Revenue Display - Only show when has passengers */}
              {ride?.customerId && ride.customerId.length > 0 && (
                <View style={styles.totalRevenueCard}>
                  <View style={styles.totalRevenueIconBadge}>
                    <MaterialIcons name="account-balance-wallet" size={24} color="#FF6B00" />
                  </View>
                  <View style={styles.totalRevenueHeader}>
                    <Text style={styles.totalRevenueLabel}>TỔNG DOANH THU</Text>
                    <Text style={styles.totalRevenueAmount}>
                      {getTotalRevenue().toLocaleString('vi-VN')}đ
                    </Text>
                  </View>
                  <View style={styles.totalRevenueStatus}>
                    <View style={styles.statusIndicator}>
                      <View style={[styles.statusIndicatorBadge, { backgroundColor: allPassengersCompleted() ? '#ecfdf5' : '#fef3c7' }]}>
                        <MaterialIcons 
                          name={allPassengersCompleted() ? "check-circle" : "schedule"} 
                          size={18} 
                          color={allPassengersCompleted() ? '#10b981' : '#f59e0b'}
                        />
                      </View>
                      <Text style={styles.statusIndicatorText}>
                        {allPassengersCompleted() ? `Tất cả khách hoàn thành (${ride.customerId.length})` : `${ride.customerId.filter((p: any) => p.status === 'completed').length}/${ride.customerId.length} hoàn thành`}
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* End Trip Button - Only enabled when all passengers completed and ride not already completed */}
              {ride?.customerId && ride.customerId.length > 0 && ride.status !== 'completed' && (
                <TouchableOpacity 
                  onPress={handleCompleteRide}
                  disabled={!allPassengersCompleted() || ride.status === 'completed' || updating}
                  activeOpacity={0.8}
                >
                  <View
                    style={[styles.actionBtn, styles.endTripBtn, allPassengersCompleted() && ride.status !== 'completed' && styles.endTripBtnActive]}
                  >
                    <View style={[styles.actionBtnIconCircle, allPassengersCompleted() && ride.status !== 'completed' && styles.endTripIconActive]}>
                      <MaterialIcons 
                        name="stop-circle" 
                        size={20} 
                        color={allPassengersCompleted() && ride.status !== 'completed' ? "#10b981" : "#94a3b8"}
                      />
                    </View>
                    <Text style={[styles.actionBtnText, allPassengersCompleted() && ride.status !== 'completed' && styles.endTripTextActive]}>
                      Kết thúc chuyến đi
                    </Text>
                  </View>
                </TouchableOpacity>
              )}

              {/* Show completed state khi ride đã kết thúc */}
              {ride?.customerId && ride.customerId.length > 0 && ride.status === 'completed' && (
                <View style={[styles.actionBtn, styles.completedBtn]}>
                  <View style={[styles.actionBtnIconCircle, styles.completedIconCircle]}>
                    <MaterialIcons name="done-all" size={20} color="#10b981" />
                  </View>
                  <Text style={[styles.actionBtnText, styles.completedText]}>Chuyến đã kết thúc</Text>
                </View>
              )}
            </View>
              </>
            )}
          </ScrollView>
            </View>
          </Animated.View>

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

        </>
      )}
    </View>
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

// ...existing code...

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff', // White background
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    backgroundColor: '#fff',
  },
  loadingText: {
    fontSize: 14,
    color: '#666', // Gray text
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    backgroundColor: '#fff',
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
    borderRadius: 12, // More rounded
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  retryButtonText: {
    color: '#fff', // White text
    fontWeight: '600',
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
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  spacer: {
    flex: 1,
  },
  zoomControls: {
    position: 'absolute',
    top: 122,
    right: 12,
    flexDirection: 'column', // Vertical layout
    gap: 8,
    zIndex: 10,
  },
  homeButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 3,
    borderColor: '#fff',
    zIndex: 5,
  },
  zoomBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 3,
    borderColor: '#fff',
  },
  callButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 3,
    borderColor: '#fff',
  },
  sosButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FF5252',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF5252',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 3,
    borderColor: '#fff',
  },
  sosText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  statusBadge: {
    position: 'absolute',
    top: 10,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 5,
  },
  statusBadgeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#fff',
  },
  statusDistance: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
    marginLeft: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1a1a1a',
    letterSpacing: 0.3,
  },
  priceBadge: {
    position: 'absolute',
    top: 49,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
    zIndex: 5,
  },
  priceIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  priceText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 0.5,
  },
  // Bottom Sheet Styles
  bottomSheetContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: EXPANDED_HEIGHT,
    zIndex: 10,
    pointerEvents: 'box-none', // Allow touches to pass through to map
  },
  bottomSheet: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    shadowColor: '#FF6B00',
    shadowOffset: {
      width: 0,
      height: -6,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 15,
    pointerEvents: 'auto', // Capture touches on sheet
  },
  dragHandleWrapper: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  dragHandleBar: {
    width: 40,
    height: 5,
    backgroundColor: '#FFB380',
    borderRadius: 3,
  },
  detailsContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
  },
  // Empty passenger state
  emptyPassengerState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20, // More spacing
    paddingVertical: 60, // More padding
  },
  emptyPassengerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1a1a1a',
    marginTop: 8,
    letterSpacing: -0.5,
  },
  emptyPassengerSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    maxWidth: 300,
    lineHeight: 24,
    fontWeight: '500',
  },
  refreshPassengerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 32,
    paddingVertical: 16,
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    marginTop: 20,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 3,
    borderColor: '#fff',
  },
  refreshPassengerBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.3,
  },
  infoCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  infoIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
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
    color: COLORS.primary,
    fontWeight: '800',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  infoText: {
    fontSize: 15,
    color: '#1a1a1a',
    fontWeight: '700',
    lineHeight: 22,
  },
  passengerCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 0,
    overflow: 'hidden',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  cardTitleIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff5eb',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Horizontal Carousel Card
  passengerCardItem: {
    width: 330,
    minHeight: 140,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 24,
    padding: 20,
    marginRight: 16,
    borderWidth: 0,
    flexDirection: 'row',
    gap: 16,
    opacity: 0.6,
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  passengerCardItemActive: {
    opacity: 1,
    borderWidth: 0,
    backgroundColor: '#fff',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 16,
    transform: [{ scale: 1.03 }],
  },
  passengerCardAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF5F0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FF6B00',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  passengerCardInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  singlePassengerInfo: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  passengerCardName: {
    fontSize: 19,
    fontWeight: '900',
    color: '#1a1a1a',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  passengerCardPhone: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  passengerCardActions: {
    flexDirection: 'column',
    gap: 12,
    justifyContent: 'center',
  },
  passengerActionBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
    borderWidth: 0,
  },
  // Old vertical list styles (keep for compatibility)
  passengerItem: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0', // Light border
    alignItems: 'center',
  },
  passengerAvatar: {
    width: 48, // Bigger
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF5F0', // Light orange
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  passengerInfo: {
    flex: 1,
  },
  passengerName: {
    fontSize: 14, // Bigger
    fontWeight: '700',
    color: '#1a1a1a', // Dark text
  },
  passengerPhone: {
    fontSize: 13, // Bigger
    color: '#666', // Gray text
    marginTop: 4,
  },
  noPassenger: {
    fontSize: 13, // Bigger
    color: '#999', // Light gray
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 16,
  },
  waitingText: {
    fontSize: 13, // Bigger
    color: COLORS.primary,
    textAlign: 'center',
    marginTop: 12,
    fontWeight: '700',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10, // More spacing
  },
  smallBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12, // Taller
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  editBtn: {
    backgroundColor: '#2196F3',
  },
  cancelBtn: {
    backgroundColor: '#f44336',
  },
  smallBtnText: {
    fontSize: 13, // Bigger
    fontWeight: '700',
    color: '#fff',
  },
  // Action buttons
  actionsContainer: {
    gap: 16,
    marginBottom: 24,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  actionBtnIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrivingBtn: {},
  startBtn: {},
  completeBtn: {},
  completedBtn: {
    backgroundColor: '#ecfdf5',
    borderColor: '#d1fae5',
  },
  completedIconCircle: {
    backgroundColor: '#d1fae5',
  },
  completedText: {
    color: '#10b981',
  },
  endTripBtn: {},
  endTripBtnActive: {
    backgroundColor: '#ecfdf5',
    borderColor: '#d1fae5',
  },
  endTripIconActive: {
    backgroundColor: '#d1fae5',
  },
  endTripTextActive: {
    color: '#10b981',
  },
  actionBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: -0.2,
  },
  // Total Revenue Card
  totalRevenueCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginVertical: 20,
    borderWidth: 0,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  totalRevenueIconBadge: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff5eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  totalRevenueHeader: {
    marginBottom: 12,
  },
  totalRevenueLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  totalRevenueAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  totalRevenueStatus: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 16,
    marginTop: 12,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusIndicatorBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusIndicatorText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    flex: 1,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Lighter overlay
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 36,
    borderTopWidth: 6,
    borderTopColor: COLORS.primary,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#1a1a1a',
    letterSpacing: -0.3,
  },
  modalCountdown: {
    fontSize: 16,
    fontWeight: '900',
    color: '#fff',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#fff',
    overflow: 'hidden',
  },
  customerCard: {
    backgroundColor: '#FFF5F0',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    flexDirection: 'row',
    gap: 16,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  customerAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  customerDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  customerName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  customerPhone: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontWeight: '600',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ratingBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1a1a1a',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12, // More spacing
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 3,
    borderColor: '#fff',
  },
  acceptBtn: {
    backgroundColor: '#4CAF50',
  },
  rejectBtn: {
    backgroundColor: '#f44336',
  },
  modalBtnText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
})
