import { useState, useEffect } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  FlatList,
  Modal,
} from 'react-native'
import { useRoute } from '@react-navigation/native'
import { MaterialIcons } from '@expo/vector-icons'
import { COLORS } from '../constants/colors'
import MapViewComponent from '../components/MapView'
import { rideService } from '../services/rideService'
import { authService } from '../services/authService'
import type { CreateRideDto } from '../types'

const RideBookingScreen = ({ navigation }: any) => {
  const route = useRoute()
  const params = route.params as any

  // Validate params with fallbacks
  const distance = params?.distance ?? 0
  const duration = params?.duration ?? 0
  const startLng = params?.startLng ?? 0
  const startLat = params?.startLat ?? 0
  const endLng = params?.endLng ?? 0
  const endLat = params?.endLat ?? 0
  const pickupAddress = params?.pickupAddress ?? 'Unknown'
  const dropoffAddress = params?.dropoffAddress ?? 'Unknown'

  console.log('[RideBookingScreen] Received params:', {
    distance,
    duration,
    startLng,
    startLat,
    endLng,
    endLat,
    pickupAddress,
    dropoffAddress,
  })

  // State
  const [selectedVehicleType, setSelectedVehicleType] = useState('basic')
  const [fare, setFare] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [findingDrivers, setFindingDrivers] = useState(false)
  const [nearbyDrivers, setNearbyDrivers] = useState<any[]>([])
  const [bookingLoading, setBookingLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [showDriverModal, setShowDriverModal] = useState(false)

  // Calculate fare when vehicle type changes
  useEffect(() => {
    calculateFare()
  }, [selectedVehicleType])

  // Initial fare calculation
  useEffect(() => {
    calculateFare()
  }, [])

  const calculateFare = async () => {
    try {
      setErrorMessage('')

      // Chuyển duration từ giây sang phút
      const durationMinutes = Math.ceil(duration / 60)

      console.log('[RideBooking] Calculating fare:', {
        distance,
        durationMinutes,
        vehicleType: selectedVehicleType,
      })

      const result = await rideService.calculateFare(
        distance,
        durationMinutes,
        selectedVehicleType,
      )

      setFare(result)
      setLoading(false)
    } catch (error: any) {
      console.error('Calculate fare error:', error)
      setErrorMessage(error.message || 'Lỗi tính giá')
      setLoading(false)
    }
  }

  const findNearbyDrivers = async () => {
    try {
      setFindingDrivers(true)
      setErrorMessage('')

      const drivers = await rideService.findNearbyDrivers(
        startLat,
        startLng,
        5,
        selectedVehicleType,
        10,
      )

      setNearbyDrivers(Array.isArray(drivers) ? drivers : [])
      setShowDriverModal(true)
    } catch (error: any) {
      console.error('Find drivers error:', error)
      setErrorMessage(error.message)
    } finally {
      setFindingDrivers(false)
    }
  }

  const bookRide = async () => {
    try {
      if (!fare) {
        setErrorMessage('Fare calculation failed')
        console.error('[RideBookingScreen] No fare available')
        return
      }

      setBookingLoading(true)

      console.log('[RideBookingScreen] Navigating to FindingRideScreen with params:', {
        pickupAddress,
        dropoffAddress,
        distance,
        duration,
        startLng,
        startLat,
      })

      // Navigate to FindingRideScreen to see available rides
      navigation.replace('FindingRideScreen', {
        pickupAddress,
        dropoffAddress,
        distance,
        duration,
        startLng,
        startLat,
        endLng,
        endLat,
      })

      setBookingLoading(false)
    } catch (error: any) {
      console.error('[RideBookingScreen] Navigation error:', error)
      setErrorMessage(error.message || 'Failed to navigate')
      setBookingLoading(false)
    }
  }

  const driverItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.driverCard}
      onPress={() => {
        // TODO: Select driver and proceed with booking
        setShowDriverModal(false)
      }}
    >
      <View style={styles.driverInfo}>
        <View style={styles.driverAvatar}>
          <MaterialIcons name="person" size={28} color={COLORS.text} />
        </View>
        <View style={styles.driverDetails}>
          <Text style={styles.driverName}>{item.name}</Text>
          <View style={styles.ratingRow}>
            <MaterialIcons name="star" size={16} color="#FFD700" />
            <Text style={styles.rating}>{item.rating?.toFixed(1) || 'N/A'}</Text>
            <Text style={styles.distance}>{item.distance?.toFixed(1) || 0} km away</Text>
          </View>
          <Text style={styles.carType}>{item.carType || 'N/A'}</Text>
        </View>
      </View>
    </TouchableOpacity>
  )

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={28} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Đặt Xe</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Map View */}
        <View style={styles.mapContainer}>
          <MapViewComponent
            height={200}
            initialRegion={{
              latitude: startLat,
              longitude: startLng,
              latitudeDelta: Math.abs((endLat - startLat) * 1.5) || 0.1,
              longitudeDelta: Math.abs((endLng - startLng) * 1.5) || 0.1,
            }}
            markers={[
              {
                id: 'pickup',
                latitude: startLat,
                longitude: startLng,
                title: 'Điểm đón',
                description: pickupAddress,
              },
              {
                id: 'dropoff',
                latitude: endLat,
                longitude: endLng,
                title: 'Điểm đến',
                description: dropoffAddress,
              },
            ]}
            onLocationSelect={() => {}}
          />
        </View>

        {/* Location Info */}
        <View style={styles.locationCard}>
          <View style={styles.locRow}>
            <MaterialIcons name="location-on" size={20} color={COLORS.primary} />
            <View style={styles.locText}>
              <Text style={styles.locLabel}>Điểm đón</Text>
              <Text style={styles.locAddress}>{pickupAddress}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.locRow}>
            <MaterialIcons name="location-on" size={20} color={COLORS.primary} />
            <View style={styles.locText}>
              <Text style={styles.locLabel}>Điểm đến</Text>
              <Text style={styles.locAddress}>{dropoffAddress}</Text>
            </View>
          </View>
        </View>

        {/* Trip Info */}
        <View style={styles.tripInfo}>
          <View style={styles.tripItem}>
            <MaterialIcons name="straighten" size={20} color={COLORS.primary} />
            <View>
              <Text style={styles.tripLabel}>Khoảng cách</Text>
              <Text style={styles.tripValue}>{distance.toFixed(1)} km</Text>
            </View>
          </View>

          <View style={styles.tripItem}>
            <MaterialIcons name="schedule" size={20} color={COLORS.primary} />
            <View>
              <Text style={styles.tripLabel}>Thời gian dự tính</Text>
              <Text style={styles.tripValue}>{Math.round(duration / 60)} phút</Text>
            </View>
          </View>
        </View>

        {/* Vehicle Types */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Loại xe</Text>
          <View style={styles.vehicleTypes}>
            {[
              { id: 'basic', label: 'Basic', icon: '🚗' },
              { id: 'comfort', label: 'Comfort', icon: '🚙' },
              { id: 'premium', label: 'Premium', icon: '🚘' },
            ].map((vt) => (
              <TouchableOpacity
                key={vt.id}
                style={[
                  styles.vehicleCard,
                  selectedVehicleType === vt.id && styles.vehicleCardActive,
                ]}
                onPress={() => setSelectedVehicleType(vt.id)}
              >
                <Text style={styles.vehicleIcon}>{vt.icon}</Text>
                <Text style={styles.vehicleLabel}>{vt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Fare Breakdown */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Đang tính giá...</Text>
          </View>
        ) : fare ? (
          <View style={styles.fareCard}>
            <View style={styles.fareHeader}>
              <Text style={styles.fareTitle}>Chi tiết giá cước</Text>
              <Text style={styles.totalFare}>
                ₫{fare.totalFare?.toLocaleString('vi-VN') || 0}
              </Text>
            </View>

            <View style={styles.fareBreakdown}>
              <View style={styles.fareRow}>
                <Text style={styles.fareLabel}>Giá cơ bản</Text>
                <Text style={styles.fareValue}>
                  ₫{fare.baseFare?.toLocaleString('vi-VN') || 0}
                </Text>
              </View>
              <View style={styles.fareRow}>
                <Text style={styles.fareLabel}>Quãng đường ({distance.toFixed(1)} km)</Text>
                <Text style={styles.fareValue}>
                  ₫{fare.distanceFare?.toLocaleString('vi-VN') || 0}
                </Text>
              </View>
              <View style={styles.fareRow}>
                <Text style={styles.fareLabel}>Thời gian ({Math.round(duration / 60)} phút)</Text>
                <Text style={styles.fareValue}>
                  ₫{fare.timeFare?.toLocaleString('vi-VN') || 0}
                </Text>
              </View>
              {fare.surgeFare > 0 && (
                <View style={styles.fareRow}>
                  <Text style={styles.fareLabel}>Phụ phí cao điểm</Text>
                  <Text style={styles.fareValue}>
                    ₫{fare.surgeFare?.toLocaleString('vi-VN') || 0}
                  </Text>
                </View>
              )}
            </View>
          </View>
        ) : null}

        {/* Error Message */}
        {errorMessage && (
          <View style={styles.errorBox}>
            <MaterialIcons name="error" size={20} color={COLORS.danger} />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.button, styles.buttonSecondary]}
          onPress={findNearbyDrivers}
          disabled={findingDrivers || !fare}
        >
          {findingDrivers ? (
            <ActivityIndicator size="small" color={COLORS.text} />
          ) : (
            <>
              <MaterialIcons name="group" size={20} color={COLORS.text} />
              <Text style={styles.buttonText}>Xem tài xế</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.buttonPrimary]}
          onPress={bookRide}
          disabled={bookingLoading || !fare}
        >
          {bookingLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <MaterialIcons name="check" size={20} color="#fff" />
              <Text style={styles.buttonTextWhite}>Đặt xe</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Drivers Modal */}
      <Modal visible={showDriverModal} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowDriverModal(false)}>
              <MaterialIcons name="close" size={28} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Tài xế khả dụng ({nearbyDrivers.length})</Text>
            <View style={{ width: 28 }} />
          </View>

          {nearbyDrivers.length > 0 ? (
            <FlatList
              data={nearbyDrivers}
              renderItem={driverItem}
              keyExtractor={(item) => item._id}
              contentContainerStyle={styles.driverList}
            />
          ) : (
            <View style={styles.noDrivers}>
              <MaterialIcons name="person-outline" size={48} color={COLORS.border} />
              <Text style={styles.noDriversText}>Không có tài xế khả dụng</Text>
            </View>
          )}
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.bgSecondary,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  mapContainer: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: COLORS.bgSecondary,
  },
  locationCard: {
    backgroundColor: COLORS.bgSecondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  locRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  locText: {
    flex: 1,
  },
  locLabel: {
    fontSize: 12,
    color: COLORS.border,
    marginBottom: 2,
  },
  locAddress: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 12,
  },
  tripInfo: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  tripItem: {
    flex: 1,
    backgroundColor: COLORS.bgSecondary,
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tripLabel: {
    fontSize: 12,
    color: COLORS.border,
  },
  tripValue: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '600',
    marginTop: 2,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  vehicleTypes: {
    flexDirection: 'row',
    gap: 12,
  },
  vehicleCard: {
    flex: 1,
    backgroundColor: COLORS.bgSecondary,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  vehicleCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '20',
  },
  vehicleIcon: {
    fontSize: 28,
    marginBottom: 4,
  },
  vehicleLabel: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: '500',
  },
  fareCard: {
    backgroundColor: COLORS.bgSecondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderTopWidth: 2,
    borderTopColor: COLORS.primary,
  },
  fareHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  fareTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  totalFare: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
  },
  fareBreakdown: {
    gap: 8,
  },
  fareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border + '30',
  },
  fareLabel: {
    fontSize: 13,
    color: COLORS.border,
  },
  fareValue: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '500',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.border,
  },
  errorBox: {
    flexDirection: 'row',
    backgroundColor: '#DC262640',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    color: COLORS.danger,
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    paddingBottom: 24,
    backgroundColor: COLORS.bgSecondary,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingVertical: 12,
    gap: 8,
  },
  buttonPrimary: {
    backgroundColor: COLORS.primary,
  },
  buttonSecondary: {
    backgroundColor: COLORS.bgSecondary,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  buttonTextWhite: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.bg,
    marginTop: 60,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.bgSecondary,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  driverList: {
    padding: 16,
  },
  driverCard: {
    backgroundColor: COLORS.bgSecondary,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  driverAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.border + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverDetails: {
    flex: 1,
  },
  driverName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  rating: {
    fontSize: 12,
    color: COLORS.border,
    marginRight: 8,
  },
  distance: {
    fontSize: 12,
    color: COLORS.border,
  },
  carType: {
    fontSize: 12,
    color: COLORS.border,
    marginTop: 2,
  },
  noDrivers: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noDriversText: {
    fontSize: 14,
    color: COLORS.border,
    marginTop: 12,
  },
})

export default RideBookingScreen
