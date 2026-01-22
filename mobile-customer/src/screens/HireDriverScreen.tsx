import { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { RootState } from '../redux/store'
import type { RootStackParamList } from '../types'
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
  FlatList,
  StatusBar,
} from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { SPACING, BORDER_RADIUS, COLORS_DARK, COLORS_LIGHT } from '../constants'
import MapViewComponent from '../components/MapView'
import ScheduleDateTimeModal from '../components/ScheduleDateTimeModal'
import ChatScreen from './ChatScreen'
import DriverFoundScreen from './DriverFoundScreen'
import FindingDriverScreen from './FindingDriverScreen'
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
  // Navigation
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()

  // Lấy user từ redux
  const user = useSelector((state: RootState) => state.auth.user)
  const themeMode = useSelector((state: RootState) => state.theme.mode)
  const colors = themeMode === 'dark' ? COLORS_DARK : COLORS_LIGHT
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
  const [rideId, setRideId] = useState<string | null>(null)
  const [pickupSuggestions, setPickupSuggestions] = useState<any[]>([])
  const [dropoffSuggestions, setDropoffSuggestions] = useState<any[]>([])
  const [showPickupSuggestions, setShowPickupSuggestions] = useState(false)
  const [showDropoffSuggestions, setShowDropoffSuggestions] = useState(false)
  const [pickupSearchTimeout, setPickupSearchTimeout] = useState<NodeJS.Timeout | null>(null)
  const [dropoffSearchTimeout, setDropoffSearchTimeout] = useState<NodeJS.Timeout | null>(null)

  // Reset ride state khi cancel
  const resetRideState = () => {
    setIsSearching(false)
    setDriverFound(false)
    setDriver(null)
    setDriverLocation(null)
    setRouteInfo(null)
    setFareEstimate(null)
    setShowChat(false)
    setRideId(null)
  }

  const handlePickupLocationChange = (text: string) => {
    setPickupLocation(text)

    // Clear previous timeout
    if (pickupSearchTimeout) {
      clearTimeout(pickupSearchTimeout)
    }

    // Chỉ search nếu text >= 5 ký tự
    if (text.trim().length >= 5) {
      setShowPickupSuggestions(true)
      // Debounce 800ms để giảm request
      const timeout = setTimeout(async () => {
        try {
          console.log('[Search] Pickup search for:', text)
          const suggestions = await mapsService.searchPlaces(text)
          setPickupSuggestions(suggestions)
        } catch (error) {
          console.error('Error searching pickup locations:', error)
          setPickupSuggestions([])
        }
      }, 800)
      setPickupSearchTimeout(timeout)
    } else {
      // Xóa suggestions nếu text < 5 ký tự
      setPickupSuggestions([])
      if (text.trim().length === 0) {
        setShowPickupSuggestions(false)
      }
    }
  }

  const handleDropoffLocationChange = (text: string) => {
    setDropoffLocation(text)

    // Clear previous timeout
    if (dropoffSearchTimeout) {
      clearTimeout(dropoffSearchTimeout)
    }

    // Chỉ search nếu text >= 5 ký tự
    if (text.trim().length >= 5) {
      setShowDropoffSuggestions(true)
      // Debounce 800ms để giảm request
      const timeout = setTimeout(async () => {
        try {
          console.log('[Search] Dropoff search for:', text)
          const suggestions = await mapsService.searchPlaces(text)
          setDropoffSuggestions(suggestions)
        } catch (error) {
          console.error('Error searching dropoff locations:', error)
          setDropoffSuggestions([])
        }
      }, 800)
      setDropoffSearchTimeout(timeout)
    } else {
      // Xóa suggestions nếu text < 5 ký tự
      setDropoffSuggestions([])
      if (text.trim().length === 0) {
        setShowDropoffSuggestions(false)
      }
    }
  }

  const handlePickupSuggestionSelect = (suggestion: any) => {
    setPickupLocation(suggestion.fullText)
    setShowPickupSuggestions(false)
    setPickupSuggestions([])
  }

  const handleDropoffSuggestionSelect = (suggestion: any) => {
    setDropoffLocation(suggestion.fullText)
    setShowDropoffSuggestions(false)
    setDropoffSuggestions([])
  }

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (pickupSearchTimeout) clearTimeout(pickupSearchTimeout)
      if (dropoffSearchTimeout) clearTimeout(dropoffSearchTimeout)
    }
  }, [])

  const handleScheduleDateTime = (dateTime: Date) => {
    setScheduledDateTime(dateTime)
    setShowScheduleModal(false)
  }

  const handleExpandMap = () => {
    navigation.navigate('FullscreenMap', {
      pickupCoordinates: routeInfo
        ? [routeInfo.pickup.coordinates.longitude, routeInfo.pickup.coordinates.latitude]
        : [105.8542, 21.0285],
      dropoffCoordinates: routeInfo
        ? [routeInfo.dropoff.coordinates.longitude, routeInfo.dropoff.coordinates.latitude]
        : [105.8542, 21.0285],
      pickupCoords: routeInfo
        ? {
          latitude: routeInfo.pickup.coordinates.latitude,
          longitude: routeInfo.pickup.coordinates.longitude,
        }
        : undefined,
      dropoffCoords: routeInfo
        ? {
          latitude: routeInfo.dropoff.coordinates.latitude,
          longitude: routeInfo.dropoff.coordinates.longitude,
        }
        : undefined,
      routeCoordinates: routeInfo?.routeCoordinates || [],
      drivers: [],
      routeInfo,
    })
  }

  // Polling để lấy thông tin tài xế khi driver nhận cuốc
  useEffect(() => {
    if (!isSearching || !rideId) {
      return
    }

    console.log('[HireDriverScreen] 🔄 Starting polling for rideId:', rideId)

    const pollInterval = setInterval(async () => {
      try {
        const token = await AsyncStorage.getItem('token')
        const rideData = await rideService.getRideById(rideId, token || undefined)

        console.log('[HireDriverScreen] 📊 Polling result:', {
          hasDriverId: !!rideData?.driverId,
          driverType: typeof rideData?.driverId,
        })

        if (!rideData || typeof rideData !== 'object') {
          return
        }

        const driverData = rideData.driverId

        if (driverData && typeof driverData === 'object' && driverData._id) {
          console.log('[HireDriverScreen] ✅ Driver found!', driverData._id)

          // Extract driver location
          let driverLat = 21.0285 // Default Hanoi
          let driverLng = 105.8542
          if (driverData.currentLocation?.coordinates) {
            driverLat = driverData.currentLocation.coordinates[1]
            driverLng = driverData.currentLocation.coordinates[0]
            console.log('[HireDriverScreen] 📍 Driver location:', { lat: driverLat, lng: driverLng })
          }

          setDriver({
            id: driverData._id,
            name: `${driverData.firstName || ''} ${driverData.lastName || ''}`.trim() || 'Tài xế',
            avatar: `https://i.pravatar.cc/150?u=${driverData._id}`,
            rating: driverData.averageRating || 4.8,
            totalRides: driverData.totalRides || 0,
            carType: 'Sedan',
            licensePlate: driverData.vehiclePlate || '---',
            carColor: driverData.vehicleColor || 'Trắng',
            distance: 1.2,
            eta: 3,
            phone: driverData.phone || '',
            email: driverData.email || '',
            currentLat: driverLat,
            currentLng: driverLng,
          })

          if (driverData.currentLocation?.coordinates) {
            setDriverLocation({
              latitude: driverLat,
              longitude: driverLng,
            })
          }

          // Update states to show DriverFoundScreen
          setDriverFound(true)
          setIsSearching(false) // Stop showing FindingDriverScreen

          clearInterval(pollInterval)
        }
      } catch (error) {
        console.error('[HireDriverScreen] ❌ Polling error:', error)
      }
    }, 2000)

    return () => clearInterval(pollInterval)
  }, [isSearching, rideId])


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

      // Save rideId for polling
      const createdRideId = result._id || result.id
      if (createdRideId) {
        console.log('[HireDriverScreen] Ride created with ID:', createdRideId)
        setRideId(createdRideId)
      } else {
        console.error('[HireDriverScreen] No ride ID returned from createRide!')
      }

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
    return <ChatScreen driver={driver} rideId={rideId || undefined} onClose={() => setShowChat(false)} />
  }

  // Show driver found screen
  if (driverFound && routeInfo && driver) {
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
      <FindingDriverScreen
        routeInfo={routeInfo}
        fareEstimate={fareEstimate}
        pickupAddress={pickupLocation}
        dropoffAddress={dropoffLocation}
        colors={colors}
        onCancel={resetRideState}
      />
    )
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar
        barStyle={themeMode === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={colors.bg}
      />
      {/* Schedule DateTime Modal */}
      <ScheduleDateTimeModal
        visible={showScheduleModal}
        onConfirm={handleScheduleDateTime}
        onCancel={() => setShowScheduleModal(false)}
        minDateTime={new Date()}
      />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.bg, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setRideMode('share')}
        >
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Đặt lái xe hộ</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        style={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Location Card */}
        <View style={styles.locationCardWrapper}>
          <View style={[styles.locationCard, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}>
            <View style={styles.locationRow}>
              <MaterialIcons name="radio-button-checked" size={24} color="#FF6B00" />
              <View style={styles.locationInputWrapper}>
                <Text style={[styles.locationLabel, { color: colors.textSecondary }]}>Điểm đón</Text>
                <TextInput
                  style={[styles.locationInput, { color: colors.text }]}
                  value={pickupLocation}
                  onChangeText={handlePickupLocationChange}
                  onFocus={() => setShowPickupSuggestions(true)}
                  placeholder="Nhập điểm đón"
                  placeholderTextColor={colors.textSecondary}
                  editable={!isSearching && !driverFound}
                />
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <View style={styles.locationRow}>
              <MaterialIcons name="flag" size={24} color="#ef4444" />
              <View style={styles.locationInputWrapper}>
                <Text style={[styles.locationLabel, { color: colors.textSecondary }]}>Điểm đến</Text>
                <TextInput
                  style={[styles.locationInput, { color: colors.text }]}
                  value={dropoffLocation}
                  onChangeText={handleDropoffLocationChange}
                  onFocus={() => setShowDropoffSuggestions(true)}
                  placeholder="Bạn muốn đến đâu?"
                  placeholderTextColor={colors.textSecondary}
                  editable={!isSearching && !driverFound}
                />
              </View>
            </View>
          </View>

          {/* Pickup Suggestions */}
          {showPickupSuggestions && pickupSuggestions.length > 0 && (
            <View style={[styles.suggestionsDropdown, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}>
              <FlatList
                data={pickupSuggestions}
                keyExtractor={(item) => item.placeId}
                scrollEnabled={false}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.suggestionItem, { borderBottomColor: colors.border }]}
                    onPress={() => handlePickupSuggestionSelect(item)}
                  >
                    <MaterialIcons name="location-on" size={18} color={colors.textSecondary} />
                    <View style={styles.suggestionContent}>
                      <Text style={[styles.suggestionMainText, { color: colors.text }]}>{item.mainText}</Text>
                      {item.secondaryText && (
                        <Text style={[styles.suggestionSecondaryText, { color: colors.textSecondary }]}>{item.secondaryText}</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                )}
              />
            </View>
          )}

          {/* Dropoff Suggestions */}
          {showDropoffSuggestions && dropoffSuggestions.length > 0 && (
            <View style={[styles.suggestionsDropdown, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}>
              <FlatList
                data={dropoffSuggestions}
                keyExtractor={(item) => item.placeId}
                scrollEnabled={false}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.suggestionItem, { borderBottomColor: colors.border }]}
                    onPress={() => handleDropoffSuggestionSelect(item)}
                  >
                    <MaterialIcons name="location-on" size={18} color={colors.textSecondary} />
                    <View style={styles.suggestionContent}>
                      <Text style={[styles.suggestionMainText, { color: colors.text }]}>{item.mainText}</Text>
                      {item.secondaryText && (
                        <Text style={[styles.suggestionSecondaryText, { color: colors.textSecondary }]}>{item.secondaryText}</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                )}
              />
            </View>
          )}
        </View>

        {/* Map Component */}
        <View style={styles.mapWrapper}>
          <MapViewComponent
            height={275}
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
          {/* Expand Map Button - Always visible */}
          <TouchableOpacity
            style={[styles.expandMapButton, { backgroundColor: '#FF6B00' }]}
            onPress={handleExpandMap}
            activeOpacity={0.8}
          >
            <MaterialIcons name="fullscreen" size={22} color="#fff" />
          </TouchableOpacity>
        </View>


        {/* Time Toggle */}
        <View style={[styles.timeToggleContainer, { backgroundColor: colors.bgSecondary }]}>
          <TouchableOpacity
            style={[
              styles.timeButton,
              !isScheduled && { backgroundColor: colors.border },
            ]}
            onPress={() => setIsScheduled(false)}
          >
            <MaterialIcons
              name="bolt"
              size={18}
              color={!isScheduled ? '#FF6B00' : colors.textSecondary}
            />
            <Text
              style={[
                styles.timeButtonText,
                { color: !isScheduled ? colors.text : colors.textSecondary },
              ]}
            >
              Đi ngay
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.timeButton,
              isScheduled && { backgroundColor: colors.border },
            ]}
            onPress={() => {
              setIsScheduled(true)
              setShowScheduleModal(true)
            }}
          >
            <MaterialIcons
              name="schedule"
              size={18}
              color={isScheduled ? '#FF6B00' : colors.textSecondary}
            />
            <Text
              style={[
                styles.timeButtonText,
                { color: isScheduled ? colors.text : colors.textSecondary },
              ]}
            >
              Hẹn giờ
            </Text>
          </TouchableOpacity>
        </View>

        {/* Vehicle Info Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Thông tin xe</Text>

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
                  {
                    backgroundColor: carType === car.id ? 'rgba(255, 107, 0, 0.1)' : colors.bgSecondary,
                    borderColor: carType === car.id ? '#FF6B00' : colors.border,
                  },
                  carType === car.id && styles.carTypeButtonActive,
                ]}
                onPress={() => setCarType(car.id as any)}
              >
                <MaterialIcons
                  name={car.icon as any}
                  size={32}
                  color={carType === car.id ? '#FF6B00' : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.carTypeLabel,
                    { color: carType === car.id ? '#FF6B00' : colors.textSecondary },
                  ]}
                >
                  {car.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* License Plate Input */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Biển số xe</Text>
            <View style={[styles.inputContainer, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}>
              <MaterialIcons name="pin" size={20} color={colors.textSecondary} />
              <TextInput
                style={[styles.textInput, { color: colors.text }]}
                placeholder="Ví dụ: 30A-123.45"
                placeholderTextColor={colors.textSecondary}
                value={licensePlate}
                onChangeText={setLicensePlate}
              />
            </View>
          </View>

          {/* Transmission Selection */}
          <View style={styles.transmissionGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Loại hộp số (Bắt buộc)</Text>
            <View style={styles.transmissionContainer}>
              <TouchableOpacity
                style={[
                  styles.transmissionButton,
                  {
                    backgroundColor: transmission === 'auto' ? 'rgba(255, 107, 0, 0.1)' : colors.bgSecondary,
                    borderColor: transmission === 'auto' ? '#FF6B00' : colors.border,
                  },
                ]}
                onPress={() => setTransmission('auto')}
              >
                <Text
                  style={[
                    styles.transmissionText,
                    { color: transmission === 'auto' ? '#FF6B00' : colors.textSecondary },
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
                  {
                    backgroundColor: transmission === 'manual' ? 'rgba(255, 107, 0, 0.1)' : colors.bgSecondary,
                    borderColor: transmission === 'manual' ? '#FF6B00' : colors.border,
                  },
                ]}
                onPress={() => setTransmission('manual')}
              >
                <Text
                  style={[
                    styles.transmissionText,
                    { color: transmission === 'manual' ? '#FF6B00' : colors.textSecondary },
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
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Ghi chú cho tài xế</Text>
          <View style={[styles.noteContainer, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}>
            <TextInput
              style={[styles.noteInput, { color: colors.text }]}
              placeholder="Xe đỗ ở hầm B1, cột A05..."
              placeholderTextColor={colors.textSecondary}
              value={driverNote}
              onChangeText={setDriverNote}
              multiline
            />
          </View>
        </View>

        <View style={{ height: SPACING.xxl }} />
      </ScrollView>

      {/* Bottom Action */}
      <View style={[styles.bottomAction, { backgroundColor: colors.bgSecondary, borderTopColor: colors.border }]}>
        {/* Hiển thị thông tin route nếu đã tính */}
        {routeInfo && fareEstimate && (
          <View style={styles.routeInfoContainer}>
            <View style={styles.routeInfoRow}>
              <Text style={[styles.routeInfoLabel, { color: colors.textSecondary }]}>
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
            <Text style={[styles.priceLabel, { color: colors.textSecondary }]}>
              {calculating ? 'Đang tính...' : 'Ước tính'}
            </Text>
          </View>
          {!calculating && (
            <TouchableOpacity
              style={styles.calculateButton}
              onPress={calculateEstimate}
              disabled={!pickupLocation || !dropoffLocation}
            >
              <Text style={[styles.priceValue, { color: colors.text }]}>
                {fareEstimate ? formatCurrency(fareEstimate.total) : '---'}
              </Text>
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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
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
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 12,
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
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
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
  container: {
    flex: 1,
    paddingTop: SPACING.xxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
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
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
  },
  locationCardWrapper: {
    position: 'relative',
    zIndex: 10,
    marginBottom: SPACING.lg,
  },
  locationCard: {
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
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
    marginBottom: SPACING.xs,
  },
  locationInput: {
    fontSize: 14,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    marginVertical: SPACING.lg,
    marginLeft: 44,
  },
  suggestionsDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    borderRadius: BORDER_RADIUS.lg,
    marginTop: -SPACING.sm,
    borderWidth: 1,
    maxHeight: 300,
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    gap: SPACING.md,
  },
  suggestionContent: {
    flex: 1,
  },
  suggestionMainText: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: SPACING.xs,
  },
  suggestionSecondaryText: {
    fontSize: 12,
  },
  timeToggleContainer: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
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
  },
  timeButtonActive: {
  },
  timeButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  timeButtonTextActive: {
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
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
    borderWidth: 2,
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
    marginBottom: SPACING.md,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    height: 56,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    gap: SPACING.md,
  },
  textInput: {
    flex: 1,
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
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  transmissionButtonActive: {
    borderColor: '#FF6B00',
    backgroundColor: 'rgba(255, 107, 0, 0.1)',
  },
  transmissionText: {
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
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.md,
    minHeight: 120,
  },
  noteInput: {
    flex: 1,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  bottomAction: {
    borderTopWidth: 1,
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
  },
  priceValue: {
    fontSize: 18,
    fontWeight: '700',
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
  mapWrapper: {
    position: 'relative',
    marginHorizontal: -SPACING.lg,
    marginVertical: SPACING.lg,
  },
  expandMapButton: {
    position: 'absolute',
    top: 20,
    left: SPACING.lg + 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 15,
  },
})