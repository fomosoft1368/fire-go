import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native'
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons'
import { COLORS } from '../constants'
import { deliveryService, type Delivery } from '../services/deliveryService'
import * as Location from 'expo-location'
import AsyncStorage from '@react-native-async-storage/async-storage'

export default function DeliveryRequestsScreen({ navigation }: any) {
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [accepting, setAccepting] = useState<string | null>(null)

  useEffect(() => {
    // Check if driver is logged in first
    const initScreen = async () => {
      const token = await AsyncStorage.getItem('token')
      console.log('[DeliveryRequests] Token exists:', !!token)
      
      if (!token) {
        Alert.alert(
          'Yêu cầu đăng nhập',
          'Bạn cần đăng nhập để xem danh sách đơn hàng',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        )
        return
      }
      
      loadNearbyDeliveries()
    }
    
    initScreen()
    
    // Auto refresh every 10 seconds
    const interval = setInterval(loadNearbyDeliveries, 10000)
    return () => clearInterval(interval)
  }, [])
  const handleLogout = async () => {
    await AsyncStorage.removeItem('token')
    // Navigate back and user will be redirected to login by Redux
    navigation.goBack()
  }

  const loadNearbyDeliveries = async () => {
    try {
      console.log('[DeliveryRequests] Loading nearby deliveries...')
      
      // Get current location
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Lỗi', 'Cần quyền truy cập vị trí để tìm đơn hàng')
        return
      }

      const location = await Location.getCurrentPositionAsync({})
      const { latitude, longitude } = location.coords
      console.log('[DeliveryRequests] Current location:', { latitude, longitude })

      const nearbyDeliveries = await deliveryService.findNearbyDeliveries(
        latitude,
        longitude,
        5000 // 5km radius
      )

      console.log('[DeliveryRequests] Found deliveries:', nearbyDeliveries.length)
      setDeliveries(nearbyDeliveries)
    } catch (error: any) {
      console.error('[DeliveryRequests] Load error:', error)
      Alert.alert('Lỗi', error.message || 'Không thể tải danh sách đơn hàng')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    setRefreshing(true)
    loadNearbyDeliveries()
  }

  const handleAccept = async (delivery: Delivery) => {
    try {
      setAccepting(delivery._id)

      // Get driver info from auth service
      const authService = require('../services/authService')
      
      try {
        console.log('[DeliveryRequests] Calling getCurrentUser...')
        const currentUser = await authService.getCurrentUser()
        console.log('[DeliveryRequests] Current user:', JSON.stringify(currentUser, null, 2))
        
        if (!currentUser) {
          console.log('[DeliveryRequests] currentUser is null/undefined')
          Alert.alert('Lỗi', 'Vui lòng đăng nhập lại', [
            {
              text: 'OK',
              onPress: handleLogout,
            },
          ])
          return
        }

        // Get driver ID from response (can be _id or id)
        const driverId = currentUser._id || currentUser.id
        console.log('[DeliveryRequests] Driver ID extracted:', driverId)
        
        if (!driverId) {
          console.log('[DeliveryRequests] No driver ID found in user object')
          Alert.alert('Lỗi', 'Không tìm thấy ID tài xế')
          return
        }
        
        console.log('[DeliveryRequests] Accepting delivery with driver ID:', driverId)

        await deliveryService.acceptDelivery(delivery._id, driverId)
        
        Alert.alert('Thành công', 'Đã nhận đơn hàng', [
          {
            text: 'OK',
            onPress: () => {
              // Navigate to active delivery screen
              navigation.replace('ActiveDelivery', {
                deliveryId: delivery._id,
              })
            },
          },
        ])
      } catch (authError: any) {
        console.error('[DeliveryRequests] Auth error:', authError)
        console.error('[DeliveryRequests] Auth error message:', authError.message)
        console.error('[DeliveryRequests] Auth error response:', authError.response?.data)
        console.error('[DeliveryRequests] Auth error status:', authError.response?.status)
        
        // Check if it's authentication error
        if (authError.response?.status === 401 || authError.message?.includes('token')) {
          Alert.alert('Phiên đăng nhập hết hạn', 'Vui lòng đăng nhập lại', [
            {
              text: 'OK',
              onPress: handleLogout,
            },
          ])
        } else {
          Alert.alert('Lỗi', authError.response?.data?.message || authError.message || 'Không thể xác thực tài xế')
        }
        return
      }
    } catch (error: any) {
      console.error('[DeliveryRequests] Accept error:', error)
      Alert.alert('Lỗi', error.message || 'Không thể nhận đơn hàng')
    } finally {
      setAccepting(null)
    }
  }

  const getGoodsTypeLabel = (type: string) => {
    const types: any = {
      light: 'Hàng nhẹ',
      bulky: 'Cồng kềnh',
      food: 'Thực phẩm',
    }
    return types[type] || type
  }

  const getGoodsTypeIcon = (type: string) => {
    const icons: any = {
      light: 'cube-outline',
      bulky: 'archive-outline',
      food: 'restaurant',
    }
    return icons[type] || 'package'
  }

  const getVehicleLabel = (vehicle: string) => {
    return vehicle === 'bike' ? 'Xe máy' : 'Xe tải nhỏ'
  }

  const renderDeliveryCard = ({ item }: { item: Delivery }) => {
    const customerName = item.customerId?.name || 
                        `${item.customerId?.firstName || ''} ${item.customerId?.lastName || ''}`.trim() ||
                        'Khách hàng'

    return (
      <View style={styles.card}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.customerInfo}>
            <View style={styles.avatar}>
              <MaterialIcons name="person" size={24} color={COLORS.primary} />
            </View>
            <View>
              <Text style={styles.customerName}>{customerName}</Text>
              <Text style={styles.customerPhone}>{item.customerId?.phone || 'N/A'}</Text>
            </View>
          </View>
          <View style={styles.priceTag}>
            <Text style={styles.priceText}>{item.estimatedPrice.toLocaleString('vi-VN')}đ</Text>
          </View>
        </View>

        {/* Goods Info */}
        <View style={styles.goodsInfo}>
          <View style={styles.goodsTypeBox}>
            <MaterialCommunityIcons 
              name={getGoodsTypeIcon(item.goodsType)} 
              size={20} 
              color={COLORS.primary} 
            />
            <Text style={styles.goodsTypeText}>{getGoodsTypeLabel(item.goodsType)}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.weightBox}>
            <MaterialIcons name="fitness-center" size={18} color="#666" />
            <Text style={styles.weightText}>{item.weight} kg</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.vehicleBox}>
            <MaterialCommunityIcons 
              name={item.vehicle === 'bike' ? 'motorbike' : 'truck'} 
              size={18} 
              color="#666" 
            />
            <Text style={styles.vehicleText}>{getVehicleLabel(item.vehicle)}</Text>
          </View>
        </View>

        {/* Addresses */}
        <View style={styles.addressSection}>
          <View style={styles.addressRow}>
            <View style={styles.iconCircle}>
              <MaterialIcons name="trip-origin" size={16} color={COLORS.primary} />
            </View>
            <Text style={styles.addressText} numberOfLines={2}>
              {item.pickupAddress}
            </Text>
          </View>

          <View style={styles.dashedLine} />

          <View style={styles.addressRow}>
            <View style={[styles.iconCircle, styles.iconCircleDestination]}>
              <MaterialIcons name="location-on" size={16} color="#E74C3C" />
            </View>
            <Text style={styles.addressText} numberOfLines={2}>
              {item.dropoffAddress}
            </Text>
          </View>
        </View>

        {/* Distance & Notes */}
        {(item.distance || item.notes) && (
          <View style={styles.infoSection}>
            {item.distance && (
              <View style={styles.infoRow}>
                <MaterialIcons name="straighten" size={16} color="#666" />
                <Text style={styles.infoText}>{item.distance}</Text>
              </View>
            )}
            {item.notes && (
              <View style={styles.infoRow}>
                <MaterialIcons name="note" size={16} color="#666" />
                <Text style={styles.infoText} numberOfLines={2}>{item.notes}</Text>
              </View>
            )}
          </View>
        )}

        {/* Accept Button */}
        <TouchableOpacity
          style={[
            styles.acceptBtn,
            accepting === item._id && styles.acceptBtnDisabled,
          ]}
          onPress={() => handleAccept(item)}
          disabled={accepting === item._id}
        >
          {accepting === item._id ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.acceptBtnText}>Nhận đơn</Text>
              <MaterialIcons name="check-circle" size={20} color="#fff" />
            </>
          )}
        </TouchableOpacity>
      </View>
    )
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <MaterialIcons name="arrow-back" size={24} color="#111" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Đơn giao hàng</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Đang tìm đơn hàng...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Đơn giao hàng gần bạn</Text>
        <TouchableOpacity onPress={handleRefresh} style={styles.refreshBtn}>
          <MaterialIcons name="refresh" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Counter */}
      <View style={styles.counterContainer}>
        <MaterialCommunityIcons name="truck-delivery" size={20} color={COLORS.primary} />
        <Text style={styles.counterText}>
          {deliveries.length} đơn hàng khả dụng
        </Text>
      </View>

      {/* List */}
      <FlatList
        data={deliveries}
        renderItem={renderDeliveryCard}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[COLORS.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="truck-delivery-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>Không có đơn hàng nào</Text>
            <Text style={styles.emptySubtext}>Kéo xuống để làm mới</Text>
          </View>
        }
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    paddingTop: 40,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
    flex: 1,
    textAlign: 'center',
  },
  refreshBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    gap: 8,
  },
  counterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
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
  listContainer: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFE8DC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
    marginBottom: 4,
  },
  customerPhone: {
    fontSize: 13,
    color: '#666',
  },
  priceTag: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  priceText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#16A34A',
  },
  goodsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    padding: 12,
  },
  goodsTypeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  goodsTypeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111',
  },
  divider: {
    width: 1,
    height: 20,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 8,
  },
  weightBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  weightText: {
    fontSize: 13,
    color: '#666',
  },
  vehicleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  vehicleText: {
    fontSize: 13,
    color: '#666',
  },
  addressSection: {
    marginBottom: 12,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFE8DC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconCircleDestination: {
    backgroundColor: '#FDECEA',
  },
  addressText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  dashedLine: {
    width: 2,
    height: 16,
    backgroundColor: '#E0E0E0',
    marginLeft: 15,
    marginVertical: 4,
    borderStyle: 'dashed',
  },
  infoSection: {
    marginBottom: 16,
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#666',
  },
  acceptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  acceptBtnDisabled: {
    opacity: 0.6,
  },
  acceptBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#999',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 8,
  },
})
