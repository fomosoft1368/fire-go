import { useState, useEffect } from 'react'
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
import { MaterialIcons } from '@expo/vector-icons'
import { useSelector } from 'react-redux'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack'
import * as Location from 'expo-location'
import type { RootState } from '../redux/store'
import type { RootStackParamList, NearbyRide } from '../types'
import { COLORS_DARK, COLORS_LIGHT, SPACING, BORDER_RADIUS } from '../constants'
import { rideService } from '../services/rideService'

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: SPACING.sm,
  },
  headerSubtitle: {
    fontSize: 14,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  refreshButtonText: {
    marginLeft: SPACING.sm,
    fontWeight: '500',
  },
  listContainer: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  rideCard: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
  },
  driverSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
  },
  driverAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  driverRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 12,
    marginLeft: 4,
  },
  vehicleInfo: {
    fontSize: 12,
    marginTop: 4,
    opacity: 0.7,
  },
  routeSection: {
    marginBottom: SPACING.md,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  locationIcon: {
    marginRight: SPACING.md,
    marginTop: 2,
  },
  locationText: {
    flex: 1,
    fontSize: 13,
  },
  priceSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    marginBottom: SPACING.md,
  },
  distanceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  distanceText: {
    fontSize: 12,
    marginLeft: SPACING.sm,
    opacity: 0.7,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  priceLabel: {
    fontSize: 12,
    opacity: 0.7,
  },
  price: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  seatsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    marginBottom: SPACING.md,
  },
  seatsText: {
    fontSize: 13,
  },
  badge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  actionButton: {
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: SPACING.sm,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: SPACING.md,
  },
  emptySubText: {
    fontSize: 13,
    marginTop: SPACING.sm,
    textAlign: 'center',
    opacity: 0.7,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
})

type Navigation = NativeStackNavigationProp<RootStackParamList>;
type FindRidesScreenProps = NativeStackScreenProps<RootStackParamList, 'FindRidesScreen'>;

