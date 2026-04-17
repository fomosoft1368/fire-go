import { useState, useEffect, useRef } from 'react'
import { useSelector } from 'react-redux'
import type { RootState } from '../redux/store'
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert,
    Animated,
    TextInput,
    PanResponder,
    Dimensions,
    KeyboardAvoidingView,
    Keyboard,
    Platform,
    ActivityIndicator,
} from 'react-native'
import * as Location from 'expo-location'
import { SPACING, BORDER_RADIUS, API_BASE_URL } from '../constants'
import MapViewComponent from '../components/MapView'
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons'
import { mapsService } from '../services/mapsService'
import { rideService } from '../services/rideService'
import { calculateFare, getPricingConfig } from '../utils/pricing'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useNavigation } from '@react-navigation/native'
import type { RootStackParamList } from '../types'

interface DeliveryProps {
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

// ============ GIAO HÀNG - Dynamic Config from Backend ============
interface DeliveryGoodsType {
    key: string
    label: string
    icon: string
    surcharge: number
}

interface DeliveryWeightRange {
    key: string
    label: string
    surcharge: number
}

interface DeliveryVehicleType {
    key: string
    label: string
    description: string
    icon: string
    vehicleTypeMapping: string
}
// ============ END GIAO HÀNG ============

const GOODS_TYPES = [
    { key: 'light', label: 'Hàng nhẹ', icon: 'cube-outline' },
    { key: 'bulky', label: 'Cồng kềnh', icon: 'archive-outline' },
    { key: 'food', label: 'Thực phẩm', icon: 'food-apple-outline' },
];
const WEIGHTS = [
    { key: '<20', label: '< 20kg' },
    { key: '20-50', label: '20-50kg' },
    { key: '>50', label: '> 50kg' },
];
const VEHICLES = [
    { key: 'bike', label: 'Xe máy', description: 'Phù hợp hàng nhỏ', icon: 'motorbike' },
    { key: 'truck', label: 'Xe tải nhỏ', description: 'Sức tải 500kg', icon: 'truck-outline' },
];
export default function Delivery(props?: DeliveryProps) {
    const [pickup, setPickup] = useState('')
    const [dropoff, setDropoff] = useState('')
    const [goodsType, setGoodsType] = useState<string>('')
    const [weight, setWeight] = useState<string>('')
    const [vehicle, setVehicle] = useState<string>('bike')
    const [estimatedPrice, setEstimatedPrice] = useState<number>(0)
    const [pickupCoordinates, setPickupCoordinates] = useState<[number, number]>([105.8342, 21.0278]) // Default Hanoi
    const [dropoffCoordinates, setDropoffCoordinates] = useState<[number, number]>([105.8542, 21.0378])
    const [isPickupSelected, setIsPickupSelected] = useState(false)
    const [isDropoffSelected, setIsDropoffSelected] = useState(false)
    const [routeInfo, setRouteInfo] = useState<any>(null)
    const [pickupSuggestions, setPickupSuggestions] = useState<any[]>([])
    const [dropoffSuggestions, setDropoffSuggestions] = useState<any[]>([])
    const [showPickupSuggestions, setShowPickupSuggestions] = useState(false)
    const [showDropoffSuggestions, setShowDropoffSuggestions] = useState(false)
    const [pickupSearchTimeout, setPickupSearchTimeout] = useState<NodeJS.Timeout | null>(null)
    const [dropoffSearchTimeout, setDropoffSearchTimeout] = useState<NodeJS.Timeout | null>(null)
    const [isLoadingCurrentLocation, setIsLoadingCurrentLocation] = useState(true)
    const [drivers, setDrivers] = useState<any[]>([])
    const [isExpanded, setIsExpanded] = useState(false)

    // Draggable Bottom Sheet
    const screenHeight = Dimensions.get('window').height
    const minHeight = screenHeight * 0.42 // 42%
    const maxHeight = screenHeight * 0.85 // 85%
    const initialHeight = screenHeight * 0.42 // 42% - Start collapsed
    const translateY = useRef(new Animated.Value(screenHeight - initialHeight)).current
    const lastGestureDy = useRef(0)

    // Initialize pickup location with current user location
    useEffect(() => {
        const initializePickupLocation = async () => {
            setIsLoadingCurrentLocation(true)
            try {
                console.log('[Delivery] 📍 Requesting location permission...')
                const { status } = await Location.requestForegroundPermissionsAsync()

                if (status !== 'granted') {
                    console.log('[Delivery] ⚠️ Location permission denied')
                    setIsLoadingCurrentLocation(false)
                    return
                }

                console.log('[Delivery] ✅ Getting current position...')
                const location = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.High,
                })

                const { latitude, longitude } = location.coords
                console.log('[Delivery] 📍 Current position:', { latitude, longitude })

                // Reverse geocode to get address
                const address = await mapsService.reverseGeocode(latitude, longitude)
                console.log('[Delivery] 🏠 Address from coordinates:', address)

                setPickup(address)
                setPickupCoordinates([longitude, latitude])
                setIsPickupSelected(true)
                console.log('[Delivery] ✅ Pickup initialized at current location')
            } catch (error) {
                console.error('[Delivery] ❌ Error getting location:', error)
                // Fallback to default location
                setPickup('Hà Nội, Việt Nam')
                // Still mark as selected so route can calc if dropoff is selected
                setIsPickupSelected(true)
            } finally {
                setIsLoadingCurrentLocation(false)
            }
        }

        initializePickupLocation()
    }, [])

    // Fetch available drivers on app startup
    useEffect(() => {
        const fetchAvailableDrivers = async () => {
            try {
                console.log('[Delivery] 📍 Fetching drivers from /api/drivers/available')
                const response = await fetch(`${API_BASE_URL}/drivers/available`, {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' },
                })

                console.log('[Delivery] Response status:', response.status)

                if (response.ok) {
                    const data = await response.json()
                    console.log('✅ [Delivery] Raw API response:', JSON.stringify(data, null, 2))
                    console.log('✅ [Delivery] Total drivers from API:', data?.length)

                    if (!data || data.length === 0) {
                        console.warn('⚠️ [Delivery] No drivers returned from API')
                        setDrivers([])
                        return
                    }

                    // Format drivers data from API response
                    const driversForMap = data.map((driver: any, index: number) => {
                        // Extract coordinates from GeoJSON format
                        const coordinates = driver.currentLocation?.coordinates || []
                        const fullName = `${driver.firstName || 'Tài'} ${driver.lastName || 'xế'}`

                        console.log(`[Delivery] Driver ${index + 1}:`, {
                            name: fullName,
                            currentLocation: driver.currentLocation,
                            coordinates: coordinates,
                        })

                        const formattedDriver = {
                            id: driver._id,
                            latitude: coordinates[1],
                            longitude: coordinates[0],
                            name: fullName,
                            rating: driver.averageRating || 5,
                            vehicle: driver.vehiclePlate || 'Chưa cập nhật',
                            vehicleModel: driver.vehicleModel || '',
                            totalRides: driver.totalRides || 0,
                        }

                        console.log('[Delivery] 🚗 Formatted driver:', formattedDriver)
                        return formattedDriver
                    })

                    console.log('✅ [Delivery] Formatted drivers for map (total):', driversForMap.length)
                    setDrivers(driversForMap)
                } else {
                    console.error('[Delivery] API error - status:', response.status)
                    const errorText = await response.text()
                    console.error('[Delivery] Error response:', errorText)
                }
            } catch (error) {
                console.error('[Delivery] ❌ Fetch drivers error:', error)
                setDrivers([])
            }
        }
        fetchAvailableDrivers()
    }, [])

    // ============ GIAO HÀNG - Dynamic Config ============
    const [goodsTypes, setGoodsTypes] = useState<DeliveryGoodsType[]>(GOODS_TYPES.map(g => ({ ...g, surcharge: 0 })))
    const [weightRanges, setWeightRanges] = useState<DeliveryWeightRange[]>(WEIGHTS.map(w => ({ ...w, surcharge: 0 })))
    const [vehicles, setVehicles] = useState<DeliveryVehicleType[]>(VEHICLES.map(v => ({ ...v, vehicleTypeMapping: v.key === 'truck' ? 'truck' : 'sedan' })))
    // ============ END GIAO HÀNG ============

    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
    const user = useSelector((state: RootState) => state.auth.user)
    const setRideMode = props?.setRideMode

    // PanResponder for draggable bottom sheet
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gestureState) => {
                return Math.abs(gestureState.dy) > 5
            },
            onPanResponderGrant: () => {
                translateY.setOffset(lastGestureDy.current)
                translateY.setValue(0)
            },
            onPanResponderMove: (_, gestureState) => {
                const newValue = gestureState.dy
                if (newValue >= 0 && lastGestureDy.current + newValue <= screenHeight - minHeight) {
                    translateY.setValue(newValue)
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                translateY.flattenOffset()
                const currentY = lastGestureDy.current + gestureState.dy
                const velocity = gestureState.vy

                let snapTo: number
                const midPoint = screenHeight - (maxHeight + minHeight) / 2

                if (Math.abs(velocity) > 0.8) {
                    snapTo = velocity > 0 ? screenHeight - minHeight : screenHeight - maxHeight
                } else if (currentY > midPoint) {
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

    // Initialize bottom sheet position
    useEffect(() => {
        lastGestureDy.current = screenHeight - initialHeight
    }, [])

    // Helper refs: snap bottom sheet to max/min height
    const snapToMaxRef = useRef(() => {
        setIsExpanded(true)
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
        setIsExpanded(false)
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

    // ============ GIAO HÀNG - Load Config from Backend ============
    useEffect(() => {
        const loadDeliveryConfig = async () => {
            try {
                console.log('[Delivery] Loading config from backend...')
                const config = await getPricingConfig()

                if (config.deliveryGoodsTypes && config.deliveryGoodsTypes.length > 0) {
                    setGoodsTypes(config.deliveryGoodsTypes)
                    console.log('[Delivery] Loaded goods types:', config.deliveryGoodsTypes.length)
                }

                if (config.deliveryWeightRanges && config.deliveryWeightRanges.length > 0) {
                    setWeightRanges(config.deliveryWeightRanges)
                    console.log('[Delivery] Loaded weight ranges:', config.deliveryWeightRanges.length)
                }

                if (config.deliveryVehicleTypes && config.deliveryVehicleTypes.length > 0) {
                    setVehicles(config.deliveryVehicleTypes)
                    console.log('[Delivery] Loaded vehicle types:', config.deliveryVehicleTypes.length)
                }
            } catch (error) {
                console.error('[Delivery] Error loading config:', error)
                // Keep using fallback constants if API fails
            }
        }

        loadDeliveryConfig()
    }, [])
    // ============ END GIAO HÀNG ============

    // ============ AUTO-CALCULATE ROUTE WHEN BOTH LOCATIONS SELECTED ============
    useEffect(() => {
        const autoCalculateRoute = async () => {
            if (!isPickupSelected || !isDropoffSelected) {
                console.log('[Delivery] 📍 Waiting for both locations... pickup:', isPickupSelected, 'dropoff:', isDropoffSelected)
                return
            }

            // Check if coordinates are not at default values
            const isPickupDefault = pickupCoordinates[0] === 105.8342 && pickupCoordinates[1] === 21.0278
            const isDropoffDefault = dropoffCoordinates[0] === 105.8542 && dropoffCoordinates[1] === 21.0378

            if (isPickupDefault || isDropoffDefault) {
                console.log('[Delivery] ⚠️ Using default coordinates, not calculating')
                return
            }

            // Check if route info already exists (avoid duplicate calculations)
            if (routeInfo && routeInfo.distance > 0) {
                console.log('[Delivery] ✅ Route already calculated:', routeInfo.distance, 'km')
                return
            }

            console.log('[Delivery] 🚀 AUTO-CALCULATING ROUTE')
            console.log('[Delivery] From:', pickupCoordinates)
            console.log('[Delivery] To:', dropoffCoordinates)
            await calculateRoute(pickupCoordinates, dropoffCoordinates)
        }

        autoCalculateRoute()
    }, [isPickupSelected, isDropoffSelected, pickupCoordinates, dropoffCoordinates, routeInfo])
    // ============ END AUTO-CALCULATE ============

    const handlePickupLocationChange = (text: string) => {
        setPickup(text)

        if (pickupSearchTimeout) {
            clearTimeout(pickupSearchTimeout)
        }

        if (text.trim().length >= 3) {
            setShowPickupSuggestions(true)
            const timeout = setTimeout(async () => {
                try {
                    console.log('[Delivery] Pickup search for:', text)
                    const suggestions = await mapsService.searchPlacesViaBackend(text, user?.id, API_BASE_URL)
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

    const handleDropoffLocationChange = (text: string) => {
        setDropoff(text)

        if (dropoffSearchTimeout) {
            clearTimeout(dropoffSearchTimeout)
        }

        if (text.trim().length >= 3) {
            setShowDropoffSuggestions(true)
            const timeout = setTimeout(async () => {
                try {
                    console.log('[Delivery] Dropoff search for:', text)
                    const suggestions = await mapsService.searchPlacesViaBackend(text, user?.id, API_BASE_URL)
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

    const handlePickupSuggestionSelect = async (suggestion: any) => {
        setPickup(suggestion.fullText)
        setShowPickupSuggestions(false)
        setPickupSuggestions([])

        // Gọi geocode API để lấy tọa độ thực tế
        try {
            console.log('[Delivery] ========== PICKUP SELECTION START ==========')
            console.log('[Delivery] Geocoding pickup location:', suggestion.fullText)
            const geocodeResult = await mapsService.geocodeAddress(suggestion.fullText)

            if (geocodeResult && geocodeResult.coordinates) {
                const coords: [number, number] = [
                    geocodeResult.coordinates.longitude,
                    geocodeResult.coordinates.latitude
                ]
                setPickupCoordinates(coords)
                setIsPickupSelected(true)
                console.log('[Delivery] ✅ Pickup coordinates set:', coords)

                // Tự động tính tuyến đường nếu đã có điểm giao hàng
                if (dropoff.trim() && isDropoffSelected) {
                    console.log('[Delivery] 📍 Both locations selected, calculating route...')
                    console.log('[Delivery] Pickup coords (new):', coords)
                    console.log('[Delivery] Dropoff coords (current):', dropoffCoordinates)
                    await calculateRoute(coords, dropoffCoordinates)
                } else {
                    console.log('[Delivery] ⏳ Waiting for dropoff to be selected...')
                    console.log('[Delivery] dropoff.trim():', !!dropoff.trim(), 'isDropoffSelected:', isDropoffSelected)
                }
                console.log('[Delivery] ========== PICKUP SELECTION END ==========')
            } else {
                console.error('[Delivery] ❌ No coordinates in geocode result')
            }
        } catch (error) {
            console.error('[Delivery] ❌ Geocoding error:', error)
            Alert.alert('Lỗi', 'Không thể lấy tọa độ điểm lấy hàng')
        }
    }

    const handleDropoffSuggestionSelect = async (suggestion: any) => {
        setDropoff(suggestion.fullText)
        setShowDropoffSuggestions(false)
        setDropoffSuggestions([])

        // Gọi geocode API để lấy tọa độ thực tế
        try {
            console.log('[Delivery] ========== DROPOFF SELECTION START ==========')
            console.log('[Delivery] Geocoding dropoff location:', suggestion.fullText)
            const geocodeResult = await mapsService.geocodeAddress(suggestion.fullText)

            if (geocodeResult && geocodeResult.coordinates) {
                const coords: [number, number] = [
                    geocodeResult.coordinates.longitude,
                    geocodeResult.coordinates.latitude
                ]
                setDropoffCoordinates(coords)
                setIsDropoffSelected(true)
                console.log('[Delivery] ✅ Dropoff coordinates set:', coords)

                // Tự động tính tuyến đường nếu đã có điểm lấy hàng
                if (pickup.trim() && isPickupSelected) {
                    console.log('[Delivery] 📍 Both locations selected, calculating route...')
                    console.log('[Delivery] Pickup coords (current):', pickupCoordinates)
                    console.log('[Delivery] Dropoff coords (new):', coords)
                    await calculateRoute(pickupCoordinates, coords)
                } else {
                    console.log('[Delivery] ⏳ Waiting for pickup to be selected...')
                    console.log('[Delivery] pickup.trim():', !!pickup.trim(), 'isPickupSelected:', isPickupSelected)
                }
                console.log('[Delivery] ========== DROPOFF SELECTION END ==========')
            } else {
                console.error('[Delivery] ❌ No coordinates in geocode result')
            }
        } catch (error) {
            console.error('[Delivery] ❌ Geocoding error:', error)
            Alert.alert('Lỗi', 'Không thể lấy tọa độ điểm giao hàng')
        }
    }

    const calculateRoute = async (startCoords: [number, number], endCoords: [number, number]) => {
        try {
            console.log('[Delivery] ========== CALCULATING ROUTE START ==========')
            console.log('[Delivery] Start:', startCoords, 'End:', endCoords)
            console.log('[Delivery] Calling rideService.getDirections...')
            const directions = await rideService.getDirections(
                startCoords[0],
                startCoords[1],
                endCoords[0],
                endCoords[1],
            );

            console.log('[Delivery] ✅ Got directions response')
            console.log('[Delivery] Response type:', typeof directions)
            console.log('[Delivery] Response keys:', directions ? Object.keys(directions) : 'null')
            console.log('[Delivery] Full response:', JSON.stringify(directions, null, 2));

            // Handle different response formats from backend
            let distance = 0;
            let duration = 0;
            let routeCoordinates: Array<{ latitude: number, longitude: number }> = [];

            // Format: features[0].geometry.coordinates and properties.summary
            if (directions.features?.[0]) {
                console.log('[Delivery] 📍 Using features[0] format')
                const feature = directions.features[0];

                // Get distance and duration
                if (feature.properties?.summary) {
                    distance = feature.properties.summary.distance;
                    duration = feature.properties.summary.duration;
                    console.log('[Delivery] Got summary:', { distance, duration })
                }

                // Get route coordinates from geometry
                if (feature.geometry?.coordinates) {
                    // OSRM returns coordinates as [lng, lat] pairs
                    routeCoordinates = feature.geometry.coordinates.map((coord: [number, number]) => ({
                        latitude: coord[1],
                        longitude: coord[0],
                    }));
                    console.log('[Delivery] Got coordinates:', routeCoordinates.length, 'points')
                }
            }
            // Fallback: direct properties
            else if (directions.distance !== undefined && directions.duration !== undefined) {
                console.log('[Delivery] 📍 Using direct properties format')
                distance = directions.distance;
                duration = directions.duration;
                console.log('[Delivery] Got distance/duration:', { distance, duration })
            }
            // Fallback: routes array
            else if (directions.routes?.[0]) {
                console.log('[Delivery] 📍 Using routes[0] format')
                distance = directions.routes[0].distance;
                duration = directions.routes[0].duration;
                console.log('[Delivery] Got from routes[0]:', { distance, duration })
                if (directions.routes[0].geometry?.coordinates) {
                    routeCoordinates = directions.routes[0].geometry.coordinates.map((coord: [number, number]) => ({
                        latitude: coord[1],
                        longitude: coord[0],
                    }));
                    console.log('[Delivery] Got coordinates:', routeCoordinates.length, 'points')
                }
            } else {
                console.error('[Delivery] ❌ Unknown response format!')
                console.error('[Delivery] Expected features[0], or routes[0], or direct distance/duration')
            }

            console.log('[Delivery] 📊 Extracted:', { distance, duration, routeCoordinatesCount: routeCoordinates.length });

            if (!distance || !duration || distance === 0 || duration === 0) {
                console.error('[Delivery] ❌ Invalid distance or duration:', { distance, duration });
                Alert.alert('Lỗi', 'Không thể tính tuyến đường. Vui lòng kiểm tra địa chỉ và thử lại.');
                return;
            }

            // Convert distance from meters to km if needed
            const distanceKm = distance > 500 ? distance / 1000 : distance;

            setRouteInfo({
                distance: distanceKm,
                duration: duration,
                distanceText: `${distanceKm.toFixed(1)} km`,
                durationText: `~${Math.ceil(duration / 60)} phút`,
                routeCoordinates: routeCoordinates,
            });

            console.log('[Delivery] ✅ Route info SET:', { distanceKm, duration, routeCoordinatesCount: routeCoordinates.length });
            console.log('[Delivery] ========== CALCULATING ROUTE END ==========')
        } catch (error: any) {
            console.error('[Delivery] ========== ROUTE CALCULATION ERROR ==========')
            console.error('[Delivery] Error message:', error.message);
            console.error('[Delivery] Error stack:', error.stack);
            console.error('[Delivery] Full error:', error);
            Alert.alert('Lỗi', error.message || 'Không thể tính toán tuyến đường');
        }
    };

    // Cleanup timeouts on unmount
    useEffect(() => {
        return () => {
            if (pickupSearchTimeout) clearTimeout(pickupSearchTimeout)
            if (dropoffSearchTimeout) clearTimeout(dropoffSearchTimeout)
        }
    }, [])

    // Calculate price based on selections and distance using backend pricing API
    useEffect(() => {
        console.log('[Delivery] 💰 Price calculation effect triggered')
        console.log('[Delivery] routeInfo:', routeInfo)
        console.log('[Delivery] vehicle:', vehicle)
        console.log('[Delivery] weight:', weight)
        console.log('[Delivery] goodsType:', goodsType)
        console.log('[Delivery] vehicles config available:', vehicles.length)
        console.log('[Delivery] weightRanges config available:', weightRanges.length)
        console.log('[Delivery] goodsTypes config available:', goodsTypes.length)

        if (!routeInfo?.distance) {
            console.log('[Delivery] ⚠️ No route info or distance, setting price to 0')
            setEstimatedPrice(0)
            return
        }

        const calculateDeliveryPrice = async () => {
            try {
                const distanceKm = routeInfo.distance
                console.log('[Delivery] 📍 Calculating price for distance:', distanceKm, 'km')

                // ============ GIAO HÀNG - Get vehicle mapping from config ============
                const selectedVehicle = vehicles.find(v => v.key === vehicle)
                const carType = (selectedVehicle?.vehicleTypeMapping || 'bike') as 'bike' | 'sedan' | 'truck'
                console.log('[Delivery] 🚗 Vehicle selected:', vehicle, '→ carType:', carType)
                // ============ END GIAO HÀNG ============

                // Tính giá giao hàng: không có giảm giá ghép xe (totalPassengers = 1)
                // Backend tự động check giờ cao điểm và áp dụng multiplier nếu cần
                console.log('[Delivery] 📤 Calling calculateFare with:', { distanceKm, carType })
                const fareBreakdown = await calculateFare(distanceKm, carType, 1, true)
                console.log('[Delivery] ✅ Fare breakdown received:', fareBreakdown)

                // ============ GIAO HÀNG - Weight surcharge from config ============
                const weightConfig = weightRanges.find(w => w.key === weight)
                const weightSurcharge = weightConfig?.surcharge || 0
                console.log('[Delivery] ⚖️ Weight:', weight, '→ surcharge:', weightSurcharge)
                // ============ END GIAO HÀNG ============

                // ============ GIAO HÀNG - Goods type surcharge from config ============
                const goodsConfig = goodsTypes.find(g => g.key === goodsType)
                const goodsSurcharge = goodsConfig?.surcharge || 0
                console.log('[Delivery] 📦 Goods type:', goodsType, '→ surcharge:', goodsSurcharge)
                // ============ END GIAO HÀNG ============

                // Total price = base fare từ backend + surcharges
                const totalPrice = fareBreakdown.finalPrice + weightSurcharge + goodsSurcharge

                console.log('[Delivery] 💰 FINAL PRICE CALCULATION:', {
                    baseFare: fareBreakdown.finalPrice,
                    weightSurcharge,
                    goodsSurcharge,
                    totalPrice,
                    rounded: Math.round(totalPrice / 1000) * 1000,
                })

                setEstimatedPrice(Math.round(totalPrice / 1000) * 1000) // Round to nearest 1000
            } catch (error) {
                console.error('[Delivery] ❌ Price calculation error:', error)
                console.error('[Delivery] Error details:', error instanceof Error ? error.message : String(error))
                // Fallback to 0 if API fails
                setEstimatedPrice(0)
            }
        }

        calculateDeliveryPrice()
    }, [vehicle, weight, goodsType, routeInfo, vehicles, weightRanges, goodsTypes]) // ============ GIAO HÀNG - Added dependencies ============

    const handleConfirm = async () => {
        if (!pickup || !dropoff || !goodsType || !weight) {
            Alert.alert('Thiếu thông tin', 'Vui lòng điền đầy đủ thông tin giao hàng')
            return
        }

        // Navigate to ConfirmDelivery screen with all data
        navigation.navigate('ConfirmDelivery', {
            pickup,
            dropoff,
            pickupCoordinates,
            dropoffCoordinates,
            goodsType,
            weight,
            vehicle,
            estimatedPrice,
            distance: routeInfo?.distanceText || '0 km',
            duration: routeInfo?.durationText || '0 phút',
        })
    }

    return (
        <View style={styles.container}>
            <MapViewComponent
                height={screenHeight}
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
            </View>

            <Animated.View
                style={[
                    {
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: screenHeight,
                        backgroundColor: 'transparent',
                        transform: [{ translateY }],
                    }
                ]}
                pointerEvents="box-none"
            >
                <View style={styles.card} pointerEvents="auto">
                    <View style={{ alignItems: 'center', width: '100%', paddingVertical: 12 }}>
                        <TouchableOpacity 
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                backgroundColor: '#F4F4F5',
                                paddingVertical: 6,
                                paddingHorizontal: 16,
                                borderRadius: 20,
                                borderWidth: 1,
                                borderColor: '#E4E4E7',
                            }} 
                            onPress={() => isExpanded ? snapToMinRef.current() : snapToMaxRef.current()}
                            activeOpacity={0.7}
                        >
                            <Text style={{ color: '#52525B', fontSize: 13, fontWeight: '600', marginRight: 4 }}>
                                {isExpanded ? "Thu gọn" : "Mở rộng"}
                            </Text>
                            <MaterialIcons 
                                name={isExpanded ? "expand-more" : "expand-less"} 
                                size={20} 
                                color="#52525B" 
                            />
                        </TouchableOpacity>
                    </View>

                    {/* Title Section */}
                    <View style={styles.cardHeader}>
                        <MaterialCommunityIcons name="truck-delivery" size={28} color="#FF6B00" />
                        <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={styles.cardTitle}>Giao hàng nhanh</Text>
                            <Text style={styles.cardSubtitle}>Vận chuyển hàng hóa an toàn</Text>
                        </View>
                        {estimatedPrice > 0 && (
                            <View style={styles.priceTag}>
                                <Text style={styles.priceTagText}>~{estimatedPrice.toLocaleString('vi-VN')}đ</Text>
                            </View>
                        )}
                    </View>

                    <KeyboardAvoidingView
                        style={{ flex: 1 }}
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
                    >
                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            style={styles.scrollContent}
                            contentContainerStyle={{ paddingBottom: 250 }}
                            keyboardShouldPersistTaps="handled"
                        >
                            {/* Location Inputs */}
                            <View style={styles.locationsContainer}>
                                <View style={[styles.inputGroup, showPickupSuggestions && { zIndex: 100 }]}>
                                    <View style={styles.inputRow}>
                                        <View style={styles.iconWrapper}>
                                            {isLoadingCurrentLocation ? (
                                                <ActivityIndicator size="small" color="#22C55E" />
                                            ) : (
                                                <MaterialIcons name="radio-button-checked" size={20} color="#22C55E" />
                                            )}
                                        </View>
                                        <TextInput
                                            style={styles.input}
                                            placeholder={isLoadingCurrentLocation ? "Đang lấy vị trí..." : "Điểm lấy hàng"}
                                            placeholderTextColor="#9CA3AF"
                                            value={pickup}
                                            onChangeText={handlePickupLocationChange}
                                            onFocus={() => {
                                                setShowPickupSuggestions(true)
                                                snapToMax()
                                            }}
                                            editable={!isLoadingCurrentLocation}
                                        />
                                    </View>

                                    {showPickupSuggestions && pickupSuggestions.length > 0 && (
                                        <View style={styles.suggestionsDropdown}>
                                            <ScrollView
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
                                        </View>
                                    )}
                                </View>

                                <View style={styles.locationDivider}>
                                    <View style={styles.dashedLine} />
                                </View>

                                <View style={[styles.inputGroup, showDropoffSuggestions && { zIndex: 100 }]}>
                                    <View style={styles.inputRow}>
                                        <View style={styles.iconWrapper}>
                                            <MaterialIcons name="flag" size={20} color="#EF4444" />
                                        </View>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Điểm giao hàng"
                                            placeholderTextColor="#9CA3AF"
                                            value={dropoff}
                                            onChangeText={handleDropoffLocationChange}
                                            onFocus={() => {
                                                setShowDropoffSuggestions(true)
                                                snapToMax()
                                            }}
                                        />
                                    </View>

                                    {showDropoffSuggestions && dropoffSuggestions.length > 0 && (
                                        <View style={styles.suggestionsDropdown}>
                                            <ScrollView
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
                                        </View>
                                    )}
                                </View>
                            </View>

                            {/* Goods Type */}
                            <View style={styles.section}>
                                <Text style={styles.sectionLabel}>Loại hàng hóa</Text>
                                <View style={styles.optionsRow}>
                                    {/* ============ GIAO HÀNG - Dynamic goods types ============ */}
                                    {goodsTypes.map(type => (
                                        <TouchableOpacity
                                            key={type.key}
                                            style={[
                                                styles.optionBtn,
                                                goodsType === type.label && styles.optionBtnActive
                                            ]}
                                            onPress={() => setGoodsType(type.label)}
                                            activeOpacity={0.7}
                                        >
                                            <MaterialCommunityIcons
                                                name={type.icon as any}
                                                size={18}
                                                color={goodsType === type.label ? '#FF6B00' : '#6B7280'}
                                            />
                                            <Text style={[
                                                styles.optionBtnText,
                                                goodsType === type.label && styles.optionBtnTextActive
                                            ]}>
                                                {type.label}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                    {/* ============ END GIAO HÀNG ============ */}
                                </View>
                            </View>

                            {/* Weight */}
                            <View style={styles.section}>
                                <Text style={styles.sectionLabel}>Trọng lượng ước tính</Text>
                                <View style={styles.optionsRow}>
                                    {/* ============ GIAO HÀNG - Dynamic weight ranges ============ */}
                                    {weightRanges.map(w => (
                                        <TouchableOpacity
                                            key={w.key}
                                            style={[
                                                styles.weightBtn,
                                                weight === w.label && styles.weightBtnActive
                                            ]}
                                            onPress={() => setWeight(w.label)}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={[
                                                styles.weightBtnText,
                                                weight === w.label && styles.weightBtnTextActive
                                            ]}>
                                                {w.label}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                    {/* ============ END GIAO HÀNG ============ */}
                                </View>
                            </View>

                            {/* Vehicle Selection */}
                            <View style={styles.section}>
                                <Text style={styles.sectionLabel}>Phương tiện vận chuyển</Text>
                                <View style={styles.vehicleRow}>
                                    {/* ============ GIAO HÀNG - Dynamic vehicle types ============ */}
                                    {vehicles.map(v => (
                                        <TouchableOpacity
                                            key={v.key}
                                            style={[
                                                styles.vehicleCard,
                                                vehicle === v.label && styles.vehicleCardActive
                                            ]}
                                            onPress={() => setVehicle(v.label)}
                                            activeOpacity={0.7}
                                        >
                                            <MaterialCommunityIcons
                                                name={v.icon as any}
                                                size={32}
                                                color={vehicle === v.label ? '#FF6B00' : '#6B7280'}
                                            />
                                            <Text style={[
                                                styles.vehicleLabel,
                                                vehicle === v.label && styles.vehicleLabelActive
                                            ]}>
                                                {v.label}
                                            </Text>
                                            <Text style={styles.vehicleDesc}>{v.description}</Text>
                                        </TouchableOpacity>
                                    ))}
                                    {/* ============ END GIAO HÀNG ============ */}
                                </View>
                            </View>
                        </ScrollView>
                    </KeyboardAvoidingView>

                    {/* Sticky Bottom Action */}
                </View>
            </Animated.View>

            {/* Sticky Bottom Action permanently anchored to the screen bottom */}
            <View style={[styles.bottomAction, { position: 'absolute', bottom: 0, left: 0, right: 0 }]}>
                {estimatedPrice > 0 && (
                    <View style={styles.priceContainer}>
                        <Text style={styles.priceLabel}>Tổng cộng</Text>
                        <Text style={styles.totalPrice}>
                            {estimatedPrice.toLocaleString('vi-VN')}đ
                        </Text>
                    </View>
                )}
                <TouchableOpacity
                    style={styles.confirmButton}
                    onPress={handleConfirm}
                    activeOpacity={0.8}
                >
                    <Text style={styles.confirmButtonText}>Xác nhận đặt hàng</Text>
                    <MaterialIcons name="arrow-forward" size={20} color="#fff" />
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
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingHorizontal: 20,
        paddingTop: 0,
        paddingBottom: 34,
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
    priceTag: {
        backgroundColor: '#DCFCE7',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    priceTagText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#16A34A',
    },
    scrollContent: {
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
    optionsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    optionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingVertical: 10,
        gap: 6,
    },
    optionBtnActive: {
        backgroundColor: '#FFF7ED',
        borderColor: '#FF6B00',
    },
    optionBtnText: {
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '600',
    },
    optionBtnTextActive: {
        color: '#FF6B00',
        fontWeight: '700',
    },
    weightBtn: {
        flex: 1,
        backgroundColor: '#F9FAFB',
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        paddingVertical: 12,
        alignItems: 'center',
        minWidth: 90,
    },
    weightBtnActive: {
        backgroundColor: '#FFF7ED',
        borderColor: '#FF6B00',
    },
    weightBtnText: {
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '600',
    },
    weightBtnTextActive: {
        color: '#FF6B00',
        fontWeight: '700',
    },
    vehicleRow: {
        flexDirection: 'row',
        gap: 12,
    },
    vehicleCard: {
        flex: 1,
        backgroundColor: '#F9FAFB',
        borderRadius: 16,
        alignItems: 'center',
        paddingVertical: 20,
        paddingHorizontal: 12,
        borderWidth: 2,
        borderColor: '#E5E7EB',
    },
    vehicleCardActive: {
        backgroundColor: '#FFF7ED',
        borderColor: '#FF6B00',
    },
    vehicleLabel: {
        fontSize: 15,
        fontWeight: '700',
        color: '#374151',
        marginTop: 10,
        textAlign: 'center',
    },
    vehicleLabelActive: {
        color: '#FF6B00',
    },
    vehicleDesc: {
        fontSize: 12,
        color: '#9CA3AF',
        marginTop: 4,
        textAlign: 'center',
    },
    bottomAction: {
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
        paddingHorizontal: 20,
        paddingVertical: 6,
        paddingBottom: 42,
    },
    priceContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    priceLabel: {
        fontSize: 14,
        color: '#64748b',
        fontWeight: '500',
    },
    totalPrice: {
        fontSize: 20,
        fontWeight: '700',
        color: '#FF6B00',
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
    suggestionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
        gap: SPACING.md,
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
