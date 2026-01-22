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
      <View
        style={[
          styles.professionalStatusCard,
          { backgroundColor: colors.bgSecondary, borderTopColor: colors.border },
        ]}
      >
        {/* Handle Bar */}
        <View style={styles.handleBar} />

        {/* Status Content */}
        <View style={styles.statusContentWrapper}>
          {/* Header */}
          <View style={styles.statusHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.statusTitleLarge, { color: colors.text }]}>
                Đang tìm tài xế cho bạn...
              </Text>
              <Text style={[styles.statusSubtitle, { color: colors.textSecondary }]}>
                Vui lòng đợi trong giây lát
              </Text>
            </View>
            <TouchableOpacity style={styles.minimizeButton} onPress={onCancel}>
              <MaterialIcons name="edit" size={18} color={colors.text} />
            </TouchableOpacity>
          </View>
          {/* Progress Bar */}
          <View style={styles.progressSection}>
            <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
              <View style={[styles.progressFill, { backgroundColor: '#FF6B00' }]} />
            </View>
          </View>

          {/* Trip Locations */}
          <View style={styles.tripInfo}>
            <View style={styles.locationRow}>
              <View style={styles.locationDot}>
                <View style={styles.pickupDot} />
              </View>
              <Text
                style={[styles.locationText, { color: colors.text }]}
                numberOfLines={1}
              >
                {pickupAddress}
              </Text>
            </View>

            <View style={styles.locationRow}>
              <View style={styles.locationDot}>
                <View style={styles.dropoffDot} />
              </View>
              <Text
                style={[styles.locationText, { color: colors.text }]}
                numberOfLines={1}
              >
                {dropoffAddress}
              </Text>
            </View>
          </View>

          {/* Price */}
          {fareEstimate && (
            <View style={[styles.priceContainer, { backgroundColor: 'rgba(255, 107, 0, 0.08)', borderColor: 'rgba(255, 107, 0, 0.2)' }]}>
              <MaterialIcons name="payments" size={20} color="#FF6B00" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.priceLabel, { color: colors.textSecondary }]}>
                  Giá ước tính
                </Text>
                <Text style={[styles.price, { color: colors.text }]}>
                  {fareEstimate.total?.toLocaleString('vi-VN')}đ
                </Text>
              </View>
              <View style={[styles.paymentBadge, { backgroundColor: colors.bg }]}>
                <Text style={[styles.paymentBadgeText, { color: colors.textSecondary }]}>
                  Tiền mặt
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Cancel Button */}
        <TouchableOpacity
          style={[styles.cancelButtonLarge, { borderColor: colors.border }]}
          onPress={onCancel}
        >
          <Text style={styles.cancelButtonLargeText}>Hủy</Text>
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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  handleBar: {
    width: 50,
    height: 5,
    backgroundColor: '#ccc',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: SPACING.md,
  },
  statusContentWrapper: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.md,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  statusTitleLarge: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: SPACING.xs,
  },
  statusSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: SPACING.xs,
  },
  minimizeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 107, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoGrid: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  infoCard: {
    flex: 1,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 0, 0.1)',
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 107, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoText: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: SPACING.xs,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  progressSection: {
    gap: SPACING.sm,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    width: '60%',
    borderRadius: 3,
  },
  cancelButtonLarge: {
    marginTop: SPACING.lg,
    marginHorizontal: SPACING.lg,
    height: 56,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 2,
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  cancelButtonLargeText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ef4444',
  },
  header: {
    position: 'absolute',
    top: 50,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
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
  tripInfo: {
    gap: SPACING.sm,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  locationDot: {
    width: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickupDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ef4444',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  dropoffDot: {
    width: 12,
    height: 12,
    borderRadius: 2,
    backgroundColor: '#10b981',
  },
  locationText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
  },
  price: {
    fontSize: 20,
    fontWeight: '700',
  },
  priceLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 2,
  },
  paymentBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.md,
  },
  paymentBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
})
