import { useState, useEffect, useRef } from 'react'
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
  ActivityIndicator,
  Animated,
  PanResponder,
  Dimensions,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
} from 'react-native'
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons'
import { SPACING, BORDER_RADIUS, COLORS_DARK, COLORS_LIGHT } from '../constants'
import { API_BASE_URL } from '../constants/config'
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
  const [isLoadingCurrentLocation, setIsLoadingCurrentLocation] = useState(true)
  // ====== DEPOSIT (Cá»ŒC) STATES ======
  const [depositMinKm, setDepositMinKm] = useState(50)         // km // km tối thiểu bắt đặt cọc
  const [depositPercent, setDepositPercent] = useState(30)     // % tiền cọc
  const [depositAmount, setDepositAmount] = useState(0)        // Số tiền cọc (VNĐ)
  const [needsDeposit, setNeedsDeposit] = useState(false)      // Có cần đặt cọc không
  const [depositAgreed, setDepositAgreed] = useState(false)    // Khách đã tick đồng ý
  const [walletBalance, setWalletBalance] = useState<number | null>(null) // Số dư ví

  // ====================================

  // Draggable Bottom Sheet
  const screenHeight = Dimensions.get('window').height
  const minHeight = screenHeight * 0.42 // 42% - Enough to show button with all content
  const maxHeight = screenHeight * 0.85 // 85%
  const initialHeight = screenHeight * 0.42 // 42% - Start at collapsed
  const translateY = useRef(new Animated.Value(screenHeight - initialHeight)).current
  const lastGestureDy = useRef(0)

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
          snapTo = screenHeight - minHeight // Snap to collapsed (65%)
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

  // Reset ride state khi cancel - gọi API để hoàn cọc nếu có
  const resetRideState = async () => {
    if (rideId) {
      try {
        console.log('[HireDriverScreen] 🚫 Cancelling ride:', rideId)
        await rideService.cancelRide(rideId, 'customer', 'Khách hủy tìm tài xế')
        console.log('[HireDriverScreen] ✅ Ride cancelled, deposit will be refunded if applicable')
      } catch (err) {
        console.warn('[HireDriverScreen] ⚠️ Cancel API error:', err)
      }
    }
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

    // Chá»‰ search náº¿u text >= 5 kÃ½ tá»±
    if (text.trim().length >= 5) {
      setShowPickupSuggestions(true)
      // Debounce 800ms Ä‘á»ƒ giáº£m request
      const timeout = setTimeout(async () => {
        try {
          console.log('[Search] Pickup search for:', text)
          const suggestions = await mapsService.searchPlacesViaBackend(text, user?.id, API_BASE_URL)
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

    // Chá»‰ search náº¿u text >= 3 kÃ½ tá»±
    if (text.trim().length >= 3) {
      setShowDropoffSuggestions(true)
      // Debounce 500ms Ä‘á»ƒ giáº£m request
      const timeout = setTimeout(async () => {
        try {
          console.log('[Search] Dropoff search for:', text)
          const suggestions = await mapsService.searchPlacesViaBackend(text, user?.id, API_BASE_URL)
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
      setIsLoadingCurrentLocation(true)
      try {
        console.log('[HireDriverScreen] ðŸ“ Requesting location permission...')
        const { status } = await Location.requestForegroundPermissionsAsync()

        if (status !== 'granted') {
          console.log('[HireDriverScreen] âš ï¸ Location permission denied')
          setIsLoadingCurrentLocation(false)
          return
        }

        console.log('[HireDriverScreen] âœ… Getting current position...')
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        })

        const { latitude, longitude } = location.coords
        console.log('[HireDriverScreen] ðŸ“ Current position:', { latitude, longitude })

        // Reverse geocode to get address
        const address = await mapsService.reverseGeocode(latitude, longitude)
        console.log('[HireDriverScreen] ðŸ  Address from coordinates:', address)

        setPickupLocation(address)
      } catch (error) {
        console.error('[HireDriverScreen] âŒ Error getting location:', error)
        // Fallback to default location
        setPickupLocation('HÃ  Ná»™i, Viá»‡t Nam')
      } finally {
        setIsLoadingCurrentLocation(false)
      }
    }

    initializePickupLocation()
  }, [])

  const handleScheduleDateTime = (dateTime: Date) => {
    setScheduledDateTime(dateTime)
    setShowScheduleModal(false)
  }

  // Polling Ä‘á»ƒ láº¥y thÃ´ng tin tÃ i xáº¿ khi driver nháº­n cuá»‘c
  useEffect(() => {
    if (!isSearching || !rideId) {
      return
    }

    console.log('[HireDriverScreen] ðŸ”„ Starting polling for rideId:', rideId)

    const pollInterval = setInterval(async () => {
      try {
        const token = await AsyncStorage.getItem('token')
        const rideData = await rideService.getRideById(rideId, token || undefined)

        console.log('[HireDriverScreen] ðŸ“Š Polling result:', {
          hasDriverId: !!rideData?.driverId,
          driverType: typeof rideData?.driverId,
        })

        if (!rideData || typeof rideData !== 'object') {
          return
        }

        const driverData = rideData.driverId

        if (driverData && typeof driverData === 'object' && driverData._id) {
          console.log('[HireDriverScreen] âœ… Driver found!', driverData._id)

          // Extract driver location
          let driverLat = 21.0285 // Default Hanoi
          let driverLng = 105.8542
          if (driverData.currentLocation?.coordinates) {
            driverLat = driverData.currentLocation.coordinates[1]
            driverLng = driverData.currentLocation.coordinates[0]
            console.log('[HireDriverScreen] ðŸ“ Driver location:', { lat: driverLat, lng: driverLng })
          }

          setDriver({
            id: driverData._id,
            name: `${driverData.firstName || ''} ${driverData.lastName || ''}`.trim() || 'Tài Xế',
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
        console.error('[HireDriverScreen] âŒ Polling error:', error)
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

  // TÃ­nh giÃ¡ cÆ°á»›c khi có Ä‘á»§ thÃ´ng tin
  const calculateEstimate = async () => {
    if (!pickupLocation.trim() || !dropoffLocation.trim()) {
      return
    }

    setCalculating(true)
    try {
      console.log('[HireDriverScreen] ðŸš— ===== Báº®T Äáº¦U TÃNH GIÃ =====')
      console.log('[HireDriverScreen] ðŸ“ Input:', {
        pickup: pickupLocation,
        dropoff: dropoffLocation,
        carType,
      })

      const route = await mapsService.getRouteInfo(pickupLocation, dropoffLocation)
      console.log('[HireDriverScreen] ðŸ—ºï¸ Route info:', {
        distance: route.distance + ' km',
        duration: route.duration + ' phút',
        pickup: route.pickup?.formattedAddress,
        dropoff: route.dropoff?.formattedAddress,
      })
      setRouteInfo(route)

      // ============ LÃI XE Há»˜ - TÃ­nh giÃ¡ theo nghiá»‡p vá»¥ phÃ­ má»Ÿ cá»­a + km miá»…n phÃ­ ============
      console.log('[HireDriverScreen] ðŸ’° Calling calculateHireDriverFare with:', {
        distance: route.distance,
        carType,
      })

      const fare = await calculateHireDriverFare(route.distance, carType)

      console.log('[HireDriverScreen] âœ… Hire Driver Fare calculated:', {
        total: fare.total + 'Ä‘',
        openingFee: fare.openingFee + 'Ä‘',
        freeKm: fare.freeKm + 'km',
        extraKm: fare.extraKm + 'km',
        extraKmFee: fare.extraKmFee + 'Ä‘',
        pricePerExtraKm: fare.pricePerExtraKm + 'Ä‘/km',
        breakdown: `${fare.openingFee}Ä‘ + ${fare.extraKm}km Ã— ${fare.pricePerExtraKm}Ä‘ = ${fare.total}Ä‘`,
      })

      setFareEstimate(fare)

      // ====== DEPOSIT: Cáº­p nháº­t tÃ¬nh tráº¡ng Ä‘áº·t cá»c sau khi tÃ­nh giÃ¡ ======
      try {
        const token = await AsyncStorage.getItem('token')
        // Fetch deposit config vÃ  sá»‘ dÆ° vÃ­ cá»§a khÃ¡ch
        const [configRes, walletRes] = await Promise.all([
          fetch(`${require('../constants/config').API_BASE_URL}/pricing/config`, {
            headers: { 'Content-Type': 'application/json' },
          }),
          fetch(`${require('../constants/config').API_BASE_URL}/customers/me/wallet`, {
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          }),
        ])
        if (configRes.ok) {
          const config = await configRes.json()
          // Láº¥y config lÃ¡i xe há»™ theo loáº¡i xe Ä‘ang chá»n
          const hireConfig = (config?.hireDriverPricing || []).find((h: any) => h.vehicleType === carType) ||
            (config?.hireDriverPricing || [])[0]
          const minKm = hireConfig?.depositMinKm ?? 50
          const percent = hireConfig?.depositPercent ?? 30
          setDepositMinKm(minKm)
          setDepositPercent(percent)

          if (route.distance >= minKm) {
            const calcDeposit = Math.round((fare.total * percent) / 100)
            setDepositAmount(calcDeposit)
            setNeedsDeposit(true)
            setDepositAgreed(false) // Reset khi tính lại
          } else {
            setDepositAmount(0)
            setNeedsDeposit(false)
            setDepositAgreed(false)
          }
        }
        if (walletRes.ok) {
          const w = await walletRes.json()
          setWalletBalance(w?.walletBalance ?? w?.balance ?? null)
        }
      } catch (depErr) {
        console.log('[HireDriverScreen] Deposit config fetch error (non-critical):', depErr)
      }
      // =============================================================

      console.log('[HireDriverScreen] ðŸŽ¯ Tá»”NG Káº¾T:', {
        distance: route.distance + ' km',
        finalPrice: fare.total + 'Ä‘',
        formula: route.distance <= fare.freeKm
          ? `Trong ${fare.freeKm}km miá»…n phÃ­ â†’ Chá»‰ tÃ­nh phÃ­ má»Ÿ cá»­a ${fare.openingFee}Ä‘`
          : `${fare.openingFee}Ä‘ + (${route.distance} - ${fare.freeKm})km Ã— ${fare.pricePerExtraKm}Ä‘/km = ${fare.total}Ä‘`,
      })
      console.log('[HireDriverScreen] ===== Káº¾T THÃšC TÃNH GIÃ =====\n')

      // ThÃ´ng bÃ¡o náº¿u Ä‘ang dÃ¹ng mock data
      if (route.isMockData) {
        Alert.alert(
          'âš ï¸ Cháº¿ Ä‘á»™ Demo',
          'Hiá»‡n Ä‘ang sá»­ dá»¥ng dá»¯ liá»‡u giáº£ láº­p.\n\nÄá»ƒ sá»­ dá»¥ng Google Maps tháº­t, vui lÃ²ng cáº¥u hÃ¬nh API key trong file .env',
          [{ text: 'OK' }]
        )
      }
    } catch (err: any) {
      console.error('[HireDriverScreen] Calculate error:', err)
      Alert.alert('Lá»—i', err.message || 'KhÃ´ng thá»ƒ tÃ­nh toÃ¡n tuyáº¿n Ä‘Æ°á»ng')
    } finally {
      setCalculating(false)
    }
  }

  // Validation vÃ  táº¡o cuá»‘c xe
  const handleCreateRide = async () => {
    // Kiá»ƒm tra Ä‘Äƒng nháº­p
    if (!user) {
      Alert.alert('YÃªu cáº§u Ä‘Äƒng nháº­p', 'Báº¡n cáº§n Ä‘Äƒng nháº­p Ä‘á»ƒ Ä‘áº·t xe!')
      return
    }

    // Validation cÃ¡c trÆ°á»ng báº¯t buá»™c
    if (!pickupLocation.trim()) {
      Alert.alert('Thiáº¿u thÃ´ng tin', 'Vui lÃ²ng nháº­p Ä‘iá»ƒm Ä‘Ã³n!')
      return
    }

    if (!dropoffLocation.trim()) {
      Alert.alert('Thiáº¿u thÃ´ng tin', 'Vui lÃ²ng nháº­p Ä‘iá»ƒm Ä‘áº¿n!')
      return
    }

    if (!licensePlate.trim()) {
      Alert.alert('Thiáº¿u thÃ´ng tin', 'Vui lÃ²ng nháº­p biá»ƒn sá»‘ xe!')
      return
    }

    // Náº¿u chÆ°a tÃ­nh giÃ¡, tÃ­nh trÆ°á»›c
    if (!routeInfo || !fareEstimate) {
      Alert.alert(
        'Chưa tính giá',
        'Vui lÃ²ng nháº¥n "TÃ­nh giÃ¡" trÆ°á»›c khi Ä‘áº·t xe!',
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
      // ====== DEPOSIT WALLET CHECK ======
      if (needsDeposit) {
        if (!depositAgreed) {
          Alert.alert(
            '⚠️ Chưa đồng ý đặt cọc',
            `Chuyến đi trên ${depositMinKm}km yêu cầu đặt cọc ${depositPercent}% (${depositAmount.toLocaleString('vi-VN')}đ). Vui lòng tick chấp nhận.`,
            [{ text: 'OK' }]
          )
          setLoading(false)
          return
        }

        // Kiểm tra số dư ví
        if (walletBalance !== null && walletBalance < depositAmount) {
          Alert.alert(
            '❌ Ví không đủ tiền',
            `Tiền cọc yêu cầu: ${depositAmount.toLocaleString('vi-VN')}đ
Số dư hiện tại: ${walletBalance.toLocaleString('vi-VN')}đ
Cần nạp thêm: ${(depositAmount - walletBalance).toLocaleString('vi-VN')}đ

Vui lòng nạp tiền vào ví trước khi tiếp tục.`,
            [{ text: 'OK' }]
          )
          setLoading(false)
          return
        }
      }
      // ==================================

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
        baseFare: fareEstimate.total,  // Tổng tiền lái xe hộ (openingFee + extraKmFee)
        distanceFare: 0,                // Hire: không tách riêng, baseFare đã là tổng
        timeFare: 0,
        surgePricing: 0,

        carType,
        licensePlate,
        transmission,
        driverNote,
        isScheduled,
        scheduledTime: isScheduled ? scheduledDateTime.toISOString() : undefined,
        autoAssign: true,
        depositAmount: needsDeposit ? depositAmount : 0,
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
        depositAmount={needsDeposit ? depositAmount : 0}
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
          <View style={styles.handleBarContainer} {...panResponder.panHandlers}>
            <View style={styles.handleBar} />
          </View>
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

          {/* Scrollable Content Area */}
          <View style={{ flex: 1 }}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                <View style={styles.locationsContainer}>
                  {/* Pickup Location */}
                  <View style={[styles.inputGroup, showPickupSuggestions && { zIndex: 100 }]}>
                    <View style={styles.inputRow}>
                      <View style={styles.iconWrapper}>
                        {isLoadingCurrentLocation ? (
                          <ActivityIndicator size="small" color="#FF6B00" />
                        ) : (
                          <MaterialIcons name="radio-button-checked" size={24} color="#FF6B00" />
                        )}
                      </View>
                      <TextInput
                        style={styles.input}
                        value={pickupLocation}
                        onChangeText={handlePickupLocationChange}
                        onFocus={() => {
                          setShowPickupSuggestions(true)
                          snapToMax()
                        }}
                        placeholder={isLoadingCurrentLocation ? "Đang lấy vị trí..." : "Nhập điểm đón"}
                        placeholderTextColor={colors.textSecondary}
                        editable={!isSearching && !driverFound && !isLoadingCurrentLocation}
                      />
                    </View>

                    {/* Pickup Suggestions */}
                    {showPickupSuggestions && pickupSuggestions.length > 0 && (
                      <View style={[styles.suggestionsDropdown, { backgroundColor: colors.card, borderColor: colors.border }]}>
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
                        onFocus={() => {
                          setShowDropoffSuggestions(true)
                          snapToMax()
                        }}
                        placeholder="Bạn muốn đến đâu?"
                        placeholderTextColor={colors.textSecondary}
                        editable={!isSearching && !driverFound}
                      />
                    </View>

                    {/* Dropoff Suggestions */}
                    {showDropoffSuggestions && dropoffSuggestions.length > 0 && (
                      <View style={[styles.suggestionsDropdown, { backgroundColor: colors.card, borderColor: colors.border }]}>
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
                <View style={styles.timeToggleContainer}>
                  <TouchableOpacity
                    style={[
                      styles.timeButton,
                      !isScheduled ? styles.timeButtonActive : styles.timeButtonInactive,
                    ]}
                    onPress={() => setIsScheduled(false)}
                  >
                    <MaterialIcons
                      name="bolt"
                      size={18}
                      color={!isScheduled ? '#fff' : '#9CA3AF'}
                    />
                    <Text style={[styles.timeButtonText, { color: !isScheduled ? '#fff' : '#9CA3AF' }]}>
                      Đi ngay
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.timeButton,
                      isScheduled ? styles.timeButtonActive : styles.timeButtonInactive,
                    ]}
                    onPress={() => {
                      setIsScheduled(true)
                      setShowScheduleModal(true)
                    }}
                  >
                    <MaterialIcons
                      name="schedule"
                      size={18}
                      color={isScheduled ? '#fff' : '#9CA3AF'}
                    />
                    <Text style={[styles.timeButtonText, { color: isScheduled ? '#fff' : '#9CA3AF' }]}>
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
                          carType === car.id ? styles.carTypeButtonActive : styles.carTypeButtonInactive,
                        ]}
                        onPress={() => setCarType(car.id as any)}
                      >
                        <MaterialIcons
                          name={car.icon as any}
                          size={32}
                          color={carType === car.id ? '#fff' : '#9CA3AF'}
                        />
                        <Text
                          style={[
                            styles.carTypeLabel,
                            { color: carType === car.id ? '#fff' : '#6B7280' },
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
                    <View style={styles.inputContainer}>
                      <MaterialIcons name="pin" size={20} color="#9CA3AF" />
                      <TextInput
                        style={[styles.textInput, { color: colors.text }]}
                        placeholder="Ví dụ: 30A-123.45"
                        placeholderTextColor="#9CA3AF"
                        value={licensePlate}
                        onChangeText={setLicensePlate}
                        onFocus={snapToMax}
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
                          transmission === 'auto' ? styles.transmissionButtonActive : styles.transmissionButtonInactive,
                        ]}
                        onPress={() => setTransmission('auto')}
                      >
                        <Text
                          style={[
                            styles.transmissionText,
                            { color: transmission === 'auto' ? '#fff' : '#6B7280' },
                          ]}
                        >
                          Số tự động
                        </Text>
                        {transmission === 'auto' && (
                          <MaterialIcons name="check-circle" size={16} color="#fff" style={styles.checkIcon} />
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.transmissionButton,
                          transmission === 'manual' ? styles.transmissionButtonActive : styles.transmissionButtonInactive,
                        ]}
                        onPress={() => setTransmission('manual')}
                      >
                        <Text
                          style={[
                            styles.transmissionText,
                            { color: transmission === 'manual' ? '#fff' : '#6B7280' },
                          ]}
                        >
                          Số sàn
                        </Text>
                        {transmission === 'manual' && (
                          <MaterialIcons name="check-circle" size={16} color="#fff" style={styles.checkIcon} />
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                {/* Driver Note */}
                <View style={styles.noteSection}>
                  <Text style={styles.sectionLabel}>Ghi chú cho tài xế</Text>
                  <View style={styles.noteContainer}>
                    <TextInput
                      style={[styles.noteInput, { color: colors.text }]}
                      placeholder="Xe đỗ ở hầm B1, cột A05..."
                      placeholderTextColor="#9CA3AF"
                      value={driverNote}
                      onChangeText={setDriverNote}
                      onFocus={snapToMax}
                      multiline
                    />
                  </View>
                </View>

                {/* ====== DEPOSIT BANNER + CHECKBOX ====== */}
                {needsDeposit && fareEstimate && (
                  <View style={depositStyles.container}>
                    {/* Banner cảnh báo */}
                    <View style={depositStyles.banner}>
                      <MaterialIcons name="info" size={20} color="#b45309" />
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={depositStyles.bannerTitle}>
                          📍 Chuyến đi xa (từ {depositMinKm}km) — Yêu cầu đặt cọc
                        </Text>
                        <Text style={depositStyles.bannerDesc}>
                          Đặt cọc {depositPercent}% sẽ được trừ khỏi ví ngay khi bạn nhấn “Tìm tài xế”.
                        </Text>
                      </View>
                    </View>

                    {/* Bảng chi tiết số tiền */}
                    <View style={depositStyles.breakdown}>
                      <View style={depositStyles.row}>
                        <Text style={depositStyles.rowLabel}>💰 Tổng tiền chuyến</Text>
                        <Text style={depositStyles.rowValue}>
                          {formatCurrency(fareEstimate.total)}
                        </Text>
                      </View>

                      <View style={depositStyles.row}>
                        <Text style={[depositStyles.rowLabel, { color: '#16a34a' }]}>
                          🔒 Tiền cọc ({depositPercent}%)
                        </Text>
                        <Text style={[depositStyles.rowValue, { color: '#16a34a', fontWeight: '700' }]}>
                          {formatCurrency(depositAmount)}
                        </Text>
                      </View>

                      <View
                        style={[
                          depositStyles.row,
                          { borderTopWidth: 1, borderTopColor: '#fed7aa', paddingTop: 8, marginTop: 4 },
                        ]}
                      >
                        <Text style={[depositStyles.rowLabel, { color: '#FF6B00', fontWeight: '700' }]}>
                          💵 Còn lại khách trả sau
                        </Text>
                        <Text
                          style={[
                            depositStyles.rowValue,
                            { color: '#FF6B00', fontWeight: '700', fontSize: 16 },
                          ]}
                        >
                          {formatCurrency(fareEstimate.total - depositAmount)}
                        </Text>
                      </View>
                    </View>

                    {/* Số dư ví */}
                    {walletBalance !== null && (
                      <Text
                        style={[
                          depositStyles.walletText,
                          walletBalance < depositAmount
                            ? { color: '#dc2626' }
                            : { color: '#16a34a' },
                        ]}
                      >
                        {walletBalance < depositAmount
                          ? `❌ Ví hiện có ${formatCurrency(walletBalance)} — không đủ đặt cọc!`
                          : `✅ Ví hiện có ${formatCurrency(walletBalance)} — đủ đặt cọc`}
                      </Text>
                    )}

                    {/* Checkbox đồng ý */}
                    <TouchableOpacity
                      style={depositStyles.checkboxRow}
                      onPress={() => setDepositAgreed(!depositAgreed)}
                      activeOpacity={0.7}
                    >
                      <View
                        style={[
                          depositStyles.checkbox,
                          depositAgreed && {
                            backgroundColor: '#FF6B00',
                            borderColor: '#FF6B00',
                          },
                        ]}
                      >
                        {depositAgreed && (
                          <MaterialIcons name="check" size={14} color="#fff" />
                        )}
                      </View>

                      <Text style={depositStyles.checkboxLabel}>
                        Tôi đồng ý đặt cọc{' '}
                        <Text style={{ fontWeight: '700', color: '#FF6B00' }}>
                          {formatCurrency(depositAmount)}
                        </Text>{' '}
                        sẽ bị trừ từ ví ngay lập tức.
                      </Text>
                    </TouchableOpacity>

                    {/* Ghi chú hoàn cọc */}
                    <Text style={depositStyles.refundNote}>
                      ℹ️ Tiền cọc sẽ được hoàn lại nếu chưa có tài xế nào nhận chuyến.
                    </Text>
                  </View>
                )}
                {/* ====================================== */}

                <View style={styles.bottomAction} pointerEvents="auto">
                  <TouchableOpacity
                    style={[
                      styles.confirmButton,
                      (loading || (needsDeposit && !depositAgreed) || (needsDeposit && walletBalance !== null && walletBalance < depositAmount)) && styles.confirmButtonDisabled
                    ]}
                    onPress={handleCreateRide}
                    activeOpacity={0.8}
                    disabled={loading || (needsDeposit && !depositAgreed) || (needsDeposit && walletBalance !== null && walletBalance < depositAmount)}
                  >
                    {loading ? (
                      <>
                        <ActivityIndicator color="#fff" size="small" />
                        <Text style={styles.confirmButtonText}>Đang xử lý...</Text>
                      </>
                    ) : (
                      <>
                        <Text style={styles.confirmButtonText}>
                          {needsDeposit && !depositAgreed
                            ? `Cần xác nhận đặt cọc ${depositPercent}% trước`
                            : 'Tìm tài xế ngay'
                          }
                        </Text>
                        <MaterialIcons name="arrow-forward" size={20} color="#fff" />
                      </>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Bottom spacing for fixed button */}
                <View style={{ height: 100 }} />
              </ScrollView>
            </KeyboardAvoidingView>
          </View>
        </View>

        {/* Sticky Bottom Action - Must be inside Animated.View */}

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
  card: {
    height: '85%',
    position: 'relative',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 0,
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
  priceTagText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FF6B00',
  },
  locationsContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
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
    marginBottom: 14,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
    letterSpacing: -0.2,
  },
  bottomAction: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 24,
    elevation: 8,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
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
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
    padding: 4,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: '#F3F4F6',
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
    backgroundColor: '#FF6B00',
  },
  carTypeButtonInactive: {
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  timeButtonActive: {
    backgroundColor: '#FF6B00',
  },
  timeButtonInactive: {
    backgroundColor: '#F3F4F6',
  },
  transmissionButtonActive: {
    backgroundColor: '#FF6B00',
    borderColor: '#FF6B00',
  },
  transmissionButtonInactive: {
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
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
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
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
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
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
// ====== DEPOSIT STYLES ======
const depositStyles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 12,
    borderRadius: 16,
    backgroundColor: '#fffbeb',
    borderWidth: 1.5,
    borderColor: '#fcd34d',
    overflow: 'hidden',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fef3c7',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#fcd34d',
  },
  bannerTitle: { fontSize: 14, fontWeight: '700', color: '#92400e', marginBottom: 2 },
  bannerDesc: { fontSize: 12, color: '#b45309', lineHeight: 16 },
  breakdown: { padding: 12, gap: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowLabel: { fontSize: 13, color: '#374151', fontWeight: '500' },
  rowValue: { fontSize: 14, color: '#374151', fontWeight: '600' },
  walletText: { fontSize: 12, fontWeight: '600', paddingHorizontal: 12, paddingBottom: 8 },
  checkboxRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 10, gap: 10,
    borderTopWidth: 1, borderTopColor: '#fcd34d', backgroundColor: '#fffbeb',
  },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2,
    borderColor: '#d1d5db', backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center',
  },
  checkboxLabel: { flex: 1, fontSize: 13, color: '#374151', lineHeight: 18 },
  refundNote: { fontSize: 11, color: '#6b7280', paddingHorizontal: 12, paddingBottom: 12, fontStyle: 'italic' },
})
