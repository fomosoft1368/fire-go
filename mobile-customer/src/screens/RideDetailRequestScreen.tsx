import { useState, useEffect, useRef } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Modal,
  Dimensions,
} from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { useSelector } from 'react-redux'
import { useNavigation, useRoute } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RootState } from '../redux/store'
import type { RootStackParamList, NearbyRide } from '../types'
import { COLORS_DARK, COLORS_LIGHT, SPACING, BORDER_RADIUS } from '../constants'
import { combinedTripsService } from '../services/combinedTripsService'
import MapViewComponent from '../components/MapView'

const { height } = Dimensions.get('window')

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mapContainer: {
    height: height * 0.4,
    backgroundColor: '#ddd',
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: SPACING.md,
  },
  driverCard: {
    flexDirection: 'row',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    alignItems: 'center',
  },
  driverAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  driverRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  ratingText: {
    fontSize: 12,
    marginLeft: 4,
  },
  vehicleInfo: {
    fontSize: 12,
    opacity: 0.7,
  },
  routeCard: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  locationIcon: {
    marginRight: SPACING.md,
    marginTop: 2,
  },
  locationText: {
    flex: 1,
    fontSize: 13,
  },
  priceCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
  },
  priceInfo: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 4,
  },
  price: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  distanceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  distanceText: {
    fontSize: 12,
    marginLeft: SPACING.sm,
    opacity: 0.7,
  },
  seatsInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
  },
  seatsLabel: {
    fontSize: 13,
  },
  seatsValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: SPACING.md,
  },
  button: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: SPACING.sm,
  },
  cancelButton: {
    borderWidth: 2,
  },
  confirmButton: {},
  requestingModal: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    width: '80%',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  modalMessage: {
    fontSize: 13,
    opacity: 0.7,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  successIcon: {
    marginBottom: SPACING.md,
  },
  statusBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.md,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
})

type Navigation = NativeStackNavigationProp<RootStackParamList>;

interface RideDetailRequestScreenProps {
  rideId: string;
  ride: NearbyRide;
}

