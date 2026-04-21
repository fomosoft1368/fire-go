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
import * as Location from 'expo-location'
import { COLORS, SPACING } from '../constants'
import { deliveryService, type Delivery } from '../services/deliveryService'
import { mapsService } from '../services/mapsService'
import MapViewComponent from '@/components/MapView'

export default function ActiveDeliveryScreen({ navigation, route }: any) {
  const { deliveryId } = route.params || {}

  const [delivery, setDelivery] = useState<Delivery | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [currentLocation, setCurrentLocation] = useState<[number, number] | null>(null)
  const [currentStatus, setCurrentStatus] = useState<'picking_up' | 'delivering' | 'delivered'>('picking_up')
  const [pickupCoords, setPickupCoords] = useState<{ latitude: number; longitude: number } | null>(null)
  const [dropoffCoords, setDropoffCoords] = useState<{ latitude: number; longitude: number } | null>(null)
  const [routeCoordinates, setRouteCoordinates] = useState<Array<{ latitude: number; longitude: number }>>([])

  const mapRef = useRef<any>(null)

  // Calculate route based on delivery status
  const calculateRoute = async (
    status: string,
    driverLoc: [number, number] | null,
    pickup: { latitude: number; longitude: number } | null,
    dropoff: { latitude: number; longitude: number } | null
  ) => {
    try {
      let startCoords: { latitude: number; longitude: number } | null = null
      let endCoords: { latitude: number; longitude: number } | null = null

      // Determine route based on status
      if (status === 'picking_up' && driverLoc && pickup) {
        // Route from driver to pickup location
        startCoords = { latitude: driverLoc[1], longitude: driverLoc[0] }
        endCoords = pickup
        console.log('[ActiveDelivery] Calculating route: driver -> pickup')
      } else if ((status === 'delivering' || status === 'delivered') && pickup && dropoff) {
        // Route from pickup to dropoff location
        startCoords = pickup
        endCoords = dropoff
        console.log('[ActiveDelivery] Calculating route: pickup -> dropoff')
      }

      if (startCoords && endCoords) {
        const startAddress = `${startCoords.latitude},${startCoords.longitude}`
        const endAddress = `${endCoords.latitude},${endCoords.longitude}`

        console.log('[ActiveDelivery] Route params:', { startAddress, endAddress, status })

        const routeInfo = await mapsService.getRouteInfo(startAddress, endAddress)

        console.log('[ActiveDelivery] Route info received:', {
          hasRoute: !!routeInfo.routeCoordinates,
          routeLength: routeInfo.routeCoordinates?.length || 0,
          distance: routeInfo.distance,
          duration: routeInfo.duration,
        })

        if (routeInfo.routeCoordinates && routeInfo.routeCoordinates.length > 0) {
          setRouteCoordinates(routeInfo.routeCoordinates)
          console.log('[ActiveDelivery] Route coordinates set:', routeInfo.routeCoordinates.length)
        } else {
          console.warn('[ActiveDelivery] No route coordinates in response')
          setRouteCoordinates([])
        }
      } else {
        console.warn('[ActiveDelivery] Missing coordinates for route calculation')
        setRouteCoordinates([])
      }
    } catch (error) {
      console.error('[ActiveDelivery] Route calculation error:', error)
      setRouteCoordinates([])
    }
  }

  useEffect(() => {
    loadDelivery()
    startLocationTracking()

    // Poll delivery status every 5 seconds
    const interval = setInterval(loadDelivery, 5000)
    return () => clearInterval(interval)
  }, [deliveryId])

  // Recalculate route when location, status, or coordinates change
  useEffect(() => {
    if (pickupCoords && dropoffCoords) {
      console.log('[ActiveDelivery] Triggering route calculation from useEffect', {
        hasCurrentLocation: !!currentLocation,
        currentStatus,
        pickup: pickupCoords,
        dropoff: dropoffCoords
      })
      calculateRoute(currentStatus, currentLocation, pickupCoords, dropoffCoords)
    }
  }, [currentLocation, currentStatus, pickupCoords, dropoffCoords])

  const loadDelivery = async () => {
    try {
      if (!deliveryId) return

      const data = await deliveryService.getDelivery(deliveryId)
      setDelivery(data)

      console.log('[ActiveDelivery] Delivery data:', JSON.stringify(data, null, 2))

      // Update current status based on delivery status
      if (data.status === 'picking_up') {
        setCurrentStatus('picking_up')
      } else if (data.status === 'delivering') {
        setCurrentStatus('delivering')
      } else if (data.status === 'delivered') {
        setCurrentStatus('delivered')
      }

      // Extract pickup coordinates (use local variable)
      let pickup: { latitude: number; longitude: number } | null = null
      if (data.pickupCoordinates && data.pickupCoordinates.length === 2) {
        const pickupLat = data.pickupCoordinates[1]
        const pickupLng = data.pickupCoordinates[0]
        pickup = { latitude: pickupLat, longitude: pickupLng }
        setPickupCoords(pickup)
      } else if (data.pickupAddress) {
        // Geocode from address
        try {
          const geocodeResult = await mapsService.geocodeAddress(data.pickupAddress)
          if (geocodeResult?.coordinates) {
            pickup = {
              latitude: geocodeResult.coordinates.latitude,
              longitude: geocodeResult.coordinates.longitude,
            }
            setPickupCoords(pickup)
          }
        } catch (error) {
          console.error('[ActiveDelivery] Pickup geocoding error:', error)
        }
      }

      // Extract dropoff coordinates (use local variable)
      let dropoff: { latitude: number; longitude: number } | null = null
      if (data.dropoffCoordinates && data.dropoffCoordinates.length === 2) {
        const dropoffLat = data.dropoffCoordinates[1]
        const dropoffLng = data.dropoffCoordinates[0]
        dropoff = { latitude: dropoffLat, longitude: dropoffLng }
        setDropoffCoords(dropoff)
      } else if (data.dropoffAddress) {
        // Geocode from address
        try {
          const geocodeResult = await mapsService.geocodeAddress(data.dropoffAddress)
          if (geocodeResult?.coordinates) {
            dropoff = {
              latitude: geocodeResult.coordinates.latitude,
              longitude: geocodeResult.coordinates.longitude,
            }
            setDropoffCoords(dropoff)
          }
        } catch (error) {
          console.error('[ActiveDelivery] Dropoff geocoding error:', error)
        }
      }

      // Calculate route based on delivery status using local variables
      console.log('[ActiveDelivery] About to calculate route with:', {
        status: data.status,
        hasCurrentLocation: !!currentLocation,
        hasPickup: !!pickup,
        hasDropoff: !!dropoff
      })
      calculateRoute(data.status, currentLocation, pickup, dropoff)
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
                  onPress: () => {
                    // Navigate back to home screen
                    navigation.reset({
                      index: 0,
                      routes: [{ name: 'HomeScreen' }],
                    })
                  },
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

  const handleChat = () => {
    if (!delivery?.customerId) {
      Alert.alert('Lỗi', 'Không tìm thấy thông tin khách hàng')
      return
    }

    navigation.navigate('ChatScreen', {
      customer: {
        id: typeof delivery.customerId === 'string' ? delivery.customerId : delivery.customerId._id,
        name: typeof delivery.customerId === 'string'
          ? 'Khách hàng'
          : `${delivery.customerId.firstName || ''} ${delivery.customerId.lastName || ''}`.trim() || 'Khách hàng',
        phone: typeof delivery.customerId === 'string' ? undefined : delivery.customerId.phone,
      },
      deliveryId: delivery._id,
    })
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
    <View style={styles.container}>
      {/* Map */}
      <View style={StyleSheet.absoluteFillObject}>
        <MapViewComponent
          height={'100%'}
          initialRegion={pickupCoords || currentLocation ? {
            latitude: pickupCoords?.latitude || currentLocation![1],
            longitude: pickupCoords?.longitude || currentLocation![0],
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          } : undefined}
          pickupCoords={pickupCoords || undefined}
          dropoffCoords={dropoffCoords || undefined}
          routeCoordinates={routeCoordinates}
          drivers={currentLocation ? [{
            id: 'current-driver',
            latitude: currentLocation[1],
            longitude: currentLocation[0],
            name: 'Bạn',
            rating: 0,
            vehicle: 'Current',
          }] : []}
        />
      </View>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color="#faf8f8ff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Đơn #{delivery._id.slice(-8)}</Text>
          <Text style={styles.headerStatus}>{delivery.status.toUpperCase()}</Text>
        </View>
      </View>
      {/* Bottom Sheet */}
      <View style={[styles.card, { maxHeight: isExpanded ? '90%' : '50%' }]}>
        <TouchableOpacity 
          style={styles.expandToggleButton} 
          onPress={() => setIsExpanded(!isExpanded)}
          activeOpacity={0.7}
        >
          <Text style={styles.expandToggleText}>
            {isExpanded ? 'Thu gọn' : 'Mở rộng'}
          </Text>
          <MaterialCommunityIcons 
            name={isExpanded ? "chevron-down" : "chevron-up"} 
            size={20} 
            color="#FF6B00" 
          />
        </TouchableOpacity>
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
        <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollContent}>
          <View style={styles.customerCard}>
            <View style={styles.customerHeader}>
              <View style={styles.customerAvatar}>
                <MaterialIcons name="person" size={28} color={COLORS.primary} />
              </View>
              <View style={styles.customerInfo}>
                <Text style={styles.customerName}>{customerName}</Text>
                <Text style={styles.customerPhone}>{delivery.customerId?.phone}</Text>
              </View>
              <View style={styles.customerActions}>
                <TouchableOpacity onPress={handleChat} style={styles.chatBtn}>
                  <MaterialCommunityIcons name="message-text" size={20} color={COLORS.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleCall} style={styles.callBtnSmall}>
                  <MaterialIcons name="phone" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Contact Info (Gửi & Nhận) */}
          <View style={styles.goodsCard}>
            <Text style={styles.sectionTitle}>Thông tin liên hệ</Text>
            
            {/* Người gửi */}
            <View style={styles.contactRow}>
              <View style={styles.contactInfo}>
                <Text style={styles.contactLabel}>Người gửi</Text>
                <Text style={styles.contactValue}>{delivery.senderPhone || delivery.customerId?.phone}</Text>
              </View>
              <TouchableOpacity 
                onPress={() => {
                  const phone = delivery.senderPhone || delivery.customerId?.phone
                  if (phone) Linking.openURL(`tel:${phone}`)
                }} 
                style={styles.callBtnSmall}
              >
                  <MaterialIcons name="phone" size={20} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Người nhận (Chỉ hiện khi đã lấy hàng hoặc đang giao hàng) */}
            {currentStatus !== 'picking_up' && delivery.recipientPhone && (
              <View style={[styles.contactRow, { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#f0f0f0' }]}>
                <View style={styles.contactInfo}>
                  <Text style={styles.contactLabel}>Người nhận</Text>
                  <Text style={styles.contactValue}>{delivery.recipientPhone}</Text>
                </View>
                <TouchableOpacity 
                  onPress={() => Linking.openURL(`tel:${delivery.recipientPhone}`)} 
                  style={[styles.callBtnSmall, { backgroundColor: '#E74C3C' }]}
                >
                    <MaterialIcons name="phone" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            )}
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
        </ScrollView>
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
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    zIndex: 10,
  },
  card: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 15,
    maxHeight: '50%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  scrollContent: {
    flex: 1,
    marginBottom: 16,
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
  backBtn: {
    position: 'absolute',
    top: 20,
    left: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 3,
    zIndex: 5,
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
  customerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  chatBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFE8DC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  callBtnSmall: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
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
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  contactInfo: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  contactValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111',
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
  expandToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FFEDD5',
    borderRadius: 20,
    gap: 6,
    alignSelf: 'center',
    marginTop: -4,
    marginBottom: 16,
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  expandToggleText: {
    color: '#FF6B00',
    fontSize: 14,
    fontWeight: '700'
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
  handleBarContainer: {
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 16,
  },
  handleBar: {
    width: 40,
    height: 5,
    backgroundColor: '#4B5563',
    borderRadius: 3,
  },
})
