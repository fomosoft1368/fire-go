import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import { COLORS, SPACING, BORDER_RADIUS } from '../constants'
import type { RootState } from '../redux/store'
import { driverService } from '../services/driverService'
import { updateUser, logout } from '../redux/slices/authSlice'
import { requestDeletion, logout as authServiceLogout } from '../services/authService'
import AsyncStorage from '@react-native-async-storage/async-storage'

export default function EditProfileScreen() {
  const dispatch = useDispatch()
  const navigation = useNavigation()
  const { user } = useSelector((state: RootState) => state.auth)

  const [formData, setFormData] = useState({
    name: user?.firstName && user?.lastName
      ? `${user.firstName} ${user.lastName}`
      : user?.name || '',
    email: user?.email || '',
    phone: user?.phone || user?.phoneNumber || '',
  })

  const [selectedDriverTypes, setSelectedDriverTypes] = useState<string[]>(
    user?.driverTypes || ['rideshare']
  )

  const [deleteModalVisible, setDeleteModalVisible] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  // Log để debug
  useEffect(() => {
    console.log('[EditProfile] Component mounted')
    console.log('[EditProfile] User from Redux:', user)
    console.log('[EditProfile] Driver Types from Redux:', user?.driverTypes)
    console.log('[EditProfile] Selected Driver Types:', selectedDriverTypes)
  }, [])

  // Refresh data khi screen focus
  useFocusEffect(
    React.useCallback(() => {
      const loadProfile = async () => {
        try {
          console.log('[EditProfile] Screen focused, loading fresh profile...')
          const profile = await driverService.getProfile()
          console.log('[EditProfile] Fresh profile from API:', profile)
          console.log('[EditProfile] Fresh driverTypes:', profile.driverTypes)

          // Update Redux
          dispatch(updateUser(profile))

          // Update local state
          setSelectedDriverTypes(profile.driverTypes || ['rideshare'])
          setFormData({
            name: profile.firstName && profile.lastName
              ? `${profile.firstName} ${profile.lastName}`
              : profile.name || '',
            email: profile.email || '',
            phone: profile.phone || profile.phoneNumber || '',
          })
        } catch (error) {
          console.error('[EditProfile] Error loading profile:', error)
        }
      }

      loadProfile()
    }, [])
  )

  const [saving, setSaving] = useState(false)

  const driverTypeOptions = [
    { value: 'hire', label: 'Lái xe hộ', icon: 'person' },
    { value: 'rideshare', label: 'Ghép xe', icon: 'people' },
    { value: 'delivery', label: 'Vận chuyển', icon: 'local-shipping' },
  ]

  const toggleDriverType = (type: string) => {
    // Disabled as requested by user
    // Alert.alert('Thông báo', 'Loại tài xế không được thay đổi ở đây. Vui lòng liên hệ tổng đài hỗ trợ.')
  }

  const handleSave = async () => {
    try {
      setSaving(true)

      const updateData = {
        phone: formData.phone,
        email: formData.email,
        driverTypes: selectedDriverTypes,
      }

      console.log('[EditProfile] Saving profile...')
      console.log('[EditProfile] Update data:', JSON.stringify(updateData, null, 2))
      console.log('[EditProfile] Selected driverTypes:', selectedDriverTypes)

      const result = await driverService.updateMyProfile(updateData)

      console.log('[EditProfile] ✅ Save successful')
      console.log('[EditProfile] Result:', JSON.stringify(result, null, 2))

      // Refetch profile để đảm bảo dữ liệu đồng bộ
      const updatedProfile = await driverService.getProfile()
      console.log('[EditProfile] ✅ Updated profile from API:', JSON.stringify(updatedProfile, null, 2))
      console.log('[EditProfile] Updated driverTypes:', updatedProfile.driverTypes)

      // Cập nhật Redux state với dữ liệu mới nhất từ API
      dispatch(updateUser(updatedProfile))
      console.log('[EditProfile] ✅ Redux updated')

      // Cập nhật AsyncStorage
      const currentUser = await AsyncStorage.getItem('user')
      if (currentUser) {
        const userObj = JSON.parse(currentUser)
        const mergedUser = { ...userObj, ...updatedProfile }
        await AsyncStorage.setItem('user', JSON.stringify(mergedUser))
        console.log('[EditProfile] ✅ AsyncStorage updated')
      }

      Alert.alert(
        'Thành công',
        'Thông tin cá nhân đã được cập nhật',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      )
    } catch (error: any) {
      console.error('[EditProfile] ❌ Error saving profile:', error)
      console.error('[EditProfile] Error response:', error?.response?.data)
      console.error('[EditProfile] Error message:', error?.message)
      Alert.alert(
        'Lỗi',
        error?.response?.data?.message || error?.message || 'Không thể cập nhật thông tin. Vui lòng thử lại.',
        [{ text: 'OK' }]
      )
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    navigation.goBack()
  }

  const isConfirmValid = deleteConfirmText.trim().toLowerCase().replace('xoá', 'xóa') === 'tôi muốn xóa tài khoản này'

  const handleDeleteAccount = () => {
    setDeleteConfirmText('')
    setDeleteModalVisible(true)
  }

  const confirmDeleteAccount = async () => {
    if (!isConfirmValid) {
      Alert.alert('Lỗi', 'Vui lòng nhập đúng câu xác nhận.')
      return
    }

    try {
      setIsDeleting(true)
      setDeleteModalVisible(false)
      await requestDeletion()
      Alert.alert('Thành công', 'Yêu cầu xóa tài khoản đã được ghi nhận. Bạn sẽ được đăng xuất khỏi tài khoản.')
      await authServiceLogout()
      dispatch(logout())
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể yêu cầu xóa tài khoản')
      setDeleteModalVisible(true)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
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
            onPress={handleCancel}
            activeOpacity={0.7}
          >
            <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chỉnh sửa hồ sơ</Text>
          <View style={styles.headerSpacer} />
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {/* User Card */}
        <View style={styles.userCard}>
          <View style={styles.userAvatar}>
            <Text style={styles.avatarLetter}>
              {formData.name ? formData.name.charAt(0).toUpperCase() : 'D'}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{formData.name || 'Người dùng'}</Text>
            <Text style={styles.userPhone}>{formData.phone || 'Chưa có SĐT'}</Text>
            <View style={styles.userBadge}>
              <MaterialIcons name="verified" size={14} color="#4CAF50" />
              <Text style={styles.userBadgeText}>Đã xác thực</Text>
            </View>
          </View>
        </View>

        {/* Form Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>THÔNG TIN CÁ NHÂN</Text>
          <View style={styles.cardContainer}>
          {/* Name Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Họ và tên</Text>
            <View style={[styles.inputContainer, styles.inputDisabled]}>
              <MaterialIcons
                name="person-outline"
                size={20}
                color={COLORS.textDarkSecondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, styles.inputTextDisabled]}
                value={formData.name}
                placeholder="Nhập họ và tên"
                placeholderTextColor={COLORS.textDarkSecondary}
                editable={false}
              />
            </View>
          </View>

          {/* Phone Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Số điện thoại</Text>
            <View style={styles.inputContainer}>
              <MaterialIcons
                name="phone"
                size={20}
                color={COLORS.textDarkSecondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                value={formData.phone}
                onChangeText={(text) => setFormData({ ...formData, phone: text })}
                placeholder="Nhập số điện thoại"
                placeholderTextColor={COLORS.textDarkSecondary}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          {/* Email Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputContainer}>
              <MaterialIcons
                name="email"
                size={20}
                color={COLORS.textDarkSecondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                value={formData.email}
                onChangeText={(text) => setFormData({ ...formData, email: text })}
                placeholder="Nhập email"
                placeholderTextColor={COLORS.textDarkSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Driver Type Selection */}
          <View style={styles.inputGroup}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.xs / 2}}>
              <Text style={styles.label}>Hạng dịch vụ đăng ký</Text>
              <MaterialIcons name="lock" size={14} color={COLORS.textDarkSecondary} />
            </View>
            <View style={styles.driverTypeContainer}>
              {driverTypeOptions.map((option) => {
                const isSelected = selectedDriverTypes.includes(option.value)
                return (
                  <View
                    key={option.value}
                    style={[
                      styles.driverTypeCard,
                      isSelected && styles.driverTypeCardSelected,
                    ]}
                  >
                    <View
                      style={[
                        styles.driverTypeIconWrapper,
                        isSelected && styles.driverTypeIconWrapperSelected,
                      ]}
                    >
                      <MaterialIcons
                        name={option.icon as any}
                        size={24}
                        color={isSelected ? COLORS.primary : COLORS.textDarkSecondary}
                      />
                    </View>
                    <Text
                      style={[
                        styles.driverTypeLabel,
                        isSelected && styles.driverTypeLabelSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                    {isSelected && (
                      <View style={styles.checkmarkBadge}>
                        <MaterialIcons name="check" size={12} color="#fff" />
                      </View>
                    )}
                  </View>
                )
              })}
            </View>
            <Text style={styles.driverTypeHint}>* Không thể tự thay đổi hạng dịch vụ. Vui lòng liên hệ tổng đài hỗ trợ.</Text>
          </View>
          </View>
        </View>

        {/* Additional Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>THÔNG TIN KHÁC</Text>
          <View style={styles.settingsList}>
          <TouchableOpacity
            style={styles.infoItem}
            activeOpacity={0.7}
            onPress={() => (navigation as any).navigate('VehicleInfo')}
          >
            <View style={styles.settingLeft}>
              <View style={[styles.iconContainer, { backgroundColor: '#E3F2FD' }]}>
                <MaterialIcons name="directions-car" size={22} color="#2196F3" />
              </View>
              <Text style={styles.settingTitle}>Thông tin xe</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.infoItem}
            activeOpacity={0.7}
            onPress={() => (navigation as any).navigate('DocumentVerification')}
          >
            <View style={styles.settingLeft}>
              <View style={[styles.iconContainer, { backgroundColor: '#E0F2F1' }]}>
                <MaterialIcons name="description" size={22} color="#009688" />
              </View>
              <Text style={styles.settingTitle}>Tài liệu xác thực</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.infoItem}
            activeOpacity={0.7}
            onPress={() => (navigation as any).navigate('ChangePassword')}
          >
            <View style={styles.settingLeft}>
              <View style={[styles.iconContainer, { backgroundColor: '#FFEBEE' }]}>
                <MaterialIcons name="lock" size={22} color="#F44336" />
              </View>
              <Text style={styles.settingTitle}>Đổi mật khẩu</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#9CA3AF" />
          </TouchableOpacity>
          </View>
        </View>

        {/* Danger Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>NGUY HIỂM</Text>
          <View style={[styles.settingsList, { borderWidth: 1, borderColor: '#fca5a5' }]}>
          <TouchableOpacity
            style={styles.settingItem}
            activeOpacity={0.7}
            onPress={handleDeleteAccount}
          >
            <View style={styles.settingLeft}>
              <View style={[styles.iconContainer, { backgroundColor: '#fee2e2' }]}>
                <MaterialIcons name="delete-outline" size={22} color="#ef4444" />
              </View>
              <Text style={[styles.settingTitle, { color: '#ef4444' }]}>Yêu cầu xóa tài khoản</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#ef4444" />
          </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: SPACING.xxl }} />
      </ScrollView>

      {/* Bottom Action Buttons */}
      <View style={styles.bottomActions}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={handleCancel}
          activeOpacity={0.8}
        >
          <Text style={styles.cancelButtonText}>Hủy</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          activeOpacity={0.8}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={COLORS.text} />
          ) : (
            <Text style={styles.saveButtonText}>Lưu thay đổi</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Delete Account Confirmation Modal */}
      <Modal
        visible={deleteModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Xác nhận xóa tài khoản</Text>
            <Text style={styles.modalDescription}>
              Tài khoản sẽ bị xóa trong vòng 30 ngày. Để xác nhận, vui lòng nhập chính xác dòng chữ dưới đây:
            </Text>
            <Text style={styles.modalHighlightText}>tôi muốn xóa tài khoản này</Text>
            
            <TextInput
              style={styles.modalInput}
              value={deleteConfirmText}
              onChangeText={setDeleteConfirmText}
              placeholder="Nhập câu xác nhận..."
              placeholderTextColor="#94a3b8"
              autoCapitalize="none"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setDeleteModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalConfirmButton,
                  !isConfirmValid && styles.modalConfirmButtonDisabled
                ]}
                onPress={confirmDeleteAccount}
                disabled={!isConfirmValid || isDeleting}
              >
                {isDeleting ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalConfirmText}>Xóa tài khoản</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
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
  // User Card styling from Settings
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
  avatarLetter: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FF6B00',
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

  // Section Title + Card List Container
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
  cardContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: SPACING.lg,
    borderRadius: 16,
    padding: SPACING.lg,
    gap: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
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
  // Used in Form Card
  inputGroup: {
    gap: SPACING.xs,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: SPACING.xs / 2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: SPACING.md,
  },
  inputIcon: {
    marginRight: SPACING.sm,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#1F2937',
    paddingVertical: SPACING.md,
  },
  inputDisabled: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
  },
  inputTextDisabled: {
    color: COLORS.textDarkSecondary,
  },

  driverTypeContainer: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  driverTypeCard: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: SPACING.sm,
    alignItems: 'center',
    position: 'relative',
    opacity: 0.7,
  },
  driverTypeCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '08',
    opacity: 1,
  },
  driverTypeIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  driverTypeIconWrapperSelected: {
    backgroundColor: 'transparent',
  },
  driverTypeLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textDarkSecondary,
    textAlign: 'center',
  },
  driverTypeLabelSelected: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  checkmarkBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverTypeHint: {
    fontSize: 12,
    color: COLORS.textDarkSecondary,
    fontStyle: 'italic',
    marginTop: SPACING.xs,
  },

  // Bottom Actions
  bottomActions: {
    flexDirection: 'row',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#4B5563',
  },
  saveButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: 16,
    backgroundColor: '#FF6B00',
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: SPACING.sm,
    lineHeight: 20,
  },
  modalHighlightText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.md,
    height: 48,
    fontSize: 15,
    color: '#0f172a',
    backgroundColor: '#f8fafc',
    marginBottom: SPACING.xl,
  },
  modalActions: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  modalCancelButton: {
    flex: 1,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: '#f1f5f9',
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748b',
  },
  modalConfirmButton: {
    flex: 1,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: '#ef4444',
  },
  modalConfirmButtonDisabled: {
    opacity: 0.5,
  },
  modalConfirmText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
})
