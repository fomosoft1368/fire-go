import { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { useSelector } from 'react-redux'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { RootState } from '../redux/store'
import { COLORS } from '../constants'
import { API_BASE_URL } from '../constants/config'
import MapViewComponent from '../components/MapView'
import { BackButton } from '../components'

interface RideDetailScreenProps {
  navigation: any
  route: any
}

export default function RideDetailScreen({ navigation, route }: RideDetailScreenProps) {
  const { user } = useSelector((state: RootState) => state.auth)
  const [ride, setRide] = useState<any>(null)
  const [updating, setUpdating] = useState(false)
  const [currentLocation, setCurrentLocation] = useState<[number, number] | null>(null)
  const [requestingCustomer, setRequestingCustomer] = useState<any>(null)

  // Lấy ride ID từ route params
  const rideId = route?.params?.rideId

  // Fetch ride detail từ API
  useEffect(() => {
    if (!rideId) return
    fetchRideDetail()
  }, [rideId])



  const fetchRideDetail = async () => {
    try {
      console.log('🚗 Fetching ride detail from:', `${API_BASE_URL}/rides/${rideId}`)
      const response = await fetch(`${API_BASE_URL}/rides/${rideId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (!data || !data._id) {
        throw new Error('Invalid ride data received')
      }

      setRide(data)
    } catch (error: any) {
      Alert.alert('Lỗi', `Không thể tải chi tiết chuyến đi: ${error.message}`)
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
              const response = await fetch(`${API_BASE_URL}/rides/${rideId}`, {
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
              const response = await fetch(`${API_BASE_URL}/rides/${rideId}`, {
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

  const handleAcceptRide = async () => {
    if (!user || !user.id) {
      Alert.alert('Lỗi', 'Không tìm thấy thông tin tài xế. Vui lòng đăng nhập lại.')
      return
    }

    setUpdating(true)
    try {
      // Get token from AsyncStorage
      const token = await AsyncStorage.getItem('token')
      if (!token) {
        throw new Error('Không tìm thấy token. Vui lòng đăng nhập lại.')
      }

      console.log('🚗 Accepting ride:', { rideId, driverId: user.id })
      console.log('🔑 Using token:', token.substring(0, 20) + '...')

      const response = await fetch(`${API_BASE_URL}/rides/${rideId}/accept`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ driverId: user.id }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || `Failed: ${response.status}`)
      }

      const updated = await response.json()
      setRide(updated)

      // Navigate to TripActivities after successfully accepting
      navigation.navigate('TripActivities', { rideId, isEdit: false })
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể nhận chuyến đi')
    } finally {
      setUpdating(false)
    }
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
              const response = await fetch(`${API_BASE_URL}/rides/${rideId}`, {
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
      const response = await fetch(`${API_BASE_URL}/rides/${rideId}/add-passenger`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: requestingCustomer._id }),
      })
      if (!response.ok) throw new Error(`Failed: ${response.status}`)
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể thêm khách hàng')
    } finally {
      setUpdating(false)
    }
  }


  return (
    <View style={styles.container}>
      <View style={StyleSheet.absoluteFillObject}>
        <MapViewComponent height={100} />
      </View>
      <View style={styles.header}>
        <BackButton color="#FF6B00" elevated />
        <Text style={styles.logoText}>firego</Text>
      </View>
      <View style={styles.card}>
        <View style={styles.handleBarContainer}>
          <View style={styles.handleBar} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          style={styles.cardContent}
          contentContainerStyle={styles.cardContentContainer}
        >
          {/* Trip Header */}
          <View style={styles.tripHeader}>
            <View style={styles.tripHeaderLeft}>
              <Text style={styles.tripTitle}>Yêu cầu chuyến đi</Text>
              <Text style={styles.tripCode}>#{ride?._id?.substring(0, 8) || '...'}</Text>
            </View>
            <View style={styles.statusBadge}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Chờ nhận</Text>
            </View>
          </View>

          {/* Distance to Pickup */}
          <View style={styles.distanceToPickupCard}>
            <View style={styles.distanceToPickupLeft}>
              <MaterialIcons name="navigation" size={24} color="#FF6B00" />
              <View style={styles.distanceToPickupInfo}>
                <Text style={styles.distanceToPickupLabel}>Khoảng cách đến điểm đón</Text>
                <Text style={styles.distanceToPickupValue}>2.3 km • 8 phút</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.navigationButton}>
              <MaterialIcons name="directions" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Trip Details */}
          <View style={styles.tripDetailsSection}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="info-outline" size={20} color="#9CA3AF" />
              <Text style={styles.sectionTitle}>Chi tiết chuyến đi</Text>
            </View>
            <View style={styles.detailsGrid}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Giá cước</Text>
                <Text style={styles.detailValue}>{ride?.price}đ</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Khoảng cách</Text>
                <Text style={styles.detailValue}>8.5 km</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Thời gian</Text>
                <Text style={styles.detailValue}>25 phút</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Thanh toán</Text>
                <Text style={styles.detailValue}>Tiền mặt</Text>
              </View>
            </View>
          </View>

          {/* Route Section */}
          <View style={styles.routeSection}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="route" size={20} color="#9CA3AF" />
              <Text style={styles.sectionTitle}>Lộ trình</Text>
            </View>

            <View style={styles.locationItem}>
              <View style={styles.locationIconWrapper}>
                <View style={styles.pickupDot} />
                <View style={styles.routeLine} />
              </View>
              <View style={styles.locationContent}>
                <Text style={styles.locationLabel}>Điểm đón</Text>
                <Text style={styles.locationAddress}>
                  {ride?.pickupAddress || 'Đang tải...'}
                </Text>
              </View>
            </View>

            <View style={styles.locationItem}>
              <View style={styles.locationIconWrapper}>
                <MaterialIcons name="location-on" size={20} color="#EF4444" />
              </View>
              <View style={styles.locationContent}>
                <Text style={styles.locationLabel}>Điểm trả</Text>
                <Text style={styles.locationAddress}>
                  {ride?.dropoffAddress || 'Đang tải...'}
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={styles.rejectButton}
            onPress={handleCancelRide}
            disabled={updating}
          >
            <MaterialIcons name="close" size={20} color="#EF4444" />
            <Text style={styles.rejectButtonText}>Từ chối</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.acceptButton, updating && styles.acceptButtonDisabled]}
            onPress={handleAcceptRide}
            disabled={updating}
          >
            {updating ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <>
                <MaterialIcons name="check-circle" size={20} color="#000" />
                <Text style={styles.acceptButtonText}>Nhận cuốc</Text>
              </>
            )}
          </TouchableOpacity>
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
    zIndex: 10,
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
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 15,
    maxHeight: '70%',
  },
  cardContent: {
    flex: 1,
  },
  cardContentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  handleBarContainer: {
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 12,
  },
  handleBar: {
    width: 40,
    height: 5,
    backgroundColor: '#4B5563',
    borderRadius: 3,
  },
  // Trip Header
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  tripHeaderLeft: {
    flex: 1,
  },
  tripTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  tripCode: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#374151',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFB800',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  // Distance to Pickup Card
  distanceToPickupCard: {
    backgroundColor: '#374151',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#4B5563',
  },
  distanceToPickupLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  distanceToPickupInfo: {
    marginLeft: 12,
    flex: 1,
  },
  distanceToPickupLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  distanceToPickupValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  navigationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF6B00',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  // Trip Details Section
  tripDetailsSection: {
    marginBottom: 16,
  },
  detailsGrid: {
    backgroundColor: '#374151',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    borderWidth: 1,
    borderColor: '#4B5563',
  },
  detailItem: {
    width: '47%',
  },
  detailLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  // Route Section
  routeSection: {
    backgroundColor: '#374151',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#4B5563',
  },
  locationItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  locationIconWrapper: {
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
  locationContent: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
    marginBottom: 4,
  },
  locationAddress: {
    fontSize: 14,
    color: '#fff',
    lineHeight: 20,
  },
  // Action Container
  actionContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#374151',
    backgroundColor: '#1a202c',
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#EF4444',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  rejectButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#EF4444',
  },
  acceptButton: {
    flex: 2,
    flexDirection: 'row',
    backgroundColor: '#FF6B00',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  acceptButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
  },
  acceptButtonDisabled: {
    opacity: 0.6,
  },
})
