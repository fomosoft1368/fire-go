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

  useEffect(() => {
    if (!request) {
      // Load request details from API if not provided
      setLoading(false)
    }
  }, [request])

  const handleAcceptRequest = async () => {
    try {
      setAccepting(true)
      console.log('[HourlyRequestDetail] Accepting hourly request:', requestId)
      
      // In real app, call API to accept
      // await driverService.acceptHourlyRequest(requestId)
      
      Alert.alert('Thành công', 'Bạn đã nhận nhiệm vụ này!', [
        {
          text: 'OK',
          onPress: () => {
            // Navigate to active request or back
            navigation.goBack()
          },
        },
      ])
    } catch (error: any) {
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
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chi tiết nhiệm vụ</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status Badge */}
        <View style={styles.statusSection}>
          <View style={[styles.statusBadge, { backgroundColor: '#fff5eb' }]}>
            <MaterialIcons name="pending-actions" size={20} color={COLORS.primary} />
            <Text style={styles.statusText}>Chờ nhận</Text>
          </View>
        </View>

        {/* Customer Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Thông tin khách hàng</Text>
          <View style={styles.customerSection}>
            <Image
              source={{
                uri: request.customerId.avatar || 'https://via.placeholder.com/80x80?text=Avatar',
              }}
              style={styles.customerAvatar}
            />
            <View style={styles.customerInfo}>
              <Text style={styles.customerName}>
                {request.customerId.firstName} {request.customerId.lastName}
              </Text>
              <View style={styles.contactRow}>
                <MaterialIcons name="phone" size={14} color="#64748b" />
                <Text style={styles.contactText}>{request.customerId.phone}</Text>
              </View>
              <View style={styles.contactRow}>
                <MaterialIcons name="email" size={14} color="#64748b" />
                <Text style={styles.contactText}>{request.customerId.email || 'N/A'}</Text>
              </View>
            </View>
          </View>
        </View>

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
              <Text style={styles.infoLabel}>Thời gian</Text>
              <Text style={styles.infoValue}>
                {new Date(request.selectedDate).toLocaleDateString('vi-VN')} lúc {request.selectedTime}
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
          {selectedServices.map((service, index) => (
            <View key={index}>
              <View style={styles.serviceRow}>
                <View style={styles.serviceInfo}>
                  <Text style={styles.serviceName}>{service.name}</Text>
                </View>
                <Text style={styles.servicePrice}>
                  {(service.price / 1000).toFixed(0)}k
                </Text>
              </View>
              {index < selectedServices.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </View>

        {/* Notes */}
        {request.notes && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Ghi chú</Text>
            <Text style={styles.notesText}>{request.notes}</Text>
          </View>
        )}

        {/* Pricing Summary */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Chi phí</Text>
          
          <View style={styles.pricingRow}>
            <Text style={styles.pricingLabel}>Tổng giá</Text>
            <Text style={styles.pricingValue}>
              {(totalPrice / 1000).toFixed(0)}k
            </Text>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.bottomActions}>
        <TouchableOpacity style={styles.rejectButton} onPress={() => navigation.goBack()}>
          <Text style={styles.rejectButtonText}>Từ chối</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.acceptButton, accepting && styles.acceptButtonLoading]}
          onPress={handleAcceptRequest}
          disabled={accepting}
        >
          {accepting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <MaterialIcons name="check-circle" size={20} color="#fff" />
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
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  statusSection: {
    marginBottom: 16,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
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
    gap: 12,
    marginBottom: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 12,
  },
  serviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '500',
  },
  servicePrice: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  notesText: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 20,
  },
  pricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pricingLabel: {
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '600',
  },
  pricingValue: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primary,
  },
  bottomActions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  rejectButton: {
    flex: 1,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    alignItems: 'center',
  },
  rejectButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#64748b',
  },
  acceptButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 14,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  acceptButtonLoading: {
    opacity: 0.7,
  },
  acceptButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
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
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    fontWeight: '600',
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    marginTop: 12,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
})
