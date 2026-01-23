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

const ORANGE = '#FF6B00'

type DeliveryTrackingRouteProp = RouteProp<RootStackParamList, 'DeliveryTracking'>
type DeliveryTrackingNavigationProp = NativeStackNavigationProp<RootStackParamList, 'DeliveryTracking'>

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
  const [currentStatus, setCurrentStatus] = useState<'pickup' | 'delivering' | 'delivered'>('delivering')
  const [estimatedTime, setEstimatedTime] = useState('14:30')

  // Fetch delivery data
  useEffect(() => {
    const fetchDelivery = async () => {
      try {
        if (!deliveryId) return
        
        const data = await deliveryService.getDelivery(deliveryId)
        setDelivery(data)
        
        // Map status to timeline status
        if (data.status === 'picking_up') {
          setCurrentStatus('pickup')
        } else if (data.status === 'delivering') {
          setCurrentStatus('delivering')
        } else if (data.status === 'delivered') {
          setCurrentStatus('delivered')
        }
      } catch (error) {
        console.error('[DeliveryTracking] Fetch error:', error)
        Alert.alert('Lỗi', 'Không thể tải thông tin đơn hàng')
      }
    }

    fetchDelivery()

    // Poll delivery status every 5 seconds
    const pollInterval = setInterval(async () => {
      try {
        if (!deliveryId) return

        const data = await deliveryService.getDelivery(deliveryId)
        setDelivery(data)

        // Check if delivery is completed
        if (data.status === 'delivered') {
          clearInterval(pollInterval)
          
          // Navigate to DeliveryCompleted
          setTimeout(() => {
            navigation.replace('DeliveryCompleted', {
              deliveryId: data._id,
              totalAmount: data.actualPrice || data.estimatedPrice,
              distance: data.distance || '5km',
              duration: data.duration || '15 phút',
              driver: {
                id: data.driverId || '1',
                name: 'Nguyễn Văn An',
                phone: '0901234567',
                rating: 4.8,
                totalTrips: 132,
              }
            })
          }, 1000)
        }

        // Update timeline status
        if (data.status === 'picking_up') {
          setCurrentStatus('pickup')
        } else if (data.status === 'delivering') {
          setCurrentStatus('delivering')
        }
      } catch (error) {
        console.error('[DeliveryTracking] Poll error:', error)
      }
    }, 5000)

    return () => clearInterval(pollInterval)
  }, [deliveryId])

  // Mock driver data - replace with actual data from API
  const driver: Driver = routeDriver || {
    id: '1',
    name: 'Nguyễn Văn An',
    phone: '0901234567',
    rating: 4.8,
    totalTrips: 132,
    vehiclePlate: '29C - 123.45',
    avatar: undefined,
  }

  const handleCall = () => {
    Linking.openURL(`tel:${driver.phone}`)
  }

  const handleChat = () => {
    Alert.alert('Chat', 'Chức năng chat đang được phát triển')
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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back-ios" size={20} color="#111" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Đơn hàng #{deliveryId?.slice(-8) || 'FG-2024'}</Text>
          <Text style={styles.headerSubtitle}>{delivery?.status?.toUpperCase() || 'ĐANG GIAO HÀNG'}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Map */}
      <View style={styles.mapContainer}>
        <MapViewComponent height={300} />
        
        {/* Zoom controls */}
        <View style={styles.mapControls}>
          <TouchableOpacity style={styles.mapBtn}>
            <MaterialIcons name="add" size={24} color="#333" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.mapBtn}>
            <MaterialIcons name="remove" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        {/* Current location button */}
        <TouchableOpacity style={styles.locationBtn}>
          <MaterialIcons name="my-location" size={24} color={ORANGE} />
        </TouchableOpacity>
      </View>

      {/* Bottom Card */}
      <View style={styles.bottomCard}>
        {/* Status Timeline */}
        {renderStatusTimeline()}

        {/* Driver Info */}
        <View style={styles.driverCard}>
          <View style={styles.driverAvatar}>
            {driver.avatar ? (
              <Image source={{ uri: driver.avatar }} style={styles.avatarImage} />
            ) : (
              <MaterialIcons name="person" size={32} color="#999" />
            )}
          </View>

          <View style={styles.driverInfo}>
            <Text style={styles.driverName}>{driver.name}</Text>
            <View style={styles.ratingRow}>
              <View style={styles.stars}>
                {renderStars(driver.rating)}
              </View>
              <Text style={styles.ratingText}>{driver.rating}</Text>
              <Text style={styles.tripCount}>• {driver.totalTrips} chuyến đã giao</Text>
            </View>
            <View style={styles.vehicleRow}>
              <MaterialCommunityIcons name="motorbike" size={16} color="#666" />
              <Text style={styles.vehiclePlate}>{driver.vehiclePlate}</Text>
            </View>
          </View>

          <View style={styles.driverActions}>
            <TouchableOpacity style={styles.callBtn} onPress={handleCall}>
              <MaterialIcons name="phone" size={20} color="#fff" />
              <Text style={styles.callBtnText}>Gọi tài xế</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.chatBtn} onPress={handleChat}>
              <MaterialCommunityIcons name="message-text" size={20} color={ORANGE} />
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

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
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
    backgroundColor: '#F9F9F9',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  driverAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E5E5E5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  driverInfo: {
    marginBottom: 16,
  },
  driverName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111',
    marginBottom: 6,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  stars: {
    flexDirection: 'row',
    marginRight: 6,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111',
    marginRight: 6,
  },
  tripCount: {
    fontSize: 13,
    color: '#666',
  },
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  vehiclePlate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
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
    borderRadius: 30,
    gap: 8,
  },
  callBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  chatBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFE8DC',
    alignItems: 'center',
    justifyContent: 'center',
  },
})
