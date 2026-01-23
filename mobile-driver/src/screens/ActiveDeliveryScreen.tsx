import React, { useState, useEffect, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
} from 'react-native'
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons'
import MapView, { Marker, Polyline } from 'react-native-maps'
import * as Location from 'expo-location'
import { COLORS } from '../constants'
import { deliveryService, type Delivery } from '../services/deliveryService'

export default function ActiveDeliveryScreen({ navigation, route }: any) {
  const { deliveryId } = route.params || {}
  
  const [delivery, setDelivery] = useState<Delivery | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [currentLocation, setCurrentLocation] = useState<[number, number] | null>(null)
  const [currentStatus, setCurrentStatus] = useState<'picking_up' | 'delivering' | 'delivered'>('picking_up')

  const mapRef = useRef<any>(null)

  useEffect(() => {
    loadDelivery()
    startLocationTracking()

    // Poll delivery status every 5 seconds
    const interval = setInterval(loadDelivery, 5000)
    return () => clearInterval(interval)
  }, [deliveryId])

  const loadDelivery = async () => {
    try {
      if (!deliveryId) return

      const data = await deliveryService.getDelivery(deliveryId)
      setDelivery(data)

      // Update current status based on delivery status
      if (data.status === 'picking_up') {
        setCurrentStatus('picking_up')
      } else if (data.status === 'delivering') {
        setCurrentStatus('delivering')
      } else if (data.status === 'delivered') {
        setCurrentStatus('delivered')
      }
    } catch (error: any) {
      console.error('[ActiveDelivery] Load error:', error)
      Alert.alert('Lỗi', error.message || 'Không thể tải thông tin đơn hàng')
    } finally {
      setLoading(false)
    }
  }

  const startLocationTracking = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Lỗi', 'Cần quyền truy cập vị trí')
        return
      }

      // Watch position
      const locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,
          distanceInterval: 10,
        },
        (location) => {
          const { latitude, longitude } = location.coords
          setCurrentLocation([longitude, latitude])

          // Update map camera
          if (mapRef.current) {
            mapRef.current.animateToRegion({
              latitude,
              longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            })
          }
        }
      )

      return () => {
        locationSubscription.remove()
      }
    } catch (error) {
      console.error('[ActiveDelivery] Location error:', error)
    }
  }

  const handleStartPickup = async () => {
    if (!delivery) return

    try {
      setUpdating(true)
      await deliveryService.startPickup(delivery._id)
      setCurrentStatus('picking_up')
      Alert.alert('Thành công', 'Đã bắt đầu lấy hàng')
      loadDelivery()
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể cập nhật trạng thái')
    } finally {
      setUpdating(false)
    }
  }

  const handlePickupComplete = async () => {
    if (!delivery) return

    try {
      setUpdating(true)
      await deliveryService.startDelivery(delivery._id)
      setCurrentStatus('delivering')
      Alert.alert('Thành công', 'Đã lấy hàng xong, bắt đầu vận chuyển')
      loadDelivery()
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể cập nhật trạng thái')
    } finally {
      setUpdating(false)
    }
  }

  const handleComplete = async () => {
    if (!delivery) return

    Alert.alert(
      'Hoàn thành giao hàng',
      'Xác nhận đã giao hàng thành công?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xác nhận',
          onPress: async () => {
            try {
              setUpdating(true)
              await deliveryService.completeDelivery(delivery._id, delivery.estimatedPrice)
              Alert.alert('Thành công', 'Đã hoàn thành giao hàng', [
                {
                  text: 'OK',
                  onPress: () => navigation.navigate('Home'),
                },
              ])
            } catch (error: any) {
              Alert.alert('Lỗi', error.message || 'Không thể hoàn thành giao hàng')
            } finally {
              setUpdating(false)
            }
          },
        },
      ]
    )
  }

  const handleCall = () => {
    if (delivery?.customerId?.phone) {
      Linking.openURL(`tel:${delivery.customerId.phone}`)
    }
  }

  const handleNavigate = (address: string, coords: [number, number]) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${coords[1]},${coords[0]}`
    Linking.openURL(url)
  }

  const getGoodsTypeLabel = (type: string) => {
    const types: any = {
      light: 'Hàng nhẹ',
      bulky: 'Cồng kềnh',
      food: 'Thực phẩm',
    }
    return types[type] || type
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Đang tải...</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (!delivery) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={64} color="#ccc" />
          <Text style={styles.errorText}>Không tìm thấy đơn hàng</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backButtonText}>Quay lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  const customerName = delivery.customerId?.name || 
                      `${delivery.customerId?.firstName || ''} ${delivery.customerId?.lastName || ''}`.trim() ||
                      'Khách hàng'

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color="#111" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Đơn #{delivery._id.slice(-8)}</Text>
          <Text style={styles.headerStatus}>{delivery.status.toUpperCase()}</Text>
        </View>
        <TouchableOpacity onPress={handleCall} style={styles.callBtn}>
          <MaterialIcons name="phone" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Map */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={{
            latitude: delivery.pickupCoordinates[1],
            longitude: delivery.pickupCoordinates[0],
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          }}
        >
          {/* Current location */}
          {currentLocation && (
            <Marker
              coordinate={{
                latitude: currentLocation[1],
                longitude: currentLocation[0],
              }}
              title="Vị trí của bạn"
            >
              <View style={styles.currentLocationMarker}>
                <MaterialCommunityIcons name="truck-fast" size={24} color="#fff" />
              </View>
            </Marker>
          )}

          {/* Pickup marker */}
          <Marker
            coordinate={{
              latitude: delivery.pickupCoordinates[1],
              longitude: delivery.pickupCoordinates[0],
            }}
            title="Điểm lấy hàng"
            pinColor={COLORS.primary}
          />

          {/* Dropoff marker */}
          <Marker
            coordinate={{
              latitude: delivery.dropoffCoordinates[1],
              longitude: delivery.dropoffCoordinates[0],
            }}
            title="Điểm giao hàng"
            pinColor="#E74C3C"
          />
        </MapView>
      </View>

      {/* Bottom Sheet */}
      <ScrollView style={styles.bottomSheet} contentContainerStyle={styles.bottomSheetContent}>
        {/* Progress Timeline */}
        <View style={styles.timeline}>
          <View style={styles.timelineStep}>
            <View style={[
              styles.stepDot,
              currentStatus !== 'picking_up' && styles.stepDotCompleted,
            ]} />
            <Text style={styles.stepLabel}>Lấy hàng</Text>
          </View>
          <View style={[
            styles.stepLine,
            currentStatus !== 'picking_up' && styles.stepLineCompleted,
          ]} />
          <View style={styles.timelineStep}>
            <View style={[
              styles.stepDot,
              currentStatus === 'delivered' && styles.stepDotCompleted,
            ]} />
            <Text style={styles.stepLabel}>Giao hàng</Text>
          </View>
        </View>

        {/* Customer Info */}
        <View style={styles.customerCard}>
          <View style={styles.customerHeader}>
            <View style={styles.customerAvatar}>
              <MaterialIcons name="person" size={28} color={COLORS.primary} />
            </View>
            <View style={styles.customerInfo}>
              <Text style={styles.customerName}>{customerName}</Text>
              <Text style={styles.customerPhone}>{delivery.customerId?.phone}</Text>
            </View>
          </View>
        </View>

        {/* Goods Info */}
        <View style={styles.goodsCard}>
          <Text style={styles.sectionTitle}>Thông tin hàng hóa</Text>
          <View style={styles.goodsRow}>
            <View style={styles.goodsItem}>
              <Text style={styles.goodsLabel}>Loại hàng</Text>
              <Text style={styles.goodsValue}>{getGoodsTypeLabel(delivery.goodsType)}</Text>
            </View>
            <View style={styles.goodsItem}>
              <Text style={styles.goodsLabel}>Trọng lượng</Text>
              <Text style={styles.goodsValue}>{delivery.weight} kg</Text>
            </View>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Phí vận chuyển</Text>
            <Text style={styles.priceValue}>{delivery.estimatedPrice.toLocaleString('vi-VN')}đ</Text>
          </View>
        </View>

        {/* Pickup Address */}
        <View style={styles.addressCard}>
          <View style={styles.addressHeader}>
            <MaterialIcons name="trip-origin" size={20} color={COLORS.primary} />
            <Text style={styles.addressTitle}>Điểm lấy hàng</Text>
          </View>
          <Text style={styles.addressText}>{delivery.pickupAddress}</Text>
          <TouchableOpacity
            style={styles.navigateBtn}
            onPress={() => handleNavigate(delivery.pickupAddress, delivery.pickupCoordinates)}
          >
            <MaterialIcons name="directions" size={18} color={COLORS.primary} />
            <Text style={styles.navigateBtnText}>Chỉ đường</Text>
          </TouchableOpacity>
        </View>

        {/* Dropoff Address */}
        <View style={styles.addressCard}>
          <View style={styles.addressHeader}>
            <MaterialIcons name="location-on" size={20} color="#E74C3C" />
            <Text style={styles.addressTitle}>Điểm giao hàng</Text>
          </View>
          <Text style={styles.addressText}>{delivery.dropoffAddress}</Text>
          <TouchableOpacity
            style={styles.navigateBtn}
            onPress={() => handleNavigate(delivery.dropoffAddress, delivery.dropoffCoordinates)}
          >
            <MaterialIcons name="directions" size={18} color={COLORS.primary} />
            <Text style={styles.navigateBtnText}>Chỉ đường</Text>
          </TouchableOpacity>
        </View>

        {/* Notes */}
        {delivery.notes && (
          <View style={styles.notesCard}>
            <MaterialIcons name="note" size={20} color="#666" />
            <Text style={styles.notesText}>{delivery.notes}</Text>
          </View>
        )}

        {/* Action Buttons */}
        {currentStatus === 'picking_up' && (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={handlePickupComplete}
            disabled={updating}
          >
            {updating ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.actionBtnText}>Đã lấy hàng xong</Text>
                <MaterialIcons name="check-circle" size={20} color="#fff" />
              </>
            )}
          </TouchableOpacity>
        )}

        {currentStatus === 'delivering' && (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={handleComplete}
            disabled={updating}
          >
            {updating ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.actionBtnText}>Hoàn thành giao hàng</Text>
                <MaterialIcons name="check-circle" size={20} color="#fff" />
              </>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 15,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
    marginBottom: 24,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111',
  },
  headerStatus: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primary,
    marginTop: 2,
  },
  callBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapContainer: {
    height: 280,
  },
  map: {
    flex: 1,
  },
  currentLocationMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
  },
  bottomSheet: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -20,
  },
  bottomSheetContent: {
    padding: 20,
  },
  timeline: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  timelineStep: {
    alignItems: 'center',
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E0E0E0',
    marginBottom: 8,
  },
  stepDotCompleted: {
    backgroundColor: COLORS.primary,
  },
  stepLabel: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
  },
  stepLine: {
    flex: 1,
    height: 3,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 8,
    marginBottom: 28,
  },
  stepLineCompleted: {
    backgroundColor: COLORS.primary,
  },
  customerCard: {
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  customerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customerAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFE8DC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111',
    marginBottom: 4,
  },
  customerPhone: {
    fontSize: 14,
    color: '#666',
  },
  goodsCard: {
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111',
    marginBottom: 12,
  },
  goodsRow: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 16,
  },
  goodsItem: {
    flex: 1,
  },
  goodsLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  goodsValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  priceLabel: {
    fontSize: 14,
    color: '#666',
  },
  priceValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#16A34A',
  },
  addressCard: {
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  addressTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111',
  },
  addressText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 12,
  },
  navigateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
    gap: 6,
  },
  navigateBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  notesCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF9E6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  notesText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  actionBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
})
