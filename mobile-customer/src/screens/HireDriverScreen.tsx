import { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Location from 'expo-location'
import { RootState } from '../redux/store'
import type { RootStackParamList } from '../types'
import { rideService } from '../services/rideService'
import { mapsService } from '../services/mapsService'
import { calculateHireDriverFare, formatCurrency } from '../utils/pricing'
import type { CreateRideDto } from '../types'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  FlatList,
  ActivityIndicator
} from 'react-native'
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons'
import { SPACING, BORDER_RADIUS, COLORS_DARK, COLORS_LIGHT } from '../constants'
import MapViewComponent from '../components/MapView'
import ScheduleDateTimeModal from '../components/ScheduleDateTimeModal'
import ChatScreen from './ChatScreen'
import FindingDriverScreen from './FindingDriverScreen'
import RideTracking from './RideTracking'

interface HireDriverScreenProps {
  isScheduled?: boolean
  setIsScheduled?: (value: boolean) => void
  carType?: 'sedan' | 'suv' | 'truck'
  setCarType?: (type: 'sedan' | 'suv' | 'truck') => void
  licensePlate?: string
  setLicensePlate?: (value: string) => void
  transmission?: 'auto' | 'manual'
  setTransmission?: (type: 'auto' | 'manual') => void
  driverNote?: string
  setDriverNote?: (value: string) => void
  pickupLocation?: string
  setPickupLocation?: (value: string) => void
  dropoffLocation?: string
  setDropoffLocation?: (value: string) => void
  setRideMode?: (mode: 'share' | 'hire') => void
}

