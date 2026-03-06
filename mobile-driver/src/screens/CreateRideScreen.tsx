import { useState, useRef, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  FlatList,
  Dimensions,
  Animated,
  PanResponder,
  Keyboard,
} from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import DateTimePicker from '@react-native-community/datetimepicker'
import { useSelector } from 'react-redux'
import { COLORS, SPACING, BORDER_RADIUS } from '../constants'
import { API_BASE_URL } from '../constants/config'
import { driverService } from '../services/driverService'
import { placesService } from '../services/placesService'
import MapViewComponent from '../components/MapView'
import type { RootState } from '../redux/store'

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window')

// Bottom sheet snap points
const SNAP_POINTS = {
  MIN: SCREEN_HEIGHT * 0.25,    // 25% - Chỉ thấy header
  MID: SCREEN_HEIGHT * 0.55,    // 55% - Thấy inputs chính
  MAX: SCREEN_HEIGHT * 0.90,    // 90% - Full content
}

export default function CreateRideScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>()
  const { user } = useSelector((state: RootState) => state.auth)

  const [pickupLocation, setPickupLocation] = useState('')
  const [dropoffLocation, setDropoffLocation] = useState('')
  const [pickupCoords, setPickupCoords] = useState<[number, number] | null>(null)
  const [dropoffCoords, setDropoffCoords] = useState<[number, number] | null>(null)
  const [startDateTime, setStartDateTime] = useState(new Date())
  const [remainingSeats, setRemainingSeats] = useState('7')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [showDateTimePicker, setShowDateTimePicker] = useState(false)

  // Map state
  const [routeCoordinates, setRouteCoordinates] = useState<Array<{ latitude: number; longitude: number }>>([])
  const [distance, setDistance] = useState<number>(0)
  const [duration, setDuration] = useState<number>(0)
  const [loadingRoute, setLoadingRoute] = useState(false)

  // Bottom sheet state
  const sheetPosition = useRef(new Animated.Value(SNAP_POINTS.MID)).current
  const [currentSnapPoint, setCurrentSnapPoint] = useState(SNAP_POINTS.MID)
  const scrollViewRef = useRef<ScrollView>(null)

  // PanResponder for bottom sheet drag
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only handle vertical drags
        return Math.abs(gestureState.dy) > 5
      },
      onPanResponderGrant: () => {
        // Dismiss keyboard when starting to drag
        Keyboard.dismiss()
      },
      onPanResponderMove: (_, gestureState) => {
        const newPosition = currentSnapPoint - gestureState.dy
        // Constrain between MIN and MAX
        if (newPosition >= SNAP_POINTS.MIN && newPosition <= SNAP_POINTS.MAX) {
          sheetPosition.setValue(newPosition)
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const newPosition = currentSnapPoint - gestureState.dy
        let targetSnapPoint = SNAP_POINTS.MID

        // Determine closest snap point
        if (newPosition < SNAP_POINTS.MIN + 50) {
          targetSnapPoint = SNAP_POINTS.MIN
        } else if (newPosition < SNAP_POINTS.MID + 50) {
          targetSnapPoint = SNAP_POINTS.MID
        } else {
          targetSnapPoint = SNAP_POINTS.MAX
        }

        // Animate to snap point
        Animated.spring(sheetPosition, {
          toValue: targetSnapPoint,
          useNativeDriver: false,
          tension: 50,
          friction: 10,
        }).start()
        setCurrentSnapPoint(targetSnapPoint)
      },
    })
  ).current

  // Places API state
  const [pickupSuggestions, setPickupSuggestions] = useState<any[]>([])
  const [dropoffSuggestions, setDropoffSuggestions] = useState<any[]>([])
  const [isSearchingPickup, setIsSearchingPickup] = useState(false)
  const [isSearchingDropoff, setIsSearchingDropoff] = useState(false)
  const [showPickupSuggestions, setShowPickupSuggestions] = useState(false)
  const [showDropoffSuggestions, setShowDropoffSuggestions] = useState(false)

  // Debounce timers
  const pickupDebounceTimer = useRef<NodeJS.Timeout | null>(null)
  const dropoffDebounceTimer = useRef<NodeJS.Timeout | null>(null)

  // Fetch route polyline when both coords are available
  useEffect(() => {
    if (pickupCoords && dropoffCoords) {
      fetchRoute()
    } else {
      setRouteCoordinates([])
      setDistance(0)
      setDuration(0)
    }
  }, [pickupCoords, dropoffCoords])

  // Fetch route from backend
  const fetchRoute = async () => {
    if (!pickupCoords || !dropoffCoords) return

    setLoadingRoute(true)
    try {
      const url = `${API_BASE_URL}/rides/directions?startLng=${pickupCoords[0]}&startLat=${pickupCoords[1]}&endLng=${dropoffCoords[0]}&endLat=${dropoffCoords[1]}`
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error('Failed to fetch route')
      }

      const data = await response.json()

      // Convert GeoJSON coordinates [lng, lat] to React Native Maps format
      if (data.features && data.features[0]?.geometry?.coordinates) {
        const coords = data.features[0].geometry.coordinates.map(
          ([lng, lat]: [number, number]) => ({
            latitude: lat,
            longitude: lng,
          })
        )
        setRouteCoordinates(coords)
      }

      setDistance(data.distance || 0)
      setDuration(data.duration || 0)
    } catch (error) {
      console.error('Error fetching route:', error)
    } finally {
      setLoadingRoute(false)
    }
  }

  // Search pickup places with debounce
  const handlePickupLocationChange = (text: string) => {
    setPickupLocation(text)
    setShowPickupSuggestions(true)

    if (pickupDebounceTimer.current) {
      clearTimeout(pickupDebounceTimer.current)
    }

    if (text.trim().length < 3) {
      setPickupSuggestions([])
      return
    }

    pickupDebounceTimer.current = setTimeout(() => {
      searchPickupPlaces(text)
    }, 500)
  }

  // Search dropoff places with debounce
  const handleDropoffLocationChange = (text: string) => {
    setDropoffLocation(text)
    setShowDropoffSuggestions(true)

    if (dropoffDebounceTimer.current) {
      clearTimeout(dropoffDebounceTimer.current)
    }

    if (text.trim().length < 3) {
      setDropoffSuggestions([])

      return
    }

    dropoffDebounceTimer.current = setTimeout(() => {
      searchDropoffPlaces(text)
    }, 500)
  }

  // Search pickup places
  const searchPickupPlaces = async (keyword: string) => {
    try {
      setIsSearchingPickup(true)
      const response = await placesService.searchPlaces(keyword)
      console.log(`📍 Pickup search (${response.source}):`, response.results.length, 'results')
      setPickupSuggestions(response.results)
    } catch (error) {
      console.error('Error searching pickup places:', error)
      setPickupSuggestions([])
    } finally {
      setIsSearchingPickup(false)
    }
  }

  // Search dropoff places
  const searchDropoffPlaces = async (keyword: string) => {
    try {
      setIsSearchingDropoff(true)
      const response = await placesService.searchPlaces(keyword)
      console.log(`📍 Dropoff search (${response.source}):`, response.results.length, 'results')
      setDropoffSuggestions(response.results)
    } catch (error) {
      console.error('Error searching dropoff places:', error)
      setDropoffSuggestions([])
    } finally {
      setIsSearchingDropoff(false)
    }
  }

  // Select pickup place
  const selectPickupPlace = async (place: any) => {
    console.log('🎯 [CreateRideScreen] Selecting pickup place:', place)
    const placeName = place.name || place.address
    if (!placeName) {
      console.error('❌ Place has no name or address:', place)
      return
    }

    setPickupLocation(placeName)

    // If place has real coordinates (lat/lng not 0), use them directly
    if (place.lat !== 0 && place.lng !== 0) {
      setPickupCoords([place.lng, place.lat]) // [longitude, latitude]
      setShowPickupSuggestions(false)
      setPickupSuggestions([])
      console.log('✅ Pickup place selected with real coords:', placeName, { lng: place.lng, lat: place.lat })
      return
    }

    // Otherwise, fetch real coordinates from backend using placeId
    try {
      console.log('📡 Fetching real coordinates for:', place.placeId)
      const response = await fetch(`${API_BASE_URL}/places/details/${place.placeId}`)
      if (!response.ok) {
        throw new Error(`Failed to fetch place details: ${response.status}`)
      }

      const details = await response.json()
      console.log('📍 Got coordinates:', details)

      if (details.lat && details.lng) {
        setPickupCoords([details.lng, details.lat]) // [longitude, latitude]
        console.log('✅ Pickup place selected:', placeName, { lng: details.lng, lat: details.lat })
      } else {
        Alert.alert('Lỗi', 'Không thể lấy tọa độ của địa điểm')
        return
      }
    } catch (error: any) {
      console.error('❌ Error fetching place details:', error.message)
      Alert.alert('Lỗi', 'Không thể lấy thông tin địa điểm')
      return
    }

    setShowPickupSuggestions(false)
    setPickupSuggestions([])
  }

  // Select dropoff place
  const selectDropoffPlace = async (place: any) => {
    console.log('🎯 [CreateRideScreen] Selecting dropoff place:', place)
    const placeName = place.name || place.address
    if (!placeName) {
      console.error('❌ Place has no name or address:', place)
      return
    }

    setDropoffLocation(placeName)

    // If place has real coordinates (lat/lng not 0), use them directly
    if (place.lat !== 0 && place.lng !== 0) {
      setDropoffCoords([place.lng, place.lat]) // [longitude, latitude]
      setShowDropoffSuggestions(false)
      setDropoffSuggestions([])
      console.log('✅ Dropoff place selected with real coords:', placeName, { lng: place.lng, lat: place.lat })
      return
    }

    // Otherwise, fetch real coordinates from backend using placeId
    try {
      console.log('📡 Fetching real coordinates for:', place.placeId)
      const response = await fetch(`${API_BASE_URL}/places/details/${place.placeId}`)
      if (!response.ok) {
        throw new Error(`Failed to fetch place details: ${response.status}`)
      }

      const details = await response.json()
      console.log('📍 Got coordinates:', details)

      if (details.lat && details.lng) {
        setDropoffCoords([details.lng, details.lat]) // [longitude, latitude]
        console.log('✅ Dropoff place selected:', placeName, { lng: details.lng, lat: details.lat })
      } else {
        Alert.alert('Lỗi', 'Không thể lấy tọa độ của địa điểm')
        return
      }
    } catch (error: any) {
      console.error('❌ Error fetching place details:', error.message)
      Alert.alert('Lỗi', 'Không thể lấy thông tin địa điểm')
      return
    }

    setShowDropoffSuggestions(false)
    setDropoffSuggestions([])
  }


  const handleDateTimeChange = (_event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDateTimePicker(false)
    }
    if (selectedDate) {
      setStartDateTime(selectedDate)
    }
  }

  const handleCreateRide = async () => {
    if (!pickupLocation.trim()) {
      Alert.alert('Lỗi', 'Vui lòng chọn vị trí xuất phát từ danh sách gợi ý')
      return
    }
    if (!dropoffLocation.trim()) {
      Alert.alert('Lỗi', 'Vui lòng chọn vị trí đích đến từ danh sách gợi ý')
      return
    }
    if (!pickupCoords) {
      Alert.alert('Lỗi', 'Vui lòng chọn vị trí xuất phát từ danh sách gợi ý')
      return
    }
    if (!dropoffCoords) {
      Alert.alert('Lỗi', 'Vui lòng chọn vị trí đích đến từ danh sách gợi ý')
      return
    }
    if (!remainingSeats || parseInt(remainingSeats) <= 0) {
      Alert.alert('Lỗi', 'Vui lòng nhập số ghế còn lại hợp lệ')
      return
    }
    if (distance === 0 || duration === 0) {
      Alert.alert('Lỗi', 'Không thể tính toán quãng đường. Vui lòng chọn lại địa điểm')
      return
    }

    setLoading(true)
    try {
      // Tính giá (cơ sở: 10k, theo khoảng cách: 5k/km, theo thời gian: 1k/phút)
      const baseFare = 10000
      const distanceFare = Math.round(distance * 5000)
      const timeFare = duration * 1000

      const rideData = {
        pickupAddress: pickupLocation,
        dropoffAddress: dropoffLocation,
        pickupCoordinates: pickupCoords, // [longitude, latitude]
        dropoffCoordinates: dropoffCoords, // [longitude, latitude]
        distance: Math.round(distance * 10) / 10,
        duration: duration,
        baseFare: baseFare,
        distanceFare: distanceFare,
        timeFare: timeFare,
        rideType: 'share' as const,
        startDateTime: startDateTime.toISOString(),
        totalSeats: parseInt(remainingSeats),
        remainingSeats: parseInt(remainingSeats),
        driverId: user?.id,
        notes: notes,
        createdBy: 'driver',
      }

      await driverService.createRide(rideData)

      Alert.alert('Thành công', 'Chuyến xe đã được tạo', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ])
    } catch (error: any) {
      console.error('❌ Lỗi tạo chuyến:', error)
      Alert.alert(
        'Lỗi',
        error?.message || 'Không thể tạo chuyến xe. Vui lòng thử lại.'
      )
    } finally {
      setLoading(false)
    }
  }

  const startDateTimeFormatted = startDateTime.toLocaleString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <View style={styles.container}>
      {/* Full-screen Map Background */}
      <MapViewComponent
        height={SCREEN_HEIGHT}
        pickupCoords={pickupCoords ? { latitude: pickupCoords[1], longitude: pickupCoords[0] } : undefined}
        dropoffCoords={dropoffCoords ? { latitude: dropoffCoords[1], longitude: dropoffCoords[0] } : undefined}
        routeCoordinates={routeCoordinates}
      />

      {/* Route Info Overlay */}
      {loadingRoute && (
        <View style={styles.loadingRouteOverlay}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={styles.loadingRouteText}>Đang tính đường đi...</Text>
        </View>
      )}
      {distance > 0 && duration > 0 && (
        <View style={styles.routeInfoCard}>
          <View style={styles.routeInfoItem}>
            <MaterialIcons name="straighten" size={16} color={COLORS.primary} />
            <Text style={styles.routeInfoText}>{distance.toFixed(1)} km</Text>
          </View>
          <View style={styles.routeInfoDivider} />
          <View style={styles.routeInfoItem}>
            <MaterialIcons name="access-time" size={16} color={COLORS.primary} />
            <Text style={styles.routeInfoText}>{duration} phút</Text>
          </View>
        </View>
      )}

      {/* Back Button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#FF6B00" />
        </TouchableOpacity>
        <Text style={styles.logoText}>firego</Text>
      </View>

      {/* Bottom Sheet */}
      <Animated.View
        style={[
          styles.bottomSheet,
          {
            height: sheetPosition,
          },
        ]}
      >
        {/* Drag Handle */}
        <View {...panResponder.panHandlers} style={styles.dragHandleContainer}>
          <View style={styles.dragHandle} />
          <Text style={styles.sheetTitle}>Tạo chuyến xe ghép</Text>
        </View>

        {/* Sheet Content */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.sheetContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
          scrollEventThrottle={16}
        >
          {/* Pickup Location */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="location-on" size={18} color={COLORS.primary} />
              <Text style={styles.sectionTitle}>Điểm xuất phát</Text>
            </View>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Nhập vị trí xuất phát"
                placeholderTextColor={COLORS.textSecondary}
                value={pickupLocation}
                onChangeText={handlePickupLocationChange}
                onFocus={() => {
                  setShowPickupSuggestions(true)
                  // Expand sheet when focusing input
                  Animated.spring(sheetPosition, {
                    toValue: SNAP_POINTS.MAX,
                    useNativeDriver: false,
                  }).start()
                  setCurrentSnapPoint(SNAP_POINTS.MAX)
                }}
              />
              {isSearchingPickup && (
                <ActivityIndicator size="small" color={COLORS.primary} style={styles.searchIndicator} />
              )}
            </View>

            {/* Pickup Suggestions Dropdown */}
            {showPickupSuggestions && pickupLocation.trim().length >= 3 && pickupSuggestions.length > 0 && (
              <View style={styles.suggestionsContainer}>
                <FlatList
                  data={pickupSuggestions}
                  keyExtractor={(item, index) => `${item.placeId || item.name}-${index}`}
                  scrollEnabled={false}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.suggestionItem}
                      onPress={() => selectPickupPlace(item)}
                    >
                      <MaterialIcons name="location-on" size={14} color={COLORS.primary} />
                      <View style={styles.suggestionContent}>
                        <Text style={styles.suggestionName}>{item.name}</Text>
                        {item.address && item.address !== item.name && (
                          <Text style={styles.suggestionAddress}>{item.address}</Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  )}
                />
              </View>
            )}
          </View>

          {/* Dropoff Location */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="location-on" size={18} color="#FF6B6B" />
              <Text style={styles.sectionTitle}>Điểm đến</Text>
            </View>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Nhập vị trí đích đến"
                placeholderTextColor={COLORS.textSecondary}
                value={dropoffLocation}
                onChangeText={handleDropoffLocationChange}
                onFocus={() => {
                  setShowDropoffSuggestions(true)
                  Animated.spring(sheetPosition, {
                    toValue: SNAP_POINTS.MAX,
                    useNativeDriver: false,
                  }).start()
                  setCurrentSnapPoint(SNAP_POINTS.MAX)
                }}
              />
              {isSearchingDropoff && (
                <ActivityIndicator size="small" color={COLORS.primary} style={styles.searchIndicator} />
              )}
            </View>

            {/* Dropoff Suggestions Dropdown */}
            {showDropoffSuggestions && dropoffLocation.trim().length >= 3 && dropoffSuggestions.length > 0 && (
              <View style={styles.suggestionsContainer}>
                <FlatList
                  data={dropoffSuggestions}
                  keyExtractor={(item, index) => `${item.placeId || item.name}-${index}`}
                  scrollEnabled={false}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.suggestionItem}
                      onPress={() => selectDropoffPlace(item)}
                    >
                      <MaterialIcons name="location-on" size={14} color="#FF6B6B" />
                      <View style={styles.suggestionContent}>
                        <Text style={styles.suggestionName}>{item.name}</Text>
                        {item.address && item.address !== item.name && (
                          <Text style={styles.suggestionAddress}>{item.address}</Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  )}
                />
              </View>
            )}
          </View>

          {/* Trip Details */}
          <View style={styles.detailsCard}>
            <Text style={styles.cardTitle}>Chi tiết chuyến xe</Text>

            {/* Start DateTime */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Thời gian xuất phát</Text>
              <TouchableOpacity
                style={styles.dateTimeButton}
                onPress={() => setShowDateTimePicker(true)}
              >
                <MaterialIcons name="calendar-today" size={16} color={COLORS.primary} />
                <Text style={styles.dateTimeText}>{startDateTimeFormatted}</Text>
              </TouchableOpacity>
            </View>

            {/* Remaining Seats */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Số ghế khách</Text>
              <View style={styles.seatsSelector}>
                {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                  <TouchableOpacity
                    key={num}
                    style={[
                      styles.seatButton,
                      remainingSeats === num.toString() && styles.seatButtonActive,
                    ]}
                    onPress={() => setRemainingSeats(num.toString())}
                  >
                    <Text
                      style={[
                        styles.seatButtonText,
                        remainingSeats === num.toString() && styles.seatButtonTextActive,
                      ]}
                    >
                      {num}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Notes */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Ghi chú</Text>
              <TextInput
                style={styles.notesInput}
                placeholder="VD: Xe có wifi, nước uống..."
                placeholderTextColor={COLORS.textSecondary}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={2}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* Create Button */}
          <TouchableOpacity
            style={[styles.createButton, loading && styles.createButtonDisabled]}
            onPress={handleCreateRide}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <MaterialIcons name="add" size={20} color="#fff" />
                <Text style={styles.createButtonText}>Tạo chuyến xe</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Bottom padding for last item */}
          <View style={{ height: 40 }} />
        </ScrollView>
      </Animated.View>

      {/* DateTime Picker */}
      {showDateTimePicker && (
        <DateTimePicker
          value={startDateTime}
          mode="datetime"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateTimeChange}
          minimumDate={new Date()}
        />
      )}
    </View>
  )
}

