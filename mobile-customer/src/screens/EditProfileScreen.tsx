import React, { useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Image,
  Modal,
} from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { useSelector, useDispatch } from 'react-redux'
import type { RootState } from '../redux/store'
import { COLORS, SPACING, BORDER_RADIUS } from '../constants'
import { authService } from '../services/authService'
import { loginSuccess, logout } from '../redux/slices/authSlice'

interface EditProfileScreenProps {
  navigation: any
}

export default function EditProfileScreen({ navigation }: EditProfileScreenProps) {
  const user = useSelector((state: RootState) => state.auth.user)
  const dispatch = useDispatch()
  const [loading, setLoading] = useState(false)

  const formatDateForUI = (dateStr?: string | Date) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr as string;
      const day = d.getDate().toString().padStart(2, '0');
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return dateStr as string;
    }
  }

  const [formData, setFormData] = useState({
    firstName: user?.firstName || (user?.name?.split(' ')[0] ?? ''),
    lastName: user?.lastName || (user?.name?.split(' ').slice(1).join(' ') ?? ''),
    email: user?.email || '',
    dateOfBirth: formatDateForUI(user?.dateOfBirth),
    gender: user?.preferredDriverGender || '',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [deleteModalVisible, setDeleteModalVisible] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')

  const handleDeleteAccount = () => {
    setDeleteConfirmText('')
    setDeleteModalVisible(true)
  }

  const isConfirmValid = deleteConfirmText.trim().toLowerCase().replace('xoá', 'xóa') === 'tôi muốn xóa tài khoản này'

  const confirmDeleteAccount = async () => {
    if (!isConfirmValid) {
      Alert.alert('Lỗi', 'Vui lòng nhập đúng câu xác nhận.')
      return
    }

    try {
      setLoading(true)
      setDeleteModalVisible(false)
      await authService.requestDeletion()
      Alert.alert('Thành công', 'Yêu cầu xóa tài khoản đã được ghi nhận. Bạn sẽ được đăng xuất khỏi tài khoản.')
      await authService.logout()
      dispatch(logout())
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể yêu cầu xóa tài khoản')
      setDeleteModalVisible(true) // reopen modal on error if preferred, or just let them stay out
    } finally {
      setLoading(false)
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'Tên không được để trống'
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Họ không được để trống'
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email không được để trống'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email không hợp lệ'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = async () => {
    if (!validateForm()) {
      Alert.alert('Lỗi', 'Vui lòng kiểm tra lại thông tin')
      return
    }

    try {
      setLoading(true)

      let parsedDateOfBirth: Date | undefined;
      if (formData.dateOfBirth && formData.dateOfBirth.length === 10) {
        const parts = formData.dateOfBirth.split('/');
        if (parts.length === 3) {
          parsedDateOfBirth = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T12:00:00Z`);
        }
      }

      const updatedUser = await authService.updateProfile(user?.id, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        dateOfBirth: parsedDateOfBirth as any,
        preferredDriverGender: formData.gender,
      })

      const currentToken = await authService.getToken() || ''
      dispatch(loginSuccess({
        token: currentToken,
        user: { ...user, ...updatedUser }, // Merge properly to retain other Redux properties if necessary
      }))

      Alert.alert('Thành công', 'Hồ sơ đã được cập nhật')
      navigation.goBack()
    } catch (error: any) {
      console.error('Update profile error:', error)
      Alert.alert('Lỗi', error.message || 'Không thể cập nhật hồ sơ')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back-ios" size={20} color="#1e293b" style={{ marginLeft: 6 }} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thông tin cá nhân</Text>
        <View style={{ width: 44 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 20}
        style={{ flex: 1 }}
      >
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              {user?.avatar && !user.avatar.includes('api.dicebear.com') ? (
                <Image source={{ uri: user.avatar }} style={styles.avatarImage} />
              ) : (
                <MaterialIcons name="person" size={50} color={COLORS.primary} />
              )}
              {/* <TouchableOpacity style={styles.editAvatarBadge}>
                <MaterialIcons name="photo-camera" size={16} color="#fff" />
              </TouchableOpacity> */}
            </View>
            <View style={styles.roleBadge}>
              <MaterialIcons name="star" size={14} color="#f59e0b" />
              <Text style={styles.roleText}>Thành viên thiết yếu</Text>
            </View>
          </View>

          <View style={styles.cardSection}>
            <FormInput
              label="Số điện thoại"
              value={user?.phone || 'Chưa cập nhật'}
              icon="phone-iphone"
              editable={false}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.cardSection}>
            <Text style={styles.sectionTitle}>Thông tin cơ bản</Text>
            <FormInput
              label="Họ"
              value={formData.lastName}
              onChangeText={(text) => setFormData({ ...formData, lastName: text })}
              placeholder="Vd: Nguyễn Văn"
              error={errors.lastName}
              icon="badge"
            />

            <FormInput
              label="Tên"
              value={formData.firstName}
              onChangeText={(text) => setFormData({ ...formData, firstName: text })}
              placeholder="Vd: A"
              error={errors.firstName}
              icon="person"
            />

            <FormInput
              label="Email"
              value={formData.email}
              placeholder="Vd: example@gmail.com"
              keyboardType="email-address"
              error={errors.email}
              icon="email"
              editable={false}
            />

            <FormInput
              label="Ngày sinh"
              value={formData.dateOfBirth}
              onChangeText={(text) => {
                let cleaned = text.replace(/\D/g, '')
                if (cleaned.length >= 5) {
                  cleaned = `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4, 8)}`
                } else if (cleaned.length >= 3) {
                  cleaned = `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`
                }
                setFormData({ ...formData, dateOfBirth: cleaned })
              }}
              placeholder="DD/MM/YYYY"
              icon="cake"
              keyboardType="number-pad"
              maxLength={10}
            />

            <SelectInput
              label="Giới tính"
              value={formData.gender}
              options={[
                { label: 'Nam', value: 'male' },
                { label: 'Nữ', value: 'female' },
                { label: 'Khác', value: 'other' },
              ]}
              onSelect={(value) => setFormData({ ...formData, gender: value })}
              icon="wc"
            />
          </View>

          <View style={styles.dangerSection}>
            <Text style={styles.sectionTitle}>Cài đặt tài khoản</Text>
            <TouchableOpacity
              style={styles.deleteAccountButton}
              onPress={handleDeleteAccount}
            >
              <MaterialIcons name="delete-outline" size={24} color="#ef4444" />
              <Text style={styles.deleteAccountText}>Yêu cầu xóa tài khoản</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
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
                disabled={!isConfirmValid || loading}
              >
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalConfirmText}>Xóa tài khoản</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  )
}

const FormInput = ({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  error,
  icon,
  editable = true,
  maxLength,
}: {
  label: string
  value: string
  onChangeText?: (text: string) => void
  placeholder?: string
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'numeric' | 'number-pad'
  error?: string
  icon: keyof typeof MaterialIcons.glyphMap
  editable?: boolean
  maxLength?: number
}) => (
  <View style={styles.formGroup}>
    <Text style={styles.formLabel}>{label}</Text>
    <View style={[styles.inputWrapper, !editable && styles.inputWrapperDisabled, error ? styles.inputWrapperError : null]}>
      <MaterialIcons name={icon} size={20} color={editable ? "#94a3b8" : "#cbd5e1"} style={styles.inputIcon} />
      <TextInput
        style={[styles.input, !editable && styles.inputDisabled]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        keyboardType={keyboardType as any}
        editable={editable}
        maxLength={maxLength}
      />
      {!editable && <MaterialIcons name="verified" size={18} color="#10b981" style={{ marginLeft: 8 }} />}
    </View>
    {error && <Text style={styles.errorText}>{error}</Text>}
  </View>
)

const SelectInput = ({
  label,
  value,
  options,
  onSelect,
  icon,
}: {
  label: string
  value: string
  options: { label: string; value: string }[]
  onSelect: (value: string) => void
  icon: keyof typeof MaterialIcons.glyphMap
}) => (
  <View style={styles.formGroup}>
    <Text style={styles.formLabel}>{label}</Text>
    <View style={{ flexDirection: 'row', gap: SPACING.md }}>
      <MaterialIcons name={icon} size={20} color="#94a3b8" style={{ marginTop: 12, marginRight: 2 }} />
      <View style={styles.selectContainer}>
        {options.map((option) => {
          const isActive = value === option.value
          return (
            <TouchableOpacity
              key={option.value}
              style={[styles.selectOption, isActive && styles.selectOptionActive]}
              onPress={() => onSelect(option.value)}
            >
              <Text style={[styles.selectOptionText, isActive && styles.selectOptionTextActive]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>
    </View>
  </View>
)

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: '#f1f5f9',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  content: {
    flex: 1,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  avatarContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 48,
  },
  editAvatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  roleBadge: {
    marginTop: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#d97706',
  },
  cardSection: {
    backgroundColor: '#fff',
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: SPACING.lg,
  },
  formGroup: {
    marginBottom: SPACING.lg,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: SPACING.sm,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: BORDER_RADIUS.xl,
    paddingHorizontal: SPACING.md,
    height: 54,
  },
  inputWrapperDisabled: {
    backgroundColor: '#f1f5f9',
    borderColor: '#cbd5e1',
  },
  inputWrapperError: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  inputIcon: {
    marginRight: SPACING.sm,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#0f172a',
  },
  inputDisabled: {
    color: '#94a3b8',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 6,
    marginLeft: 4,
    fontWeight: '500',
  },
  selectContainer: {
    flex: 1,
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  selectOption: {
    flex: 1,
    height: 48,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectOptionActive: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(255, 107, 0, 0.05)',
  },
  selectOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  selectOptionTextActive: {
    color: COLORS.primary,
  },
  dangerSection: {
    backgroundColor: '#fff',
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
  },
  deleteAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  deleteAccountText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ef4444',
  },
  footer: {
    backgroundColor: '#fff',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: Platform.OS === 'ios' ? 34 : SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 10,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    height: 56,
    borderRadius: BORDER_RADIUS.xl,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
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
