import { useState, useRef } from 'react'
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
  KeyboardAvoidingView,
  Platform,
  FlatList,
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
import type { RootState } from '../redux/store'

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

    setLoading(true)
    try {
      console.log('📍 Pickup coords:', pickupCoords)
      console.log('📍 Dropoff coords:', dropoffCoords)

      // Gọi backend API để lấy khoảng cách và thời gian chính xác
      const directionUrl = `${API_BASE_URL}/rides/directions?startLng=${pickupCoords[0]}&startLat=${pickupCoords[1]}&endLng=${dropoffCoords[0]}&endLat=${dropoffCoords[1]}`
      console.log('📍 Direction URL:', directionUrl)

      const response = await fetch(directionUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Không thể tính toán quảng đường (${response.status})`)
      }

      const directionData = await response.json()
      const distance = directionData.distance || 0 // km
      const duration = directionData.duration || 0 // minutes

      console.log('✅ Distance:', distance, 'km, Duration:', duration, 'minutes')

      // Tính giá (cơ sở: 10k, theo khoảng cách: 5k/km, theo thời gian: 1k/phút)
      const baseFare = 10000
      const distanceFare = Math.round(distance * 5000)
      const timeFare = duration * 1000

      const rideData = {
        pickupAddress: pickupLocation,
        dropoffAddress: dropoffLocation,
        pickupCoordinates: pickupCoords, // [longitude, latitude] - THỰC
        dropoffCoordinates: dropoffCoords, // [longitude, latitude] - THỰC
        distance: Math.round(distance * 10) / 10,
        duration: duration,
        baseFare: baseFare,
        distanceFare: distanceFare,
        timeFare: timeFare,
        rideType: 'share' as const,
        startDateTime: startDateTime.toISOString(),
        totalSeats: parseInt(remainingSeats), // ✅ Backend controller đọc field này
        remainingSeats: parseInt(remainingSeats), // ✅ DTO require field này
        driverId: user?.id,
        notes: notes,
        createdBy: 'driver', //  Mark this trip as driver-created
        // Status sẽ được set bởi backend thành PENDING
      }

      console.log('📍 Ride data with REAL coordinates:', rideData)

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

  const currentDateTime = new Date().toLocaleString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })

  const startDateTimeFormatted = startDateTime.toLocaleString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialIcons name="arrow-back" size={24} color={COLORS.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Tạo chuyến xe ghép</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Pickup Location */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="location-on" size={20} color={COLORS.primary} />
              <Text style={styles.sectionTitle}>Vị trí xuất phát</Text>
            </View>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Nhập vị trí xuất phát"
                placeholderTextColor={COLORS.textSecondary}
                value={pickupLocation}
                onChangeText={handlePickupLocationChange}
                onFocus={() => setShowPickupSuggestions(true)}
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
                      <MaterialIcons name="location-on" size={16} color={COLORS.primary} style={styles.suggestionIcon} />
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
              <MaterialIcons name="location-on" size={20} color="#FF6B6B" />
              <Text style={styles.sectionTitle}>Vị trí đích đến</Text>
            </View>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Nhập vị trí đích đến"
                placeholderTextColor={COLORS.textSecondary}
                value={dropoffLocation}
                onChangeText={handleDropoffLocationChange}
                onFocus={() => setShowDropoffSuggestions(true)}
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
                      <MaterialIcons name="location-on" size={16} color="#FF6B6B" style={styles.suggestionIcon} />
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

          {/* Start DateTime */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="schedule" size={20} color={COLORS.primary} />
              <Text style={styles.sectionTitle}>Thời gian bắt đầu</Text>
            </View>
            <TouchableOpacity
              style={styles.dateTimeButton}
              onPress={() => setShowDateTimePicker(true)}
            >
              <MaterialIcons name="calendar-today" size={20} color={COLORS.primary} />
              <Text style={styles.dateTimeText}>{startDateTimeFormatted}</Text>
            </TouchableOpacity>
          </View>

          {/* Remaining Seats */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="event-seat" size={20} color={COLORS.primary} />
              <Text style={styles.sectionTitle}>Số ghế còn lại</Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Nhập số ghế còn lại (1-7)"
              placeholderTextColor={COLORS.textSecondary}
              value={remainingSeats}
              onChangeText={(text) => {
                // Chỉ cho phép nhập 1-7
                const num = parseInt(text)
                if (text === '' || (num >= 1 && num <= 7)) {
                  setRemainingSeats(text)
                }
              }}
              keyboardType="number-pad"
              maxLength={1}
            />
          </View>

          {/* Notes */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="notes" size={20} color={COLORS.primary} />
              <Text style={styles.sectionTitle}>Ghi chú (không bắt buộc)</Text>
            </View>
            <TextInput
              style={[styles.input, styles.notesInput]}
              placeholder="Nhập ghi chú về chuyến xe"
              placeholderTextColor={COLORS.textSecondary}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        </ScrollView>

        {/* Create Button */}
        <View style={styles.footer}>
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
        </View>
      </KeyboardAvoidingView>

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
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.darkBg,
  },
  keyboardAvoid: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.darkBorder,
    paddingTop: 35,
  },
  backButton: {
    padding: SPACING.sm,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  input: {
    backgroundColor: COLORS.darkCard,
    borderWidth: 1,
    borderColor: COLORS.darkBorder,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    color: COLORS.text,
    fontSize: 14,
  },
  inputContainer: {
    position: 'relative',
  },
  searchIndicator: {
    position: 'absolute',
    right: SPACING.md,
    top: '50%',
    marginTop: -10,
  },
  suggestionsContainer: {
    backgroundColor: COLORS.darkCard,
    borderWidth: 1,
    borderColor: COLORS.darkBorder,
    borderTopWidth: 0,
    borderBottomLeftRadius: BORDER_RADIUS.md,
    borderBottomRightRadius: BORDER_RADIUS.md,
    maxHeight: 300,
    marginTop: -1,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.darkBorder,
    gap: SPACING.sm,
  },
  suggestionIcon: {
    marginRight: SPACING.sm,
  },
  suggestionContent: {
    flex: 1,
  },
  suggestionName: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  suggestionAddress: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '400',
  },
  notesInput: {
    minHeight: 100,
    paddingTop: SPACING.md,
  },
  dateTimeButton: {
    backgroundColor: COLORS.darkCard,
    borderWidth: 1,
    borderColor: COLORS.darkBorder,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  dateTimeText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
    flex: 1,
  },
  summaryCard: {
    backgroundColor: COLORS.darkCard,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.darkBorder,
  },
  summaryLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  footer: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.darkBorder,
  },
  createButton: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
})
