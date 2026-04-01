import { useState, useEffect, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Alert,
  Image,
  ActivityIndicator,
  Animated,
  PanResponder,
  Dimensions,
  ScrollView,
} from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import MapViewComponent from '../components/MapView'
import { SPACING, API_BASE_URL } from '../constants'
import { mapsService } from '../services/mapsService'
import ChatScreen from './ChatScreen'

const SCREEN_HEIGHT = Dimensions.get('window').height
// 3 snap points: 25%, 45%, 85%
const SNAP_25 = SCREEN_HEIGHT * 0.25
const SNAP_45 = SCREEN_HEIGHT * 0.45
const SNAP_85 = SCREEN_HEIGHT * 0.85

interface RideTrackingProps {
  navigation?: any
  route?: any
}

interface Driver {
  id: string
  name: string
  avatar: string
  rating: number
  carType: string
  licensePlate: string
  phone: string
}

export default function RideTracking({ navigation, route }: RideTrackingProps) {
  const { rideId } = route?.params || {}
  const [ride, setRide] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [driver, setDriver] = useState<Driver>({
    id: '',
    name: '',
    avatar: '',
    rating: 0,
    carType: '',
    licensePlate: '',
    phone: '',
  })

  const [pickupCoords, setPickupCoords] = useState<{ latitude: number; longitude: number } | null>(null)
  const [dropoffCoords, setDropoffCoords] = useState<{ latitude: number; longitude: number } | null>(null)
  const [routeCoordinates, setRouteCoordinates] = useState<Array<{ latitude: number; longitude: number }>>([])
  const [showChat, setShowChat] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [driverLocation, setDriverLocation] = useState<{ latitude: number; longitude: number } | null>(null)

  // Bottom sheet animation — start at 45%
  const sheetHeight = useRef(new Animated.Value(SNAP_45)).current
  const lastHeight = useRef(SNAP_45)

  const snapTo = (target: number) => {
    lastHeight.current = target
    Animated.spring(sheetHeight, {
      toValue: target,
      useNativeDriver: false,
      damping: 22,
      stiffness: 130,
    }).start()
  }

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => {
        const next = lastHeight.current - g.dy
        if (next >= SNAP_25 && next <= SNAP_85) {
          sheetHeight.setValue(next)
        }
      },
      onPanResponderRelease: (_, g) => {
        const cur = lastHeight.current - g.dy
        // Find closest snap
        const snaps = [SNAP_25, SNAP_45, SNAP_85]
        const closest = snaps.reduce((a, b) => Math.abs(b - cur) < Math.abs(a - cur) ? b : a)
        snapTo(closest)
      },
    })
  ).current

  useEffect(() => {
    if (pickupCoords && dropoffCoords && routeCoordinates.length === 0) {
      fetchRouteFromPickupDropoff()
    }
  }, [pickupCoords, dropoffCoords])

  const fetchRouteFromPickupDropoff = async () => {
    if (!pickupCoords || !dropoffCoords) return
    try {
      const routeInfo = await mapsService.getRouteInfo(
        `${pickupCoords.latitude},${pickupCoords.longitude}`,
        `${dropoffCoords.latitude},${dropoffCoords.longitude}`
      )
      if (routeInfo.routeCoordinates?.length > 0) {
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
      const response = await fetch(`${API_BASE_URL}/messages/ride/${rideId}/unread-count`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (response.ok) {
        const result = await response.json()
        setUnreadCount(result.data?.unreadCount || 0)
      }
    } catch (error) { /* ignore */ }
  }

  useEffect(() => {
    if (!rideId) {
      setLoading(false)
      return
    }

    const fetchRideStatus = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/rides/${rideId}`)
        if (response.ok) {
          const data = await response.json()
          setRide(prev => {
            if (!prev || prev.status !== data.status || prev._id !== data._id) return data
            return prev
          })
          setLoading(false)

          if (data.pickupLocation?.coordinates?.length === 2) {
            setPickupCoords(prev => {
              const lat = data.pickupLocation.coordinates[1]
              const lng = data.pickupLocation.coordinates[0]
              if (!prev || prev.latitude !== lat || prev.longitude !== lng) return { latitude: lat, longitude: lng }
              return prev
            })
          }
          if (data.dropoffLocation?.coordinates?.length === 2) {
            setDropoffCoords(prev => {
              const lat = data.dropoffLocation.coordinates[1]
              const lng = data.dropoffLocation.coordinates[0]
              if (!prev || prev.latitude !== lat || prev.longitude !== lng) return { latitude: lat, longitude: lng }
              return prev
            })
          }

          if (data.status === 'completed') {
            navigation.replace('RatingDriver', {
              rideId: data._id,
              driver: {
                name: data.driverId?.firstName && data.driverId?.lastName
                  ? `${data.driverId.firstName} ${data.driverId.lastName}` : 'Tài xế',
                avatar: data.driverId?.avatar,
                carType: data.driverId?.vehicleType,
                licensePlate: data.driverId?.licensePlate,
              }
            })
          }

          if (data.driverId && typeof data.driverId === 'object') {
            const d = Array.isArray(data.driverId) ? data.driverId[0] : data.driverId
            setDriver(prev => {
              const newId = d._id || d.id
              const newName = `${d.firstName || ''} ${d.lastName || ''}`.trim() || 'Tài xế'
              const newRating = d.averageRating || d.rating || 0
              if (prev.id !== newId || prev.name !== newName || prev.rating !== newRating) {
                return {
                  id: newId,
                  name: newName,
                  phone: d.phone || '',
                  rating: newRating,
                  carType: d.vehicleModel || d.vehicleType || 'Xe',
                  licensePlate: d.vehiclePlate || d.licensePlate || '',
                  avatar: d.avatar || 'https://via.placeholder.com/100',
                }
              }
              return prev
            })
            if (d.currentLocation?.coordinates?.length === 2) {
              setDriverLocation(prev => {
                const lat = d.currentLocation.coordinates[1]
                const lng = d.currentLocation.coordinates[0]
                if (!prev || prev.latitude !== lat || prev.longitude !== lng) return { latitude: lat, longitude: lng }
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

    fetchRideStatus()
    fetchUnreadCount()
    const interval = setInterval(() => { fetchRideStatus(); fetchUnreadCount() }, 3000)
    return () => clearInterval(interval)
  }, [rideId, navigation])

  const handleCall = () => { Linking.openURL(`tel:${driver.phone}`) }
  const handleChat = () => { setShowChat(true); setUnreadCount(0) }
  const handleHelp = () => { Alert.alert('Trợ giúp', 'Liên hệ hotline: 1900-xxxx') }

  const handleCancelRide = () => {
    // ─── Guard: kiểm tra trạng thái trước khi làm bất cứ điều gì ───
    if (ride?.status === 'cancelled') {
      Alert.alert(
        'Chuyến đã hủy',
        'Chuyến đi này đã được hủy trước đó. Không thể hủy lần nữa.',
        [{ text: 'OK', onPress: () => navigation?.goBack() }]
      )
      return
    }

    if (ride?.status === 'completed') {
      Alert.alert('Không thể hủy', 'Chuyến đi đã hoàn thành, không thể hủy.')
      return
    }

    if (ride?.status === 'in_progress') {
      Alert.alert('Không thể hủy', 'Chuyến đi đang trong quá trình di chuyển, không thể hủy.')
      return
    }
    // ────────────────────────────────────────────────────────────────

    const depositAmount = ride?.depositAmount || 0
    const depositPaid = ride?.depositPaid || false
    const depositRefunded = ride?.depositRefunded || false   // ← chống hoàn cọc nhiều lần
    const hasDriver = !!ride?.driverId

    // Chỉ hiện thông tin hoàn cọc khi: có cọc, đã trừ, chưa hoàn, chưa có tài xế
    const willRefundDeposit = depositPaid && !depositRefunded && !hasDriver && depositAmount > 0

    const confirmMsg = willRefundDeposit
      ? `Bạn có chắc muốn hủy chuyến?\n\nTiền cọc ${depositAmount.toLocaleString('vi-VN')}đ sẽ được hoàn về ví của bạn.`
      : 'Bạn có chắc muốn hủy chuyến đi này?'

    Alert.alert('Xác nhận hủy chuyến', confirmMsg, [
      { text: 'Không', style: 'cancel' },
      {
        text: 'Hủy chuyến',
        style: 'destructive',
        onPress: async () => {
          try {
            const AsyncStorage = require('@react-native-async-storage/async-storage').default
            const token = await AsyncStorage.getItem('authToken') || await AsyncStorage.getItem('token')
            const res = await fetch(`${API_BASE_URL}/rides/${rideId}/cancel`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
              body: JSON.stringify({ cancellationBy: 'customer', reason: 'Khách hủy chuyến' }),
            })
            if (res.ok) {
              // Cập nhật state ngay lập tức để UI phản ánh trạng thái đã hủy
              setRide((prev: any) => prev ? { ...prev, status: 'cancelled' } : prev)
              if (willRefundDeposit) {
                Alert.alert(
                  'Đã hủy chuyến',
                  `Tiền cọc ${depositAmount.toLocaleString('vi-VN')}đ đã được hoàn về ví của bạn.`,
                  [{ text: 'OK', onPress: () => navigation?.goBack() }]
                )
              } else {
                Alert.alert('Đã hủy chuyến', 'Chuyến đi đã được hủy thành công.', [
                  { text: 'OK', onPress: () => navigation?.goBack() }
                ])
              }
            } else {
              // Hiển thị lỗi từ server (bao gồm 'Ride cannot be cancelled' nếu đã bị hủy)
              let errMsg = 'Không thể hủy chuyến. Vui lòng thử lại.'
              try {
                const errData = await res.json()
                if (errData?.message) errMsg = errData.message
              } catch (_) {}
              // Nếu server báo đã hủy rồi → cập nhật UI luôn
              if (res.status === 400) {
                setRide((prev: any) => prev ? { ...prev, status: 'cancelled' } : prev)
              }
              Alert.alert('Lỗi', errMsg)
            }
          } catch (err) {
            Alert.alert('Lỗi', 'Không thể hủy chuyến. Vui lòng thử lại.')
          }
        },
      },
    ])
  }

  const getStatusText = () => {
    if (!ride?.status) return 'Đang tải...'
    switch (ride.status) {
      case 'pending': case 'finding_driver': return 'Đang tìm tài xế...'
      case 'accepted': return 'Tài xế đang di chuyển đến điểm đón'
      case 'arrived_pickup': return 'Tài xế đã đến điểm đón'
      case 'in_progress': return 'Đang di chuyển đến điểm đến'
      case 'arrived_dropoff': return 'Đã đến điểm đến'
      case 'completed': return 'Chuyến đi hoàn thành'
      case 'cancelled': return 'Chuyến đi đã hủy'
      default: return 'Đang xử lý...'
    }
  }

  // Show chat screen
  if (showChat && driver) {
    return (
      <ChatScreen
        driver={{ id: driver.id, name: driver.name, phone: driver.phone }}
        rideId={rideId}
        onClose={() => setShowChat(false)}
      />
    )
  }

  // Deposit info
  const depositAmount = ride?.depositAmount || 0
  const depositPaid = ride?.depositPaid || false
  const isHireWithDeposit = ride?.rideType === 'hire' && depositAmount > 0
  const remaining = Math.max(0, (ride?.totalFare || 0) - (depositPaid ? depositAmount : 0))

  return (
    <View style={styles.container}>
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
          initialRegion={pickupCoords || { latitude: 21.0285, longitude: 105.8542, latitudeDelta: 0.01, longitudeDelta: 0.01 }}
          pickupCoords={pickupCoords || undefined}
          dropoffCoords={dropoffCoords || undefined}
          routeCoordinates={routeCoordinates}
          drivers={driverLocation ? [{ id: driver.id, latitude: driverLocation.latitude, longitude: driverLocation.longitude, name: driver.name, rating: driver.rating, vehicle: driver.carType }] : []}
        />
      </View>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={[styles.backButton, { backgroundColor: 'rgba(255, 255, 255, 0.8)' }]} onPress={() => navigation?.goBack()}>
          <MaterialIcons name="arrow-back" size={22} color="#FF6B00" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Theo dõi chuyến đi</Text>
        <TouchableOpacity onPress={handleHelp}>
          <Text style={styles.helpText}>Trợ giúp</Text>
        </TouchableOpacity>
      </View>

      {/* Status Badge */}
      <View style={styles.statusBadge}>
        <MaterialIcons name="location-on" size={16} color="#fff" />
        <Text style={styles.statusText}>{getStatusText()}</Text>
      </View>

      {/* ETA Badge */}
      <View style={styles.etaBadge}>
        <MaterialIcons name="directions-car" size={20} color="#fff" />
        <View style={styles.etaInfo}>
          <Text style={styles.etaTime}>{ride?.duration ? `${ride.duration} phút` : 'Đang tính...'}</Text>
          <Text style={styles.etaDistance}>{ride?.distance ? `${ride.distance} km` : 'Đang tính...'}</Text>
        </View>
      </View>

      {/* 3-Snap Bottom Sheet */}
      <Animated.View style={[styles.bottomSheet, { height: sheetHeight }]}>
        {/* Handle Bar — drag area */}
        <View style={styles.handleBarContainer} {...panResponder.panHandlers}>
          <View style={styles.handleBar} />
        </View>

        <ScrollView
          style={styles.scrollContent}
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Driver Info */}
          <View style={styles.driverSection}>
            <Image source={{ uri: driver.avatar || 'https://via.placeholder.com/100' }} style={styles.driverAvatar} />
            <View style={styles.driverInfo}>
              <Text style={styles.driverName}>{driver.name || 'Đang tải...'}</Text>
              <Text style={styles.carInfo}>{driver.carType} • {driver.licensePlate}</Text>
              <View style={styles.ratingRow}>
                <MaterialIcons name="star" size={14} color="#FFB800" />
                <Text style={styles.ratingText}>{driver.rating}</Text>
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

          {/* Payment Breakdown (hire + deposit) */}
          {isHireWithDeposit && (
            <View style={styles.paymentBreakdown}>
              <View style={styles.paymentBreakdownHeader}>
                <MaterialIcons name="receipt-long" size={16} color="#FF6B00" />
                <Text style={styles.paymentBreakdownTitle}>Thông tin thanh toán</Text>
              </View>
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>💰 Tổng tiền chuyến</Text>
                <Text style={styles.paymentValue}>{(ride.totalFare || 0).toLocaleString('vi-VN')}đ</Text>
              </View>
              {depositPaid && (
                <View style={styles.paymentRow}>
                  <Text style={styles.paymentLabel}>🔒 Đã đặt cọc (trừ từ ví)</Text>
                  <Text style={[styles.paymentValue, { color: '#EF4444' }]}>-{depositAmount.toLocaleString('vi-VN')}đ</Text>
                </View>
              )}
              <View style={[styles.paymentRow, styles.paymentRowTotal]}>
                <Text style={styles.paymentLabelBold}>💳 Còn phải thanh toán</Text>
                <Text style={styles.paymentValueBold}>{remaining.toLocaleString('vi-VN')}đ</Text>
              </View>
            </View>
          )}

          {/* Cancel Button */}
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancelRide}>
            <MaterialIcons name="cancel" size={18} color="#EF4444" />
            <Text style={styles.cancelButtonText}>Hủy chuyến đi</Text>
          </TouchableOpacity>

          <View style={{ height: 20 }} />
        </ScrollView>
      </Animated.View>
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FF6B00',
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
    backgroundColor: '#FF6B00',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 10,
    elevation: 5,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  etaBadge: {
    position: 'absolute',
    top: '40%',
    alignSelf: 'center',
    left: '30%',
    backgroundColor: '#FF6B00',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    zIndex: 10,
    elevation: 8,
  },
  etaInfo: { alignItems: 'center' },
  etaTime: { fontSize: 16, fontWeight: '700', color: '#fff' },
  etaDistance: { fontSize: 12, fontWeight: '500', color: '#fff', opacity: 0.9 },

  // ===== Bottom Sheet =====
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 15,
  },
  handleBarContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handleBar: {
    width: 40,
    height: 5,
    backgroundColor: '#CBD5E0',
    borderRadius: 3,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContainer: {
    paddingBottom: 8,
  },

  // Driver
  driverSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    marginBottom: 16,
  },
  driverAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#FF6B00',
  },
  driverInfo: { flex: 1 },
  driverName: { fontSize: 16, fontWeight: '700', color: '#000', marginBottom: 4 },
  carInfo: { fontSize: 13, color: '#666', marginBottom: 4 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { fontSize: 12, color: '#666' },
  actionButtons: { flexDirection: 'row', gap: 10 },
  chatButton: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#374151',
    justifyContent: 'center', alignItems: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute', top: -4, right: -4,
    backgroundColor: '#EF4444', borderRadius: 10,
    minWidth: 20, height: 20,
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 5, borderWidth: 2, borderColor: '#fff',
  },
  badgeText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  callButton: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#FF6B00',
    justifyContent: 'center', alignItems: 'center',
  },

  // Route
  routeSection: {
    backgroundColor: '#f5f5f5',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: SPACING.lg,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  routeItem: { flexDirection: 'row', marginBottom: 12 },
  routeIconWrapper: { width: 24, alignItems: 'center', marginRight: 12 },
  pickupDot: {
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: '#22C55E', borderWidth: 2, borderColor: '#fff',
  },
  routeLine: { width: 2, height: 30, backgroundColor: '#4B5563', marginTop: 4 },
  routeContent: { flex: 1 },
  routeLabel: { fontSize: 10, fontWeight: '600', color: '#999', marginBottom: 4, letterSpacing: 0.5 },
  routeAddress: { fontSize: 14, fontWeight: '600', color: '#000', marginBottom: 2 },
  routeTime: { fontSize: 12, color: '#FF6B00', fontWeight: '500' },

  // Payment Breakdown
  paymentBreakdown: {
    backgroundColor: '#FFF9F4',
    borderRadius: 14,
    padding: 14,
    marginHorizontal: SPACING.lg,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#FFE0C0',
  },
  paymentBreakdownHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10,
  },
  paymentBreakdownTitle: { fontSize: 13, fontWeight: '700', color: '#FF6B00' },
  paymentRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4,
  },
  paymentRowTotal: {
    borderTopWidth: 1, borderTopColor: '#FFE0C0', marginTop: 6, paddingTop: 8,
  },
  paymentLabel: { fontSize: 13, color: '#555' },
  paymentValue: { fontSize: 13, fontWeight: '600', color: '#222' },
  paymentLabelBold: { fontSize: 14, fontWeight: '700', color: '#222' },
  paymentValueBold: { fontSize: 15, fontWeight: '800', color: '#FF6B00' },

  // Cancel
  cancelButton: {
    marginHorizontal: SPACING.lg,
    height: 52,
    borderRadius: 14,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  cancelButtonText: { fontSize: 15, fontWeight: '700', color: '#EF4444' },

  // Loading
  loadingOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center', alignItems: 'center', zIndex: 9999,
  },
  loadingText: { marginTop: 12, fontSize: 14, color: '#fff', fontWeight: '600' },
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
})
