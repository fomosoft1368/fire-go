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
  FlatList,
} from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { useSelector } from 'react-redux'
import type { RootState } from '../redux/store'
import { COLORS, SPACING, BORDER_RADIUS } from '../constants'
import MapViewComponent from '../components/MapView'
import HireDriverScreen from './HireDriverScreen'
import FindingRideModal from '../components/FindingRideModal'
import { rideService } from '../services/rideService'
import { useDebounce } from '../hooks'
import { placesService } from '../services/placesService'

const { width, height } = Dimensions.get('window')

export default function HomeScreen() {
  const [rideMode, setRideMode] = useState<'share' | 'hire'>('share' as const)
  const [pickupLocation, setPickupLocation] = useState('')
  const [dropoffLocation, setDropoffLocation] = useState('')
  const [pickupCoordinates, setPickupCoordinates] = useState<[number, number]>([105.8542, 21.0285])
  const [dropoffCoordinates, setDropoffCoordinates] = useState<[number, number]>([105.8542, 21.0285])
  const [isImmediately, setIsImmediately] = useState(true)
  const [passengerCount, setPassengerCount] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  
  // Places autocomplete states
  const [pickupSuggestions, setPickupSuggestions] = useState<any[]>([])
  const [dropoffSuggestions, setDropoffSuggestions] = useState<any[]>([])
  const [isSearchingPickup, setIsSearchingPickup] = useState(false)
  const [isSearchingDropoff, setIsSearchingDropoff] = useState(false)
  
  // Debounce inputs - chỉ gọi API sau khi user dừng gõ 500ms
  const debouncedPickupLocation = useDebounce(pickupLocation, 500)
  const debouncedDropoffLocation = useDebounce(dropoffLocation, 500)
  
  // Hire driver mode states
  const [carType, setCarType] = useState<'sedan' | 'suv' | 'truck'>('sedan')
  const [licensePlate, setLicensePlate] = useState('')
  const [transmission, setTransmission] = useState<'auto' | 'manual'>('auto')
  const [driverNote, setDriverNote] = useState('')
  const [isScheduled, setIsScheduled] = useState(false)
  
  const user = useSelector((state: RootState) => state.auth.user)

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
    let coords = [place.lng, place.lat];
    if (place.lat === 0 || place.lng === 0) {
      console.log('📡 [HomeScreen] Fetching coordinates for:', place.placeId);
      try {
        const details = await placesService.getPlaceDetails(place.placeId);
        if (details && details.lat && details.lng) {
          coords = [details.lng, details.lat];
          console.log('✅ Coordinates fetched:', coords);
        }
      } catch (error) {
        console.error('❌ Error fetching place details:', error);
      }
    }
    
    setPickupCoordinates(coords as [number, number]);
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
    let coords = [place.lng, place.lat];
    if (place.lat === 0 || place.lng === 0) {
      console.log('📡 [HomeScreen] Fetching coordinates for:', place.placeId);
      try {
        const details = await placesService.getPlaceDetails(place.placeId);
        if (details && details.lat && details.lng) {
          coords = [details.lng, details.lat];
          console.log('✅ Coordinates fetched:', coords);
        }
      } catch (error) {
        console.error('❌ Error fetching place details:', error);
      }
    }
    
    setDropoffCoordinates(coords as [number, number]);
    console.log('✅ Dropoff place selected:', placeName, coords);
  };

  // Clear cache for debugging
  const clearSearchCache = () => {
    placesService.clearCache();
    Alert.alert('Cache Cleared', 'Places cache cleared successfully');
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

      setIsLoading(true)

      // Tạo dữ liệu cuốc xe ghép - KHÔNG cần thông tin xe
      const rideData = {
        rideType: 'share' as const,
        pickupAddress: pickupLocation,
        pickupCoordinates: pickupCoordinates,
        dropoffAddress: dropoffLocation,
        dropoffCoordinates: dropoffCoordinates,
        distance: 5, // TODO: Tính từ API Maps
        duration: 15, // TODO: Tính từ API Maps
        baseFare: 10000,
        distanceFare: 5000,
        timeFare: 2000,
        passengers: passengerCount,
        // Không gửi carType, licensePlate, transmission, driverNote
      }

      const result = await rideService.createRide(rideData, user.id)
      
      // Keep modal showing for 2 seconds, then show success alert
      setTimeout(() => {
        setIsLoading(false)
        Alert.alert(
          'Thành công',
          '✓ Cuốc xe ghép đã được tạo!\n\nHệ thống đang tìm khách hàng khác để ghép xe với bạn...',
          [
            { 
              text: 'OK', 
              onPress: () => {
                setPickupLocation('')
                setDropoffLocation('')
                setPassengerCount(1)
                console.log('Shared ride created:', result)
              } 
            },
          ]
        )
      }, 2000)

      console.log('Ride created:', result)
    } catch (error: any) {
      setIsLoading(false)
      Alert.alert('Lỗi', error.message || 'Không thể tạo cuốc xe')
      console.error('Error:', error)
    }
  }

  const handleCancelFinding = () => {
    setIsLoading(false)
  }

  if (rideMode === 'hire') {
    return <HireDriverScreen {...{ isScheduled, setIsScheduled, carType, setCarType, licensePlate, setLicensePlate, transmission, setTransmission, driverNote, setDriverNote, pickupLocation, setPickupLocation, dropoffLocation, setDropoffLocation, setRideMode }} />
  }

  return (
    <SafeAreaView style={styles.container}>
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
      <View style={styles.headerSection}>
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Đặt xe ghép</Text>
          <TouchableOpacity style={styles.settingsButton}>
            <MaterialIcons name="settings" size={24} color="#fff" />
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
          onLocationSelect={(location) => {
            console.log('Location selected:', location)
          }}
        />

        {/* Location Button */}
        <TouchableOpacity style={styles.locationButton}>
          <MaterialIcons name="my-location" size={20} color="#FF6B00" />
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
              rideMode === 'share' && styles.rideTypeButtonActive,
            ]}
            onPress={() => setRideMode('share')}
          >
            <Text
              style={[
                styles.rideTypeText,
                rideMode === 'share' && styles.rideTypeTextActive,
              ]}
            >
              Ghép xe
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.rideTypeButton,
              ...(( rideMode as string) === 'hire' ? [styles.rideTypeButtonActive] : []),
            ]}
            onPress={() => setRideMode('hire')}
          >
            <Text
              style={[
                styles.rideTypeText,
                ...((rideMode as string) === 'hire' ? [styles.rideTypeTextActive] : []),
              ]}
            >
              Lái xe hộ
            </Text>
          </TouchableOpacity>
        </View>

        {/* Locations Section */}
        <View style={styles.locationsSection}>
          <Text style={styles.sectionLabel}>ĐIỂM ĐÓN</Text>
          <View style={styles.inputLocationWrapper}>
            <MaterialIcons
              name="radio-button-checked"
              size={20}
              color="#FF6B00"
            />
            <TextInput
              style={styles.inputLocation}
              placeholder="Nhập điểm đón..."
              placeholderTextColor="#64748b"
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

          <Text style={[styles.sectionLabel, { marginTop: SPACING.xl }]}>
            ĐIỂM ĐẾN
          </Text>
          <View style={styles.inputLocationWrapper}>
            <MaterialIcons name="location-on" size={20} color="#ef4444" />
            <TextInput
              style={styles.inputLocation}
              placeholder="Nhập điểm đến..."
              placeholderTextColor="#64748b"
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
          <View style={styles.timeWrapper}>
            <View>
              <Text style={styles.timeLabel}>Thời gian</Text>
              <View style={styles.immediateBox}>
                <Text style={styles.immediateText}>Ngay bây giờ</Text>
                <Text style={styles.immediateSubtext}>(Thay đổi)</Text>
              </View>
            </View>
            <Switch
              value={isImmediately}
              onValueChange={setIsImmediately}
              trackColor={{ false: '#374151', true: '#FF6B00' }}
              thumbColor="#fff"
              style={styles.switch}
            />
          </View>

          <View style={styles.passengerWrapper}>
            <Text style={styles.passengerLabel}>Số khách</Text>
            <View style={styles.passengerControls}>
              <TouchableOpacity
                style={styles.passengerButton}
                onPress={() => {
                  if (passengerCount > 1) setPassengerCount(passengerCount - 1)
                }}
              >
                <Text style={styles.passengerButtonText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.passengerCount}>{passengerCount}</Text>
              <TouchableOpacity
                style={styles.passengerButton}
                onPress={() => {
                  if (passengerCount < 6) setPassengerCount(passengerCount + 1)
                }}
              >
                <Text style={styles.passengerButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Price Section */}
        <View style={styles.priceSection}>
          <Text style={styles.priceLabel}>Giá từ</Text>
          <Text style={styles.priceValue}>45.000đ</Text>
        </View>

        {/* Find Ride Button */}
        <TouchableOpacity 
          style={styles.findButton}
          onPress={handleFindRide}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Text style={styles.findButtonText}>Tìm chuyến xe</Text>
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
    backgroundColor: '#0f172a',
  },
  headerSection: {
    height: height * 0.4,
    backgroundColor: '#1a202c',
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
    color: '#fff',
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
    backgroundColor: '#374151',
  //   backgroundImage: 'linear-gradient(45deg, #4b5563 25%, #374151 25%, #374151 50%, #4b5563 50%, #4b5563 75%, #374151 75%, #374151)',
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
    backgroundColor: '#1a202c',
    justifyContent: 'center',
    alignItems: 'center',
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
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rideTypeButtonActive: {
    backgroundColor: 'transparent',
    borderColor: '#374151',
    borderWidth: 2,
  },
  rideTypeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
  },
  rideTypeTextActive: {
    color: '#fff',
  },
  locationsSection: {
    marginBottom: SPACING.xl,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: SPACING.md,
    letterSpacing: 0.5,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.lg,
    backgroundColor: '#1a202c',
    borderRadius: BORDER_RADIUS.lg,
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  locationContent: {
    flex: 1,
  },
  locationText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
  },
  inputLocationWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    height: 56,
    backgroundColor: '#1a202c',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    gap: SPACING.md,
  },
  inputLocation: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
  },
  timePassengerSection: {
    flexDirection: 'row',
    gap: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  timeWrapper: {
    flex: 1,
    backgroundColor: '#1a202c',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  timeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: SPACING.sm,
  },
  immediateBox: {
    marginBottom: SPACING.md,
  },
  immediateText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
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
    backgroundColor: '#1a202c',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
  },
  passengerLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
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
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  passengerButtonText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#94a3b8',
  },
  passengerCount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    minWidth: 30,
    textAlign: 'center',
  },
  priceSection: {
    marginBottom: SPACING.xl,
  },
  priceLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: SPACING.sm,
  },
  priceValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FF6B00',
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
})
