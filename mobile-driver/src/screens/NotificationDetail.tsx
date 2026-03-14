import React from 'react'
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { SPACING } from '../constants'

type NotificationType = 'trip' | 'promo' | 'system' | 'earnings'

interface NotificationDetailProps {
  navigation?: any
  route?: {
    params?: {
      notification?: {
        id: string
        type: NotificationType
        title: string
        message: string
        time: string
        actionLabel?: string
        amount?: number
        details?: string
      }
    }
  }
}

export default function NotificationDetailScreen({ navigation, route }: NotificationDetailProps) {
  // Mock data - trong thực tế sẽ lấy từ route.params
  const notification = route?.params?.notification || {
    id: '1',
    type: 'trip' as NotificationType,
    title: 'Chuyến đi mới #X892',
    message: 'Bạn có chuyến đi mới từ Quận 1 đến Quận 7. Hành khách đang chờ.',
    time: '5 phút trước',
    actionLabel: 'Xem chi tiết',
    details: `**Chi tiết chuyến đi**

📍 **Điểm đón:** 123 Nguyễn Huệ, Quận 1, TP.HCM
📍 **Điểm đến:** 456 Nguyễn Văn Linh, Quận 7, TP.HCM

👤 **Hành khách:** Nguyễn Văn A
⭐ **Đánh giá:** 4.8 (120 chuyến)
📱 **SĐT:** 0901234567

💰 **Giá cước:** 85.000đ
🚗 **Loại xe:** Xe 4 chỗ
⏱️ **Thời gian dự kiến:** 25 phút
📏 **Khoảng cách:** 12.5 km

**Ghi chú từ khách:**
Vui lòng đợi ở cổng chính của tòa nhà. Xe màu trắng.`,
  }

  const getNotificationIcon = (type: NotificationType | string) => {
    const lowerType = String(type).toLowerCase()
    
    if (lowerType.includes('trip') || lowerType.includes('ride')) return 'local-taxi'
    if (lowerType.includes('promo') || lowerType.includes('promotion')) return 'card-giftcard'
    if (lowerType.includes('system') || lowerType.includes('message')) return 'info'
    if (lowerType.includes('earning') || lowerType.includes('payment') || lowerType.includes('wallet')) return 'account-balance-wallet'
    if (lowerType.includes('delivery')) return 'local-shipping'
    if (lowerType.includes('review') || lowerType.includes('rating')) return 'star'
    
    return 'notifications'
  }

  const getNotificationColor = (type: NotificationType | string) => {
    const lowerType = String(type).toLowerCase()
    
    if (lowerType.includes('trip') || lowerType.includes('ride'))
      return { primary: '#FF6B00', secondary: '#E85D00', bg: '#fff5eb' }
    if (lowerType.includes('promo') || lowerType.includes('promotion'))
      return { primary: '#8b5cf6', secondary: '#7c3aed', bg: '#ede9fe' }
    if (lowerType.includes('system') || lowerType.includes('message'))
      return { primary: '#3b82f6', secondary: '#2563eb', bg: '#dbeafe' }
    if (lowerType.includes('earning') || lowerType.includes('payment') || lowerType.includes('wallet'))
      return { primary: '#10b981', secondary: '#059669', bg: '#d1fae5' }
    if (lowerType.includes('delivery'))
      return { primary: '#0284C7', secondary: '#0369A1', bg: '#E0F2FE' }
    
    // Default color for unknown types
    return { primary: '#64748B', secondary: '#475569', bg: '#F1F5F9' }
  }

  const colors = getNotificationColor(notification.type)

  const formatDetails = (details: string) => {
    return details.split('\n').map((line, index) => {
      // Bold text **text**
      if (line.includes('**')) {
        const parts = line.split('**')
        return (
          <Text key={index} style={styles.detailLine}>
            {parts.map((part, i) =>
              i % 2 === 1 ? (
                <Text key={i} style={styles.boldText}>
                  {part}
                </Text>
              ) : (
                <Text key={i}>{part}</Text>
              )
            )}
          </Text>
        )
      }
      return (
        <Text key={index} style={styles.detailLine}>
          {line}
        </Text>
      )
    })
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation?.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chi tiết thông báo</Text>
        <TouchableOpacity style={styles.moreButton}>
          <MaterialIcons name="more-vert" size={24} color="#0f172a" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Icon Card */}
        <View style={styles.iconCardWrapper}>
          <LinearGradient
            colors={[colors.primary, colors.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconCard}
          >
            <View style={styles.decorCircle1} />
            <View style={styles.decorCircle2} />
            
            <View style={styles.iconBox}>
              <MaterialIcons
                name={getNotificationIcon(notification.type) as any}
                size={48}
                color="#fff"
              />
            </View>
          </LinearGradient>
        </View>

        {/* Main Content */}
        <View style={styles.contentCard}>
          <View style={styles.titleSection}>
            <Text style={styles.title}>{notification.title}</Text>
            <Text style={styles.time}>
              <MaterialIcons name="access-time" size={14} color="#94a3b8" />
              {'  '}
              {notification.time}
            </Text>
          </View>

          <Text style={styles.message}>{notification.message}</Text>

          {notification.amount && (
            <View style={styles.amountCard}>
              <View style={styles.amountIcon}>
                <MaterialIcons name="account-balance-wallet" size={24} color="#10b981" />
              </View>
              <View style={styles.amountContent}>
                <Text style={styles.amountLabel}>Số tiền</Text>
                <Text style={styles.amountValue}>
                  {notification.amount > 0 ? '+' : ''}
                  {notification.amount.toLocaleString('vi-VN')}đ
                </Text>
              </View>
            </View>
          )}

          {notification.details && (
            <View style={styles.detailsSection}>
              <View style={styles.divider} />
              <View style={styles.detailsContent}>{formatDetails(notification.details)}</View>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        {notification.actionLabel && (
          <View style={styles.actionsSection}>
            <TouchableOpacity style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>{notification.actionLabel}</Text>
              <MaterialIcons name="arrow-forward" size={20} color="#fff" />
            </TouchableOpacity>

            <View style={styles.secondaryButtons}>
              <TouchableOpacity style={styles.secondaryButton}>
                <MaterialIcons name="share" size={20} color="#64748b" />
                <Text style={styles.secondaryButtonText}>Chia sẻ</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.secondaryButton}>
                <MaterialIcons name="delete-outline" size={20} color="#64748b" />
                <Text style={styles.secondaryButtonText}>Xóa</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Related Notifications */}
        {/* <View style={styles.relatedSection}>
          <Text style={styles.relatedTitle}>Thông báo liên quan</Text>

          <TouchableOpacity style={styles.relatedItem}>
            <View style={[styles.relatedIcon, { backgroundColor: '#fff5eb' }]}>
              <MaterialIcons name="local-taxi" size={20} color="#FF6B00" />
            </View>
            <View style={styles.relatedContent}>
              <Text style={styles.relatedItemTitle} numberOfLines={1}>
                Chuyến đi #X891
              </Text>
              <Text style={styles.relatedItemTime}>2 giờ trước</Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color="#cbd5e1" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.relatedItem}>
            <View style={[styles.relatedIcon, { backgroundColor: '#d1fae5' }]}>
              <MaterialIcons name="account-balance-wallet" size={20} color="#10b981" />
            </View>
            <View style={styles.relatedContent}>
              <Text style={styles.relatedItemTitle} numberOfLines={1}>
                Thu nhập +120.000đ
              </Text>
              <Text style={styles.relatedItemTime}>3 giờ trước</Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color="#cbd5e1" />
          </TouchableOpacity>
        </View> */}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xxl + SPACING.lg,
    paddingBottom: SPACING.lg,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  moreButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCardWrapper: {
    marginHorizontal: SPACING.xl,
    marginTop: SPACING.xl,
    marginBottom: SPACING.lg,
  },
  iconCard: {
    height: 140,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  decorCircle1: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  decorCircle2: {
    position: 'absolute',
    bottom: -30,
    left: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  iconBox: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  contentCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: SPACING.xl,
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.lg,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  titleSection: {
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.5,
    marginBottom: SPACING.sm,
  },
  time: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '600',
  },
  message: {
    fontSize: 16,
    color: '#475569',
    lineHeight: 24,
    fontWeight: '500',
    marginBottom: SPACING.lg,
  },
  amountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    borderRadius: 16,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  amountIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#d1fae5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  amountContent: {
    flex: 1,
  },
  amountLabel: {
    fontSize: 13,
    color: '#059669',
    fontWeight: '600',
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#10b981',
    letterSpacing: -0.5,
  },
  detailsSection: {
    marginTop: SPACING.md,
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginBottom: SPACING.lg,
  },
  detailsContent: {
    gap: SPACING.xs,
  },
  detailLine: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 24,
    fontWeight: '500',
    marginBottom: SPACING.xs,
  },
  boldText: {
    fontWeight: '800',
    color: '#0f172a',
  },
  actionsSection: {
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.xl,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B00',
    borderRadius: 16,
    paddingVertical: SPACING.lg,
    gap: SPACING.sm,
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: SPACING.md,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.2,
  },
  secondaryButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    paddingVertical: SPACING.md,
    gap: SPACING.xs,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748b',
  },
  relatedSection: {
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.xl,
  },
  relatedTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.3,
    marginBottom: SPACING.md,
  },
  relatedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  relatedIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  relatedContent: {
    flex: 1,
  },
  relatedItemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  relatedItemTime: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },
})
