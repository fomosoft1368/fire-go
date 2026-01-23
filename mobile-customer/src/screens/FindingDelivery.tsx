import React, { useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Animated,
  Easing,
  Alert,
} from 'react-native'
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons'
import { useNavigation, useRoute } from '@react-navigation/native'
import type { RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../types'
import { deliveryService } from '../services/deliveryService'

const ORANGE = '#FF6B00'

type FindingDeliveryRouteProp = RouteProp<RootStackParamList, 'FindingDelivery'>
type FindingDeliveryNavigationProp = NativeStackNavigationProp<RootStackParamList, 'FindingDelivery'>

export default function FindingDelivery() {
  const navigation = useNavigation<FindingDeliveryNavigationProp>()
  const route = useRoute<FindingDeliveryRouteProp>()
  const { deliveryId, pickup, dropoff, vehicle, estimatedPrice, distance } = route.params || {}
  const [isCancelling, setIsCancelling] = useState(false)

  // Animation values
  const scaleAnim1 = useRef(new Animated.Value(1)).current
  const scaleAnim2 = useRef(new Animated.Value(1)).current
  const scaleAnim3 = useRef(new Animated.Value(1)).current
  const rotateAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    // Pulsing animation for circles
    const pulseAnimation = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scaleAnim1, {
            toValue: 1.3,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim1, {
            toValue: 1,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.delay(500),
          Animated.timing(scaleAnim2, {
            toValue: 1.4,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim2, {
            toValue: 1,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.delay(1000),
          Animated.timing(scaleAnim3, {
            toValue: 1.5,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim3, {
            toValue: 1,
            duration: 500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ])
    )

    // Rotation animation
    const rotateAnimation = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    )

    pulseAnimation.start()
    rotateAnimation.start()

    // Poll delivery status every 3 seconds to check if driver is assigned
    const pollInterval = setInterval(async () => {
      try {
        if (!deliveryId) return

        const delivery = await deliveryService.getDelivery(deliveryId)
        console.log('[FindingDelivery] Delivery status:', delivery.status)

        // Check if driver has been assigned
        if (delivery.status === 'driver_assigned' && delivery.driverId) {
          clearInterval(pollInterval)
          
          // Navigate to DeliveryTracking
          navigation.replace('DeliveryTracking', {
            deliveryId: delivery._id,
            driver: {
              id: delivery.driverId,
              name: 'Nguyễn Văn An', // TODO: Get from populated driverId
              phone: '0901234567',
              rating: 4.8,
              totalTrips: 132,
              vehiclePlate: '29C - 123.45',
            }
          })
        }
      } catch (error) {
        console.error('[FindingDelivery] Poll error:', error)
      }
    }, 3000)

    return () => {
      pulseAnimation.stop()
      rotateAnimation.stop()
      clearInterval(pollInterval)
    }
  }, [deliveryId])

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  })

  const handleCancel = async () => {
    if (!deliveryId) {
      navigation.goBack()
      return
    }

    try {
      setIsCancelling(true)
      
      // Cancel delivery via API
      await deliveryService.cancelDelivery(deliveryId, 'Khách hàng hủy')
      
      Alert.alert('Thành công', 'Đã hủy đơn hàng', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ])
    } catch (error: any) {
      console.error('[FindingDelivery] Cancel error:', error)
      Alert.alert('Lỗi', error.message || 'Không thể hủy đơn hàng')
      setIsCancelling(false)
    }
  }

  const getVehicleLabel = () => {
    return vehicle === 'bike' ? 'Xe máy' : 'Xe tải nhỏ'
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel} style={styles.backBtn}>
          <MaterialIcons name="arrow-back-ios" size={20} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tìm tài xế</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Loading Animation */}
      <View style={styles.animationContainer}>
        {/* Outer circles */}
        <Animated.View
          style={[
            styles.pulseCircle,
            styles.pulseCircle3,
            { transform: [{ scale: scaleAnim3 }] },
          ]}
        />
        <Animated.View
          style={[
            styles.pulseCircle,
            styles.pulseCircle2,
            { transform: [{ scale: scaleAnim2 }] },
          ]}
        />
        <Animated.View
          style={[
            styles.pulseCircle,
            styles.pulseCircle1,
            { transform: [{ scale: scaleAnim1 }] },
          ]}
        />

        {/* Center icon with rotation */}
        <Animated.View style={[styles.centerIcon, { transform: [{ rotate }] }]}>
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons name="truck-fast" size={48} color="#fff" />
          </View>
        </Animated.View>

        {/* Dots */}
        <View style={[styles.dot, styles.dot1]} />
        <View style={[styles.dot, styles.dot2]} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.title}>Đang tìm tài xế phù hợp...</Text>
        <Text style={styles.description}>
          Hệ thống đang kết nối với hàng trăm đối tác vận chuyển trong khu vực của bạn.{'\n'}
          Vui lòng chờ trong giây lát.
        </Text>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoIconBox}>
            <MaterialCommunityIcons name="truck-delivery" size={28} color={ORANGE} />
          </View>
          
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>DỊCH VỤ</Text>
            <Text style={styles.infoTitle}>Vận chuyển Hàng hóa</Text>
            <Text style={styles.infoDistance}>• {distance || '5km'}</Text>
          </View>

          <View style={styles.priceBox}>
            <Text style={styles.priceText}>{estimatedPrice?.toLocaleString('vi-VN') || '15.000'}đ</Text>
          </View>
        </View>

        {/* Cancel Button */}
        <TouchableOpacity 
          style={styles.cancelBtn} 
          onPress={handleCancel}
          disabled={isCancelling}
        >
          <Text style={styles.cancelText}>
            {isCancelling ? 'Đang hủy...' : 'Hủy tìm kiếm'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
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

  // Animation
  animationContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 280,
    marginTop: 20,
    position: 'relative',
  },
  pulseCircle: {
    position: 'absolute',
    borderWidth: 1,
    borderRadius: 1000,
    opacity: 0.3,
  },
  pulseCircle1: {
    width: 160,
    height: 160,
    borderColor: ORANGE,
  },
  pulseCircle2: {
    width: 200,
    height: 200,
    borderColor: ORANGE,
  },
  pulseCircle3: {
    width: 240,
    height: 240,
    borderColor: ORANGE,
  },
  centerIcon: {
    zIndex: 10,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: ORANGE,
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  dot: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: ORANGE,
  },
  dot1: {
    bottom: 70,
    left: '30%',
  },
  dot2: {
    top: 50,
    right: '25%',
  },

  // Content
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },

  // Info Card
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    marginBottom: 24,
  },
  infoIconBox: {
    width: 50,
    height: 50,
    borderRadius: 10,
    backgroundColor: '#FFF3EC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
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
  infoTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111',
    marginBottom: 4,
  },
  infoDistance: {
    fontSize: 13,
    color: '#666',
  },
  priceBox: {
    marginLeft: 12,
  },
  priceText: {
    fontSize: 18,
    fontWeight: '700',
    color: ORANGE,
  },

  // Cancel Button
  cancelBtn: {
    backgroundColor: '#FFE8DC',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 'auto',
    marginBottom: 20,
  },
  cancelText: {
    color: ORANGE,
    fontSize: 16,
    fontWeight: '700',
  },
})
