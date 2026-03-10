import { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  StatusBar,
  Switch,
} from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { logout } from '../redux/slices/authSlice'
import { SPACING } from '../constants'
import type { RootState } from '../redux/store'
import type { RootStackParamList } from '../types'

type NavigationProp = NativeStackNavigationProp<RootStackParamList>

interface SettingItem {
  id: string
  title: string
  icon: string
  iconColor: string
  iconBg: string
  onPress?: () => void
  showArrow?: boolean
  showSwitch?: boolean
  switchValue?: boolean
  onSwitchChange?: (value: boolean) => void
}

export default function SettingsScreen() {
  const dispatch = useDispatch()
  const navigation = useNavigation<NavigationProp>()
  const { user } = useSelector((state: RootState) => state.auth)
  
  // Settings states
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [darkModeEnabled, setDarkModeEnabled] = useState(false)

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

  const accountSettings: SettingItem[] = [
    {
      id: 'profile',
      title: 'Thông tin cá nhân',
      icon: 'person',
      iconColor: '#FF6B00',
      iconBg: '#FFF5F0',
      onPress: () => navigation.navigate('EditProfile' as any),
      showArrow: true,
    },
    {
      id: 'vehicle',
      title: 'Thông tin xe',
      icon: 'directions-car',
      iconColor: '#2196F3',
      iconBg: '#E3F2FD',
      onPress: () => navigation.navigate('VehicleInfo' as any),
      showArrow: true,
    },
    {
      id: 'earnings',
      title: 'Thu nhập',
      icon: 'attach-money',
      iconColor: '#4CAF50',
      iconBg: '#E8F5E9',
      onPress: () => navigation.navigate('Earnings' as any),
      showArrow: true,
    },
  ]

  const preferencesSettings: SettingItem[] = [
    {
      id: 'notifications',
      title: 'Thông báo',
      icon: 'notifications',
      iconColor: '#FF9800',
      iconBg: '#FFF3E0',
      showSwitch: true,
      switchValue: notificationsEnabled,
      onSwitchChange: setNotificationsEnabled,
    },
    {
      id: 'sound',
      title: 'Âm thanh',
      icon: 'volume-up',
      iconColor: '#9C27B0',
      iconBg: '#F3E5F5',
      showSwitch: true,
      switchValue: soundEnabled,
      onSwitchChange: setSoundEnabled,
    },
    {
      id: 'dark-mode',
      title: 'Chế độ tối',
      icon: 'dark-mode',
      iconColor: '#607D8B',
      iconBg: '#ECEFF1',
      showSwitch: true,
      switchValue: darkModeEnabled,
      onSwitchChange: setDarkModeEnabled,
    },
    {
      id: 'language',
      title: 'Ngôn ngữ',
      icon: 'language',
      iconColor: '#00BCD4',
      iconBg: '#E0F7FA',
      onPress: () => Alert.alert('Ngôn ngữ', 'Chức năng đang phát triển'),
      showArrow: true,
    },
  ]

  const securitySettings: SettingItem[] = [
    {
      id: 'change-password',
      title: 'Đổi mật khẩu',
      icon: 'lock',
      iconColor: '#F44336',
      iconBg: '#FFEBEE',
      onPress: () => navigation.navigate('ChangePassword' as any),
      showArrow: true,
    },
    {
      id: 'privacy',
      title: 'Chính sách bảo mật',
      icon: 'security',
      iconColor: '#673AB7',
      iconBg: '#EDE7F6',
      onPress: () => navigation.navigate('PrivacyPolicy' as any),
      showArrow: true,
    },
  ]

  const aboutSettings: SettingItem[] = [
    {
      id: 'terms',
      title: 'Điều khoản sử dụng',
      icon: 'description',
      iconColor: '#795548',
      iconBg: '#EFEBE9',
      onPress: () => navigation.navigate('TermsOfService' as any),
      showArrow: true,
    },
    {
      id: 'support',
      title: 'Trợ giúp & Hỗ trợ',
      icon: 'help',
      iconColor: '#009688',
      iconBg: '#E0F2F1',
      onPress: () => navigation.navigate('Support' as any),
      showArrow: true,
    },
    {
      id: 'version',
      title: 'Phiên bản',
      icon: 'info',
      iconColor: '#9E9E9E',
      iconBg: '#F5F5F5',
      onPress: () => Alert.alert('Phiên bản', 'FireGo Driver v1.0.0'),
      showArrow: false,
    },
  ]

  const renderSettingItem = (item: SettingItem) => (
    <TouchableOpacity
      key={item.id}
      style={styles.settingItem}
      onPress={item.onPress}
      disabled={!item.onPress}
      activeOpacity={0.7}
    >
      <View style={styles.settingLeft}>
        <View style={[styles.iconContainer, { backgroundColor: item.iconBg }]}>
          <MaterialIcons name={item.icon as any} size={22} color={item.iconColor} />
        </View>
        <Text style={styles.settingTitle}>{item.title}</Text>
      </View>

      <View style={styles.settingRight}>
        {item.showSwitch && (
          <Switch
            value={item.switchValue}
            onValueChange={item.onSwitchChange}
            trackColor={{ false: '#D1D5DB', true: '#FFB380' }}
            thumbColor={item.switchValue ? '#FF6B00' : '#F3F4F6'}
            ios_backgroundColor="#D1D5DB"
          />
        )}
        {item.showArrow && (
          <MaterialIcons name="chevron-right" size={24} color="#9CA3AF" />
        )}
      </View>
    </TouchableOpacity>
  )

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#FF6B00" />
      
      {/* Header với Gradient */}
      <LinearGradient
        colors={['#e0e0e0', '#f1ebe7']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Cài đặt</Text>
          <View style={styles.headerSpacer} />
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {/* User Info Card */}
        <View style={styles.userCard}>
          <View style={styles.userAvatar}>
            <MaterialIcons name="person" size={40} color="#FF6B00" />
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>
              {user?.firstName} {user?.lastName}
            </Text>
            <Text style={styles.userPhone}>{user?.phone || 'Chưa có SĐT'}</Text>
            <View style={styles.userBadge}>
              <MaterialIcons name="verified" size={14} color="#4CAF50" />
              <Text style={styles.userBadgeText}>Tài xế đã xác thực</Text>
            </View>
          </View>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>TÀI KHOẢN</Text>
          <View style={styles.settingsList}>
            {accountSettings.map(renderSettingItem)}
          </View>
        </View>

        {/* Preferences Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CÀI ĐẶT</Text>
          <View style={styles.settingsList}>
            {preferencesSettings.map(renderSettingItem)}
          </View>
        </View>

        {/* Security Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>BẢO MẬT</Text>
          <View style={styles.settingsList}>
            {securitySettings.map(renderSettingItem)}
          </View>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>VỀ ỨNG DỤNG</Text>
          <View style={styles.settingsList}>
            {aboutSettings.map(renderSettingItem)}
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={['#EF4444', '#DC2626']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.logoutGradient}
          >
            <MaterialIcons name="logout" size={20} color="#FFFFFF" />
            <Text style={styles.logoutText}>Đăng xuất</Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>FireGo Driver v1.0.0</Text>
          <Text style={styles.footerSubtext}>© 2026 FireGo. All rights reserved.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingTop: SPACING.md,
    paddingBottom: SPACING.lg,
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(58, 55, 55, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111111',
    letterSpacing: 0.5,
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: SPACING.xl,
  },
  // User Card
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: '#FFFFFF',
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    marginBottom: SPACING.md,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  userAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFF5F0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FF6B00',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 4,
  },
  userPhone: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  userBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  userBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4CAF50',
  },
  // Section
  section: {
    marginTop: SPACING.md,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 1.2,
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.xs,
  },
  settingsList: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: SPACING.lg,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  // Logout Button
  logoutButton: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.xl,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  logoutGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  // Footer
  footer: {
    alignItems: 'center',
    marginTop: SPACING.xl,
    paddingBottom: SPACING.lg,
  },
  footerText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 11,
    color: '#D1D5DB',
  },
})
