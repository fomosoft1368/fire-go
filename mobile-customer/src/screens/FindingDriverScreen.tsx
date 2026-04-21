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
  depositAmount?: number // Tiền cọc (nếu có)
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
  depositAmount = 0,
  colors,
  onCancel,
}: FindingDriverScreenProps) {
  const hasDeposit = depositAmount > 0
  const totalFare = fareEstimate?.total || fareEstimate?.finalPrice || 0
  const remainingPayment = hasDeposit ? totalFare - depositAmount : totalFare
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
              <MaterialIcons name="route" size={20} color="#FF6B00" />
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
                <MaterialIcons name="location-on" size={20} color="#FF6B00" />
              </View>
              <View style={styles.locationContent}>
                <Text style={styles.locationLabel}>Điểm trả</Text>
                <Text style={styles.locationAddress} numberOfLines={1}>
                  {dropoffAddress}
                </Text>
              </View>
            </View>
          </View>

          {/* Trip Info + Deposit Breakdown */}
          {fareEstimate && (
            <View style={styles.tripInfoSection}>
              <View style={styles.sectionHeader}>
                <MaterialIcons name="payments" size={20} color="#FF6B00" />
                <Text style={styles.sectionTitle}>Thông tin thanh toán</Text>
              </View>

              {hasDeposit ? (
                // === Bảng có cọ ===
                <View style={paymentStyles.depositTable}>
                  <View style={paymentStyles.row}>
                    <Text style={paymentStyles.label}>💰 Tổng tiền chuyến</Text>
                    <Text style={paymentStyles.value}>
                      {totalFare.toLocaleString('vi-VN')}đ
                    </Text>
                  </View>
                  <View style={paymentStyles.row}>
                    <Text style={[paymentStyles.label, { color: '#16A34A' }]}>
                      🔒 Đã đặt cọc (trừ từ ví)
                    </Text>
                    <Text style={[paymentStyles.value, { color: '#16A34A', fontWeight: '700' }]}>
                      -{depositAmount.toLocaleString('vi-VN')}đ
                    </Text>
                  </View>
                  <View style={[paymentStyles.row, paymentStyles.totalRow]}>
                    <Text style={[paymentStyles.label, { color: '#FF6B00', fontWeight: '700', fontSize: 14 }]}>
                      💵 Còn lại khách phải trả
                    </Text>
                    <Text style={[paymentStyles.value, { color: '#FF6B00', fontWeight: '800', fontSize: 16 }]}>
                      {remainingPayment.toLocaleString('vi-VN')}đ
                    </Text>
                  </View>
                </View>
              ) : (
                // === Không có cọc: hiển thị đơn giản ===
                <View style={styles.infoGrid}>
                  <View style={styles.infoCard}>
                    <MaterialIcons name="payments" size={18} color="#FF6B00" />
                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>Giá ước tính</Text>
                      <Text style={styles.infoValue}>
                        {totalFare.toLocaleString('vi-VN')}đ
                      </Text>
                    </View>
                  </View>
                  <View style={styles.infoCard}>
                    <MaterialIcons name="account-balance-wallet" size={18} color="#FF6B00" />
                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>Thanh toán</Text>
                      <Text style={styles.infoValue}>Tiền mặt</Text>
                    </View>
                  </View>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Cancel Button */}
        <TouchableOpacity style={styles.cancelButtonLarge} onPress={onCancel} activeOpacity={0.7}>
          <MaterialIcons name="close" size={20} color="#DC2626" />
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
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingBottom: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.1,
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
    backgroundColor: '#E5E7EB',
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
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  statusSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF6B00',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FF6B00',
  },
  progressSection: {
    gap: 8,
    marginBottom: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#F3F4F6',
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
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
  },
  routeSection: {
    backgroundColor: '#FAFAFA',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
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
    backgroundColor: '#FF6B00',
    borderWidth: 2,
    borderColor: '#fff',
  },
  routeLine: {
    width: 2,
    height: 30,
    backgroundColor: '#E5E7EB',
    marginTop: 4,
  },
  locationContent: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  locationAddress: {
    fontSize: 15,
    color: '#111827',
    lineHeight: 20,
    fontWeight: '500',
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
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  cancelButtonLarge: {
    marginTop: SPACING.lg,
    marginHorizontal: SPACING.lg,
    height: 56,
    borderRadius: 14,
    backgroundColor: '#FEF2F2',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  cancelButtonLargeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#DC2626',
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
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 5,
  },
  logoText: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: '#FF6B00',
  },
})

// ====== PAYMENT BREAKDOWN STYLES (deposit) ======
const paymentStyles = StyleSheet.create({
  depositTable: {
    backgroundColor: '#FFF7ED',
    borderRadius: 14,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: '#FFEDD5',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 13,
    color: '#4B5563',
    fontWeight: '600',
    flex: 1,
  },
  value: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '700',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#FFEDD5',
    paddingTop: 10,
    marginTop: 4,
  },
})
