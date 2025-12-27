import React from 'react'
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Alert } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { useDispatch, useSelector } from 'react-redux'
import { logout } from '../redux/slices/authSlice'
import { COLORS, SPACING, BORDER_RADIUS } from '../constants'
import type { RootState } from '../redux/store'

export default function ProfileScreen() {
  const dispatch = useDispatch()
  const { user } = useSelector((state: RootState) => state.auth)

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

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <MaterialIcons name="person" size={48} color={COLORS.text} />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.name}>{user?.name || 'Tài xế'}</Text>
            <Text style={styles.email}>{user?.email || 'email@example.com'}</Text>
            <Text style={styles.phone}>{user?.phone || '090 000 0000'}</Text>
          </View>
          <TouchableOpacity style={styles.editButton}>
            <MaterialIcons name="edit" size={20} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tài khoản</Text>
          <MenuItem
            icon="assignment"
            label="Thông tin cá nhân"
            onPress={() => {}}
          />
          <MenuItem
            icon="security"
            label="Bảo mật"
            onPress={() => {}}
          />
          <MenuItem
            icon="payment"
            label="Phương thức thanh toán"
            onPress={() => {}}
          />
          <MenuItem
            icon="bank-account"
            label="Tài khoản ngân hàng"
            onPress={() => {}}
          />
        </View>

        {/* Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cài đặt</Text>
          <MenuItem
            icon="notifications"
            label="Thông báo"
            onPress={() => {}}
          />
          <MenuItem
            icon="language"
            label="Ngôn ngữ"
            value="Tiếng Việt"
            onPress={() => {}}
          />
          <MenuItem
            icon="palette"
            label="Giao diện"
            value="Tối"
            onPress={() => {}}
          />
        </View>

        {/* Support Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hỗ trợ</Text>
          <MenuItem
            icon="help"
            label="Trợ giúp"
            onPress={() => {}}
          />
          <MenuItem
            icon="assignment"
            label="Điều khoản dịch vụ"
            onPress={() => {}}
          />
          <MenuItem
            icon="privacy-tip"
            label="Chính sách bảo mật"
            onPress={() => {}}
          />
          <MenuItem
            icon="info"
            label="Về ứng dụng"
            value="v1.0.0"
            onPress={() => {}}
          />
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <MaterialIcons name="logout" size={20} color={COLORS.danger} />
          <Text style={styles.logoutText}>Đăng xuất</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

interface MenuItemProps {
  icon: string
  label: string
  value?: string
  onPress: () => void
}

const MenuItem: React.FC<MenuItemProps> = ({ icon, label, value, onPress }) => (
  <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
    <View style={styles.menuItemLeft}>
      <View style={styles.iconBox}>
        <MaterialIcons name={icon as any} size={20} color={COLORS.primary} />
      </View>
      <Text style={styles.menuLabel}>{label}</Text>
    </View>
    <View style={styles.menuItemRight}>
      {value && <Text style={styles.menuValue}>{value}</Text>}
      <MaterialIcons name="chevron-right" size={20} color={COLORS.textSecondary} />
    </View>
  </TouchableOpacity>
)

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.darkBg,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.darkBg,
    paddingHorizontal: SPACING.lg,
    paddingTop: 45,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.darkCard,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginVertical: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.darkBorder,
    gap: SPACING.lg,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary + '30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  email: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  phone: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
    marginLeft: SPACING.sm,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.darkCard,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.darkBorder,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.lg,
    flex: 1,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  menuValue: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.danger + '20',
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING.lg,
    marginBottom: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.danger,
    gap: SPACING.md,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.danger,
  },
})
