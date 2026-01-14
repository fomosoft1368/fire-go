import { useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { useSelector } from 'react-redux'
import { useNavigation } from '@react-navigation/native'
import type { RootState } from '../redux/store'
import { COLORS_DARK, COLORS_LIGHT, SPACING, BORDER_RADIUS } from '../constants'

type NotificationType = 'driver_arrived' | 'ride_completed' | 'promo' | 'driver_assigned' | 'discount'

interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  time: string
  isNew: boolean
  hasAction: boolean
}

export default function NotificationScreen() {
  const navigation = useNavigation()
  const themeMode = useSelector((state: RootState) => state.theme.mode)
  const colors = themeMode === 'dark' ? COLORS_DARK : COLORS_LIGHT
  const [selectedTab, setSelectedTab] = useState<'today' | 'yesterday'>('today')

  const todayNotifications: Notification[] = [
    {
      id: '1',
      type: 'driver_arrived',
      title: 'Tài xế đang đến',
      message: 'Tài xế Nguyễn Văn A đang trên đường đến điểm đón tại 123 Nguyễn Văn Cừ...',
      time: '10:02 AM',
      isNew: true,
      hasAction: true,
    },
    {
      id: '2',
      type: 'ride_completed',
      title: 'Đặt chuyến thành công',
      message: 'Xin chào queeee, Chuyến đi của bạn tại Hà Phương đã được sắc nhận',
      time: '10:02 AM',
      isNew: false,
      hasAction: false,
    },
    {
      id: '3',
      type: 'discount',
      title: 'Giảm 60K cho bạn mới',
      message: 'Chào mừng bạn mới! FireGO xin tặng giảm giá 60K cho chuyến đi đầu tiên của bạn. Mã: HELLO60',
      time: '09:18 AM',
      isNew: false,
      hasAction: false,
    },
  ]

  const yesterdayNotifications: Notification[] = [
    {
      id: '4',
      type: 'ride_completed',
      title: 'Hoàn thành chuyến đi',
      message: 'Chuyến đi của bạn đã hoàn thành. Vui lòng đánh giá tài xế?',
      time: 'Hôm qua',
      isNew: false,
      hasAction: false,
    },
    {
      id: '5',
      type: 'promo',
      title: 'Cập nhật chính sách',
      message: 'Chúng tôi đã cập nhật các quy định để dịch vụ của bạn được đầy đủ và tốt hơn',
      time: 'Hôm qua',
      isNew: false,
      hasAction: false,
    },
  ]

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'driver_arrived':
        return { name: 'local-taxi' as const, color: '#FF6B00', bgColor: 'rgba(255, 107, 0, 0.15)' }
      case 'ride_completed':
        return { name: 'check-circle' as const, color: '#4CAF50', bgColor: 'rgba(76, 175, 80, 0.15)' }
      case 'promo':
        return { name: 'campaign' as const, color: '#FFC107', bgColor: 'rgba(255, 193, 7, 0.15)' }
      case 'driver_assigned':
        return { name: 'person' as const, color: '#2196F3', bgColor: 'rgba(33, 150, 243, 0.15)' }
      case 'discount':
        return { name: 'local-offer' as const, color: '#FFC107', bgColor: 'rgba(255, 193, 7, 0.15)' }
      default:
        return { name: 'notifications' as const, color: '#FF6B00', bgColor: 'rgba(255, 107, 0, 0.15)' }
    }
  }

  const currentNotifications = selectedTab === 'today' ? todayNotifications : yesterdayNotifications

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar
        barStyle={themeMode === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={colors.bg}
      />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.bg }]}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Thông báo</Text>
        <TouchableOpacity style={styles.moreButton}>
          <MaterialIcons name="tune" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[
            styles.tab,
            selectedTab === 'today' && styles.tabActive,
            { borderBottomColor: selectedTab === 'today' ? '#FF6B00' : 'transparent' },
          ]}
          onPress={() => setSelectedTab('today')}
        >
          <Text
            style={[
              styles.tabText,
              { color: selectedTab === 'today' ? '#FF6B00' : colors.textSecondary },
              selectedTab === 'today' && styles.tabTextActive,
            ]}
          >
            Hôm nay
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            selectedTab === 'yesterday' && styles.tabActive,
            { borderBottomColor: selectedTab === 'yesterday' ? '#FF6B00' : 'transparent' },
          ]}
          onPress={() => setSelectedTab('yesterday')}
        >
          <Text
            style={[
              styles.tabText,
              { color: selectedTab === 'yesterday' ? '#FF6B00' : colors.textSecondary },
              selectedTab === 'yesterday' && styles.tabTextActive,
            ]}
          >
            Hôm qua
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            { borderBottomColor: 'transparent' },
          ]}
          onPress={() => {}}
        >
          <Text style={[styles.tabText, { color: colors.textSecondary }]}>
            Khuyến mãi
          </Text>
        </TouchableOpacity>
      </View>

      {/* Notifications List */}
      <ScrollView
        style={styles.notificationsList}
        showsVerticalScrollIndicator={false}
      >
        {currentNotifications.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="notifications-none" size={80} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Chưa có thông báo nào
            </Text>
          </View>
        ) : (
          currentNotifications.map((notification) => {
            const iconConfig = getNotificationIcon(notification.type)
            return (
              <TouchableOpacity
                key={notification.id}
                style={[
                  styles.notificationCard,
                  { backgroundColor: colors.bgSecondary, borderColor: colors.border },
                ]}
                onPress={() => navigation.navigate('NotificationDetail', { notification })}
              >
                <View style={styles.notificationHeader}>
                  <View style={styles.notificationLeft}>
                    <View style={[styles.iconContainer, { backgroundColor: iconConfig.bgColor }]}>
                      <MaterialIcons name={iconConfig.name} size={24} color={iconConfig.color} />
                    </View>
                    <View style={styles.notificationInfo}>
                      <View style={styles.titleRow}>
                        <Text style={[styles.notificationTitle, { color: colors.text }]}>
                          {notification.title}
                        </Text>
                        {notification.isNew && (
                          <View style={styles.newBadge}>
                            <Text style={styles.newBadgeText}>Mới</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.notificationTime, { color: colors.textSecondary }]}>
                        {notification.time}
                      </Text>
                    </View>
                  </View>
                </View>

                <Text style={[styles.notificationMessage, { color: colors.textSecondary }]}>
                  {notification.message}
                </Text>

                {notification.hasAction && (
                  <View style={styles.actionButtons}>
                    <TouchableOpacity style={styles.actionButton}>
                      <Text style={styles.actionButtonText}>Thao tác ngay</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionButton, styles.actionButtonSecondary]}>
                      <Text style={[styles.actionButtonText, styles.actionButtonTextSecondary]}>
                        Gọi điện
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </TouchableOpacity>
            )
          })
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    paddingTop: SPACING.md + StatusBar.currentHeight!,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  moreButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  tab: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: 2,
  },
  tabActive: {
    borderBottomColor: '#FF6B00',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  tabTextActive: {
    fontWeight: '700',
  },
  notificationsList: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.xxl * 3,
  },
  emptyText: {
    marginTop: SPACING.lg,
    fontSize: 16,
    fontWeight: '500',
  },
  notificationCard: {
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  notificationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  notificationInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  newBadge: {
    backgroundColor: '#FF6B00',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  newBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  notificationTime: {
    fontSize: 12,
    fontWeight: '500',
  },
  notificationMessage: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: SPACING.md,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#FF6B00',
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  actionButtonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#FF6B00',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  actionButtonTextSecondary: {
    color: '#FF6B00',
  },
})
