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
} from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { useSelector } from 'react-redux'
import type { RootState } from '../redux/store'
import { COLORS, SPACING, BORDER_RADIUS } from '../constants'

const { width, height } = Dimensions.get('window')

export default function HomeScreen() {
  const [rideMode, setRideMode] = useState<'share' | 'hire'>('share')
  const [pickupLocation, setPickupLocation] = useState('123 Nguyễn Trãi, Thanh Xuân')
  const [dropoffLocation, setDropoffLocation] = useState('')
  const [isImmediately, setIsImmediately] = useState(true)
  const [passengerCount, setPassengerCount] = useState(1)
  
  // Hire driver mode states
  const [carType, setCarType] = useState<'sedan' | 'suv' | 'truck'>('sedan')
  const [licensePlate, setLicensePlate] = useState('')
  const [transmission, setTransmission] = useState<'auto' | 'manual'>('auto')
  const [driverNote, setDriverNote] = useState('')
  const [isScheduled, setIsScheduled] = useState(false)
  
  const user = useSelector((state: RootState) => state.auth.user)

  if (rideMode === 'hire') {
    return <HireDriverScreen {...{ isScheduled, setIsScheduled, carType, setCarType, licensePlate, setLicensePlate, transmission, setTransmission, driverNote, setDriverNote, pickupLocation, setPickupLocation, dropoffLocation, setDropoffLocation, setRideMode }} />
  }

  return (
    <SafeAreaView style={styles.container}>
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
        <View style={styles.mapContainer}>
          <View style={styles.mapPlaceholder} />
          <View style={styles.routeInfo}>
            <MaterialIcons name="timer" size={16} color="#fff" />
            <Text style={styles.routeText}>15 phút + 3km</Text>
          </View>
        </View>

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
              rideMode === 'hire' && styles.rideTypeButtonActive,
            ]}
            onPress={() => setRideMode('hire')}
          >
            <Text
              style={[
                styles.rideTypeText,
                rideMode === 'hire' && styles.rideTypeTextActive,
              ]}
            >
              Lái xe hộ
            </Text>
          </TouchableOpacity>
        </View>

        {/* Locations Section */}
        <View style={styles.locationsSection}>
          <Text style={styles.sectionLabel}>ĐIỂM ĐÓN</Text>
          <View style={styles.locationItem}>
            <MaterialIcons
              name="radio-button-checked"
              size={20}
              color="#FF6B00"
            />
            <View style={styles.locationContent}>
              <Text style={styles.locationText}>{pickupLocation}</Text>
            </View>
            <TouchableOpacity>
              <MaterialIcons name="close" size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

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
              onChangeText={setDropoffLocation}
            />
          </View>
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
        <TouchableOpacity style={styles.findButton}>
          <Text style={styles.findButtonText}>Tìm chuyến xe</Text>
          <MaterialIcons
            name="arrow-forward"
            size={20}
            color="#fff"
            style={styles.findButtonIcon}
          />
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
    backgroundImage: 'linear-gradient(45deg, #4b5563 25%, #374151 25%, #374151 50%, #4b5563 50%, #4b5563 75%, #374151 75%, #374151)',
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
})

