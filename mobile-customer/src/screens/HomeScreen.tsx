import React, { useState, useEffect } from 'react'
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
  StatusBar,
} from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { useSelector } from 'react-redux'
import type { RootState } from '../redux/store'
import { COLORS_DARK, COLORS_LIGHT, SPACING, BORDER_RADIUS } from '../constants'
import MapViewComponent from '../components/MapView'
import HireDriverScreen from './HireDriverScreen'
import DriverFoundScreen from './DriverFoundScreen'
import FindingRideScreen from './FindingRideScreen'
import FindingRideModal from '../components/FindingRideModal'
import { rideService } from '../services/rideService'
import { mapsService } from '../services/mapsService'

const { width, height } = Dimensions.get('window')

export default function HomeScreen() {
  // Track component mounted state để tránh memory leak
  const isMountedRef = React.useRef(true)
  
  const [rideMode, setRideMode] = useState<'share' | 'hire'>('share' as const)
  const [pickupLocation, setPickupLocation] = useState('')
  const [dropoffLocation, setDropoffLocation] = useState('')
  const [pickupCoordinates, setPickupCoordinates] = useState<[number, number]>([105.8542, 21.0285])
  const [dropoffCoordinates, setDropoffCoordinates] = useState<[number, number]>([105.8542, 21.0285])
  const [isImmediately, setIsImmediately] = useState(true)
  const [passengerCount, setPassengerCount] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  
  // Share ride additional states
  const [pickupSuggestions, setPickupSuggestions] = useState<any[]>([])
  const [dropoffSuggestions, setDropoffSuggestions] = useState<any[]>([])
  const [showPickupSuggestions, setShowPickupSuggestions] = useState(false)
  const [showDropoffSuggestions, setShowDropoffSuggestions] = useState(false)
  const [pickupSearchTimeout, setPickupSearchTimeout] = useState<NodeJS.Timeout | null>(null)
  const [dropoffSearchTimeout, setDropoffSearchTimeout] = useState<NodeJS.Timeout | null>(null)
  const [routeInfo, setRouteInfo] = useState<any>(null)
  const [fareEstimate, setFareEstimate] = useState<any>(null)
  const [calculating, setCalculating] = useState(false)
  
  // Share ride - Driver finding states
  const [isSearching, setIsSearching] = useState(false)
  const [driverFound, setDriverFound] = useState(false)
  const [driver, setDriver] = useState<any>(null)
  const [driverLocation, setDriverLocation] = useState<any>(null)
  const [rideId, setRideId] = useState<string | null>(null)
  
  // Hire driver mode states
  const [carType, setCarType] = useState<'sedan' | 'suv' | 'truck'>('sedan')
  const [licensePlate, setLicensePlate] = useState('')
  const [transmission, setTransmission] = useState<'auto' | 'manual'>('auto')
  const [driverNote, setDriverNote] = useState('')
  const [isScheduled, setIsScheduled] = useState(false)
  
  const user = useSelector((state: RootState) => state.auth.user)
  const themeMode = useSelector((state: RootState) => state.theme.mode)
  const colors = themeMode === 'dark' ? COLORS_DARK : COLORS_LIGHT

  // Cleanup timeouts and mark unmounted
  useEffect(() => {
    isMountedRef.current = true
    
    return () => {
      isMountedRef.current = false
      if (pickupSearchTimeout) clearTimeout(pickupSearchTimeout)
      if (dropoffSearchTimeout) clearTimeout(dropoffSearchTimeout)
    }
  }, [])

  // Reset share ride state khi cancel
  const resetShareRideState = () => {
    setIsSearching(false)
    setDriverFound(false)
    setDriver(null)
    setDriverLocation(null)
    setRideId(null)
  }

  // Polling để lấy thông tin tài xế khi có tài xế nhận cuốc
  useEffect(() => {
    if (!isSearching || !rideId) {
      return
    }

    console.log('[HomeScreen] Polling ride data for rideId:', rideId)
    let pollInterval: NodeJS.Timeout
    
    const pollRideData = async () => {
      // Chỉ chạy khi component còn mounted
      if (!isMountedRef.current) return
      
      try {
        const rideData = await rideService.getRideById(rideId)
        
        // Double check mounted state sau async call
        if (!isMountedRef.current) return
        
        console.log('[HomeScreen] Ride data:', rideData)

        if (!rideData || typeof rideData !== 'object') {
          console.warn('[HomeScreen] Invalid rideData:', rideData)
          return
        }

        // Nếu tài xế đã nhận cuốc (có driverId)
        if (rideData.driverId) {
          const driverData = rideData.driverId
          
          if (!driverData || !driverData._id) {
            console.warn('[HomeScreen] Invalid driverData:', driverData)
            return
          }

          console.log('[HomeScreen] Driver found:', driverData._id)
          
          // Map dữ liệu từ API sang format UI
          setDriver({
            id: driverData._id,
            name: driverData.firstName || 'Driver',
            phone: driverData.phone || '0',
            avatar: driverData.avatar || '',
            rating: driverData.rating || 4.8,
            reviews: driverData.reviews || 128,
            vehicle: {
              model: driverData.vehicle?.model || 'Toyota Vios',
              licensePlate: driverData.vehicle?.licensePlate || 'ABC 123',
              color: driverData.vehicle?.color || 'White',
            },
          })

          setDriverLocation({
            latitude: rideData.driverLocation?.[1] || 21.0285,
            longitude: rideData.driverLocation?.[0] || 105.8542,
          })

          setDriverFound(true)
          setIsSearching(false)
          clearInterval(pollInterval)
        }
      } catch (error) {
        console.error('[HomeScreen] Polling error:', error)
        // Không clear interval để retry
      }
    }
    
    // Start polling
    pollInterval = setInterval(pollRideData, 2000)
    
    // Cleanup
    return () => {
      if (pollInterval) clearInterval(pollInterval)
    }
  }, [isSearching, rideId])

  // Calculate fare dựa trên distance, duration, passenger count
  const calculateShareRideFare = (distance: number, duration: number, passengers: number) => {
    const baseFare = 10000 // 10k VND
    const distanceFare = (distance / 1000) * 5000 // 5k per km
    const timeFare = (duration / 60) * 2000 // 2k per minute
    const passengerSurge = passengers > 2 ? (passengers - 2) * 5000 : 0
    
    const totalFare = baseFare + distanceFare + timeFare + passengerSurge
    
    return {
      baseFare,
      distanceFare: Math.round(distanceFare),
      timeFare: Math.round(timeFare),
      passengerSurge: Math.round(passengerSurge),
      total: Math.round(totalFare),
    }
  }

  // Tính tuyến đường khi có đủ thông tin
  const calculateRoute = async () => {
    if (!pickupLocation.trim() || !dropoffLocation.trim()) {
      return
    }

    setCalculating(true)
    try {
      console.log('[HomeScreen] Calculating route...')
      const route = await mapsService.getRouteInfo(pickupLocation, dropoffLocation)
      setRouteInfo(route)

      const fare = calculateShareRideFare(route.distance, route.duration, passengerCount)
      setFareEstimate(fare)

      console.log('[HomeScreen] Route calculated:', { route, fare })

      if (route.isMockData) {
        Alert.alert(
          '⚠️ Chế độ Demo',
          'Hiện đang sử dụng dữ liệu giả lập.\n\nĐể sử dụng Google Maps thật, vui lòng cấu hình API key trong file .env',
          [{ text: 'OK' }]
        )
      }
    } catch (err: any) {
      console.error('[HomeScreen] Calculate error:', err)
      Alert.alert('Lỗi', err.message || 'Không thể tính toán tuyến đường')
    } finally {
      setCalculating(false)
    }
  }

  // Debounce calculate route
  useEffect(() => {
    if (!pickupLocation.trim() || !dropoffLocation.trim()) {
      setRouteInfo(null)
      setFareEstimate(null)
      return
    }

    const timer = setTimeout(async () => {
      if (!isMountedRef.current) return
      
      setCalculating(true)
      try {
        console.log('[HomeScreen] Calculating route...')
        const route = await mapsService.getRouteInfo(pickupLocation, dropoffLocation)
        
        if (!isMountedRef.current) return
        
        setRouteInfo(route)

        const fare = calculateShareRideFare(route.distance, route.duration, passengerCount)
        setFareEstimate(fare)

        console.log('[HomeScreen] Route calculated:', { route, fare })

        if (route.isMockData) {
          Alert.alert(
            '⚠️ Chế độ Demo',
            'Hiện đang sử dụng dữ liệu giả lập.\n\nĐể sử dụng Google Maps thật, vui lòng cấu hình API key trong file .env',
            [{ text: 'OK' }]
          )
        }
      } catch (err: any) {
        console.error('[HomeScreen] Calculate error:', err)
        if (isMountedRef.current) {
          Alert.alert('Lỗi', err.message || 'Không thể tính toán tuyến đường')
        }
      } finally {
        if (isMountedRef.current) {
          setCalculating(false)
        }
      }
    }, 1000)

    return () => clearTimeout(timer)
  }, [pickupLocation, dropoffLocation, passengerCount])

  // Handle pickup location change
  const handlePickupLocationChange = React.useCallback((text: string) => {
    setPickupLocation(text)

    if (pickupSearchTimeout) {
      clearTimeout(pickupSearchTimeout)
    }

    if (text.trim().length >= 5) {
      setShowPickupSuggestions(true)
      const timeout = setTimeout(async () => {
        if (!isMountedRef.current) return
        
        try {
          console.log('[HomeScreen] Pickup search for:', text)
          const suggestions = await mapsService.searchPlaces(text)
          
          if (!isMountedRef.current) return
          setPickupSuggestions(suggestions)
        } catch (error) {
          console.error('Error searching pickup locations:', error)
          if (isMountedRef.current) {
            setPickupSuggestions([])
          }
        }
      }, 800)
      setPickupSearchTimeout(timeout)
    } else {
      setPickupSuggestions([])
      if (text.trim().length === 0) {
        setShowPickupSuggestions(false)
      }
    }
  }, [pickupSearchTimeout])

  // Handle dropoff location change
  const handleDropoffLocationChange = React.useCallback((text: string) => {
    setDropoffLocation(text)

    if (dropoffSearchTimeout) {
      clearTimeout(dropoffSearchTimeout)
    }

    if (text.trim().length >= 5) {
      setShowDropoffSuggestions(true)
      const timeout = setTimeout(async () => {
        if (!isMountedRef.current) return
        
        try {
          console.log('[HomeScreen] Dropoff search for:', text)
          const suggestions = await mapsService.searchPlaces(text)
          
          if (!isMountedRef.current) return
          setDropoffSuggestions(suggestions)
        } catch (error) {
          console.error('Error searching dropoff locations:', error)
          if (isMountedRef.current) {
            setDropoffSuggestions([])
          }
        }
      }, 800)
      setDropoffSearchTimeout(timeout)
    } else {
      setDropoffSuggestions([])
      if (text.trim().length === 0) {
        setShowDropoffSuggestions(false)
      }
    }
  }, [dropoffSearchTimeout])

  // Handle suggestion select
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

  // Show driver found screen khi tài xế được tìm thấy
  if (driverFound && routeInfo && driver) {
    return (
      <DriverFoundScreen
        driver={driver}
        routeInfo={routeInfo}
        onChat={() => {
          console.log('Chat with driver:', driver.id)
        }}
        onCancel={resetShareRideState}
      />
    )
  }

  // Show finding driver screen
  if (isSearching && routeInfo) {
    return (
      <FindingRideScreen
        routeInfo={routeInfo}
        passengerCount={passengerCount}
        fareEstimate={fareEstimate}
        onCancel={() => {
          resetShareRideState()
          setPickupLocation('')
          setDropoffLocation('')
          setRouteInfo(null)
          setFareEstimate(null)
        }}
      />
    )
  }

  const handleFindRide = React.useCallback(async () => {
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

      // Tạo dữ liệu cuốc xe ghép với thông tin tuyến đường chính xác
      const rideData = {
        rideType: 'share' as const,
        pickupAddress: routeInfo.pickup.formattedAddress,
        pickupCoordinates: [routeInfo.pickup.coordinates.longitude, routeInfo.pickup.coordinates.latitude],
        dropoffAddress: routeInfo.dropoff.formattedAddress,
        dropoffCoordinates: [routeInfo.dropoff.coordinates.longitude, routeInfo.dropoff.coordinates.latitude],
        distance: routeInfo.distance,
        duration: routeInfo.duration,
        baseFare: fareEstimate.baseFare,
        distanceFare: fareEstimate.distanceFare,
        timeFare: fareEstimate.timeFare,
        passengers: passengerCount,
      }

      const result = await rideService.createRide(rideData, user.id)
      
      if (!isMountedRef.current) return
      
      // 🚀 Tự động chỉ định tài xế
      const assignedRide = await rideService.autoAssignDriver(result._id)
      
      if (!isMountedRef.current) return
      
      // Set searching state to track driver
      setRideId(result._id)
      setIsSearching(true)
      
      // Keep modal showing for 2 seconds, then show success alert
      setTimeout(() => {
        if (!isMountedRef.current) return
        
        setIsLoading(false)
        Alert.alert(
          'Thành công',
          `✓ Cuốc xe đã được tạo!\n\nHệ thống đang tìm tài xế phù hợp cho bạn...`,
          [
            { 
              text: 'OK', 
              onPress: () => {
                console.log('Ride created:', assignedRide)
              } 
            },
          ]
        )
      }, 500)

      console.log('Ride created and assigned:', assignedRide)
    } catch (error: any) {
      if (!isMountedRef.current) return
      
      setIsLoading(false)
      Alert.alert('Lỗi', error.message || 'Không thể tạo cuốc xe')
      console.error('Error:', error)
    }
  }, [pickupLocation, dropoffLocation, user?.id, routeInfo, fareEstimate, passengerCount])

  const handleCancelFinding = () => {
    setIsLoading(false)
  }

  if (rideMode === 'hire') {
    return <HireDriverScreen {...{ isScheduled, setIsScheduled, carType, setCarType, licensePlate, setLicensePlate, transmission, setTransmission, driverNote, setDriverNote, pickupLocation, setPickupLocation, dropoffLocation, setDropoffLocation, setRideMode }} />
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

      {/* Header with Map */}
      <View style={[styles.headerSection, { backgroundColor: colors.bgSecondary }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Đặt xe ghép</Text>
          <TouchableOpacity style={styles.settingsButton}>
            <MaterialIcons name="settings" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Map Placeholder */}
        <MapViewComponent
          height={250}
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
                backgroundColor: rideMode === 'share' ? 'transparent' : `${colors.border}`,
                borderColor: rideMode === 'share' ? colors.text : colors.border,
              },
            ]}
            onPress={() => setRideMode('share')}
          >
            <Text
              style={[
                styles.rideTypeText,
                { color: rideMode === 'share' ? colors.text : colors.textSecondary },
              ]}
            >
              Ghép xe
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.rideTypeButton,
              {
                backgroundColor: (rideMode as string) === 'hire' ? 'transparent' : `${colors.border}`,
                borderColor: (rideMode as string) === 'hire' ? colors.text : colors.border,
              },
            ]}
            onPress={() => setRideMode('hire')}
          >
            <Text
              style={[
                styles.rideTypeText,
                { color: (rideMode as string) === 'hire' ? colors.text : colors.textSecondary },
              ]}
            >
              Lái xe hộ
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
              onChangeText={handlePickupLocationChange}
            />
          </View>
          {showPickupSuggestions && pickupSuggestions.length > 0 && (
            <View style={[styles.suggestionsDropdown, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}>
              <ScrollView scrollEnabled={pickupSuggestions.length > 3} nestedScrollEnabled={true}>
                {pickupSuggestions.map((item) => (
                  <TouchableOpacity
                    key={item.placeId}
                    style={[styles.suggestionItem, { borderColor: colors.border }]}
                    onPress={() => handlePickupSuggestionSelect(item)}
                  >
                    <MaterialIcons name="location-on" size={20} color="#FF6B00" />
                    <View style={styles.suggestionContent}>
                      <Text style={[styles.suggestionMainText, { color: colors.text }]}>{item.mainText}</Text>
                      <Text style={[styles.suggestionSecondaryText, { color: colors.textSecondary }]}>{item.secondaryText}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          <Text style={[styles.sectionLabel, { marginTop: SPACING.xl, color: colors.textSecondary }]}>
            ĐIỂM ĐẾN
          </Text>
          <View style={[styles.inputLocationWrapper, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}>
            <MaterialIcons name="location-on" size={20} color="#ef4444" />
            <TextInput
              style={[styles.inputLocation, { color: colors.text }]}
              placeholder="Nhập điểm đến..."
              placeholderTextColor={colors.textSecondary}
              value={dropoffLocation}
              onChangeText={handleDropoffLocationChange}
            />
          </View>
          {showDropoffSuggestions && dropoffSuggestions.length > 0 && (
            <View style={[styles.suggestionsDropdown, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}>
              <ScrollView scrollEnabled={dropoffSuggestions.length > 3} nestedScrollEnabled={true}>
                {dropoffSuggestions.map((item) => (
                  <TouchableOpacity
                    key={item.placeId}
                    style={[styles.suggestionItem, { borderColor: colors.border }]}
                    onPress={() => handleDropoffSuggestionSelect(item)}
                  >
                    <MaterialIcons name="location-on" size={20} color="#ef4444" />
                    <View style={styles.suggestionContent}>
                      <Text style={[styles.suggestionMainText, { color: colors.text }]}>{item.mainText}</Text>
                      <Text style={[styles.suggestionSecondaryText, { color: colors.textSecondary }]}>{item.secondaryText}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Time & Passenger Section */}
        <View style={styles.timePassengerSection}>
          <View style={[styles.timeWrapper, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}>
            <View>
              <Text style={[styles.timeLabel, { color: colors.textSecondary }]}>Thời gian</Text>
              <View style={styles.immediateBox}>
                <Text style={[styles.immediateText, { color: colors.text }]}>Ngay bây giờ</Text>
                <Text style={styles.immediateSubtext}>(Thay đổi)</Text>
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

        {/* Route Info Card */}
        {routeInfo && (
          <View style={[styles.routeInfoCard, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}>
            <View style={styles.routeInfoRow}>
              <View style={styles.routeInfoItem}>
                <MaterialIcons name="directions" size={20} color="#FF6B00" />
                <Text style={[styles.routeInfoValue, { color: colors.text }]}>
                  {(routeInfo.distance / 1000).toFixed(1)} km
                </Text>
                <Text style={[styles.routeInfoLabel, { color: colors.textSecondary }]}>Quãng đường</Text>
              </View>
              <View style={styles.routeInfoDivider} />
              <View style={styles.routeInfoItem}>
                <MaterialIcons name="schedule" size={20} color="#FF6B00" />
                <Text style={[styles.routeInfoValue, { color: colors.text }]}>
                  ~{Math.ceil(routeInfo.duration / 60)} phút
                </Text>
                <Text style={[styles.routeInfoLabel, { color: colors.textSecondary }]}>Thời gian</Text>
              </View>
            </View>
          </View>
        )}

        {/* Price Section */}
        <View style={styles.priceSection}>
          <Text style={[styles.priceLabel, { color: colors.textSecondary }]}>Giá từ</Text>
          {fareEstimate ? (
            <View>
              <Text style={styles.priceValue}>{fareEstimate.total.toLocaleString()}đ</Text>
              <View style={styles.fareBreakdown}>
                <Text style={[styles.fareBreakdownItem, { color: colors.textSecondary }]}>
                  Cơ bản: {fareEstimate.baseFare.toLocaleString()}đ
                </Text>
                <Text style={[styles.fareBreakdownItem, { color: colors.textSecondary }]}>
                  Quãng đường: {fareEstimate.distanceFare.toLocaleString()}đ
                </Text>
                <Text style={[styles.fareBreakdownItem, { color: colors.textSecondary }]}>
                  Thời gian: {fareEstimate.timeFare.toLocaleString()}đ
                </Text>
                {fareEstimate.passengerSurge > 0 && (
                  <Text style={[styles.fareBreakdownItem, { color: '#FF6B00' }]}>
                    Phụ phí khách thêm: +{fareEstimate.passengerSurge.toLocaleString()}đ
                  </Text>
                )}
              </View>
            </View>
          ) : (
            <Text style={styles.priceValue}>45.000đ</Text>
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
  },
  routeInfo: {
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
    paddingTop: SPACING.lg,
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
    fontSize: 24,
    fontWeight: '700',
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
    fontSize: 12,
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
})
