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
  Linking,
} from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { useNavigation, useRoute } from '@react-navigation/native'
import { hourlyServiceService } from '../services/hourlyServiceService'
import MapViewComponent from '@/components/MapView'

export default function ServiceDetailScreen() {
  const navigation = useNavigation()
  const route = useRoute()
  const { serviceId } = route.params as any

  const [service, setService] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [hasNavigatedToRating, setHasNavigatedToRating] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    const fetchServiceDetail = async (isInitial = false) => {
      try {
        if (isInitial) setLoading(true)
        const data = await hourlyServiceService.getServiceDetail(serviceId)

        console.log('[ServiceDetail] Raw data from API:', data)

        // Transform data - driver info is returned at top level (from workerId population)
        let transformedData: any = { ...data }

        // Mongoose populates workerId as an object
        const workerInfo: any = data.workerId
        const hasDriverInfo = workerInfo && typeof workerInfo === 'object' && workerInfo.firstName

        if (hasDriverInfo) {
          transformedData.worker = {
            _id: workerInfo._id,
            name: `${workerInfo.firstName} ${workerInfo.lastName}`,
            avatar: workerInfo.avatar || 'https://via.placeholder.com/64x64?text=Avatar',
            rating: workerInfo.averageRating || 4.9,
            ratings: workerInfo.totalRides || workerInfo.completedRides || 0,
            phone: workerInfo.phone,
          }
          console.log('[ServiceDetail] Worker info extracted:', transformedData.worker)
        } else {
          // Fallback nếu không có driver info
          transformedData.worker = {
            _id: typeof data.workerId === 'string' ? data.workerId : '',
            name: 'Nhân viên',
            avatar: 'https://via.placeholder.com/64x64?text=Avatar',
            rating: 4.9,
            ratings: 0,
            phone: '',
          }
          console.log('[ServiceDetail] Using fallback worker placeholder')
        }

        setService(transformedData)
      } catch (err: any) {
        console.error('[ServiceDetail] Error fetching service:', err)
      } finally {
        if (isInitial) setLoading(false)
      }
    }

    if (serviceId) {
      // Initial fetch
      fetchServiceDetail(true)

      // Polling only for pending/confirmed status
      const interval = setInterval(() => {
        fetchServiceDetail(false)
      }, 5000)

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
            month: service.month,
            year: service.year,
            selectedTime: service.selectedTime,
            services: service.services || [],
          },
        })
      }, 500)
    }
  }, [service, hasNavigatedToRating, navigation])

  const handleCall = () => {
    if (service?.worker?.phone) {
      Linking.openURL(`tel:${service.worker.phone}`)
    }
  }

  const handleChat = () => {
    if (!service?.worker) return
    const workerId = service.worker._id || service.worker.id || ''
    if (!workerId) return

    ;(navigation as any).navigate('ChatScreen', {
      driver: {
        id: workerId,
        name: service.worker.name || 'Nhân viên',
        phone: service.worker.phone || '',
      },
      rideId: service._id,
    })
  }

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
    <View style={styles.container}>
      <View style={StyleSheet.absoluteFillObject}>
        <MapViewComponent
          height="100%" />
      </View>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={[styles.backButton, { backgroundColor: "#fff" }]} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#FF6B00" />
        </TouchableOpacity>
        <Text style={styles.logoText}>firego</Text>
      </View>

      <View style={[styles.card, { maxHeight: isExpanded ? '90%' : '65%' }]}>
        <TouchableOpacity 
          style={styles.expandToggleButton} 
          onPress={() => setIsExpanded(!isExpanded)}
          activeOpacity={0.7}
        >
          <Text style={styles.expandToggleText}>
            {isExpanded ? 'Thu gọn' : 'Mở rộng'}
          </Text>
          <MaterialIcons 
            name={isExpanded ? "keyboard-arrow-down" : "keyboard-arrow-up"} 
            size={20} 
            color="#FF6B00" 
          />
        </TouchableOpacity>

        <ScrollView
          style={styles.contentOverlay}
          showsVerticalScrollIndicator={false}
        >
          {/* Status Badge */}
          <View style={[styles.statusBadgeInline, { backgroundColor: `${statusInfo.color}15` }]}>
            <View style={[styles.statusDotInline, { backgroundColor: statusInfo.color }]} />
            <Text style={[styles.statusTextInline, { color: statusInfo.color }]}>
              {statusInfo.label}
            </Text>
          </View>

          {/* ETA Section - Redesigned */}
          <View style={styles.etaCard}>
            <View style={styles.etaIconContainer}>
              <MaterialIcons name="schedule" size={24} color="#FF6B00" />
            </View>
            <View style={styles.etaContent}>
              <Text style={styles.etaLabel}>Thời gian làm việc</Text>
              <Text style={styles.etaTime}>{service.selectedTime}</Text>
              <Text style={styles.etaDate}>
                {service.year && service.month
                  ? new Date(service.year, service.month - 1, service.selectedDate).toLocaleDateString(
                      'vi-VN',
                      { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
                    )
                  : 'N/A'}
              </Text>
            </View>
            <View style={styles.progressBadge}>
              <View style={[styles.progressDotLarge, { backgroundColor: service.status === 'in_progress' ? '#10b981' : '#f59e0b' }]} />
              <Text style={[styles.progressPercentLarge, { color: service.status === 'in_progress' ? '#10b981' : '#f59e0b' }]}>
                {service.status === 'in_progress' ? '65%' : service.status === 'confirmed' ? '30%' : '0%'}
              </Text>
            </View>
          </View>

          {/* Progress Bar - Enhanced */}
          <View style={styles.progressSection}>
            <View style={styles.progressBarContainer}>
              <View
                style={[
                  styles.progressBar,
                  {
                    width: service.status === 'in_progress' ? '65%' : service.status === 'confirmed' ? '30%' : '0%',
                    backgroundColor: service.status === 'in_progress' ? '#10b981' : '#f59e0b',
                  },
                ]}
              />
            </View>
            <View style={styles.progressSteps}>
              <View style={styles.progressStep}>
                <View style={[styles.stepDot, service.status !== 'pending' && styles.stepDotActive]} />
                <Text style={styles.stepLabel}>Đã xác nhận</Text>
              </View>
              <View style={styles.progressStep}>
                <View style={[styles.stepDot, service.status === 'in_progress' && styles.stepDotActive]} />
                <Text style={styles.stepLabel}>Đang làm</Text>
              </View>
              <View style={styles.progressStep}>
                <View style={[styles.stepDot, service.status === 'completed' && styles.stepDotActive]} />
                <Text style={styles.stepLabel}>Hoàn thành</Text>
              </View>
            </View>
          </View>

          {/* Worker Card - Redesigned */}
          <View style={styles.workerCardNew}>
            {service.worker ? (
              <>
                <View style={styles.workerInfoNew}>
                  <View style={styles.avatarWrapper}>
                    <Image
                      source={{ uri: service.worker.avatar || 'https://via.placeholder.com/64x64?text=Avatar' }}
                      style={styles.workerAvatarNew}
                    />
                    <View style={styles.onlineBadge}>
                      <View style={styles.onlineDot} />
                    </View>
                  </View>
                  <View style={styles.workerDetailsNew}>
                    <Text style={styles.workerNameNew}>{service.worker.name}</Text>
                    <View style={styles.ratingContainerNew}>
                      <MaterialIcons name="star" size={14} color="#fbbf24" />
                      <Text style={styles.ratingTextNew}>{service.worker.rating || 4.9}</Text>
                      <Text style={styles.ratingDivider}>•</Text>
                      <Text style={styles.ratingCountNew}>{service.worker.ratings || 128} đánh giá</Text>
                    </View>
                    <View style={styles.badgeContainer}>
                      <View style={styles.verifiedBadge}>
                        <MaterialIcons name="verified" size={12} color="#10b981" />
                        <Text style={styles.verifiedText}>Đã xác thực</Text>
                      </View>
                    </View>
                  </View>
                </View>

                <View style={styles.actionButtons}>
                  <TouchableOpacity style={styles.messageButton} onPress={handleChat}>
                    <View style={styles.buttonIcon}>
                      <MaterialIcons name="chat-bubble-outline" size={20} color="#FF6B00" />
                    </View>
                    <Text style={styles.messageButtonText}>Nhắn tin</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.phoneButton} onPress={handleCall}>
                    <View style={styles.buttonIcon}>
                      <MaterialIcons name="phone" size={20} color="#fff" />
                    </View>
                    <Text style={styles.phoneButtonText}>Gọi điện</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <View style={styles.searchingWorker}>
                <View style={styles.searchingAnimation}>
                  <ActivityIndicator size="small" color="#FF6B00" />
                </View>
                <Text style={styles.searchingText}>Đang tìm nhân viên phù hợp...</Text>
                <Text style={styles.searchingSubtext}>Vui lòng chờ trong giây lát</Text>
              </View>
            )}
          </View>

          {/* Service Details - Redesigned */}
          <View style={styles.serviceDetailsCard}>
            <View style={styles.serviceHeader}>
              <MaterialIcons name="receipt-long" size={16} color="#64748b" />
              <Text style={styles.serviceHeaderText}>Chi tiết dịch vụ</Text>
            </View>

            {/* Main Service */}
            <View style={styles.mainServiceItemNew}>
              <View style={styles.serviceIconNew}>
                <MaterialIcons name="home-work" size={24} color="#FF6B00" />
              </View>
              <View style={styles.serviceInfoNew}>
                <Text style={styles.serviceNameNew}>Dọn dẹp căn hộ {service.hours}PN</Text>
                <Text style={styles.serviceSubtextNew}>Gói tiêu chuẩn • {service.hours} giờ</Text>
              </View>
              <Text style={styles.servicePriceNew}>
                {(service.hours * 250000).toLocaleString('vi-VN')}đ
              </Text>
            </View>

            {/* Add-ons */}
            {service.services && service.services.filter((s: any) => s.selected).length > 0 && (
              <View style={styles.addonsSection}>
                <Text style={styles.addonsSectionTitle}>Dịch vụ bổ sung</Text>
                {service.services
                  .filter((s: any) => s.selected)
                  .map((addon: any, index: number) => (
                    <View key={index} style={styles.addonRowNew}>
                      <View style={styles.addonIconNew}>
                        <MaterialIcons name="add-circle-outline" size={16} color="#64748b" />
                      </View>
                      <Text style={styles.addonLabelNew}>{addon.name}</Text>
                      <Text style={styles.addonPriceNew}>
                        +{addon.price.toLocaleString('vi-VN')}đ
                      </Text>
                    </View>
                  ))}
              </View>
            )}

            {/* Location */}
            <View style={styles.locationSection}>
              <View style={styles.locationIconContainer}>
                <MaterialIcons name="location-on" size={20} color="#ef4444" />
              </View>
              <View style={styles.locationInfo}>
                <Text style={styles.locationLabel}>Địa chỉ làm việc</Text>
                <Text style={styles.locationAddress}>{service.address}</Text>
              </View>
            </View>

            {/* Total */}
            <View style={styles.totalContainerNew}>
              <View style={styles.totalLeft}>
                <Text style={styles.totalLabelNew}>Tổng thanh toán</Text>
                <Text style={styles.totalSubtext}>Đã bao gồm VAT</Text>
              </View>
              <Text style={styles.totalPriceNew}>
                {service.estimatedPrice.toLocaleString('vi-VN')}đ
              </Text>
            </View>
          </View>

          <View style={{ height: 120 }} />
        </ScrollView>

        {/* Bottom Actions */}
        {(service.status === 'pending' || service.status === 'confirmed') && (
          <View style={styles.actionBtn}>
            <TouchableOpacity
              style={styles.cancelActionButton}
              onPress={handleCancel}
            >
              <MaterialIcons name="close" size={20} color="#ef4444" />
              <Text style={styles.cancelActionButtonText}>Hủy dịch vụ</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    position: 'absolute',
    top: 50,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    zIndex: 10,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  logoText: {
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: -0.5,
    color: '#FF6B00',
  },
  card: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 0,
    paddingTop: 8,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 20,
    maxHeight: '65%',
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
  contentOverlay: {
    paddingHorizontal: 20,
  },

  // Status Badge Inline
  statusBadgeInline: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
    gap: 6,
  },
  statusDotInline: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusTextInline: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // ETA Card - New Design
  etaCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  etaIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#fff7ed',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  etaContent: {
    flex: 1,
    justifyContent: 'center',
  },
  etaLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  etaTime: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 2,
  },
  etaDate: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },
  progressBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 12,
  },
  progressDotLarge: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginBottom: 4,
  },
  progressPercentLarge: {
    fontSize: 18,
    fontWeight: '800',
  },

  // Progress Section
  progressSection: {
    marginBottom: 20,
  },
  progressBarContainer: {
    width: '100%',
    height: 6,
    backgroundColor: '#e2e8f0',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  progressSteps: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressStep: {
    alignItems: 'center',
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e2e8f0',
    marginBottom: 4,
  },
  stepDotActive: {
    backgroundColor: '#10b981',
  },
  stepLabel: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '600',
  },

  // Worker Card - New Design
  workerCardNew: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  workerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  workerHeaderText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  workerInfoNew: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: 12,
  },
  workerAvatarNew: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#e2e8f0',
    borderWidth: 3,
    borderColor: '#fff',
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  onlineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10b981',
  },
  workerDetailsNew: {
    flex: 1,
    justifyContent: 'center',
  },
  workerNameNew: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  ratingContainerNew: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  ratingTextNew: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  ratingDivider: {
    fontSize: 12,
    color: '#cbd5e1',
    marginHorizontal: 2,
  },
  ratingCountNew: {
    fontSize: 12,
    color: '#64748b',
  },
  badgeContainer: {
    flexDirection: 'row',
    gap: 6,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 3,
  },
  verifiedText: {
    fontSize: 10,
    color: '#10b981',
    fontWeight: '700',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  messageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#FF6B00',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  messageButtonText: {
    color: '#FF6B00',
    fontWeight: '700',
    fontSize: 14,
  },
  phoneButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B00',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  phoneButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  buttonIcon: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchingWorker: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  searchingAnimation: {
    marginBottom: 12,
  },
  searchingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  searchingSubtext: {
    fontSize: 12,
    color: '#94a3b8',
  },

  // Service Details Card
  serviceDetailsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  serviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  serviceHeaderText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  mainServiceItemNew: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fafafa',
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 12,
    gap: 12,
  },
  serviceIconNew: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#fff7ed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  serviceInfoNew: {
    flex: 1,
  },
  serviceNameNew: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 3,
  },
  serviceSubtextNew: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  servicePriceNew: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FF6B00',
  },
  addonsSection: {
    paddingVertical: 8,
    marginBottom: 8,
  },
  addonsSectionTitle: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  addonRowNew: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    gap: 8,
  },
  addonIconNew: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addonLabelNew: {
    flex: 1,
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
  },
  addonPriceNew: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
  locationSection: {
    flexDirection: 'row',
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    gap: 12,
  },
  locationIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationInfo: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  locationAddress: {
    fontSize: 13,
    color: '#0f172a',
    fontWeight: '600',
    lineHeight: 18,
  },
  totalContainerNew: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  totalLeft: {
    flex: 1,
  },
  totalLabelNew: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '700',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  totalSubtext: {
    fontSize: 11,
    color: '#94a3b8',
  },
  totalPriceNew: {
    fontSize: 24,
    fontWeight: '800',
    color: '#10b981',
  },

  // Bottom Action Button
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginHorizontal: 20,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#fca5a5',
    marginTop: 12,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cancelActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  cancelActionButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ef4444',
    letterSpacing: 0.3,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
  },
})

