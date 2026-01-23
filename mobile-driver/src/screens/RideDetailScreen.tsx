import React, { useState, useEffect, useRef } from 'react'
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
import { COLORS } from '../constants'
import MapViewComponent from '../components/MapView'
interface RideDetailScreenProps {
  navigation: any
  route: any
}

interface Customer {
  _id: string
  name?: string
  firstName?: string
  lastName?: string
  phone: string
  rating: number
  avatar?: string
  address?: string
}

export default function RideDetailScreen({ navigation, route }: RideDetailScreenProps) {
  const [ride, setRide] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [currentLocation, setCurrentLocation] = useState<[number, number] | null>(null)
  const [showCustomerModal, setShowCustomerModal] = useState(false)
  const [requestingCustomer, setRequestingCustomer] = useState<Customer | null>(null)
  const [modalCountdown, setModalCountdown] = useState(60)
  const [paramError, setParamError] = useState<string | null>(null)

  const statusFadeAnim = useRef(new Animated.Value(0)).current
  const mapRef = useRef<MapView>(null)

  // Lấy ride ID từ route params
  const rideId = route?.params?.rideId
  React.useEffect(() => {
    if (!rideId) {
      setParamError('Không tìm thấy mã chuyến đi (rideId). Vui lòng quay lại và thử lại.')
      setLoading(false)
    }
  }, [rideId])

  // Fetch ride detail từ API
  useEffect(() => {
    if (!rideId) return
    console.log('🚗 RideDetailScreen - rideId:', rideId)
    fetchRideDetail()
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
      const API_URL = 'http://192.168.1.16:3000/api'
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

      setRide(data)

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
              const API_URL = 'http://192.168.1.16:3000/api'
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
              const API_URL = 'http://192.168.1.16:3000/api'
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
    navigation.navigate('TripActivities', { rideId, isEdit: true })
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
              const API_URL = 'http://192.168.1.16:3000/api'
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
      const API_URL = 'http://192.168.1.16:3000/api'
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

  return (
    <View style={styles.container}>
      <View style={StyleSheet.absoluteFillObject}>
        <MapViewComponent
          height={'100%'}
        />
      </View>
      <View style={styles.header}>
        <TouchableOpacity style={[styles.backButton, { backgroundColor: "#fff" }]} onPress={handleGoBack}>
          <MaterialIcons name="arrow-back" size={24} color="#FF6B00" />
        </TouchableOpacity>
        <Text style={styles.logoText}>firego</Text>
      </View>
      <View style={[styles.card]}>
        <View style={styles.handleBar} />
        <View style={styles.headerCard}>
          <View>
            <Text style={styles.title}>Cuốc xe hiện tại</Text>
            <Text style={styles.subtitle}>Mã cuốc: {ride?._id || 'Đang tải...'}</Text>
          </View>
          <View style={styles.priceBox}>
            <Text style={styles.price}>Giá: {ride?.price || '75.000đ'} </Text>
            <Text style={styles.payment}>tiền mặt</Text>
          </View>
        </View>
        <View style={styles.divider} />
        <View style={styles.locationRow}>
          <View style={styles.dotPickup} />
          <Text style={styles.locationText}>
            {ride?.pickupAddress || 'Đang tải...'}
          </Text>
        </View>
        <View style={styles.locationRow}>
          <View style={styles.dotDropoff} />
          <Text style={styles.locationText}>
            {ride?.dropoffAddress || 'Đang tải...'}
          </Text>
        </View>
        <TouchableOpacity style={styles.acceptButton} onPress={handleEditRide}>
          <Text>Nhận cuốc xe</Text>
        </TouchableOpacity>
        <View>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  header: {
    position: 'absolute',
    top: 50,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
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
  card: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1a202c',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 10,
    width: '100%',
    height: 500,
  },
  handleBar: {
    width: 50,
    height: 5,
    backgroundColor: '#ccc',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  headerCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  subtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  priceBox: {
    alignItems: 'flex-end',
  },
  price: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FF6B00',
  },
  payment: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  divider: {
    height: 1,
    backgroundColor: '#374151',
    marginVertical: 12,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  dotPickup: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
    marginRight: 8,
  },
  dotDropoff: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    marginRight: 8,
  },
  locationText: {
    flex: 1,
    fontSize: 14,
    color: '#D1D5DB',
  },
  acceptButton: {
    backgroundColor: '#FF6B00',
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 12,
    alignItems: 'center',
  },
})
