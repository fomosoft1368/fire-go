import { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { useNavigation, useRoute } from '@react-navigation/native'
import { hourlyServiceService } from '../services/hourlyServiceService'

interface Worker {
  id: string
  name: string
  avatar?: string
  rating?: number
  ratings?: number
}

export default function ServiceDetailScreen() {
  const navigation = useNavigation()
  const route = useRoute()
  const { serviceId, serviceType } = route.params as any

  const [service, setService] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [hasNavigatedToRating, setHasNavigatedToRating] = useState(false)

  useEffect(() => {
    const fetchServiceDetail = async (isInitial = false) => {
      try {
        if (isInitial) setLoading(true)
        const data = await hourlyServiceService.getServiceDetail(serviceId)
        
        // Hardcode worker data for testing
        const mockData = {
          ...data,
          worker: {
            id: 'worker-001',
            name: 'Nguyễn Thị Hoa',
            avatar: 'https://via.placeholder.com/56x56?text=Hoa',
            rating: 4.9,
            ratings: 128,
          },
        }
        
        setService(mockData)
        setError(null)
        console.log('[ServiceDetail] Service loaded:', mockData)
      } catch (err: any) {
        console.error('[ServiceDetail] Error fetching service:', err)
        setError(err.message || 'Không thể lấy thông tin dịch vụ')
      } finally {
        if (isInitial) setLoading(false)
      }
    }

    if (serviceId) {
      // Initial fetch
      fetchServiceDetail(true)
      
      // Polling for updates every 5 seconds (but don't show loading)
      const interval = setInterval(() => fetchServiceDetail(false), 5000)
      return () => clearInterval(interval)
    }
  }, [serviceId])

  // Navigate to rating screen when service is completed
  useEffect(() => {
    if (service && service.status === 'completed' && !hasNavigatedToRating) {
      setHasNavigatedToRating(true)
      setTimeout(() => {
        (navigation as any).navigate('ServiceRating', {
          serviceId: service._id,
          service: {
            _id: service._id,
            customerId: service.customerId,
            workerName: service.worker?.name || 'Nhân viên',
            workerAvatar: service.worker?.avatar,
            workerRating: service.worker?.rating,
            serviceName: `Dọn dẹp căn hộ ${service.hours}PN`,
            hours: service.hours,
            estimatedPrice: service.estimatedPrice,
            address: service.address,
            selectedDate: service.selectedDate,
            selectedTime: service.selectedTime,
            services: service.services || [],
          },
        })
      }, 500)
    }
  }, [service, hasNavigatedToRating, navigation])

  const handleCancel = () => {
    Alert.alert('Hủy dịch vụ', 'Bạn có chắc muốn hủy dịch vụ này?', [
      { text: 'Không', style: 'cancel' },
      {
        text: 'Có, hủy bỏ',
        onPress: async () => {
          try {
            await hourlyServiceService.cancelService(serviceId, 'Khách hàng hủy')
            navigation.goBack()
          } catch (err) {
            Alert.alert('Lỗi', 'Không thể hủy dịch vụ. Vui lòng thử lại.')
          }
        },
        style: 'destructive',
      },
    ])
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0d7ff2" />
          <Text style={styles.loadingText}>Đang tải thông tin...</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (error || !service) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color="#0f172a" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chi tiết dịch vụ</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={64} color="#ef4444" />
          <Text style={styles.errorText}>{error || 'Không thể lấy thông tin'}</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Quay lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { color: string; label: string }> = {
      pending: { color: '#fbbf24', label: 'Chờ xác nhận' },
      confirmed: { color: '#a78bfa', label: 'Đã xác nhận' },
      in_progress: { color: '#60a5fa', label: 'Đang thực hiện' },
      completed: { color: '#34d399', label: 'Hoàn thành' },
      cancelled: { color: '#f87171', label: 'Đã hủy' },
    }
    return statusMap[status] || { color: '#cbd5e1', label: status }
  }

  const statusInfo = getStatusBadge(service.status)

  // Always show tracking view (for pending and confirmed states)
  return (
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color="#0f172a" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chi tiết dịch vụ</Text>
          <TouchableOpacity>
            <MaterialIcons name="more-horiz" size={24} color="#0f172a" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Map Placeholder */}
          <View style={styles.mapSection}>
            <Image
              source={{ uri: 'https://via.placeholder.com/400x300?text=Map+Location' }}
              style={styles.mapImage}
            />
            {/* Status Badge on Map */}
            <View style={styles.statusBadgeOnMap}>
              <View style={styles.statusDotAnimated} />
              <Text style={styles.statusBadgeText}>
                {service.status === 'in_progress' ? 'Đang làm việc' : 'Đã xác nhận'}
              </Text>
            </View>
          </View>

          {/* Content Overlay */}
          <View style={styles.contentOverlay}>
            {/* ETA & Progress Section */}
            <View style={styles.etaSection}>
              <View style={styles.etaLeft}>
                <Text style={styles.etaLabel}>Thời gian dự kiến hoàn thành</Text>
                <Text style={styles.etaTime}>
                  {service.selectedTime}
                </Text>
              </View>
              <View style={styles.etaRight}>
                <Text style={styles.progressLabel}>Tiến độ</Text>
                <View style={styles.progressValue}>
                  <View style={styles.progressDot} />
                  <Text style={styles.progressPercent}>
                    {service.status === 'in_progress' ? '65%' : '30%'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressBarContainer}>
              <View
                style={[
                  styles.progressBar,
                  {
                    width: service.status === 'in_progress' ? '65%' : '30%',
                  },
                ]}
              />
            </View>

            {/* Worker Card */}
            <View style={styles.workerCard}>
              <View style={styles.workerInfo}>
                <Image
                  source={{ uri: service.worker?.avatar || 'https://via.placeholder.com/56x56?text=Avatar' }}
                  style={styles.workerAvatar}
                />
                <View style={styles.workerDetails}>
                  <Text style={styles.workerName}>
                    {service.worker?.name || 'Chờ nhân viên...'}
                  </Text>
                  {service.worker && (
                    <View style={styles.ratingContainer}>
                      <MaterialIcons name="star" size={16} color="#fbbf24" />
                      <Text style={styles.ratingText}>
                        {service.worker.rating || 4.9}
                      </Text>
                      <Text style={styles.ratingCount}>
                        ({service.worker.ratings || 128} đánh giá)
                      </Text>
                    </View>
                  )}
                  {!service.worker && (
                    <Text style={styles.pendingText}>Đang tìm kiếm nhân viên...</Text>
                  )}
                </View>
              </View>
              <View style={styles.workerActions}>
                <TouchableOpacity style={[styles.chatButton, !service.worker && styles.disabledButton]}>
                  <MaterialIcons name="chat" size={18} color={service.worker ? '#fff' : '#cbd5e1'} />
                  <Text style={[styles.chatButtonText, !service.worker && styles.disabledButtonText]}>Chat</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.callButton, !service.worker && styles.disabledButton]}>
                  <MaterialIcons name="call" size={18} color={service.worker ? '#0d7ff2' : '#cbd5e1'} />
                  <Text style={[styles.callButtonText, !service.worker && styles.disabledButtonText]}>Gọi</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Service Details */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Chi tiết dịch vụ</Text>

              {/* Main Service */}
              <View style={styles.mainServiceItem}>
                <View style={styles.serviceIcon}>
                  <MaterialIcons name="home-work" size={20} color="#16a34a" />
                </View>
                <View style={styles.serviceInfo}>
                  <Text style={styles.serviceName}>Dọn dẹp căn hộ {service.hours}PN</Text>
                  <Text style={styles.serviceSubtext}>Gói tiêu chuẩn</Text>
                </View>
                <Text style={styles.servicePrice}>
                  {(service.hours * 250000).toLocaleString('vi-VN')}đ
                </Text>
              </View>

              {/* Add-ons */}
              {service.services && service.services.filter((s: any) => s.selected).length > 0 && (
                <View style={styles.addonsContainer}>
                  {service.services
                    .filter((s: any) => s.selected)
                    .map((addon: any, index: number) => (
                      <View key={index} style={styles.addonRow}>
                        <View style={styles.addonLeft}>
                          <MaterialIcons name="kitchen" size={16} color="#94a3b8" />
                          <Text style={styles.addonLabel}>{addon.name}</Text>
                        </View>
                        <Text style={styles.addonPrice}>
                          +{addon.price.toLocaleString('vi-VN')}đ
                        </Text>
                      </View>
                    ))}
                </View>
              )}

              {/* Total */}
              <View style={styles.totalContainer}>
                <Text style={styles.totalLabel}>Tổng cộng</Text>
                <Text style={styles.totalPrice}>
                  {service.estimatedPrice.toLocaleString('vi-VN')}đ
                </Text>
              </View>
            </View>

            <View style={{ height: 100 }} />
          </View>
        </ScrollView>

        {/* Bottom Actions */}
        <View style={styles.bottomActions}>
          <TouchableOpacity
            style={styles.cancelActionButton}
            onPress={handleCancel}
          >
            <Text style={styles.cancelActionButtonText}>Hủy dịch vụ</Text>
          </TouchableOpacity>
        </View>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    elevation: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  content: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
    fontWeight: '500',
  },
  backButton: {
    backgroundColor: '#0d7ff2',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginTop: 16,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  statusSection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusText: {
    fontWeight: '600',
    fontSize: 13,
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  detailIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#f0f7ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailContent: {
    flex: 1,
    justifyContent: 'center',
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0f172a',
  },
  addonItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  addonInfo: {
    flex: 1,
  },
  addonName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0f172a',
    marginBottom: 2,
  },
  addonDuration: {
    fontSize: 12,
    color: '#64748b',
  },
  addonPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0d7ff2',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  priceLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  priceValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  totalPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 8,
    borderTopWidth: 2,
    borderTopColor: '#0d7ff2',
  },
  totalPriceLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  totalPriceValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0d7ff2',
  },
  bottomActions: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    elevation: 8,
  },
  cancelActionButton: {
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelActionButtonText: {
    color: '#64748b',
    fontWeight: '600',
    fontSize: 14,
  },
  // Tracking View Styles
  mapSection: {
    position: 'relative',
    width: '100%',
    height: 280,
    backgroundColor: '#cbd5e1',
    overflow: 'hidden',
  },
  mapImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#e2e8f0',
  },
  statusBadgeOnMap: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    elevation: 3,
  },
  statusDotAnimated: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#37b34a',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#37b34a',
  },
  contentOverlay: {
    marginTop: -24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 100,
  },
  etaSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  etaLeft: {
    flex: 1,
  },
  etaRight: {
    alignItems: 'flex-end',
  },
  etaLabel: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
    marginBottom: 4,
  },
  etaTime: {
    fontSize: 26,
    fontWeight: '700',
    color: '#0f172a',
  },
  progressLabel: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
    marginBottom: 4,
  },
  progressValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#25f46a',
    marginRight: 4,
  },
  progressPercent: {
    fontSize: 16,
    fontWeight: '700',
    color: '#25f46a',
  },
  progressBarContainer: {
    width: '100%',
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 20,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#25f46a',
    borderRadius: 4,
  },
  workerCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  workerInfo: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  workerAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#cbd5e1',
    borderWidth: 2,
    borderColor: '#25f46a',
  },
  workerDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  workerName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  ratingCount: {
    fontSize: 12,
    color: '#94a3b8',
  },
  workerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  chatButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#25f46a',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  chatButtonText: {
    color: '#0f172a',
    fontWeight: '600',
    fontSize: 13,
  },
  callButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#0d7ff2',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  callButtonText: {
    color: '#0d7ff2',
    fontWeight: '600',
    fontSize: 13,
  },
  disabledButton: {
    opacity: 0.5,
    backgroundColor: '#f1f5f9',
  },
  disabledButtonText: {
    color: '#cbd5e1',
  },
  pendingText: {
    fontSize: 12,
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  mainServiceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
    gap: 12,
  },
  serviceIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#dcfce7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 2,
  },
  serviceSubtext: {
    fontSize: 12,
    color: '#94a3b8',
  },
  servicePrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  addonsContainer: {
    paddingLeft: 12,
    borderLeftWidth: 2,
    borderLeftColor: '#e2e8f0',
    gap: 12,
    marginBottom: 12,
  },
  addonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  addonLabel: {
    fontSize: 13,
    color: '#475569',
  },
  addonPrice: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  totalContainer: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '600',
  },
  totalPrice: {
    fontSize: 20,
    fontWeight: '800',
    color: '#25f46a',
  },
  // Dialog/Overlay specific
  mapOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
})

