import React, { useEffect, useState } from 'react'
import { Modal, View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'

interface AssignmentRequestModalProps {
  visible: boolean
  request: any | null
  onAccept: () => void
  onReject: () => void
  countdown: number
}

const AssignmentRequestModal: React.FC<AssignmentRequestModalProps> = ({
  visible,
  request,
  onAccept,
  onReject,
  countdown,
}) => {
  const [pulseAnim] = useState(new Animated.Value(1))

  useEffect(() => {
    if (visible) {
      // Pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start()
    }
  }, [visible])

  if (!request || !visible) return null

  // Check if this is a delivery or ride request
  const isDelivery = request.type === 'delivery'
  const data = isDelivery ? (request.deliveryId || {}) : (request.rideId || {})
  
  const pickupAddress = data.pickupAddress || 'Địa điểm đón'
  const dropoffAddress = data.dropoffAddress || (isDelivery ? data.deliveryAddress : 'Địa điểm đến')
  const fare = data.totalFare || data.deliveryFee || 0

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onReject}
    >
      <View style={styles.overlay}>
        <Animated.View style={[styles.modalContainer, { transform: [{ scale: pulseAnim }] }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <MaterialIcons 
                name={isDelivery ? "local-shipping" : "local-taxi"} 
                size={32} 
                color="#FF6B00" 
              />
            </View>
            <Text style={styles.title}>
              {isDelivery ? '📦 Đơn giao hàng mới!' : '🎉 Cuốc xe mới!'}
            </Text>
            <Text style={styles.subtitle}>
              {isDelivery ? 'Bạn nhận được yêu cầu giao hàng' : 'Bạn nhận được yêu cầu đặt xe'}
            </Text>
          </View>

          {/* Request Info */}
          <View style={styles.rideInfo}>
            {/* Pickup */}
            <View style={styles.locationRow}>
              <View style={styles.locationIcon}>
                <MaterialIcons name="trip-origin" size={20} color="#4caf50" />
              </View>
              <View style={styles.locationText}>
                <Text style={styles.locationLabel}>
                  {isDelivery ? 'Địa chỉ lấy hàng' : 'Điểm đón'}
                </Text>
                <Text style={styles.locationAddress} numberOfLines={2}>
                  {pickupAddress}
                </Text>
              </View>
            </View>

            {/* Divider */}
            <View style={styles.routeLine} />

            {/* Dropoff */}
            <View style={styles.locationRow}>
              <View style={styles.locationIcon}>
                <MaterialIcons name="place" size={20} color="#f44336" />
              </View>
              <View style={styles.locationText}>
                <Text style={styles.locationLabel}>
                  {isDelivery ? 'Địa chỉ giao hàng' : 'Điểm đến'}
                </Text>
                <Text style={styles.locationAddress} numberOfLines={2}>
                  {dropoffAddress}
                </Text>
              </View>
            </View>
          </View>

          {/* Fare */}
          <View style={styles.fareContainer}>
            <MaterialIcons name="attach-money" size={24} color="#4caf50" />
            <Text style={styles.fareText}>{fare.toLocaleString('vi-VN')} đ</Text>
          </View>

          {/* Countdown Timer */}
          <View style={styles.timerContainer}>
            <Text style={styles.timerText}>Tự động từ chối sau {countdown}s</Text>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${(countdown / 15) * 100}%` },
                ]}
              />
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.button, styles.rejectButton]}
              onPress={onReject}
              activeOpacity={0.8}
            >
              <MaterialIcons name="close" size={20} color="#fff" />
              <Text style={styles.buttonText}>Từ chối</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.acceptButton]}
              onPress={onAccept}
              activeOpacity={0.8}
            >
              <MaterialIcons name="check" size={20} color="#fff" />
              <Text style={styles.buttonText}>
                {isDelivery ? 'Nhận đơn' : 'Nhận cuốc'}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFE8DC',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  rideInfo: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  locationIcon: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationText: {
    flex: 1,
    marginLeft: 8,
  },
  locationLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  locationAddress: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111',
  },
  routeLine: {
    width: 2,
    height: 20,
    backgroundColor: '#ddd',
    marginLeft: 15,
    marginVertical: 4,
  },
  fareContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e8f5e9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  fareText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#4caf50',
    marginLeft: 8,
  },
  timerContainer: {
    marginBottom: 20,
  },
  timerText: {
    textAlign: 'center',
    fontSize: 13,
    color: '#f44336',
    fontWeight: '600',
    marginBottom: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#ffcdd2',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#f44336',
    borderRadius: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  rejectButton: {
    backgroundColor: '#f44336',
  },
  acceptButton: {
    backgroundColor: '#4caf50',
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
})

export default AssignmentRequestModal
