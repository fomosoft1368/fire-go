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
import { useNavigation, useRoute } from '@react-navigation/native'
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

export default function NotificationDetailScreen() {
  const navigation = useNavigation()
  const route = useRoute()
  const themeMode = useSelector((state: RootState) => state.theme.mode)
  const colors = themeMode === 'dark' ? COLORS_DARK : COLORS_LIGHT

  const notification = (route.params as { notification: Notification }).notification

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

  const iconConfig = getNotificationIcon(notification.type)

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar
        barStyle={themeMode === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={colors.bg}
      />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.bg, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Chi tiết thông báo</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Detail Card */}
        <View style={[styles.detailCard, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}>
          {/* Icon and Basic Info */}
          <View style={styles.iconSection}>
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: iconConfig.bgColor },
              ]}
            >
              <MaterialIcons
                name={iconConfig.name}
                size={40}
                color={iconConfig.color}
              />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.titleRow}>
                <Text style={[styles.title, { color: colors.text }]}>
                  {notification.title}
                </Text>
                {notification.isNew && (
                  <View style={styles.newBadge}>
                    <Text style={styles.newBadgeText}>Mới</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.time, { color: colors.textSecondary }]}>
                {notification.time}
              </Text>
            </View>
          </View>

          {/* Divider */}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Message */}
          <View style={styles.messageSection}>
            <Text style={[styles.messageLabel, { color: colors.textSecondary }]}>
              Nội dung
            </Text>
            <Text style={[styles.message, { color: colors.text }]}>
              {notification.message}
            </Text>
          </View>

          {/* Additional Info */}
          <View style={styles.infoSection}>
            <View style={styles.infoRow}>
              <MaterialIcons name="schedule" size={18} color="#FF6B00" />
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Thời gian nhận</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{notification.time}</Text>
            </View>
            <View style={styles.infoRow}>
              <MaterialIcons name="done" size={18} color="#4CAF50" />
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Trạng thái</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>Đã nhận</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        {notification.hasAction && (
          <View style={styles.actions}>
            <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#FF6B00' }]}>
              <MaterialIcons name="directions" size={18} color="#fff" />
              <Text style={styles.actionButtonText}>Thao tác ngay</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.actionButton,
                { backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.border },
              ]}
            >
              <MaterialIcons name="call" size={18} color="#FF6B00" />
              <Text style={[styles.actionButtonText, { color: '#FF6B00' }]}>Gọi điện</Text>
            </TouchableOpacity>
          </View>
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
    paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight + SPACING.md : SPACING.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
  },
  detailCard: {
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    marginBottom: SPACING.lg,
  },
  iconSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
  },
  time: {
    fontSize: 13,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    marginBottom: SPACING.lg,
  },
  messageSection: {
    marginBottom: SPACING.lg,
  },
  messageLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: SPACING.sm,
    textTransform: 'uppercase',
  },
  message: {
    fontSize: 15,
    lineHeight: 24,
  },
  infoSection: {
    gap: SPACING.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  actions: {
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
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
})