export default function RideDetailRequestScreen() {
  const navigation = useNavigation<Navigation>()
  const route = useRoute()
  const user = useSelector((state: RootState) => state.auth.user)
  const themeMode = useSelector((state: RootState) => state.theme.mode)
  const colors = themeMode === 'dark' ? COLORS_DARK : COLORS_LIGHT

  // Safe params extraction with defaults
  const params = route.params as any
  const combinedTripId = params?.combinedTripId ?? ''
  const ride = params?.ride ?? null
  
  // Get customer's pickup/dropoff coordinates from params (NOT from ride object)
  const pickupCoordinates = params?.pickupCoordinates ?? ride?.pickupCoordinates ?? [105.8542, 21.0285]
  const dropoffCoordinates = params?.dropoffCoordinates ?? ride?.dropoffCoordinates ?? [105.8542, 21.0285]
  const pickupAddress = params?.pickupAddress ?? ride?.pickupAddress ?? ''
  const dropoffAddress = params?.dropoffAddress ?? ride?.dropoffAddress ?? ''

  const [requesting, setRequesting] = useState(false)
  const [requestStatus, setRequestStatus] = useState<'pending' | 'accepted' | 'rejected' | null>(null)
  const statusCheckInterval = useRef<NodeJS.Timeout | null>(null)

  // Validate ride data
  useEffect(() => {
    if (!ride || !combinedTripId) {
      Alert.alert('Lỗi', 'Không thể tải thông tin chuyến xe')
      navigation.goBack()
    }
  }, [])

  useEffect(() => {
    return () => {
      if (statusCheckInterval.current) {
        clearInterval(statusCheckInterval.current)
      }
    }
  }, [])

  const handleRequestRide = async () => {
    if (!user?.id) {
      Alert.alert('Lỗi', 'Vui lòng đăng nhập trước')
      return
    }

    setRequesting(true)
    try {
      console.log('[RideDetailRequestScreen] Creating combined trip request with customer coordinates:', {
        combinedTripId,
        pickupCoordinates,
        dropoffCoordinates,
        pickupAddress,
        dropoffAddress,
      })
      
      // Create combined trip request
      const request = await combinedTripsService.createCombinedTripRequest(
        combinedTripId,
        user.id,
        pickupAddress,
        dropoffAddress,
        pickupCoordinates,
        dropoffCoordinates,
        ride.distance,
        ride.totalFare,
        1
      )

      console.log('Request created:', request._id)
      setRequestStatus('pending')

      // Start polling for status changes
      pollRequestStatus(request._id)

      // Dismiss modal after 3 seconds if not accepted
      setTimeout(() => {
        if (requestStatus === 'pending') {
          setRequesting(false)
          Alert.alert(
            'Yêu cầu gửi thành công',
            'Vui lòng đợi tài xế phản hồi. Bạn có thể tiếp tục sử dụng ứng dụng trong lúc chờ đợi.',
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          )
        }
      }, 3000)
    } catch (error: any) {
      console.error('Error creating request:', error)
      Alert.alert('Lỗi', error.message || 'Không thể gửi yêu cầu. Vui lòng thử lại.')
      setRequesting(false)
    }
  }

  const pollRequestStatus = (requestId: string) => {
    // Poll every 2 seconds
    statusCheckInterval.current = setInterval(async () => {
      try {
        const status = await combinedTripsService.getCombinedTripRequestStatus(combinedTripId, requestId)
        
        console.log('Request status:', status.status)

        if (status.status === 'accepted') {
          setRequestStatus('accepted')
          setRequesting(false)
          clearInterval(statusCheckInterval.current!)

          // Show success and navigate to ride
          setTimeout(() => {
            Alert.alert(
              'Tuyệt vời!',
              'Tài xế đã chấp nhận yêu cầu của bạn!',
              [
                {
                  text: 'Xem chuyến đi',
                  onPress: () => {
                    navigation.navigate('DriverFound', { 
                      combinedTripId: combinedTripId,
                      tripType: 'combined_trip',
                    })
                  },
                },
              ]
            )
          }, 500)
        } else if (status.status === 'rejected') {
          setRequestStatus('rejected')
          setRequesting(false)
          clearInterval(statusCheckInterval.current!)
          Alert.alert(
            'Yêu cầu bị từ chối',
            'Tài xế đã từ chối yêu cầu của bạn. Vui lòng thử tìm chuyến khác.'
          )
        }
      } catch (error) {
        console.error('Error checking status:', error)
      }
    }, 2000)
  }

  const handleCancel = () => {
    if (statusCheckInterval.current) {
      clearInterval(statusCheckInterval.current)
    }
    navigation.goBack()
  }

  // Safe calculation with fallback
  const availableSeats = ride 
    ? (ride.totalSeats || 4) - (ride.customerId?.length || 0)
    : 0

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Map */}
      <View style={styles.mapContainer}>
        {ride && (
          <MapViewComponent
            pickupCoords={{ latitude: ride.pickupCoordinates[1], longitude: ride.pickupCoordinates[0] }}
            dropoffCoords={{ latitude: ride.dropoffCoordinates[1], longitude: ride.dropoffCoordinates[0] }}
          />
        )}
      </View>

      {/* Content */}
      {!ride ? (
        <View style={[styles.contentContainer, { justifyContent: 'center', alignItems: 'center' }]}>
          <MaterialIcons name="error-outline" size={48} color={colors.textSecondary} />
          <Text style={[{ color: colors.text, marginTop: SPACING.md, fontSize: 14 }]}>
            Không thể tải thông tin chuyến xe
          </Text>
        </View>
      ) : (
        <>
          <ScrollView style={styles.contentContainer}>
            {/* Driver Section */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Tài xế</Text>
              <View style={[styles.driverCard, { borderColor: colors.border }]}>
                <View style={[styles.driverAvatar, { backgroundColor: colors.primary }]}>
                  <MaterialIcons name="person" size={32} color="#fff" />
                </View>
                <View style={styles.driverInfo}>
                  <Text style={[styles.driverName, { color: colors.text }]}>
                    {ride.driverId?.firstName || 'Tài'} {ride.driverId?.lastName || 'xế'}
                  </Text>
                  <View style={styles.driverRating}>
                    <MaterialIcons name="star" size={14} color="#FFB800" />
                    <Text style={[styles.ratingText, { color: colors.text }]}>
                      {(ride.driverId?.averageRating || ride.driverId?.rating || 5).toFixed(1)} ({ride.driverId?.totalReviews || 0} đánh giá)
                    </Text>
                  </View>
                  <Text style={[styles.vehicleInfo, { color: colors.textSecondary }]}>
                    {ride.driverId?.vehicleModel || 'Xe'} • {ride.driverId?.vehiclePlate || 'N/A'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Route Section */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Tuyến đường</Text>
              <View style={[styles.routeCard, { borderColor: colors.border }]}>
                <View style={styles.locationRow}>
                  <View style={styles.locationIcon}>
                    <MaterialIcons name="location-on" size={18} color="#4CAF50" />
                  </View>
                  <Text style={[styles.locationText, { color: colors.text }]}>
                    {ride.pickupAddress}
                  </Text>
                </View>
                <View style={styles.locationRow}>
                  <View style={styles.locationIcon}>
                    <MaterialIcons name="location-on" size={18} color="#F44336" />
                  </View>
                  <Text style={[styles.locationText, { color: colors.text }]}>
                    {ride.dropoffAddress}
                  </Text>
                </View>
              </View>
            </View>

            {/* Details Section */}
            <View style={styles.section}>
              {/* Price */}
              <View style={[styles.priceCard, { borderColor: colors.border, marginBottom: SPACING.md }]}>
                <View style={styles.priceInfo}>
                  <Text style={[styles.priceLabel, { color: colors.textSecondary }]}>Giá dự kiến</Text>
                  <Text style={[styles.price, { color: colors.primary }]}>
                    ₫{ride.totalFare.toLocaleString()}
                  </Text>
                </View>
                <View style={styles.distanceInfo}>
                  <MaterialIcons name="directions" size={16} color={colors.primary} />
                  <Text style={[styles.distanceText, { color: colors.textSecondary }]}>
                    {(ride.distance || 5).toFixed(1)} km
                  </Text>
                </View>
              </View>

              {/* Seats */}
              <View style={[styles.seatsInfo, { borderColor: colors.border }]}>
                <Text style={[styles.seatsLabel, { color: colors.textSecondary }]}>Ghế trống</Text>
                <Text style={[styles.seatsValue, { color: colors.primary }]}>
                  {availableSeats} / {ride.totalSeats || 4}
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton, { borderColor: colors.text }]}
              onPress={handleCancel}
              disabled={requesting}
            >
              <MaterialIcons name="close" size={20} color={colors.text} />
              <Text style={[styles.buttonText, { color: colors.text }]}>Hủy</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.confirmButton, { backgroundColor: colors.primary }]}
              onPress={handleRequestRide}
              disabled={requesting || availableSeats <= 0}
              activeOpacity={0.7}
            >
              {requesting ? (
                <ActivityIndicator color="#fff" size={20} />
              ) : (
                <>
                  <MaterialIcons name="check-circle" size={20} color="#fff" />
                  <Text style={[styles.buttonText, { color: '#fff' }]}>
                    Yêu cầu tham gia
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Requesting Modal */}
      <Modal visible={requesting && requestStatus === 'pending'} transparent>
        <View style={styles.requestingModal}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.bg, borderColor: colors.border },
            ]}
          >
            <ActivityIndicator color={colors.primary} size={40} />
            <Text style={[styles.modalTitle, { color: colors.text }]}>Đang gửi yêu cầu</Text>
            <Text style={[styles.modalMessage, { color: colors.textSecondary }]}>
              Vui lòng chờ tài xế phản hồi yêu cầu của bạn...
            </Text>
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal visible={requesting && requestStatus === 'accepted'} transparent>
        <View style={styles.requestingModal}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.bg, borderColor: colors.border },
            ]}
          >
            <MaterialIcons name="check-circle" size={40} color={colors.primary} />
            <Text style={[styles.modalTitle, { color: colors.text }]}>Yêu cầu được chấp nhận!</Text>
            <Text style={[styles.modalMessage, { color: colors.textSecondary }]}>
              Tài xế {ride?.driverId?.firstName} đã chấp nhận yêu cầu của bạn
            </Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

