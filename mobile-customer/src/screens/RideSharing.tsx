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
  Animated,
  PanResponder,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
} from 'react-native'
import * as Location from 'expo-location'
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
import { combinedTripsService } from '../services/combinedTripsService'
import { mapsService } from '../services/mapsService'
import { pricingService } from '../services/pricingService'
import { calculateInterProvincialFare } from '../utils/pricing'
import type { InterProvincialRoute } from '../types'

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

  // Draggable Bottom Sheet
  const screenHeight = Dimensions.get('window').height
  const minHeight = screenHeight * 0.42 // 42%
  const maxHeight = screenHeight * 0.85 // 85%
  const initialHeight = screenHeight * 0.42 // 42% - Start collapsed
  const translateY = useRef(new Animated.Value(screenHeight - initialHeight)).current
  const lastGestureDy = useRef(0)

  // Places autocomplete states
  const [pickupSuggestions, setPickupSuggestions] = useState<any[]>([])
  const [dropoffSuggestions, setDropoffSuggestions] = useState<any[]>([])
  const [showPickupSuggestions, setShowPickupSuggestions] = useState(false)
  const [showDropoffSuggestions, setShowDropoffSuggestions] = useState(false)
  const [pickupSearchTimeout, setPickupSearchTimeout] = useState<NodeJS.Timeout | null>(null)
  const [dropoffSearchTimeout, setDropoffSearchTimeout] = useState<NodeJS.Timeout | null>(null)
  const [pickupLoadingSuggestions, setPickupLoadingSuggestions] = useState(false)
  const [dropoffLoadingSuggestions, setDropoffLoadingSuggestions] = useState(false)
  const [isLoadingCurrentLocation, setIsLoadingCurrentLocation] = useState(true)

  const [fareEstimate, setFareEstimate] = useState<any>(null)
  const [drivers, setDrivers] = useState<any[]>([])
  const [lastTrackedLocation, setLastTrackedLocation] = useState<[number, number] | null>(null)
  const [isRecalculatingRoute, setIsRecalculatingRoute] = useState(false)
  const locationWatcherRef = useRef<any>(null)
  const recalculateTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // ============ CHUYẾN ĐI LIÊN TỈNH - Inter-Provincial Routes State ============
  const [interProvincialRoutes, setInterProvincialRoutes] = useState<InterProvincialRoute[]>([])
  const [selectedRoute, setSelectedRoute] = useState<InterProvincialRoute | null>(null)
  const [isSearchingRoutes, setIsSearchingRoutes] = useState(false)
  const user = useSelector((state: RootState) => state.auth.user)
  const themeMode = useSelector((state: RootState) => state.theme.mode)
  const colors = themeMode === 'dark' ? COLORS_DARK : COLORS_LIGHT
  const isMountedRef = useRef(true)
  const setRideMode = props?.setRideMode

  // PanResponder for draggable bottom sheet
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only respond to vertical drags > 5px
        return Math.abs(gestureState.dy) > 5
      },
      onPanResponderGrant: () => {
        translateY.setOffset(lastGestureDy.current)
        translateY.setValue(0)
      },
      onPanResponderMove: (_, gestureState) => {
        // Limit dragging within bounds
        const newValue = gestureState.dy
        if (newValue >= 0 && lastGestureDy.current + newValue <= screenHeight - minHeight) {
          translateY.setValue(newValue)
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        translateY.flattenOffset()
        const currentY = lastGestureDy.current + gestureState.dy
        const velocity = gestureState.vy

        // Snap to either min (42%) or max (85%) only
        let snapTo: number
        const midPoint = screenHeight - (maxHeight + minHeight) / 2

        // Strong velocity influence
        if (Math.abs(velocity) > 0.8) {
          snapTo = velocity > 0 ? screenHeight - minHeight : screenHeight - maxHeight
        }
        // Position-based snapping
        else if (currentY > midPoint) {
          snapTo = screenHeight - minHeight // Snap to collapsed (42%)
        } else {
          snapTo = screenHeight - maxHeight // Snap to expanded (85%)
        }

        lastGestureDy.current = snapTo

        Animated.spring(translateY, {
          toValue: snapTo,
          velocity: velocity * -1,
          tension: 65,
          friction: 12,
          useNativeDriver: true,
        }).start()
      },
    })
  ).current

  useEffect(() => {
    return () => {
      isMountedRef.current = false
      // Clean up location watcher by calling .remove() on subscription
      if (locationWatcherRef.current !== null) {
        locationWatcherRef.current.remove()
      }
      // Clean up recalculate timeout
      if (recalculateTimeoutRef.current) {
        clearTimeout(recalculateTimeoutRef.current)
      }
    }
  }, [])

  // Initialize bottom sheet position
  useEffect(() => {
    lastGestureDy.current = screenHeight - initialHeight
  }, [])

  // Helper refs: snap bottom sheet to max/min height (useRef to avoid stale closure)
  const snapToMaxRef = useRef(() => {
    const snapTo = screenHeight - maxHeight
    lastGestureDy.current = snapTo
    Animated.spring(translateY, {
      toValue: snapTo,
      tension: 65,
      friction: 12,
      useNativeDriver: true,
    }).start()
  })

  const snapToMinRef = useRef(() => {
    const snapTo = screenHeight - minHeight
    lastGestureDy.current = snapTo
    Animated.spring(translateY, {
      toValue: snapTo,
      tension: 65,
      friction: 12,
      useNativeDriver: true,
    }).start()
  })

  const snapToMax = () => snapToMaxRef.current()
  const snapToMin = () => snapToMinRef.current()

  // Auto-snap bottom sheet when keyboard appears/disappears
  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => snapToMaxRef.current()
    )
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => snapToMinRef.current()
    )
    return () => {
      showSub.remove()
      hideSub.remove()
    }
  }, [])

  /**
   * Calculate distance between two coordinates using Haversine formula (km)
   */
  const calculateHaversineDistance = (
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number => {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  /**
   * Start real-time location tracking
   * ✅ Recalculates route when user moves >50m
   */
  useEffect(() => {
    const startLocationTracking = async () => {
      try {
        // Only track if both locations are selected
        if (!isPickupSelected || !isDropoffSelected) {
          console.log('[RideSharing] 📍 Not tracking - waiting for both locations');
          return;
        }

        console.log('[RideSharing] 🚀 Starting real-time location tracking...');

        // Request permission
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.warn('[RideSharing] ⚠️ Location permission denied');
          return;
        }

        // Watch location changes
        const watcher = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 5000, // Update every 5 seconds
            distanceInterval: 10, // Update every 10m
          },
          async (location) => {
            if (!isMountedRef.current) return;

            const { latitude, longitude } = location.coords;
            const currentCoords: [number, number] = [longitude, latitude];

            console.log('[RideSharing] 📍 Location update:', {
              latitude: latitude.toFixed(4),
              longitude: longitude.toFixed(4),
            });

            // Check if moved >50m from pickup
            const distanceFromPickup = calculateHaversineDistance(
              latitude,
              longitude,
              pickupCoordinates[1],
              pickupCoordinates[0]
            );

            console.log('[RideSharing] 📏 Distance from pickup:', distanceFromPickup.toFixed(2), 'km');

            if (distanceFromPickup > 0.05) {
              // Moved >50m
              console.log('[RideSharing] ✅ User moved >50m, updating pickup location');

              // Update pickup coordinates
              setPickupCoordinates(currentCoords);
              setLastTrackedLocation(currentCoords);

              // Debounce route recalculation (wait 2 seconds before recalculating)
              if (recalculateTimeoutRef.current) {
                clearTimeout(recalculateTimeoutRef.current);
              }

              recalculateTimeoutRef.current = setTimeout(async () => {
                console.log('[RideSharing] 🔄 Recalculating route after user moved...');
                setIsRecalculatingRoute(true);

                try {
                  await calculateRoute(currentCoords, dropoffCoordinates);
                  console.log('[RideSharing] ✅ Route recalculated successfully');
                } catch (error) {
                  console.error('[RideSharing] ❌ Route recalculation failed:', error);
                } finally {
                  setIsRecalculatingRoute(false);
                }
              }, 2000); // Wait 2 seconds after movement stops
            }
          }
        );

        locationWatcherRef.current = watcher;
        console.log('[RideSharing] ✅ Location tracking started');
      } catch (error) {
        console.error('[RideSharing] ❌ Error starting location tracking:', error);
      }
    };

    startLocationTracking();

    // Cleanup on unmount
    return () => {
      if (locationWatcherRef.current !== null) {
        locationWatcherRef.current.remove()
        locationWatcherRef.current = null;
        console.log('[RideSharing] 🛑 Location tracking stopped');
      }
    };
  }, [isPickupSelected, isDropoffSelected, pickupCoordinates, dropoffCoordinates]);

  // Initialize pickup location with current user location
  useEffect(() => {
    const initializePickupLocation = async () => {
      setIsLoadingCurrentLocation(true)
      try {
        console.log('[RideSharing] 📍 Requesting location permission...')
        const { status } = await Location.requestForegroundPermissionsAsync()

        if (status !== 'granted') {
          console.log('[RideSharing] ⚠️ Location permission denied')
          setIsLoadingCurrentLocation(false)
          return
        }

        console.log('[RideSharing] ✅ Getting current position...')
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        })

        const { latitude, longitude } = location.coords
        console.log('[RideSharing] 📍 Current position:', { latitude, longitude })
        setPickupCoordinates([longitude, latitude])
        setIsPickupSelected(true)

        // Reverse geocode to get address
        const address = await mapsService.reverseGeocode(latitude, longitude)
        console.log('[RideSharing] 🏠 Address from coordinates:', address)

        setPickupLocation(address)
      } catch (error) {
        console.error('[RideSharing] ❌ Error getting location:', error)
        // Fallback to default location
        setPickupLocation('Hà Nội, Việt Nam')
      } finally {
        setIsLoadingCurrentLocation(false)
      }
    }

    initializePickupLocation()
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
      console.log('[RideSharing] Calculating route...');
      // ✅ Use combinedTripsService for rideshare
      const directions = await combinedTripsService.getDirections(
        startCoords[0],
        startCoords[1],
        endCoords[0],
        endCoords[1],
      );

      console.log('[RideSharing] Raw directions response:', JSON.stringify(directions, null, 2));

      // Handle different response formats from backend
      let distance = 0;
      let duration = 0;
      let distanceText = '';
      let durationText = '';
      let routeCoordinates: Array<{ latitude: number, longitude: number }> = [];

      // ✅ PRIMARY: Top-level distance (KM) and duration (MINUTES) from Google Maps
      if (directions.distance !== undefined && directions.duration !== undefined) {
        distance = directions.distance;  // Already in KM from backend
        duration = directions.duration;  // Already in MINUTES from backend
        distanceText = directions.distanceText || `${distance.toFixed(1)} km`;
        durationText = directions.durationText || `~${Math.ceil(duration / 60)} phút`;
        console.log('[RideSharing] Using top-level distance/duration:', { distance, duration, distanceText, durationText });
      }

      // ✅ Extract route coordinates from features/geometry
      if (directions.features?.[0]?.geometry?.coordinates) {
        const coordinates = directions.features[0].geometry.coordinates;
        console.log('[RideSharing] Found coordinates in features[0].geometry.coordinates, count:', coordinates.length);
        console.log('[RideSharing] Sample coordinates:', coordinates.slice(0, 3));

        // Convert [lng, lat] to { latitude, longitude }
        routeCoordinates = coordinates.map((coord: any) => {
          if (Array.isArray(coord)) {
            return {
              latitude: coord[1],
              longitude: coord[0],
            };
          }
          return coord; // Already formatted
        });
        console.log('[RideSharing] Converted to routeCoordinates, count:', routeCoordinates.length);
      }

      console.log('[RideSharing] Extracted:', {
        distance,
        duration,
        distanceText,
        durationText,
        routeCoordinatesCount: routeCoordinates.length
      });

      if (!distance || !duration || distance === 0 || duration === 0) {
        console.error('[RideSharing] Invalid distance or duration:', { distance, duration });
        Alert.alert('Lỗi', 'Không thể tính tuyến đường. Vui lòng kiểm tra địa chỉ và thử lại.');
        return null;
      }

      if (routeCoordinates.length === 0) {
        console.warn('[RideSharing] ⚠️ No route coordinates extracted, map will not show polyline');
      }

      // Calculate fare in realtime
      let fareEstimate = null;
      try {
        console.log('[RideSharing] Calculating fare for:', { distance, duration, vehicleType: 'basic' });
        fareEstimate = await rideService.calculateFare(
          distance,
          duration,
          'basic'
        );
        console.log('[RideSharing] Fare result:', fareEstimate);
      } catch (fareError) {
        console.error('[RideSharing] Fare calculation error:', fareError);
        // Continue without fare calculation
      }

      const routeData = {
        distance: distance,
        duration: duration,
        distanceText: distanceText,
        durationText: durationText,
        routeCoordinates: routeCoordinates,
        fareEstimate: fareEstimate,
      };

      setRouteInfo(routeData);

      if (fareEstimate) {
        setFareEstimate(fareEstimate);
      }

      console.log('[RideSharing] ✅ Route info updated successfully', {
        distance,
        duration,
        routeCount: routeCoordinates.length,
        fare: fareEstimate?.totalFare
      });

      // ✨ TỰ ĐỘNG TÌM CHUYẾN LIÊN TỈNH PHÙ HỢP
      await searchInterProvincialRoutes(startCoords, endCoords);
    } catch (error: any) {
      console.error('[RideSharing] Route calculation error:', error);
      Alert.alert('Lỗi', error.message || 'Không thể tính toán tuyến đường');
      return null;
    }
  };

  /**
   * ✨ TÌM CHUYẾN ĐI LIÊN TỈNH PHÙ HỢP
   */
  const searchInterProvincialRoutes = async (
    pickup: [number, number],
    dropoff: [number, number]
  ) => {
    try {
      setIsSearchingRoutes(true);
      console.log('\n🚍 ============ TÌM CHUYẾN LIÊN TỈNH ============');
      console.log('📍 Pickup coordinates:', {
        lat: pickup[1].toFixed(4),
        lng: pickup[0].toFixed(4),
      });
      console.log('📍 Dropoff coordinates:', {
        lat: dropoff[1].toFixed(4),
        lng: dropoff[0].toFixed(4),
      });
      console.log('🚗 Vehicle type: sedan');
      console.log('================================================\n');

      const routes = await pricingService.findInterProvincialRoutes(
        pickup[1], // lat
        pickup[0], // lng
        dropoff[1],
        dropoff[0],
        'sedan' // Default vehicle type
      );

      console.log('\n📊 ============ KẾT QUẢ TÌM KIẾM ============');
      console.log(`✅ Tìm thấy ${routes.length} chuyến phù hợp`);
      
      if (routes.length > 0) {
        console.log('\n🎯 Danh sách chuyến xe:');
        routes.forEach((route, index) => {
          console.log(`  ${index + 1}. ${route.name}`);
          console.log(`     - Giá: ${route.fixedPrice?.toLocaleString()}đ`);
          console.log(`     - Từ: ${route.origin?.name}`);
          console.log(`     - Đến: ${route.destination?.name}`);
          console.log(`     - Bán kính đón: ${route.origin?.radius}km`);
          console.log(`     - Bán kính trả: ${route.destination?.radius}km`);
        });
      } else {
        console.log('⚠️ Không tìm thấy chuyến liên tỉnh phù hợp');
        console.log('💡 Có thể do:');
        console.log('   - Điểm đón/đến nằm ngoài bán kính của các chuyến đã cấu hình');
        console.log('   - Chưa có chuyến liên tỉnh nào trong hệ thống');
        console.log('   - Chuyến liên tỉnh đang bị tắt (inactive)');
      }
      console.log('============================================\n');

      setInterProvincialRoutes(routes);
      
      // ⚠️ KHÔNG tự động chọn route - để user tự chọn hoặc bỏ qua
      // Clear selection để user có thể dùng distance-based pricing nếu muốn
      setSelectedRoute(null);
      console.log(`ℹ️ Found ${routes.length} inter-provincial routes - user can choose or skip`);
    } catch (error) {
      console.error('\n❌ ============ LỖI TÌM CHUYẾN ============');
      console.error('Error:', error);
      if (error instanceof Error) {
        console.error('Message:', error.message);
        console.error('Stack:', error.stack);
      }
      console.error('=========================================\n');
      setInterProvincialRoutes([]);
    } finally {
      setIsSearchingRoutes(false);
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

      // Validate coordinates exist and are valid
      if (!routeInfo || !routeInfo.distance || !routeInfo.duration) {
        Alert.alert('Lỗi', 'Vui lòng tính toán tuyến đường trước')
        setIsLoading(false)
        return
      }

      if (!pickupCoordinates || !Array.isArray(pickupCoordinates) || pickupCoordinates.length !== 2) {
        Alert.alert('Lỗi', 'Vị trí đón khách không hợp lệ')
        console.error('[RideSharing] Invalid pickupCoordinates:', pickupCoordinates)
        setIsLoading(false)
        return
      }

      if (!dropoffCoordinates || !Array.isArray(dropoffCoordinates) || dropoffCoordinates.length !== 2) {
        Alert.alert('Lỗi', 'Vị trí trả khách không hợp lệ')
        console.error('[RideSharing] Invalid dropoffCoordinates:', dropoffCoordinates)
        setIsLoading(false)
        return
      }

      console.log('[RideSharing] Navigate to FindingRideScreen with params:', {
        distance: routeInfo.distance,
        duration: routeInfo.duration,
        startLng: pickupCoordinates[0],
        startLat: pickupCoordinates[1],
        endLng: dropoffCoordinates[0],
        endLat: dropoffCoordinates[1],
        pickupAddress: pickupLocation,
        dropoffAddress: dropoffLocation,
      })

      // ✨ Prepare navigation params with inter-provincial route if selected
      const navParams: any = {
        distance: routeInfo.distance,
        duration: routeInfo.duration,
        startLng: pickupCoordinates[0],
        startLat: pickupCoordinates[1],
        endLng: dropoffCoordinates[0],
        endLat: dropoffCoordinates[1],
        pickupAddress: pickupLocation,
        dropoffAddress: dropoffLocation,
      };

      // Add inter-provincial route info if selected
      console.log('\n🔍 [RideSharing] Checking selectedRoute before navigation...');
      console.log('selectedRoute:', selectedRoute ? JSON.stringify(selectedRoute, null, 2) : 'null');
      console.log('Has selectedRoute?', !!selectedRoute);
      
      if (selectedRoute) {
        console.log('🚍 [RideSharing] ✅ PASSING inter-provincial route to FindingRideScreen:', selectedRoute.name, '-', selectedRoute.fixedPrice.toLocaleString(), 'đ');
        navParams.interProvincialRoute = selectedRoute;
      } else {
        console.log('⚠️ [RideSharing] NO inter-provincial route selected - will use distance-based pricing');
      }

      console.log('\n📤 [RideSharing] Final navParams:', {
        ...navParams,
        interProvincialRoute: navParams.interProvincialRoute ? `${navParams.interProvincialRoute.name} - ${navParams.interProvincialRoute.fixedPrice}đ` : 'None',
      });

      // Navigate to FindingRideScreen
      navigation.navigate('FindingRideScreen', navParams)

      setIsLoading(false)
    } catch (error: any) {
      if (!isMountedRef.current) return

      setIsLoading(false)
      console.error('[RideSharing] handleFindRide error:', error)
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
      setPickupLoadingSuggestions(true)
      const timeout = setTimeout(async () => {
        try {
          console.log('[Delivery] Pickup search for:', text)
          const suggestions = await mapsService.searchPlaces(text)
          console.log('[Delivery] Pickup suggestions received:', suggestions.length)
          setPickupSuggestions(suggestions)
        } catch (error) {
          console.error('Error searching pickup locations:', error)
          setPickupSuggestions([])
        } finally {
          setPickupLoadingSuggestions(false)
        }
      }, 500)
      setPickupSearchTimeout(timeout)
    } else {
      setPickupSuggestions([])
      setPickupLoadingSuggestions(false)
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
      setDropoffLoadingSuggestions(true)
      const timeout = setTimeout(async () => {
        try {
          console.log('[Delivery] Dropoff search for:', text)
          const suggestions = await mapsService.searchPlaces(text)
          console.log('[Delivery] Dropoff suggestions received:', suggestions.length)
          setDropoffSuggestions(suggestions)
        } catch (error) {
          console.error('Error searching dropoff locations:', error)
          setDropoffSuggestions([])
        } finally {
          setDropoffLoadingSuggestions(false)
        }
      }, 500)
      setDropoffSearchTimeout(timeout)
    } else {
      setDropoffSuggestions([])
      setDropoffLoadingSuggestions(false)
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

        {/* Live Location Update Badge */}
        {isPickupSelected && isDropoffSelected && (
          <View style={[styles.liveUpdateBadge, { backgroundColor: isRecalculatingRoute ? '#FFA500' : '#10B981' }]}>
            <MaterialIcons name="my-location" size={14} color="#fff" />
            <Text style={styles.liveUpdateText}>
              {isRecalculatingRoute ? 'Cập nhật...' : 'Đang theo dõi'}
            </Text>
          </View>
        )}
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
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Chọn thời gian</Text>
              <TouchableOpacity onPress={() => setIsTimeModalVisible(false)}>
                <MaterialIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Date and Time Display */}
            <View style={styles.dateTimeDisplayContainer}>
              <TouchableOpacity
                style={[styles.dateTimeButton, { backgroundColor: colors.card, borderColor: colors.warning }]}
                onPress={() => setShowDatePicker(true)}
              >
                <MaterialIcons name="calendar-today" size={20} color={colors.primary} />
                <Text style={[styles.dateTimeButtonText, { color: colors.text }]}>
                  {String(selectedDateTime.getDate()).padStart(2, '0')}/{String(selectedDateTime.getMonth() + 1).padStart(2, '0')}/{selectedDateTime.getFullYear()}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.dateTimeButton, { backgroundColor: colors.card, borderColor: colors.warning }]}
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

            <View style={[styles.modalFooter, { borderTopColor: colors.border, backgroundColor: colors.card }]}>
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
      <Animated.View
        style={[
          styles.card,
          {
            transform: [{ translateY }],
            height: screenHeight,
          }
        ]}
      >
        <View style={styles.handleBarContainer} {...panResponder.panHandlers}>
          <View style={styles.handleBar} />
        </View>
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
          {/* {routeInfo?.fareEstimate ? (
            <View>
              <Text style={styles.priceValue}>{(routeInfo.fareEstimate.totalFare || routeInfo.fareEstimate.total)?.toLocaleString() || 'Tính toán...'}đ</Text>
              <View style={styles.fareBreakdown}>
                <Text style={[styles.fareBreakdownItem, { color: colors.textSecondary }]}>
                </Text>
              </View>
            </View>
          ) : null} */}
        </View>

        <KeyboardAvoidingView
          behavior="padding"
          keyboardVerticalOffset={0}
          style={{ flex: 1 }}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            style={styles.scrollContent}
            contentContainerStyle={{ paddingBottom: 20 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Locations Section */}
            <View style={styles.locationsContainer}>
              <View style={[styles.inputGroup, showPickupSuggestions && { zIndex: 100 }]}>
                <View style={styles.inputRow}>
                  <View style={styles.iconWrapper}>
                    {isLoadingCurrentLocation ? (
                      <ActivityIndicator size="small" color="#FF6B00" />
                    ) : (
                      <MaterialIcons name="radio-button-checked" size={20} color="#FF6B00" />
                    )}
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder={isLoadingCurrentLocation ? "Đang lấy vị trí..." : "Nhập điểm đón..."}
                    placeholderTextColor="#9CA3AF"
                    value={pickupLocation}
                    onChangeText={handlePickupLocationChange}
                    onFocus={() => {
                      setShowPickupSuggestions(true)
                      snapToMax()
                    }}
                    editable={!isLoadingCurrentLocation}
                  />
                </View>
                {showPickupSuggestions && pickupLoadingSuggestions && (
                  <View style={[styles.suggestionsDropdown, { justifyContent: 'center', alignItems: 'center', paddingVertical: 20 }]}>
                    <ActivityIndicator size="small" color="#FF6B00" />
                    <Text style={{ color: '#6B7280', fontSize: 12, marginTop: 8 }}>Đang tìm kiếm...</Text>
                  </View>
                )}
                {showPickupSuggestions && !pickupLoadingSuggestions && pickupSuggestions.length > 0 && (
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
                    onFocus={() => {
                      setShowDropoffSuggestions(true)
                      snapToMax()
                    }}
                  />
                </View>
                {showDropoffSuggestions && dropoffLoadingSuggestions && (
                  <View style={[styles.suggestionsDropdown, { justifyContent: 'center', alignItems: 'center', paddingVertical: 20 }]}>
                    <ActivityIndicator size="small" color="#FF6B00" />
                    <Text style={{ color: '#6B7280', fontSize: 12, marginTop: 8 }}>Đang tìm kiếm...</Text>
                  </View>
                )}
                {showDropoffSuggestions && !dropoffLoadingSuggestions && dropoffSuggestions.length > 0 && (
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

            {/* Selected Locations Detail Card */}
            {isPickupSelected && isDropoffSelected && (
              <View style={styles.selectedLocationsCard}>
                <View style={styles.selectedLocationsHeader}>
                  <MaterialIcons name="check-circle" size={18} color="#10b981" />
                  <Text style={styles.selectedLocationsTitle}>Chi tiết hành trình</Text>
                </View>
                
                {/* Pickup Location */}
                <View style={styles.locationDetailItem}>
                  <View style={styles.locationDetailIconContainer}>
                    <MaterialIcons name="radio-button-checked" size={16} color="#FF6B00" />
                  </View>
                  <View style={styles.locationDetailContent}>
                    <Text style={styles.locationDetailLabel}>Điểm đón</Text>
                    <Text style={styles.locationDetailAddress} numberOfLines={2}>
                      {pickupLocation}
                    </Text>
                    <Text style={styles.locationDetailCoords}>
                      {pickupCoordinates[1].toFixed(6)}, {pickupCoordinates[0].toFixed(6)}
                    </Text>
                  </View>
                </View>

                {/* Journey Line */}
                <View style={styles.journeyLine}>
                  <View style={styles.journeyDots}>
                    <View style={styles.journeyDot} />
                    <View style={styles.journeyDot} />
                    <View style={styles.journeyDot} />
                  </View>
                </View>

                {/* Dropoff Location */}
                <View style={styles.locationDetailItem}>
                  <View style={[styles.locationDetailIconContainer, { backgroundColor: '#fee2e2' }]}>
                    <MaterialIcons name="flag" size={16} color="#ef4444" />
                  </View>
                  <View style={styles.locationDetailContent}>
                    <Text style={styles.locationDetailLabel}>Điểm đến</Text>
                    <Text style={styles.locationDetailAddress} numberOfLines={2}>
                      {dropoffLocation}
                    </Text>
                    <Text style={styles.locationDetailCoords}>
                      {dropoffCoordinates[1].toFixed(6)}, {dropoffCoordinates[0].toFixed(6)}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Time & Passenger Section */}
            {/* <View style={styles.timePassengerSection}>
              <View style={[styles.timeWrapper, { backgroundColor: colors.card, borderColor: colors.warning }]}>
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
              </View> */}

              {/* <View style={[styles.passengerWrapper, { backgroundColor: colors.card, borderColor: colors.warning }]}>
                <Text style={[styles.passengerLabel, { color: colors.textSecondary }]}>Số khách</Text>
                <View style={styles.passengerControls}>
                  <TouchableOpacity
                    style={[styles.passengerButton, { backgroundColor: colors.border, borderColor: colors.warning }]}
                    onPress={() => {
                      if (passengerCount > 1) setPassengerCount(passengerCount - 1)
                    }}
                  >
                    <Text style={[styles.passengerButtonText, { color: colors.textSecondary }]}>−</Text>
                  </TouchableOpacity>
                  <Text style={[styles.passengerCount, { color: colors.text }]}>{passengerCount}</Text>
                  <TouchableOpacity
                    style={[styles.passengerButton, { backgroundColor: colors.border, borderColor: colors.warning }]}
                    onPress={() => {
                      if (passengerCount < 6) setPassengerCount(passengerCount + 1)
                    }}
                  >
                    <Text style={[styles.passengerButtonText, { color: colors.textSecondary }]}>+</Text>
                  </TouchableOpacity>
                </View>
              </View> */}
            {/* </View> */}

            {/* ============ CHUYẾN LIÊN TỈNH - INTER-PROVINCIAL ROUTES ============ */}
            {isSearchingRoutes && (
              <View style={styles.routesSearching}>
                <ActivityIndicator size="small" color="#FF6B00" />
                <Text style={styles.routesSearchingText}>Đang tìm chuyến liên tỉnh...</Text>
              </View>
            )}

            {!isSearchingRoutes && interProvincialRoutes.length > 0 && (
              <View style={styles.routesContainer}>
                <View style={styles.routesHeader}>
                  <MaterialCommunityIcons name="truck-fast" size={20} color="#FF6B00" />
                  <Text style={styles.routesHeaderText}>Chuyến đi liên tỉnh có sẵn</Text>
                  <View style={styles.routesBadge}>
                    <Text style={styles.routesBadgeText}>{interProvincialRoutes.length}</Text>
                  </View>
                </View>
                <Text style={styles.routesSubtitle}>
                  Giá cố định - Không tính theo km - Không tăng giờ cao điểm
                </Text>

                {interProvincialRoutes.map((route) => {
                  const isSelected = selectedRoute?.id === route.id;
                  return (
                    <TouchableOpacity
                      key={route.id}
                      style={[
                        styles.routeCard,
                        isSelected && styles.routeCardSelected,
                      ]}
                      onPress={() => {
                        // ✅ Toggle behavior: click để chọn/bỏ chọn
                        if (isSelected) {
                          // Bỏ chọn - dùng distance-based pricing
                          setSelectedRoute(null);
                          console.log('❌ Deselected inter-provincial route - using distance-based pricing');
                        } else {
                          // Chọn route này
                          setSelectedRoute(route);
                          console.log('✅ Selected inter-provincial route:', route.name);
                        }
                      }}
                      activeOpacity={0.7}
                    >
                      {/* Header */}
                      <View style={styles.routeCardHeader}>
                        <View style={styles.routeCardTitle}>
                          <MaterialIcons
                            name="travel-explore"
                            size={24}
                            color={isSelected ? '#FF6B00' : '#6B7280'}
                          />
                          <Text
                            style={[
                              styles.routeCardName,
                              isSelected && styles.routeCardNameSelected,
                            ]}
                          >
                            {route.name}
                          </Text>
                        </View>
                        {isSelected && (
                          <MaterialIcons name="check-circle" size={24} color="#10B981" />
                        )}
                      </View>

                      {/* Origin → Destination */}
                      <View style={styles.routeCardLocations}>
                        <View style={styles.routeCardLocation}>
                          <MaterialIcons name="location-on" size={16} color="#10B981" />
                          <Text style={styles.routeCardLocationText}>
                            {route.origin.city}, {route.origin.province}
                          </Text>
                        </View>
                        <MaterialIcons name="arrow-forward" size={16} color="#9CA3AF" />
                        <View style={styles.routeCardLocation}>
                          <MaterialIcons name="flag" size={16} color="#EF4444" />
                          <Text style={styles.routeCardLocationText}>
                            {route.destination.city}, {route.destination.province}
                          </Text>
                        </View>
                      </View>

                      {/* Pricing Info */}
                      <View style={styles.routeCardPricing}>
                        <View style={styles.routeCardPriceRow}>
                          <Text style={styles.routeCardPriceLabel}>Giá cố định:</Text>
                          <Text style={styles.routeCardPriceValue}>
                            {route.fixedPrice.toLocaleString()}đ
                          </Text>
                        </View>
                        {passengerCount > 1 && (
                          <View style={styles.routeCardDiscountRow}>
                            <MaterialIcons name="people" size={14} color="#10B981" />
                            <Text style={styles.routeCardDiscountText}>
                              Giảm giá ghép {passengerCount} người
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* Description */}
                      {route.description && (
                        <Text style={styles.routeCardDescription}>{route.description}</Text>
                      )}

                      {/* Estimated Duration */}
                      {route.estimatedDuration && (
                        <View style={styles.routeCardDuration}>
                          <MaterialIcons name="schedule" size={14} color="#6B7280" />
                          <Text style={styles.routeCardDurationText}>
                            Thời gian dự kiến: ~{route.estimatedDuration} phút
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Route Map & Info */}
            {routeInfo && (
              <View style={[styles.routeSection, { backgroundColor: colors.card }]}>
                {/* Route Info */}
                <View style={[styles.routeInfo, { borderTopColor: colors.warning }]}>
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
        </KeyboardAvoidingView>

        {/* Sticky Bottom Action */}
        <View style={styles.bottomAction}>
          <TouchableOpacity
            style={[styles.confirmButton, (loading || isRecalculatingRoute) && styles.confirmButtonDisabled]}
            onPress={handleFindRide}
            activeOpacity={0.8}
            disabled={loading || isRecalculatingRoute}
          >
            {loading || isRecalculatingRoute ? (
              <>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.confirmButtonText}>
                  {isRecalculatingRoute ? 'Cập nhật tuyến đường...' : 'Tìm chuyến xe...'}
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.confirmButtonText}>Tìm chuyến xe</Text>
                <MaterialIcons name="arrow-forward" size={20} color="#fff" />
              </>
            )}
          </TouchableOpacity>
        </View>
      </Animated.View>
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
  liveUpdateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginLeft: 'auto',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  liveUpdateText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
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
    paddingTop: 0,
    paddingBottom: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 15,
  },
  handleBarContainer: {
    paddingVertical: 12,
    paddingTop: 12,
    alignItems: 'center',
  },
  handleBar: {
    width: 40,
    height: 5,
    backgroundColor: '#D1D5DB',
    borderRadius: 3,
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
  bottomAction: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 49,
  },
  confirmButton: {
    backgroundColor: '#FF6B00',
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    elevation: 4,
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  confirmButtonDisabled: {
    backgroundColor: '#94a3b8',
    opacity: 0.7,
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
  selectedLocationsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  selectedLocationsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  selectedLocationsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  locationDetailItem: {
    flexDirection: 'row',
    gap: 12,
  },
  locationDetailIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF7ED',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  locationDetailContent: {
    flex: 1,
  },
  locationDetailLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  locationDetailAddress: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    lineHeight: 20,
    marginBottom: 4,
  },
  locationDetailCoords: {
    fontSize: 11,
    color: '#9CA3AF',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  journeyLine: {
    marginLeft: 18,
    paddingVertical: 8,
  },
  journeyDots: {
    flexDirection: 'column',
    gap: 4,
    alignItems: 'center',
  },
  journeyDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#D1D5DB',
  },
  // ============ CHUYẾN LIÊN TỈNH - Inter-Provincial Routes Styles ============
  routesSearching: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 16,
    backgroundColor: '#FFF7ED',
    borderRadius: 12,
    marginBottom: 16,
  },
  routesSearchingText: {
    fontSize: 14,
    color: '#92400E',
    fontWeight: '500',
  },
  routesContainer: {
    backgroundColor: '#FFF7ED',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FBBF24',
  },
  routesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  routesHeaderText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#92400E',
    flex: 1,
  },
  routesBadge: {
    backgroundColor: '#FF6B00',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  routesBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  routesSubtitle: {
    fontSize: 11,
    color: '#92400E',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  routeCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  routeCardSelected: {
    borderColor: '#FF6B00',
    backgroundColor: '#FFF7ED',
  },
  routeCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  routeCardTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  routeCardName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  routeCardNameSelected: {
    color: '#FF6B00',
  },
  routeCardLocations: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  routeCardLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  routeCardLocationText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  routeCardPricing: {
    marginBottom: 8,
  },
  routeCardPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  routeCardPriceLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  routeCardPriceValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FF6B00',
  },
  routeCardDiscountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  routeCardDiscountText: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '600',
  },
  routeCardDescription: {
    fontSize: 11,
    color: '#6B7280',
    fontStyle: 'italic',
    marginBottom: 6,
  },
  routeCardDuration: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  routeCardDurationText: {
    fontSize: 11,
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
