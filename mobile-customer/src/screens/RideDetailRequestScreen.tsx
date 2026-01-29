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
  StatusBar,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { MaterialIcons } from '@expo/vector-icons'
import { useSelector } from 'react-redux'
import { useNavigation, useRoute } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RootState } from '../redux/store'
import type { RootStackParamList, NearbyRide } from '../types'
import { COLORS_DARK, COLORS_LIGHT, SPACING, BORDER_RADIUS } from '../constants'
import { combinedTripsService } from '../services/combinedTripsService'
import { rideService } from '../services/rideService'
import MapViewComponent from '../components/MapView'

const { height, width } = Dimensions.get('window')

type Navigation = NativeStackNavigationProp<RootStackParamList>

interface RideDetailRequestScreenProps {
  rideId: string
  ride: NearbyRide
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
  const dropoffCoordinates = params?.dropoffCoordinates ?? [105.8542, 21.0285]
  const pickupAddress = params?.pickupAddress ?? ride?.pickupAddress ?? ''
  const dropoffAddress = params?.dropoffAddress ?? ride?.dropoffAddress ?? ''

  const [requesting, setRequesting] = useState(false)
  const [requestStatus, setRequestStatus] = useState<'pending' | 'accepted' | 'rejected' | null>(null)
  const [selectedSeats, setSelectedSeats] = useState<number[]>([])
  const [customerFare, setCustomerFare] = useState<number | null>(null)
  const [customerDistance, setCustomerDistance] = useState<number | null>(null)
  const [calculatingFare, setCalculatingFare] = useState(false)
  const statusCheckInterval = useRef<NodeJS.Timeout | null>(null)

  // Validate ride data
  useEffect(() => {
    if (!ride || !combinedTripId) {
      Alert.alert('Lỗi', 'Không thể tải thông tin chuyến xe')
      navigation.goBack()
    }
  }, [])

