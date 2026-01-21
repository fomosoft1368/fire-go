import React from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { useSelector } from 'react-redux'
import { RootState } from '../redux/store'
import { MaterialIcons } from '@expo/vector-icons'
import { SPACING, BORDER_RADIUS } from '../constants'
import MapViewComponent from '../components/MapView'
import { rideService } from '../services/rideService'

interface DriverFoundScreenProps {
  driver?: {
    id: string
    name: string
    avatar: string
    rating: number
    totalRides: number
    carType: string
    licensePlate: string
    carColor: string
    distance: number
    eta: number
    currentLat: number
    currentLng: number
    phone?: string
  }
  rideId?: string
  routeInfo?: any
  onChat: () => void
  onCancel: () => void
}

export default function DriverFoundScreen({
  driver: initialDriver,
  rideId,
  routeInfo: initialRouteInfo,
  onChat,
  onCancel,
}: DriverFoundScreenProps) {
  const authUser = useSelector((state: RootState) => state.auth.user)
  const [driver, setDriver] = React.useState(initialDriver)
  const [routeInfo, setRouteInfo] = React.useState(initialRouteInfo)
  const [loading, setLoading] = React.useState(!driver)

  // Lấy dữ liệu thực từ API khi component mount
  React.useEffect(() => {
    if (rideId && !driver) {
      loadRideData()
    }
  }, [rideId])

  const loadRideData = async () => {
    if (!rideId) {
      Alert.alert('Lỗi', 'Không tìm thấy ID cuốc xe')
      return
    }

    setLoading(true)
    try {
      console.log('[DriverFoundScreen] Loading ride data:', rideId)

      const rideData = await rideService.getRideById(rideId)

      console.log('[DriverFoundScreen] Ride data loaded:', {
        driverId: rideData?.driverId?._id,
        status: rideData?.status,
      })

      if (!rideData || !rideData.driverId) {
        Alert.alert('Lỗi', 'Không tìm thấy thông tin tài xế')
        return
      }

      const driverInfo = rideData.driverId
      const driverData = {
        id: driverInfo._id,
        name: `${driverInfo.firstName} ${driverInfo.lastName}`,
        avatar: driverInfo.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${driverInfo.email}`,
        rating: driverInfo.rating || 5,
        totalRides: driverInfo.totalRides || 0,
        carType: driverInfo.carType || 'Xe tiêu chuẩn',
        licensePlate: driverInfo.licensePlate || 'N/A',
        carColor: driverInfo.carColor || 'Trắng',
        distance: 2.5, // TODO: Tính từ current location
        eta: 5, // TODO: Tính từ routing
        currentLat: driverInfo.currentLocation?.coordinates[1] || 21.0285,
        currentLng: driverInfo.currentLocation?.coordinates[0] || 105.8542,
        phone: driverInfo.phone,
      }

      setDriver(driverData)

      // Chuẩn bị route info từ pickup/dropoff
      const routeData = {
        pickup: {
          address: rideData.pickupAddress,
          coordinates: {
            latitude: rideData.pickupLocation?.coordinates[1] || 21.0285,
            longitude: rideData.pickupLocation?.coordinates[0] || 105.8542,
          },
        },
        dropoff: {
          address: rideData.dropoffAddress,
          coordinates: {
            latitude: rideData.dropoffLocation?.coordinates[1] || 21.0410,
            longitude: rideData.dropoffLocation?.coordinates[0] || 105.8704,
          },
        },
        routeCoordinates: rideData.routeCoordinates || [],
      }

      setRouteInfo(routeData)

      console.log('[DriverFoundScreen] Ride data loaded successfully')
    } catch (error: any) {
      console.error('[DriverFoundScreen] Load ride error:', {
        message: error.message,
        rideId,
      })
      Alert.alert('Lỗi', 'Không thể tải thông tin cuốc xe')
    } finally {
      setLoading(false)
    }
  }
  return (
    <View
      style={styles.foundContainer}
      // showsVerticalScrollIndicator={false}
    >
      <View style={StyleSheet.absoluteFillObject}>
        {/* Map Container */}
        <MapViewComponent
          height={'100%'}
          initialRegion={{
            latitude: routeInfo.pickup.coordinates.latitude,
            longitude: routeInfo.pickup.coordinates.longitude,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
          }}
          markers={[]}
          pickupCoords={{
            latitude: routeInfo.pickup.coordinates.latitude,
            longitude: routeInfo.pickup.coordinates.longitude,
          }}
          dropoffCoords={{
            latitude: routeInfo.dropoff.coordinates.latitude,
            longitude: routeInfo.dropoff.coordinates.longitude,
          }}
          drivers={
            driver?.currentLat && driver?.currentLng
              ? [
                {
                  id: driver.id,
                  latitude: driver.currentLat,
                  longitude: driver.currentLng,
                  name: driver.name,
                  rating: driver.rating,
                  vehicle: driver.licensePlate,
                },
              ]
              : []
          }
          routeCoordinates={routeInfo?.routeCoordinates || []}
          onLocationSelect={() => { }}
        />
      </View>
      <View style={styles.header}>
        <TouchableOpacity onPress={onCancel}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Theo dõi chuyến đi</Text>
        <TouchableOpacity>
          <Text style={styles.helpText}>Trợ giúp</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.professionalStatusCard}>
        {/* Driver Info Card */}
        <View style={styles.statusContentWrapper}>
          <View style={styles.driverCardLeft}>
            <View style={styles.driverCardAvatar}>
              <Text style={styles.driverCardAvatarText}>👤</Text>
            </View>
            <View style={styles.driverCardInfo}>
              <Text style={styles.driverCardName}>{driver.name}</Text>
              <Text style={styles.driverCardSubInfo}>{driver.carType} • {driver.licensePlate}</Text>
              <View style={styles.driverCardRating}>
                <MaterialIcons name="star" size={14} color="#FFB800" />
                <Text style={styles.driverCardRatingValue}>{driver.rating}</Text>
                <Text style={styles.driverCardRideCount}>• {driver.totalRides} chuyến</Text>
              </View>
            </View>
          </View>
          <View style={styles.driverCardActions}>
            <TouchableOpacity
              style={styles.driverCardCallButton}>
              <MaterialIcons name="call" size={20} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.driverCardChatButton}
              onPress={onChat}
            >
              <MaterialIcons name="chat-bubble" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Route Info */}
        <View style={styles.routeInfoContainer}>
          <View style={styles.routePointItem}>
            <View style={styles.routePointIcon}>
              <MaterialIcons name="location-on" size={18} color="#FF6B00" />
            </View>
            <View style={styles.routePointText}>
              <Text style={styles.routePointLabel}>ĐIỂM ĐÓN</Text>
              <Text style={styles.routePointAddress}>{routeInfo.pickup.address}</Text>
              <Text style={styles.routePointTime}>Ngay</Text>
            </View>
          </View>

          <View style={styles.routeConnector} />

          <View style={styles.routePointItem}>
            <View style={[styles.routePointIcon, { backgroundColor: '#ef4444' }]}>
              <MaterialIcons name="location-on" size={18} color="#fff" />
            </View>
            <View style={styles.routePointText}>
              <Text style={styles.routePointLabel}>ĐIỂM ĐẾN</Text>
              <Text style={styles.routePointAddress}>{routeInfo.dropoff.address}</Text>
              <Text style={styles.routePointTime}>{driver.eta} phút (Dự kiến)</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onCancel}
            activeOpacity={0.6}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialIcons name="close" size={20} color="#fff" />
            <Text style={styles.cancelButtonText}>Hủy</Text>
          </TouchableOpacity>
        </View>
        {/* Status Badge Overlay */}
        {/* <View style={styles.statusBadgeOverlay}>
              <MaterialIcons name="location-on" size={16} color="#FF6B00" />
              <Text style={styles.statusBadgeText}>Tài xế đang đến • {driver.eta} phút</Text>
            </View> */}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  foundContainer: {
    flex: 1,
    position: 'relative',
  },
  scrollContent: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.lg,
  },
  loadingText: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: SPACING.md,
  },
    header: {
    position: 'absolute',
    top: 50,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
    statusContentWrapper: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.lg,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF6B00',
    flex: 1,
    textAlign: 'center',
  },
  helpText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6B00',
  },
  mapContainer: {
    position: 'relative',
    height: 500,
    backgroundColor: '#0f172a',
  },
  statusBadgeOverlay: {
    position: 'absolute',
    top: 160,
    left: '50%',
    marginLeft: -90,
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    borderRadius: 20,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: '#FF6B00',
  },
    professionalStatusCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  statusBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  driverInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1a202c',
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    marginBottom: SPACING.lg,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  driverCardLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  driverCardAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 107, 0, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverCardAvatarText: {
    fontSize: 24,
  },
  driverCardInfo: {
    flex: 1,
  },
  driverCardName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 2,
  },
  driverCardSubInfo: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 4,
  },
  driverCardRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  driverCardRatingValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  driverCardRideCount: {
    fontSize: 12,
    color: '#94a3b8',
  },
  driverCardActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  driverCardCallButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF6B00',
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverCardChatButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1a202c',
    borderWidth: 1,
    borderColor: '#FF6B00',
    justifyContent: 'center',
    alignItems: 'center',
  },
  routeInfoContainer: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  routePointItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  routePointIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 107, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  routePointText: {
    flex: 1,
  },
  routePointLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  routePointAddress: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  routePointTime: {
    fontSize: 12,
    color: '#94a3b8',
  },
  routeConnector: {
    width: 2,
    height: 30,
    backgroundColor: 'rgba(255, 107, 0, 0.3)',
    marginLeft: 19,
    marginBottom: SPACING.lg,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    backgroundColor: '#0f172a',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  chatButton: {
    flex: 1,
    height: 52,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: 'rgba(255, 107, 0, 0.1)',
    borderWidth: 2,
    borderColor: '#FF6B00',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  chatButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF6B00',
  },
  cancelButton: {
    flex: 1,
    height: 52,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: '#ef4444',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.sm,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
})
