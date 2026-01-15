
import React, { useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { useDispatch, useSelector } from 'react-redux'
import { logout } from '../redux/slices/authSlice'
import { authService } from '../services/authService'
import type { RootState } from '../redux/store'
import { COLORS, COLORS_DARK, COLORS_LIGHT } from '../constants'
import { SPACING, BORDER_RADIUS } from '../constants'

interface MenuItem {
  icon: string
  label: string
  value?: string
  badge?: string
  onPress?: () => void
  isDanger?: boolean
  isToggle?: boolean
}

interface ProfileScreenProps {
  navigation: any
}

export default function ProfileScreen({ navigation }: ProfileScreenProps) {
  const dispatch = useDispatch()
  const user = useSelector((state: RootState) => state.auth.user)
  const themeMode = useSelector((state: RootState) => state.theme.mode)
  const [isDarkMode, setIsDarkMode] = useState(themeMode === 'dark')

  // Get colors based on theme
  const colors = themeMode === 'dark' ? COLORS_DARK : COLORS_LIGHT

  console.log('User data in ProfileScreen:', user)

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

  const MenuSection = ({ title, items }: { title: string; items: MenuItem[] }) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {items.map((item, index) => (
        <TouchableOpacity
          key={index}
          style={[
            styles.menuItem,
            index !== items.length - 1 && styles.menuItemBorder,
          ]}
          onPress={item.onPress}
          disabled={item.isToggle}
        >
          <View style={styles.menuLeft}>
            <View style={[
              styles.iconContainer,
              item.isDanger && styles.iconContainerDanger,
              !item.isDanger && { backgroundColor: COLORS.primary }
            ]}>
              <MaterialIcons
                name={item.icon as any}
                size={20}
                color={item.isDanger ? '#fff' : '#fff'}
              />
            </View>
            <Text
              style={[
                styles.menuLabel,
                item.isDanger && styles.menuLabelDanger,
              ]}
            >
              {item.label}
            </Text>
          </View>
          {item.isToggle ? (
            <Switch
              value={item.label === 'Chế độ tối' ? isDarkMode : false}
              onValueChange={(newValue) => {
                if (item.label === 'Chế độ tối') {
                  setIsDarkMode(newValue)
                }
              }}
              trackColor={{ false: colors.border, true: COLORS.primary + '50' }}
              thumbColor={isDarkMode ? COLORS.primary : colors.textSecondary}
            />
          ) : (
            <>
              {item.value && (
                <Text style={styles.menuValue} numberOfLines={1} ellipsizeMode="tail">{item.value}</Text>
              )}
              <MaterialIcons
                name="chevron-right"
                size={20}
                color={item.isDanger ? COLORS.danger : COLORS.textSecondary}
              />
            </>
          )}
        </TouchableOpacity>
      ))}
    </View>
  )

  const accountItems: MenuItem[] = [
    {
      icon: 'person-outline',
      label: 'Thông tin cá nhân',
      value: user?.firstName && user?.lastName 
        ? `${user.firstName} ${user.lastName}` 
        : user?.name || 'N/A',
    },
    {
      icon: 'phone',
      label: 'Số điện thoại',
      value: user?.phone || 'N/A',
    },
    {
      icon: 'email',
      label: 'Email',
      value: user?.email || 'N/A',
    },
    {
      icon: 'lock-outline',
      label: 'Đổi mật khẩu',
      onPress: () => navigation.navigate('ChangePassword'),
    },
    {
      icon: 'payment',
      label: 'Phương thức thanh toán',
      onPress: () => navigation.navigate('PaymentMethods'),
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
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          <View style={[styles.avatarInner, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <MaterialIcons name="person" size={48} color={COLORS.primary} />
          </View>
        </View>
        <Text style={styles.profileName} numberOfLines={1} ellipsizeMode="tail">
          {user?.firstName && user?.lastName 
            ? `${user.firstName} ${user.lastName}` 
            : user?.name || 'Khách hàng'}
        </Text>
        <Text style={styles.profileEmail}>{user?.email}</Text>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => navigation.navigate('EditProfile')}
        >
          <MaterialIcons name="edit" size={18} color={COLORS.primary} />
          <Text style={styles.editButtonText}>Chỉnh sửa hồ sơ</Text>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{user?.completedRides || 0}</Text>
          <Text style={styles.statLabel}>Chuyến</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{user?.averageRating || 0}</Text>
          <Text style={styles.statLabel}>Đánh giá</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{user?.totalSpent ? `${(user.totalSpent / 1000).toFixed(1)}K` : '0'}</Text>
          <Text style={styles.statLabel}>Tiêu dùng</Text>
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
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgSecondary,
    paddingTop: SPACING.xxl,
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
    marginTop: SPACING.xl,
    position: 'relative',
  },
  avatarInner: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: SPACING.xs,
    maxWidth: '90%',
  },
  profileEmail: {
    fontSize: 13,
    marginBottom: SPACING.lg,
    color: '#ccc',
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
    color: '#fff',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#999',
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
    color: '#fff',
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
    color: '#fff',
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
    color: '#999',
  },

  // Stats Divider
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: SPACING.md,
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
}
)
