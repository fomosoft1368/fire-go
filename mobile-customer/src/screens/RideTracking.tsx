import { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import MapViewComponent from '../components/MapView'
import { SPACING } from '../constants'
import { mapsService } from '../services/mapsService'
import ChatScreen from './ChatScreen'

interface RideTrackingProps {
  navigation?: any
  route?: any
}

interface Driver {
  id: string
  name: string
  avatar: string
  rating: number
  totalRides: number
  carType: string
  licensePlate: string
  carColor: string
  phone: string
  currentLat: number
  currentLng: number
}

export default function RideTracking({ navigation, route }: RideTrackingProps) {
  const { rideId } = route?.params || {}
  const [ride, setRide] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [driver, setDriver] = useState<Driver>({
    id: '1',
    name: 'Nguyễn Văn A',
    avatar: 'https://i.pravatar.cc/150?u=driver1',
    rating: 4.5,
    totalRides: 120,
    carType: 'Toyota Vios',
    licensePlate: '29A-123.45',
    carColor: 'Trắng',
    phone: '0905123456',
    currentLat: 21.0285,
    currentLng: 105.8542,
  })

  const [pickupCoords, setPickupCoords] = useState<{ latitude: number; longitude: number } | null>(null)
  const [dropoffCoords, setDropoffCoords] = useState<{ latitude: number; longitude: number } | null>(null)
  const [routeCoordinates, setRouteCoordinates] = useState<Array<{ latitude: number; longitude: number }>>([])
  const [routeFetched, setRouteFetched] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  
  useEffect(() => {
    if (pickupCoords && dropoffCoords && !routeFetched) {
      fetchRouteFromPickupDropoff()
      setRouteFetched(true)
    }
  }, [pickupCoords, dropoffCoords, routeFetched])

  const fetchRouteFromPickupDropoff = async () => {
    if (!pickupCoords || !dropoffCoords) return

    try {
      const pickupAddress = `${pickupCoords.latitude},${pickupCoords.longitude}`
      const dropoffAddress = `${dropoffCoords.latitude},${dropoffCoords.longitude}`
      
      const routeInfo = await mapsService.getRouteInfo(pickupAddress, dropoffAddress)
      
      if (routeInfo.routeCoordinates && routeInfo.routeCoordinates.length > 0) {
        setRouteCoordinates(routeInfo.routeCoordinates)
      }
    } catch (error) {
      console.error('Error fetching route:', error)
    }
  }

  const fetchUnreadCount = async () => {
    if (!rideId) return
    
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default
      const token = await AsyncStorage.getItem('token')
      if (!token) return

      const API_URL = 'http://192.168.1.16:3000/api'
      const response = await fetch(`${API_URL}/messages/ride/${rideId}/unread-count`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (response.ok) {
        const result = await response.json()
        setUnreadCount(result.data?.unreadCount || 0)
      }
    } catch (error) {
      // Ignore errors silently
    }
  }

  useEffect(() => {
    if (!rideId) {
      setLoading(false)
      return
    }

    const fetchRideStatus = async () => {
      try {
        const API_URL = 'http://192.168.1.18:3000/api'
        const url = `${API_URL}/rides/${rideId}`
        
        const response = await fetch(url)
        
        if (response.ok) {
          const data = await response.json()
          
          // Only update if data changed
          setRide(prevRide => {
            if (!prevRide || prevRide.status !== data.status || prevRide._id !== data._id) {
              return data
            }
            return prevRide
          })
          setLoading(false)
          
          if (data.pickupLocation?.coordinates && data.pickupLocation.coordinates.length === 2) {
            const newPickupLat = data.pickupLocation.coordinates[1]
            const newPickupLng = data.pickupLocation.coordinates[0]
            
            setPickupCoords(prev => {
              if (!prev || prev.latitude !== newPickupLat || prev.longitude !== newPickupLng) {
                return { latitude: newPickupLat, longitude: newPickupLng }
              }
              return prev
            })
          }
          if (data.dropoffLocation?.coordinates && data.dropoffLocation.coordinates.length === 2) {
            setDropoffCoords(prev => {
              const newLat = data.dropoffLocation.coordinates[1]
              const newLng = data.dropoffLocation.coordinates[0]
              if (!prev || prev.latitude !== newLat || prev.longitude !== newLng) {
                return { latitude: newLat, longitude: newLng }
              }
              return prev
            })
          }
          
          // Navigate to rating screen when completed
          if (data.status === 'completed') {
            navigation.replace('RatingDriver', { 
              rideId: data._id,
              driver: {
                name: data.driverId?.firstName && data.driverId?.lastName 
                  ? `${data.driverId.firstName} ${data.driverId.lastName}` 
                  : 'Tài xế',
                avatar: data.driverId?.avatar,
                carType: data.driverId?.vehicleType,
                licensePlate: data.driverId?.licensePlate,
              }
            })
          }

          // Update driver info if available (only once)
          if (data.driverId) {
            const driverData = Array.isArray(data.driverId) ? data.driverId[0] : data.driverId
            if (typeof driverData === 'object') {
              setDriver(prev => {
                const newId = driverData._id || driverData.id
                // Only update if driver changed
                if (prev.id !== newId && prev.id === '1') {
                  return {
                    ...prev,
                    id: newId,
                    name: `${driverData.firstName || ''} ${driverData.lastName || ''}`.trim() || 'Tài xế',
                    phone: driverData.phone || prev.phone,
                    rating: driverData.averageRating || driverData.rating || prev.rating,
                    carType: driverData.vehicleType || prev.carType,
                    licensePlate: driverData.licensePlate || prev.licensePlate,
                    avatar: driverData.avatar || prev.avatar,
                  }
                }
                return prev
              })
            }
          }
        } else {
          setLoading(false)
        }
      } catch (error) {
        setLoading(false)
      }
    }

    fetchRideStatus() // Initial fetch
    fetchUnreadCount() // Initial unread count fetch
    
    // Poll every 5 seconds (reduced from 3s to reduce load)
    const interval = setInterval(() => {
      fetchRideStatus()
      fetchUnreadCount()
    }, 5000)

    return () => clearInterval(interval)
  }, [rideId, navigation])


  const handleCall = () => {
    Linking.openURL(`tel:${driver.phone}`)
  }

  const handleChat = () => {
    setShowChat(true)
    setUnreadCount(0)
  }

  const handleCancelRide = () => {
    Alert.alert(
      'Hủy chuyến đi',
      'Bạn có chắc chắn muốn hủy chuyến đi này không?',
      [
        { text: 'Không', style: 'cancel' },
        {
          text: 'Hủy chuyến',
          style: 'destructive',
          onPress: () => {
            navigation?.goBack()
          },
        },
      ]
    )
  }

  const handleHelp = () => {
    Alert.alert('Trợ giúp', 'Liên hệ hotline: 1900-xxxx')
  }

  // Show chat screen
  if (showChat && driver) {
    return (
      <ChatScreen
        driver={{
          id: driver.id,
          name: driver.name,
          phone: driver.phone,
        }}
        rideId={rideId}
        onClose={() => setShowChat(false)}
      />
    )
  }

  return (
    <View style={styles.container}>
      {/* Loading Overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#FF6B00" />
          <Text style={styles.loadingText}>Đang tải thông tin chuyến đi...</Text>
        </View>
      )}
      
      {/* Map */}
      <View style={StyleSheet.absoluteFillObject}>
        <MapViewComponent
          height={'100%'}
          initialRegion={pickupCoords || {
            latitude: 21.0285,
            longitude: 105.8542,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
          pickupCoords={pickupCoords || undefined}
          dropoffCoords={dropoffCoords || undefined}
          routeCoordinates={routeCoordinates}
        />
      </View>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation?.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Theo dõi chuyến đi</Text>
        <TouchableOpacity style={styles.headerButton} onPress={handleHelp}>
          <Text style={styles.helpText}>Trợ giúp</Text>
        </TouchableOpacity>
      </View>

      {/* Driver Status Badge */}
      <View style={styles.statusBadge}>
        <MaterialIcons name="location-on" size={16} color="#FF6B00" />
        <Text style={styles.statusText}>Tài xế đang di chuyển đến điểm đón</Text>
      </View>

      {/* ETA Badge */}
      <View style={styles.etaBadge}>
        <MaterialIcons name="directions-car" size={20} color="#fff" />
        <View style={styles.etaInfo}>
          <Text style={styles.etaTime}>
            {ride?.duration ? `${ride.duration} phút` : 'Đang tính...'}
          </Text>
          <Text style={styles.etaDistance}>
            {ride?.distance ? `${ride.distance} km` : 'Đang tính...'}
          </Text>
        </View>
      </View>

      {/* Bottom Card */}
      <View style={styles.bottomCard}>
        <View style={styles.handleBarContainer}>
          <View style={styles.handleBar} />
        </View>

        {/* Driver Info */}
        <View style={styles.driverSection}>
          <Image source={{ uri: driver.avatar }} style={styles.driverAvatar} />
          <View style={styles.driverInfo}>
            <Text style={styles.driverName}>{driver.name}</Text>
            <Text style={styles.carInfo}>
              {driver.carType} • {driver.licensePlate}
            </Text>
            <View style={styles.ratingRow}>
              <MaterialIcons name="star" size={14} color="#FFB800" />
              <Text style={styles.ratingText}>
                {driver.rating} • {driver.totalRides} chuyến
              </Text>
            </View>
          </View>
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.chatButton} onPress={handleChat}>
              <MaterialIcons name="chat-bubble-outline" size={20} color="#fff" />
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.callButton} onPress={handleCall}>
              <MaterialIcons name="phone" size={20} color="#000" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Route Info */}
        <View style={styles.routeSection}>
          {/* Pickup */}
          <View style={styles.routeItem}>
            <View style={styles.routeIconWrapper}>
              <View style={styles.pickupDot} />
              <View style={styles.routeLine} />
            </View>
            <View style={styles.routeContent}>
              <Text style={styles.routeLabel}>ĐIỂM ĐÓN</Text>
              <Text style={styles.routeAddress}>{ride?.pickupAddress || 'Đang tải...'}</Text>
              {ride?.pickupTime && (
                <Text style={styles.routeTime}>{new Date(ride.pickupTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</Text>
              )}
            </View>
          </View>

          {/* Dropoff */}
          <View style={styles.routeItem}>
            <View style={styles.routeIconWrapper}>
              <MaterialIcons name="location-on" size={20} color="#EF4444" />
            </View>
            <View style={styles.routeContent}>
              <Text style={styles.routeLabel}>ĐIỂM ĐẾN</Text>
              <Text style={styles.routeAddress}>{ride?.dropoffAddress || 'Đang tải...'}</Text>
            </View>
          </View>
        </View>

        {/* Cancel Button */}
        <TouchableOpacity style={styles.cancelButton} onPress={handleCancelRide}>
          <Text style={styles.cancelButtonText}>Hủy chuyến đi</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    zIndex: 10,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  helpText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6B00',
  },
  statusBadge: {
    position: 'absolute',
    top: 110,
    left: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1a202c',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  etaBadge: {
    position: 'absolute',
    top: '45%',
    left: '50%',
    transform: [{ translateX: -50 }, { translateY: -30 }],
    backgroundColor: '#FF6B00',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  etaInfo: {
    alignItems: 'center',
  },
  etaTime: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  etaDistance: {
    fontSize: 12,
    fontWeight: '500',
    color: '#fff',
    opacity: 0.9,
  },
  bottomCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1a202c',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingBottom: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 15,
  },
  handleBarContainer: {
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 16,
  },
  handleBar: {
    width: 40,
    height: 5,
    backgroundColor: '#4B5563',
    borderRadius: 3,
  },
  driverSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    marginBottom: 20,
  },
  driverAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#FF6B00',
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  carInfo: {
    fontSize: 13,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  chatButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4B5563',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: '#1a202c',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  callButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FF6B00',
    justifyContent: 'center',
    alignItems: 'center',
  },
  routeSection: {
    backgroundColor: '#374151',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: SPACING.lg,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#4B5563',
  },
  routeItem: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  routeIconWrapper: {
    width: 24,
    alignItems: 'center',
    marginRight: 12,
  },
  pickupDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: '#fff',
  },
  routeLine: {
    width: 2,
    height: 30,
    backgroundColor: '#4B5563',
    marginTop: 4,
  },
  routeContent: {
    flex: 1,
  },
  routeLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#9CA3AF',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  routeAddress: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  routeTime: {
    fontSize: 12,
    color: '#FF6B00',
    fontWeight: '500',
  },
  cancelButton: {
    marginHorizontal: SPACING.lg,
    height: 52,
    borderRadius: 14,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#EF4444',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
})
