import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { useSelector } from 'react-redux'
import type { RootState } from '../redux/store'
import { hourlyServiceService } from '../services/hourlyServiceService'
import { COLORS } from '../constants'

interface RequestDetail {
  _id: string
  customerId: {
    _id: string
    firstName: string
    lastName: string
    phone: string
    email: string
    avatar?: string
  }
  hours: number
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
  address: string
  selectedDate: number
  selectedTime: string
  month?: number
  year?: number
  estimatedPrice: number
  actualPrice?: number
  services: Array<{
    name: string
    price: number
    selected: boolean
  }>
  notes?: string
  createdAt: string
  distance?: number
}

export default function HourlyRequestDetailScreen({ route, navigation }: any) {
  const { request, requestId } = route.params as { request?: RequestDetail; requestId: string }
  const [loading, setLoading] = useState(!request)
  const [accepting, setAccepting] = useState(false)
  const { user } = useSelector((state: RootState) => state.auth)

  useEffect(() => {
    if (!request) {
      // Load request details from API if not provided
      setLoading(false)
    }
  }, [request])

  const handleAcceptRequest = async () => {
    try {
      if (!user?.id) {
        Alert.alert('Lỗi', 'Không tìm thấy thông tin tài xế')
        return
      }

      setAccepting(true)
      console.log('[HourlyRequestDetail] Accepting hourly request:', requestId, 'for driver:', user.id)

      // Call API to accept and assign worker
      await hourlyServiceService.acceptService(requestId, user.id)

      Alert.alert('Thành công', 'Bạn đã nhận nhiệm vụ này!', [
        {
          text: 'OK',
          onPress: () => {
            // Navigate to ActiveHourlyService
            navigation.replace('ActiveHourlyService', { serviceId: requestId })
          },
        },
      ])
    } catch (error: any) {
      console.error('[HourlyRequestDetail] Error accepting request:', error)
      Alert.alert('Lỗi', error.message || 'Không thể nhận nhiệm vụ')
    } finally {
      setAccepting(false)
    }
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

  if (!request) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={48} color="#ef4444" />
          <Text style={styles.errorText}>Không thể tải chi tiết nhiệm vụ</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>Quay lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  const selectedServices = request.services.filter((s) => s.selected)
  const totalPrice = request.estimatedPrice

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButtonHeader}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chi tiết nhiệm vụ</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Location & Time */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Vị trí & Thời gian</Text>

          <View style={styles.infoRow}>
            <MaterialIcons name="location-on" size={20} color={COLORS.primary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Địa chỉ</Text>
              <Text style={styles.infoValue}>{request.address}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <MaterialIcons name="schedule" size={20} color={COLORS.primary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Thời gian yêu cầu</Text>
              <Text style={styles.infoValue}>
                {request.year && request.month
                  ? new Date(request.year, request.month - 1, request.selectedDate).toLocaleDateString(
                      'vi-VN',
                      { year: 'numeric', month: '2-digit', day: '2-digit' }
                    )
                  : 'N/A'}{' '}
                lúc {request.selectedTime}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <MaterialIcons name="history" size={20} color={COLORS.primary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Ngày đăng</Text>
              <Text style={styles.infoValue}>
                {new Date(request.createdAt).toLocaleDateString('vi-VN', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <MaterialIcons name="access-time" size={20} color={COLORS.primary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Thời lượng</Text>
              <Text style={styles.infoValue}>{request.hours} giờ</Text>
            </View>
          </View>
        </View>

        {/* Services */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Dịch vụ</Text>
          <View style={styles.servicesContainer}>
            {selectedServices.map((service, index) => (
              <View key={index} style={styles.serviceBadge}>
                <MaterialIcons name="check-circle" size={16} color={COLORS.primary} />
                <View style={styles.serviceInfoBadge}>
                  <Text style={styles.serviceNameBadge}>{service.name}</Text>
                  <Text style={styles.servicePriceBadge}>
                    {(service.price / 1000).toFixed(0)}k
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Notes */}
        {request.notes && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Ghi chú</Text>
            <Text style={styles.notesText}>{request.notes}</Text>
          </View>
        )}

        {/* Pricing Summary */}
        <View style={styles.pricingCard}>
          <View style={styles.pricingRowHeader}>
            <Text style={styles.pricingLabelHeader}>Tổng chi phí</Text>
            <MaterialIcons name="local-offer" size={20} color={COLORS.primary} />
          </View>
          <View style={styles.pricingRowValue}>
            <Text style={styles.pricingValue}>
              {(totalPrice / 1000).toFixed(0)}k đ
            </Text>
            <Text style={styles.pricingNote}>/nhiệm vụ</Text>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.bottomActions}>
        <TouchableOpacity
          style={[styles.acceptButton, accepting && styles.acceptButtonLoading]}
          onPress={handleAcceptRequest}
          disabled={accepting}
          activeOpacity={0.8}
        >
          {accepting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <MaterialIcons name="done-all" size={20} color="#fff" />
              <Text style={styles.acceptButtonText}>Nhận nhiệm vụ</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f4f8',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 46,
    paddingBottom: 12,
    backgroundColor: COLORS.primary,
    zIndex: 10,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  backButtonHeader: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 110,
    paddingBottom: 20,
  },
  statusSection: {
    marginBottom: 16,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    gap: 10,
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  statusTextBadge: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 0,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  pricingCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  pricingRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  pricingLabelHeader: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  pricingRowValue: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  customerSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  customerAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  customerInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  customerName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  contactText: {
    fontSize: 12,
    color: '#64748b',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    marginBottom: 14,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 6,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  infoValue: {
    fontSize: 15,
    color: '#0f172a',
    fontWeight: '600',
    lineHeight: 22,
  },
  divider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 12,
  },
  servicesContainer: {
    gap: 10,
  },
  serviceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 11,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 10,
  },
  serviceInfoBadge: {
    flex: 1,
  },
  serviceNameBadge: {
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '600',
  },
  servicePriceBadge: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '700',
    marginTop: 2,
  },
  notesText: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 20,
  },
  pricingValue: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.primary,
  },
  pricingNote: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  bottomActions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  acceptButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 16,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  acceptButtonLoading: {
    opacity: 0.7,
  },
  acceptButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.2,
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
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 17,
    color: '#ef4444',
    fontWeight: '700',
    textAlign: 'center',
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  notesText: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 22,
    fontWeight: '500',
  },
  customerSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  customerAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  customerInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  customerName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  contactText: {
    fontSize: 12,
    color: '#64748b',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
})
