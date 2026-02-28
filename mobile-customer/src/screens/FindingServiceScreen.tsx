import { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { useNavigation, useRoute } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { hourlyServiceService } from '../services/hourlyServiceService'

export default function FindingServiceScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>()
  const route = useRoute()
  const { serviceId, serviceType } = route.params as any

  const [status, setStatus] = useState('finding') // finding, found, error
  const [elapsedTime, setElapsedTime] = useState(0)
  const [service, setService] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [navigateCountdown, setNavigateCountdown] = useState(0)

  useEffect(() => {
    if (!serviceId) {
      setError('Không tìm thấy ID dịch vụ')
      return
    }

    // Fetch service detail
    const fetchService = async () => {
      try {
        const data = await hourlyServiceService.getServiceDetail(serviceId)
        setService(data)
        console.log('[FindingService] Service detail:', data)
      } catch (err: any) {
        console.error('[FindingService] Error fetching service:', err)
        setError(err.message || 'Không thể lấy thông tin dịch vụ')
      }
    }

    fetchService()

    // Timer for elapsed time
    const timer = setInterval(() => {
      setElapsedTime((prev) => prev + 1)
    }, 1000)

    // Simulate finding after 3-5 seconds
    const findingTimeout = setTimeout(() => {
      setStatus('found')
      console.log('[FindingService] Worker found!')
    }, 3000 + Math.random() * 2000)

    return () => {
      clearInterval(timer)
      clearTimeout(findingTimeout)
    }
  }, [serviceId])

  // Auto navigate to ServiceDetails when worker found
  useEffect(() => {
    if (status === 'found') {
      setNavigateCountdown(2)
    }
  }, [status])

  // Handle navigation when countdown reaches 0
  useEffect(() => {
    if (status === 'found' && navigateCountdown === 0) {
      navigation.navigate('ServiceDetail' as never, {
        serviceId,
        serviceType,
      } as never)
    }
  }, [navigateCountdown, status, serviceId, serviceType, navigation])

  // Countdown timer
  useEffect(() => {
    if (status === 'found' && navigateCountdown > 0) {
      const countdownTimer = setInterval(() => {
        setNavigateCountdown((prev) => prev - 1)
      }, 1000)

      return () => clearInterval(countdownTimer)
    }
  }, [status, navigateCountdown])

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

  const handleContinue = () => {
    navigation.navigate('ServiceDetail' as never, {
      serviceId,
      serviceType,
    } as never)
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <MaterialIcons name="error-outline" size={80} color="#ef4444" />
          <Text style={styles.errorTitle}>Lỗi</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.retryButtonText}>Quay lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {status === 'finding' ? (
          <>
            <View style={styles.animationContainer}>
              <View style={[styles.circle, styles.circle1]} />
              <View style={[styles.circle, styles.circle2]} />
              <View style={[styles.circle, styles.circle3]} />
              <ActivityIndicator
                size="large"
                color="#0d7ff2"
                style={styles.spinner}
              />
            </View>

            <Text style={styles.title}>Đang tìm nhân viên...</Text>
            <Text style={styles.subtitle}>
              {serviceType === 'hourly'
                ? 'Tìm kiếm nhân viên vệ sinh gần bạn'
                : 'Đang tìm kiếm'}
            </Text>

            {service && (
              <View style={styles.serviceInfo}>
                <View style={styles.infoItem}>
                  <MaterialIcons name="access-time" size={20} color="#0d7ff2" />
                  <Text style={styles.infoText}>{service.hours} giờ</Text>
                </View>
                <View style={styles.infoItem}>
                  <MaterialIcons name="location-on" size={20} color="#0d7ff2" />
                  <Text style={styles.infoText} numberOfLines={1}>
                    {service.address}
                  </Text>
                </View>
                <View style={styles.infoItem}>
                  <MaterialIcons name="attach-money" size={20} color="#0d7ff2" />
                  <Text style={styles.infoText}>
                    {service.estimatedPrice.toLocaleString('vi-VN')}đ
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.timerContainer}>
              <Text style={styles.timerLabel}>Thời gian tìm kiếm</Text>
              <Text style={styles.timerValue}>{elapsedTime}s</Text>
            </View>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancel}
            >
              <Text style={styles.cancelButtonText}>Hủy dịch vụ</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.successContainer}>
              <View style={styles.successIcon}>
                <MaterialIcons name="check-circle" size={80} color="#10b981" />
              </View>
            </View>

            <Text style={styles.title}>Đã tìm thấy nhân viên!</Text>
            <Text style={styles.subtitle}>
              Nhân viên sắp đến phục vụ. Vui lòng chuẩn bị!
            </Text>

            {service && (
              <View style={styles.serviceInfo}>
                <View style={styles.infoItem}>
                  <MaterialIcons name="access-time" size={20} color="#10b981" />
                  <Text style={styles.infoText}>{service.hours} giờ</Text>
                </View>
                <View style={styles.infoItem}>
                  <MaterialIcons name="location-on" size={20} color="#10b981" />
                  <Text style={styles.infoText} numberOfLines={1}>
                    {service.address}
                  </Text>
                </View>
                <View style={styles.infoItem}>
                  <MaterialIcons name="attach-money" size={20} color="#10b981" />
                  <Text style={styles.infoText}>
                    {service.estimatedPrice.toLocaleString('vi-VN')}đ
                  </Text>
                </View>
              </View>
            )}

            {/* Auto-navigate countdown */}
            <View style={styles.countdownContainer}>
              <Text style={styles.countdownLabel}>Chuyển trang trong</Text>
              <Text style={styles.countdownValue}>{navigateCountdown}s</Text>
            </View>

            <TouchableOpacity
              style={styles.continueButton}
              onPress={() => {
                navigation.navigate('ServiceDetail' as never, {
                  serviceId,
                  serviceType,
                } as never)
              }}
            >
              <Text style={styles.continueButtonText}>Xem chi tiết ngay</Text>
              <MaterialIcons name="arrow-forward" size={20} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancel}
            >
              <Text style={styles.cancelButtonText}>Hủy dịch vụ</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  animationContainer: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    position: 'relative',
  },
  circle: {
    position: 'absolute',
    borderRadius: 100,
    borderWidth: 3,
    borderColor: '#0d7ff2',
  },
  circle1: {
    width: 120,
    height: 120,
    opacity: 0.3,
  },
  circle2: {
    width: 160,
    height: 160,
    opacity: 0.2,
  },
  circle3: {
    width: 200,
    height: 200,
    opacity: 0.1,
  },
  spinner: {
    position: 'absolute',
  },
  successContainer: {
    marginBottom: 40,
    alignItems: 'center',
  },
  successIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#d1fae5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 32,
  },
  serviceInfo: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0f172a',
    flex: 1,
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  timerLabel: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 4,
    fontWeight: '500',
  },
  timerValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0d7ff2',
  },
  countdownContainer: {
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#dcfce7',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#10b981',
  },
  countdownLabel: {
    fontSize: 12,
    color: '#059669',
    marginBottom: 4,
    fontWeight: '600',
  },
  countdownValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#10b981',
  },
  continueButton: {
    width: '100%',
    backgroundColor: '#0d7ff2',
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    elevation: 3,
  },
  continueButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  cancelButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#64748b',
    fontWeight: '600',
    fontSize: 14,
  },
  retryButton: {
    backgroundColor: '#0d7ff2',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginTop: 24,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
  },
})
