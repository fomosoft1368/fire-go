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
  Dimensions,
  PanResponder,
} from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import MapView, { Marker, Polyline } from 'react-native-maps'
import * as Location from 'expo-location'
import { COLORS } from '../constants'
import { API_BASE_URL } from '../constants/config'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../types'
import { driverService } from '../services/driverService'
import { useSelector } from 'react-redux'
import type { RootState } from '../redux/store'

// Google Maps API Key from .env
const GOOGLE_MAPS_API_KEY = 'AIzaSyCIcSzPA0jWhg0RvrN-kwxqxNcR4IJx3fY'

const { height } = Dimensions.get('window')

// Bottom Sheet Constants
const COLLAPSED_HEIGHT = height * 0.30 // 30% of screen
const EXPANDED_HEIGHT = height * 0.85 // 85% of screen
const MINIMIZED_HEIGHT = 60 // Just handle bar

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

  // Bottom Sheet Animation
  const initialTranslateY = EXPANDED_HEIGHT - COLLAPSED_HEIGHT
  const translateY = useRef(new Animated.Value(initialTranslateY)).current
  const lastGestureY = useRef(initialTranslateY)
  const scrollViewRef = useRef<ScrollView>(null)
  const isScrollEnabled = useRef(true)

  // Lấy ride ID từ route params
  const rideId = route?.params?.rideId
  const combinedTripId = route?.params?.combinedTripId
  const sourceType = route?.params?.sourceType // 'ride' or 'combined_trip'
  
  // Use whichever ID is provided
  const tripId = combinedTripId || rideId

  // Current passenger
  const currentPassenger = ride?.customerId?.[currentPassengerIndex]

  // PanResponder for bottom sheet gestures
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only respond to vertical swipes
        return Math.abs(gestureState.dy) > 5
      },
      onPanResponderGrant: () => {
        translateY.setOffset(lastGestureY.current)
        translateY.setValue(0)
      },
      onPanResponderMove: (_, gestureState) => {
        // Dragging down (positive dy) = increase translateY = show less
        // Dragging up (negative dy) = decrease translateY = show more
        const newY = gestureState.dy
        const minTranslate = 0 // Fully expanded
        const maxTranslate = EXPANDED_HEIGHT - MINIMIZED_HEIGHT // Minimized
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
        
        // Snap logic
        const expandedY = 0
        const collapsedY = EXPANDED_HEIGHT - COLLAPSED_HEIGHT
        const minimizedY = EXPANDED_HEIGHT - MINIMIZED_HEIGHT
        
        let targetY = collapsedY
        
        if (gestureState.dy < -50) {
          // Dragging up - snap to expanded
          targetY = expandedY
          isScrollEnabled.current = true
        } else if (gestureState.dy > 50) {
          // Dragging down - snap to minimized or collapsed
          if (currentY > (collapsedY + minimizedY) / 2) {
            targetY = minimizedY
            isScrollEnabled.current = false
          } else {
            targetY = collapsedY
            isScrollEnabled.current = true
          }
        } else {
          // Small movement - snap to nearest state
          const distToExpanded = Math.abs(currentY - expandedY)
          const distToCollapsed = Math.abs(currentY - collapsedY)
          const distToMinimized = Math.abs(currentY - minimizedY)
          
          if (distToExpanded < distToCollapsed && distToExpanded < distToMinimized) {
            targetY = expandedY
            isScrollEnabled.current = true
          } else if (distToMinimized < distToCollapsed) {
            targetY = minimizedY
            isScrollEnabled.current = false
          } else {
            targetY = collapsedY
            isScrollEnabled.current = true
          }
        }
        
        lastGestureY.current = targetY
        
        Animated.spring(translateY, {
          toValue: targetY,
          useNativeDriver: true,
          damping: 20,
          stiffness: 90,
        }).start()
      },
    })
  ).current

  // Helper function to snap to specific state
  const snapToState = (state: 'expanded' | 'collapsed' | 'minimized') => {
    let targetY = EXPANDED_HEIGHT - COLLAPSED_HEIGHT // collapsed by default
    
    if (state === 'expanded') {
      targetY = 0
      isScrollEnabled.current = true
    } else if (state === 'minimized') {
      targetY = EXPANDED_HEIGHT - MINIMIZED_HEIGHT
      isScrollEnabled.current = false
    } else {
      targetY = EXPANDED_HEIGHT - COLLAPSED_HEIGHT
      isScrollEnabled.current = true
    }
    
    lastGestureY.current = targetY
    
    Animated.spring(translateY, {
      toValue: targetY,
      useNativeDriver: true,
      damping: 20,
      stiffness: 90,
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

        // ✅ AGGRESSIVE GPS FETCHING: Try multiple times to get real location
        let realLocationObtained = false
        const maxRetries = 3
        
        for (let attempt = 1; attempt <= maxRetries && !realLocationObtained; attempt++) {
          try {
            console.log(`🔍 [ActiveRideScreen] GPS attempt ${attempt}/${maxRetries}...`)
            const timeoutMs = attempt === 1 ? 2000 : 5000
            const location = await Promise.race([
              Location.getCurrentPositionAsync({ 
                accuracy: Location.Accuracy.High,
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
            accuracy: Location.Accuracy.High,
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
              
              // ✅ Show notification when customer cancels
              if (customer.status === 'cancelled' && ride?.customerId?.find((c: any) => c._id === customer._id)) {
                // Only show alert if this customer was previously in the list (means they just cancelled)
                setTimeout(() => {
                  Alert.alert(
                    'Khách hàng đã hủy chuyến',
                    `${customer.name} đã hủy yêu cầu đặt xe. Ghế đã được hoàn lại.`,
                    [{ text: 'OK' }]
                  )
                }, 300) // Small delay to avoid alert during render
              }
            }
            return !shouldExclude // Keep if NOT in excluded list
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
    if (!ride?.customerId || ride.customerId.length === 0) return false
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
          {/* <View style={{ backgroundColor: '#f5f5f5', padding: 8, marginBottom: 4 }}>
            <Text style={{ fontSize: 10, color: '#666' }}>
              💡 Debug: Khách {currentPassengerIndex + 1}/{ride.customerId?.length}, Status: {currentPassenger?.status || 'N/A'}, Route points: {routeCoordinates.length}
            </Text>
            <Text style={{ fontSize: 10, color: '#666' }}>
              📍 Driver: {currentLocation ? 
                `[${currentLocation[0].toFixed(4)}, ${currentLocation[1].toFixed(4)}] ${
                  Math.abs(currentLocation[0] - 105.8542) > 0.01 || Math.abs(currentLocation[1] - 21.0285) > 0.01 
                    ? '✅ GPS thật' : '🔄 Fallback'
                }` : 
                'No location'
              }
            </Text>
            <Text style={{ fontSize: 10, color: '#666' }}>
              Pickup: [{currentPassenger?.pickupCoordinates?.[0]?.toFixed(4)}, {currentPassenger?.pickupCoordinates?.[1]?.toFixed(4)}]
            </Text>
            <Text style={{ fontSize: 10, color: '#666' }}>
              Dropoff: [{currentPassenger?.dropoffCoordinates?.[0]?.toFixed(4)}, {currentPassenger?.dropoffCoordinates?.[1]?.toFixed(4)}]
            </Text>
            <Text style={{ fontSize: 10, color: '#666' }}>
              Marker: {currentPassenger?.status === 'in_progress' ? '📍 Dropoff' : currentPassenger?.status === 'pending' || currentPassenger?.status === 'accepted' ? '🟢 Pickup' : '🟡 Arrived'}
            </Text>
            <Text style={{ fontSize: 10, color: '#666' }}>
              Coords valid: Pickup {isValidCoordinates(currentPassenger?.pickupCoordinates) ? '✅' : '❌'}, Dropoff {isValidCoordinates(currentPassenger?.dropoffCoordinates) ? '✅' : '❌'}
            </Text>
          </View> */}
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
              {/* Driver location (current location) - ✅ ALWAYS show driver marker */}
              {/* Use currentLocation if available, otherwise use fallback location */}
              {(() => {
                const driverCoords = currentLocation || [105.8542, 21.0285] // Hanoi fallback
                const isRealGPS = currentLocation && (
                  Math.abs(currentLocation[0] - 105.8542) > 0.01 || 
                  Math.abs(currentLocation[1] - 21.0285) > 0.01
                ) // Check if significantly different from fallback
                
                console.log('🔵 [ActiveRideScreen] Rendering driver marker:', {
                  coords: driverCoords,
                  isRealGPS: isRealGPS,
                  currentLocation: currentLocation,
                })
                
                return (
                  <Marker
                    coordinate={{
                      latitude: driverCoords[1],
                      longitude: driverCoords[0],
                    }}
                    title={isRealGPS ? "📍 Vị trí tài xế (GPS thật)" : "📍 Vị trí tài xế (đang tìm GPS...)"}
                    description={isRealGPS ? "Vị trí chính xác từ GPS" : "Đang lấy vị trí chính xác..."}
                    pinColor={isRealGPS ? "blue" : "orange"} // Orange for fallback, blue for real GPS
                    identifier="driver-marker"
                  />
                )
              })()}

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
                  {/* ✅ CRITICAL: Show polyline if route exists OR if we have any location */}
                  {/* This ensures 2nd driver onwards get polyline even with fallback location */}
                  {(routeCoordinates.length > 0 || currentLocation) && isValidCoordinates(currentPassenger?.pickupCoordinates) && (
                    <Polyline
                      key={`polyline-pending-${routeCoordinates.length}-${currentLocation?.[0]?.toFixed(4) || 'no-loc'}`}
                      coordinates={routeCoordinates.length > 0 ? routeCoordinates : [
                        { 
                          latitude: currentLocation ? currentLocation[1] : 21.0285, 
                          longitude: currentLocation ? currentLocation[0] : 105.8542 
                        },
                        { 
                          latitude: currentPassenger.pickupCoordinates[1], 
                          longitude: currentPassenger.pickupCoordinates[0] 
                        },
                      ]}
                      strokeColor={currentLocation ? COLORS.primary : `${COLORS.primary}80`}
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
                  {/* ✅ CRITICAL: Show polyline if route exists OR if we have currentLocation */}
                  {/* This ensures 2nd driver onwards get polyline even if location is still loading */}
                  {(routeCoordinates.length > 0 || currentLocation) && isValidCoordinates(currentPassenger?.dropoffCoordinates) && (
                    <Polyline
                      key={`polyline-inprogress-${routeCoordinates.length}`}
                      coordinates={routeCoordinates.length > 0 ? routeCoordinates : (
                        currentLocation ? [
                          { latitude: currentLocation[1], longitude: currentLocation[0] },
                          { latitude: currentPassenger.dropoffCoordinates[1], longitude: currentPassenger.dropoffCoordinates[0] },
                        ] : [
                          { latitude: currentPassenger.dropoffCoordinates[1], longitude: currentPassenger.dropoffCoordinates[0] },
                          { latitude: currentPassenger.dropoffCoordinates[1], longitude: currentPassenger.dropoffCoordinates[0] },
                        ]
                      )}
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
                  {/* ✅ CRITICAL: Show polyline if route exists OR if we have any location */}
                  {/* This ensures 2nd driver onwards get polyline even with fallback location */}
                  {(routeCoordinates.length > 0 || currentLocation) && isValidCoordinates(currentPassenger?.pickupCoordinates) && (
                    <Polyline
                      key={`polyline-arrived-${routeCoordinates.length}-${currentLocation?.[0]?.toFixed(4) || 'no-loc'}`}
                      coordinates={routeCoordinates.length > 0 ? routeCoordinates : [
                        { 
                          latitude: currentLocation ? currentLocation[1] : 21.0285, 
                          longitude: currentLocation ? currentLocation[0] : 105.8542 
                        },
                        { 
                          latitude: currentPassenger.pickupCoordinates[1], 
                          longitude: currentPassenger.pickupCoordinates[0] 
                        },
                      ]}
                      strokeColor={currentLocation ? COLORS.primary : `${COLORS.primary}80`}
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
                scrollEnabled={isScrollEnabled.current}
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
                    // Calculate item width: 320 (card) + 12 (margin right) = 332
                    const ITEM_WIDTH = 332
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
                      <View style={styles.passengerCardAvatar}>
                        <MaterialIcons name="person" size={28} color={COLORS.primary} />
                      </View>

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

              {/* Total Revenue Display - Only show when has passengers */}
              {ride?.customerId && ride.customerId.length > 0 && (
                <View style={styles.totalRevenueCard}>
                  <View style={styles.totalRevenueHeader}>
                    <Text style={styles.totalRevenueLabel}>Tổng doanh thu</Text>
                    <Text style={styles.totalRevenueAmount}>
                      {getTotalRevenue().toLocaleString('vi-VN')}đ
                    </Text>
                  </View>
                  <View style={styles.totalRevenueStatus}>
                    <View style={styles.statusIndicator}>
                      <MaterialIcons 
                        name={allPassengersCompleted() ? "check-circle" : "schedule"} 
                        size={16} 
                        color={allPassengersCompleted() ? "#4CAF50" : "#FFA500"}
                      />
                      <Text style={[styles.statusText, { color: allPassengersCompleted() ? "#4CAF50" : "#FFA500" }]}>
                        {allPassengersCompleted() ? `Tất cả khách hoàn thành (${ride.customerId.length})` : `${ride.customerId.filter((p: any) => p.status === 'completed').length}/${ride.customerId.length} hoàn thành`}
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* End Trip Button - Only enabled when all passengers completed and ride not already completed */}
              {ride?.customerId && ride.customerId.length > 0 && ride.status !== 'completed' && (
                <TouchableOpacity 
                  style={[styles.actionBtn, styles.endTripBtn, (!allPassengersCompleted() || ride.status === 'completed') && styles.endTripBtnDisabled]} 
                  onPress={handleCompleteRide}
                  disabled={!allPassengersCompleted() || ride.status === 'completed' || updating}
                >
                  <MaterialIcons 
                    name="stop-circle" 
                    size={20} 
                    color={allPassengersCompleted() && ride.status !== 'completed' ? "#fff" : "#999"}
                  />
                  <Text style={[styles.actionBtnText, (!allPassengersCompleted() || ride.status === 'completed') && { color: '#999' }]}>
                    Kết thúc chuyến đi
                  </Text>
                </TouchableOpacity>
              )}

              {/* Show completed state when ride is already finished */}
              {ride?.customerId && ride.customerId.length > 0 && ride.status === 'completed' && (
                <View style={[styles.actionBtn, styles.completedBtn]}>
                  <MaterialIcons name="done-all" size={20} color="#fff" />
                  <Text style={styles.actionBtnText}> Chuyến đã kết thúc</Text>
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

// ...existing code...

const styles = StyleSheet.create({
  safeArea: {
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
  mapContainer: {
    flex: 1, // Full screen height
    position: 'relative',
    backgroundColor: '#f5f5f5', // Light gray map background
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
    backgroundColor: '#fff', // White background
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
  zoomBtn: {
    width: 48, // Bigger
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary, // Orange
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  callButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4CAF50', // Green
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  sosButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF5252',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF5252',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
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
    paddingHorizontal: 16, // More padding
    paddingVertical: 10,
    borderRadius: 20, // More rounded
    backgroundColor: '#fff', // White badge
    borderWidth: 2,
    borderColor: COLORS.primary, // Orange border
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusText: {
    fontSize: 13, // Bigger
    fontWeight: '700',
    color: COLORS.primary, // Orange text
  },
  priceBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    paddingHorizontal: 20, // More padding
    paddingVertical: 12,
    borderRadius: 16, // More rounded
    backgroundColor: '#fff', // White background
    borderWidth: 2,
    borderColor: COLORS.primary, // Orange border
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  priceText: {
    fontSize: 18, // Bigger
    fontWeight: '900',
    color: COLORS.primary, // Orange text
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
    backgroundColor: '#fff',
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
    pointerEvents: 'auto', // Capture touches on sheet
  },
  dragHandleWrapper: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  dragHandleBar: {
    width: 40,
    height: 5,
    backgroundColor: '#ddd',
    borderRadius: 3,
  },
  detailsContainer: {
    flex: 1,
    paddingHorizontal: 16, // More padding
    paddingVertical: 16,
    backgroundColor: '#fff', // White background
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
    fontSize: 20, // Bigger
    fontWeight: '700',
    color: '#1a1a1a', // Dark text
    marginTop: 8,
  },
  emptyPassengerSubtitle: {
    fontSize: 15, // Bigger
    color: '#666', // Gray text
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 22,
  },
  refreshPassengerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 24, // More padding
    paddingVertical: 14,
    backgroundColor: COLORS.primary,
    borderRadius: 12, // More rounded
    marginTop: 16,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  refreshPassengerBtnText: {
    fontSize: 15, // Bigger
    fontWeight: '700',
    color: '#fff',
  },
  infoCard: {
    backgroundColor: '#fff', // White card
    borderRadius: 12, // More rounded
    padding: 16, // More padding
    marginBottom: 16,
    borderWidth: 2,
    borderColor: COLORS.primary, // Orange border
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
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
    fontSize: 13, // Bigger
    color: '#666', // Gray text
    fontWeight: '700',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoText: {
    fontSize: 14, // Bigger
    color: '#1a1a1a', // Dark text
    fontWeight: '600',
    lineHeight: 20,
  },
  passengerCard: {
    backgroundColor: '#fff', // White card
    borderRadius: 12,
    padding: 16, // More padding
    marginBottom: 16,
    borderWidth: 2,
    borderColor: COLORS.primary, // Orange border
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 15, // Bigger
    fontWeight: '700',
    color: '#1a1a1a', // Dark text
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Horizontal Carousel Card
  passengerCardItem: {
    width: 320,
    minHeight: 110, // Taller
    backgroundColor: '#FFF5F0', // Light orange
    borderRadius: 16, // More rounded
    padding: 16, // More padding
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#FFE5DB', // Light orange border
    flexDirection: 'row',
    gap: 12,
    opacity: 0.7,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  passengerCardItemActive: {
    opacity: 1,
    borderColor: COLORS.primary, // Orange border
    borderWidth: 3, // Thicker border
    backgroundColor: '#FFF5F0', // Light orange
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  passengerCardAvatar: {
    width: 64, // Bigger
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff', // White background
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
    gap: 16, // More spacing
    alignItems: 'center',
    padding: 16, // More padding
    backgroundColor: '#FFF5F0', // Light orange
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFE5DB',
  },
  passengerCardName: {
    fontSize: 16, // Bigger
    fontWeight: '700',
    color: '#1a1a1a', // Dark text
    marginBottom: 6,
  },
  passengerCardPhone: {
    fontSize: 13, // Bigger
    color: '#666', // Gray text
    marginTop: 2,
  },
  passengerCardActions: {
    flexDirection: 'column',
    gap: 10, // More spacing
    justifyContent: 'center',
  },
  passengerActionBtn: {
    width: 48, // Bigger
    height: 48,
    borderRadius: 12, // More rounded
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
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
    gap: 14, // More spacing
    marginBottom: 24,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16, // Taller
    paddingHorizontal: 20,
    borderRadius: 14, // More rounded
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
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
    opacity: 0.7,
  },
  actionBtnText: {
    fontSize: 16, // Bigger
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },
  // Total Revenue Card
  totalRevenueCard: {
    backgroundColor: '#fff', // White card
    borderRadius: 16, // More rounded
    padding: 20, // More padding
    marginVertical: 16,
    borderLeftWidth: 6, // Thicker accent
    borderLeftColor: COLORS.primary,
    borderWidth: 2,
    borderColor: '#FFE5DB', // Light orange border
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  totalRevenueHeader: {
    marginBottom: 12,
  },
  totalRevenueLabel: {
    fontSize: 13, // Bigger
    color: '#666', // Gray text
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  totalRevenueAmount: {
    fontSize: 28, // Bigger
    fontWeight: '900',
    color: COLORS.primary, // Orange text
  },
  totalRevenueStatus: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0', // Light border
    paddingTop: 12,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  // End Trip Button
  endTripBtn: {
    backgroundColor: '#10b981',
    borderWidth: 0,
  },
  endTripBtnDisabled: {
    backgroundColor: '#e0e0e0', // Light gray
    opacity: 0.6,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Lighter overlay
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff', // White modal
    borderTopLeftRadius: 24, // More rounded
    borderTopRightRadius: 24,
    padding: 20, // More padding
    paddingBottom: 32,
    borderTopWidth: 4,
    borderTopColor: COLORS.primary, // Orange top border
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 17, // Bigger
    fontWeight: '700',
    color: '#1a1a1a', // Dark text
  },
  modalCountdown: {
    fontSize: 15, // Bigger
    fontWeight: '900',
    color: COLORS.primary,
    backgroundColor: '#FFF5F0', // Light orange background
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  customerCard: {
    backgroundColor: '#f8f9fa', // Light gray
    borderRadius: 12,
    padding: 16, // More padding
    marginBottom: 20,
    flexDirection: 'row',
    gap: 14,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  customerAvatar: {
    width: 56, // Bigger
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFF5F0', // Light orange
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  customerDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  customerName: {
    fontSize: 16, // Bigger
    fontWeight: '700',
    color: '#1a1a1a', // Dark text
    marginBottom: 4,
  },
  customerPhone: {
    fontSize: 13, // Bigger
    color: '#666', // Gray text
    marginBottom: 6,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ratingText: {
    fontSize: 13, // Bigger
    fontWeight: '700',
    color: '#1a1a1a', // Dark text
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12, // More spacing
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 16, // Taller
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  acceptBtn: {
    backgroundColor: '#4CAF50',
  },
  rejectBtn: {
    backgroundColor: '#f44336',
  },
  modalBtnText: {
    fontSize: 16, // Bigger
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },
})
