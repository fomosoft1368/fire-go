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
import { COLORS } from '../constants'

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
            >
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
                />
              )}
            </MapView>

            {/* Header Controls */}
            <View style={styles.mapControls}>
              <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
                <MaterialIcons name="arrow-back" size={24} color={COLORS.text} />
              </TouchableOpacity>
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
                      <Text style={styles.customerName}>{requestingCustomer?.name || requestingCustomer?.firstName || 'Khách hàng'}</Text>
                      <Text style={styles.customerPhone}>{requestingCustomer?.phone || 'N/A'}</Text>
                      <View style={styles.ratingRow}>
                        <MaterialIcons name="star" size={14} color="#FFD700" />
                        <Text style={styles.ratingText}>{requestingCustomer?.rating || 5}⭐</Text>
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
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