// ...existing code...

// ...existing code...

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
  backButtonContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
  },
  loadingRouteOverlay: {
    position: 'absolute',
    top: 60,
    right: 16,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    zIndex: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  loadingRouteText: {
    color: '#1a1a1a',
    fontSize: 14, // Bigger text
    fontWeight: '600',
  },
  routeInfoCard: {
    position: 'absolute',
    top: 60,
    left: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    zIndex: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  routeInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  routeInfoDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#e0e0e0',
  },
  routeInfoText: {
    color: '#1a1a1a',
    fontSize: 14, // Bigger
    fontWeight: '700',
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 28, // More rounded
    borderTopRightRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 20,
  },
  dragHandleContainer: {
    paddingTop: 16,
    paddingBottom: 12,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dragHandle: {
    width: 48, // Bigger drag handle
    height: 5,
    backgroundColor: '#ddd',
    borderRadius: 3,
    marginBottom: 12,
  },
  sheetTitle: {
    fontSize: 18, // Bigger title
    fontWeight: '700',
    color: '#1a1a1a',
  },
  sheetContent: {
    flex: 1,
    paddingHorizontal: 20, // More padding
    paddingTop: 20,
  },
  section: {
    marginBottom: 24, // More spacing
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 13, // Bigger
    fontWeight: '700', // Bolder
    color: '#FF6B35', // Orange accent
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailsCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 16, // More rounded
    padding: 20, // More padding
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  cardTitle: {
    fontSize: 16, // Bigger
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  fieldContainer: {
    marginBottom: 20, // More spacing between fields
  },
  fieldLabel: {
    fontSize: 13, // Bigger
    fontWeight: '600',
    color: '#666',
    marginBottom: 10,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1.5, // Thicker border
    borderColor: '#e0e0e0',
    borderRadius: 12, // More rounded
    paddingHorizontal: 16, // More padding
    paddingVertical: 14, // Taller input
    color: '#1a1a1a',
    fontSize: 15, // Bigger text
    fontWeight: '500',
  },
  inputContainer: {
    position: 'relative',
  },
  searchIndicator: {
    position: 'absolute',
    right: 16,
    top: '50%',
    marginTop: -10,
  },
  suggestionsContainer: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderTopWidth: 0,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    maxHeight: 180, // Taller suggestions
    marginTop: -1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14, // Taller items
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
    gap: 10,
  },
  suggestionContent: {
    flex: 1,
  },
  suggestionName: {
    fontSize: 14, // Bigger
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  suggestionAddress: {
    fontSize: 12,
    color: '#999',
    lineHeight: 16,
  },
  notesInput: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#1a1a1a',
    fontSize: 15,
    minHeight: 80, // Taller notes input
    textAlignVertical: 'top',
  },
  dateTimeButton: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14, // Taller button
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dateTimeText: {
    fontSize: 15, // Bigger text
    color: '#1a1a1a',
    fontWeight: '600',
    flex: 1,
  },
  seatsSelector: {
    flexDirection: 'row',
    gap: 10, // More spacing between seats
    flexWrap: 'wrap',
  },
  seatButton: {
    width: 48, // Bigger seats
    height: 48,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  seatButtonActive: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
    transform: [{ scale: 1.05 }], // Slightly bigger when active
  },
  seatButtonText: {
    fontSize: 17, // Bigger number
    fontWeight: '700',
    color: '#999',
  },
  seatButtonTextActive: {
    color: '#fff',
  },
  createButton: {
    backgroundColor: '#FF6B35',
    borderRadius: 14, // More rounded
    paddingVertical: 18, // Taller button
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
    marginTop: 8,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    fontSize: 17, // Bigger text
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
})
