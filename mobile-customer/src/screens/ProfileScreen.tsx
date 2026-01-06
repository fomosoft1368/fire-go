import React from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
} from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { useDispatch, useSelector } from 'react-redux'
import { logout } from '../redux/slices/authSlice'
import { authService } from '../services/authService'
import type { RootState } from '../redux/store'
import { COLORS, SPACING, BORDER_RADIUS } from '../constants'

interface MenuItem {
  icon: string
  label: string
  value?: string
  onPress?: () => void
  isDanger?: boolean
}

interface ProfileScreenProps {
  navigation: any
}

export default function ProfileScreen({ navigation }: ProfileScreenProps) {
  const dispatch = useDispatch()
  const user = useSelector((state: RootState) => state.auth.user)

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
        >
          <View style={styles.menuLeft}>
            <MaterialIcons
              name={item.icon as any}
              size={20}
              color={item.isDanger ? COLORS.danger : COLORS.textSecondary}
            />
            <Text
              style={[
                styles.menuLabel,
                item.isDanger && styles.menuLabelDanger,
              ]}
            >
              {item.label}
            </Text>
          </View>
          {item.value && (
            <Text style={styles.menuValue} numberOfLines={1} ellipsizeMode="tail">{item.value}</Text>
          )}
          <MaterialIcons
            name="chevron-right"
            size={20}
            color={item.isDanger ? COLORS.danger : COLORS.textSecondary}
          />
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
      icon: 'brightness-4',
      label: 'Chế độ tối',
    },
    {
      icon: 'location-on',
      label: 'Quyền truy cập vị trí',
    },
  ]

  const supportItems: MenuItem[] = [
    {
      icon: 'help-outline',
      label: 'Trợ giúp',
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
          <MaterialIcons name="person" size={48} color={COLORS.primary} />
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

      {/* Sections */}
      <MenuSection title="Tài khoản" items={accountItems} />
      <MenuSection title="Cài đặt" items={settingsItems} />
      <MenuSection title="Hỗ trợ" items={supportItems} />

      {/* Logout Button */}
      <View style={styles.logoutSection}>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <MaterialIcons name="logout" size={20} color={COLORS.danger} />
          <Text style={styles.logoutText}>Đăng xuất</Text>
        </TouchableOpacity>
      </View>

      {/* Spacer */}
      <View style={{ height: SPACING.xxl }} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor:'#0f172a',
    paddingTop: SPACING.xxl,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightBorder,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.xs,
    maxWidth: '90%',
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
    borderWidth: 1,
    borderColor: COLORS.primary,
    gap: SPACING.sm,
  },
  editButtonText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#1a202c',
    marginHorizontal: SPACING.lg,
    marginVertical: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
  },
  statItem: {
    flex: 1,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  statDivider: {
    width: 1,
    backgroundColor: COLORS.lightBorder,
  },
  section: {
    backgroundColor: '#1a202c',
    marginHorizontal: SPACING.lg,
    marginVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
    textTransform: 'uppercase',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightBorder,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    flex: 1,
  },
  menuLabel: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  menuLabelDanger: {
    color: COLORS.danger,
  },
  menuValue: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginRight: SPACING.sm,
    maxWidth: 120,
  },
  logoutSection: {
    paddingHorizontal: SPACING.lg,
    marginVertical: SPACING.lg,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ff444420',
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING.lg,
    gap: SPACING.md,
  },
  logoutText: {
    color: COLORS.danger,
    fontSize: 16,
    fontWeight: 'bold',
  },
}
)
