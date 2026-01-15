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
<<<<<<< HEAD
import { COLORS } from '../constants'
=======
import { useSelector } from 'react-redux'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { COLORS } from '../constants'
import * as Location from 'expo-location'
import { driverService } from '../services/driverService'
import type { RootState } from '../redux/store'
>>>>>>> fb2fd217ef0ed199bf27752ebc97e79d86d66400

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

export default function RideDetailScreen({ navigation, route }: RideDetailScreenProps) {
  const [ride, setRide] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
<<<<<<< HEAD
  const [currentLocation, setCurrentLocation] = useState<[number, number] | null>(null)
  const [showCustomerModal, setShowCustomerModal] = useState(false)
  const [requestingCustomer, setRequestingCustomer] = useState<Customer | null>(null)
  const [modalCountdown, setModalCountdown] = useState(60)
  
=======
  const [routeCoords, setRouteCoords] = useState<Array<{ latitude: number; longitude: number }>>([])
  const [routeLoading, setRouteLoading] = useState(false)
  const [driverLocation, setDriverLocation] = useState<{ latitude: number; longitude: number } | null>(null)
  const [distanceToPickup, setDistanceToPickup] = useState<number | null>(null)
  const [showCompass, setShowCompass] = useState(false)
  const { user } = useSelector((state: RootState) => state.auth)
  const scaleAnim = useRef(new Animated.Value(1)).current
  const fadeAnim = useRef(new Animated.Value(1)).current
>>>>>>> fb2fd217ef0ed199bf27752ebc97e79d86d66400
  const statusFadeAnim = useRef(new Animated.Value(0)).current
  const mapRef = useRef<MapView>(null)

  // Lấy ride ID từ route params
  const rideId = route?.params?.rideId

  // Fetch ride detail từ API
  useEffect(() => {
    console.log('🚗 RideDetailScreen - rideId:', rideId)
    if (rideId) {
      fetchRideDetail()
    } else {
      console.warn('⚠️ No rideId provided in route params')
      setLoading(false)
    }
  }, [rideId])

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

  const fetchRideDetail = async () => {
    setLoading(true)
    try {
      const API_URL = 'http://192.168.1.18:3000/api'
      console.log('🚗 Fetching ride detail from:', `${API_URL}/rides/${rideId}`)
      const response = await fetch(`${API_URL}/rides/${rideId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      console.log('📡 Response status:', response.status)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log('✅ Ride detail response:', data)
      console.log('🔍 Ride status:', data.status)
      console.log('🔍 Passengers:', data.customerId?.length || 0)
      console.log('🔍 Remaining seats:', data.remainingSeats)

      if (!data || !data._id) {
        throw new Error('Invalid ride data received')
      }

<<<<<<< HEAD
      setRide(data)
=======
      // Format dữ liệu từ API
      const formattedRide = {
        id: data._id,
        driverId: data.driverId,
        passengerName: data.customerName || 'Khách hàng',
        rating: data.customerRating || 4.8,
        reviews: data.reviews || 0,
        status: data.rideType === 'share' ? 'Khách ghép' : 'Lái xe hộ',
        price: data.totalFare || 0,
        estimatedTime: data.duration ? `${data.duration} phút` : '0 phút',
        pickupAddress: data.pickupAddress || 'Không rõ',
        pickupDistrict: data.pickupAddress || 'Không rõ',
        dropoffAddress: data.dropoffAddress || 'Không rõ',
        dropoffDistrict: data.dropoffAddress || 'Không rõ',
        distance: data.distance ? `${data.distance.toFixed(1)}km` : '0km',
        paymentMethod: data.paymentMethod === 'cash' ? 'Tiền mặt' : data.paymentMethod || 'Chưa xác định',
        pickupCoords: {
          latitude: data.pickupLocation?.coordinates?.[1] || 21.0285,
          longitude: data.pickupLocation?.coordinates?.[0] || 105.8542,
        },
        dropoffCoords: {
          latitude: data.dropoffLocation?.coordinates?.[1] || 21.0277,
          longitude: data.dropoffLocation?.coordinates?.[0] || 105.8436,
        },
        rideType: data.rideType,
        rideStatus: data.status,
      }

      setRide(formattedRide)
      // Clear previous route when loading a new ride
      setRouteCoords([])
>>>>>>> fb2fd217ef0ed199bf27752ebc97e79d86d66400
      
      // Mock current location for demo
      if (data.status === 'in_progress') {
        setCurrentLocation([data.pickupCoordinates[0], data.pickupCoordinates[1]])
      }
    } catch (error: any) {
      console.error('❌ Error fetching ride detail:', error.message)
      Alert.alert('Lỗi', `Không thể tải chi tiết chuyến đi: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

<<<<<<< HEAD
=======
  // Calculate distance between two coordinates using Haversine formula
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371 // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  // Track driver location and calculate distance to pickup
  useEffect(() => {
    let locationSubscription: Location.LocationSubscription | null = null

    const startLocationTracking = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync()
        if (status !== 'granted') {
          console.warn('[RideDetailScreen] Location permission not granted')
          return
        }

        // Get initial location
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        })
        const coords = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        }
        setDriverLocation(coords)

        // Calculate distance to pickup if ride exists
        if (ride?.pickupCoords) {
          const distance = calculateDistance(
            coords.latitude,
            coords.longitude,
            ride.pickupCoords.latitude,
            ride.pickupCoords.longitude
          )
          setDistanceToPickup(distance)
        }

        // Watch location changes
        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 5000, // Update every 5 seconds
            distanceInterval: 10, // Or when moved 10 meters
          },
          (newLocation) => {
            const newCoords = {
              latitude: newLocation.coords.latitude,
              longitude: newLocation.coords.longitude,
            }
            setDriverLocation(newCoords)

            // Update distance to pickup
            if (ride?.pickupCoords) {
              const distance = calculateDistance(
                newCoords.latitude,
                newCoords.longitude,
                ride.pickupCoords.latitude,
                ride.pickupCoords.longitude
              )
              setDistanceToPickup(distance)
            }
          }
        )
      } catch (e) {
        console.warn('[RideDetailScreen] Error tracking location', e)
      }
    }

    startLocationTracking()

    return () => {
      if (locationSubscription) {
        locationSubscription.remove()
      }
    }
  }, [ride?.pickupCoords])

  // Fetch driving route between pickup and dropoff using OSRM (no API key required)
  const fetchRoute = async (pickup: { latitude: number; longitude: number }, dropoff: { latitude: number; longitude: number }) => {
    try {
      setRouteLoading(true)
      const url = `https://router.project-osrm.org/route/v1/driving/${pickup.longitude},${pickup.latitude};${dropoff.longitude},${dropoff.latitude}?overview=full&geometries=geojson`
      const res = await fetch(url)
      if (!res.ok) throw new Error(`Route HTTP ${res.status}`)
      const data = await res.json()
      const coords = data?.routes?.[0]?.geometry?.coordinates as Array<[number, number]> | undefined
      if (coords && coords.length) {
        const mapped = coords.map(([lon, lat]) => ({ latitude: lat, longitude: lon }))
        setRouteCoords(mapped)
        // Fit camera to route
        mapRef.current?.fitToCoordinates(mapped, {
          edgePadding: { top: 80, right: 40, bottom: 220, left: 40 },
          animated: true,
        })
      } else {
        // Fallback: straight line
        const fallback = [pickup, dropoff]
        setRouteCoords(fallback)
        mapRef.current?.fitToCoordinates(fallback, {
          edgePadding: { top: 80, right: 40, bottom: 220, left: 40 },
          animated: true,
        })
      }
    } catch (e) {
      // Fallback to straight line on any error
      const fallback = [pickup, dropoff]
      setRouteCoords(fallback)
      mapRef.current?.fitToCoordinates(fallback, {
        edgePadding: { top: 80, right: 40, bottom: 220, left: 40 },
        animated: true,
      })
    } finally {
      setRouteLoading(false)
    }
  }

  // When ride is loaded/changed, fetch route
  useEffect(() => {
    if (ride?.pickupCoords && ride?.dropoffCoords) {
      fetchRoute(ride.pickupCoords, ride.dropoffCoords)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ride?.pickupCoords?.latitude, ride?.pickupCoords?.longitude, ride?.dropoffCoords?.latitude, ride?.dropoffCoords?.longitude])

  const handleAcceptRide = async () => {
    if (updating || !user?.id) {
      Alert.alert('Lỗi', 'Không tìm thấy ID tài xế')
      return
    }

    // Check trước nếu ride đã có driverId
    if (ride?.driverId) {
      Alert.alert('Thông báo', 'Chuyến đi này đã được nhận. Không thể nhận lại.')
      return
      
    }

    setUpdating(true)
    try {
      // Refresh ride data trước khi nhận để đảm bảo có dữ liệu mới nhất
      console.log('🔄 Refreshing ride data before accept...')
      await fetchRideDetail()

      // Check ride status sau khi refresh
      if (ride?.rideStatus !== 'pending') {
        Alert.alert('Lỗi', `Chuyến đi không còn available. Trạng thái hiện tại: ${ride?.rideStatus}`)
        setUpdating(false)
        return
      }

      const token = await AsyncStorage.getItem('token')
      if (!token) {
        throw new Error('No authentication token found')
      }

      const payload = { driverId: user.id }
      console.log('📤 Accepting ride:', rideId)
      console.log('📤 Ride status after refresh:', ride?.rideStatus)
      console.log('📤 Driver ID:', user.id)
      console.log('📤 Payload:', JSON.stringify(payload))
      
      const response = await fetch(`http://10.0.2.2:3000/api/rides/${rideId}/accept`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      const responseText = await response.text()
      console.log('📡 Response status:', response.status)
      console.log('📡 Response body:', responseText)

      if (!response.ok) {
        throw new Error(`${response.status}: ${responseText}`)
      }

      const result = JSON.parse(responseText)
      console.log('✅ Ride accepted:', result)
      animateStatusChange()
      setTimeout(() => setAcceptedStatus('accepted'), 300)
    } catch (error: any) {
      console.error('❌ Error accepting ride:', error)
      Alert.alert('Lỗi', `Không thể nhận cuốc: ${error.message}`)
    } finally {
      setUpdating(false)
    }
  }

  const handleArrivedAtPickup = async () => {
    if (updating) return
    setUpdating(true)
    try {
      console.log('📤 Arrived at pickup:', rideId)
      const response = await fetch(`http://10.0.2.2:3000/api/rides/${rideId}/start`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to update ride: ${response.status}`)
      }

      const result = await response.json()
      console.log('✅ Ride status updated to arrived:', result)
      animateStatusChange()
      setTimeout(() => setAcceptedStatus('arrived'), 300)
    } catch (error: any) {
      console.error('❌ Error updating ride:', error)
      Alert.alert('Lỗi', `Không thể cập nhật: ${error.message}`)
    } finally {
      setUpdating(false)
    }
  }

>>>>>>> fb2fd217ef0ed199bf27752ebc97e79d86d66400
  const handleStartRide = async () => {
    Alert.alert(
      'Bắt đầu chuyến',
      'Bạn muốn bắt đầu chuyến đi?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Bắt đầu',
          onPress: async () => {
            setUpdating(true)
            try {
              const API_URL = 'http://192.168.1.18:3000/api'
              const response = await fetch(`${API_URL}/rides/${rideId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'in_progress' }),
              })
              
              if (!response.ok) throw new Error(`Failed: ${response.status}`)
              
              const updated = await response.json()
              setRide(updated)
              setCurrentLocation([updated.pickupCoordinates[0], updated.pickupCoordinates[1]])
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

  const handleCompleteRide = () => {
    Alert.alert(
      'Hoàn thành chuyến',
      'Bạn đã hoàn thành chuyến đi?',
      [
        { text: 'Không', style: 'cancel' },
        {
          text: 'Hoàn thành',
          onPress: async () => {
            setUpdating(true)
            try {
              const API_URL = 'http://192.168.1.18:3000/api'
              const response = await fetch(`${API_URL}/rides/${rideId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'completed' }),
              })
              
              if (!response.ok) throw new Error(`Failed: ${response.status}`)
              
              const updated = await response.json()
              setRide(updated)
              Alert.alert('Thành công', 'Chuyến đã hoàn thành')
              navigation.goBack()
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

  const handleEditRide = () => {
    navigation.navigate('CreateRideScreen', { rideId, isEdit: true })
  }

  const handleCancelRide = () => {
    Alert.alert(
      'Hủy chuyến',
      'Bạn chắc chắn muốn hủy chuyến này?',
      [
        { text: 'Không', style: 'cancel' },
        {
          text: 'Hủy',
          style: 'destructive',
          onPress: async () => {
            setUpdating(true)
            try {
              const API_URL = 'http://192.168.1.18:3000/api'
              const response = await fetch(`${API_URL}/rides/${rideId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'cancelled' }),
              })
              
              if (!response.ok) throw new Error(`Failed: ${response.status}`)
              
              Alert.alert('Thành công', 'Chuyến đã bị hủy')
              navigation.goBack()
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
      const API_URL = 'http://192.168.1.18:3000/api'
      const response = await fetch(`${API_URL}/rides/${rideId}/add-passenger`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: requestingCustomer._id }),
      })
      
      if (!response.ok) throw new Error(`Failed: ${response.status}`)
      
      const updated = await response.json()
      setRide(updated)
      setShowCustomerModal(false)
      setRequestingCustomer(null)
      setModalCountdown(60)
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

  const handleGoBack = () => {
    navigation?.goBack()
  }

  useEffect(() => {
    Animated.timing(statusFadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start()
  }, [ride?.status])

  const handleZoomIn = () => {
    mapRef.current?.getCamera().then((cam) => {
      if (cam.zoom !== undefined) {
        mapRef.current?.animateCamera({ zoom: cam.zoom + 1 }, { duration: 200 })
      }
    })
  }

  const handleZoomOut = () => {
    mapRef.current?.getCamera().then((cam) => {
      if (cam.zoom !== undefined) {
        mapRef.current?.animateCamera({ zoom: cam.zoom - 1 }, { duration: 200 })
      }
    })
  }

  const handleCenterToDriver = async () => {
    if (driverLocation) {
      mapRef.current?.animateToRegion({
        latitude: driverLocation.latitude,
        longitude: driverLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 500)
    }
  }

  const handleToggleCompass = () => {
    setShowCompass(!showCompass)
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Đang tải chi tiết chuyến đi...</Text>
        </View>
      ) : !ride ? (
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={48} color={COLORS.danger} />
          <Text style={styles.errorText}>Không tìm thấy chuyến đi</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => rideId && fetchRideDetail()}
          >
            <Text style={styles.retryButtonText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* Map Section */}
          <View style={styles.mapContainer}>
            <MapView
              ref={mapRef}
              style={styles.map}
              initialRegion={{
                latitude: ride.pickupCoordinates[1],
                longitude: ride.pickupCoordinates[0],
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
              }}
              showsUserLocation={true}
              showsMyLocationButton={false}
              showsCompass={showCompass}
            >
<<<<<<< HEAD
              {/* Pickup marker */}
              {ride.status !== 'in_progress' && (
                <Marker
                  coordinate={{
                    latitude: ride.pickupCoordinates[1],
                    longitude: ride.pickupCoordinates[0],
                  }}
                  title="Điểm xuất phát"
                  pinColor="green"
                />
              )}
              
              {/* Current location (during ride) */}
              {ride.status === 'in_progress' && currentLocation && (
                <Marker
                  coordinate={{
                    latitude: currentLocation[1],
                    longitude: currentLocation[0],
                  }}
                  title="Vị trí của bạn"
                  pinColor="blue"
                />
              )}

              {/* Dropoff marker */}
              <Marker
                coordinate={{
                  latitude: ride.dropoffCoordinates[1],
                  longitude: ride.dropoffCoordinates[0],
                }}
                title="Điểm đích"
                pinColor="red"
              />

              {/* Route line */}
              {currentLocation ? (
                <Polyline
                  coordinates={[
                    { latitude: currentLocation[1], longitude: currentLocation[0] },
                    { latitude: ride.dropoffCoordinates[1], longitude: ride.dropoffCoordinates[0] },
                  ]}
                  strokeColor={COLORS.primary}
                  strokeWidth={3}
                />
              ) : (
                <Polyline
                  coordinates={[
                    { latitude: ride.pickupCoordinates[1], longitude: ride.pickupCoordinates[0] },
                    { latitude: ride.dropoffCoordinates[1], longitude: ride.dropoffCoordinates[0] },
                  ]}
                  strokeColor={COLORS.primary}
                  strokeWidth={3}
=======
              {/* Pickup Marker - Circle */}
              <Marker
                coordinate={ride.pickupCoords}
                title="Điểm đón"
                description={ride.pickupAddress}
              >
                <View style={styles.pickupMarker}>
                  <MaterialIcons name="trip-origin" size={32} color={COLORS.primary} />
                </View>
              </Marker>

              {/* Dropoff Marker - Flag */}
              <Marker
                coordinate={ride.dropoffCoords}
                title="Điểm trả"
                description={ride.dropoffAddress}
              >
                <View style={styles.dropoffMarker}>
                  <MaterialIcons name="flag" size={32} color={COLORS.success} />
                </View>
              </Marker>

              {routeCoords.length > 1 && (
                <Polyline
                  coordinates={routeCoords}
                  strokeColor={COLORS.primary}
                  strokeWidth={5}
>>>>>>> fb2fd217ef0ed199bf27752ebc97e79d86d66400
                />
              )}
            </MapView>

            {/* Header Controls */}
            <View style={styles.mapControls}>
              <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
                <MaterialIcons name="arrow-back" size={24} color={COLORS.text} />
              </TouchableOpacity>
<<<<<<< HEAD
              <View style={styles.spacer} />
              <TouchableOpacity style={styles.callButton}>
                <MaterialIcons name="call" size={20} color="#4CAF50" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.sosButton}>
                <Text style={styles.sosText}>SOS</Text>
              </TouchableOpacity>
            </View>

            {/* Status Badge */}
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(ride.status) }]}>
              <Text style={styles.statusText}>
                {getStatusLabel(ride.status)} • {ride.distance} km
              </Text>
            </View>

            {/* Price Badge */}
            <View style={styles.priceBadge}>
              <Text style={styles.priceText}>{(ride.totalFare / 1000).toFixed(0)}k</Text>
=======
            </View>

            {/* Right Controls - Zoom and Navigation */}
            <View style={styles.rightControls}>
              <TouchableOpacity onPress={handleZoomIn} style={styles.controlButton}>
                <MaterialIcons name="add" size={24} color={COLORS.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleZoomOut} style={styles.controlButton}>
                <MaterialIcons name="remove" size={24} color={COLORS.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleCenterToDriver} style={styles.controlButton}>
                <MaterialIcons name="navigation" size={24} color={COLORS.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleToggleCompass} style={styles.controlButton}>
                <MaterialIcons name="explore" size={24} color={COLORS.primary} />
              </TouchableOpacity>
            </View>

            {/* Info Card - Floating at bottom of map */}
            <View style={styles.floatingCard}>
              <View style={styles.timePrice}>
                <Text style={styles.time}>{ride.estimatedTime}</Text>
                <Text style={styles.subtext}>Dự kiến</Text>
                {distanceToPickup !== null && (
                  <View style={styles.distanceToPickupContainer}>
                    <MaterialIcons name="navigation" size={14} color={COLORS.primary} />
                    <Text style={styles.distanceToPickup}>
                      Cách điểm đón: {distanceToPickup.toFixed(1)} km
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.priceBox}>
                <Text style={styles.price}>{(ride.price / 1000).toFixed(0)}k</Text>
                <Text style={styles.paymentType}>{ride.paymentMethod}</Text>
              </View>
>>>>>>> fb2fd217ef0ed199bf27752ebc97e79d86d66400
            </View>
          </View>

          {/* Details Section */}
          <ScrollView style={styles.detailsContainer} showsVerticalScrollIndicator={false}>
            {/* Ride Info Card */}
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <MaterialIcons name="location-on" size={20} color={COLORS.primary} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Điểm xuất phát</Text>
                  <Text style={styles.infoText}>{ride.pickupAddress}</Text>
                </View>
              </View>
              
              <View style={[styles.infoRow, { borderTopWidth: 1, borderTopColor: COLORS.darkBg, paddingTop: 12, marginTop: 12 }]}>
                <MaterialIcons name="location-on" size={20} color="#f44336" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Điểm đích</Text>
                  <Text style={styles.infoText}>{ride.dropoffAddress}</Text>
                </View>
              </View>
            </View>

            {/* Passengers Info */}
            <View style={styles.passengerCard}>
              <Text style={styles.cardTitle}>Khách hàng ({ride.customerId?.length || 0}/{ride.remainingSeats})</Text>
              
              {ride.customerId && ride.customerId.length > 0 ? (
                <FlatList
                  data={ride.customerId}
                  keyExtractor={(_, idx) => `passenger-${idx}`}
                  scrollEnabled={false}
                  renderItem={({ item }) => (
                    <View style={styles.passengerItem}>
                      <View style={styles.passengerAvatar}>
                        <MaterialIcons name="person" size={24} color={COLORS.primary} />
                      </View>
                      <View style={styles.passengerInfo}>
                        <Text style={styles.passengerName}>
                          {typeof item === 'string' ? item : item.name || 'Khách hàng'}
                        </Text>
                        <Text style={styles.passengerPhone}>
                          {typeof item === 'object' ? item.phone : 'N/A'}
                        </Text>
                      </View>
                    </View>
                  )}
                />
              ) : (
                <Text style={styles.noPassenger}>Chưa có khách hàng</Text>
              )}
              
              {ride.status === 'in_progress' && (ride.customerId?.length || 0) < ride.remainingSeats && (
                <Text style={styles.waitingText}>Chờ khách hàng yêu cầu...</Text>
              )}
            </View>

            {/* Action Buttons */}
            <View style={styles.actionsContainer}>
              {ride.status === 'pending' || ride.status === 'available' ? (
                <TouchableOpacity 
                  style={[styles.actionBtn, styles.startBtn]} 
                  onPress={handleStartRide}
                  disabled={updating}
                >
                  <MaterialIcons name="play-arrow" size={20} color="#fff" />
                  <Text style={styles.actionBtnText}>Bắt đầu chuyến đi</Text>
                </TouchableOpacity>
              ) : ride.status === 'in_progress' ? (
                <TouchableOpacity 
                  style={[styles.actionBtn, styles.completeBtn]} 
                  onPress={handleCompleteRide}
                  disabled={updating}
                >
                  <MaterialIcons name="check-circle" size={20} color="#fff" />
                  <Text style={styles.actionBtnText}>Hoàn thành chuyến</Text>
                </TouchableOpacity>
              ) : null}

              {(ride.status === 'pending' || ride.status === 'available') && (
                <View style={styles.buttonRow}>
                  <TouchableOpacity 
                    style={[styles.smallBtn, styles.editBtn]} 
                    onPress={handleEditRide}
                    disabled={updating}
                  >
                    <MaterialIcons name="edit" size={18} color="#fff" />
                    <Text style={styles.smallBtnText}>Sửa</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.smallBtn, styles.cancelBtn]} 
                    onPress={handleCancelRide}
                    disabled={updating}
                  >
                    <MaterialIcons name="close" size={18} color="#fff" />
                    <Text style={styles.smallBtnText}>Hủy</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
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
    height: '45%',
    position: 'relative',
    backgroundColor: COLORS.darkBg,
  },
  map: {
    flex: 1,
  },
  mapControls: {
    position: 'absolute',
<<<<<<< HEAD
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
=======
    top: 48,
    left: 20,
>>>>>>> fb2fd217ef0ed199bf27752ebc97e79d86d66400
    zIndex: 10,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(26, 26, 26, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  rightControls: {
    position: 'absolute',
    top: '38%',
    right: 20,
    gap: 14,
    zIndex: 10,
  },
  controlButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
  },
  spacer: {
    flex: 1,
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
<<<<<<< HEAD
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
=======
  moreButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.darkCard,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickupMarker: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 8,
  },
  dropoffMarker: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.success,
    shadowColor: COLORS.success,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 8,
  },
  floatingCard: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(26, 26, 26, 0.95)',
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 0, 0.2)',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
  },
  timePrice: {
    flex: 1,
  },
  time: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: 0.5,
  },
  subtext: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 2,
    fontWeight: '500',
  },
  distanceToPickupContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    backgroundColor: 'rgba(255, 107, 0, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  distanceToPickup: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '700',
  },
  priceBox: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 4,
  },
  price: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: 0.5,
  },
  paymentType: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  detailsContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  passengerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 20,
    paddingTop: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 107, 0, 0.15)',
  },
  passengerAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: `${COLORS.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  passengerDetails: {
    flex: 1,
  },
  passengerName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  rating: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
  },
  reviews: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  status: {
    fontSize: 11,
    color: COLORS.textSecondary,
    backgroundColor: COLORS.darkBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  actionIcons: {
    flexDirection: 'row',
    gap: 8,
  },
  messageIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.darkCard,
    justifyContent: 'center',
    alignItems: 'center',
  },
  phoneIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.darkCard,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationSection: {
    flexDirection: 'row',
    marginBottom: 16,
    paddingLeft: 8,
  },
  locationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
    marginRight: 12,
    marginTop: 6,
    flexShrink: 0,
  },
  locationContent: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  address: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  subAddress: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  routeLine: {
    width: 2,
    height: 24,
    backgroundColor: COLORS.darkCard,
    marginLeft: 5,
    marginBottom: 8,
  },
  distanceBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 107, 0, 0.1)',
    borderRadius: 12,
    marginBottom: 24,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 0, 0.2)',
  },
  distance: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  acceptButton: {
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
  },
  arrivedButton: {
    backgroundColor: '#4CAF50',
    shadowColor: '#4CAF50',
  },
  completeButton: {
    backgroundColor: '#2196F3',
    shadowColor: '#2196F3',
  },
  completedButton: {
    backgroundColor: '#4CAF50',
    shadowColor: '#4CAF50',
    opacity: 0.8,
  },
  disabledButton: {
    opacity: 0.5,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  additionalInfo: {
    backgroundColor: 'rgba(255, 107, 0, 0.08)',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 10,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 0, 0.15)',
>>>>>>> fb2fd217ef0ed199bf27752ebc97e79d86d66400
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
  actionsContainer: {
    gap: 8,
    marginBottom: 24,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
  },
  startBtn: {
    backgroundColor: '#4CAF50',
  },
  completeBtn: {
    backgroundColor: '#8BC34A',
  },
  actionBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
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
