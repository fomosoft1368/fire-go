import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons'
import { useNavigation, useRoute } from '@react-navigation/native'
import type { RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../types'
import { deliveryService, type Delivery } from '../services/deliveryService'

const ORANGE = '#FF6B00'

type DeliveryCompletedRouteProp = RouteProp<RootStackParamList, 'DeliveryCompleted'>
type DeliveryCompletedNavigationProp = NativeStackNavigationProp<RootStackParamList, 'DeliveryCompleted'>

export default function DeliveryCompleted() {
  const navigation = useNavigation<DeliveryCompletedNavigationProp>()
  const route = useRoute<DeliveryCompletedRouteProp>()
  const { deliveryId } = route.params || {}

  const [rating, setRating] = useState(0)
  const [loading, setLoading] = useState(false)
  const [fetchLoading, setFetchLoading] = useState(true)
  const [delivery, setDelivery] = useState<Delivery | null>(null)

  useEffect(() => {
    if (deliveryId) {
      loadDeliveryData()
    } else {
      setFetchLoading(false)
    }
  }, [deliveryId])

  const loadDeliveryData = async () => {
    try {
      setFetchLoading(true)
      const data = await deliveryService.getDelivery(deliveryId!)
      console.log('[DeliveryCompleted] Loaded delivery:', data)
      setDelivery(data)
    } catch (error: any) {
      console.error('[DeliveryCompleted] Load error:', error)
      Alert.alert('Lỗi', 'Không thể tải thông tin đơn hàng')
    } finally {
      setFetchLoading(false)
    }
  }

  // Extract driver info from delivery data
  const getDriverInfo = () => {
    if (!delivery?.driverId) {
      return {
        name: 'Tài xế',
        vehicle: 'Xe tải',
        plate: 'N/A',
        rating: 5.0,
        avatar: undefined,
      }
    }

    const driver = delivery.driverId
    const firstName = typeof driver === 'string' ? '' : (driver.firstName || '')
    const lastName = typeof driver === 'string' ? '' : (driver.lastName || '')
    const name = `${firstName} ${lastName}`.trim() || 'Tài xế'
    const vehicle = typeof driver === 'string' ? 'Xe tải' : (driver.vehicleType || 'Xe tải')
    const plate = typeof driver === 'string' ? 'N/A' : (driver.vehiclePlate || 'N/A')
    const rating = typeof driver === 'string' ? 5.0 : (driver.averageRating || 5.0)
    const avatar = typeof driver === 'string' ? undefined : driver.avatar

    return { name, vehicle, plate, rating, avatar }
  }

  const driverInfo = getDriverInfo()
  const totalAmount = delivery?.estimatedPrice || 0
  const distance = delivery?.distance ? (delivery.distance / 1000).toFixed(1) : '0'
  const duration = delivery?.estimatedDuration ? Math.round(delivery.estimatedDuration / 60) : 0

  const handleComplete = async () => {
    if (rating === 0) {
      Alert.alert('Đánh giá', 'Vui lòng đánh giá dịch vụ của chúng tôi')
      return
    }
    
    try {
      setLoading(true)

      if (deliveryId) {
        // Submit rating to API
        await deliveryService.rateDelivery(deliveryId, {
          rating,
          comment: '',
        })
        console.log('[DeliveryCompleted] Rating submitted:', rating)
      }
      
      // Navigate back to home
      navigation.navigate('Main')
    } catch (error: any) {
      console.error('[DeliveryCompleted] Rating error:', error)
      Alert.alert('Lỗi', error.message || 'Không thể gửi đánh giá. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  const renderStars = () => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => setRating(star)}
            style={styles.starBtn}
          >
            <MaterialIcons
              name={star <= rating ? 'star' : 'star-border'}
              size={44}
              color={star <= rating ? ORANGE : '#DDD'}
            />
          </TouchableOpacity>
        ))}
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('Main')} style={styles.backBtn}>
          <MaterialIcons name="arrow-back-ios" size={20} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Hoàn tất đơn hàng</Text>
        <View style={{ width: 40 }} />
      </View>

      {fetchLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={ORANGE} />
          <Text style={styles.loadingText}>Đang tải thông tin...</Text>
        </View>
      ) : (
        <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Success Icon */}
        <View style={styles.successIcon}>
          <View style={styles.checkCircle}>
            <MaterialIcons name="check" size={40} color="#fff" />
          </View>
        </View>

        {/* Success Message */}
        <Text style={styles.title}>Giao hàng thành công!</Text>
        <Text style={styles.subtitle}>Cảm ơn bạn đã sử dụng dịch vụ FireGo</Text>

        {/* Total Amount */}
        <View style={styles.totalSection}>
          <Text style={styles.totalLabel}>Tổng cộng</Text>
          <Text style={styles.totalAmount}>
            {totalAmount.toLocaleString('vi-VN')}đ
          </Text>
        </View>

        {/* Trip Info */}
        <View style={styles.tripInfo}>
          <View style={styles.infoItem}>
            <MaterialCommunityIcons name="map-marker-distance" size={18} color={ORANGE} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>KHOẢNG CÁCH</Text>
              <Text style={styles.infoValue}>{distance} km</Text>
            </View>
          </View>

          <View style={styles.infoDivider} />

          <View style={styles.infoItem}>
            <MaterialIcons name="access-time" size={18} color={ORANGE} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>THỜI GIAN</Text>
              <Text style={styles.infoValue}>{duration} phút</Text>
            </View>
          </View>
        </View>

        {/* Driver Rating Section */}
        <View style={styles.driverSection}>
          <Text style={styles.sectionTitle}>Đánh giá tài xế</Text>
          
          <View style={styles.driverCard}>
            <View style={styles.driverAvatar}>
              {driverInfo.avatar ? (
                <Image source={{ uri: driverInfo.avatar }} style={styles.avatarImage} />
              ) : (
                <MaterialIcons name="person" size={28} color="#999" />
              )}
            </View>

            <View style={styles.driverInfo}>
              <Text style={styles.driverName}>{driverInfo.name}</Text>
              <Text style={styles.driverVehicle}>
                {driverInfo.vehicle} • {driverInfo.plate}
              </Text>
            </View>

            <View style={styles.driverRating}>
              <MaterialIcons name="star" size={16} color="#FFB800" />
              <Text style={styles.driverRatingText}>{driverInfo.rating}</Text>
            </View>
          </View>
        </View>

        {/* Rating Prompt */}
        <Text style={styles.ratingPrompt}>
          Dịch vụ vận chuyển hôm nay thế nào?
        </Text>

        {/* Star Rating */}
        {renderStars()}

        {/* Complete Button */}
        <TouchableOpacity 
          style={styles.completeBtn}
          onPress={handleComplete}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.completeBtnText}>Hoàn tất</Text>
              <MaterialIcons name="check" size={20} color="#fff" />
            </>
          )}
        </TouchableOpacity>

        {/* Bottom Tabs */}
        <View style={styles.bottomTabs}>
          <TouchableOpacity style={styles.tab}>
            <Text style={styles.tabText}>Tôi xé nhất tôn</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tab}>
            <Text style={styles.tabText}>Giao hàng nhanh</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tab}>
            <Text style={styles.tabText}>Cẩn thận</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111',
    flex: 1,
    textAlign: 'center',
  },

  // Content
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 40,
    alignItems: 'center',
  },

  // Success Icon
  successIcon: {
    marginBottom: 24,
  },
  checkCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: ORANGE,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },

  // Success Message
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 32,
  },

  // Total Section
  totalSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  totalLabel: {
    fontSize: 13,
    color: '#888',
    marginBottom: 8,
  },
  totalAmount: {
    fontSize: 36,
    fontWeight: '700',
    color: ORANGE,
    letterSpacing: -1,
  },

  // Trip Info
  tripInfo: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  infoItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#888',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
  },
  infoDivider: {
    width: 1,
    height: '100%',
    backgroundColor: '#E5E5E5',
    marginHorizontal: 16,
  },

  // Driver Section
  driverSection: {
    width: '100%',
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
    marginBottom: 12,
  },
  driverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  driverAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111',
    marginBottom: 4,
  },
  driverVehicle: {
    fontSize: 13,
    color: '#666',
  },
  driverRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  driverRatingText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111',
  },

  // Rating
  ratingPrompt: {
    fontSize: 15,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 32,
  },
  starBtn: {
    padding: 4,
  },

  // Complete Button
  completeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ORANGE,
    paddingVertical: 16,
    borderRadius: 30,
    width: '100%',
    gap: 8,
    marginBottom: 24,
    shadowColor: ORANGE,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  completeBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },

  // Bottom Tabs
  bottomTabs: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 12,
    color: '#999',
  },
})
