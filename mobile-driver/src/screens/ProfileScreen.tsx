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
  Modal,
  Pressable,
  TextInput,
  ActivityIndicator,
} from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigation } from '@react-navigation/native'
import { logout } from '../redux/slices/authSlice'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { SPACING } from '../constants'
import type { RootState } from '../redux/store'
import { driverService } from '../services/driverService'
import { Image } from 'react-native'
const REGIONS = [
  { id: 'hanoi', name: 'Hà Nội', icon: 'location-city' },
  { id: 'danang', name: 'Đà Nẵng', icon: 'location-city' },
  { id: 'hcm', name: 'TP. Hồ Chí Minh', icon: 'location-city' },
  { id: 'nghean', name: 'Nghệ An', icon: 'location-city' },
  { id: 'thanhhoa', name: 'Thanh Hóa', icon: 'location-city' },
  { id: 'haiphong', name: 'Hải Phòng', icon: 'location-city' },
  { id: 'cantho', name: 'Cần Thơ', icon: 'location-city' },
  { id: 'hue', name: 'Huế', icon: 'location-city' },
]

export default function ProfileScreen() {
  const dispatch = useDispatch()
  const navigation = useNavigation()
  const { user } = useSelector((state: RootState) => state.auth)
  const [selectedRegion, setSelectedRegion] = useState('hanoi')
  const [showRegionModal, setShowRegionModal] = useState(false)
  const [showPhoneModal, setShowPhoneModal] = useState(false)
  const [newPhone, setNewPhone] = useState('')
  const [updatingPhone, setUpdatingPhone] = useState(false)

  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đăng xuất',
        style: 'destructive',
        onPress: async () => {
          try {
            // Xóa token và user data từ AsyncStorage
            await AsyncStorage.removeItem('token')
            await AsyncStorage.removeItem('user')
            console.log('✅ AsyncStorage cleared')
            
            // Dispatch logout action để reset Redux state
            dispatch(logout())
          } catch (error) {
            console.error('❌ Error during logout:', error)
            // Vẫn logout dù có lỗi
            dispatch(logout())
          }
        },
      },
    ])
  }

  const handleSelectRegion = (regionId: string) => {
    setSelectedRegion(regionId)
    setShowRegionModal(false)
    // TODO: Save region preference to backend
    Alert.alert('Thành công', `Đã chọn khu vực ${REGIONS.find(r => r.id === regionId)?.name}`)
  }

  const handleUpdatePhone = async () => {
    // Validate phone number
    const phoneRegex = /^(0|\+84)(\s|\.)?((3[2-9])|(5[689])|(7[06-9])|(8[1-689])|(9[0-46-9]))(\d)(\s|\.)?(\d{3})(\s|\.)?(\d{3})$/
    
    if (!newPhone.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập số điện thoại')
      return
    }

    if (!phoneRegex.test(newPhone.trim())) {
      Alert.alert('Lỗi', 'Số điện thoại không hợp lệ')
      return
    }

    try {
      setUpdatingPhone(true)
      await driverService.updateProfile(user?._id || '', { phone: newPhone.trim() })
      Alert.alert('Thành công', 'Cập nhật số điện thoại thành công', [
        {
          text: 'OK',
          onPress: () => {
            setShowPhoneModal(false)
            setNewPhone('')
            // TODO: Refresh user data from backend
          },
        },
      ])
    } catch (error: any) {
      console.error('Update phone error:', error)
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể cập nhật số điện thoại')
    } finally {
      setUpdatingPhone(false)
    }
  }

  const currentRegion = REGIONS.find(r => r.id === selectedRegion)

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
                  color={item.isDanger ? '#ef4444' : '#FF6B00'}
                />
              </View>
              <Text
                style={[
                  styles.menuLabel,
                  item.isDanger && { color: '#ef4444' },
                ]}
              >
                {item.label}
              </Text>
            </View>
            <View style={styles.menuRight}>
              {item.value && (
                <Text style={styles.menuValue}>{item.value}</Text>
              )}
              <MaterialIcons
                name="chevron-right"
                size={20}
                color={item.isDanger ? '#ef4444' : '#94a3b8'}
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
      onPress: () => navigation.navigate('EditProfile' as never),
    },
    {
      icon: 'phone',
      label: 'Số điện thoại',
      value: user?.phone || 'Chưa cập nhật',
      onPress: () => {
        setNewPhone(user?.phone || '')
        setShowPhoneModal(true)
      },
    },
    {
      icon: 'email',
      label: 'Email',
      value: user?.email || 'Chưa cập nhật',
    },
    {
      icon: 'location-on',
      label: 'Khu vực hoạt động',
      value: currentRegion?.name,
      onPress: () => setShowRegionModal(true),
    },
    
    {
      icon: 'lock-outline',
      label: 'Đổi mật khẩu',
      onPress: () => navigation.navigate('ChangePassword' as never),
    },
  ]

  const settingsItems: MenuItem[] = [
    {
      icon: 'notifications-none',
      label: 'Thông báo',
      onPress: () => navigation.navigate('Notifications' as never),
    },
    {
      icon: 'language',
      label: 'Ngôn ngữ',
      value: 'Tiếng Việt',
    },
    {
      icon: 'settings',
      label: 'Cài đặt ứng dụng',
      onPress: () => navigation.navigate('SettingsScreen' as never),
    },
  ]

  const supportItems: MenuItem[] = [
    {
      icon: 'help-outline',
      label: 'Trợ giúp & Hỗ trợ',
      onPress: () => navigation.navigate('Support' as never),
    },
    {
      icon: 'description',
      label: 'Điều khoản dịch vụ',
      onPress: () => navigation.navigate('TermsOfService' as never),
    },
    {
      icon: 'privacy-tip',
      label: 'Chính sách bảo mật',
      onPress: () => navigation.navigate('PrivacyPolicy' as never),
    },
    {
      icon: 'info-outline',
      label: 'Về ứng dụng',
      value: 'v1.0.0',
    },
  ]

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Profile Header with Gradient */}
        <View style={styles.headerWrapper}>
          <LinearGradient
            colors={['#FF8A3D', '#FF6B00', '#E85D00']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.profileHeader}
          >
            {/* Decorative circles */}
            <View style={styles.decorCircle1} />
            <View style={styles.decorCircle2} />

            {/* Avatar */}
            <View style={styles.avatarContainer}>
              <View style={styles.avatarInner}>
                <Image 
                  source={require('../assets/av.png')}
                  style={styles.avatarImage}
                />
              </View>
            </View>

            {/* User Info */}
            <Text style={styles.profileName}>
              {user?.firstName && user?.lastName
                ? `${user.firstName} ${user.lastName}`
                : 'Tài xế'}
            </Text>
            <Text style={styles.profileEmail}>{user?.email}</Text>

            {/* Driver Types Badges */}
            {user?.driverTypes && user.driverTypes.length > 0 && (
              <View style={styles.driverTypesBadges}>
                {user.driverTypes.map((type: string, index: number) => {
                  const typeLabels: Record<string, string> = {
                    hire: 'Lái xe hộ',
                    rideshare: 'Ghép xe',
                    delivery: 'Vận chuyển',
                  }
                  return (
                    <View key={index} style={styles.driverTypeBadge}>
                      <Text style={styles.driverTypeBadgeText}>
                        {typeLabels[type] || type}
                      </Text>
                    </View>
                  )
                })}
              </View>
            )}
          </LinearGradient>
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
            <MaterialIcons name="logout" size={20} color="#ef4444" />
            <Text style={styles.logoutText}>Đăng xuất</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: SPACING.xxl }} />
      </ScrollView>

      {/* Region Selection Modal */}
      <Modal
        visible={showRegionModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRegionModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowRegionModal(false)}
        >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn khu vực hoạt động</Text>
              <TouchableOpacity onPress={() => setShowRegionModal(false)}>
                <MaterialIcons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.regionList}>
              {REGIONS.map((region) => (
                <TouchableOpacity
                  key={region.id}
                  style={[
                    styles.regionItem,
                    selectedRegion === region.id && styles.regionItemSelected,
                  ]}
                  onPress={() => handleSelectRegion(region.id)}
                >
                  <View style={[
                    styles.regionIconBox,
                    selectedRegion === region.id && styles.regionIconBoxSelected,
                  ]}>
                    <MaterialIcons
                      name={region.icon as any}
                      size={24}
                      color={selectedRegion === region.id ? '#fff' : '#FF6B00'}
                    />
                  </View>
                  <Text style={[
                    styles.regionName,
                    selectedRegion === region.id && styles.regionNameSelected,
                  ]}>
                    {region.name}
                  </Text>
                  {selectedRegion === region.id && (
                    <MaterialIcons name="check-circle" size={24} color="#FF6B00" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Phone Number Update Modal */}
      <Modal
        visible={showPhoneModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPhoneModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => !updatingPhone && setShowPhoneModal(false)}
        >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cập nhật số điện thoại</Text>
              <TouchableOpacity 
                onPress={() => setShowPhoneModal(false)}
                disabled={updatingPhone}
              >
                <MaterialIcons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={styles.phoneModalBody}>
              <View style={styles.phoneInputContainer}>
                <View style={styles.phoneIconBox}>
                  <MaterialIcons name="phone" size={20} color="#FF6B00" />
                </View>
                <TextInput
                  style={styles.phoneInput}
                  placeholder="Nhập số điện thoại mới"
                  placeholderTextColor="#94a3b8"
                  value={newPhone}
                  onChangeText={setNewPhone}
                  keyboardType="phone-pad"
                  maxLength={15}
                  editable={!updatingPhone}
                  autoFocus
                />
              </View>

              <View style={styles.phoneHintBox}>
                <MaterialIcons name="info-outline" size={16} color="#64748b" />
                <Text style={styles.phoneHint}>
                  Số điện thoại phải là số điện thoại Việt Nam hợp lệ
                </Text>
              </View>

              <View style={styles.phoneModalActions}>
                <TouchableOpacity
                  style={[styles.phoneModalButton, styles.phoneModalButtonCancel]}
                  onPress={() => setShowPhoneModal(false)}
                  disabled={updatingPhone}
                >
                  <Text style={styles.phoneModalButtonTextCancel}>Hủy</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.phoneModalButton, styles.phoneModalButtonSave]}
                  onPress={handleUpdatePhone}
                  disabled={updatingPhone}
                >
                  {updatingPhone ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <MaterialIcons name="check" size={18} color="#fff" />
                      <Text style={styles.phoneModalButtonTextSave}>Lưu</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
    backgroundColor: '#f8fafc',
  },
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },

  // Profile Header Styles
  headerWrapper: {
    marginBottom: -30,
  },
  profileHeader: {
    paddingTop: SPACING.xxl + SPACING.lg,
    paddingBottom: SPACING.xxl * 2,
    alignItems: 'center',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  decorCircle1: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  decorCircle2: {
    position: 'absolute',
    bottom: -40,
    left: -40,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  avatarContainer: {
    marginBottom: SPACING.md,
    position: 'relative',
    zIndex: 1,
  },
  avatarInner: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  avatarText: {
    fontSize: 40,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -1,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 75,
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  profileName: {
    fontSize: 24,
    fontWeight: '900',
    color: '#fff',
    marginBottom: SPACING.xs,
    letterSpacing: -0.5,
    zIndex: 1,
  },
  profileEmail: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.85)',
    marginBottom: SPACING.md,
    fontWeight: '500',
    zIndex: 1,
  },
  driverTypesBadges: {
    flexDirection: 'row',
    gap: SPACING.xs,
    zIndex: 1,
  },
  driverTypeBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  driverTypeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },

  // Quick Actions
  quickActions: {
    flexDirection: 'row',
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.xl,
    gap: SPACING.md,
  },
  quickActionButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
    gap: SPACING.xs,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: -0.2,
  },

  // Menu Section
  section: {
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.5,
    marginBottom: SPACING.lg,
  },
  menuContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    flex: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff5eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainerDanger: {
    backgroundColor: '#fee2e2',
  },
  menuLabel: {
    fontSize: 15,
    color: '#0f172a',
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  menuRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  menuValue: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
    maxWidth: 120,
  },

  // Logout Section
  logoutSection: {
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.xl,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: SPACING.lg,
    gap: SPACING.md,
    borderWidth: 2,
    borderColor: '#fee2e2',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  logoutText: {
    color: '#ef4444',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.3,
  },

  // Region Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  regionList: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
  },
  regionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  regionItemSelected: {
    backgroundColor: '#fff5eb',
    borderColor: '#FF6B00',
  },
  regionIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  regionIconBoxSelected: {
    backgroundColor: '#FF6B00',
  },
  regionName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  regionNameSelected: {
    color: '#FF6B00',
    fontWeight: '800',
  },

  // Phone Modal Styles
  phoneModalBody: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  phoneIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff5eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  phoneInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    paddingVertical: SPACING.sm,
  },
  phoneHintBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.md,
  },
  phoneHint: {
    flex: 1,
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
  },
  phoneModalActions: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.xl,
  },
  phoneModalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.lg,
    borderRadius: 16,
    gap: SPACING.sm,
  },
  phoneModalButtonCancel: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  phoneModalButtonSave: {
    backgroundColor: '#FF6B00',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  phoneModalButtonTextCancel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#64748b',
  },
  phoneModalButtonTextSave: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
})
