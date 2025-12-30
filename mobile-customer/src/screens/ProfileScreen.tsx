import React, { useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Switch,
  Dimensions,
  StatusBar,
} from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { useDispatch, useSelector } from 'react-redux'
import { logout } from '../redux/slices/authSlice'
import { setTheme } from '../redux/slices/themeSlice'
import { authService } from '../services/authService'
import type { RootState } from '../redux/store'
import { COLORS, COLORS_DARK, COLORS_LIGHT } from '../constants'
import { SPACING, BORDER_RADIUS } from '../constants'

const { width } = Dimensions.get('window')

interface MenuItem {
  icon: string
  label: string
  value?: string
  badge?: string
  onPress?: () => void
  isDanger?: boolean
  isToggle?: boolean
}

export default function ProfileScreen() {
  const dispatch = useDispatch()
  const user = useSelector((state: RootState) => state.auth.user)
  const themeMode = useSelector((state: RootState) => state.theme.mode)
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)

  // Get colors based on theme
  const colors = themeMode === 'dark' ? COLORS_DARK : COLORS_LIGHT

  const handleLogout = async () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc muốn đăng xuất?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đăng xuất',
        onPress: async () => {
          try {
            await authService.logout()
            dispatch(logout())
          } catch (error) {
            Alert.alert('Lỗi', 'Không thể đăng xuất')
          }
        },
        style: 'destructive',
      },
    ])
  }

  const handleThemeChange = (value: boolean) => {
    // true = light mode, false = dark mode
    dispatch(setTheme(value ? 'light' : 'dark'))
  }

  const MenuSection = ({ title, items }: { title: string; items: MenuItem[] }) => (
    <View style={[styles.section, { backgroundColor: colors.bgSecondary }]}>
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{title}</Text>
      <View style={styles.menuContainer}>
        {items.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.menuItem,
              index !== items.length - 1 && {
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              },
            ]}
            onPress={item.onPress}
            activeOpacity={0.6}
          >
            <View style={styles.menuLeft}>
              <View
                style={[
                  styles.iconContainer,
                  {
                    backgroundColor: item.isDanger
                      ? 'rgba(239, 68, 68, 0.15)'
                      : `${colors.primary}15`,
                  },
                ]}
              >
                <MaterialIcons
                  name={item.icon as any}
                  size={20}
                  color={item.isDanger ? colors.danger : colors.primary}
                />
              </View>
              <View style={styles.menuTextWrapper}>
                <Text
                  style={[
                    styles.menuLabel,
                    {
                      color: item.isDanger ? colors.danger : colors.text,
                    },
                  ]}
                >
                  {item.label}
                </Text>
                {item.badge && (
                  <Text style={[styles.badgeText, { color: colors.primary }]}>
                    {item.badge}
                  </Text>
                )}
              </View>
            </View>
            <View style={styles.menuRight}>
              {item.isToggle ? (
                <Switch
                  value={
                    item.label === 'Thông báo'
                      ? notificationsEnabled
                      : themeMode === 'light'
                  }
                  onValueChange={(value) => {
                    if (item.label === 'Thông báo') {
                      setNotificationsEnabled(value)
                    } else if (item.label === 'Chế độ tối') {
                      handleThemeChange(value)
                    }
                  }}
                  trackColor={{ false: colors.border, true: `${colors.primary}50` }}
                  thumbColor={
                    (item.label === 'Thông báo' && notificationsEnabled) ||
                    (item.label === 'Chế độ tối' && themeMode === 'light')
                      ? colors.primary
                      : colors.textSecondary
                  }
                />
              ) : (
                <>
                  {item.value && (
                    <Text style={[styles.menuValue, { color: colors.textSecondary }]}>
                      {item.value}
                    </Text>
                  )}
                  <MaterialIcons
                    name="chevron-right"
                    size={20}
                    color={item.isDanger ? colors.danger : colors.textSecondary}
                  />
                </>
              )}
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
      isToggle: true,
    },
    {
      icon: 'language',
      label: 'Ngôn ngữ',
      value: 'Tiếng Việt',
    },
    {
      icon: themeMode === 'dark' ? 'brightness-7' : 'brightness-4',
      label: 'Chế độ tối',
      isToggle: true,
    },
    {
      icon: 'location-on',
      label: 'Quyền truy cập vị trí',
      badge: 'Bật',
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
    <>
      <StatusBar
        barStyle={themeMode === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={colors.bg}
      />
      <ScrollView
        style={[styles.container, { backgroundColor: colors.bg }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          {/* Background decoration */}
          <View
            style={[
              styles.headerBackground,
              { backgroundColor: colors.primary },
            ]}
          />

          <View style={styles.profileContent}>
            {/* Avatar */}
            <View style={styles.avatarContainer}>
              <View
                style={[
                  styles.avatarInner,
                  {
                    backgroundColor: `${colors.primary}15`,
                    borderColor: colors.primary,
                  },
                ]}
              >
                <MaterialIcons
                  name="person"
                  size={56}
                  color={colors.primary}
                />
              </View>
              <View
                style={[
                  styles.verifiedBadge,
                  { backgroundColor: colors.primary, borderColor: colors.bg },
                ]}
              >
                <MaterialIcons name="verified" size={16} color="#fff" />
              </View>
            </View>

            {/* User Info */}
            <Text style={[styles.profileName, { color: colors.text }]}>
              {user?.name || 'Người dùng'}
            </Text>

            {/* Edit Button */}
            <TouchableOpacity
              style={[
                styles.editButton,
                {
                  borderColor: colors.primary,
                  backgroundColor: `${colors.primary}10`,
                },
              ]}
              activeOpacity={0.8}
            >
              <MaterialIcons name="edit" size={18} color={colors.primary} />
              <Text style={[styles.editButtonText, { color: colors.primary }]}>
                Chỉnh sửa hồ sơ
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Premium/Status Card */}
        <View
          style={[
            styles.premiumCard,
            {
              backgroundColor: `${colors.primary}15`,
              borderColor: `${colors.primary}30`,
            },
          ]}
        >
          <View style={styles.premiumContent}>
            <View>
              <Text style={[styles.premiumLabel, { color: colors.text }]}>
                Thành viên thường
              </Text>
              <Text
                style={[styles.premiumSubtext, { color: colors.textSecondary }]}
              >
                Tham gia từ tháng 3, 2024
              </Text>
            </View>
            <View style={styles.premiumIcon}>
              <MaterialIcons
                name="star"
                size={28}
                color={colors.primary}
              />
            </View>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <TouchableOpacity
            style={[
              styles.statItem,
              {
                backgroundColor: colors.bgSecondary,
                borderColor: `${colors.primary}15`,
              },
            ]}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.statIconWrapper,
                { backgroundColor: `${colors.primary}15` },
              ]}
            >
              <MaterialIcons
                name="local-taxi"
                size={24}
                color={colors.primary}
              />
            </View>
            <Text style={[styles.statValue, { color: colors.primary }]}>
              28
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Chuyến
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.statItem,
              {
                backgroundColor: colors.bgSecondary,
                borderColor: `${colors.primary}15`,
              },
            ]}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.statIconWrapper,
                { backgroundColor: `${colors.primary}15` },
              ]}
            >
              <MaterialIcons name="star" size={24} color={colors.primary} />
            </View>
            <Text style={[styles.statValue, { color: colors.primary }]}>
              4.8
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Đánh giá
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.statItem,
              {
                backgroundColor: colors.bgSecondary,
                borderColor: `${colors.primary}15`,
              },
            ]}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.statIconWrapper,
                { backgroundColor: `${colors.primary}15` },
              ]}
            >
              <MaterialIcons
                name="trending-up"
                size={24}
                color={colors.primary}
              />
            </View>
            <Text style={[styles.statValue, { color: colors.primary }]}>
              2.3K
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              km
            </Text>
          </TouchableOpacity>
        </View>

        {/* Sections */}
        <MenuSection title="Tài khoản" items={accountItems} />
        <MenuSection title="Cài đặt" items={settingsItems} />
        <MenuSection title="Hỗ trợ & Thông tin" items={supportItems} />

        {/* Logout Button */}
        <View style={styles.logoutSection}>
          <TouchableOpacity
            style={[
              styles.logoutButton,
              {
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                borderColor: 'rgba(239, 68, 68, 0.3)',
              },
            ]}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <MaterialIcons name="logout" size={20} color={colors.danger} />
            <Text style={[styles.logoutText, { color: colors.danger }]}>
              Đăng xuất
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: SPACING.xxl }} />
      </ScrollView>
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Profile Header Styles
  profileHeader: {
    paddingBottom: SPACING.xl,
    alignItems: 'center',
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
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  profileName: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: SPACING.xs,
    letterSpacing: 0.3,
  },
  profileEmail: {
    fontSize: 13,
    marginBottom: SPACING.lg,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1.5,
    gap: SPACING.sm,
  },
  editButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },

  // Premium Card
  premiumCard: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.lg,
    overflow: 'hidden',
  },
  premiumContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  premiumLabel: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: SPACING.xs,
  },
  premiumSubtext: {
    fontSize: 12,
  },
  premiumIcon: {
    opacity: 0.3,
  },

  // Stats Container
  statsContainer: {
    flexDirection: 'row',
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.xl,
    gap: SPACING.md,
  },
  statItem: {
    flex: 1,
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
  },
  statIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: SPACING.xs,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
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
    fontWeight: '600',
    marginBottom: SPACING.xs / 2,
  },
  menuLabelDanger: {
    color: '#ef4444',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  menuRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  menuValue: {
    fontSize: 13,
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
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING.lg,
    gap: SPACING.md,
    borderWidth: 1,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '700',
  },
})
