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
import { MaterialIcons } from '@expo/vector-icons'
import DateTimePicker from '@react-native-community/datetimepicker'
import { useSelector } from 'react-redux'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RootState } from '../redux/store'
import type { RootStackParamList } from '../types'
import { COLORS_DARK, COLORS_LIGHT, SPACING, BORDER_RADIUS } from '../constants'
import { API_BASE_URL } from '../constants/config'
import MapViewComponent from '../components/MapView'
import HireDriverScreen from './HireDriverScreen'
import Delivery from './Delivery'
import FindingRideModal from '../components/FindingRideModal'
import { rideService } from '../services/rideService'
import { useDebounce } from '../hooks'
import { placesService } from '../services/placesService'

const { height } = Dimensions.get('window')

export default function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const [rideMode, setRideMode] = useState<'share' | 'hire' | 'delivery'>('share' as const)
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

  // Places autocomplete states
  const [pickupSuggestions, setPickupSuggestions] = useState<any[]>([])
  const [dropoffSuggestions, setDropoffSuggestions] = useState<any[]>([])
  const [isSearchingPickup, setIsSearchingPickup] = useState(false)
  const [isSearchingDropoff, setIsSearchingDropoff] = useState(false)

  // Debounce inputs - chỉ gọi API sau khi user dừng gõ 500ms
  const debouncedPickupLocation = useDebounce(pickupLocation, 500)
  const debouncedDropoffLocation = useDebounce(dropoffLocation, 500)

  // Share ride additional states
  // @ts-ignore - Used for future features
  const [fareEstimate, setFareEstimate] = useState<any>(null)
  // @ts-ignore - Used for future features
  const [calculating, setCalculating] = useState(false)

  // Share ride - Driver finding states
  // @ts-ignore - Used for future features
  const [isSearching, setIsSearching] = useState(false)
  // @ts-ignore - Used for future features
  const [driverFound, setDriverFound] = useState(false)
  // @ts-ignore - Used for future features
  const [driver, setDriver] = useState<any>(null)
  // @ts-ignore - Used for future features
  const [driverLocation, setDriverLocation] = useState<any>(null)
  // @ts-ignore - Used for future features
  const [rideId, setRideId] = useState<string | null>(null)
  // @ts-ignore - Used for future features
  const [drivers, setDrivers] = useState<any[]>([])

  // Hire driver mode states
  const [carType, setCarType] = useState<'sedan' | 'suv' | 'truck'>('sedan')
  const [licensePlate, setLicensePlate] = useState('')
  const [transmission, setTransmission] = useState<'auto' | 'manual'>('auto')
  const [driverNote, setDriverNote] = useState('')
  const [isScheduled, setIsScheduled] = useState(false)

  const user = useSelector((state: RootState) => state.auth.user)
  const themeMode = useSelector((state: RootState) => state.theme.mode)
  const colors = themeMode === 'dark' ? COLORS_DARK : COLORS_LIGHT
  const isMountedRef = useRef(true)

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

  // 🔍 Search pickup location when debounced value changes
  useEffect(() => {
    console.log('🔄 [HomeScreen] Debounced pickup changed:', debouncedPickupLocation);
    if (debouncedPickupLocation && debouncedPickupLocation.length >= 3) {
      console.log('🔍 [HomeScreen] Searching pickup:', debouncedPickupLocation);
      searchPickupPlaces(debouncedPickupLocation);
    } else {
      console.log('⏭️ [HomeScreen] Skipping search - keyword too short:', debouncedPickupLocation?.length || 0);
      setPickupSuggestions([]);
    }
  }, [debouncedPickupLocation]);

  // 🔍 Search dropoff location when debounced value changes
  useEffect(() => {
    console.log('🔄 [HomeScreen] Debounced dropoff changed:', debouncedDropoffLocation);
    if (debouncedDropoffLocation && debouncedDropoffLocation.length >= 3) {
      console.log('🔍 [HomeScreen] Searching dropoff:', debouncedDropoffLocation);
      searchDropoffPlaces(debouncedDropoffLocation);
    } else {
      console.log('⏭️ [HomeScreen] Skipping search - keyword too short:', debouncedDropoffLocation?.length || 0);
      setDropoffSuggestions([]);
    }
  }, [debouncedDropoffLocation]);

  // Search pickup places
  const searchPickupPlaces = async (keyword: string) => {
    try {
      setIsSearchingPickup(true);
      const response = await placesService.searchPlaces(keyword);
      console.log(
        `📍 Pickup search (${response.source}):`,
        response.results.length,
        'results'
      );
      setPickupSuggestions(response.results);
    } catch (error) {
      console.error('Error searching pickup places:', error);
      setPickupSuggestions([]);
    } finally {
      setIsSearchingPickup(false);
    }
  };

  // Search dropoff places
  const searchDropoffPlaces = async (keyword: string) => {
    try {
      setIsSearchingDropoff(true);
      const response = await placesService.searchPlaces(keyword);
      console.log(
        `📍 Dropoff search (${response.source}):`,
        response.results.length,
        'results'
      );
      setDropoffSuggestions(response.results);
    } catch (error) {
      console.error('Error searching dropoff places:', error);
      setDropoffSuggestions([]);
    } finally {
      setIsSearchingDropoff(false);
    }
  };

  // Select pickup place
  const selectPickupPlace = async (place: any) => {
    console.log('🎯 [HomeScreen] Selecting pickup place:', place);
    if (!place) {
      console.error('❌ Invalid place data:', place);
      return;
    }
    const placeName = place.name || place.address;
    if (!placeName) {
      console.error('❌ Place has no name or address:', place);
      return;
    }

    // Set location name immediately
    setPickupLocation(placeName);
    setPickupSuggestions([]);

    // ⚡ Lazy load coordinates if not available
    let coords: [number, number] = [place.lng || 0, place.lat || 0];
    const hasValidCoords = place.lat && place.lng && place.lat !== 0 && place.lng !== 0;

    if (!hasValidCoords && place.placeId) {
      console.log('📡 [HomeScreen] Fetching coordinates for:', place.placeId);
      try {
        const details = await placesService.getPlaceDetails(place.placeId);
        if (details && details.lat && details.lng && details.lat !== 0 && details.lng !== 0) {
          coords = [details.lng, details.lat];
          console.log('✅ Coordinates fetched:', coords);
        } else {
          console.warn('⚠️ No valid coordinates from API, using default');
          coords = [105.8542, 21.0285];
        }
      } catch (error) {
        console.error('❌ Error fetching place details:', error);
        coords = [105.8542, 21.0285];
      }
    }

    setPickupCoordinates(coords);
    setIsPickupSelected(true);
    console.log('✅ Pickup place selected:', placeName, coords);
  };

  // Select dropoff place
  const selectDropoffPlace = async (place: any) => {
    console.log('🎯 [HomeScreen] Selecting dropoff place:', place);
    if (!place) {
      console.error('❌ Invalid place data:', place);
      return;
    }
    const placeName = place.name || place.address;
    if (!placeName) {
      console.error('❌ Place has no name or address:', place);
      return;
    }

    // Set location name immediately
    setDropoffLocation(placeName);
    setDropoffSuggestions([]);

    // ⚡ Lazy load coordinates if not available
    let coords: [number, number] = [place.lng || 0, place.lat || 0];
    const hasValidCoords = place.lat && place.lng && place.lat !== 0 && place.lng !== 0;

    if (!hasValidCoords && place.placeId) {
      console.log('📡 [HomeScreen] Fetching coordinates for:', place.placeId);
      try {
        const details = await placesService.getPlaceDetails(place.placeId);
        if (details && details.lat && details.lng && details.lat !== 0 && details.lng !== 0) {
          coords = [details.lng, details.lat];
          console.log('✅ Coordinates fetched:', coords);
        } else {
          console.warn('⚠️ No valid coordinates from API, using default');
          coords = [105.8542, 21.0285];
        }
      } catch (error) {
        console.error('❌ Error fetching place details:', error);
        coords = [105.8542, 21.0285];
      }
    }

    setDropoffCoordinates(coords);
    setIsDropoffSelected(true);
    console.log('✅ Dropoff place selected:', placeName, coords);

    // 🔄 Auto-calculate route when both locations are set
    if (pickupLocation.trim()) {
      await calculateRoute(pickupCoordinates, coords);
    }
  };

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

      // ✅ Calculate fare before navigating
      const distanceKm = routeInfo.distance > 500 ? routeInfo.distance / 1000 : routeInfo.distance
      const durationMin = routeInfo.duration / 60

      console.log('[HomeScreen] Calculating fare:', { distanceKm, durationMin })
      
      const fareEstimate = await rideService.calculateFare(distanceKm, durationMin, 'basic')
      const totalFare = fareEstimate?.totalFare || fareEstimate?.total || 50000

      console.log('[HomeScreen] ✅ Calculated totalFare:', totalFare)

      // Validate params with fallbacks
      const distance = routeInfo?.distance ?? 0
      const duration = routeInfo?.duration ?? 0
      const startLng = pickupCoordinates ? pickupCoordinates[0] : 0
      const startLat = pickupCoordinates ? pickupCoordinates[1] : 0
      const endLng = dropoffCoordinates ? dropoffCoordinates[0] : 0
      const endLat = dropoffCoordinates ? dropoffCoordinates[1] : 0
      const pickupAddress = pickupLocation ?? 'Unknown'
      const dropoffAddress = dropoffLocation ?? 'Unknown'

      // Navigate to FindingRideScreen with ride details
      // @ts-ignore - FindingRideScreen accepts params
      navigation.navigate('FindingRideScreen', {
        pickupAddress,
        dropoffAddress,
        distance,
        duration,
        startLng,
        startLat,
        endLng,
        endLat,
        totalFare,  // ✅ Add calculated fare
        seats: 1,   // ✅ Add default seats
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

  const handleExpandMap = () => {
    navigation.navigate('FullscreenMap', {
      pickupCoordinates,
      dropoffCoordinates,
      pickupCoords: isPickupSelected ? {
        latitude: pickupCoordinates[1],
        longitude: pickupCoordinates[0],
      } : undefined,
      dropoffCoords: isDropoffSelected ? {
        latitude: dropoffCoordinates[1],
        longitude: dropoffCoordinates[0],
      } : undefined,
      routeCoordinates: routeInfo?.routeCoordinates || [],
      drivers,
      routeInfo,
    })
  }

  const handleOpenNotifications = () => {
    navigation.navigate('Notification')
  }

  const handleMapLocationSelect = async (location: { latitude: number; longitude: number }) => {
    try {
      if (isSelectingPickupOnMap) {
        setPickupCoordinates([location.longitude, location.latitude])
        setIsPickupSelected(true)
        setIsSelectingPickupOnMap(false)
        // Try to reverse geocode to get address
        try {
          const response = await placesService.reverseGeocode(location.latitude, location.longitude)
          if (response && response.address) {
            setPickupLocation(response.address)
          } else {
            setPickupLocation(`${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`)
          }
        } catch (error) {
          setPickupLocation(`${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`)
        }
        Alert.alert('Thành công', 'Đã chọn điểm đón')
      } else if (isSelectingDropoffOnMap) {
        setDropoffCoordinates([location.longitude, location.latitude])
        setIsDropoffSelected(true)
        setIsSelectingDropoffOnMap(false)
        // Try to reverse geocode to get address
        try {
          const response = await placesService.reverseGeocode(location.latitude, location.longitude)
          if (response && response.address) {
            setDropoffLocation(response.address)
          } else {
            setDropoffLocation(`${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`)
          }
        } catch (error) {
          setDropoffLocation(`${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`)
        }
        Alert.alert('Thành công', 'Đã chọn điểm đến')
        // Auto-calculate route
        if (pickupLocation.trim()) {
          await calculateRoute(pickupCoordinates, [location.longitude, location.latitude])
        }
      }
    } catch (error) {
      console.error('Error selecting location on map:', error)
      Alert.alert('Lỗi', 'Không thể chọn vị trí')
    }
  }


  if (rideMode === 'hire') {
    return <HireDriverScreen {...{ isScheduled, setIsScheduled, carType, setCarType, licensePlate, setLicensePlate, transmission, setTransmission, driverNote, setDriverNote, pickupLocation, setPickupLocation, dropoffLocation, setDropoffLocation, setRideMode }} />
  }

  if (rideMode === 'delivery') {
    return (
      <Delivery
        setRideMode={setRideMode}
        onNavigateToConfirm={(params) => {
          navigation.navigate('ConfirmDelivery', params)
        }}
      />
    )
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar
        barStyle={themeMode === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={colors.bg}
      />
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

      {/* Header with Map */}
      <View style={[styles.headerSection, { backgroundColor: colors.bgSecondary }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#FF6B00" />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Đặt xe ghép</Text>
          <TouchableOpacity style={styles.settingsButton} onPress={handleOpenNotifications}>
            <MaterialIcons name="notifications" size={24} color="#FF6B00" />
          </TouchableOpacity>
        </View>

        {/* Map Display with Route */}
        <View style={styles.mapWrapper}>
          <MapViewComponent
            height={275}
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
            onLocationSelect={(location) => {
              handleMapLocationSelect(location)
            }}
          />
        </View>
        {/* Expand Map Button - Always visible */}
        <TouchableOpacity
          style={[styles.expandMapButton, { backgroundColor: colors.primary }]}
          onPress={handleExpandMap}
          activeOpacity={0.8}
        >
          <MaterialIcons name="fullscreen" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Ride Mode Toggle */}
        <View style={styles.rideTypeContainer}>
          <TouchableOpacity
            style={[
              styles.rideTypeButton,
              {
                backgroundColor: rideMode === 'share' ? '#FF6B00' : 'transparent',
                borderColor: rideMode === 'share' ? '#FF6B00' : colors.border,
              },
            ]}
            onPress={() => setRideMode('share')}
          >
            <Text
              style={[
                styles.rideTypeText,
                { color: rideMode === 'share' ? '#fff' : colors.text },
              ]}
            >
              Ghép xe
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.rideTypeButton,
              {
                backgroundColor: (rideMode as string) === 'hire' ? '#FF6B00' : 'transparent',
                borderColor: (rideMode as string) === 'hire' ? '#FF6B00' : colors.border,
              },
            ]}
            onPress={() => setRideMode('hire')}
          >
            <Text
              style={[
                styles.rideTypeText,
                { color: (rideMode as string) === 'hire' ? '#fff' : colors.text },
              ]}
            >
              Lái xe hộ
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.rideTypeButton,
              {
                backgroundColor: (rideMode as string) === 'delivery' ? '#FF6B00' : 'transparent',
                borderColor: (rideMode as string) === 'delivery' ? '#FF6B00' : colors.border,
              },
            ]}
            onPress={() => setRideMode('delivery')}
          >
            <Text
              style={[
                styles.rideTypeText,
                { color: (rideMode as string) === 'delivery' ? '#fff' : colors.text },
              ]}
            >
              Giao hàng
            </Text>
          </TouchableOpacity>
        </View>

        {/* Locations Section */}
        <View style={styles.locationsSection}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>ĐIỂM ĐÓN</Text>
          <View style={[styles.inputLocationWrapper, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}>
            <MaterialIcons
              name="radio-button-checked"
              size={20}
              color="#FF6B00"
            />
            <TextInput
              style={[styles.inputLocation, { color: colors.text }]}
              placeholder="Nhập điểm đón..."
              placeholderTextColor={colors.textSecondary}
              value={pickupLocation}
              onChangeText={(text) => {
                setPickupLocation(text);
                // Clear old suggestions immediately when user starts typing
                if (debouncedPickupLocation && text.length < debouncedPickupLocation.length) {
                  setPickupSuggestions([]);
                }
              }}
            />
            {isSearchingPickup && (
              <ActivityIndicator size="small" color="#FF6B00" style={{ marginLeft: SPACING.sm }} />
            )}
            <TouchableOpacity
              onPress={() => {
                setIsSelectingPickupOnMap(true)
                Alert.alert('Chọn điểm đón', 'Nhấp vào bản đồ để chọn điểm đón của bạn')
              }}
              style={{ borderWidth: 2, borderColor: '#FF6B00', borderRadius: 20, width: 35, height: 35, justifyContent: 'center', alignItems: 'center' }}
            >
              <MaterialIcons name="chevron-right" size={24} color="#FF6B00" />
            </TouchableOpacity>
          </View>

          {/* Pickup Suggestions */}
          {pickupSuggestions.length > 0 && (
            <View style={styles.suggestionsContainer}>
              <FlatList
                data={pickupSuggestions}
                scrollEnabled={false}
                keyExtractor={(item, index) => item.placeId + index}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.suggestionItem}
                    onPress={() => selectPickupPlace(item)}
                  >
                    <MaterialIcons name="location-on" size={18} color="#94a3b8" />
                    <View style={{ flex: 1, marginLeft: SPACING.md }}>
                      <Text style={styles.suggestionName}>{item.name}</Text>
                      <Text style={styles.suggestionAddress}>{item.address}</Text>
                    </View>
                  </TouchableOpacity>
                )}
              />
            </View>
          )}

          <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginTop: SPACING.lg }]}>
            ĐIỂM ĐẾN
          </Text>
          <View style={[styles.inputLocationWrapper, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}>
            <MaterialIcons name="flag" size={20} color="#ef4444" />
            <TextInput
              style={[styles.inputLocation, { color: colors.text }]}
              placeholder="Nhập điểm đến..."
              placeholderTextColor={colors.textSecondary}
              value={dropoffLocation}
              onChangeText={(text) => {
                setDropoffLocation(text);
                // Clear old suggestions immediately when user starts typing
                if (debouncedDropoffLocation && text.length < debouncedDropoffLocation.length) {
                  setDropoffSuggestions([]);
                }
              }}
            />
            {isSearchingDropoff && (
              <ActivityIndicator size="small" color="#ef4444" style={{ marginLeft: SPACING.sm }} />
            )}
            <TouchableOpacity
              onPress={() => {
                setIsSelectingDropoffOnMap(true)
                Alert.alert('Chọn điểm đến', 'Nhấp vào bản đồ để chọn điểm đến của bạn')
              }}
              style={{ borderWidth: 2, borderColor: '#ef4444', borderRadius: 20, width: 35, height: 35, justifyContent: 'center', alignItems: 'center' }}
            >
              <MaterialIcons name="chevron-right" size={24} color="#ef4444" />
            </TouchableOpacity>
          </View>

          {/* Dropoff Suggestions */}
          {dropoffSuggestions.length > 0 && (
            <View style={styles.suggestionsContainer}>
              <FlatList
                data={dropoffSuggestions}
                scrollEnabled={false}
                keyExtractor={(item, index) => item.placeId + index}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.suggestionItem}
                    onPress={() => selectDropoffPlace(item)}
                  >
                    <MaterialIcons name="location-on" size={18} color="#94a3b8" />
                    <View style={{ flex: 1, marginLeft: SPACING.md }}>
                      <Text style={styles.suggestionName}>{item.name}</Text>
                      <Text style={styles.suggestionAddress}>{item.address}</Text>
                    </View>
                  </TouchableOpacity>
                )}
              />
            </View>
          )}
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

        {/* Price Section */}
        <View style={styles.priceSection}>
          <Text style={[styles.priceLabel, { color: colors.textSecondary }]}>Giá từ</Text>
          {routeInfo?.fareEstimate ? (
            <View>
              <Text style={styles.priceValue}>{(routeInfo.fareEstimate.totalFare || routeInfo.fareEstimate.total)?.toLocaleString() || 'Tính toán...'}đ</Text>
              <View style={styles.fareBreakdown}>
                <Text style={[styles.fareBreakdownItem, { color: colors.textSecondary }]}>
                </Text>
              </View>
            </View>
          ) : (
            <Text style={styles.priceValue}>Chọn điểm đi và điểm đến</Text>
          )}
        </View>

        {/* Find Ride Button */}
        <TouchableOpacity
          style={[styles.findButton, (isLoading || calculating) && styles.findButtonDisabled]}
          onPress={handleFindRide}
          disabled={isLoading || calculating}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Text style={styles.findButtonText}>
                {calculating ? 'Đang tính giá...' : 'Tìm chuyến xe'}
              </Text>
              <MaterialIcons
                name="arrow-forward"
                size={20}
                color="#fff"
                style={styles.findButtonIcon}
              />
            </>
          )}
        </TouchableOpacity>

        {/* Browse Nearby Rides Button */}
        {/* <TouchableOpacity 
          style={[styles.findButton, { backgroundColor: '#4CAF50', marginTop: SPACING.md }]}
          onPress={() => navigation.navigate('FindRidesScreen')}
          activeOpacity={0.7}
        >
          <Text style={styles.findButtonText}>
            Duyệt chuyến xe gần đây
          </Text>
          <MaterialIcons
            name="search"
            size={20}
            color="#fff"
            style={styles.findButtonIcon}
          />
        </TouchableOpacity> */}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerSection: {
    height: height * 0.4,
    position: 'relative',
    paddingTop: SPACING.xxl,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
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
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapWrapper: {
    position: 'relative',
    marginHorizontal: SPACING.lg,
    marginVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
    marginHorizontal: SPACING.lg,
    marginVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
  },
  mapPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    //   backgroundImage: 'linear-gradient(45deg, #4b5563 25%, #374151 25%, #374151 50%, #4b5563 50%, #4b5563 75%, #374151 75%, #374151)',
  },
  routeInfoOld: {
    position: 'absolute',
    bottom: SPACING.lg,
    left: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: '#FF6B00',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  routeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  locationButton: {
    position: 'absolute',
    bottom: SPACING.lg,
    right: SPACING.lg,
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#FF6B00',
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
  },
  rideTypeContainer: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  rideTypeButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rideTypeButtonActive: {
    backgroundColor: 'transparent',
    borderWidth: 2,
  },
  rideTypeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  rideTypeTextActive: {
    fontWeight: '700',
  },
  locationsSection: {
    marginBottom: SPACING.xl,
    position: 'relative',
    zIndex: 10,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: SPACING.md,
    letterSpacing: 0.5,
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
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    gap: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
  },
  locationContent: {
    flex: 1,
  },
  locationText: {
    fontSize: 14,
    fontWeight: '500',
  },
  inputLocationWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    height: 56,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  inputLocation: {
    flex: 1,
    fontSize: 14,
  },
  suggestionsDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    borderRadius: BORDER_RADIUS.lg,
    marginTop: -SPACING.lg,
    borderWidth: 1,
    maxHeight: 300,
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
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
  routeInfoCard: {
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    marginBottom: SPACING.lg,
  },
  routeInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  routeInfoItem: {
    flex: 1,
    alignItems: 'center',
    gap: SPACING.sm,
  },
  routeInfoValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  routeInfoLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  routeInfoDivider: {
    width: 1,
    height: 50,
    opacity: 0.2,
  },
  priceSection: {
    marginBottom: SPACING.xl,
  },
  priceLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: SPACING.sm,
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
  findButton: {
    height: 56,
    backgroundColor: '#FF6B00',
    borderRadius: BORDER_RADIUS.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.xl,
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  findButtonDisabled: {
    backgroundColor: '#94a3b8',
    shadowOpacity: 0,
  },
  findButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  findButtonIcon: {
    marginLeft: SPACING.sm,
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
  expandMapButton: {
    position: 'absolute',
    top: 290,
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
  calendarContainer: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    maxHeight: 320,
  },
  monthNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  navButton: {
    padding: SPACING.md,
  },
  monthText: {
    fontSize: 14,
    fontWeight: '600',
  },
  dayHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: SPACING.md,
  },
  dayHeader: {
    width: '14.28%',
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayButton: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginBottom: SPACING.sm,
  },
  dayButtonSelected: {
    fontWeight: '700',
  },
  dayText: {
    fontSize: 13,
    fontWeight: '500',
  },
  timePickerSection: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  timePickerLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: SPACING.md,
  },
  timeInputRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.md,
  },
  timeInputBox: {
    width: 70,
    height: 50,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'space-around',
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: SPACING.sm,
  },
  timeInputText: {
    fontSize: 16,
    fontWeight: '700',
    minWidth: 30,
    textAlign: 'center',
  },
  timeColon: {
    fontSize: 16,
    fontWeight: '700',
  },
  timePickerContainer: {
    height: 280,
    justifyContent: 'center',
  },
  timePickerScroll: {
    flex: 1,
  },
  timePickerItem: {
    height: 60,
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: 1,
  },
  timePickerItemSelected: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B00',
    paddingHorizontal: SPACING.lg - 2,
  },
  timePickerItemText: {
    fontSize: 16,
    fontWeight: '500',
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
  timeOptionsContainer: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  timeOption: {
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
  },
  timeOptionText: {
    fontSize: 15,
  },
})