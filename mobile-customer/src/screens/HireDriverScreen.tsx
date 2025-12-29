import React, { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '../redux/store'
import { rideService } from '../services/rideService'
import { mapsService } from '../services/mapsService'
import { calculateFare, formatCurrency, formatDistance, formatDuration } from '../utils/pricing'
import type { CreateRideDto } from '../types'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  Alert,
} from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { SPACING, BORDER_RADIUS } from '../constants'
import MapViewComponent from '../components/MapView'
import ScheduleDateTimeModal from '../components/ScheduleDateTimeModal'
import ChatScreen from './ChatScreen'
import DriverFoundScreen from './DriverFoundScreen'

interface HireDriverScreenProps {
  isScheduled: boolean
  setIsScheduled: (value: boolean) => void
  carType: 'sedan' | 'suv' | 'truck'
  setCarType: (type: 'sedan' | 'suv' | 'truck') => void
  licensePlate: string
  setLicensePlate: (value: string) => void
  transmission: 'auto' | 'manual'
  setTransmission: (type: 'auto' | 'manual') => void
  driverNote: string
  setDriverNote: (value: string) => void
  pickupLocation: string
  setPickupLocation: (value: string) => void
  dropoffLocation: string
  setDropoffLocation: (value: string) => void
  setRideMode: (mode: 'share' | 'hire') => void
}

