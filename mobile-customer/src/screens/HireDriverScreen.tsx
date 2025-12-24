import React, { useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
} from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { SPACING, BORDER_RADIUS } from '../constants'
import MapViewComponent from '../components/MapView'

interface HireDriverScreenProps {
  isScheduled: boolean
  setIsScheduled: (value: boolean) => void
  carType: 'sedan' | 'suv' | 'truck'
  setCarType: (type: 'sedan' | 'suv' | 'truck') => void
  licensePlate: string
  setLicensePlate: (value: string) => void
  transmission: 'auto' | 'manual'
  setTransmission: (type: 'auto' | 'manual') => void
  driverNote: string
  setDriverNote: (value: string) => void
  pickupLocation: string
  setPickupLocation: (value: string) => void
  dropoffLocation: string
  setDropoffLocation: (value: string) => void
  setRideMode: (mode: 'share' | 'hire') => void
}

export default function HireDriverScreen({
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
}: HireDriverScreenProps) {
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setRideMode('share')}
        >
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Đặt lái xe hộ</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        style={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Location Card */}
        <View style={styles.locationCard}>
          <View style={styles.locationRow}>
            <MaterialIcons name="my-location" size={24} color="#FF6B00" />
            <View style={styles.locationInputWrapper}>
              <Text style={styles.locationLabel}>Điểm đón</Text>
              <TextInput
                style={styles.locationInput}
                value={pickupLocation}
                onChangeText={setPickupLocation}
                placeholder="Nhập điểm đón"
                placeholderTextColor="#64748b"
              />
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.locationRow}>
            <MaterialIcons name="location-on" size={24} color="#ef4444" />
            <View style={styles.locationInputWrapper}>
              <Text style={styles.locationLabel}>Điểm đến</Text>
              <TextInput
                style={styles.locationInput}
                value={dropoffLocation}
                onChangeText={setDropoffLocation}
                placeholder="Bạn muốn đến đâu?"
                placeholderTextColor="#64748b"
              />
            </View>
          </View>
        </View>

        {/* Map Component */}
        <MapViewComponent
          height={200}
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

        {/* Time Toggle */}
        <View style={styles.timeToggleContainer}>
          <TouchableOpacity
            style={[
              styles.timeButton,
              !isScheduled && styles.timeButtonActive,
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
                styles.timeButtonText,
                !isScheduled && styles.timeButtonTextActive,
              ]}
            >
              Đi ngay
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.timeButton,
              isScheduled && styles.timeButtonActive,
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
                styles.timeButtonText,
                isScheduled && styles.timeButtonTextActive,
              ]}
            >
              Hẹn giờ
            </Text>
          </TouchableOpacity>
        </View>

        {/* Vehicle Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thông tin xe</Text>

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
                  carType === car.id && styles.carTypeButtonActive,
                ]}
                onPress={() => setCarType(car.id as any)}
              >
                <MaterialIcons
                  name={car.icon as any}
                  size={32}
                  color={carType === car.id ? '#FF6B00' : '#94a3b8'}
                />
                <Text
                  style={[
                    styles.carTypeLabel,
                    carType === car.id && styles.carTypeLabelActive,
                  ]}
                >
                  {car.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* License Plate Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Biển số xe</Text>
            <View style={styles.inputContainer}>
              <MaterialIcons name="pin" size={20} color="#94a3b8" />
              <TextInput
                style={styles.textInput}
                placeholder="Ví dụ: 30A-123.45"
                placeholderTextColor="#64748b"
                value={licensePlate}
                onChangeText={setLicensePlate}
              />
            </View>
          </View>

          {/* Transmission Selection */}
          <View style={styles.transmissionGroup}>
            <Text style={styles.inputLabel}>Loại hộp số (Bắt buộc)</Text>
            <View style={styles.transmissionContainer}>
              <TouchableOpacity
                style={[
                  styles.transmissionButton,
                  transmission === 'auto' && styles.transmissionButtonActive,
                ]}
                onPress={() => setTransmission('auto')}
              >
                <Text
                  style={[
                    styles.transmissionText,
                    transmission === 'auto' && styles.transmissionTextActive,
                  ]}
                >
                  Số tự động
                </Text>
                {transmission === 'auto' && (
                  <MaterialIcons
                    name="check-circle"
                    size={16}
                    color="#FF6B00"
                    style={styles.checkIcon}
                  />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.transmissionButton,
                  transmission === 'manual' && styles.transmissionButtonActive,
                ]}
                onPress={() => setTransmission('manual')}
              >
                <Text
                  style={[
                    styles.transmissionText,
                    transmission === 'manual' && styles.transmissionTextActive,
                  ]}
                >
                  Số sàn
                </Text>
                {transmission === 'manual' && (
                  <MaterialIcons
                    name="check-circle"
                    size={16}
                    color="#FF6B00"
                    style={styles.checkIcon}
                  />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Driver Note */}
        <View style={styles.noteSection}>
          <Text style={styles.inputLabel}>Ghi chú cho tài xế</Text>
          <View style={styles.noteContainer}>
            <TextInput
              style={styles.noteInput}
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
      <View style={styles.bottomAction}>
        <View style={styles.priceContainer}>
          <View style={styles.priceIcon}>
            <MaterialIcons name="payments" size={20} color="#FF6B00" />
          </View>
          <View style={styles.priceInfo}>
            <Text style={styles.priceLabel}>Ước tính</Text>
            <Text style={styles.priceValue}>250.000đ</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.findButton}>
          <Text style={styles.findButtonText}>Tìm tài xế ngay</Text>
          <MaterialIcons
            name="arrow-forward"
            size={20}
            color="#fff"
            style={styles.findButtonIcon}
          />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    paddingTop: SPACING.xxl,
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
