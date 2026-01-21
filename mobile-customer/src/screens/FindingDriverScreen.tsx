import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { SPACING, BORDER_RADIUS } from '../constants'
import MapViewComponent from '../components/MapView'

interface FindingDriverScreenProps {
  routeInfo: any
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
          style={[styles.backButton, { backgroundColor: colors.bgSecondary }]}
          onPress={onCancel}
        >
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.logoText}>firego</Text>
      </View>
      <View
        style={[
          styles.professionalStatusCard,
          { backgroundColor: colors.bgSecondary, borderTopColor: colors.border },
        ]}
      >
        {/* Status Content */}
        <View style={styles.statusContentWrapper}>
          {/* Header */}
          <View style={styles.statusHeader}>
            <View>
              <Text style={[styles.statusTitleLarge, { color: colors.text }]}>
                Tìm tài xế cho bạn
              </Text>
              <Text style={[styles.statusSubtitle, { color: colors.textSecondary }]}>
                Đang tìm kiếm trong vùng…
              </Text>
            </View>
            <TouchableOpacity style={styles.minimizeButton} onPress={onCancel}>
              <MaterialIcons name="close" size={18} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Info Grid */}
          <View style={styles.infoGrid}>
            <View style={[styles.infoCard, { backgroundColor: colors.bg }]}>
              <View style={styles.infoIcon}>
                <MaterialIcons name="schedule" size={20} color="#FF6B00" />
              </View>
              <View style={styles.infoText}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                  Thời gian chờ
                </Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>~2 phút</Text>
              </View>
            </View>

            <View style={[styles.infoCard, { backgroundColor: colors.bg }]}>
              <View style={styles.infoIcon}>
                <MaterialIcons name="directions" size={20} color="#4caf50" />
              </View>
              <View style={styles.infoText}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                  Bán kính tìm
                </Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>2 km</Text>
              </View>
            </View>

            <View style={[styles.infoCard, { backgroundColor: colors.bg }]}>
              <View style={styles.infoIcon}>
                <MaterialIcons name="person" size={20} color="#8b5cf6" />
              </View>
              <View style={styles.infoText}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                  Tài xế sẵn có
                </Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>12+</Text>
              </View>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressSection}>
            <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
              <View style={[styles.progressFill, { backgroundColor: '#FF6B00' }]} />
            </View>
          </View>
        </View>

        {/* Cancel Button */}
        <TouchableOpacity
          style={[styles.cancelButtonLarge, { borderColor: colors.border }]}
          onPress={onCancel}
        >
          <MaterialIcons name="close" size={20} color="#ef4444" />
          <Text style={styles.cancelButtonLargeText}>Hủy chuyến</Text>
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
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  statusContentWrapper: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.lg,
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
    fontSize: 13,
    fontWeight: '500',
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
})
