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
import { LinearGradient } from 'expo-linear-gradient'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useRoute } from '@react-navigation/native'
import { MaterialIcons } from '@expo/vector-icons'
import * as Location from 'expo-location'
import { useSelector } from 'react-redux'
import type { RootState } from '../redux/store'
import { COLORS_DARK, COLORS_LIGHT, SPACING, BORDER_RADIUS } from '../constants'
import { combinedTripsService } from '../services/combinedTripsService'
import { API_BASE_URL } from '../constants/config'
import { calculateFare } from '../utils/pricing'

export default function FindingRideScreen({ navigation }: any) {
  const route = useRoute()
  const params = route.params as any
  const ride = params?.ride ?? null
  const pickupAddress = params?.pickupAddress ?? ''
  const dropoffAddress = params?.dropoffAddress ?? ''
  const distance = params?.distance ?? 0
  const duration = params?.duration ?? 0
  const startLng = params?.startLng ?? 105.8542  // Default Hanoi
  const startLat = params?.startLat ?? 21.0285
  const endLng = params?.endLng ?? 105.8542  // Customer's dropoff longitude
  const endLat = params?.endLat ?? 21.0285  // Customer's dropoff latitude
  const totalFare = params?.totalFare ?? 0
  const seats = params?.seats ?? 1
  const [selectedSeats, setSelectedSeats] = useState<number[]>([])
  const [tripData, setTripData] = useState(ride)
  // 🔍 Debug params
  console.log('[FindingRideScreen] 🔍 PARAMS RECEIVED:', {
    pickupAddress,
    dropoffAddress,
    distance,
    duration,
    totalFare,
    seats,
    pickupCoords: [startLng, startLat],
    dropoffCoords: [endLng, endLat],
  })

  const themeMode = useSelector((state: RootState) => state.theme.mode)
  const colors = themeMode === 'dark' ? COLORS_DARK : COLORS_LIGHT
  const user = useSelector((state: RootState) => state.auth.user)
  const totalSeats = tripData?.totalSeats || 4
  const bookedSeatsCount = tripData?.bookedSeats ?? (totalSeats - (tripData?.availableSeats ?? totalSeats))
  const availableSeats = totalSeats - bookedSeatsCount - selectedSeats.length
  // State
  const [rides, setRides] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isScanning, setIsScanning] = useState(true)
  const [activeFilter, setActiveFilter] = useState('all')
  const [currentLocation, setCurrentLocation] = useState<{ lng: number; lat: number } | null>(null)
  const [creatingNewTrip, setCreatingNewTrip] = useState(false)
  const [newTripId, setNewTripId] = useState<string | null>(null)
  const [showVehicleModal, setShowVehicleModal] = useState(false)
  const [selectedVehicleType, setSelectedVehicleType] = useState<'basic' | 'comfort' | 'premium'>('basic')
  const [vehiclePrices, setVehiclePrices] = useState({
    basic: totalFare,
    comfort: Math.round(totalFare * 1.3),
    premium: Math.round(totalFare * 1.6),
  })

  // Animation
  const scanAnim = useRef(new Animated.Value(0)).current
  const modalSlideAnim = useRef(new Animated.Value(0)).current
  const isMountedRef = useRef(true)
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Fetch SHARE rides on mount
  useEffect(() => {
    isMountedRef.current = true

    // Get current GPS location first
    getCurrentLocation()

    // Scanning animation
    startScanAnimation()

    return () => {
      isMountedRef.current = false
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [])

  // Calculate fare independently if not provided by params
  useEffect(() => {
    const calculateFareIfNeeded = async () => {
      // If totalFare already provided from params, use it
      if (totalFare > 0) {
        console.log('[FindingRideScreen] Updating vehicle prices from totalFare:', totalFare)
        setVehiclePrices({
          basic: totalFare,
          comfort: Math.round(totalFare * 1.3),
          premium: Math.round(totalFare * 1.6),
        })
        return
      }

      // Otherwise, calculate it here using pricing.ts
      if (distance > 0) {
        console.log('[FindingRideScreen] Calculating fare independently...', { distance, seats })
        try {
          // ✅ Distance is ALREADY in KM from params - no conversion needed!
          const distanceKm = distance

          // Tính giá cho TỪNG loại xe (cho 1 NGƯỜI, chưa giảm giá)
          const [sedanFare, suvFare, truckFare] = await Promise.all([
            calculateFare(distanceKm, 'sedan', 1), // Tính cho 1 người
            calculateFare(distanceKm, 'suv', 1),
            calculateFare(distanceKm, 'truck', 1),
          ])

          console.log('[FindingRideScreen] ✅ Calculated fares (1 person, no discount):', {
            sedan: sedanFare.finalPrice,
            suv: suvFare.finalPrice,
            truck: truckFare.finalPrice,
          })

          // Lưu giá cho 1 người (chưa discount)
          setVehiclePrices({
            basic: sedanFare.finalPrice,
            comfort: suvFare.finalPrice,
            premium: truckFare.finalPrice,
          })
        } catch (error) {

          // Fallback prices
          setVehiclePrices({
            basic: 50000,
            comfort: 65000,
            premium: 80000,
          })
        }
      }
    }

    calculateFareIfNeeded()
  }, [totalFare, distance, seats])

  // Fetch rides when location is obtained
  useEffect(() => {
    if (currentLocation) {
      fetchShareRides()

      // ✅ Poll for ride updates every 3 seconds (to get real-time seat availability)
      const pollInterval = setInterval(() => {
        if (isMountedRef.current) {
          console.log('[FindingRideScreen] Polling rides for updates...')
          fetchShareRides(false) // Don't show loading indicator
        }
      }, 3000)

      // Keep the old 30-second refresh as fallback
      refreshIntervalRef.current = setInterval(() => {
        if (isMountedRef.current) {
          console.log('[FindingRideScreen] Auto-refreshing rides (30s fallback)...')
          fetchShareRides(false)
        }
      }, 30000)

      return () => {
        clearInterval(pollInterval)
      }
    }
  }, [currentLocation])

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

  const getCurrentLocation = async () => {
    try {
      console.log('[FindingRideScreen] Getting current GPS location...')

      // Request permission
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        console.warn('[FindingRideScreen] Location permission denied')
        // Fallback to startLng, startLat from params
        if (isMountedRef.current) {
          setCurrentLocation({ lng: startLng, lat: startLat })
        }
        return
      }

      // Get current location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      })

      const { longitude, latitude } = location.coords
      console.log('[FindingRideScreen] ✅ Current location:', {
        lng: longitude,
        lat: latitude,
      })

      if (isMountedRef.current) {
        setCurrentLocation({ lng: longitude, lat: latitude })
      }
    } catch (error: any) {
      console.error('[FindingRideScreen] ❌ Location error:', error)
      if (isMountedRef.current) {
        // Fallback to startLng, startLat from params
        setCurrentLocation({ lng: startLng, lat: startLat })
      }
    }
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

      if (!currentLocation) {
        setError('Đang lấy vị trí của bạn...')
        return
      }

      console.log('[FindingRideScreen] Fetching COMBINED TRIPS from BOTH locations:')
      console.log('  1️⃣  Pickup address:', { pickupAddress, lng: startLng, lat: startLat })
      console.log('  2️⃣  Current GPS:', { lng: currentLocation.lng, lat: currentLocation.lat })

      // Fetch from BOTH locations (backend will use configured search radius)
      const [ridesFromPickup, ridesFromGPS] = await Promise.all([
        // Search near PICKUP address (user selected on map)
        combinedTripsService.findCombinedTrips(
          startLng,
          startLat,
          pickupAddress
        ),
        // Search near CURRENT GPS location (where user is right now)
        combinedTripsService.findCombinedTrips(
          currentLocation.lng,
          currentLocation.lat,
          pickupAddress
        ),
      ])

      console.log('[FindingRideScreen] Results:')
      console.log('  - From pickup address:', ridesFromPickup.length)
      console.log('  - From GPS location:', ridesFromGPS.length)

      // Merge and remove duplicates
      const allRides = [...ridesFromPickup, ...ridesFromGPS]
      const uniqueRides = Array.from(
        new Map(allRides.map((trip: any) => [trip._id, trip])).values()
      )

      console.log('[FindingRideScreen] Total unique trips:', uniqueRides.length)

      // ✅ Filter: Only show trips created by DRIVERS
      const driverTrips = uniqueRides.filter((trip: any) => trip.createdBy === 'driver')
      console.log('[FindingRideScreen] Driver-created trips only:', driverTrips.length)

      // Map and enrich ride data with safe defaults
      const enrichedRides = driverTrips.map((trip: any) => ({
        ...trip,
        pickupAddress: trip.pickupAddress || trip.pickup || pickupAddress,
        dropoffAddress: trip.dropoffAddress || 'Địa điểm đến',
        driverId: trip.driverId || { name: 'Tài xế', firstName: 'Tài', lastName: 'xế', rating: 5, totalReviews: 0 },
        totalFare: trip.totalFare || trip.baseFare || 50000,
        distance: trip.distance || 5,
        totalSeats: trip.totalSeats || 4,
        // ✅ Use availableSeats from backend (already calculated correctly)
        availableSeats: trip.availableSeats ?? ((trip.totalSeats || 4) - (trip.customerId?.length || 0)),
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

  const openVehicleModal = () => {
    setShowVehicleModal(true)
    Animated.spring(modalSlideAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start()
  }

  const closeVehicleModal = () => {
    Animated.timing(modalSlideAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setShowVehicleModal(false)
    })
  }

  const handleCreateNewTrip = async () => {
    // ✅ Prevent duplicate calls
    if (creatingNewTrip) {
      console.log('[FindingRideScreen] ⚠️ Already creating trip, ignoring duplicate call');
      return;
    }

    try {
      setCreatingNewTrip(true)
      const requestId = Date.now(); // Unique ID for this request
      console.log('[FindingRideScreen] 🆔 REQUEST ID:', requestId, '- STARTING');

      // Get auth token - use 'authToken' key like other services
      const token = await AsyncStorage.getItem('authToken')

      if (!token) {
        Alert.alert('Lỗi', 'Vui lòng đăng nhập lại')
        setCreatingNewTrip(false)
        return
      }

      // 🔍 Debug: Check fare calculation
      const basePricePerPerson = vehiclePrices[selectedVehicleType]

      // Tính discount theo số ghế
      const discountRate = seats === 1 ? 0 : seats === 2 ? 0.15 : seats === 3 ? 0.25 : 0.30
      const fareToSend = Math.round(basePricePerPerson * (1 - discountRate))

      console.log('[FindingRideScreen] 🆔', requestId, '🔍 FARE DEBUG:', {
        totalFareFromParams: totalFare,
        selectedVehicleType,
        basePricePerPerson,
        seats,
        discountRate: `${discountRate * 100}%`,
        fareAfterDiscount: fareToSend,
      })

      if (fareToSend === 0 || !fareToSend) {
        Alert.alert('Lỗi', 'Không thể tính giá cước. Vui lòng thử lại từ màn hình trước.')
        setCreatingNewTrip(false)
        return
      }

      console.log('[FindingRideScreen] 🆔', requestId, '🚀 Creating customer combined trip request...')
      console.log('[FindingRideScreen] 🆔', requestId, 'Request data:', {
        pickupAddress,
        dropoffAddress,
        pickupCoordinates: [startLng, startLat],
        dropoffCoordinates: [endLng, endLat],
        distance,
        duration,
        totalFare: fareToSend,
        seats,
        vehicleType: selectedVehicleType,
      })
      console.log('[FindingRideScreen] 🆔', requestId, 'API URL:', `${API_BASE_URL}/combined-trips/customer-request`)
      console.log('[FindingRideScreen] 🆔', requestId, 'Token:', token ? 'EXISTS' : 'MISSING')

      const requestPayload = {
        pickupAddress,
        dropoffAddress,
        pickupCoordinates: [startLng, startLat],
        dropoffCoordinates: [endLng, endLat],
        distance,
        duration,
        totalFare: fareToSend,
        seats,
        vehicleType: selectedVehicleType,
      }

      console.log('[FindingRideScreen] 🆔', requestId, '📤 SENDING REQUEST TO BACKEND')

      // Create combined trip from customer
      const response = await fetch(`${API_BASE_URL}/combined-trips/customer-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(requestPayload),
      })

      console.log('[FindingRideScreen] 🆔', requestId, 'Response status:', response.status, response.ok ? 'OK' : 'FAILED')

      const data = await response.json()
      console.log('[FindingRideScreen] 🆔', requestId, 'Response data:', data)

      if (!response.ok) {
        console.error('[FindingRideScreen] 🆔', requestId, '❌ Create trip failed:', data)
        throw new Error(data.message || 'Không thể tạo yêu cầu')
      }

      console.log('[FindingRideScreen] 🆔', requestId, '✅ Trip created successfully:', {
        tripId: data.trip?._id,
        fullResponse: data,
      })

      if (!data.trip?._id) {
        throw new Error('Trip ID not found in response')
      }

      setNewTripId(data.trip._id)

      // Poll trip status to check if driver accepted - no timeout, poll forever
      const tripId = data.trip._id
      console.log('[FindingRideScreen] Starting polling for trip:', tripId)

      pollIntervalRef.current = setInterval(async () => {
        try {
          const pollTimestamp = new Date().toISOString();
          console.log('[FindingRideScreen] ==========================================');
          console.log('[FindingRideScreen] 🔄 Polling at:', pollTimestamp);
          console.log('[FindingRideScreen] Trip ID:', tripId);

          // Use service method instead of direct fetch
          const tripData = await combinedTripsService.getCombinedTripDetail(tripId)

          console.log('[FindingRideScreen] ✅ Full trip data:', JSON.stringify(tripData, null, 2));
          console.log('[FindingRideScreen] Trip status:', tripData.status);
          console.log('[FindingRideScreen] Has driverId:', !!tripData.driverId);
          console.log('[FindingRideScreen] Driver info:', tripData.driverId);
          console.log('[FindingRideScreen] ==========================================');

          if (tripData.status === 'accepted') {
            console.log('[FindingRideScreen] ⚠️⚠️⚠️ TRIP ACCEPTED DETECTED ⚠️⚠️⚠️');
            console.log('[FindingRideScreen] Trip ID:', tripId);
            console.log('[FindingRideScreen] Driver ID:', tripData.driverId?._id || tripData.driverId);
            console.log('[FindingRideScreen] Driver name:', tripData.driverId ? `${tripData.driverId.firstName} ${tripData.driverId.lastName}` : 'Unknown');
            console.log('[FindingRideScreen] AcceptedAt:', tripData.acceptedAt);

            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current)
              pollIntervalRef.current = null
            }
            setCreatingNewTrip(false)
            setNewTripId(null)
            closeVehicleModal()

            // Navigate to DriverFoundScreen
            navigation.navigate('DriverFound', {
              combinedTripId: tripId,
            })
          } else if (tripData.status === 'cancelled') {
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current)
              pollIntervalRef.current = null
            }
            setCreatingNewTrip(false)
            setNewTripId(null)
          }
        } catch (error) {
          console.error('[FindingRideScreen] ❌ Error polling trip status:', error)
        }
      }, 1000) // Poll every 1 second

    } catch (error: any) {
      console.error('[FindingRideScreen] Error creating trip:', error)
      Alert.alert('Lỗi', error.message || 'Không thể tạo chuyến đi')
      setCreatingNewTrip(false)
    }
  }

  const handleCancelTrip = async () => {
    console.log('[FindingRideScreen] 🚫 Cancel trip requested, tripId:', newTripId)

    if (!newTripId) {
      console.warn('[FindingRideScreen] ⚠️ No trip ID to cancel')
      Alert.alert('Lỗi', 'Không tìm thấy chuyến đi để hủy')
      return
    }

    Alert.alert(
      'Hủy chuyến đi',
      'Bạn có chắc muốn hủy chuyến đi này không?',
      [
        { text: 'Không', style: 'cancel' },
        {
          text: 'Hủy chuyến',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('[FindingRideScreen] User confirmed cancellation')

              const token = await AsyncStorage.getItem('authToken')
              if (!token) {
                console.error('[FindingRideScreen] ❌ No auth token found')
                Alert.alert('Lỗi', 'Vui lòng đăng nhập lại')
                return
              }

              console.log('[FindingRideScreen] Calling cancel API:', `${API_BASE_URL}/combined-trips/${newTripId}/cancel`)

              const response = await fetch(`${API_BASE_URL}/combined-trips/${newTripId}/cancel`, {
                method: 'PATCH',
                headers: {
                  'Authorization': `Bearer ${token}`,
                },
              })

              console.log('[FindingRideScreen] Cancel response status:', response.status)

              if (response.ok) {
                console.log('[FindingRideScreen] ✅ Trip cancelled successfully')

                // Clear polling interval
                if (pollIntervalRef.current) {
                  clearInterval(pollIntervalRef.current)
                  pollIntervalRef.current = null
                  console.log('[FindingRideScreen] Polling stopped')
                }

                setCreatingNewTrip(false)
                setNewTripId(null)
                closeVehicleModal()
                Alert.alert('Đã hủy', 'Chuyến đi đã được hủy thành công')
              } else {
                const errorData = await response.json()
                console.error('[FindingRideScreen] ❌ Cancel failed:', errorData)
                Alert.alert('Lỗi', errorData.message || 'Không thể hủy chuyến đi')
              }
            } catch (error: any) {
              console.error('[FindingRideScreen] ❌ Error cancelling trip:', error)
              Alert.alert('Lỗi', 'Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.')
            }
          },
        },
      ]
    )
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
        style={styles.rideCardContainer}
        activeOpacity={0.7}
        onPress={() => handleSelectRide(item)}
      >
        <LinearGradient
          colors={isFirstCard ? ['#FFFFFF', '#FFF5F0'] : ['#FFFFFF', '#FAFAFA']}
          style={[
            styles.rideCard,
            isFirstCard && styles.bestMatchCard,
          ]}
        >
          {/* Best Match Badge */}
          {isFirstCard && (
            <LinearGradient
              colors={['#FF6B00', '#FF8534']}
              style={styles.bestMatchBadge}
            >
              <View style={styles.badgeIconCircle}>
                <MaterialIcons name="star" size={14} color="#FFD700" />
              </View>
              <Text style={styles.badgeText}>PHÙ HỢP NHẤT</Text>
            </LinearGradient>
          )}

          {/* Card Header */}
          <View style={styles.cardHeader}>
            {/* Driver Info */}
            <View style={styles.driverSection}>
              <LinearGradient
                colors={isFirstCard ? ['#FF6B00', '#FF8534'] : ['#FFFFFF', '#F5F5F5']}
                style={[styles.driverAvatar, isFirstCard && { borderColor: '#FFFFFF' }]}
              >
                <MaterialIcons name="person" size={32} color={isFirstCard ? '#FFFFFF' : colors.textSecondary} />
              </LinearGradient>
              <View style={styles.driverInfo}>
                <Text style={[styles.driverName, { color: colors.text }]}>
                  {item.driverId?.firstName || 'Tài'} {item.driverId?.lastName || 'xế'}
                </Text>
                <View style={styles.driverMeta}>
                  <View style={styles.ratingBadgeContainer}>
                    <View style={styles.starIconBadge}>
                      <MaterialIcons name="star" size={12} color="#FFD700" />
                    </View>
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
            <LinearGradient
              colors={['#FF6B00', '#FF8534']}
              style={styles.priceSection}
            >
              <View style={styles.priceIconBadge}>
                <MaterialIcons name="attach-money" size={18} color="#FF6B00" />
              </View>
              <View>
                <Text style={styles.price}>₫{(item.baseFare || 0).toLocaleString('vi-VN')}</Text>
                {isFirstCard && (
                  <Text style={styles.oldPrice}>₫{Math.round((item.baseFare || 0) * 1.2).toLocaleString('vi-VN')}</Text>
                )}
              </View>
            </LinearGradient>
          </View>

          {/* Match & Metrics Bar */}
          {isFirstCard && (
            <LinearGradient
              colors={['rgba(255, 107, 0, 0.1)', 'rgba(255, 245, 240, 0.8)']}
              style={styles.metricsBar}
            >
              <View style={styles.matchSection}>
                <View style={styles.matchIconBadge}>
                  <MaterialIcons name="trending-up" size={16} color="#FF6B00" />
                </View>
                <View style={styles.progressBarContainer}>
                  <Text style={styles.matchPercent}>98% TRÙNG KHỚP</Text>
                  <View style={styles.progressBar}>
                    <LinearGradient
                      colors={['#FF6B00', '#FF8534']}
                      style={[styles.progressFill, { width: '98%' }]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    />
                  </View>
                </View>
              </View>
              <View style={styles.metricsDivider} />
              <View style={styles.seatsSection}>
                <View style={styles.seatIconBadge}>
                  <MaterialIcons name="event-seat" size={18} color="#FF6B00" />
                </View>
                <View>
                  <Text style={[styles.seatsNumber, { color: colors.text }]}>
                    {item.availableSeats || 0}
                  </Text>
                  <Text style={[styles.seatsLabel, { color: colors.textSecondary }]}>GHẾ TRỐNG</Text>
                </View>
              </View>
            </LinearGradient>
          )}

          {/* Info Tags */}
          {!isFirstCard && (
            <View style={styles.infoTags}>
              <LinearGradient
                colors={['rgba(255, 245, 240, 0.8)', 'rgba(255, 255, 255, 0.6)']}
                style={styles.tag}
              >
                <MaterialIcons name="route" size={12} color="#FF6B00" />
                <Text style={[styles.tagText, { color: colors.text }]}>85% Trùng đường</Text>
              </LinearGradient>
              <LinearGradient
                colors={['rgba(255, 245, 240, 0.8)', 'rgba(255, 255, 255, 0.6)']}
                style={styles.tag}
              >
                <MaterialIcons name="access-time" size={12} color="#FF6B00" />
                <Text style={[styles.tagText, { color: colors.text }]}>Chờ 15p</Text>
              </LinearGradient>
              <LinearGradient
                colors={['rgba(255, 245, 240, 0.8)', 'rgba(255, 255, 255, 0.6)']}
                style={styles.tag}
              >
                <MaterialIcons name="event-seat" size={12} color="#FF6B00" />
                <Text style={[styles.tagText, { color: colors.text }]}>{item.availableSeats || 1} Ghế</Text>
              </LinearGradient>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            {isFirstCard ? (
              <>
                <TouchableOpacity
                  style={styles.primaryButtonContainer}
                  onPress={() => handleSelectRide(item)}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#FF6B00', '#FF8534']}
                    style={styles.primaryButton}
                  >
                    <View style={styles.primaryBtnIconCircle}>
                      <MaterialIcons name="flash-on" size={20} color="#FF6B00" />
                    </View>
                    <Text style={styles.primaryButtonText}>GHÉP NGAY</Text>
                    <MaterialIcons name="arrow-forward" size={20} color="#FFFFFF" />
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.secondaryButtonContainer}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#FFFFFF', '#FFF5F0']}
                    style={styles.secondaryButton}
                  >
                    <MaterialIcons name="chat" size={20} color="#FF6B00" />
                  </LinearGradient>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={styles.secondaryFullButtonContainer}
                onPress={() => handleSelectRide(item)}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#FFFFFF', '#FFF5F0']}
                  style={styles.secondaryFullButton}
                >
                  <Text style={[styles.secondaryButtonText, { color: '#FF6B00' }]}>Xem chi tiết</Text>
                  <MaterialIcons name="arrow-forward" size={18} color="#FF6B00" />
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        </LinearGradient>
      </TouchableOpacity>
    )
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.card }]}>
      <StatusBar
        barStyle={themeMode === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={colors.card}
      />

      {/* Header with Route Info */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
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
              <View style={[styles.markerDot, { borderColor: '#FF6B00' }]} />
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
        style={[styles.filterScroll, { backgroundColor: colors.card }]}
        contentContainerStyle={styles.filterContainer}
      >
        {[
          { id: 'all', label: 'Tất cả', icon: 'bolt' },
          { id: 'cheap', label: 'Giá rẻ nhất', icon: null },
          { id: 'female', label: 'Tài xế nữ', icon: 'female' },
          { id: '5star', label: '5.0 Sao', icon: 'star' },
          { id: 'van', label: 'Xe 7 chỗ', icon: 'airport-shuttle' },
        ].map((filter) => (
          <TouchableOpacity
            key={filter.id}
            style={[
              styles.filterChip,
              {
                backgroundColor: activeFilter === filter.id ? '#FF6B00' : colors.warning,
                borderColor: activeFilter === filter.id ? '#FF6B00' : colors.border,
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
        <Text style={[styles.sortText, { color: '#FF6B00' }]}>Sắp xếp: Phù hợp nhất</Text>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B00" />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Đang tải chuyến xe...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={48} color={colors.textSecondary} />
          <Text style={[styles.errorText, { color: colors.text }]}>{error}</Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: '#FF6B00' }]}
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
          ListHeaderComponent={
            <View>
              {/* Create New Trip Card - Grab-like flow */}
              <LinearGradient
                colors={['#FFFFFF', '#FFF5F0']}
                style={styles.createTripCard}
              >
                <View style={styles.createTripHeader}>
                  <LinearGradient
                    colors={['#FF6B00', '#FF8534']}
                    style={styles.createTripIcon}
                  >
                    <MaterialIcons name="add-circle" size={32} color="#FFFFFF" />
                  </LinearGradient>
                  <View style={styles.createTripInfo}>
                    <Text style={[styles.createTripTitle, { color: colors.text }]}>
                      TẠO CHUYẾN MỚI
                    </Text>
                    <Text style={[styles.createTripSubtitle, { color: colors.textSecondary }]}>
                      Quét liên tục cho đến khi tìm thấy tài xế
                    </Text>
                  </View>
                  {creatingNewTrip && (
                    <ActivityIndicator color="#FF6B00" />
                  )}
                </View>

                {creatingNewTrip ? (
                  <View style={styles.searchingContainer}>
                    <Text style={[styles.searchingText, { color: '#FF6B00' }]}>
                      🔍 Đang tìm tài xế gần bạn...
                    </Text>
                    <Text style={[styles.searchingSubtext, { color: colors.textSecondary }]}>
                      Quét liên tục mỗi 30 giây
                    </Text>
                    <View style={styles.searchingProgress}>
                      <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                        <Animated.View
                          style={[
                            styles.progressFill,
                            {
                              backgroundColor: '#FF6B00',
                              transform: [
                                {
                                  scaleX: scanAnim,
                                },
                              ],
                            },
                          ]}
                        />
                      </View>
                    </View>
                    <TouchableOpacity
                      style={[styles.cancelTripButton, { backgroundColor: colors.card, borderColor: '#ff4444' }]}
                      onPress={handleCancelTrip}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.cancelTripButtonText, { color: '#ff4444' }]}>Hủy chuyến</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.createTripButtonContainer}
                    onPress={openVehicleModal}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={['#FF6B00', '#FF8534']}
                      style={styles.createTripButton}
                    >
                      <View style={styles.createBtnIconCircle}>
                        <MaterialIcons name="flash-on" size={22} color="#FFD700" />
                      </View>
                      <Text style={styles.createTripButtonText}>TẠO CHUYẾN & CHỜ TÀI XẾ</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </LinearGradient>
              {/* Divider */}
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <LinearGradient
                  colors={['#FFFFFF', '#FFF5F0']}
                  style={styles.dividerTextContainer}
                >
                  <Text style={[styles.dividerText, { color: '#FF6B00' }]}>
                    HOẶC THAM GIA CHUYẾN CÓ SẴN
                  </Text>
                </LinearGradient>
                <View style={styles.dividerLine} />
              </View>
            </View>
          }
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

      {/* Vehicle Type Selection Modal */}
      {showVehicleModal && (
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={creatingNewTrip ? undefined : closeVehicleModal}
          />
          <Animated.View
            style={[
              styles.modalContent,
              {
                backgroundColor: colors.card,
                transform: [
                  {
                    translateY: modalSlideAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [600, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHandle} />
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {creatingNewTrip ? 'Đang tìm tài xế...' : 'Chọn loại xe'}
              </Text>
              {!creatingNewTrip && (
                <TouchableOpacity onPress={closeVehicleModal} style={styles.modalCloseButton}>
                  <MaterialIcons name="close" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            {/* Creating Trip State */}
            {creatingNewTrip ? (
              <View style={styles.creatingTripContainer}>
                <View style={styles.scanningAnimation}>
                  <Animated.View
                    style={[
                      styles.scanRing,
                      {
                        opacity: scanAnim.interpolate({
                          inputRange: [0, 0.5, 1],
                          outputRange: [0.3, 0.8, 0.3],
                        }),
                        transform: [
                          {
                            scale: scanAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [0.8, 1.4],
                            }),
                          },
                        ],
                      },
                    ]}
                  >
                    <View style={[styles.scanRingInner, { borderColor: '#38e07b' }]} />
                  </Animated.View>
                  <MaterialIcons name="search" size={48} color="#38e07b" />
                </View>

                <Text style={[styles.scanningTitle, { color: colors.text }]}>
                  Đang quét tài xế gần bạn
                </Text>
                <Text style={[styles.scanningSubtitle, { color: colors.textSecondary }]}>
                  Quét mỗi 30 giây cho đến khi tìm thấy tài xế
                </Text>

                <View style={styles.tripInfoBox}>
                  <View style={styles.tripInfoRow}>
                    <MaterialIcons name="directions-car" size={20} color={colors.textSecondary} />
                    <Text style={[styles.tripInfoLabel, { color: colors.textSecondary }]}>
                      Loại xe:
                    </Text>
                    <Text style={[styles.tripInfoValue, { color: colors.text }]}>
                      {selectedVehicleType === 'basic' ? 'Sedan' : selectedVehicleType === 'comfort' ? 'SUV' : 'Truck'}
                    </Text>
                  </View>
                  <View style={styles.tripInfoRow}>
                    <MaterialIcons name="people" size={20} color={colors.textSecondary} />
                    <Text style={[styles.tripInfoLabel, { color: colors.textSecondary }]}>
                      Số ghế đặt:
                    </Text>
                    <Text style={[styles.tripInfoValue, { color: colors.text }]}>
                      {seats} người
                    </Text>
                  </View>
                  <View style={styles.tripInfoRow}>
                    <MaterialIcons name="attach-money" size={20} color={colors.textSecondary} />
                    <Text style={[styles.tripInfoLabel, { color: colors.textSecondary }]}>
                      Giá gốc (1 người):
                    </Text>
                    <Text style={[styles.tripInfoValue, { color: colors.textSecondary }]}>
                      ₫{vehiclePrices[selectedVehicleType].toLocaleString('vi-VN')}
                    </Text>
                  </View>
                  {seats > 1 && (
                    <View style={styles.tripInfoRow}>
                      <MaterialIcons name="local-offer" size={20} color="#ff9800" />
                      <Text style={[styles.tripInfoLabel, { color: colors.textSecondary }]}>
                        Giảm ghép xe:
                      </Text>
                      <Text style={[styles.tripInfoValue, { color: '#ff9800' }]}>
                        {seats === 2 ? '-15%' : seats === 3 ? '-25%' : '-30%'}
                      </Text>
                    </View>
                  )}
                  <View style={[styles.tripInfoRow, { paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border + '30' }]}>
                    <MaterialIcons name="payments" size={20} color="#0c0c0c" />
                    <Text style={[styles.tripInfoLabel, { color: colors.textSecondary, fontWeight: '700' }]}>
                      Tổng thanh toán:
                    </Text>
                    <Text style={[styles.tripInfoValue, { color: '#38e07b', fontSize: 16 }]}>
                      ₫{(() => {
                        const basePrice = vehiclePrices[selectedVehicleType]
                        const discount = seats === 1 ? 0 : seats === 2 ? 0.15 : seats === 3 ? 0.25 : 0.30
                        return Math.round(basePrice * (1 - discount)).toLocaleString('vi-VN')
                      })()}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.cancelModalButton, { backgroundColor: colors.card, borderColor: '#ff4444' }]}
                  onPress={handleCancelTrip}
                  activeOpacity={0.8}
                >
                  <MaterialIcons name="close" size={20} color="#ff4444" />
                  <Text style={[styles.cancelModalButtonText, { color: '#ff4444' }]}>Hủy chuyến</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {/* Vehicle Type Options */}
                <View style={styles.vehicleOptions}>
                  {/* Basic */}
                  <TouchableOpacity
                    style={styles.vehicleOptionContainer}
                    onPress={() => setSelectedVehicleType('basic')}
                    activeOpacity={0.7}
                  >
                    <LinearGradient
                      colors={selectedVehicleType === 'basic' ? ['#FFF5F0', '#FFFFFF'] : ['#FFFFFF', '#FAFAFA']}
                      style={[
                        styles.vehicleOption,
                        selectedVehicleType === 'basic' && styles.vehicleOptionSelected,
                      ]}
                    >
                      <LinearGradient
                        colors={selectedVehicleType === 'basic' ? ['#FF6B00', '#FF8534'] : ['#FFFFFF', '#F5F5F5']}
                        style={styles.vehicleIconContainer}
                      >
                        <MaterialIcons
                          name="directions-car"
                          size={32}
                          color={selectedVehicleType === 'basic' ? '#FFFFFF' : colors.textSecondary}

                        />
                      </LinearGradient>
                      <View style={styles.vehicleDetails}>
                        <Text style={[styles.vehicleName, { color: colors.text }]}>TIÊU CHUẢN</Text>
                        <Text style={[styles.vehicleDesc, { color: colors.textSecondary }]}>
                          Xe 4-5 chỗ • Tiết kiệm
                        </Text>
                      </View>
                      <View style={styles.vehiclePriceContainer}>
                        <Text style={[styles.vehiclePrice, { color: colors.text }]}>
                          ₫{vehiclePrices.basic.toLocaleString('vi-VN')}
                        </Text>
                        {selectedVehicleType === 'basic' && (
                          <View style={styles.selectedBadge}>
                            <MaterialIcons name="check-circle" size={24} color="#FF6B00" />
                          </View>
                        )}
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>

                  {/* Comfort */}
                  <TouchableOpacity
                    style={styles.vehicleOptionContainer}
                    onPress={() => setSelectedVehicleType('comfort')}
                    activeOpacity={0.7}
                  >
                    <LinearGradient
                      colors={selectedVehicleType === 'comfort' ? ['#FFF5F0', '#FFFFFF'] : ['#FFFFFF', '#FAFAFA']}
                      style={[
                        styles.vehicleOption,
                        selectedVehicleType === 'comfort' && styles.vehicleOptionSelected,
                      ]}
                    >
                      <LinearGradient
                        colors={selectedVehicleType === 'comfort' ? ['#FF6B00', '#FF8534'] : ['#FFFFFF', '#F5F5F5']}
                        style={styles.vehicleIconContainer}
                      >
                        <MaterialIcons
                          name="airport-shuttle"
                          size={32}
                          color={selectedVehicleType === 'comfort' ? '#FFFFFF' : colors.textSecondary}
                        />
                      </LinearGradient>
                      <View style={styles.vehicleDetails}>
                        <Text style={[styles.vehicleName, { color: colors.text }]}>THOẢI MÁI</Text>
                        <Text style={[styles.vehicleDesc, { color: colors.textSecondary }]}>
                          Xe 5-7 chỗ • Rộng rãi
                        </Text>
                      </View>
                      <View style={styles.vehiclePriceContainer}>
                        <Text style={[styles.vehiclePrice, { color: colors.text }]}>
                          ₫{vehiclePrices.comfort.toLocaleString('vi-VN')}
                        </Text>
                        {selectedVehicleType === 'comfort' && (
                          <View style={styles.selectedBadge}>
                            <MaterialIcons name="check-circle" size={24} color="#FF6B00" />
                          </View>
                        )}
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>

                  {/* Premium */}
                  <TouchableOpacity
                    style={styles.vehicleOptionContainer}
                    onPress={() => setSelectedVehicleType('premium')}
                    activeOpacity={0.7}
                  >
                    <LinearGradient
                      colors={selectedVehicleType === 'premium' ? ['#FFF5F0', '#FFFFFF'] : ['#FFFFFF', '#FAFAFA']}
                      style={[
                        styles.vehicleOption,
                        selectedVehicleType === 'premium' && styles.vehicleOptionSelected,
                      ]}
                    >
                      <LinearGradient
                        colors={selectedVehicleType === 'premium' ? ['#FF6B00', '#FF8534'] : ['#FFFFFF', '#F5F5F5']}
                        style={styles.vehicleIconContainer}
                      >
                        <MaterialIcons
                          name="car-rental"
                          size={32}
                          color={selectedVehicleType === 'premium' ? '#FFFFFF' : colors.textSecondary}
                        />
                      </LinearGradient>
                      <View style={styles.vehicleDetails}>
                        <Text style={[styles.vehicleName, { color: colors.text }]}>CAO CẤP</Text>
                        <Text style={[styles.vehicleDesc, { color: colors.textSecondary }]}>
                          Xe sang • Dịch vụ VIP
                        </Text>
                      </View>
                      <View style={styles.vehiclePriceContainer}>
                        <Text style={[styles.vehiclePrice, { color: colors.text }]}>
                          ₫{vehiclePrices.premium.toLocaleString('vi-VN')}
                        </Text>
                        {selectedVehicleType === 'premium' && (
                          <View style={styles.selectedBadge}>
                            <MaterialIcons name="check-circle" size={24} color="#FF6B00" />
                          </View>
                        )}
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>

                {/* Confirm Button */}
                <TouchableOpacity
                  style={styles.confirmButtonContainer}
                  onPress={handleCreateNewTrip}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#FF6B00', '#FF8534']}
                    style={styles.confirmButton}
                  >
                    <View style={styles.confirmBtnIconCircle}>
                      <MaterialIcons name="check" size={22} color="#FF6B00" />
                    </View>
                    <Text style={styles.confirmButtonText}>XÁC NHẬN TẠO CHUYẾN</Text>
                    <MaterialIcons name="arrow-forward" size={22} color="#FFFFFF" />
                  </LinearGradient>
                </TouchableOpacity>
              </>
            )}
          </Animated.View>
        </View>
      )}
    </SafeAreaView>
  )
}


// ...existing code...

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
    backgroundColor: '#FF6B00', // Changed from green to orange
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
    backgroundColor: '#FFF5F0', // Light orange
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.lg,
    alignSelf: 'flex-start',
  },
  distanceText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FF6B00', // Orange
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
  rideCardContainer: {
    marginBottom: SPACING.md,
  },
  rideCard: {
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  bestMatchCard: {
    borderWidth: 4,
    borderColor: '#FFFFFF',
    shadowColor: '#FF6B00',
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  bestMatchBadge: {
    position: 'absolute',
    top: -12,
    left: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.lg,
    gap: 4,
    zIndex: 10,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 10,
  },
  badgeIconCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.8,
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
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: SPACING.xs,
    letterSpacing: -0.3,
  },
  driverMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  ratingBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 245, 240, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 0, 0.2)',
  },
  starIconBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 215, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ratingBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FF6B00',
  },
  metaText: {
    fontSize: 12,
  },
  priceSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    gap: SPACING.sm,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  priceIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  price: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  oldPrice: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.7)',
    textDecorationLine: 'line-through',
  },

  /* Metrics Bar */
  metricsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.lg,
    borderWidth: 2,
    borderColor: 'rgba(255, 107, 0, 0.2)',
  },
  matchSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  matchIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 107, 0, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressBarContainer: {
    flex: 1,
    gap: 6,
  },
  matchPercent: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FF6B00',
    letterSpacing: 0.5,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 107, 0, 0.1)',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  metricsDivider: {
    width: 2,
    height: 44,
    marginHorizontal: SPACING.md,
    backgroundColor: 'rgba(255, 107, 0, 0.2)',
  },
  seatsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  seatIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 107, 0, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  seatsNumber: {
    fontSize: 16,
    fontWeight: '900',
  },
  seatsLabel: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  /* Info Tags */
  infoTags: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    borderRadius: BORDER_RADIUS.lg,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 0, 0.2)',
  },
  tagText: {
    fontSize: 11,
    fontWeight: '700',
  },

  /* Action Buttons */
  actionButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.md,
  },
  primaryButtonContainer: {
    flex: 1,
  },
  primaryButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.xl,
    gap: SPACING.sm,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  primaryBtnIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  secondaryButtonContainer: {
    width: 52,
    height: 52,
  },
  secondaryButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 3,
    borderColor: '#FF6B00',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  secondaryFullButtonContainer: {
    width: '100%',
  },
  secondaryFullButton: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 2,
    borderColor: '#FF6B00',
    gap: SPACING.xs,
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
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
    color: '#fff', // White text
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
    borderTopColor: '#f0f0f0', // Light border
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
    color: '#FF6B00',
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
    backgroundColor: '#FFF5F0', // Light orange
    borderWidth: 1,
    borderColor: '#FFE5DB', // Light orange border
  },
  promoIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FF6B00', // Orange
    justifyContent: 'center',
    alignItems: 'center',
  },
  promoText: {
    flex: 1,
  },
  promoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a1a', // Dark text
    marginBottom: SPACING.xs,
  },
  promoSubtitle: {
    fontSize: 12,
    color: '#666', // Gray text
  },
  promoButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: '#FF6B00', // Orange
    borderRadius: BORDER_RADIUS.lg,
  },
  promoButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff', // White text
  },

  /* Create New Trip Card */
  createTripCard: {
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    borderWidth: 3,
    borderColor: '#FF6B00',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
  },
  createTripHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  createTripIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  createTripInfo: {
    flex: 1,
  },
  createTripTitle: {
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 4,
    letterSpacing: 0.8,
  },
  createTripSubtitle: {
    fontSize: 12,
  },
  createTripButtonContainer: {
    width: '100%',
  },
  createTripButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  createBtnIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  createTripButtonText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  searchingContainer: {
    gap: SPACING.md,
  },
  searchingText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  searchingSubtext: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
  },
  searchingProgress: {
    paddingVertical: SPACING.xs,
  },
  cancelTripButton: {
    marginTop: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelTripButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.xl,
    gap: SPACING.md,
  },
  dividerLine: {
    flex: 1,
    height: 2,
    backgroundColor: 'rgba(255, 107, 0, 0.2)',
  },
  dividerTextContainer: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 0, 0.3)',
  },
  dividerText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
  },

  /* Vehicle Selection Modal */
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(252, 251, 251, 0.5)', // Lighter overlay
  },
  modalContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: BORDER_RADIUS.xxl,
    borderTopRightRadius: BORDER_RADIUS.xxl,
    paddingBottom: SPACING.xl,
    maxHeight: '85%',
  },
  modalHeader: {
    paddingTop: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0', // Light border
    alignItems: 'center',
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#e0e0e0', // Light gray
    borderRadius: 2,
    marginBottom: SPACING.md,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalCloseButton: {
    position: 'absolute',
    right: SPACING.lg,
    top: SPACING.lg,
  },

  /* Vehicle Options */
  vehicleOptions: {
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  vehicleOptionContainer: {
    width: '100%',
  },
  vehicleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 2,
    borderColor: 'rgba(255, 107, 0, 0.2)',
    gap: SPACING.md,
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  vehicleOptionSelected: {
    borderWidth: 3,
    borderColor: '#FF6B00',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  vehicleIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  vehicleDetails: {
    flex: 1,
  },
  vehicleName: {
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  vehicleDesc: {
    fontSize: 12,
    fontWeight: '600',
  },
  vehiclePriceContainer: {
    alignItems: 'flex-end',
    gap: 6,
  },
  vehiclePrice: {
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  selectedBadge: {
    marginTop: 2,
  },

  /* Confirm Button */
  confirmButtonContainer: {
    marginHorizontal: SPACING.lg,
  },
  confirmButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.lg,
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  confirmBtnIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },

  /* Creating Trip State */
  creatingTripContainer: {
    padding: SPACING.xxl,
    alignItems: 'center',
  },
  scanningAnimation: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  scanRing: {
    position: 'absolute',
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanRingInner: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
    borderWidth: 3,
  },
  scanningTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  scanningSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  tripInfoBox: {
    width: '100%',
    backgroundColor: '#f8f9fa', // Light gray
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  tripInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  tripInfoLabel: {
    fontSize: 14,
    flex: 1,
  },
  tripInfoValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  cancelModalButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 2,
    width: '100%',
  },
  cancelModalButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
})


