import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Image,
  Linking,
  Alert,
} from 'react-native'
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons'
import { useNavigation, useRoute } from '@react-navigation/native'
import type { RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../types'
import MapViewComponent from '../components/MapView'
import { deliveryService, type Delivery } from '../services/deliveryService'
import { driverService, type Driver as DriverDetails } from '../services/driverService'
import { mapsService } from '../services/mapsService'
import { SPACING } from '@/constants/config'

const ORANGE = '#FF6B00'
const POLL_INTERVAL = 5000
const DELIVERY_COMPLETED_DELAY = 1000

type DeliveryTrackingRouteProp = RouteProp<RootStackParamList, 'DeliveryTracking'>
type DeliveryTrackingNavigationProp = NativeStackNavigationProp<RootStackParamList, 'DeliveryTracking'>

// Helper function to extract coordinates from various data structures
const extractCoordinates = (data: any, field: 'pickup' | 'dropoff') => {
  const locationField = field === 'pickup' ? 'pickupLocation' : 'dropoffLocation'
  const coordinatesField = field === 'pickup' ? 'pickupCoordinates' : 'dropoffCoordinates'
  const addressField = field === 'pickup' ? 'pickupAddress' : 'dropoffAddress'

  // Try location.coordinates first
  if (data[locationField]?.coordinates?.length === 2) {
    return {
      latitude: data[locationField].coordinates[1],
      longitude: data[locationField].coordinates[0],
    }
  }

  // Try direct coordinates field
  if (data[coordinatesField]?.length === 2) {
    return {
      latitude: data[coordinatesField][1],
      longitude: data[coordinatesField][0],
    }
  }

  // Return address for geocoding
  return data[addressField] ? { address: data[addressField] } : null
}

// Helper to get driver ID from driverId field
const getDriverId = (driverId: any): string | null => {
  if (!driverId) return null
  return typeof driverId === 'object' ? driverId._id : driverId
}

// Helper to map delivery status to timeline status
const mapDeliveryStatus = (status: string): 'pickup' | 'delivering' | 'delivered' => {
  switch (status) {
    case 'picking_up':
      return 'pickup'
    case 'delivered':
      return 'delivered'
    default:
      return 'delivering'
  }
}

interface Driver {
  id: string
  name: string
  phone: string
  rating: number
  totalTrips: number
  vehiclePlate: string
  avatar?: string
}

export default function DeliveryTracking() {
  const navigation = useNavigation<DeliveryTrackingNavigationProp>()
  const route = useRoute<DeliveryTrackingRouteProp>()
  const { deliveryId, driver: routeDriver } = route.params || {}

  const [delivery, setDelivery] = useState<Delivery | null>(null)
  const [driverDetails, setDriverDetails] = useState<DriverDetails | null>(null)
  const [currentStatus, setCurrentStatus] = useState<'pickup' | 'delivering' | 'delivered'>('delivering')
  const [estimatedTime, setEstimatedTime] = useState('14:30')
  const [pickupCoords, setPickupCoords] = useState<{ latitude: number; longitude: number } | null>(null)
  const [dropoffCoords, setDropoffCoords] = useState<{ latitude: number; longitude: number } | null>(null)
  const [routeCoordinates, setRouteCoordinates] = useState<Array<{ latitude: number; longitude: number }>>([])
  const [driverLocation, setDriverLocation] = useState<{ latitude: number; longitude: number } | null>(null)

  // Fetch delivery data
  useEffect(() => {
    // Fetch and process delivery data
    const fetchDelivery = async () => {
      try {
        if (!deliveryId) return

        const data = await deliveryService.getDelivery(deliveryId)
        setDelivery(data)

        console.log('[DeliveryTracking] Delivery fetched:', {
          id: data._id,
          status: data.status,
          hasDriver: !!data.driverId,
        })

        // Update status
        setCurrentStatus(mapDeliveryStatus(data.status))
        
        // Fetch driver details
        const driverId = getDriverId(data.driverId)
        if (driverId) {
          try {
            const driverData = await driverService.getDriver(driverId)
            setDriverDetails(driverData)
            console.log('[DeliveryTracking] Driver details fetched')
          } catch (error) {
            console.error('[DeliveryTracking] Failed to fetch driver details:', error)
          }
        }

        // Process coordinates
        await processDeliveryCoordinates(data)

      } catch (error) {
        console.error('[DeliveryTracking] Fetch error:', error)
        Alert.alert('Lỗi', 'Không thể tải thông tin đơn hàng')
      }
    }

    // Process and set coordinates
    const processDeliveryCoordinates = async (data: any) => {
      // Extract pickup coordinates
      const pickupResult = extractCoordinates(data, 'pickup')
      if (pickupResult) {
        if ('address' in pickupResult) {
          try {
            const geocoded = await mapsService.geocodeAddress(pickupResult.address)
            if (geocoded?.coordinates) {
              setPickupCoords(geocoded.coordinates)
            }
          } catch (error) {
            console.error('[DeliveryTracking] Pickup geocoding error:', error)
          }
        } else {
          setPickupCoords(pickupResult)
        }
      }

      // Extract dropoff coordinates
      const dropoffResult = extractCoordinates(data, 'dropoff')
      if (dropoffResult) {
        if ('address' in dropoffResult) {
          try {
            const geocoded = await mapsService.geocodeAddress(dropoffResult.address)
            if (geocoded?.coordinates) {
              setDropoffCoords(geocoded.coordinates)
            }
          } catch (error) {
            console.error('[DeliveryTracking] Dropoff geocoding error:', error)
          }
        } else {
          setDropoffCoords(dropoffResult)
        }
      }

      // Extract driver location
      if (data.driverId?.currentLocation?.coordinates?.length === 2) {
        setDriverLocation({
          latitude: data.driverId.currentLocation.coordinates[1],
          longitude: data.driverId.currentLocation.coordinates[0],
        })
      }

      // Calculate route
      const pickup = extractCoordinates(data, 'pickup')
      const dropoff = extractCoordinates(data, 'dropoff')
      
      if (pickup && dropoff && !('address' in pickup) && !('address' in dropoff)) {
        try {
          const routeInfo = await mapsService.getRouteInfo(
            `${pickup.latitude},${pickup.longitude}`,
            `${dropoff.latitude},${dropoff.longitude}`
          )

          if (routeInfo.routeCoordinates?.length > 0) {
            setRouteCoordinates(routeInfo.routeCoordinates)
            console.log('[DeliveryTracking] Route set:', routeInfo.routeCoordinates.length, 'points')
          }
        } catch (error) {
          console.error('[DeliveryTracking] Route calculation error:', error)
        }
      }
    }

    // Handle delivery completion
    const handleDeliveryComplete = (data: any) => {
      navigation.replace('DeliveryCompleted', {
        deliveryId: data._id,
        totalAmount: data.actualPrice || data.estimatedPrice,
        distance: data.distance || '5km',
        duration: data.duration || '15 phút',
        driver: {
          id: getDriverId(data.driverId) || '1',
          name: 'Nguyễn Văn An',
          phone: '0901234567',
          rating: 4.8,
          totalTrips: 132,
        }
      })
    }

    // Poll for delivery updates
    const pollDeliveryStatus = async () => {
      try {
        if (!deliveryId) return

        const data = await deliveryService.getDelivery(deliveryId)
        setDelivery(data)

        // Check completion
        if (data.status === 'delivered') {
          return 'completed'
        }

        // Update status
        setCurrentStatus(mapDeliveryStatus(data.status))

        // Update coordinates
        const pickup = extractCoordinates(data, 'pickup')
        const dropoff = extractCoordinates(data, 'dropoff')
        
        if (pickup && !('address' in pickup)) setPickupCoords(pickup)
        if (dropoff && !('address' in dropoff)) setDropoffCoords(dropoff)

        // Update driver location
        if (data.driverId?.currentLocation?.coordinates?.length === 2) {
          setDriverLocation({
            latitude: data.driverId.currentLocation.coordinates[1],
            longitude: data.driverId.currentLocation.coordinates[0],
          })
        }

        return 'continue'
      } catch (error) {
        console.error('[DeliveryTracking] Poll error:', error)
        return 'error'
      }
    }

    // Initial fetch
    fetchDelivery()

    // Setup polling
    const pollInterval = setInterval(async () => {
      const result = await pollDeliveryStatus()
      
      if (result === 'completed') {
        clearInterval(pollInterval)
        const currentDelivery = await deliveryService.getDelivery(deliveryId!)
        setTimeout(() => handleDeliveryComplete(currentDelivery), DELIVERY_COMPLETED_DELAY)
      }
    }, POLL_INTERVAL)

    return () => clearInterval(pollInterval)
  }, [deliveryId, navigation])

  // Get driver data from driverDetails or delivery or use route params or fallback
  const driver: Driver = React.useMemo(() => {
    // Priority 1: Use fetched driver details
    if (driverDetails) {
      return {
        id: driverDetails._id,
        name: `${driverDetails.firstName} ${driverDetails.lastName}`.trim(),
        phone: driverDetails.phone,
        rating: driverDetails.averageRating || 0,
        totalTrips: driverDetails.totalTrips || 0,
        vehiclePlate: driverDetails.vehiclePlate || 'N/A',
        avatar: driverDetails.avatar,
      }
    }

    // Priority 2: Get basic info from delivery data
    if (delivery?.driverId && typeof delivery.driverId === 'object') {
      const driverData = delivery.driverId as any
      return {
        id: driverData._id || driverData.id || '1',
        name: `${driverData.firstName || ''} ${driverData.lastName || ''}`.trim() || driverData.name || 'Tài xế',
        phone: driverData.phone || '0000000000',
        rating: driverData.averageRating || driverData.rating || 0,
        totalTrips: driverData.totalTrips || 0,
        vehiclePlate: driverData.vehiclePlate || 'N/A',
        avatar: driverData.avatar,
      }
    }
    
    // Priority 3: Use route params
    if (routeDriver) {
      return routeDriver
    }
    
    // Priority 4: Fallback to default
    return {
      id: '1',
      name: 'Tài xế',
      phone: '0000000000',
      rating: 0,
      totalTrips: 0,
      vehiclePlate: 'N/A',
      avatar: undefined,
    }
  }, [driverDetails, delivery, routeDriver])

  const handleCall = () => {
    Linking.openURL(`tel:${driver.phone}`)
  }

  const handleChat = () => {
    if (!deliveryId) {
      Alert.alert('Lỗi', 'Không tìm thấy thông tin đơn hàng')
      return
    }

    navigation.navigate('ChatScreen', {
      driver: {
        id: driver.id,
        name: driver.name,
        phone: driver.phone,
      },
      deliveryId: deliveryId,
    })
  }

  const renderStatusTimeline = () => {
    const statuses = [
      { key: 'pickup', label: 'Lấy hàng', time: '' },
      { key: 'delivering', label: 'Đang vận chuyển', time: '' },
      { key: 'delivered', label: 'Giao hàng', time: '' },
    ]

    const getStatusIndex = (status: string) => {
      return statuses.findIndex(s => s.key === status)
    }

    const currentIndex = getStatusIndex(currentStatus)

    return (
      <View style={styles.timeline}>
        <View style={styles.timelineHeader}>
          <MaterialIcons name="local-shipping" size={18} color={ORANGE} />
          <Text style={styles.timelineTitle}>ĐANG GIAO HÀNG</Text>
          <Text style={styles.timelineEta}>Dự kiến: {estimatedTime}</Text>
        </View>

        <View style={styles.timelineProgress}>
          {statuses.map((status, index) => (
            <React.Fragment key={status.key}>
              {/* Step */}
              <View style={styles.timelineStep}>
                <View style={[
                  styles.stepDot,
                  index <= currentIndex && styles.stepDotActive,
                  index === currentIndex && styles.stepDotCurrent,
                ]} />
                <Text style={[
                  styles.stepLabel,
                  index <= currentIndex && styles.stepLabelActive,
                ]}>
                  {status.label}
                </Text>
              </View>

              {/* Line connector */}
              {index < statuses.length - 1 && (
                <View style={[
                  styles.stepLine,
                  index < currentIndex && styles.stepLineActive,
                ]} />
              )}
            </React.Fragment>
          ))}
        </View>
      </View>
    )
  }

  const renderStars = (rating: number) => {
    const stars = []
    const fullStars = Math.floor(rating)
    const hasHalfStar = rating % 1 >= 0.5

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(
          <MaterialIcons key={i} name="star" size={14} color="#FFB800" />
        )
      } else if (i === fullStars && hasHalfStar) {
        stars.push(
          <MaterialIcons key={i} name="star-half" size={14} color="#FFB800" />
        )
      } else {
        stars.push(
          <MaterialIcons key={i} name="star-border" size={14} color="#DDD" />
        )
      }
    }
    return stars
  }

  return (
    <SafeAreaView style={styles.container}>

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
          drivers={driverLocation ? [{
            id: driver.id,
            latitude: driverLocation.latitude,
            longitude: driverLocation.longitude,
            name: driver.name,
            rating: driver.rating,
            vehicle: driver.vehiclePlate,
          }] : []}
        />
      </View>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Đơn hàng #{deliveryId?.slice(-8) || 'FG-2024'}</Text>
          <Text style={styles.headerSubtitle}>{delivery?.status?.toUpperCase() || 'ĐANG GIAO HÀNG'}</Text>
        </View>
      </View>
      {/* Driver Status Badge */}
      <View style={styles.statusBadge}>
        <MaterialIcons name="location-on" size={16} color="#fff" />
        <Text style={styles.statusText}>Tài xế đang di chuyển đến điểm đón</Text>
      </View>
      {/* Bottom Card */}
      <View style={styles.card}>
                <View style={styles.handleBarContainer}>
                  <View style={styles.handleBar} />
                </View>
        {/* Status Timeline */}
        {renderStatusTimeline()}
        {/* Driver Info */}
        <View style={styles.driverCard}>
          {/* Driver Header with Avatar and Basic Info */}
          <View style={styles.driverHeader}>
            <View style={styles.driverAvatar}>
              {driver.avatar ? (
                <Image source={{ uri: driver.avatar }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <MaterialIcons name="person" size={28} color="#FF6B00" />
                </View>
              )}
              {/* Online Status Badge */}
              <View style={styles.onlineBadge} />
            </View>

            <View style={styles.driverBasicInfo}>
              <Text style={styles.driverName}>{driver.name}</Text>
              
              {/* Rating with Stars */}
              <View style={styles.ratingContainer}>
                <View style={styles.ratingBadge}>
                  <MaterialIcons name="star" size={16} color="#FFB800" />
                  <Text style={styles.ratingValue}>{driver.rating.toFixed(1)}</Text>
                </View>
                <Text style={styles.ratingDivider}>•</Text>
                <Text style={styles.tripCount}>{driver.totalTrips} chuyến</Text>
              </View>

              {/* Vehicle Info */}
              <View style={styles.vehicleInfo}>
                <View style={styles.vehicleBadge}>
                  <MaterialCommunityIcons name="motorbike" size={14} color="#666" />
                  <Text style={styles.vehiclePlate}>{driver.vehiclePlate}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.driverActions}>
            <TouchableOpacity style={styles.callBtn} onPress={handleCall}>
              <View style={styles.callBtnIcon}>
                <MaterialIcons name="phone" size={20} color="#fff" />
              </View>
              <Text style={styles.callBtnText}>Gọi điện</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.chatBtn} onPress={handleChat}>
              <View style={styles.chatBtnIcon}>
                <MaterialCommunityIcons name="message-text" size={20} color="#FF6B00" />
              </View>
              <Text style={styles.chatBtnText}>Nhắn tin</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
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

  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111',
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: ORANGE,
    marginTop: 2,
    letterSpacing: 0.5,
  },

  // Map
  mapContainer: {
    height: 300,
    position: 'relative',
  },
  mapControls: {
    position: 'absolute',
    right: 16,
    top: 16,
    gap: 8,
  },
  mapBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  locationBtn: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },

  // Bottom Card
  bottomCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },

  // Timeline
  timeline: {
    marginBottom: 20,
  },
  timelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  timelineTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: ORANGE,
    marginLeft: 6,
    flex: 1,
    letterSpacing: 0.5,
  },
  timelineEta: {
    fontSize: 12,
    color: '#666',
  },
  timelineProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  timelineStep: {
    alignItems: 'center',
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E5E5E5',
    borderWidth: 3,
    borderColor: '#E5E5E5',
  },
  stepDotActive: {
    backgroundColor: ORANGE,
    borderColor: ORANGE,
  },
  stepDotCurrent: {
    backgroundColor: '#fff',
    borderColor: ORANGE,
    borderWidth: 4,
  },
  stepLabel: {
    fontSize: 11,
    color: '#999',
    marginTop: 8,
    fontWeight: '500',
  },
  stepLabelActive: {
    color: '#111',
    fontWeight: '600',
  },
  stepLine: {
    flex: 1,
    height: 3,
    backgroundColor: '#E5E5E5',
    marginHorizontal: 4,
    marginBottom: 28,
  },
  stepLineActive: {
    backgroundColor: ORANGE,
  },

  // Driver Card
  driverCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  driverHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  driverAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginRight: 14,
    position: 'relative',
  },
  avatarImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    borderColor: '#F0F0F0',
  },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFE8DC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFD4BE',
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  driverBasicInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  driverName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
    marginBottom: 6,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
  },
  ratingValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F9A825',
    marginLeft: 4,
  },
  ratingDivider: {
    fontSize: 14,
    color: '#CCC',
    marginHorizontal: 6,
  },
  tripCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  vehicleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vehicleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 6,
  },
  vehiclePlate: {
    fontSize: 13,
    fontWeight: '700',
    color: '#333',
    letterSpacing: 0.5,
  },
  driverActions: {
    flexDirection: 'row',
    gap: 12,
  },
  callBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ORANGE,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    shadowColor: ORANGE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  callBtnIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  callBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  chatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFE8DC',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    borderWidth: 2,
    borderColor: '#FFD4BE',
  },
  chatBtnIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: ORANGE,
  },
  statusBadge: {
    position: 'absolute',
    top: 110,
    left: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FF6B00',
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
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 15,
    maxHeight: '50%',
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
})