export default function HireDriverScreen({
  isScheduled,
  setIsScheduled,
  carType,
  setCarType,
  licensePlate,
  setLicensePlate,
  transmission,
  setTransmission,
  driverNote,
  setDriverNote,
  pickupLocation,
  setPickupLocation,
  dropoffLocation,
  setDropoffLocation,
  setRideMode,
}: HireDriverScreenProps) {
  // Lấy user từ redux
  const user = useSelector((state: RootState) => state.auth.user)
  const [loading, setLoading] = useState(false)
  const [calculating, setCalculating] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [driverFound, setDriverFound] = useState(false)
  const [routeInfo, setRouteInfo] = useState<any>(null)
  const [fareEstimate, setFareEstimate] = useState<any>(null)
  const [driver, setDriver] = useState<any>(null)
  const [driverLocation, setDriverLocation] = useState<any>(null)
  const [showChat, setShowChat] = useState(false)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [scheduledDateTime, setScheduledDateTime] = useState<Date>(new Date())

  // Reset ride state khi cancel
  const resetRideState = () => {
    setIsSearching(false)
    setDriverFound(false)
    setDriver(null)
    setDriverLocation(null)
    setRouteInfo(null)
    setFareEstimate(null)
    setShowChat(false)
  }

  const handleScheduleDateTime = (dateTime: Date) => {
    setScheduledDateTime(dateTime)
    setShowScheduleModal(false)
  }

  // Simulate driver found after 3 seconds
  useEffect(() => {
    if (isSearching) {
      const timer = setTimeout(() => {
        setDriver({
          id: 'driver_1',
          name: 'Nguyễn Văn A',
          avatar: 'https://i.pravatar.cc/150?img=1',
          rating: 4.8,
          totalRides: 1245,
          carType: 'Sedan',
          licensePlate: '30A-12345',
          carColor: 'Bạc',
          distance: 1.2,
          eta: 3,
          currentLat: 21.028,
          currentLng: 105.855,
        })
        setDriverLocation({
          latitude: 21.028,
          longitude: 105.855,
        })
        setDriverFound(true)
        setIsSearching(false)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [isSearching])

  useEffect(() => {
    // Không tính lại nếu đang tìm tài xế hoặc tài xế đã được tìm thấy
    if (isSearching || driverFound) {
      return
    }

    if (!pickupLocation.trim() || !dropoffLocation.trim()) {
      setRouteInfo(null)
      setFareEstimate(null)
      return
    }

    const timer = setTimeout(() => {
      calculateEstimate()
    }, 1000) // Debounce 1 giây

    return () => clearTimeout(timer)
  }, [pickupLocation, dropoffLocation, carType, isSearching, driverFound])

  // Tính giá cước khi có đủ thông tin
  const calculateEstimate = async () => {
    if (!pickupLocation.trim() || !dropoffLocation.trim()) {
      return
    }

    setCalculating(true)
    try {
      console.log('[HireDriverScreen] Calculating route...')
      const route = await mapsService.getRouteInfo(pickupLocation, dropoffLocation)
      setRouteInfo(route)

      const fare = calculateFare(route.distance, route.duration, carType)
      setFareEstimate(fare)

      console.log('[HireDriverScreen] Route calculated:', { route, fare })

      // Thông báo nếu đang dùng mock data
      if (route.isMockData) {
        Alert.alert(
          '⚠️ Chế độ Demo',
          'Hiện đang sử dụng dữ liệu giả lập.\n\nĐể sử dụng Google Maps thật, vui lòng cấu hình API key trong file .env',
          [{ text: 'OK' }]
        )
      }
    } catch (err: any) {
      console.error('[HireDriverScreen] Calculate error:', err)
      Alert.alert('Lỗi', err.message || 'Không thể tính toán tuyến đường')
    } finally {
      setCalculating(false)
    }
  }

  // Validation và tạo cuốc xe
  const handleCreateRide = async () => {
    // Kiểm tra đăng nhập
    if (!user) {
      Alert.alert('Yêu cầu đăng nhập', 'Bạn cần đăng nhập để đặt xe!')
      return
    }

    // Validation các trường bắt buộc
    if (!pickupLocation.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập điểm đón!')
      return
    }

    if (!dropoffLocation.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập điểm đến!')
      return
    }

    if (!licensePlate.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập biển số xe!')
      return
    }

    // Nếu chưa tính giá, tính trước
    if (!routeInfo || !fareEstimate) {
      Alert.alert(
        'Chưa tính giá',
        'Vui lòng nhấn "Tính giá" trước khi đặt xe!',
        [
          {
            text: 'Tính giá ngay',
            onPress: calculateEstimate,
          },
          { text: 'Hủy', style: 'cancel' },
        ]
      )
      return
    }

    setLoading(true)
    try {
      const rideData: CreateRideDto = {
        rideType: 'hire', // Loại lái xe hộ
        pickupAddress: routeInfo.pickup.formattedAddress,
        pickupCoordinates: [
          routeInfo.pickup.coordinates.longitude,
          routeInfo.pickup.coordinates.latitude,
        ],
        dropoffAddress: routeInfo.dropoff.formattedAddress,
        dropoffCoordinates: [
          routeInfo.dropoff.coordinates.longitude,
          routeInfo.dropoff.coordinates.latitude,
        ],
        distance: routeInfo.distance,
        duration: routeInfo.duration,
        baseFare: fareEstimate.baseFare,
        distanceFare: fareEstimate.distanceFare,
        timeFare: fareEstimate.timeFare,
        surgePricing: fareEstimate.surgePricing,
        carType,
        licensePlate,
        transmission,
        driverNote,
        isScheduled,
        scheduledTime: isScheduled ? scheduledDateTime.toISOString() : undefined,
      }

      console.log('[HireDriverScreen] Creating ride with data:', rideData)
      const result = await rideService.createRide(rideData, user.id)
      
      Alert.alert(
        'Thành công',
        '✓ Cuốc xe đã được tạo!\n\nHệ thống đang tìm tài xế phù hợp cho bạn...',
        [
          { text: 'OK' }
        ]
      )
      
      // Set searching state to show finding driver screen
      setIsSearching(true)
    } catch (err: any) {
      console.error('[HireDriverScreen] Create ride error:', err)
      Alert.alert(
        'Lỗi',
        err.message || 'Không thể tạo cuốc xe. Vui lòng thử lại!',
        [{ text: 'Đóng' }]
      )
    } finally {
      setLoading(false)
    }
  }

  // Show chat screen (CHECK BEFORE driver found)
  if (showChat && driverFound && driver) {
    return <ChatScreen driver={driver} onClose={() => setShowChat(false)} />
  }

  // Show driver found screen
  if (driverFound && routeInfo && driver && driverLocation) {
    return (
      <DriverFoundScreen
        driver={driver}
        routeInfo={routeInfo}
        onChat={() => setShowChat(true)}
        onCancel={resetRideState}
      />
    )
  }

  // Show finding driver screen
  if (isSearching && routeInfo) {
    return (
      <View style={styles.findingContainer}>
        {/* Full Screen Map */}
        <MapViewComponent
          height={null}
          initialRegion={{
            latitude: routeInfo.pickup.coordinates.latitude,
            longitude: routeInfo.pickup.coordinates.longitude,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
          }}
          markers={[]}
          pickupCoords={{
            latitude: routeInfo.pickup.coordinates.latitude,
            longitude: routeInfo.pickup.coordinates.longitude,
          }}
          dropoffCoords={{
            latitude: routeInfo.dropoff.coordinates.latitude,
            longitude: routeInfo.dropoff.coordinates.longitude,
          }}
          routeCoordinates={routeInfo?.routeCoordinates || []}
          onLocationSelect={() => {}}
        />

        {/* Radar Animation Overlay */}
        <View style={styles.radarContainer}>
          {[0, 1, 2].map((index) => (
            <View
              key={index}
              style={[
                styles.radarPulse,
                {
                  width: 60 + index * 40,
                  height: 60 + index * 40,
                  opacity: Math.max(0, 1 - index * 0.3),
                  borderColor: `rgba(255, 107, 0, ${0.6 - index * 0.2})`,
                },
              ]}
            />
          ))}
          <View style={styles.radarCenter} />
        </View>

        {/* Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusContent}>
            <Text style={styles.statusIcon}>🔍</Text>
            <Text style={styles.statusText}>Đang tìm tài xế gần bạn…</Text>
          </View>

          {/* Cancel Button */}
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={resetRideState}
          >
            <MaterialIcons name="close" size={20} color="#fff" />
            <Text style={styles.cancelButtonText}>Hủy chuyến</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Schedule DateTime Modal */}
      <ScheduleDateTimeModal
        visible={showScheduleModal}
        onConfirm={handleScheduleDateTime}
        onCancel={() => setShowScheduleModal(false)}
        minDateTime={new Date()}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setRideMode('share')}
        >
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Đặt lái xe hộ</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        style={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Location Card */}
        <View style={styles.locationCard}>
          <View style={styles.locationRow}>
            <MaterialIcons name="my-location" size={24} color="#FF6B00" />
            <View style={styles.locationInputWrapper}>
              <Text style={styles.locationLabel}>Điểm đón</Text>
              <TextInput
                style={styles.locationInput}
                value={pickupLocation}
                onChangeText={setPickupLocation}
                placeholder="Nhập điểm đón"
                placeholderTextColor="#64748b"
                editable={!isSearching && !driverFound}
              />
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.locationRow}>
            <MaterialIcons name="location-on" size={24} color="#ef4444" />
            <View style={styles.locationInputWrapper}>
              <Text style={styles.locationLabel}>Điểm đến</Text>
              <TextInput
                style={styles.locationInput}
                value={dropoffLocation}
                onChangeText={setDropoffLocation}
                placeholder="Bạn muốn đến đâu?"
                placeholderTextColor="#64748b"
                editable={!isSearching && !driverFound}
              />
            </View>
          </View>
        </View>

        {/* Map Component */}
        <MapViewComponent
          height={200}
          initialRegion={{
            latitude: 21.0285,
            longitude: 105.8542,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
          }}
          markers={[]}
          pickupCoords={
            routeInfo
              ? {
                  latitude: routeInfo.pickup.coordinates.latitude,
                  longitude: routeInfo.pickup.coordinates.longitude,
                }
              : undefined
          }
          dropoffCoords={
            routeInfo
              ? {
                  latitude: routeInfo.dropoff.coordinates.latitude,
                  longitude: routeInfo.dropoff.coordinates.longitude,
                }
              : undefined
          }
          routeCoordinates={routeInfo?.routeCoordinates || []}
          onLocationSelect={(location) => {
            console.log('Location selected:', location)
          }}
        />

        {/* Time Toggle */}
        <View style={styles.timeToggleContainer}>
          <TouchableOpacity
            style={[
              styles.timeButton,
              !isScheduled && styles.timeButtonActive,
            ]}
            onPress={() => setIsScheduled(false)}
          >
            <MaterialIcons
              name="bolt"
              size={18}
              color={!isScheduled ? '#FF6B00' : '#64748b'}
            />
            <Text
              style={[
                styles.timeButtonText,
                !isScheduled && styles.timeButtonTextActive,
              ]}
            >
              Đi ngay
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.timeButton,
              isScheduled && styles.timeButtonActive,
            ]}
            onPress={() => {
              setIsScheduled(true)
              setShowScheduleModal(true)
            }}
          >
            <MaterialIcons
              name="schedule"
              size={18}
              color={isScheduled ? '#FF6B00' : '#64748b'}
            />
            <Text
              style={[
                styles.timeButtonText,
                isScheduled && styles.timeButtonTextActive,
              ]}
            >
              Hẹn giờ
            </Text>
          </TouchableOpacity>
        </View>

        {/* Vehicle Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thông tin xe</Text>

          {/* Car Type Selection */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.carTypeScroll}
          >
            {[
              { id: 'sedan', label: '4 chỗ (Sedan)', icon: 'directions-car' },
              { id: 'suv', label: '7 chỗ (SUV)', icon: 'airport-shuttle' },
              { id: 'truck', label: 'Bán tải', icon: 'local-shipping' },
            ].map((car: any) => (
              <TouchableOpacity
                key={car.id}
                style={[
                  styles.carTypeButton,
                  carType === car.id && styles.carTypeButtonActive,
                ]}
                onPress={() => setCarType(car.id as any)}
              >
                <MaterialIcons
                  name={car.icon as any}
                  size={32}
                  color={carType === car.id ? '#FF6B00' : '#94a3b8'}
                />
                <Text
                  style={[
                    styles.carTypeLabel,
                    carType === car.id && styles.carTypeLabelActive,
                  ]}
                >
                  {car.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* License Plate Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Biển số xe</Text>
            <View style={styles.inputContainer}>
              <MaterialIcons name="pin" size={20} color="#94a3b8" />
              <TextInput
                style={styles.textInput}
                placeholder="Ví dụ: 30A-123.45"
                placeholderTextColor="#64748b"
                value={licensePlate}
                onChangeText={setLicensePlate}
              />
            </View>
          </View>

          {/* Transmission Selection */}
          <View style={styles.transmissionGroup}>
            <Text style={styles.inputLabel}>Loại hộp số (Bắt buộc)</Text>
            <View style={styles.transmissionContainer}>
              <TouchableOpacity
                style={[
                  styles.transmissionButton,
                  transmission === 'auto' && styles.transmissionButtonActive,
                ]}
                onPress={() => setTransmission('auto')}
              >
                <Text
                  style={[
                    styles.transmissionText,
                    transmission === 'auto' && styles.transmissionTextActive,
                  ]}
                >
                  Số tự động
                </Text>
                {transmission === 'auto' && (
                  <MaterialIcons
                    name="check-circle"
                    size={16}
                    color="#FF6B00"
                    style={styles.checkIcon}
                  />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.transmissionButton,
                  transmission === 'manual' && styles.transmissionButtonActive,
                ]}
                onPress={() => setTransmission('manual')}
              >
                <Text
                  style={[
                    styles.transmissionText,
                    transmission === 'manual' && styles.transmissionTextActive,
                  ]}
                >
                  Số sàn
                </Text>
                {transmission === 'manual' && (
                  <MaterialIcons
                    name="check-circle"
                    size={16}
                    color="#FF6B00"
                    style={styles.checkIcon}
                  />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Driver Note */}
        <View style={styles.noteSection}>
          <Text style={styles.inputLabel}>Ghi chú cho tài xế</Text>
          <View style={styles.noteContainer}>
            <TextInput
              style={styles.noteInput}
              placeholder="Xe đỗ ở hầm B1, cột A05..."
              placeholderTextColor="#64748b"
              value={driverNote}
              onChangeText={setDriverNote}
              multiline
            />
          </View>
        </View>

        <View style={{ height: SPACING.xxl }} />
      </ScrollView>

      {/* Bottom Action */}
      <View style={styles.bottomAction}>
        {/* Hiển thị thông tin route nếu đã tính */}
        {routeInfo && fareEstimate && (
          <View style={styles.routeInfoContainer}>
            <View style={styles.routeInfoRow}>
              <Text style={styles.routeInfoLabel}>
                {formatDistance(routeInfo.distance)} • {formatDuration(routeInfo.duration)}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.priceContainer}>
          <View style={styles.priceIcon}>
            <MaterialIcons name="payments" size={20} color="#FF6B00" />
          </View>
          <View style={styles.priceInfo}>
            <Text style={styles.priceLabel}>
              {calculating ? 'Đang tính...' : 'Ước tính'}
            </Text>
            <Text style={styles.priceValue}>
              {fareEstimate ? formatCurrency(fareEstimate.total) : '---'}
            </Text>
          </View>
          {!calculating && (
            <TouchableOpacity
              style={styles.calculateButton}
              onPress={calculateEstimate}
              disabled={!pickupLocation || !dropoffLocation}
            >
              <MaterialIcons name="calculate" size={20} color="#FF6B00" />
              <Text style={styles.calculateButtonText}>Tính giá</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[styles.findButton, (loading || calculating) && styles.findButtonDisabled]}
          onPress={handleCreateRide}
          disabled={loading || calculating}
        >
          <Text style={styles.findButtonText}>
            {loading ? 'Đang tạo...' : calculating ? 'Đang tính...' : 'Tìm tài xế ngay'}
          </Text>
          <MaterialIcons
            name="arrow-forward"
            size={20}
            color="#fff"
            style={styles.findButtonIcon}
          />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  driverMarker: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF6B00',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  driverMarkerIcon: {
    fontSize: 24,
  },
  driverSheet: {
    backgroundColor: '#1a202c',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xl,
    gap: SPACING.lg,
  },
  driverHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  driverAvatarSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  driverAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 107, 0, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarIcon: {
    fontSize: 28,
  },
  driverBasicInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  callButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FF6B00',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  driverDetails: {
    gap: SPACING.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 107, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    color: '#94a3b8',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  chatButton: {
    flex: 1,
    height: 48,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: 'rgba(255, 107, 0, 0.1)',
    borderWidth: 1,
    borderColor: '#FF6B00',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  chatButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF6B00',
  },
  cancelDriverButton: {
    flex: 1,
    height: 48,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: '#ef4444',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.sm,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  cancelDriverButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  findingContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'flex-end',
    paddingBottom: 0,
  },
  radarContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -50,
    marginTop: -50,
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radarPulse: {
    position: 'absolute',
    borderWidth: 2,
    borderRadius: 999,
  },
  radarCenter: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FF6B00',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 5,
  },
  statusCard: {
    backgroundColor: '#1a202c',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xl,
    gap: SPACING.lg,
  },
  statusContent: {
    alignItems: 'center',
    gap: SPACING.md,
  },
  statusIcon: {
    fontSize: 40,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  cancelButton: {
    height: 56,
    backgroundColor: '#ef4444',
    borderRadius: BORDER_RADIUS.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.sm,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    paddingTop: SPACING.xxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
  },
  locationCard: {
    backgroundColor: '#1a202c',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  locationInputWrapper: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: SPACING.xs,
  },
  locationInput: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: SPACING.lg,
    marginLeft: 44,
  },
  timeToggleContainer: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
    backgroundColor: '#1a202c',
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
  },
  timeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  timeButtonActive: {
    backgroundColor: '#374151',
  },
  timeButtonText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  timeButtonTextActive: {
    color: '#fff',
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: SPACING.lg,
    paddingHorizontal: SPACING.sm,
  },
  carTypeScroll: {
    marginBottom: SPACING.lg,
  },
  carTypeButton: {
    width: 110,
    height: 120,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: '#1a202c',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  carTypeButtonActive: {
    borderColor: '#FF6B00',
    backgroundColor: 'rgba(255, 107, 0, 0.1)',
  },
  carTypeLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
    textAlign: 'center',
  },
  carTypeLabelActive: {
    color: '#FF6B00',
  },
  inputGroup: {
    marginBottom: SPACING.lg,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: SPACING.md,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    height: 56,
    backgroundColor: '#1a202c',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    gap: SPACING.md,
  },
  textInput: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
  },
  transmissionGroup: {
    marginBottom: SPACING.lg,
  },
  transmissionContainer: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  transmissionButton: {
    flex: 1,
    height: 56,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: '#1a202c',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  transmissionButtonActive: {
    borderColor: '#FF6B00',
    backgroundColor: 'rgba(255, 107, 0, 0.1)',
  },
  transmissionText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
  transmissionTextActive: {
    color: '#FF6B00',
  },
  checkIcon: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
  },
  noteSection: {
    marginBottom: SPACING.xl,
  },
  noteContainer: {
    backgroundColor: '#1a202c',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    padding: SPACING.md,
    minHeight: 120,
  },
  noteInput: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    textAlignVertical: 'top',
  },
  bottomAction: {
    backgroundColor: '#1a202c',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    gap: SPACING.md,
  },
  routeInfoContainer: {
    paddingVertical: SPACING.sm,
  },
  routeInfoRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  routeInfoLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94a3b8',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  priceIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 107, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  priceInfo: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#94a3b8',
  },
  priceValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  calculateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: 'rgba(255, 107, 0, 0.1)',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: '#FF6B00',
  },
  calculateButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FF6B00',
  },
  findButton: {
    height: 56,
    backgroundColor: '#FF6B00',
    borderRadius: BORDER_RADIUS.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.sm,
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  findButtonDisabled: {
    backgroundColor: '#64748b',
    shadowOpacity: 0,
  },
  findButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  findButtonIcon: {
    marginLeft: SPACING.sm,
  },
})