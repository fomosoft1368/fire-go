import React, { useEffect, useState } from 'react'
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Dimensions,
} from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { SPACING, BORDER_RADIUS } from '../constants'

interface FindingRideModalProps {
  visible: boolean
  pickupLocation: string
  dropoffLocation: string
  price: string
  duration: string
  onCancel: () => void
}

const { height } = Dimensions.get('window')

export default function FindingRideModal({
  visible,
  pickupLocation,
  dropoffLocation,
  price,
  duration,
  onCancel,
}: FindingRideModalProps) {
  const [dotCount, setDotCount] = useState(1)

  // Animate dots for "Finding..." text
  useEffect(() => {
    if (!visible) return

    const interval = setInterval(() => {
      setDotCount((prev) => (prev >= 3 ? 1 : prev + 1))
    }, 500)

    return () => clearInterval(interval)
  }, [visible])

  const dots = '.'.repeat(dotCount)

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <SafeAreaView style={styles.container}>
        {/* Semi-transparent background */}
        <View style={styles.backdrop} />

        {/* Modal Content */}
        <View style={styles.modalContent}>
          {/* Close Button */}
          <TouchableOpacity style={styles.closeButton} onPress={onCancel}>
            <MaterialIcons name="close" size={24} color="#fff" />
          </TouchableOpacity>

          {/* Animated Loading Spinner */}
          <View style={styles.loaderSection}>
            <ActivityIndicator size={60} color="#FF6B00" />
            <Text style={styles.findingText}>
              Đang tìm chuyến xe{dots}
            </Text>
          </View>

          {/* Ride Summary */}
          <View style={styles.summarySection}>
            <Text style={styles.summaryTitle}>Chi tiết chuyến xe</Text>

            {/* Pickup Location */}
            <View style={styles.summaryItem}>
              <View style={styles.iconWrapper}>
                <MaterialIcons name="radio-button-checked" size={24} color="#FF6B00" />
              </View>
              <View style={styles.textWrapper}>
                <Text style={styles.summaryLabel}>Điểm đón</Text>
                <Text style={styles.summaryValue} numberOfLines={1}>
                  {pickupLocation}
                </Text>
              </View>
            </View>

            {/* Divider Line */}
            <View style={styles.dividerLine} />

            {/* Dropoff Location */}
            <View style={styles.summaryItem}>
              <View style={styles.iconWrapper}>
                <MaterialIcons name="location-on" size={24} color="#ef4444" />
              </View>
              <View style={styles.textWrapper}>
                <Text style={styles.summaryLabel}>Điểm đến</Text>
                <Text style={styles.summaryValue} numberOfLines={1}>
                  {dropoffLocation}
                </Text>
              </View>
            </View>

            {/* Price and Duration */}
            <View style={styles.priceAndDuration}>
              <View style={styles.priceBox}>
                <Text style={styles.priceLabel}>Giá dự tính</Text>
                <Text style={styles.priceValue}>{price}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.durationBox}>
                <Text style={styles.durationLabel}>Thời gian</Text>
                <Text style={styles.durationValue}>{duration}</Text>
              </View>
            </View>
          </View>

          {/* Cancel Button */}
          <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
            <Text style={styles.cancelButtonText}>Hủy tìm kiếm</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  modalContent: {
    backgroundColor: '#1a202c',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: SPACING.xl,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
    maxHeight: height * 0.8,
  },
  closeButton: {
    position: 'absolute',
    top: SPACING.lg,
    right: SPACING.lg,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loaderSection: {
    alignItems: 'center',
    marginTop: SPACING.xl,
    marginBottom: SPACING.xl,
  },
  findingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginTop: SPACING.lg,
    minHeight: 24,
  },
  summarySection: {
    backgroundColor: '#0f172a',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#94a3b8',
    marginBottom: SPACING.lg,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 107, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textWrapper: {
    flex: 1,
    justifyContent: 'center',
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: SPACING.xs,
    textTransform: 'uppercase',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  dividerLine: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginVertical: SPACING.lg,
    marginLeft: 40,
  },
  priceAndDuration: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginTop: SPACING.lg,
  },
  priceBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  priceLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: SPACING.xs,
    textTransform: 'uppercase',
  },
  priceValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FF6B00',
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  durationBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  durationLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: SPACING.xs,
    textTransform: 'uppercase',
  },
  durationValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  cancelButton: {
    height: 56,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FF6B00',
    letterSpacing: 0.5,
  },
})