  // Calculate customer's fare based on their pickup/dropoff locations
  useEffect(() => {
    const calculateCustomerFare = async () => {
      try {
        setCalculatingFare(true)
        console.log('[RideDetailRequestScreen] Calculating customer fare:', {
          pickup: pickupCoordinates,
          dropoff: dropoffCoordinates,
        })

        // Get route from customer's pickup to dropoff
        const directions = await rideService.getDirections(
          pickupCoordinates[0],
          pickupCoordinates[1],
          dropoffCoordinates[0],
          dropoffCoordinates[1],
        )

        // Extract distance and duration
        let distance = 0
        let duration = 0

        if (directions.features?.[0]) {
          const feature = directions.features[0]
          if (feature.properties?.summary) {
            distance = feature.properties.summary.distance
            duration = feature.properties.summary.duration
          }
        } else if (directions.distance !== undefined) {
          distance = directions.distance
          duration = directions.duration
        }

        // Convert to km if needed
        const distanceKm = distance > 500 ? distance / 1000 : distance
        setCustomerDistance(distanceKm)

        // Calculate fare
        const fareEstimate = await rideService.calculateFare(
          distanceKm,
          duration / 60,
          'basic'
        )

        const calculatedFare = fareEstimate?.totalFare || fareEstimate?.total || 0
        setCustomerFare(calculatedFare)

        console.log('[RideDetailRequestScreen] Customer fare calculated:', {
          distance: distanceKm,
          duration: duration / 60,
          fare: calculatedFare,
        })
      } catch (error) {
        console.error('[RideDetailRequestScreen] Error calculating fare:', error)
        // Fallback to ride totalFare if calculation fails
        setCustomerFare(ride?.totalFare || 0)
      } finally {
        setCalculatingFare(false)
      }
    }

    if (pickupCoordinates && dropoffCoordinates && ride) {
      calculateCustomerFare()
    }
  }, [pickupCoordinates, dropoffCoordinates, ride])

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
        customerFare,
        customerDistance,
      })

      // Use calculated customer fare, not driver's total fare
      const fareToUse = customerFare || ride.totalFare
      const distanceToUse = customerDistance || ride.distance

      // Create combined trip request
      const request = await combinedTripsService.createCombinedTripRequest(
        combinedTripId,
        user.id,
        pickupAddress,
        dropoffAddress,
        pickupCoordinates,
        dropoffCoordinates,
        distanceToUse,
        fareToUse * selectedSeats.length,
        selectedSeats.length
      )

      console.log('✅ Request created:', request._id)
      console.log('📤 Request sent to driver ID:', ride.driverId?._id || ride.driverId)
      console.log('👤 Driver name:', ride.driverId?.firstName, ride.driverId?.lastName)
      console.log('🚗 Combined Trip ID:', combinedTripId)
      console.log('📋 Full request data:', JSON.stringify(request, null, 2))
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
        } else if (status.status === 'rejected' || status.status === 'deleted') {
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
  const availableSeats = ride ? (ride.totalSeats || 4) - (ride.customerId?.length || 0) : 0

  // Car seats layout (4 seats total)
  const occupiedSeats = ride?.customerId?.length || 0
  const getSeatsState = () => {
    const seats = []
    for (let i = 0; i < 4; i++) {
      if (i < occupiedSeats) {
        seats.push('occupied')
      } else {
        seats.push('available')
      }
    }
    return seats
  }

  const seatsState = getSeatsState()

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={themeMode === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />

      {!ride ? (
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={48} color={colors.textSecondary} />
          <Text style={[styles.errorText, { color: colors.text }]}>Không thể tải thông tin chuyến xe</Text>
        </View>
      ) : (
        <>
          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Map Hero Section with Top App Bar Overlay */}
            <View style={styles.mapHero}>
              
              <MapViewComponent
                height={height * 0.35}
                pickupCoords={{ latitude: pickupCoordinates[1], longitude: pickupCoordinates[0] }}
                dropoffCoords={{ latitude: dropoffCoordinates[1], longitude: dropoffCoordinates[0] }}
              />
              
              {/* Gradient Overlay Bottom - Fade from transparent to BG color */}
              <LinearGradient
                colors={['transparent', colors.bg]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.mapGradientBottom}
              />
              
              {/* Fixed Top App Bar - Overlay on Map */}
              <View style={[styles.topAppBar, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
                <TouchableOpacity onPress={handleCancel} style={styles.backButtonTopBar}>
                  <MaterialIcons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.topBarTitle}>Chi tiết chuyến đi</Text>
                <View style={{ width: 40 }} />
              </View>
            </View>

            {/* Content Below Map */}
            <View style={[styles.contentWrapper, { backgroundColor: colors.bg }]}>
              {/* Driver Section - Simple Layout */}
              <View style={[styles.driverSection, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}>
                <View style={styles.driverRow}>
                  <View style={styles.driverAvatarContainer}>
                    <View style={[styles.driverAvatar, { backgroundColor: '#53d22d' }]}>
                      <MaterialIcons name="person" size={28} color="black" />
                    </View>
                    <View style={styles.verifiedBadge}>
                      <MaterialIcons name="verified" size={10} color="black" />
                    </View>
                  </View>
                  <View style={styles.driverDetails}>
                    <View style={styles.driverHeaderRow}>
                      <Text style={[styles.driverName, { color: colors.text }]}>
                        {ride.driverId?.firstName || 'Tài'} {ride.driverId?.lastName || 'xế'}
                      </Text>
                    </View>
                    <View style={styles.ratingRow}>
                      <MaterialIcons name="star" size={14} color="#FFB800" />
                      <Text style={[styles.ratingValue, { color: colors.text }]}>
                        {(ride.driverId?.averageRating || ride.driverId?.rating || 5).toFixed(1)}
                      </Text>
                      <Text style={[styles.ratingCount, { color: colors.textSecondary }]}>
                        ({ride.driverId?.totalReviews || 0})
                      </Text>
                    </View>
                    <Text style={[styles.vehicleText, { color: colors.textSecondary }]}>
                      {ride.driverId?.vehicleModel || 'Xe'} • {ride.driverId?.vehiclePlate || 'N/A'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Timeline Section */}
              <View style={[styles.timelineSection, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}>
                <View style={styles.timelineContainer}>
                  {/* Pickup Point */}
                  <View style={styles.timelineRow}>
                    <View style={styles.timelineLeft}>
                      <View style={[styles.timelineDot, { backgroundColor: '#53d22d' }]} />
                      <View style={[styles.timelineLine, { backgroundColor: '#53d22d' }]} />
                    </View>
                    <View style={styles.timelineContent}>
                      <Text style={[styles.timelineTime, { color: '#53d22d' }]}>08:00 • Đón khách</Text>
                      <Text style={[styles.timelineAddress, { color: colors.text }]} numberOfLines={2}>
                        {pickupAddress}
                      </Text>
                    </View>
                  </View>

                  {/* Dropoff Point */}
                  <View style={styles.timelineRow}>
                    <View style={styles.timelineLeft}>
                      <MaterialIcons name="location-on" size={24} color={colors.textSecondary} />
                    </View>
                    <View style={styles.timelineContent}>
                      <Text style={[styles.timelineTime, { color: colors.textSecondary }]}>10:30 • Trả khách</Text>
                      <Text style={[styles.timelineAddress, { color: colors.text }]} numberOfLines={2}>
                        {dropoffAddress}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

            {/* Seat Selection - Car Layout */}
              <View style={[styles.seatSection, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}>
                <View style={styles.seatHeaderSimple}>
                  <Text style={[styles.seatTitleSimple, { color: colors.text }]}>Chọn ghế ngồi</Text>
                  <View style={styles.seatsAvailableBadge}>
                    <Text style={styles.seatsAvailableText}>{availableSeats} ghế trống</Text>
                  </View>
                </View>

                {/* Car Layout Visualization */}
                <View style={[styles.carLayout, { backgroundColor: colors.bgSecondary }]}>
                  {/* Steering Wheel */}
                  <View style={styles.steeringWheel}>
                    <MaterialIcons name="directions-car" size={28} color={colors.textSecondary + '4D'} />
                  </View>

                  {/* Seats Grid */}
                  <View style={styles.seatsContainer}>
                    {/* Row 1 - Passenger Seat (Single) */}
                    <View style={styles.seatsRow}>
                      <View style={{ width: 48 }} /> {/* Empty space for driver side */}
                      <TouchableOpacity
                        disabled={seatsState[0] === 'occupied'}
                        onPress={() => {
                          if (selectedSeats.includes(0)) {
                            setSelectedSeats(selectedSeats.filter(s => s !== 0))
                          } else {
                            setSelectedSeats([...selectedSeats, 0])
                          }
                        }}
                        style={[
                          styles.seatButtonCar,
                          {
                            backgroundColor:
                              seatsState[0] === 'occupied'
                                ? colors.border
                                : selectedSeats.includes(0)
                                  ? '#53d22d'
                                  : 'transparent',
                            borderColor:
                              seatsState[0] === 'occupied'
                                ? colors.border
                                : selectedSeats.includes(0)
                                  ? '#53d22d'
                                  : colors.border,
                          },
                        ]}
                      >
                        <MaterialIcons
                          name={seatsState[0] === 'occupied' ? 'person' : selectedSeats.includes(0) ? 'check' : 'chair'}
                          size={20}
                          color={seatsState[0] === 'occupied' ? colors.textSecondary : selectedSeats.includes(0) ? 'black' : colors.textSecondary}
                        />
                      </TouchableOpacity>
                    </View>

                    {/* Row 2 - Back Left and Back Right */}
                    <View style={styles.seatsRow}>
                      <TouchableOpacity
                        disabled={seatsState[1] === 'occupied'}
                        onPress={() => {
                          if (selectedSeats.includes(1)) {
                            setSelectedSeats(selectedSeats.filter(s => s !== 1))
                          } else {
                            setSelectedSeats([...selectedSeats, 1])
                          }
                        }}
                        style={[
                          styles.seatButtonCar,
                          {
                            backgroundColor:
                              seatsState[1] === 'occupied'
                                ? colors.border
                                : selectedSeats.includes(1)
                                  ? '#53d22d'
                                  : 'transparent',
                            borderColor:
                              seatsState[1] === 'occupied'
                                ? colors.border
                                : selectedSeats.includes(1)
                                  ? '#53d22d'
                                  : colors.border,
                          },
                        ]}
                      >
                        <MaterialIcons
                          name={seatsState[1] === 'occupied' ? 'person' : selectedSeats.includes(1) ? 'check' : 'chair'}
                          size={20}
                          color={seatsState[1] === 'occupied' ? colors.textSecondary : selectedSeats.includes(1) ? 'black' : colors.textSecondary}
                        />
                      </TouchableOpacity>

                      <TouchableOpacity
                        disabled={seatsState[2] === 'occupied'}
                        onPress={() => {
                          if (selectedSeats.includes(2)) {
                            setSelectedSeats(selectedSeats.filter(s => s !== 2))
                          } else {
                            setSelectedSeats([...selectedSeats, 2])
                          }
                        }}
                        style={[
                          styles.seatButtonCar,
                          {
                            backgroundColor:
                              seatsState[2] === 'occupied'
                                ? colors.border
                                : selectedSeats.includes(2)
                                  ? '#53d22d'
                                  : 'transparent',
                            borderColor:
                              seatsState[2] === 'occupied'
                                ? colors.border
                                : selectedSeats.includes(2)
                                  ? '#53d22d'
                                  : colors.border,
                          },
                        ]}
                      >
                        <MaterialIcons
                          name={seatsState[2] === 'occupied' ? 'person' : selectedSeats.includes(2) ? 'check' : 'chair'}
                          size={20}
                          color={seatsState[2] === 'occupied' ? colors.textSecondary : selectedSeats.includes(2) ? 'black' : colors.textSecondary}
                        />
                      </TouchableOpacity>

                      <TouchableOpacity
                        disabled={seatsState[3] === 'occupied'}
                        onPress={() => {
                          if (selectedSeats.includes(3)) {
                            setSelectedSeats(selectedSeats.filter(s => s !== 3))
                          } else {
                            setSelectedSeats([...selectedSeats, 3])
                          }
                        }}
                        style={[
                          styles.seatButtonCar,
                          {
                            backgroundColor:
                              seatsState[3] === 'occupied'
                                ? colors.border
                                : selectedSeats.includes(3)
                                  ? '#53d22d'
                                  : 'transparent',
                            borderColor:
                              seatsState[3] === 'occupied'
                                ? colors.border
                                : selectedSeats.includes(3)
                                  ? '#53d22d'
                                  : colors.border,
                          },
                        ]}
                      >
                        <MaterialIcons
                          name={seatsState[3] === 'occupied' ? 'person' : selectedSeats.includes(3) ? 'check' : 'chair'}
                          size={20}
                          color={seatsState[3] === 'occupied' ? colors.textSecondary : selectedSeats.includes(3) ? 'black' : colors.textSecondary}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                {/* Legend */}
                <View style={styles.seatLegend}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { borderColor: colors.border }]} />
                    <Text style={[styles.legendText, { color: colors.textSecondary }]}>Trống</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#53d22d' }]} />
                    <Text style={[styles.legendText, { color: colors.text }]}>Đang chọn</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: colors.border }]} />
                    <Text style={[styles.legendText, { color: colors.textSecondary }]}>Đã đặt</Text>
                  </View>
                </View>
              </View>

              {/* Insurance / Policy Card */}
              <View style={[styles.policyCard, { backgroundColor: '#53d22d' + '15', borderColor: '#53d22d' + '30' }]}>
                <MaterialIcons name="shield" size={24} color="#53d22d" style={{ marginTop: 2 }} />
                <View style={styles.policyContent}>
                  <Text style={[styles.policyTitle, { color: colors.text }]}>Bảo hiểm chuyến đi</Text>
                  <Text style={[styles.policyText, { color: colors.textSecondary }]}>
                    Chuyến đi của bạn được bảo hiểm trọn gói bởi FireGo Care. An tâm trên mọi nẻo đường.
                  </Text>
                </View>
              </View>

              {/* Spacer for footer */}
              <View style={{ height: SPACING.xl }} />
            </View>
          </ScrollView>

          {/* Sticky Footer */}
          <View style={[styles.footer, { backgroundColor: colors.bgSecondary, borderTopColor: colors.border }]}>
            <View style={styles.priceSection}>
              <Text style={[styles.priceLabel, { color: colors.textSecondary }]}>Tổng cộng ({selectedSeats.length} ghế)</Text>
              <View style={styles.priceValue}>
                {calculatingFare ? (
                  <ActivityIndicator size="small" color="#53d22d" />
                ) : (
                  <Text style={[styles.price, { color: colors.text }]}>
                    ₫{((customerFare || ride.totalFare) * (selectedSeats.length || 1)).toLocaleString()}
                  </Text>
                )}
              </View>
            </View>
            <TouchableOpacity
              style={[styles.bookButton, { backgroundColor: '#53d22d' }]}
              onPress={handleRequestRide}
              disabled={requesting || availableSeats <= 0 || calculatingFare || selectedSeats.length === 0}
            >
              {requesting ? (
                <ActivityIndicator color="black" size={20} />
              ) : (
                <>
                  <Text style={styles.bookButtonText}>Đặt chỗ ngay</Text>
                  <MaterialIcons name="arrow-forward" size={20} color="black" />
                </>
              )}
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Requesting Modal */}
      <Modal visible={requesting && requestStatus === 'pending'} transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.bgSecondary }]}>
            <ActivityIndicator color="#53d22d" size={40} />
            <Text style={[styles.modalTitle, { color: colors.text }]}>Đang gửi yêu cầu</Text>
            <Text style={[styles.modalMessage, { color: colors.textSecondary }]}>
              Vui lòng chờ tài xế phản hồi yêu cầu của bạn...
            </Text>
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal visible={requesting && requestStatus === 'accepted'} transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.bgSecondary }]}>
            <MaterialIcons name="check-circle" size={40} color="#53d22d" />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
  },
  errorText: {
    fontSize: 14,
    marginTop: SPACING.md,
  },
  scrollContent: {
    flex: 1,
  },
  mapHero: {
    height: height * 0.35,
    position: 'relative',
  },
  mapGradientBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 250,
  },
  topAppBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 60,
    zIndex: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
  },
  backButtonTopBar: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  contentWrapper: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    marginTop: -16,
  },
  driverSection: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
  },
  driverAvatarContainer: {
    position: 'relative',
  },
  driverAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#53d22d',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#53d22d',
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverDetails: {
    flex: 1,
  },
  driverHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: SPACING.sm,
  },
  driverName: {
    fontSize: 15,
    fontWeight: '700',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  ratingValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  ratingCount: {
    fontSize: 11,
  },
  vehicleText: {
    fontSize: 12,
  },
  timelineSection: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  timelineContainer: {
    gap: 0,
  },
  timelineRow: {
    flexDirection: 'row',
    marginBottom: SPACING.lg,
  },
  timelineLeft: {
    width: 40,
    alignItems: 'center',
    paddingRight: SPACING.md,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
  },
  timelineLine: {
    width: 2,
    minHeight: 40,
    marginVertical: 4,
  },
  timelineContent: {
    flex: 1,
    paddingTop: 2,
  },
  timelineTime: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  timelineAddress: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  locationSection: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.md,
    overflow: 'hidden',
  },
  locationItem: {
    flexDirection: 'row',
    padding: SPACING.lg,
    alignItems: 'flex-start',
    gap: SPACING.md,
  },
  locationIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.8,
  },
  locationContent: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  locationAddress: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  locationDivider: {
    height: 1,
    marginHorizontal: SPACING.lg,
  },
  seatSection: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  seatHeaderSimple: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  seatTitleSimple: {
    fontSize: 15,
    fontWeight: '700',
  },
  seatsAvailableBadge: {
    backgroundColor: '#53d22d' + '20',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: 6,
  },
  seatsAvailableText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#53d22d',
  },
  carLayout: {
    borderRadius: 32,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xl,
    marginBottom: SPACING.lg,
    alignItems: 'center',
  },
  steeringWheel: {
    opacity: 0.3,
    marginBottom: SPACING.lg,
  },
  seatsContainer: {
    width: '100%',
  },
  seatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    gap: SPACING.md,
  },
  seatButtonCar: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  seatLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.xl,
    paddingTop: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    borderWidth: 1,
  },
  legendText: {
    fontSize: 11,
    fontWeight: '500',
  },
  policyCard: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
    gap: SPACING.md,
    alignItems: 'flex-start',
  },
  policyContent: {
    flex: 1,
  },
  policyTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: SPACING.xs,
  },
  policyText: {
    fontSize: 12,
    lineHeight: 18,
  },
  seatGridSimple: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  seatButtonSimple: {
    width: '23%',
    aspectRatio: 1,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  footer: {
    borderTopWidth: 1,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    paddingBottom: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.lg,
  },
  priceSection: {
    flex: 0.5,
  },
  priceLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  priceValue: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  price: {
    fontSize: 20,
    fontWeight: '700',
  },
  bookButton: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  bookButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: 'black',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
    width: '80%',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  modalMessage: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: SPACING.md,
  },
})

