import React, { useState, useRef, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Image,
  Animated,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import MapView, { Marker, Polyline } from 'react-native-maps'
import { useSelector } from 'react-redux'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { COLORS } from '../constants'
import * as Location from 'expo-location'
import { driverService } from '../services/driverService'
import type { RootState } from '../redux/store'

interface RideDetailScreenProps {
  navigation: any
  route: any
}

export default function RideDetailScreen({ navigation, route }: RideDetailScreenProps) {
  const [acceptedStatus, setAcceptedStatus] = useState('pending') // pending, accepted, arrived, completed
  const [ride, setRide] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [routeCoords, setRouteCoords] = useState<Array<{ latitude: number; longitude: number }>>([])
  const [routeLoading, setRouteLoading] = useState(false)
  const [driverLocation, setDriverLocation] = useState<{ latitude: number; longitude: number } | null>(null)
  const [distanceToPickup, setDistanceToPickup] = useState<number | null>(null)
  const [showCompass, setShowCompass] = useState(false)
  const { user } = useSelector((state: RootState) => state.auth)
  const scaleAnim = useRef(new Animated.Value(1)).current
  const fadeAnim = useRef(new Animated.Value(1)).current
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

  const fetchRideDetail = async () => {
    setLoading(true)
    try {
      console.log('🚗 Fetching ride detail from:', `http://10.0.2.2:3000/api/rides/${rideId}`)
      const response = await fetch(`http://10.0.2.2:3000/api/rides/${rideId}`, {
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
      console.log('🔍 Raw status field from API:', data.status)
      console.log('🔍 Raw driverId field from API:', data.driverId)

      if (!data || !data._id) {
        throw new Error('Invalid ride data received')
      }

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
      
      // Set initial button state based on ride status and driverId
      if (data.driverId) {
        // Ride đã được nhận
        setAcceptedStatus('accepted')
      } else if (data.status === 'pending') {
        // Ride chưa được nhận
        setAcceptedStatus('pending')
      } else {
        // Ride đã hủy hoặc hoàn thành
        setAcceptedStatus('completed')
      }
    } catch (error: any) {
      console.error('❌ Error fetching ride detail:', error.message)
      console.error('❌ Error details:', error)
      Alert.alert('Lỗi', `Không thể tải chi tiết chuyến đi: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

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
      const token = await AsyncStorage.getItem('token')
      if (!token) {
        throw new Error('No authentication token found')
      }

      console.log('📤 Arrived at pickup:', rideId)
      const response = await fetch(`http://10.0.2.2:3000/api/rides/${rideId}/start`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
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

  const handleStartRide = async () => {
    if (updating) return
    setUpdating(true)
    try {
      const token = await AsyncStorage.getItem('token')
      if (!token) {
        throw new Error('No authentication token found')
      }

      console.log('📤 Starting ride:', rideId)
      const response = await fetch(`http://10.0.2.2:3000/api/rides/${rideId}/complete`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to complete ride: ${response.status}`)
      }

      const result = await response.json()
      console.log('✅ Ride completed:', result)
      animateStatusChange()
      setTimeout(() => setAcceptedStatus('completed'), 300)
    } catch (error: any) {
      console.error('❌ Error completing ride:', error)
      Alert.alert('Lỗi', `Không thể hoàn thành chuyến: ${error.message}`)
    } finally {
      setUpdating(false)
    }
  }

  const handleCompleted = () => {
    navigation?.navigate('HomeTab')
  }

  const handleActionButton = () => {
    // Nếu ride đã có driverId, không cho nhấn lại
    if (ride?.driverId) {
      Alert.alert('Thông báo', 'Chuyến đi này đã được nhận. Không thể nhận lại.')
      setAcceptedStatus('accepted')
      return
    }

    // Double check ride status từ API
    if (acceptedStatus === 'pending' && ride?.rideStatus !== 'pending') {
      Alert.alert('Lỗi', `Chuyến đi không còn available (Status: ${ride?.rideStatus})`)
      return
    }

    if (acceptedStatus === 'pending') {
      handleAcceptRide()
    } else if (acceptedStatus === 'accepted') {
      handleArrivedAtPickup()
    } else if (acceptedStatus === 'arrived') {
      handleStartRide()
    } else if (acceptedStatus === 'completed') {
      handleCompleted()
    }
  }

  const animateStatusChange = () => {
    // Scale animation for button
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start()

    // Fade animation
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0.6,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start()
  }

  useEffect(() => {
    // Animate status text fade in
    Animated.timing(statusFadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start()
  }, [acceptedStatus])

  const handleGoBack = () => {
    navigation?.goBack()
  }

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
          {/* Header with Map */}
          <View style={styles.mapContainer}>
            <MapView
              ref={mapRef}
              style={styles.map}
              initialRegion={{
                latitude: ride.pickupCoords.latitude,
                longitude: ride.pickupCoords.longitude,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
              }}
              showsUserLocation={true}
              showsMyLocationButton={false}
              showsCompass={showCompass}
            >
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
                />
              )}
            </MapView>

            {/* Header Controls */}
            <View style={styles.mapControls}>
              <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
                <MaterialIcons name="arrow-back" size={24} color={COLORS.text} />
              </TouchableOpacity>
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
            </View>
          </View>

          {/* Details Section */}
          <ScrollView style={styles.detailsContainer} showsVerticalScrollIndicator={false}>
            {/* Passenger Info */}
            <View style={styles.passengerInfo}>
              <View style={styles.passengerAvatar}>
                <MaterialIcons name="person" size={32} color={COLORS.primary} />
              </View>
              <View style={styles.passengerDetails}>
                <Text style={styles.passengerName}>{ride.passengerName}</Text>
                <View style={styles.ratingContainer}>
                  <MaterialIcons name="star" size={14} color="#FFB800" />
                  <Text style={styles.rating}>{ride.rating}</Text>
                  <Text style={styles.reviews}>({ride.reviews})</Text>
                </View>
                <Text style={styles.status}>{ride.status}</Text>
              </View>
              <View style={styles.actionIcons}>
                <TouchableOpacity style={styles.messageIcon}>
                  <MaterialIcons name="message" size={20} color={COLORS.primary} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.phoneIcon}>
                  <MaterialIcons name="phone" size={20} color={COLORS.primary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Pickup Location */}
            <View style={styles.locationSection}>
              <View style={styles.locationDot} />
              <View style={styles.locationContent}>
                <Text style={styles.locationLabel}>DỪNG ĐẾN ĐIỂM ĐÓN</Text>
                <Text style={styles.address}>{ride.pickupAddress}</Text>
                <Text style={styles.subAddress}>{ride.pickupDistrict}</Text>
              </View>
            </View>

            {/* Separator Line */}
            <View style={styles.routeLine} />

            {/* Dropoff Location */}
            <View style={styles.locationSection}>
              <View style={[styles.locationDot, { backgroundColor: COLORS.success }]} />
              <View style={styles.locationContent}>
                <Text style={styles.locationLabel}>ĐIỂM TRẢ</Text>
                <Text style={styles.address}>{ride.dropoffAddress}</Text>
                <Text style={styles.subAddress}>{ride.dropoffDistrict}</Text>
              </View>
            </View>

            {/* Distance Info */}
            <View style={styles.distanceBox}>
              <MaterialIcons name="straighten" size={20} color={COLORS.textSecondary} />
              <Text style={styles.distance}>{ride.distance}</Text>
            </View>

            {/* Action Button */}
            <Animated.View
              style={{
                transform: [{ scale: scaleAnim }],
                opacity: fadeAnim,
              }}
            >
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  acceptedStatus === 'pending' && styles.acceptButton,
                  acceptedStatus === 'accepted' && styles.arrivedButton,
                  acceptedStatus === 'arrived' && styles.completeButton,
                  acceptedStatus === 'completed' && styles.completedButton,
                  (acceptedStatus === 'pending' && ride?.driverId) && styles.disabledButton,
                ]}
                onPress={handleActionButton}
                disabled={updating || (acceptedStatus === 'pending' && !!ride?.driverId)}
                activeOpacity={0.8}
              >
                <Animated.Text
                  style={[
                    styles.actionButtonText,
                    {
                      opacity: statusFadeAnim,
                    },
                  ]}
                >
                  {acceptedStatus === 'pending'
                    ? 'NHẬN CUỐC'
                    : acceptedStatus === 'accepted'
                      ? 'ĐÃ ĐẾN ĐIỂM ĐÓN'
                      : acceptedStatus === 'arrived'
                        ? 'BẮT ĐẦU CHUYẾN ĐI'
                        : 'CHUYẾN ĐI ĐÃ HOÀN THÀNH'}
                </Animated.Text>
                <Animated.View
                  style={{
                    opacity: statusFadeAnim,
                    marginLeft: 8,
                  }}
                >
                  <MaterialIcons
                    name={acceptedStatus === 'completed' ? 'check-circle' : 'arrow-forward'}
                    size={20}
                    color={COLORS.text}
                  />
                </Animated.View>
              </TouchableOpacity>
            </Animated.View>

            {/* Additional Info */}
            <View style={styles.additionalInfo}>
              <Text style={styles.additionalTitle}>Thêm thông tin</Text>
              <View style={styles.infoRow}>
                <MaterialIcons name="info" size={16} color={COLORS.primary} />
                <Text style={styles.infoText}>Đậu xe 2 phút, khách sẽ chờ bạn</Text>
              </View>
            </View>
          </ScrollView>
        </>
      )}
    </SafeAreaView>
  )
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
    top: 48,
    left: 20,
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
  callButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${COLORS.success}20`,
    justifyContent: 'center',
    alignItems: 'center',
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
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '700',
  },
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
  },
  additionalTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  infoText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    flex: 1,
  },
})
