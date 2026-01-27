import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { SPACING, BORDER_RADIUS } from '../constants'
import MapViewComponent from '../components/MapView'

interface FindingDriverScreenProps {
  routeInfo: any
  fareEstimate?: any
  pickupAddress: string
  dropoffAddress: string
  colors: {
    bg: string
    bgSecondary: string
    border: string
    text: string
    textSecondary: string
  }
  onCancel: () => void
}

export default function FindingDriverScreen({
  routeInfo,
  fareEstimate,
  pickupAddress,
  dropoffAddress,
  colors,
  onCancel,
}: FindingDriverScreenProps) {
  return (
    <View style={styles.findingContainer}>
      <View style={StyleSheet.absoluteFillObject}>
        <MapViewComponent
          height={'100%'}
          initialRegion={{
            latitude: routeInfo.pickup.coordinates.latitude,
            longitude: routeInfo.pickup.coordinates.longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
          markers={[]}
          pickupCoords={{
            latitude: routeInfo.pickup.coordinates.latitude,
            longitude: routeInfo.pickup.coordinates.longitude,
          }}
          dropoffCoords={{
            latitude: routeInfo.dropoff.coordinates.latitude,
            longitude: routeInfo.dropoff.coordinates.longitude,
          }}
          routeCoordinates={routeInfo.routeCoordinates || []}
          onLocationSelect={() => { }}
        />
      </View>
      {/* Header with Back Button and Logo */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: "#fff" }]}
          onPress={onCancel}
        >
          <MaterialIcons name="arrow-back" size={24} color="#FF6B00" />
        </TouchableOpacity>
        <Text style={styles.logoText}>firego</Text>
      </View>
      <View style={styles.professionalStatusCard}>
        {/* Handle Bar */}
        <View style={styles.handleBarContainer}>
          <View style={styles.handleBar} />
        </View>

        {/* Status Content */}
        <View style={styles.statusContentWrapper}>
          {/* Header with Status */}
          <View style={styles.statusHeader}>
            <View style={styles.statusHeaderLeft}>
              <Text style={styles.statusTitleLarge}>
                Đang tìm tài xế
              </Text>
              <Text style={styles.statusSubtitle}>
                Vui lòng đợi trong giây lát
              </Text>
            </View>
            <View style={styles.statusBadge}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Đang tìm</Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressSection}>
            <View style={styles.progressBar}>
              <View style={styles.progressFill} />
            </View>
            <Text style={styles.progressText}>Đang kết nối với tài xế gần bạn...</Text>
          </View>

          {/* Route Section */}
          <View style={styles.routeSection}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="route" size={20} color="#9CA3AF" />
              <Text style={styles.sectionTitle}>Lộ trình</Text>
            </View>

            <View style={styles.locationItem}>
              <View style={styles.locationIconWrapper}>
                <View style={styles.pickupDot} />
                <View style={styles.routeLine} />
              </View>
              <View style={styles.locationContent}>
                <Text style={styles.locationLabel}>Điểm đón</Text>
                <Text style={styles.locationAddress} numberOfLines={1}>
                  {pickupAddress}
                </Text>
              </View>
            </View>

            <View style={styles.locationItem}>
              <View style={styles.locationIconWrapper}>
                <MaterialIcons name="location-on" size={20} color="#EF4444" />
              </View>
              <View style={styles.locationContent}>
                <Text style={styles.locationLabel}>Điểm trả</Text>
                <Text style={styles.locationAddress} numberOfLines={1}>
                  {dropoffAddress}
                </Text>
              </View>
            </View>
          </View>

          {/* Trip Info */}
          {fareEstimate && (
            <View style={styles.tripInfoSection}>
              <View style={styles.sectionHeader}>
                <MaterialIcons name="info-outline" size={20} color="#9CA3AF" />
                <Text style={styles.sectionTitle}>Thông tin chuyến đi</Text>
              </View>
              <View style={styles.infoGrid}>
                <View style={styles.infoCard}>
                  <MaterialIcons name="payments" size={18} color="#FF6B00" />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Giá ước tính</Text>
                    <Text style={styles.infoValue}>
                      {fareEstimate.total?.toLocaleString('vi-VN')}đ
                    </Text>
                  </View>
                </View>
                <View style={styles.infoCard}>
                  <MaterialIcons name="account-balance-wallet" size={18} color="#9CA3AF" />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Thanh toán</Text>
                    <Text style={styles.infoValue}>Tiền mặt</Text>
                  </View>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Cancel Button */}
        <TouchableOpacity style={styles.cancelButtonLarge} onPress={onCancel}>
          <MaterialIcons name="close" size={20} color="#EF4444" />
          <Text style={styles.cancelButtonLargeText}>Hủy tìm kiếm</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  findingContainer: {
    flex: 1,
    position: 'relative',
  },
  professionalStatusCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1a202c',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingBottom: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 15,
  },
  handleBarContainer: {
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 12,
  },
  handleBar: {
    width: 40,
    height: 5,
    backgroundColor: '#4B5563',
    borderRadius: 3,
  },
  statusContentWrapper: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.md,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusHeaderLeft: {
    flex: 1,
  },
  statusTitleLarge: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  statusSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#9CA3AF',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#374151',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFB800',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  progressSection: {
    gap: 8,
    marginBottom: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#374151',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    width: '60%',
    backgroundColor: '#FF6B00',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  routeSection: {
    backgroundColor: '#374151',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#4B5563',
  },
  locationItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  locationIconWrapper: {
    width: 24,
    alignItems: 'center',
    marginRight: 12,
  },
  pickupDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: '#fff',
  },
  routeLine: {
    width: 2,
    height: 30,
    backgroundColor: '#4B5563',
    marginTop: 4,
  },
  locationContent: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
    marginBottom: 4,
  },
  locationAddress: {
    fontSize: 14,
    color: '#fff',
    lineHeight: 20,
  },
  tripInfoSection: {
    marginBottom: 12,
  },
  infoGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  infoCard: {
    flex: 1,
    backgroundColor: '#374151',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#4B5563',
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#9CA3AF',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  cancelButtonLarge: {
    marginTop: SPACING.lg,
    marginHorizontal: SPACING.lg,
    height: 56,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#EF4444',
    backgroundColor: 'transparent',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  cancelButtonLargeText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#EF4444',
  },
  header: {
    position: 'absolute',
    top: 50,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
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
})
