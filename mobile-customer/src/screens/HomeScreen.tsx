import React, { useState } from 'react'
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
import FindingRideModal from '../components/FindingRideModal'
import { rideService } from '../services/rideService'

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
  
  // Hire driver mode states
  const [carType, setCarType] = useState<'sedan' | 'suv' | 'truck'>('sedan')
  const [licensePlate, setLicensePlate] = useState('')
  const [transmission, setTransmission] = useState<'auto' | 'manual'>('auto')
  const [driverNote, setDriverNote] = useState('')
  const [isScheduled, setIsScheduled] = useState(false)
  
  const user = useSelector((state: RootState) => state.auth.user)
  const themeMode = useSelector((state: RootState) => state.theme.mode)
  const colors = themeMode === 'dark' ? COLORS_DARK : COLORS_LIGHT

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
      
      // 🚀 Tự động chỉ định tài xế
      const assignedRide = await rideService.autoAssignDriver(result._id)
      
      // Keep modal showing for 2 seconds, then show success alert
      setTimeout(() => {
        setIsLoading(false)
        Alert.alert(
          'Thành công',
          `✓ Tài xế ${assignedRide.driverId?.firstName || 'đã nhận'} chuyến!\n\nTài xế sẽ tới trong ~${assignedRide.estimatedArrival || 10} phút`,
          [
            { 
              text: 'OK', 
              onPress: () => {
                setPickupLocation('')
                setDropoffLocation('')
                setPassengerCount(1)
                console.log('Ride with auto-assigned driver created:', assignedRide)
              } 
            },
          ]
        )
      }, 2000)

      console.log('Ride created and assigned:', assignedRide)
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
          onLocationSelect={(location) => {
            console.log('Location selected:', location)
          }}
        />

        {/* Location Button */}
        <TouchableOpacity style={[styles.locationButton, { backgroundColor: colors.bgSecondary }]}>
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
              onChangeText={setPickupLocation}
            />
          </View>

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
              onChangeText={setDropoffLocation}
            />
          </View>
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

        {/* Price Section */}
        <View style={styles.priceSection}>
          <Text style={[styles.priceLabel, { color: colors.textSecondary }]}>Giá từ</Text>
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
  },
  inputLocation: {
    flex: 1,
    fontSize: 14,
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
})
