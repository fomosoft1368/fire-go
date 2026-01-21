import { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
  FlatList,
} from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { COLORS } from '../constants'

interface CustomerRequest {
  _id: string
  customerId: {
    _id: string
    name: string
    phone: string
    rating: number
  }
  rideId: string
  status: 'pending' | 'accepted' | 'rejected'
  pickupAddress: string
  dropoffAddress: string
  pickupCoordinates: [number, number]
  dropoffCoordinates: [number, number]
  fare: number
  notes?: string
  seats: number
  createdAt: string
}

export default function RideRequestsScreen({ navigation, route }: any) {
  const [requests, setRequests] = useState<CustomerRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState<string | null>(null)
  const [rejecting, setRejecting] = useState<string | null>(null)

  const rideId = route?.params?.rideId

  useEffect(() => {
    if (rideId) {
      loadRequests()
    }
  }, [rideId])

  const loadRequests = async () => {
    setLoading(true)
    try {
      const API_URL = 'http://192.168.1.18:3000/api'
      const response = await fetch(`${API_URL}/rides/${rideId}/requests`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) throw new Error(`Failed: ${response.status}`)

      const data = await response.json()
      setRequests(data || [])
    } catch (error: any) {
      console.error('❌ Error loading requests:', error)
      Alert.alert('Lỗi', 'Không thể tải yêu cầu')
    } finally {
      setLoading(false)
    }
  }

  const handleAcceptRequest = async (requestId: string) => {
    setAccepting(requestId)
    try {
      const API_URL = 'http://192.168.1.18:3000/api'
      const response = await fetch(
        `${API_URL}/rides/${rideId}/requests/${requestId}/accept`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
        }
      )

      if (!response.ok) throw new Error(`Failed: ${response.status}`)

      Alert.alert('Thành công', 'Đã chấp nhận yêu cầu')
      loadRequests()
    } catch (error: any) {
      Alert.alert('Lỗi', error.message)
    } finally {
      setAccepting(null)
    }
  }

  const handleRejectRequest = async (requestId: string) => {
    setRejecting(requestId)
    try {
      const API_URL = 'http://192.168.1.18:3000/api'
      const response = await fetch(
        `${API_URL}/rides/${rideId}/requests/${requestId}/reject`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
        }
      )

      if (!response.ok) throw new Error(`Failed: ${response.status}`)

      Alert.alert('Thành công', 'Đã từ chối yêu cầu')
      loadRequests()
    } catch (error: any) {
      Alert.alert('Lỗi', error.message)
    } finally {
      setRejecting(null)
    }
  }

  const handleStartRide = () => {
    navigation.navigate('ActiveRideScreen', { rideId })
  }

  const handleGoBack = () => {
    navigation.goBack()
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    )
  }

  const acceptedCount = requests.filter(r => r.status === 'accepted').length

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Text style={styles.headerText}>Quản lý yêu cầu</Text>
          <Text style={styles.statusText}>● Đang tìm quanh bạn</Text>
        </View>
        <TouchableOpacity style={styles.filterBtn}>
          <MaterialIcons name="tune" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Online Status */}
      <View style={styles.statusBar}>
        <View style={styles.onlineIndicator}>
          <MaterialIcons name="bolt" size={16} color="#4CAF50" />
          <Text style={styles.onlineText}>Trực tuyến</Text>
        </View>
        <View style={styles.toggleSwitch}>
          <View style={styles.toggleOn} />
        </View>
      </View>

      {/* Requests List */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Headline */}
        <View style={styles.headline}>
          <Text style={styles.headlineText}>Yêu cầu mới ({requests.length})</Text>
          <Text style={styles.autoText}>Tự động nhận</Text>
        </View>

        {requests.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="inbox" size={48} color={COLORS.textSecondary} />
            <Text style={styles.emptyText}>Không có yêu cầu nào</Text>
            <TouchableOpacity style={styles.startRideBtn} onPress={handleStartRide}>
              <Text style={styles.startRideBtnText}>Bắt đầu chuyến</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <FlatList
              data={requests.filter(r => r.status === 'pending')}
              keyExtractor={item => item._id}
              scrollEnabled={false}
              renderItem={({ item, index }) => (
                <RequestCard
                  request={item}
                  isPrimary={index === 0}
                  onAccept={() => handleAcceptRequest(item._id)}
                  onReject={() => handleRejectRequest(item._id)}
                  isAccepting={accepting === item._id}
                  isRejecting={rejecting === item._id}
                />
              )}
            />

            {acceptedCount > 0 && (
              <TouchableOpacity
                style={styles.startRideBtn}
                onPress={handleStartRide}
              >
                <MaterialIcons name="play-arrow" size={20} color="#fff" />
                <Text style={styles.startRideBtnText}>
                  Bắt đầu chuyến ({acceptedCount} khách)
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

function RequestCard({
  request,
  isPrimary,
  onAccept,
  onReject,
  isAccepting,
  isRejecting,
}: any) {
  return (
    <View
      style={[
        styles.card,
        isPrimary ? styles.cardPrimary : styles.cardSecondary,
      ]}
    >
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.customerInfo}>
          <View style={styles.avatar}>
            <MaterialIcons name="person" size={24} color={COLORS.primary} />
          </View>
          <View style={styles.customerDetails}>
            <Text style={styles.customerName}>
              {request.customerId?.name || request.customerId?.firstName || 'Khách hàng'}
            </Text>
            <View style={styles.rideTypeRow}>
              <View style={styles.badgeType}>
                <Text style={styles.badgeTypeText}>Ghép xe</Text>
              </View>
              <Text style={styles.paymentType}>• Tiền mặt</Text>
            </View>
          </View>
        </View>
        <View style={styles.priceBox}>
          <Text style={styles.price}>{(request.fare / 1000).toFixed(0)}k</Text>
          <Text style={styles.distance}>
            {Math.round(request.seats)} chỗ
          </Text>
        </View>
      </View>

      {/* Route */}
      <View style={styles.routeSection}>
        <View style={styles.routeLine} />
        <View style={styles.routePoints}>
          <View style={styles.routePoint}>
            <View style={styles.dotPickup} />
            <View style={styles.routeDetails}>
              <Text style={styles.routeLabel}>Điểm đón</Text>
              <Text style={styles.routeAddress}>
                {request.pickupAddress}
              </Text>
            </View>
          </View>
          <View style={styles.routePoint}>
            <View style={styles.dotDropoff} />
            <View style={styles.routeDetails}>
              <Text style={styles.routeLabel}>Điểm đến</Text>
              <Text style={styles.routeAddress}>
                {request.dropoffAddress}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Notes */}
      {request.notes && (
        <View style={styles.notesBox}>
          <MaterialIcons name="note" size={16} color={COLORS.primary} />
          <Text style={styles.notesText}>{request.notes}</Text>
        </View>
      )}

      {/* Buttons */}
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.btn, styles.rejectBtn]}
          onPress={onReject}
          disabled={isRejecting}
        >
          {isRejecting ? (
            <ActivityIndicator size="small" color="#f44336" />
          ) : (
            <>
              <MaterialIcons name="close" size={18} color="#f44336" />
              <Text style={styles.rejectBtnText}>Từ chối</Text>
            </>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btn, styles.acceptBtn]}
          onPress={onAccept}
          disabled={isAccepting}
        >
          {isAccepting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Text style={styles.acceptBtnText}>Chấp nhận ngay</Text>
              <MaterialIcons name="check-circle" size={18} color="#fff" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.darkBg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.darkCard,
    paddingTop: 40,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.darkCard,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    alignItems: 'center',
    marginLeft: 12,
  },
  headerText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  statusText: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  filterBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${COLORS.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: COLORS.darkCard,
    marginHorizontal: 12,
    marginVertical: 12,
  },
  onlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  onlineText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  toggleSwitch: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 2,
  },
  toggleOn: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 12,
  },
  headline: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headlineText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  autoText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
  },
  card: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
  },
  cardPrimary: {
    backgroundColor: COLORS.darkCard,
    borderColor: COLORS.primary,
  },
  cardSecondary: {
    backgroundColor: COLORS.darkCard,
    borderColor: `${COLORS.darkBg}`,
    opacity: 0.8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  customerInfo: {
    flex: 1,
    flexDirection: 'row',
    gap: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${COLORS.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customerDetails: {
    flex: 1,
  },
  customerName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  rideTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  badgeType: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeTypeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  paymentType: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  priceBox: {
    alignItems: 'flex-end',
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  distance: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  routeSection: {
    marginBottom: 12,
    paddingLeft: 8,
  },
  routeLine: {
    position: 'absolute',
    left: 18,
    top: 30,
    bottom: 0,
    width: 2,
    backgroundColor: COLORS.darkBg,
  },
  routePoints: {
    gap: 12,
  },
  routePoint: {
    flexDirection: 'row',
    gap: 10,
  },
  dotPickup: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
    marginTop: 4,
  },
  dotDropoff: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#f44336',
    marginTop: 4,
  },
  routeDetails: {
    flex: 1,
  },
  routeLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  routeAddress: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: '500',
    marginTop: 2,
  },
  notesBox: {
    backgroundColor: COLORS.darkBg,
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  notesText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    flex: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  rejectBtn: {
    backgroundColor: '#f4433620',
    borderWidth: 1,
    borderColor: '#f44336',
  },
  rejectBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#f44336',
  },
  acceptBtn: {
    backgroundColor: COLORS.primary,
    flex: 1.5,
  },
  acceptBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 12,
    marginBottom: 24,
  },
  startRideBtn: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 12,
    marginBottom: 24,
  },
  startRideBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
})
