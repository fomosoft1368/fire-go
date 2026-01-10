import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
  StatusBar,
  Switch,
} from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { useDispatch, useSelector } from 'react-redux'
import { logout } from '../redux/slices/authSlice'
import { COLORS, SPACING, BORDER_RADIUS } from '../constants'
import type { RootState } from '../redux/store'

const { width } = Dimensions.get('window')

export default function ProfileScreen() {
  const dispatch = useDispatch()
  const { user } = useSelector((state: RootState) => state.auth)
  const [isOnline, setIsOnline] = useState(true)

  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đăng xuất',
        style: 'destructive',
        onPress: () => dispatch(logout()),
      },
    ])
  }

  const MenuSection = ({ title, items }: { title: string; items: MenuItem[] }) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.menuContainer}>
        {items.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.menuItem,
              index !== items.length - 1 && styles.menuItemBorder,
            ]}
            onPress={item.onPress}
            activeOpacity={0.7}
          >
            <View style={styles.menuLeft}>
              <View
                style={[
                  styles.iconContainer,
                  item.isDanger && styles.iconContainerDanger,
                ]}
              >
                <MaterialIcons
                  name={item.icon as any}
                  size={20}
                  color={item.isDanger ? COLORS.danger : COLORS.primary}
                />
              </View>
              <View style={styles.menuTextWrapper}>
                <Text
                  style={[
                    styles.menuLabel,
                    item.isDanger && { color: COLORS.danger },
                  ]}
                >
                  {item.label}
                </Text>
                {item.badge && (
                  <Text style={styles.badgeText}>{item.badge}</Text>
                )}
              </View>
            </View>
            <View style={styles.menuRight}>
              {item.value && (
                <Text style={styles.menuValue}>{item.value}</Text>
              )}
              <MaterialIcons
                name="chevron-right"
                size={20}
                color={item.isDanger ? COLORS.danger : COLORS.textSecondary}
              />
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )

  const accountItems: MenuItem[] = [
    {
      icon: 'person-outline',
      label: 'Thông tin cá nhân',
      value: user?.name,
    },
    {
      icon: 'phone',
      label: 'Số điện thoại',
      value: user?.phone || 'Chưa cập nhật',
    },
    {
      icon: 'email',
      label: 'Email',
      value: user?.email || 'Chưa cập nhật',
    },
    {
      icon: 'lock-outline',
      label: 'Đổi mật khẩu',
    },
    {
      icon: 'payment',
      label: 'Phương thức thanh toán',
      badge: '2 phương thức',
    },
  ]

  const settingsItems: MenuItem[] = [
    {
      icon: 'notifications-none',
      label: 'Thông báo',
    },
    {
      icon: 'language',
      label: 'Ngôn ngữ',
      value: 'Tiếng Việt',
    },
    {
      icon: 'settings',
      label: 'Cài đặt ứng dụng',
    },
  ]

  const supportItems: MenuItem[] = [
    {
      icon: 'help-outline',
      label: 'Trợ giúp & Hỗ trợ',
    },
    {
      icon: 'description',
      label: 'Điều khoản dịch vụ',
    },
    {
      icon: 'privacy-tip',
      label: 'Chính sách bảo mật',
    },
    {
      icon: 'info-outline',
      label: 'Về ứng dụng',
      value: 'v1.0.0',
    },
  ]

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.darkBg} />
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Profile Header with Decorative Background */}
        <View style={styles.profileHeader}>
          {/* Background decoration */}
          <View
            style={[
              styles.headerBackground,
              { backgroundColor: COLORS.primary, opacity: 0.08 },
            ]}
          />

          {/* Profile Content */}
          <View style={styles.profileContent}>
            {/* Avatar */}
            <View style={styles.avatarContainer}>
              <View style={styles.avatarInner}>
                <MaterialIcons
                  name="person"
                  size={56}
                  color={COLORS.primary}
                />
              </View>
              {/* Online Badge */}
              <View
                style={[
                  styles.onlineBadge,
                  { backgroundColor: isOnline ? COLORS.success : COLORS.danger },
                ]}
              >
                <MaterialIcons
                  name={isOnline ? 'check' : 'close'}
                  size={12}
                  color="#fff"
                />
              </View>
            </View>

            {/* User Info */}
            <Text style={styles.profileName}>{user?.name || 'Tài xế'}</Text>
            <Text style={styles.profileEmail}>{user?.email || 'email@example.com'}</Text>

            {/* Edit Button */}
            <TouchableOpacity
              style={styles.editButton}
              activeOpacity={0.8}
            >
              <MaterialIcons name="edit" size={18} color={COLORS.primary} />
              <Text style={styles.editButtonText}>Chỉnh sửa hồ sơ</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Verification Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusLeft}>
            <View style={styles.verifyIcon}>
              <MaterialIcons name="verified" size={24} color={COLORS.success} />
            </View>
            <View>
              <Text style={styles.statusTitle}>Tài xế xác thực</Text>
              <Text style={styles.statusSubtext}>Tất cả tài liệu đã được xác nhận</Text>
            </View>
          </View>
          <MaterialIcons name="check-circle" size={28} color={COLORS.success} />
        </View>

        {/* Statistics Section */}
        <View style={styles.statsContainer}>
          <TouchableOpacity
            style={styles.statItem}
            activeOpacity={0.7}
          >
            <View style={styles.statIconWrapper}>
              <MaterialIcons name="trending-up" size={24} color={COLORS.primary} />
            </View>
            <Text style={styles.statValue}>25.5K</Text>
            <Text style={styles.statLabel}>Thu nhập</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statItem}
            activeOpacity={0.7}
          >
            <View style={styles.statIconWrapper}>
              <MaterialIcons name="local-taxi" size={24} color={COLORS.primary} />
            </View>
            <Text style={styles.statValue}>127</Text>
            <Text style={styles.statLabel}>Chuyến xe</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statItem}
            activeOpacity={0.7}
          >
            <View style={styles.statIconWrapper}>
              <MaterialIcons name="star" size={24} color={COLORS.primary} />
            </View>
            <Text style={styles.statValue}>4.8</Text>
            <Text style={styles.statLabel}>Đánh giá</Text>
          </TouchableOpacity>
        </View>

        {/* Online Status Toggle */}
        <View style={styles.onlineToggleCard}>
          <View>
            <Text style={styles.onlineToggleTitle}>Trạng thái online</Text>
            <Text style={styles.onlineToggleSubtext}>
              {isOnline ? 'Bạn đang có sẵn nhận chuyến' : 'Bạn đang không có sẵn'}
            </Text>
          </View>
          <Switch
            value={isOnline}
            onValueChange={setIsOnline}
            trackColor={{ false: COLORS.darkBorder, true: COLORS.success + '50' }}
            thumbColor={isOnline ? COLORS.success : COLORS.textSecondary}
          />
        </View>

        {/* Account Section */}
        <MenuSection title="Tài khoản" items={accountItems} />

        {/* Settings Section */}
        <MenuSection title="Cài đặt" items={settingsItems} />

        {/* Support Section */}
        <MenuSection title="Hỗ trợ & Thông tin" items={supportItems} />

        {/* Logout Button */}
        <View style={styles.logoutSection}>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <MaterialIcons name="logout" size={20} color={COLORS.danger} />
            <Text style={styles.logoutText}>Đăng xuất</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: SPACING.xxl }} />
      </ScrollView>
    </SafeAreaView>
  )
}

