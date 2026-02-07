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
} from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigation } from '@react-navigation/native'
import { logout } from '../redux/slices/authSlice'
import { SPACING } from '../constants'
import type { RootState } from '../redux/store'

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

  const handleSelectRegion = (regionId: string) => {
    setSelectedRegion(regionId)
    setShowRegionModal(false)
    // TODO: Save region preference to backend
    Alert.alert('Thành công', `Đã chọn khu vực ${REGIONS.find(r => r.id === regionId)?.name}`)
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
      icon: 'settings',
      label: 'Cài đặt ứng dụng',
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
                <Text style={styles.avatarText}>
                  {user?.name?.charAt(0)?.toUpperCase() || 'T'}
                </Text>
              </View>
              <TouchableOpacity style={styles.cameraButton}>
                <MaterialIcons name="camera-alt" size={16} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* User Info */}
            <Text style={styles.profileName}>{user?.name || 'Tài xế'}</Text>
            <Text style={styles.profileEmail}>{user?.email || 'email@example.com'}</Text>

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

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => navigation.navigate('EditProfile' as never)}
          >
            <View style={styles.quickActionIcon}>
              <MaterialIcons name="edit" size={20} color="#FF6B00" />
            </View>
            <Text style={styles.quickActionText}>Sửa hồ sơ</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickActionButton}>
            <View style={styles.quickActionIcon}>
              <MaterialIcons name="share" size={20} color="#3b82f6" />
            </View>
            <Text style={styles.quickActionText}>Chia sẻ</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickActionButton}>
            <View style={styles.quickActionIcon}>
              <MaterialIcons name="attach-money" size={20} color="#10b981" />
            </View>
            <Text style={styles.quickActionText}>Nạp tiền</Text>
          </TouchableOpacity>
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
    width: 100,
    height: 100,
    borderRadius: 50,
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
})
