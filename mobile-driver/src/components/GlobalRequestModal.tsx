import React, { useEffect, useState, useRef } from 'react'
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { COLORS } from '../constants'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useNavigation, NavigationProp } from '@react-navigation/native'
import axios from 'axios'

const API_URL = 'http://192.168.1.18:3000/api'

interface PendingNotification {
  request: any
  combinedTripId: string
  timestamp: number
}

const GlobalRequestModal: React.FC = () => {
  const [showModal, setShowModal] = useState(false)
  const [pendingRequest, setPendingRequest] = useState<any>(null)
  const [combinedTripId, setCombinedTripId] = useState<string>('')
  const [accepting, setAccepting] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [countdown, setCountdown] = useState(15) // 15 seconds countdown
  const navigation = useNavigation<NavigationProp<any>>()
  
  // Track displayed requests to avoid duplicates (persisted in AsyncStorage)
  const displayedRequestsRef = useRef<Set<string>>(new Set())
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Load displayed requests from AsyncStorage on mount
  useEffect(() => {
    const loadDisplayedRequests = async () => {
      try {
        const stored = await AsyncStorage.getItem('displayedRequests')
        if (stored) {
          const requestIds = JSON.parse(stored)
          displayedRequestsRef.current = new Set(requestIds)
          console.log('[GlobalRequestModal] Loaded displayed requests:', requestIds.length)
        }
      } catch (error) {
        console.error('[GlobalRequestModal] Error loading displayed requests:', error)
      }
    }
    loadDisplayedRequests()
  }, [])

  useEffect(() => {
    const checkForNotification = async () => {
      try {
        const stored = await AsyncStorage.getItem('pendingRequestNotification')
        if (stored) {
          const notification: PendingNotification = JSON.parse(stored)
          const requestId = notification.request._id

          // Only show if not already displayed
          if (!displayedRequestsRef.current.has(requestId)) {
            console.log('[GlobalRequestModal] 📬 New request:', requestId)
            displayedRequestsRef.current.add(requestId)
            
            // Persist to AsyncStorage
            const displayedArray = Array.from(displayedRequestsRef.current)
            await AsyncStorage.setItem('displayedRequests', JSON.stringify(displayedArray))
            
            setPendingRequest(notification.request)
            setCombinedTripId(notification.combinedTripId)
            setShowModal(true)
            setCountdown(15) // Reset countdown

            // Clear notification from storage immediately after showing
            await AsyncStorage.removeItem('pendingRequestNotification')

            // Start countdown
            if (countdownIntervalRef.current) {
              clearInterval(countdownIntervalRef.current)
            }

            countdownIntervalRef.current = setInterval(() => {
              setCountdown(prev => {
                if (prev <= 1) {
                  // Auto-reject when countdown reaches 0
                  handleAutoReject()
                  return 0
                }
                return prev - 1
              })
            }, 1000)
          } else {
            console.log('[GlobalRequestModal] ⏭️ Skipping already displayed request:', requestId)
            // Clear stale notification
            await AsyncStorage.removeItem('pendingRequestNotification')
          }
        }
      } catch (error) {
        console.error('[GlobalRequestModal] Error:', error)
      }
    }

    // Check every 2 seconds
    const interval = setInterval(checkForNotification, 2000)
    checkForNotification() // Initial check

    return () => {
      clearInterval(interval)
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current)
      }
    }
  }, [])

  const handleAccept = async () => {
    if (!pendingRequest || !combinedTripId) return

    // Clear countdown
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current)
    }

    setAccepting(true)
    try {
      console.log('[GlobalRequestModal] Accepting request:', pendingRequest._id)

      await axios.patch(
        `${API_URL}/combined-trips/${combinedTripId}/requests/${pendingRequest._id}/accept`
      )

      Alert.alert('Thành công', 'Đã chấp nhận yêu cầu!', [
        {
          text: 'Xem danh sách',
          onPress: () => {
            setShowModal(false)
            // Navigate to RideRequests screen
            navigation.navigate('ActiveRideScreen', {
              combinedTripId,
              sourceType: 'combined_trip',
            })
          },
        },
      ])
    } catch (error: any) {
      console.error('[GlobalRequestModal] Accept error:', error)
      Alert.alert('Lỗi', 'Không thể chấp nhận yêu cầu')
    } finally {
      setAccepting(false)
    }
  }

  const handleReject = async () => {
    if (!pendingRequest || !combinedTripId) return

    // Clear countdown
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current)
    }

    setRejecting(true)
    try {
      console.log('[GlobalRequestModal] Rejecting request:', pendingRequest._id)

      // Reject request (backend will set status to 'refuse')
      await axios.patch(
        `${API_URL}/combined-trips/${combinedTripId}/requests/${pendingRequest._id}/reject`
      )

      Alert.alert('Đã từ chối', 'Yêu cầu đã được từ chối')
      setShowModal(false)
    } catch (error: any) {
      console.error('[GlobalRequestModal] Reject error:', error)
      Alert.alert('Lỗi', 'Không thể từ chối yêu cầu')
    } finally {
      setRejecting(false)
    }
  }

  const handleAutoReject = async () => {
    console.log('[GlobalRequestModal] ⏰ Auto-rejecting due to timeout')
    
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current)
    }

    if (!pendingRequest || !combinedTripId) {
      setShowModal(false)
      return
    }

    try {
      await axios.patch(
        `${API_URL}/combined-trips/${combinedTripId}/requests/${pendingRequest._id}/reject`
      )
      console.log('[GlobalRequestModal] Auto-rejected successfully')
    } catch (error) {
      console.error('[GlobalRequestModal] Auto-reject error:', error)
    } finally {
      setShowModal(false)
    }
  }

  const handleDismiss = () => {
    setShowModal(false)
  }

  if (!showModal || !pendingRequest) return null

  return (
    <Modal
      visible={showModal}
      transparent={true}
      animationType="slide"
      onRequestClose={handleDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          {/* Countdown Timer */}
          <View style={[styles.countdownContainer, countdown <= 5 && styles.countdownUrgent]}>
            <Text style={[styles.countdownText, countdown <= 5 && styles.countdownTextUrgent]}>
              {countdown}s
            </Text>
          </View>

          <View style={styles.header}>
            <MaterialIcons 
              name={pendingRequest.createdBy === 'customer' ? 'local-taxi' : 'person-add'} 
              size={32} 
              color={COLORS.primary} 
            />
            <Text style={styles.title}>
              {pendingRequest.createdBy === 'customer' ? 'Nhận cuốc mới!' : 'Yêu cầu ghép xe mới!'}
            </Text>
          </View>

          <View style={styles.customerInfo}>
            <Text style={styles.customerName}>
              {pendingRequest.customerId?.name || 'Khách hàng'}
            </Text>
            <Text style={styles.customerPhone}>
              📱 {pendingRequest.customerId?.phone || 'N/A'}
            </Text>
            <Text style={styles.rating}>
              ⭐ {pendingRequest.customerId?.rating?.toFixed(1) || '5.0'}
            </Text>
          </View>

          <View style={styles.tripInfo}>
            <View style={styles.infoRow}>
              <MaterialIcons name="place" size={20} color="#4CAF50" />
              <Text style={styles.infoText} numberOfLines={2}>
                {pendingRequest.pickupAddress}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <MaterialIcons name="flag" size={20} color="#f44336" />
              <Text style={styles.infoText} numberOfLines={2}>
                {pendingRequest.dropoffAddress}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <MaterialIcons name="attach-money" size={20} color={COLORS.primary} />
              <Text style={styles.fareText}>
                {pendingRequest.fare?.toLocaleString('vi-VN')} đ
              </Text>
            </View>
            <View style={styles.infoRow}>
              <MaterialIcons name="event-seat" size={20} color={COLORS.textSecondary} />
              <Text style={styles.infoText}>
                {pendingRequest.seats} ghế
              </Text>
            </View>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.rejectButton]}
              onPress={handleReject}
              disabled={accepting || rejecting}
            >
              {rejecting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <MaterialIcons name="close" size={20} color="#FFF" />
                  <Text style={styles.buttonText}>Từ chối</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.acceptButton]}
              onPress={handleAccept}
              disabled={accepting || rejecting}
            >
              {accepting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <MaterialIcons name="check" size={20} color="#FFF" />
                  <Text style={styles.buttonText}>Chấp nhận</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.dismissButton} onPress={handleDismiss}>
            <Text style={styles.dismissText}>Xem sau</Text>
          </TouchableOpacity>
        </View>
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
  modalContent: {
    backgroundColor: '#1a2634',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: COLORS.primary,
    position: 'relative',
  },
  countdownContainer: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFF',
    zIndex: 10,
  },
  countdownUrgent: {
    backgroundColor: '#f44336',
  },
  countdownText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
  },
  countdownTextUrgent: {
    fontSize: 22,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    marginTop: 8,
  },
  customerInfo: {
    backgroundColor: '#0f1921',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  customerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 4,
  },
  customerPhone: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  rating: {
    fontSize: 16,
    color: COLORS.warning,
    fontWeight: '600',
  },
  tripInfo: {
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingLeft: 8,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginLeft: 12,
    flex: 1,
  },
  fareText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginLeft: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 8,
    gap: 8,
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
  },
  rejectButton: {
    backgroundColor: '#f44336',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  dismissButton: {
    alignItems: 'center',
    padding: 12,
  },
  dismissText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
})

export default GlobalRequestModal
