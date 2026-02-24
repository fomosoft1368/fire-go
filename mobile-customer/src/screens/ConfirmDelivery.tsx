import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { useRoute, useNavigation } from '@react-navigation/native'
import type { RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../types'
import { deliveryService } from '../services/deliveryService'

const ORANGE = '#FF6B00'

type ConfirmDeliveryRouteProp = RouteProp<RootStackParamList, 'ConfirmDelivery'>
type ConfirmDeliveryNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ConfirmDelivery'>

export default function ConfirmDelivery() {
  const route = useRoute<ConfirmDeliveryRouteProp>()
  const navigation = useNavigation<ConfirmDeliveryNavigationProp>()
  const {
    pickup,
    dropoff,
    pickupCoordinates,
    dropoffCoordinates,
    goodsType,
    weight,
    vehicle,
    estimatedPrice,
    distance,
    duration
  } = route.params || {}
  const [loading, setLoading] = useState(false)

  const getGoodsTypeLabel = () => {
    const types: any = {
      light: 'Hàng nhẹ',
      bulky: 'Cồng kềnh',
      food: 'Thực phẩm'
    }
    return types[goodsType] || goodsType
  }

  const getVehicleLabel = () => {
    return vehicle === 'bike' ? 'Xe máy' : 'Xe tải nhỏ'
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back-ios" size={20} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Xác nhận giá</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Price Box */}
      <View style={styles.priceBox}>
        <Text style={styles.priceLabel}>Tổng chi phí dự tính</Text>
        <Text style={styles.price}>{estimatedPrice?.toLocaleString('vi-VN')} đ</Text>
      </View>

      {/* Order Detail Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Chi tiết đơn hàng</Text>

        <DetailRow
          icon="room"
          title={pickup || 'Chưa chọn'}
          subtitle="Điểm lấy hàng"
        />

        <DetailRow
          icon="room"
          title={dropoff || 'Chưa chọn'}
          subtitle="Điểm giao hàng"
        />

        <DetailRow
          icon="local-shipping"
          title={getVehicleLabel()}
          subtitle="Phương tiện vận chuyển"
        />

        <DetailRow
          icon="inventory-2"
          title={weight || 'Chưa chọn'}
          subtitle="Trọng lượng hàng hóa"
          noBorder
        />
      </View>

      {/* Note */}
      <View style={styles.noteContainer}>
        <MaterialIcons name="info" size={16} color="#999" style={styles.noteIcon} />
        <Text style={styles.note}>
          Giá đã bao gồm VAT. Phí cầu đường, phí bến bãi hoặc phí bốc xếp có thể phát sinh thêm dựa trên thực tế vận chuyển.
        </Text>
      </View>

      {/* Bottom Buttons */}
      <View style={styles.bottom}>
        <TouchableOpacity
          style={styles.confirmBtn}
          onPress={async () => {
            try {
              setLoading(true)

              // Get customer ID from AsyncStorage
              const AsyncStorage = require('@react-native-async-storage/async-storage').default
              const userJson = await AsyncStorage.getItem('user')
              if (!userJson) {
                Alert.alert('Lỗi', 'Vui lòng đăng nhập lại')
                setLoading(false)
                return
              }

              const user = JSON.parse(userJson)
              const userId = user.id || user._id

              // Create delivery order via API
              const deliveryData = {
                customerId: userId,
                pickupAddress: pickup,
                pickupCoordinates,
                dropoffAddress: dropoff,
                dropoffCoordinates,
                goodsType: goodsType as 'light' | 'bulky' | 'food',
                weight: weight as '<20' | '20-50' | '>50',
                vehicle: vehicle as 'bike' | 'truck',
                estimatedPrice,
                distance: distance || '0 km',
                duration: duration || '0',
              }

              console.log('[ConfirmDelivery] Creating delivery:', deliveryData)
              const createdDelivery = await deliveryService.createDelivery(deliveryData)
              console.log('[ConfirmDelivery] Created delivery:', createdDelivery)

              // Navigate to FindingDelivery screen
              navigation.navigate('FindingDelivery', {
                deliveryId: createdDelivery._id,
                pickup,
                dropoff,
                goodsType,
                weight,
                vehicle,
                estimatedPrice,
                distance: distance || '0 km'
              })
            } catch (error: any) {
              console.error('[ConfirmDelivery] Error:', error)
              Alert.alert('Lỗi', error.message || 'Không thể tạo đơn hàng. Vui lòng thử lại.')
            } finally {
              setLoading(false)
            }
          }}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.confirmText}>Xác nhận đặt đơn</Text>
              <MaterialIcons name="check-circle" size={20} color="#fff" style={styles.checkIcon} />
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>Quay lại</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

/* ---------------- Detail Row ---------------- */

function DetailRow({
  icon,
  title,
  subtitle,
  noBorder,
}: {
  icon: any
  title: string
  subtitle: string
  noBorder?: boolean
}) {
  return (
    <View
      style={[
        styles.row,
        noBorder && { borderBottomWidth: 0 },
      ]}
    >
      <View style={styles.iconBox}>
        <MaterialIcons name={icon} size={22} color="#ff7a45" />
      </View>
      <View>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSub}>{subtitle}</Text>
      </View>
    </View>
  )
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },

  /* Header */
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

  /* Price Box */
  priceBox: {
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingVertical: 24,
    marginTop: 8,
  },
  priceLabel: {
    fontSize: 13,
    color: '#888',
    marginBottom: 8,
  },
  price: {
    fontSize: 36,
    fontWeight: '700',
    color: ORANGE,
    letterSpacing: -1,
  },

  /* Card */
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
    marginBottom: 16,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: '#F0F0F0',
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#FFF3EC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111',
    marginBottom: 4,
  },
  rowSub: {
    fontSize: 13,
    color: '#888',
  },

  /* Note */
  noteContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 12,
  },
  noteIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  note: {
    flex: 1,
    fontSize: 12,
    color: '#888',
    lineHeight: 18,
  },

  /* Bottom */
  bottom: {
    marginTop: 'auto',
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: '#fff',
  },
  confirmBtn: {
    backgroundColor: ORANGE,
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    flexDirection: 'row',
    shadowColor: ORANGE,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  confirmText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginRight: 8,
  },
  checkIcon: {
    marginLeft: 4,
  },
  backButton: {
    paddingVertical: 12,
  },
  backText: {
    textAlign: 'center',
    color: '#111',
    fontSize: 15,
    fontWeight: '600',
  },
})