// Hire Driver Screen Component
function HireDriverScreen({
  isScheduled,
  setIsScheduled,
  carType,
  setCarType,
  licensePlate,
  setLicensePlate,
  transmission,
  setTransmission,
  driverNote,
  setDriverNote,
  pickupLocation,
  setPickupLocation,
  dropoffLocation,
  setDropoffLocation,
  setRideMode,
}: any) {
  return (
    <SafeAreaView style={hireStyles.container}>
      {/* Header */}
      <View style={hireStyles.header}>
        <TouchableOpacity
          style={hireStyles.backButton}
          onPress={() => setRideMode('share')}
        >
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={hireStyles.headerTitle}>Đặt lái xe hộ</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        style={hireStyles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Location Card */}
        <View style={hireStyles.locationCard}>
          <View style={hireStyles.locationRow}>
            <MaterialIcons name="my-location" size={24} color="#FF6B00" />
            <View style={hireStyles.locationInputWrapper}>
              <Text style={hireStyles.locationLabel}>Điểm đón</Text>
              <TextInput
                style={hireStyles.locationInput}
                value={pickupLocation}
                onChangeText={setPickupLocation}
                placeholder="Nhập điểm đón"
                placeholderTextColor="#64748b"
              />
            </View>
          </View>

          <View style={hireStyles.divider} />

          <View style={hireStyles.locationRow}>
            <MaterialIcons name="location-on" size={24} color="#ef4444" />
            <View style={hireStyles.locationInputWrapper}>
              <Text style={hireStyles.locationLabel}>Điểm đến</Text>
              <TextInput
                style={hireStyles.locationInput}
                value={dropoffLocation}
                onChangeText={setDropoffLocation}
                placeholder="Bạn muốn đến đâu?"
                placeholderTextColor="#64748b"
              />
            </View>
          </View>
        </View>

        {/* Map Placeholder */}
        <View style={hireStyles.mapContainer}>
          <View style={hireStyles.mapPlaceholder} />
          <TouchableOpacity style={hireStyles.mapButton}>
            <MaterialIcons name="map" size={16} color="#fff" />
            <Text style={hireStyles.mapButtonText}>Xem bản đồ</Text>
          </TouchableOpacity>
        </View>

        {/* Time Toggle */}
        <View style={hireStyles.timeToggleContainer}>
          <TouchableOpacity
            style={[
              hireStyles.timeButton,
              !isScheduled && hireStyles.timeButtonActive,
            ]}
            onPress={() => setIsScheduled(false)}
          >
            <MaterialIcons
              name="bolt"
              size={18}
              color={!isScheduled ? '#FF6B00' : '#64748b'}
            />
            <Text
              style={[
                hireStyles.timeButtonText,
                !isScheduled && hireStyles.timeButtonTextActive,
              ]}
            >
              Đi ngay
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              hireStyles.timeButton,
              isScheduled && hireStyles.timeButtonActive,
            ]}
            onPress={() => setIsScheduled(true)}
          >
            <MaterialIcons
              name="schedule"
              size={18}
              color={isScheduled ? '#FF6B00' : '#64748b'}
            />
            <Text
              style={[
                hireStyles.timeButtonText,
                isScheduled && hireStyles.timeButtonTextActive,
              ]}
            >
              Hẹn giờ
            </Text>
          </TouchableOpacity>
        </View>

        {/* Vehicle Info Section */}
        <View style={hireStyles.section}>
          <Text style={hireStyles.sectionTitle}>Thông tin xe</Text>

          {/* Car Type Selection */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={hireStyles.carTypeScroll}
          >
            {[
              { id: 'sedan', label: '4 chỗ (Sedan)', icon: 'directions-car' },
              { id: 'suv', label: '7 chỗ (SUV)', icon: 'airport-shuttle' },
              { id: 'truck', label: 'Bán tải', icon: 'local-shipping' },
            ].map((car: any) => (
              <TouchableOpacity
                key={car.id}
                style={[
                  hireStyles.carTypeButton,
                  carType === car.id && hireStyles.carTypeButtonActive,
                ]}
                onPress={() => setCarType(car.id)}
              >
                <MaterialIcons
                  name={car.icon as any}
                  size={32}
                  color={carType === car.id ? '#FF6B00' : '#94a3b8'}
                />
                <Text
                  style={[
                    hireStyles.carTypeLabel,
                    carType === car.id && hireStyles.carTypeLabelActive,
                  ]}
                >
                  {car.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* License Plate Input */}
          <View style={hireStyles.inputGroup}>
            <Text style={hireStyles.inputLabel}>Biển số xe</Text>
            <View style={hireStyles.inputContainer}>
              <MaterialIcons name="pin" size={20} color="#94a3b8" />
              <TextInput
                style={hireStyles.textInput}
                placeholder="Ví dụ: 30A-123.45"
                placeholderTextColor="#64748b"
                value={licensePlate}
                onChangeText={setLicensePlate}
              />
            </View>
          </View>

          {/* Transmission Selection */}
          <View style={hireStyles.transmissionGroup}>
            <Text style={hireStyles.inputLabel}>Loại hộp số (Bắt buộc)</Text>
            <View style={hireStyles.transmissionContainer}>
              <TouchableOpacity
                style={[
                  hireStyles.transmissionButton,
                  transmission === 'auto' && hireStyles.transmissionButtonActive,
                ]}
                onPress={() => setTransmission('auto')}
              >
                <Text
                  style={[
                    hireStyles.transmissionText,
                    transmission === 'auto' && hireStyles.transmissionTextActive,
                  ]}
                >
                  Số tự động
                </Text>
                {transmission === 'auto' && (
                  <MaterialIcons
                    name="check-circle"
                    size={16}
                    color="#FF6B00"
                    style={hireStyles.checkIcon}
                  />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  hireStyles.transmissionButton,
                  transmission === 'manual' && hireStyles.transmissionButtonActive,
                ]}
                onPress={() => setTransmission('manual')}
              >
                <Text
                  style={[
                    hireStyles.transmissionText,
                    transmission === 'manual' && hireStyles.transmissionTextActive,
                  ]}
                >
                  Số sàn
                </Text>
                {transmission === 'manual' && (
                  <MaterialIcons
                    name="check-circle"
                    size={16}
                    color="#FF6B00"
                    style={hireStyles.checkIcon}
                  />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Driver Note */}
        <View style={hireStyles.noteSection}>
          <Text style={hireStyles.inputLabel}>Ghi chú cho tài xế</Text>
          <View style={hireStyles.noteContainer}>
            <TextInput
              style={hireStyles.noteInput}
              placeholder="Xe đỗ ở hầm B1, cột A05..."
              placeholderTextColor="#64748b"
              value={driverNote}
              onChangeText={setDriverNote}
              multiline
            />
          </View>
        </View>

        <View style={{ height: SPACING.xxl }} />
      </ScrollView>

      {/* Bottom Action */}
      <View style={hireStyles.bottomAction}>
        <View style={hireStyles.priceContainer}>
          <View style={hireStyles.priceIcon}>
            <MaterialIcons name="payments" size={20} color="#FF6B00" />
          </View>
          <View style={hireStyles.priceInfo}>
            <Text style={hireStyles.priceLabel}>Ước tính</Text>
            <Text style={hireStyles.priceValue}>250.000đ</Text>
          </View>
        </View>
        <TouchableOpacity style={hireStyles.findButton}>
          <Text style={hireStyles.findButtonText}>Tìm tài xế ngay</Text>
          <MaterialIcons
            name="arrow-forward"
            size={20}
            color="#fff"
            style={hireStyles.findButtonIcon}
          />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

// Hire Driver Screen Styles
const hireStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
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
  contentContainer: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
  },
  locationCard: {
    backgroundColor: '#1a202c',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  locationInputWrapper: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: SPACING.xs,
  },
  locationInput: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: SPACING.lg,
    marginLeft: 44,
  },
  mapContainer: {
    height: 200,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    marginBottom: SPACING.lg,
    position: 'relative',
    backgroundColor: '#374151',
  },
  mapPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#4b5563',
  },
  mapButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -40,
    marginTop: -20,
    backgroundColor: '#1a202c',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  mapButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  timeToggleContainer: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
    backgroundColor: '#1a202c',
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
  },
  timeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  timeButtonActive: {
    backgroundColor: '#374151',
  },
  timeButtonText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  timeButtonTextActive: {
    color: '#fff',
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: SPACING.lg,
    paddingHorizontal: SPACING.sm,
  },
  carTypeScroll: {
    marginBottom: SPACING.lg,
  },
  carTypeButton: {
    width: 110,
    height: 120,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: '#1a202c',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  carTypeButtonActive: {
    borderColor: '#FF6B00',
    backgroundColor: 'rgba(255, 107, 0, 0.1)',
  },
  carTypeLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
    textAlign: 'center',
  },
  carTypeLabelActive: {
    color: '#FF6B00',
  },
  inputGroup: {
    marginBottom: SPACING.lg,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: SPACING.md,
  },
  inputContainer: {
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
  textInput: {
    flex: 1,
    color: '#fff',
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
    backgroundColor: '#1a202c',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  transmissionButtonActive: {
    borderColor: '#FF6B00',
    backgroundColor: 'rgba(255, 107, 0, 0.1)',
  },
  transmissionText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
  transmissionTextActive: {
    color: '#FF6B00',
  },
  checkIcon: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
  },
  noteSection: {
    marginBottom: SPACING.xl,
  },
  noteContainer: {
    backgroundColor: '#1a202c',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    padding: SPACING.md,
    minHeight: 120,
  },
  noteInput: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    textAlignVertical: 'top',
  },
  bottomAction: {
    backgroundColor: '#1a202c',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    gap: SPACING.md,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  priceIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 107, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  priceInfo: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#94a3b8',
  },
  priceValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  findButton: {
    height: 56,
    backgroundColor: '#FF6B00',
    borderRadius: BORDER_RADIUS.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.sm,
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
  },
  findButtonIcon: {
    marginLeft: SPACING.sm,
  },
})