export default function HireDriverScreen(props?: HireDriverScreenProps) {
  // Use local state if props not provided
  const [localIsScheduled, setLocalIsScheduled] = useState(false)
  const [localCarType, setLocalCarType] = useState<'sedan' | 'suv' | 'truck'>('sedan')
  const [localLicensePlate, setLocalLicensePlate] = useState('')
  const [localTransmission, setLocalTransmission] = useState<'auto' | 'manual'>('auto')
  const [localDriverNote, setLocalDriverNote] = useState('')
  const [localPickupLocation, setLocalPickupLocation] = useState('')
  const [localDropoffLocation, setLocalDropoffLocation] = useState('')

  // Use props if provided, otherwise use local state
  const isScheduled = props?.isScheduled ?? localIsScheduled
  const setIsScheduled = props?.setIsScheduled ?? setLocalIsScheduled
  const carType = props?.carType ?? localCarType
  const setCarType = props?.setCarType ?? setLocalCarType
  const licensePlate = props?.licensePlate ?? localLicensePlate
  const setLicensePlate = props?.setLicensePlate ?? setLocalLicensePlate
  const transmission = props?.transmission ?? localTransmission
  const setTransmission = props?.setTransmission ?? setLocalTransmission
  const driverNote = props?.driverNote ?? localDriverNote
  const setDriverNote = props?.setDriverNote ?? setLocalDriverNote
  const pickupLocation = props?.pickupLocation ?? localPickupLocation
  const setPickupLocation = props?.setPickupLocation ?? setLocalPickupLocation
  const dropoffLocation = props?.dropoffLocation ?? localDropoffLocation
  const setDropoffLocation = props?.setDropoffLocation ?? setLocalDropoffLocation
  const setRideMode = props?.setRideMode
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

    // Chỉ search nếu text >= 3 ký tự
    if (text.trim().length >= 3) {
      setShowDropoffSuggestions(true)
      // Debounce 500ms để giảm request
      const timeout = setTimeout(async () => {
        try {
          console.log('[Search] Dropoff search for:', text)
          const suggestions = await mapsService.searchPlaces(text)
          console.log('[Search] Dropoff suggestions received:', suggestions.length)
          setDropoffSuggestions(suggestions)
        } catch (error) {
          console.error('Error searching dropoff locations:', error)
          setDropoffSuggestions([])
        }
      }, 500)
      setDropoffSearchTimeout(timeout)
    } else {
      // Xóa suggestions nếu text < 3 ký tự
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

  // Initialize pickup location with current user location
  useEffect(() => {
    const initializePickupLocation = async () => {
      try {
        console.log('[HireDriverScreen] 📍 Requesting location permission...')
        const { status } = await Location.requestForegroundPermissionsAsync()
        
        if (status !== 'granted') {
          console.log('[HireDriverScreen] ⚠️ Location permission denied')
          return
        }

        console.log('[HireDriverScreen] ✅ Getting current position...')
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        })

        const { latitude, longitude } = location.coords
        console.log('[HireDriverScreen] 📍 Current position:', { latitude, longitude })

        // Reverse geocode to get address
        const address = await mapsService.reverseGeocode(latitude, longitude)
        console.log('[HireDriverScreen] 🏠 Address from coordinates:', address)
        
        setPickupLocation(address)
      } catch (error) {
        console.error('[HireDriverScreen] ❌ Error getting location:', error)
        // Fallback to default location
        setPickupLocation('Hà Nội, Việt Nam')
      }
    }

    initializePickupLocation()
  }, [])

  const handleScheduleDateTime = (dateTime: Date) => {
    setScheduledDateTime(dateTime)
    setShowScheduleModal(false)
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
      console.log('[HireDriverScreen] 🚗 ===== BẮT ĐẦU TÍNH GIÁ =====')
      console.log('[HireDriverScreen] 📍 Input:', {
        pickup: pickupLocation,
        dropoff: dropoffLocation,
        carType,
      })
      
      const route = await mapsService.getRouteInfo(pickupLocation, dropoffLocation)
      console.log('[HireDriverScreen] 🗺️ Route info:', {
        distance: route.distance + ' km',
        duration: route.duration + ' phút',
        pickup: route.pickup?.formattedAddress,
        dropoff: route.dropoff?.formattedAddress,
      })
      setRouteInfo(route)

      // ============ LÁI XE HỘ - Tính giá theo nghiệp vụ phí mở cửa + km miễn phí ============
      console.log('[HireDriverScreen] 💰 Calling calculateHireDriverFare with:', {
        distance: route.distance,
        carType,
      })
      
      const fare = await calculateHireDriverFare(route.distance, carType)
      
      console.log('[HireDriverScreen] ✅ Hire Driver Fare calculated:', {
        total: fare.total + 'đ',
        openingFee: fare.openingFee + 'đ',
        freeKm: fare.freeKm + 'km',
        extraKm: fare.extraKm + 'km',
        extraKmFee: fare.extraKmFee + 'đ',
        pricePerExtraKm: fare.pricePerExtraKm + 'đ/km',
        breakdown: `${fare.openingFee}đ + ${fare.extraKm}km × ${fare.pricePerExtraKm}đ = ${fare.total}đ`,
      })
      
      setFareEstimate(fare)

      console.log('[HireDriverScreen] 🎯 TỔNG KẾT:', { 
        distance: route.distance + ' km',
        finalPrice: fare.total + 'đ',
        formula: route.distance <= fare.freeKm 
          ? `Trong ${fare.freeKm}km miễn phí → Chỉ tính phí mở cửa ${fare.openingFee}đ`
          : `${fare.openingFee}đ + (${route.distance} - ${fare.freeKm})km × ${fare.pricePerExtraKm}đ/km = ${fare.total}đ`,
      })
      console.log('[HireDriverScreen] ===== KẾT THÚC TÍNH GIÁ =====\n')

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
        rideType: 'hire',
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
        baseFare: fareEstimate.total, // Tổng giá lái xe hộ
        distanceFare: fareEstimate.extraKmFee, // Phí vượt km
        timeFare: 0, // Không tính theo thời gian
        surgePricing: 0, // Lái xe hộ không có peak pricing
        carType,
        licensePlate,
        transmission,
        driverNote,
        isScheduled,
        scheduledTime: isScheduled ? scheduledDateTime.toISOString() : undefined,
        autoAssign: true, // Luôn tự động chỉ định tài xế
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
      <RideTracking
        route={{ params: { rideId } }}
        navigation={navigation}
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
    <View style={styles.container}>
      {/* Map Component */}
      <View style={StyleSheet.absoluteFillObject}>
        <MapViewComponent
          height={'100%'}
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
      </View>

      {/* Schedule DateTime Modal */}
      <ScheduleDateTimeModal
        visible={showScheduleModal}
        onConfirm={handleScheduleDateTime}
        onCancel={() => setShowScheduleModal(false)}
        minDateTime={new Date()}
      />

      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: "#fff" }]}
          onPress={() => {
            if (setRideMode) {
              setRideMode('share')
            } else {
              navigation.goBack()
            }
          }}
        >
          <MaterialIcons name="arrow-back" size={24} color="#FF6B00" />
        </TouchableOpacity>
        <Text style={styles.logoText}>firego</Text>
      </View>
      <View style={styles.card}>
        <View style={styles.handleBar} />
        {/* Title Section */}
        <View style={styles.cardHeader}>
          <MaterialCommunityIcons name="truck-delivery" size={28} color="#FF6B00" />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.cardTitle}>Lái xe hộ</Text>
            <Text style={styles.cardSubtitle}>Giúp bạn di chuyển an toàn và tiện lợi</Text>
          </View>
          {!calculating && (
            <TouchableOpacity
              style={styles.calculateButton}
              onPress={calculateEstimate}
              disabled={!pickupLocation || !dropoffLocation}
            >
              <Text style={styles.priceTagText}>
                {fareEstimate ? formatCurrency(fareEstimate.total) : '---'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollContent}>
          <View style={styles.locationsContainer}>
            {/* Pickup Location */}
            <View style={[styles.inputGroup, showPickupSuggestions && { zIndex: 100 }]}>
              <View style={styles.inputRow}>
                <View style={styles.iconWrapper}>
                  <MaterialIcons name="radio-button-checked" size={24} color="#FF6B00" />
                </View>
                <TextInput
                  style={styles.input}
                  value={pickupLocation}
                  onChangeText={handlePickupLocationChange}
                  onFocus={() => setShowPickupSuggestions(true)}
                  placeholder="Nhập điểm đón"
                  placeholderTextColor={colors.textSecondary}
                  editable={!isSearching && !driverFound}
                />
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
            </View>

            <View style={styles.locationDivider}>
              <View style={styles.dashedLine} />
            </View>

            {/* Dropoff Location */}
            <View style={[styles.inputGroup, showDropoffSuggestions && { zIndex: 100 }]}>
              <View style={styles.inputRow}>
                <View style={styles.iconWrapper}>
                  <MaterialIcons name="flag" size={24} color="#ef4444" />
                </View>
                <TextInput
                  style={styles.input}
                  value={dropoffLocation}
                  onChangeText={handleDropoffLocationChange}
                  onFocus={() => setShowDropoffSuggestions(true)}
                  placeholder="Bạn muốn đến đâu?"
                  placeholderTextColor={colors.textSecondary}
                  editable={!isSearching && !driverFound}
                />
              </View>

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
          </View>
          {/* Time Toggle */}
          <View style={[styles.timeToggleContainer, { backgroundColor: "#ff6b00" }]}>
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
            <Text style={styles.sectionLabel}>Thông tin xe</Text>

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
              <Text style={styles.sectionLabel}>Biển số xe</Text>
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
              <Text style={styles.sectionLabel}>Loại hộp số (Bắt buộc)</Text>
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
            <Text style={styles.sectionLabel}>Ghi chú cho tài xế</Text>
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
        </ScrollView>
        {/* Confirm Button */}
        <TouchableOpacity
          style={styles.confirmButton}
          onPress={handleCreateRide}
          activeOpacity={0.8}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.confirmButtonText}>Tìm tài xế ngay</Text>
              <MaterialIcons name="arrow-forward" size={20} color="#fff" />
            </>
          )}
        </TouchableOpacity>
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
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 15,
    maxHeight: '50%',
  },
  handleBar: {
    width: 40,
    height: 5,
    backgroundColor: '#D1D5DB',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.3,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  priceTagText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FF6B00',
  },
  scrollContent: {
    flex: 1,
    marginBottom: 16,
  },
  locationsContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    overflow: 'visible',
  },
  inputGroup: {
    marginBottom: 0,
    position: 'relative',
    zIndex: 1,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  iconWrapper: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
    backgroundColor: 'transparent',
    paddingVertical: 0,
  },
  locationDivider: {
    paddingVertical: 8,
    paddingLeft: 10,
  },
  dashedLine: {
    height: 20,
    width: 2,
    backgroundColor: '#D1D5DB',
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  section: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
    letterSpacing: -0.2,
  },
  confirmButton: {
    backgroundColor: '#FF6B00',
    paddingVertical: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  suggestionsDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    borderRadius: BORDER_RADIUS.lg,
    marginTop: SPACING.xs,
    borderWidth: 1,
    maxHeight: 200,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    backgroundColor: '#fff',
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
  timeButtonText: {
    fontSize: 12,
    fontWeight: '600',
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
  transmissionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  checkIcon: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
  },
  noteSection: {
    marginBottom: SPACING.md,
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
  autoAssignOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    marginBottom: SPACING.xl,
  },
  autoAssignLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    flex: 1,
  },
  autoAssignTextContainer: {
    flex: 1,
  },
  autoAssignTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  autoAssignDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
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
})