export default function FindRidesScreen({ route }: FindRidesScreenProps) {
  const navigation = useNavigation<Navigation>()
  const user = useSelector((state: RootState) => state.auth.user)
  const themeMode = useSelector((state: RootState) => state.theme.mode)
  const colors = themeMode === 'dark' ? COLORS_DARK : COLORS_LIGHT

  // Get pickup address from route params if provided
  const pickupAddress = route.params?.pickupAddress || ''

  const [rides, setRides] = useState<NearbyRide[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Load nearby rides
  useEffect(() => {
    loadNearbyRides()
  }, [])

  const loadNearbyRides = async () => {
    try {
      setLoading(true)
      
      // Get current GPS location
      let currentLocation: [number, number] = [105.6909, 18.6867] // Fallback location
      
      try {
        const { status } = await Location.requestForegroundPermissionsAsync()
        if (status === 'granted') {
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          })
          currentLocation = [location.coords.longitude, location.coords.latitude]
          console.log('🗺️ Current location:', currentLocation)
        } else {
          console.log('📍 Location permission denied, using fallback location')
        }
      } catch (locationError) {
        console.error('❌ Error getting location:', locationError)
        // Continue with fallback location
      }
      
      let nearbyRides: NearbyRide[] = []

      // If pickup address is provided, use advanced filtering with location hierarchy
      if (pickupAddress) {
        console.log('🔍 Searching share rides with location filtering:', pickupAddress)
        nearbyRides = await rideService.findShareRides(
          currentLocation[0],
          currentLocation[1],
          pickupAddress,
          10000 // 10km radius
        )
      } else {
        // Otherwise use basic GPS-based search
        console.log('🔍 Searching nearby rides by GPS only')
        nearbyRides = await rideService.findNearbyRides(
          currentLocation[0],
          currentLocation[1],
          10000 // 10km radius
        )
      }

      setRides(nearbyRides)
      console.log('✅ Found rides:', nearbyRides.length)
    } catch (error: any) {
      console.error('❌ Error loading rides:', error)
      Alert.alert('Lỗi', 'Không thể tải danh sách chuyến xe')
    } finally {
      setLoading(false)
    }
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await loadNearbyRides()
    setRefreshing(false)
  }

  const handleRequestRide = (ride: NearbyRide) => {
    if (!user?.id) {
      Alert.alert('Lỗi', 'Vui lòng đăng nhập trước')
      return
    }

    // Navigate to ride detail screen with request
    navigation.navigate('RideDetailRequest', {
      rideId: ride._id,
      ride: ride,
    })
  }

  const renderRideCard = ({ item: ride }: { item: NearbyRide }) => {
    const availableSeats = ride.totalSeats - ride.customerId.length

    return (
      <View style={[styles.rideCard, { borderColor: colors.border }]}>
        {/* Driver Section */}
        <View style={[styles.driverSection, { borderBottomColor: colors.border }]}>
          <View style={[styles.driverAvatar, { backgroundColor: colors.primary }]}>
            <MaterialIcons name="person" size={28} color="#fff" />
          </View>
          <View style={styles.driverInfo}>
            <Text style={[styles.driverName, { color: colors.text }]}>
              {ride.driverId.firstName} {ride.driverId.lastName}
            </Text>
            <View style={styles.driverRating}>
              <MaterialIcons name="star" size={14} color="#FFB800" />
              <Text style={[styles.ratingText, { color: colors.text }]}>
                {ride.driverId.averageRating.toFixed(1)} ({ride.driverId.totalReviews} đánh giá)
              </Text>
            </View>
            <Text style={[styles.vehicleInfo, { color: colors.text }]}>
              {ride.driverId.vehicleModel} • {ride.driverId.vehiclePlate}
            </Text>
          </View>
        </View>

        {/* Route Section */}
        <View style={styles.routeSection}>
          <View style={styles.locationRow}>
            <View style={styles.locationIcon}>
              <MaterialIcons name="location-on" size={18} color="#4CAF50" />
            </View>
            <Text style={[styles.locationText, { color: colors.text }]}>
              {ride.pickupAddress}
            </Text>
          </View>
          <View style={styles.locationRow}>
            <View style={styles.locationIcon}>
              <MaterialIcons name="location-on" size={18} color="#F44336" />
            </View>
            <Text style={[styles.locationText, { color: colors.text }]}>
              {ride.dropoffAddress}
            </Text>
          </View>
        </View>

        {/* Seats and Distance */}
        <View style={[styles.seatsInfo, { borderBottomColor: colors.border }]}>
          <Text style={[styles.seatsText, { color: colors.text }]}>
            Ghế trống: <Text style={{ fontWeight: 'bold' }}>{availableSeats}/{ride.totalSeats}</Text>
          </Text>
          <View style={styles.distanceInfo}>
            <MaterialIcons name="directions" size={16} color={colors.primary} />
            <Text style={[styles.distanceText, { color: colors.text }]}>
              {ride.distance.toFixed(1)} km
            </Text>
          </View>
        </View>

        {/* Price Section */}
        <View style={[styles.priceSection, { borderTopColor: colors.border }]}>
          <View style={styles.distanceInfo}>
            <MaterialIcons name="access-time" size={16} color={colors.primary} />
            <Text style={[styles.distanceText, { color: colors.text }]}>
              {new Date(ride.createdAt).toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
          <View style={styles.priceContainer}>
            <Text style={[styles.priceLabel, { color: colors.text }]}>Giá dự kiến</Text>
            <Text style={[styles.price, { color: colors.primary }]}>
              ₫{ride.totalFare.toLocaleString()}
            </Text>
          </View>
        </View>

        {/* Action Button */}
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.primary }]}
          onPress={() => handleRequestRide(ride)}
          disabled={availableSeats <= 0}
          activeOpacity={0.7}
        >
          <MaterialIcons
            name={availableSeats > 0 ? 'check-circle' : 'block'}
            size={20}
            color="#fff"
          />
          <Text style={[styles.actionButtonText, { color: '#fff' }]}>
            {availableSeats > 0 ? 'Yêu cầu tham gia' : 'Ghế đã đầy'}
          </Text>
        </TouchableOpacity>
      </View>
    )
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Tìm chuyến xe</Text>
        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
          {rides.length} chuyến xe gần bạn
        </Text>
      </View>

      <FlatList
        data={rides}
        renderItem={renderRideCard}
        keyExtractor={(item) => item._id}
        contentContainerStyle={rides.length === 0 ? { flexGrow: 1 } : styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialIcons name="directions-car" size={64} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.text }]}>
              Không tìm thấy chuyến xe
            </Text>
            <Text style={[styles.emptySubText, { color: colors.textSecondary }]}>
              Hãy thử lại hoặc thay đổi vị trí tìm kiếm
            </Text>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      />
    </SafeAreaView>
  )
}
