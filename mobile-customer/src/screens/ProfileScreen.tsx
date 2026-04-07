
import { useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Switch,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigation } from '@react-navigation/native'
import { logout, loginSuccess } from '../redux/slices/authSlice'
import { authService } from '../services/authService'
import type { RootState } from '../redux/store'
import { COLORS, SPACING } from '../constants'

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
  const navigation = useNavigation<any>()
  const dispatch = useDispatch()
  const user = useSelector((state: RootState) => state.auth.user)
  const themeMode = useSelector((state: RootState) => state.theme.mode)
  const [isDarkMode, setIsDarkMode] = useState(themeMode === 'dark')

  // OTP State
  const [isOtpModalVisible, setIsOtpModalVisible] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [countdown, setCountdown] = useState(0)
  const [isLoadingOtp, setIsLoadingOtp] = useState(false)

  console.log('User data in ProfileScreen:', user)

  const requestPhoneVerify = async () => {
    if (!user?.phone) {
      Alert.alert('Chưa có SĐT', 'Vui lòng cập nhật số điện thoại trước khi xác minh.')
      return
    }
    
    setIsLoadingOtp(true)
    try {
      const res = await authService.sendOtp()
      console.log('Send OTP res:', res)
      setIsOtpModalVisible(true)
      setCountdown(60) // 1 phút
      
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) clearInterval(timer)
          return prev - 1
        })
      }, 1000)
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Không thể gửi mã OTP')
    } finally {
      setIsLoadingOtp(false)
    }
  }

  const handleVerifyOtp = async () => {
    if (otpCode.length < 6) {
      Alert.alert('Thông báo', 'Mã OTP bao gồm 6 chữ số')
      return
    }
    
    setIsLoadingOtp(true)
    try {
      await authService.verifyOtp(otpCode)
      Alert.alert('Thành công', 'Số điện thoại đã được xác thực')
      setIsOtpModalVisible(false)
      
      // trigger redux update by refreshing the profile
      const updatedUser = await authService.updateProfile(user!.id, { phone: user!.phone })
      // Keep existing token from Redux state since updateProfile does not return token
      const currentToken = await authService.getToken() || ''
      dispatch(loginSuccess({
        token: currentToken,
        user: updatedUser
      }))
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Mã OTP không hợp lệ')
    } finally {
      setIsLoadingOtp(false)
    }
  }

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
              item.isDanger 
                ? styles.iconContainerDanger 
                : { backgroundColor: '#fff5eb' }
            ]}>
              <MaterialIcons
                name={item.icon as any}
                size={20}
                color={item.isDanger ? '#ef4444' : COLORS.primary}
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
              trackColor={{ false: '#e2e8f0', true: COLORS.primary + '50' }}
              thumbColor={isDarkMode ? COLORS.primary : '#94a3b8'}
            />
          ) : (
            <>
              {item.value && (
                <Text style={styles.menuValue} numberOfLines={1} ellipsizeMode="tail">{item.value}</Text>
              )}
              <MaterialIcons
                name="chevron-right"
                size={20}
                color={item.isDanger ? '#ef4444' : '#94a3b8'}
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
      onPress: () => navigation.navigate('EditProfile'),
    },
    {
      icon: 'phone',
      label: 'Số điện thoại',
      value: user?.phone 
        ? `${user.phone} ${user.isPhoneVerified ? '(✓)' : '(Chưa xác minh)'}` 
        : 'N/A',
      onPress: () => {
        if (!user?.isPhoneVerified) {
          Alert.alert('Xác thực Zalo', 'Bạn có muốn nhận mã xác thực qua Zalo của số điện thoại này?', [
            { text: 'Huỷ', style: 'cancel' },
            { text: 'Gửi OTP', onPress: requestPhoneVerify }
          ])
        } else {
          Alert.alert('Số điện thoại', 'Số điện thoại đã được xác thực.')
        }
      },
    },
    {
      icon: 'email',
      label: 'Email',
      value: user?.email || 'N/A',
      onPress: () => Alert.alert('Email', user?.email || 'Chưa cập nhật'),
    },
    {
      icon: 'location-on',
      label: 'Vùng/Khu vực',
      value: 'Hà Nội, Việt Nam',
      onPress: () => navigation.navigate('SelectRegion'),
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
      onPress: () => Alert.alert('Ngôn ngữ', 'Tính năng đang được phát triển'),
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
      onPress: () => Alert.alert('Vị trí', 'Quyền truy cập vị trí đã được bật'),
    },
  ]

  const supportItems: MenuItem[] = [
    {
      icon: 'help-outline',
      label: 'Trợ giúp & Hỗ trợ',
      onPress: () => navigation.navigate('Support'),
    },
    {
      icon: 'description',
      label: 'Điều khoản dịch vụ',
      onPress: () => navigation.navigate('TermsOfService'),
    },
    {
      icon: 'privacy-tip',
      label: 'Chính sách bảo mật',
      onPress: () => navigation.navigate('PrivacyPolicy'),
    },
    {
      icon: 'info-outline',
      label: 'Về ứng dụng',
      value: 'v1.0.0',
      onPress: () => Alert.alert(
        'Về FireGo',
        'Phiên bản: 1.0.0\n\nFireGo - Nền tảng di chuyển thông minh\n\n© 2024 FireGo. All rights reserved.',
        [{ text: 'Đóng' }]
      ),
    },
  ]

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Tài khoản</Text>
      </View>

      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatarInner}>
            <MaterialIcons name="person" size={56} color="#fff" />
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

      {/* Driver Registration Card */}
      <TouchableOpacity 
        style={styles.driverRegistrationCard}
        activeOpacity={0.9}
        onPress={() => Alert.alert('Đăng ký tài xế', 'Chức năng đang được phát triển')}
      >
        <View style={styles.driverCardGradient}>
          <View style={styles.driverCardDecor1} />
          <View style={styles.driverCardDecor2} />
          
          <View style={styles.driverCardContent}>
            <View style={styles.driverCardIconBox}>
              <MaterialIcons name="local-taxi" size={32} color="#fff" />
            </View>
            <View style={styles.driverCardTextContent}>
              <Text style={styles.driverCardTitle}>Bạn muốn trở thành tài xế?</Text>
              <Text style={styles.driverCardDescription}>
                Đăng ký ngay để bắt đầu kiếm tiền với FireGo
              </Text>
            </View>
            <View style={styles.driverCardArrow}>
              <MaterialIcons name="arrow-forward" size={24} color="#fff" />
            </View>
          </View>
        </View>
      </TouchableOpacity>

      {/* Premium/Status Card */}
      <View style={styles.premiumCard}>
        <View style={styles.premiumContent}>
          <View style={styles.premiumLeft}>
            <MaterialIcons name="star" size={24} color="#FF6B00" />
            <View>
              <Text style={styles.premiumLabel}>Thành viên thường</Text>
              <Text style={styles.premiumSubtext}>Tham gia từ tháng 3, 2024</Text>
            </View>
          </View>
          <MaterialIcons name="chevron-right" size={24} color="#64748b" />
        </View>
      </View>

      <MenuSection title="Tài khoản" items={accountItems} />
      <MenuSection title="Cài đặt" items={settingsItems} />
      <MenuSection title="Hỗ trợ & Thông tin" items={supportItems} />

      <View style={styles.logoutSection}>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <MaterialIcons name="logout" size={20} color="#ef4444" />
          <Text style={styles.logoutText}>Đăng xuất</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: SPACING.xxl }} />

      {/* OTP Verification Modal */}
      <Modal
        visible={isOtpModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsOtpModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Xác thực số điện thoại</Text>
            <Text style={styles.modalDesc}>Mã OTP 6 số đã được gửi qua Zalo của số {user?.phone}</Text>
            
            <TextInput
              style={styles.otpInput}
              keyboardType="number-pad"
              maxLength={6}
              placeholder="Nhập 6 số OTP"
              value={otpCode}
              onChangeText={setOtpCode}
            />

            <TouchableOpacity 
              style={[styles.primaryButton, (!otpCode || otpCode.length < 6) && styles.disabledButton]}
              onPress={handleVerifyOtp}
              disabled={isLoadingOtp || otpCode.length < 6}
            >
              {isLoadingOtp ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Xác nhận</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.resendButton}
              onPress={requestPhoneVerify}
              disabled={countdown > 0 || isLoadingOtp}
            >
              <Text style={[styles.resendText, countdown > 0 && styles.disabledText]}>
                {countdown > 0 ? `Gửi lại sau ${countdown}s` : 'Gửi lại mã OTP'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.cancelLink}
              onPress={() => setIsOtpModalVisible(false)}
            >
              <Text style={styles.cancelText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#fff',
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0f172a',
  },
  profileHeader: {
    backgroundColor: '#fff',
    paddingVertical: 32,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#fff5eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  avatarInner: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 20,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#fff5eb',
    borderRadius: 20,
    gap: 6,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  
  // Driver Registration Card
  driverRegistrationCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  driverCardGradient: {
    backgroundColor: COLORS.primary,
    padding: 20,
    minHeight: 120,
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  driverCardDecor1: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    top: -30,
    right: -30,
  },
  driverCardDecor2: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    bottom: -20,
    left: -20,
  },
  driverCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    zIndex: 1,
  },
  driverCardIconBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverCardTextContent: {
    flex: 1,
  },
  driverCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  driverCardDescription: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 18,
  },
  driverCardArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Premium Card
  premiumCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  premiumContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  premiumLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  premiumLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 2,
  },
  premiumSubtext: {
    fontSize: 13,
    color: '#64748b',
  },
  
  // Menu Section
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    padding: 16,
    paddingBottom: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: 56,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainerDanger: {
    backgroundColor: '#fef2f2',
  },
  menuLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#0f172a',
    flex: 1,
  },
  menuLabelDanger: {
    color: '#ef4444',
  },
  menuValue: {
    fontSize: 14,
    color: '#64748b',
    marginRight: 8,
    maxWidth: 120,
  },
  
  // Logout Section
  logoutSection: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ef4444',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  modalDesc: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 20,
  },
  otpInput: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 12,
    fontSize: 24,
    letterSpacing: 4,
    width: '100%',
    textAlign: 'center',
    marginBottom: 20,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resendButton: {
    marginBottom: 16,
  },
  resendText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  disabledText: {
    color: '#94a3b8',
  },
  cancelLink: {
    padding: 8,
  },
  cancelText: {
    color: '#64748b',
    fontSize: 14,
  },
})
