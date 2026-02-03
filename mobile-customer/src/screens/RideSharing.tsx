import { useState, useEffect, useRef } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  Switch,
  Dimensions,
  ActivityIndicator,
  Alert,
  FlatList,
  StatusBar,
  Modal,
} from 'react-native'
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons'
import DateTimePicker from '@react-native-community/datetimepicker'
import { useSelector } from 'react-redux'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RootState } from '../redux/store'
import type { RootStackParamList } from '../types'
import { COLORS_DARK, COLORS_LIGHT, SPACING, BORDER_RADIUS } from '../constants'
import { API_BASE_URL } from '../constants/config'
import MapViewComponent from '../components/MapView'
import FindingRideModal from '../components/FindingRideModal'
import { rideService } from '../services/rideService'
import { mapsService } from '../services/mapsService'

const { height } = Dimensions.get('window')
interface RideSharingProps {
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

export default function RideSharing(props?: RideSharingProps) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const [pickupLocation, setPickupLocation] = useState('')
  const [dropoffLocation, setDropoffLocation] = useState('')
  const [pickupCoordinates, setPickupCoordinates] = useState<[number, number]>([105.6909, 18.6867])
  const [dropoffCoordinates, setDropoffCoordinates] = useState<[number, number]>([105.6909, 18.6867])
  const [isImmediately, setIsImmediately] = useState(true)
  const [passengerCount, setPassengerCount] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [routeInfo, setRouteInfo] = useState<any>(null)
  const [isPickupSelected, setIsPickupSelected] = useState(false)
  const [isDropoffSelected, setIsDropoffSelected] = useState(false)
  const [isSelectingPickupOnMap, setIsSelectingPickupOnMap] = useState(false)
  const [isSelectingDropoffOnMap, setIsSelectingDropoffOnMap] = useState(false)
  const [isTimeModalVisible, setIsTimeModalVisible] = useState(false)
  const [selectedTime, setSelectedTime] = useState('Ngay bây giờ')
  const [selectedDateTime, setSelectedDateTime] = useState(new Date())
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showTimePicker, setShowTimePicker] = useState(false)
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date')
  const [loading, setLoading] = useState(false)

  // Places autocomplete states
  const [pickupSuggestions, setPickupSuggestions] = useState<any[]>([])
  const [dropoffSuggestions, setDropoffSuggestions] = useState<any[]>([])
  const [showPickupSuggestions, setShowPickupSuggestions] = useState(false)
  const [showDropoffSuggestions, setShowDropoffSuggestions] = useState(false)
  const [pickupSearchTimeout, setPickupSearchTimeout] = useState<NodeJS.Timeout | null>(null)
  const [dropoffSearchTimeout, setDropoffSearchTimeout] = useState<NodeJS.Timeout | null>(null)

  const [fareEstimate, setFareEstimate] = useState<any>(null)
  const [drivers, setDrivers] = useState<any[]>([])
  const user = useSelector((state: RootState) => state.auth.user)
  const themeMode = useSelector((state: RootState) => state.theme.mode)
  const colors = themeMode === 'dark' ? COLORS_DARK : COLORS_LIGHT
  const isMountedRef = useRef(true)
  const setRideMode = props?.setRideMode
  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Pricing now loaded from backend via pricing.ts getPricingConfig()

  // Fetch available drivers on app startup
  useEffect(() => {
    const fetchAvailableDrivers = async () => {
      try {
        console.log('[HomeScreen] 📍 Fetching drivers from /api/drivers/available')
        const response = await fetch(`${API_BASE_URL}/drivers/available`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        })

        console.log('[HomeScreen] Response status:', response.status)

        if (response.ok) {
          const data = await response.json()
          console.log('✅ [HomeScreen] Raw API response:', JSON.stringify(data, null, 2))
          console.log('✅ [HomeScreen] Total drivers from API:', data?.length)

          if (!data || data.length === 0) {
            console.warn('⚠️ [HomeScreen] No drivers returned from API')
            setDrivers([])
            return
          }

          // Format drivers data from API response
          const driversForMap = data.map((driver: any, index: number) => {
            // Extract coordinates from GeoJSON format
            const coordinates = driver.currentLocation?.coordinates || []
            const fullName = `${driver.firstName || 'Tài'} ${driver.lastName || 'xế'}`

            console.log(`[HomeScreen] Driver ${index + 1}:`, {
              name: fullName,
              currentLocation: driver.currentLocation,
              coordinates: coordinates,
            })

            const formattedDriver = {
              id: driver._id,
              latitude: coordinates[1], // GeoJSON: [longitude, latitude]
              longitude: coordinates[0],
              name: fullName,
              rating: driver.averageRating || 5,
              vehicle: driver.vehiclePlate || 'Chưa cập nhật',
              vehicleModel: driver.vehicleModel || '',
              totalRides: driver.totalRides || 0,
            }

            console.log('[HomeScreen] 🚗 Formatted driver:', formattedDriver)
            return formattedDriver
          })

          console.log('✅ [HomeScreen] Formatted drivers for map (total):', driversForMap.length)
          setDrivers(driversForMap)
        } else {
          console.error('[HomeScreen] API error - status:', response.status)
          const errorText = await response.text()
          console.error('[HomeScreen] Error response:', errorText)
        }
      } catch (error) {
        console.error('[HomeScreen] ❌ Fetch drivers error:', error)
        setDrivers([])
      }
    }
    fetchAvailableDrivers()
  }, [])

  const calculateRoute = async (startCoords: [number, number], endCoords: [number, number]) => {
    try {
      console.log('[HomeScreen] Calculating route...');
      const directions = await rideService.getDirections(
        startCoords[0],
        startCoords[1],
        endCoords[0],
        endCoords[1],
      );

      console.log('[HomeScreen] Raw directions response:', directions);

      // Handle different response formats from backend
      let distance = 0;
      let duration = 0;
      let routeCoordinates: Array<{ latitude: number, longitude: number }> = [];

      // Format: features[0].geometry.coordinates and properties.summary (from backend)
      if (directions.features?.[0]) {
        const feature = directions.features[0];

        // Get distance and duration
        if (feature.properties?.summary) {
          distance = feature.properties.summary.distance;
          duration = feature.properties.summary.duration;
        }

        // Get route coordinates from geometry
        if (feature.geometry?.coordinates) {
          // OSRM returns coordinates as [lng, lat] pairs
          routeCoordinates = feature.geometry.coordinates.map((coord: [number, number]) => ({
            latitude: coord[1],
            longitude: coord[0],
          }));
        }
      }
      // Fallback: direct properties
      else if (directions.distance !== undefined && directions.duration !== undefined) {
        distance = directions.distance;
        duration = directions.duration;
      }
      // Fallback: routes array
      else if (directions.routes?.[0]) {
        distance = directions.routes[0].distance;
        duration = directions.routes[0].duration;
        if (directions.routes[0].geometry?.coordinates) {
          routeCoordinates = directions.routes[0].geometry.coordinates.map((coord: [number, number]) => ({
            latitude: coord[1],
            longitude: coord[0],
          }));
        }
      }

      console.log('[HomeScreen] Extracted:', { distance, duration, routeCoordinatesCount: routeCoordinates.length });

      if (!distance || !duration || distance === 0 || duration === 0) {
        console.error('[HomeScreen] Invalid distance or duration:', { distance, duration });
        Alert.alert('Lỗi', 'Không thể tính tuyến đường. Vui lòng kiểm tra địa chỉ và thử lại.');
        return;
      }

      // Convert distance from meters to km if needed
      const distanceKm = distance > 500 ? distance / 1000 : distance;

      // Calculate fare in realtime
      let fareEstimate = null;
      try {
        console.log('[HomeScreen] About to calculate fare for:', { distanceKm, duration, vehicleType: 'basic' });
        fareEstimate = await rideService.calculateFare(
          distanceKm,
          duration / 60, // Convert seconds to minutes
          'basic' // Default to basic vehicle type
        );
        console.log('[HomeScreen] Fare result received:', fareEstimate);
      } catch (fareError) {
        console.error('[HomeScreen] Fare calculation threw error:', fareError);
        // Continue without fare calculation
      }

      console.log('[HomeScreen] Final fareEstimate before setState:', fareEstimate);

      setRouteInfo({
        distance: distanceKm,
        duration: duration,
        distanceText: `${distanceKm.toFixed(1)} km`,
        durationText: `~${Math.ceil(duration / 60)} phút`,
        routeCoordinates: routeCoordinates,
        fareEstimate: fareEstimate,
      });

      // Also set the fareEstimate state
      if (fareEstimate) {
        setFareEstimate(fareEstimate);
      }

      console.log('[HomeScreen] Route info set:', { distanceKm, duration, routeCoordinatesCount: routeCoordinates.length, fare: fareEstimate });
    } catch (error: any) {
      console.error('[HomeScreen] Route calculation error:', error);
      Alert.alert('Lỗi', error.message || 'Không thể tính toán tuyến đường');
    }
  };

  const handleFindRide = async () => {
    try {
      // Validation
      if (!pickupLocation.trim()) {
        Alert.alert('Lỗi', 'Vui lòng nhập điểm đón')
        return
      }

      if (!dropoffLocation.trim()) {
        Alert.alert('Lỗi', 'Vui lòng nhập điểm đến')
        return
      }

      if (!user?.id) {
        Alert.alert('Lỗi', 'Vui lòng đăng nhập trước')
        return
      }

      // Nếu chưa tính giá, tính trước
      if (!routeInfo || !fareEstimate) {
        Alert.alert(
          'Chưa tính giá',
          'Vui lòng chờ hệ thống tính toán hoặc kiểm tra lại địa chỉ!',
          [{ text: 'OK' }]
        )
        return
      }

      setIsLoading(true)

      // Validate coordinates exist and are valid
      if (!pickupCoordinates || !Array.isArray(pickupCoordinates) || pickupCoordinates.length !== 2) {
        Alert.alert('Lỗi', 'Vị trí đón khách không hợp lệ')
        console.error('[HomeScreen] Invalid pickupCoordinates:', pickupCoordinates)
        setIsLoading(false)
        return
      }

      if (!dropoffCoordinates || !Array.isArray(dropoffCoordinates) || dropoffCoordinates.length !== 2) {
        Alert.alert('Lỗi', 'Vị trí trả khách không hợp lệ')
        console.error('[HomeScreen] Invalid dropoffCoordinates:', dropoffCoordinates)
        setIsLoading(false)
        return
      }

      console.log('[HomeScreen] Navigate to FindingRideScreen with params:', {
        distance: routeInfo.distance,
        duration: routeInfo.duration,
        startLng: pickupCoordinates[0],
        startLat: pickupCoordinates[1],
        endLng: dropoffCoordinates[0],
        endLat: dropoffCoordinates[1],
        pickupAddress: pickupLocation,
        dropoffAddress: dropoffLocation,
      })

      // Navigate to FindingRideScreen
      navigation.navigate('FindingRideScreen', {
        distance: routeInfo.distance,
        duration: routeInfo.duration,
        startLng: pickupCoordinates[0],
        startLat: pickupCoordinates[1],
        endLng: dropoffCoordinates[0],
        endLat: dropoffCoordinates[1],
        pickupAddress: pickupLocation,
        dropoffAddress: dropoffLocation,
       
      })

      setIsLoading(false)
    } catch (error: any) {
      if (!isMountedRef.current) return

      setIsLoading(false)
      console.error('[HomeScreen] handleFindRide error:', error)
      Alert.alert('Lỗi', error.message || 'Không thể xử lý yêu cầu')
    }
  }

  const handleCancelFinding = () => {
    setIsLoading(false)
  }

  const handlePickupLocationChange = (text: string) => {
    setPickupLocation(text)

    if (pickupSearchTimeout) {
      clearTimeout(pickupSearchTimeout)
    }

    if (text.trim().length >= 3) {
      setShowPickupSuggestions(true)
      const timeout = setTimeout(async () => {
        try {
          console.log('[Delivery] Pickup search for:', text)
          const suggestions = await mapsService.searchPlaces(text)
          console.log('[Delivery] Pickup suggestions received:', suggestions.length)
          setPickupSuggestions(suggestions)
        } catch (error) {
          console.error('Error searching pickup locations:', error)
          setPickupSuggestions([])
        }
      }, 500)
      setPickupSearchTimeout(timeout)
    } else {
      setPickupSuggestions([])
      if (text.trim().length === 0) {
        setShowPickupSuggestions(false)
      }
    }
  }
  const handlePickupSuggestionSelect = async (suggestion: any) => {
    setPickupLocation(suggestion.fullText)
    setShowPickupSuggestions(false)
    setPickupSuggestions([])
    
    // Gọi geocode API để lấy tọa độ thực tế
    try {
      console.log('[RideSharing] Geocoding pickup location:', suggestion.fullText)
      const geocodeResult = await mapsService.geocodeAddress(suggestion.fullText)

      if (geocodeResult && geocodeResult.coordinates) {
        const coords: [number, number] = [
          geocodeResult.coordinates.longitude,
          geocodeResult.coordinates.latitude
        ]
        setPickupCoordinates(coords)
        setIsPickupSelected(true)
        console.log('[RideSharing] Pickup coordinates set:', coords)

        // Tự động tính tuyến đường nếu đã có điểm đến
        if (dropoffLocation.trim() && isDropoffSelected) {
          console.log('[RideSharing] Auto-calculating route...')
          await calculateRoute(coords, dropoffCoordinates)
        }
      }
    } catch (error) {
      console.error('[RideSharing] Geocoding error:', error)
      Alert.alert('Lỗi', 'Không thể lấy tọa độ điểm đón')
    }
  }

  const handleDropoffLocationChange = (text: string) => {
    setDropoffLocation(text)

    if (dropoffSearchTimeout) {
      clearTimeout(dropoffSearchTimeout)
    }

    if (text.trim().length >= 3) {
      setShowDropoffSuggestions(true)
      const timeout = setTimeout(async () => {
        try {
          console.log('[Delivery] Dropoff search for:', text)
          const suggestions = await mapsService.searchPlaces(text)
          console.log('[Delivery] Dropoff suggestions received:', suggestions.length)
          setDropoffSuggestions(suggestions)
        } catch (error) {
          console.error('Error searching dropoff locations:', error)
          setDropoffSuggestions([])
        }
      }, 500)
      setDropoffSearchTimeout(timeout)
    } else {
      setDropoffSuggestions([])
      if (text.trim().length === 0) {
        setShowDropoffSuggestions(false)
      }
    }
  }
  const handleDropoffSuggestionSelect = async (suggestion: any) => {
    setDropoffLocation(suggestion.fullText)
    setShowDropoffSuggestions(false)
    setDropoffSuggestions([])
    
    // Gọi geocode API để lấy tọa độ thực tế
    try {
      console.log('[RideSharing] Geocoding dropoff location:', suggestion.fullText)
      const geocodeResult = await mapsService.geocodeAddress(suggestion.fullText)

      if (geocodeResult && geocodeResult.coordinates) {
        const coords: [number, number] = [
          geocodeResult.coordinates.longitude,
          geocodeResult.coordinates.latitude
        ]
        setDropoffCoordinates(coords)
        setIsDropoffSelected(true)
        console.log('[RideSharing] Dropoff coordinates set:', coords)

        // Tự động tính tuyến đường nếu đã có điểm đón
        if (pickupLocation.trim() && isPickupSelected) {
          console.log('[RideSharing] Auto-calculating route...')
          await calculateRoute(pickupCoordinates, coords)
        }
      }
    } catch (error) {
      console.error('[RideSharing] Geocoding error:', error)
      Alert.alert('Lỗi', 'Không thể lấy tọa độ điểm đến')
    }
  }
  return (
    <View style={styles.container}>
      <View style={StyleSheet.absoluteFillObject}>
        <MapViewComponent
          height={"100%"}
          initialRegion={{
            latitude: pickupCoordinates[1],
            longitude: pickupCoordinates[0],
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
          }}
          markers={[]}
          pickupCoords={isPickupSelected ? {
            latitude: pickupCoordinates[1],
            longitude: pickupCoordinates[0],
          } : undefined}
          dropoffCoords={isDropoffSelected ? {
            latitude: dropoffCoordinates[1],
            longitude: dropoffCoordinates[0],
          } : undefined}
          routeCoordinates={routeInfo?.routeCoordinates || []}
          drivers={drivers}
        />
      </View>
      {/* Header with Map */}
      <View style={styles.header}>
        <TouchableOpacity style={[styles.backButton, { backgroundColor: "#fff" }]} onPress={() => {
          if (setRideMode) {
            setRideMode('share')
          } else {
            navigation.goBack()
          }
        }}>
          <MaterialIcons name="arrow-back" size={24} color="#FF6B00" />
        </TouchableOpacity>
        <Text style={styles.logoText}>firego</Text>

        {/* Map Display with Route */}
        {/* Expand Map Button - Always visible */}
        {/* <TouchableOpacity
          style={[styles.expandMapButton, { backgroundColor: colors.primary }]}
          onPress={handleExpandMap}
          activeOpacity={0.8}
        >
          <MaterialIcons name="fullscreen" size={22} color="#fff" />
        </TouchableOpacity> */}
      </View>
      {/* Finding Ride Modal */}
      <FindingRideModal
        visible={isLoading}
        pickupLocation={pickupLocation}
        dropoffLocation={dropoffLocation}
        price="45.000đ"
        duration="~15 phút"
        onCancel={handleCancelFinding}
      />

      {/* Time Selection Modal */}
      <Modal
        visible={isTimeModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsTimeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.bg }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Chọn thời gian</Text>
              <TouchableOpacity onPress={() => setIsTimeModalVisible(false)}>
                <MaterialIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Date and Time Display */}
            <View style={styles.dateTimeDisplayContainer}>
              <TouchableOpacity
                style={[styles.dateTimeButton, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}
                onPress={() => setShowDatePicker(true)}
              >
                <MaterialIcons name="calendar-today" size={20} color={colors.primary} />
                <Text style={[styles.dateTimeButtonText, { color: colors.text }]}>
                  {String(selectedDateTime.getDate()).padStart(2, '0')}/{String(selectedDateTime.getMonth() + 1).padStart(2, '0')}/{selectedDateTime.getFullYear()}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.dateTimeButton, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}
                onPress={() => setShowTimePicker(true)}
              >
                <MaterialIcons name="schedule" size={20} color={colors.primary} />
                <Text style={[styles.dateTimeButtonText, { color: colors.text }]}>
                  {String(selectedDateTime.getHours()).padStart(2, '0')}:{String(selectedDateTime.getMinutes()).padStart(2, '0')}
                </Text>
              </TouchableOpacity>
            </View>

            {/* DateTimePicker */}
            {showDatePicker && (
              <DateTimePicker
                value={selectedDateTime}
                mode="date"
                display="spinner"
                onChange={(event, date) => {
                  if (date) {
                    setSelectedDateTime(date)
                    setShowDatePicker(false)
                  }
                }}
                textColor={colors.text}
              />
            )}

            {showTimePicker && (
              <DateTimePicker
                value={selectedDateTime}
                mode="time"
                display="spinner"
                onChange={(event, date) => {
                  if (date) {
                    setSelectedDateTime(date)
                    setShowTimePicker(false)
                  }
                }}
                textColor={colors.text}
              />
            )}

            <View style={[styles.modalFooter, { borderTopColor: colors.border, backgroundColor: colors.bgSecondary }]}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={() => setSelectedDateTime(new Date())}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>Bây giờ</Text>
              </TouchableOpacity>
              <View style={[styles.modalButtonDivider, { backgroundColor: colors.border }]} />
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={() => {
                  const dateStr = `${String(selectedDateTime.getDate()).padStart(2, '0')}/${String(selectedDateTime.getMonth() + 1).padStart(2, '0')} ${String(selectedDateTime.getHours()).padStart(2, '0')}:${String(selectedDateTime.getMinutes()).padStart(2, '0')}`
                  setSelectedTime(dateStr)
                  setIsTimeModalVisible(false)
                }}
              >
                <Text style={styles.modalButtonTextPrimary}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <View style={styles.card}>
        <View style={styles.handleBar} />
        {/* Title Section */}
        <View style={styles.cardHeader}>
          <MaterialCommunityIcons name="truck-delivery" size={28} color="#FF6B00" />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.cardTitle}>Ghép xe nhanh</Text>
            <Text style={styles.cardSubtitle}>Mọi người cùng đi</Text>
          </View>
          {/* {estimatedPrice > 0 && (
                        <View style={styles.priceTag}>
                            <Text style={styles.priceTagText}>~{estimatedPrice.toLocaleString('vi-VN')}đ</Text>
                        </View>
                    )} */}
          {routeInfo?.fareEstimate ? (
            <View>
              <Text style={styles.priceValue}>{(routeInfo.fareEstimate.totalFare || routeInfo.fareEstimate.total)?.toLocaleString() || 'Tính toán...'}đ</Text>
              <View style={styles.fareBreakdown}>
                <Text style={[styles.fareBreakdownItem, { color: colors.textSecondary }]}>
                </Text>
              </View>
            </View>
          ) : null}
        </View>

        <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollContent}>
          {/* Locations Section */}
          <View style={styles.locationsContainer}>
            <View style={[styles.inputGroup, showPickupSuggestions && { zIndex: 100 }]}>
              <View style={styles.inputRow}>
                <View style={styles.iconWrapper}>
                  <MaterialIcons name="radio-button-checked" size={20} color="#FF6B00" />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Nhập điểm đón..."
                  placeholderTextColor="#9CA3AF"
                  value={pickupLocation}
                  onChangeText={handlePickupLocationChange}
                  onFocus={() => setShowPickupSuggestions(true)}
                />
              </View>
              {showPickupSuggestions && pickupSuggestions.length > 0 && (
                <ScrollView
                  style={styles.suggestionsDropdown}
                  keyboardShouldPersistTaps="handled"
                  nestedScrollEnabled={true}
                >
                  {pickupSuggestions.map((item, index) => (
                    <TouchableOpacity
                      key={`pickup-${index}`}
                      style={styles.suggestionItem}
                      onPress={() => handlePickupSuggestionSelect(item)}
                    >
                      <MaterialIcons name="location-on" size={20} color="#6B7280" />
                      <View style={styles.suggestionContent}>
                        <Text style={styles.suggestionMainText}>{item.mainText}</Text>
                        <Text style={styles.suggestionSecondaryText}>{item.secondaryText}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>

            <View style={styles.locationDivider}>
              <View style={styles.dashedLine} />
            </View>

            <View style={[styles.inputGroup, showDropoffSuggestions && { zIndex: 100 }]}>
              <View style={styles.inputRow}>
                <View style={styles.iconWrapper}>
                  <MaterialIcons name="flag" size={20} color="#ef4444" />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Nhập điểm đến..."
                  placeholderTextColor="#9CA3AF"
                  value={dropoffLocation}
                  onChangeText={handleDropoffLocationChange}
                  onFocus={() => setShowDropoffSuggestions(true)}
                />
              </View>
              {showDropoffSuggestions && dropoffSuggestions.length > 0 && (
                <ScrollView
                  style={styles.suggestionsDropdown}
                  keyboardShouldPersistTaps="handled"
                  nestedScrollEnabled={true}
                >
                  {dropoffSuggestions.map((item, index) => (
                    <TouchableOpacity
                      key={`dropoff-${index}`}
                      style={styles.suggestionItem}
                      onPress={() => handleDropoffSuggestionSelect(item)}
                    >
                      <MaterialIcons name="location-on" size={20} color="#6B7280" />
                      <View style={styles.suggestionContent}>
                        <Text style={styles.suggestionMainText}>{item.mainText}</Text>
                        <Text style={styles.suggestionSecondaryText}>{item.secondaryText}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
          </View>

          {/* Time & Passenger Section */}
          <View style={styles.timePassengerSection}>
            <View style={[styles.timeWrapper, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}>
              <View>
                <Text style={[styles.timeLabel, { color: colors.textSecondary }]}>Thời gian</Text>
                <View style={styles.immediateBox}>
                  <Text style={[styles.immediateText, { color: colors.text }]}>{selectedTime}</Text>
                  <TouchableOpacity onPress={() => setIsTimeModalVisible(true)}>
                    <Text style={styles.immediateSubtext}>(Thay đổi)</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <Switch
                value={isImmediately}
                onValueChange={setIsImmediately}
                trackColor={{ false: colors.border, true: `${colors.primary}50` }}
                thumbColor={colors.primary}
                style={styles.switch}
              />
            </View>

            <View style={[styles.passengerWrapper, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}>
              <Text style={[styles.passengerLabel, { color: colors.textSecondary }]}>Số khách</Text>
              <View style={styles.passengerControls}>
                <TouchableOpacity
                  style={[styles.passengerButton, { backgroundColor: colors.border, borderColor: colors.border }]}
                  onPress={() => {
                    if (passengerCount > 1) setPassengerCount(passengerCount - 1)
                  }}
                >
                  <Text style={[styles.passengerButtonText, { color: colors.textSecondary }]}>−</Text>
                </TouchableOpacity>
                <Text style={[styles.passengerCount, { color: colors.text }]}>{passengerCount}</Text>
                <TouchableOpacity
                  style={[styles.passengerButton, { backgroundColor: colors.border, borderColor: colors.border }]}
                  onPress={() => {
                    if (passengerCount < 6) setPassengerCount(passengerCount + 1)
                  }}
                >
                  <Text style={[styles.passengerButtonText, { color: colors.textSecondary }]}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Route Map & Info */}
          {routeInfo && (
            <View style={[styles.routeSection, { backgroundColor: colors.bgSecondary }]}>
              {/* Route Info */}
              <View style={[styles.routeInfo, { borderTopColor: colors.border }]}>
                <View style={styles.routeInfoItem}>
                  <MaterialIcons name="straighten" size={18} color="#FF6B00" />
                  <Text style={[styles.routeText, { color: colors.text }]}>
                    {routeInfo.distanceText}
                  </Text>
                </View>
                <View style={styles.routeInfoDivider} />
                <View style={styles.routeInfoItem}>
                  <MaterialIcons name="schedule" size={18} color="#FF6B00" />
                  <Text style={[styles.routeText, { color: colors.text }]}>
                    {routeInfo.durationText}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Confirm Button */}
        <TouchableOpacity
          style={styles.confirmButton}
          onPress={handleFindRide}
          activeOpacity={0.8}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.confirmButtonText}>Tìm chuyến xe</Text>
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
  },
  inputGroup: {
    marginBottom: 0,
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
  timePassengerSection: {
    flexDirection: 'row',
    gap: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  timeWrapper: {
    flex: 1,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    flexDirection: 'column',
    justifyContent: 'space-between',
    borderWidth: 1,
  },
  timeLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  immediateBox: {
    marginBottom: SPACING.md,
  },
  immediateText: {
    fontSize: 14,
    fontWeight: '700',
  },
  immediateSubtext: {
    fontSize: 11,
    fontWeight: '500',
    color: '#FF6B00',
    marginTop: SPACING.xs,
  },
  switch: {
    marginTop: SPACING.md,
  },
  passengerWrapper: {
    flex: 1,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
  },
  passengerLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: SPACING.md,
  },
  passengerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    justifyContent: 'center',
  },
  passengerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  passengerButtonText: {
    fontSize: 20,
    fontWeight: '700',
  },
  passengerCount: {
    fontSize: 18,
    fontWeight: '700',
    minWidth: 30,
    textAlign: 'center',
  },
  routeSection: {
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    marginBottom: SPACING.xl,
  },
  routeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
  },
  routeInfoItem: {
    flex: 1,
    alignItems: 'center',
    gap: SPACING.sm,
  },
  routeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  routeInfoDivider: {
    width: 1,
    height: 50,
    opacity: 0.2,
  },
  priceValue: {
    fontSize: 20,
    fontWeight: '400',
    color: '#FF6B00',
  },
  fareBreakdown: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 107, 0, 0.2)',
    gap: SPACING.xs,
  },
  fareBreakdownItem: {
    fontSize: 16,
    fontWeight: '500',
  },
  suggestionsContainer: {
    marginTop: SPACING.sm,
    marginBottom: SPACING.lg,
    backgroundColor: '#1a202c',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: '#374151',
    overflow: 'hidden',
    maxHeight: 300,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  suggestionName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
    marginBottom: SPACING.xs,
  },
  suggestionAddress: {
    fontSize: 11,
    color: '#64748b',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    maxHeight: '80%',
    paddingBottom: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  dateTimeDisplayContainer: {
    flexDirection: 'row',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
  },
  dateTimeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
  },
  dateTimeButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalFooter: {
    flexDirection: 'row',
    borderTopWidth: 1,
    overflow: 'hidden',
  },
  modalButton: {
    flex: 1,
    paddingVertical: SPACING.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalButtonSecondary: {
    backgroundColor: 'transparent',
  },
  modalButtonPrimary: {
    backgroundColor: '#FF6B00',
  },
  modalButtonDivider: {
    width: 1,
    height: '100%',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonTextPrimary: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  suggestionsDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    borderRadius: BORDER_RADIUS.lg,
    marginTop: SPACING.xs,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    maxHeight: 200,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    backgroundColor: '#fff',
  },
  suggestionContent: {
    flex: 1,
  },
  suggestionMainText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    marginBottom: SPACING.xs,
  },
  suggestionSecondaryText: {
    fontSize: 12,
    color: '#6B7280',
  },
})
// 00',
//     color: '#111827',
//     marginBottom: SPACING.xs,
//   },
//   suggestionSecondaryText: {
//     fontSize: 12,
//     color: '#6B7280',
//   },
// })
