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
  Image,
} from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { COLORS } from '../constants'
import * as Location from 'expo-location'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { hourlyServiceService, type HourlyRequest } from '../services/hourlyServiceService'

export default function HourlyRequestsScreen({ navigation }: any) {
  const [requests, setRequests] = useState<HourlyRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [accepting, setAccepting] = useState<string | null>(null)

  useEffect(() => {
    const initScreen = async () => {
      const token = await AsyncStorage.getItem('token')
      console.log('[HourlyRequests] Token exists:', !!token)
      
      if (!token) {
        Alert.alert(
          'Yêu cầu đăng nhập',
          'Bạn cần đăng nhập để xem danh sách nhiệm vụ',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        )
        return
      }
      
      loadNearbyRequests()
    }
    
    initScreen()
    
    // Auto refresh every 10 seconds
    const interval = setInterval(loadNearbyRequests, 10000)
    return () => clearInterval(interval)
  }, [])

  const loadNearbyRequests = async () => {
    try {
      console.log('[HourlyRequests] Loading nearby hourly requests...')
      
      // Get current location for distance calculation
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        console.warn('[HourlyRequests] Location permission not granted')
        // Continue without location data
      } else {
        const location = await Location.getCurrentPositionAsync({})
        const { latitude, longitude } = location.coords
        console.log('[HourlyRequests] Current location:', { latitude, longitude })
      }

      // Fetch pending hourly service requests from API
      const requests = await hourlyServiceService.getPendingServices(20, 0)
      setRequests(requests)
      console.log('[HourlyRequests] Found requests:', requests.length)
    } catch (error: any) {
      console.error('[HourlyRequests] Load error:', error)
      Alert.alert('Lỗi', error.message || 'Không thể tải danh sách nhiệm vụ')
      setRequests([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    setRefreshing(true)
    loadNearbyRequests()
  }

  const handleAccept = async (request: HourlyRequest) => {
    try {
      setAccepting(request._id)
      console.log('[HourlyRequests] Accepting hourly request:', request._id)
      
      // Navigate to request detail
      navigation.navigate('HourlyRequestDetail', {
        requestId: request._id,
        request: request,
        fromHourlyRequests: true,
      })
    } catch (error: any) {
      console.error('[HourlyRequests] Accept error:', error)
      Alert.alert('Lỗi', error.message || 'Không thể nhận nhiệm vụ')
    } finally {
      setAccepting(null)
    }
  }

  const renderRequestCard = ({ item }: { item: HourlyRequest }) => (
    <TouchableOpacity
      style={styles.requestCard}
      onPress={() => handleAccept(item)}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={styles.customerInfo}>
          <Image
            source={{
              uri: item.customerId.avatar || 'https://via.placeholder.com/48x48?text=Avatar',
            }}
            style={styles.avatar}
          />
          <View style={styles.customerDetails}>
            <Text style={styles.customerName}>
              {item.customerId.firstName} {item.customerId.lastName}
            </Text>
            <Text style={styles.customerPhone}>{item.customerId.phone}</Text>
          </View>
        </View>
        <View style={styles.priceTag}>
          <Text style={styles.priceText}>
            {(item.estimatedPrice / 1000).toFixed(0)}k
          </Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.serviceItem}>
          <MaterialIcons name="location-on" size={16} color={COLORS.primary} />
          <Text style={styles.serviceText} numberOfLines={2}>
            {item.address}
          </Text>
        </View>

        <View style={styles.serviceItem}>
          <MaterialIcons name="schedule" size={16} color={COLORS.primary} />
          <Text style={styles.serviceText}>
            {item.hours} giờ • {item.selectedTime}
          </Text>
        </View>

        <View style={styles.serviceItem}>
          <MaterialIcons name="home-work" size={16} color={COLORS.primary} />
          <Text style={styles.serviceText} numberOfLines={1}>
            {item.services.map((s) => s.name).join(', ')}
          </Text>
        </View>

        {item.distance && (
          <View style={styles.serviceItem}>
            <MaterialIcons name="near-me" size={16} color="#64748b" />
            <Text style={styles.distanceText}>{item.distance.toFixed(1)} km từ bạn</Text>
          </View>
        )}
      </View>

      <TouchableOpacity
        style={[styles.acceptButton, accepting === item._id && styles.acceptButtonLoading]}
        onPress={() => handleAccept(item)}
        disabled={accepting === item._id}
      >
        {accepting === item._id ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <>
            <MaterialIcons name="check-circle" size={18} color="#fff" />
            <Text style={styles.acceptButtonText}>Nhận nhiệm vụ</Text>
          </>
        )}
      </TouchableOpacity>
    </TouchableOpacity>
  )

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nhiệm vụ gần bạn</Text>
        <TouchableOpacity onPress={handleRefresh} disabled={refreshing}>
          <MaterialIcons
            name="refresh"
            size={24}
            color={refreshing ? '#cbd5e1' : COLORS.primary}
          />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Đang tải danh sách...</Text>
        </View>
      ) : requests.length > 0 ? (
        <FlatList
          data={requests}
          renderItem={renderRequestCard}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        />
      ) : (
        <View style={styles.emptyState}>
          <MaterialIcons name="inbox" size={64} color="#cbd5e1" />
          <Text style={styles.emptyText}>Không có nhiệm vụ nào</Text>
          <Text style={styles.emptySubText}>
            Hãy quay lại sau để kiểm tra những nhiệm vụ mới
          </Text>
        </View>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  requestCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 12,
    marginBottom: 8,
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  customerDetails: {
    flex: 1,
  },
  customerName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  customerPhone: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  priceTag: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  priceText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  cardBody: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  serviceText: {
    flex: 1,
    fontSize: 13,
    color: '#0f172a',
    fontWeight: '500',
  },
  distanceText: {
    flex: 1,
    fontSize: 12,
    color: '#64748b',
  },
  acceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    marginHorizontal: 12,
    marginBottom: 12,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  acceptButtonLoading: {
    opacity: 0.7,
  },
  acceptButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
    color: '#64748b',
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  emptySubText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
})