interface MenuItem {
  icon: string
  label: string
  value?: string
  badge?: string
  onPress?: () => void
  isDanger?: boolean
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.darkBg,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.darkBg,
  },

  // Profile Header Styles
  profileHeader: {
    paddingBottom: SPACING.xl,
    alignItems: 'center',
    paddingTop: SPACING.xl,
  },
  headerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 180,
    opacity: 0.08,
  },
  profileContent: {
    alignItems: 'center',
    paddingTop: SPACING.xl,
  },
  avatarContainer: {
    marginBottom: SPACING.lg,
    position: 'relative',
  },
  avatarInner: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.darkBg,
  },
  profileName: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: SPACING.xs,
    letterSpacing: 0.3,
  },
  profileEmail: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    gap: SPACING.sm,
    backgroundColor: COLORS.primary + '10',
  },
  editButtonText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
  },

  // Status Card
  statusCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    backgroundColor: COLORS.success + '15',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.success + '30',
    padding: SPACING.lg,
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    flex: 1,
  },
  verifyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.success + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xs / 2,
  },
  statusSubtext: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },

  // Statistics Container
  statsContainer: {
    flexDirection: 'row',
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.xl,
    gap: SPACING.md,
  },
  statItem: {
    flex: 1,
    backgroundColor: COLORS.darkCard,
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary + '10',
  },
  statIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: SPACING.xs,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },

  // Online Toggle Card
  onlineToggleCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.xl,
    backgroundColor: COLORS.darkCard,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.darkBorder,
    padding: SPACING.lg,
  },

  // Menu Section
  section: {
    marginHorizontal: SPACING.lg,
    marginVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textSecondary,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuContainer: {
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainerDanger: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  menuTextWrapper: {
    flex: 1,
  },
  menuLabel: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '600',
    marginBottom: SPACING.xs / 2,
  },
  badgeText: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '600',
  },
  menuRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  menuValue: {
    fontSize: 13,
    color: COLORS.textSecondary,
    maxWidth: 100,
  },

  // Logout Section
  logoutSection: {
    paddingHorizontal: SPACING.lg,
    marginVertical: SPACING.xl,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING.lg,
    gap: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  logoutText: {
    color: COLORS.danger,
    fontSize: 15,
    fontWeight: '700',
  },
})
