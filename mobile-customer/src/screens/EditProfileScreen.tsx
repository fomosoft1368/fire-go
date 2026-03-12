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
} from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { useSelector, useDispatch } from 'react-redux'
import type { RootState } from '../redux/store'
import { COLORS, SPACING, BORDER_RADIUS } from '../constants'
import { authService } from '../services/authService'
import { loginSuccess } from '../redux/slices/authSlice'

interface EditProfileScreenProps {
  navigation: any
}

export default function EditProfileScreen({ navigation }: EditProfileScreenProps) {
  const user = useSelector((state: RootState) => state.auth.user)
  const dispatch = useDispatch()
  const [loading, setLoading] = useState(false)
  
  const [formData, setFormData] = useState({
    firstName: user?.firstName || (user?.name?.split(' ')[0] ?? ''),
    lastName: user?.lastName || (user?.name?.split(' ').slice(1).join(' ') ?? ''),
    email: user?.email || '',
    phone: user?.phone || '',
    address: user?.savedAddresses?.[0]?.address || '',
    dateOfBirth: user?.dateOfBirth || '',
    gender: user?.preferredDriverGender || '',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

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
    if (!formData.phone.trim()) {
      newErrors.phone = 'Số điện thoại không được để trống'
    } else if (!/^[0-9]{10,}$/.test(formData.phone.replace(/\D/g, ''))) {
      newErrors.phone = 'Số điện thoại không hợp lệ'
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
      
      // Call API to update profile
      const updatedUser = await authService.updateProfile(user?.id, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        dateOfBirth: formData.dateOfBirth,
        preferredDriverGender: formData.gender,
      })
      
      // Update Redux with new user data
      dispatch(loginSuccess({
        token: '',
        user: {
          id: updatedUser.id,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          email: updatedUser.email,
          phone: updatedUser.phone,
          completedRides: updatedUser.completedRides,
          averageRating: updatedUser.averageRating,
          totalSpent: updatedUser.totalSpent,
          dateOfBirth: updatedUser.dateOfBirth,
          preferredDriverGender: updatedUser.preferredDriverGender,
          savedAddresses: updatedUser.savedAddresses,
          role: updatedUser.role,
          avatar: updatedUser.avatar,
        },
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

  const FormInput = ({
    label,
    value,
    onChangeText,
    placeholder,
    keyboardType = 'default',
    error,
  }: {
    label: string
    value: string
    onChangeText: (text: string) => void
    placeholder?: string
    keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'numeric'
    error?: string
  }) => (
    <View style={styles.formGroup}>
      <Text style={styles.formLabel}>{label}</Text>
      <TextInput
        style={[styles.formInput, error && styles.formInputError]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textSecondary}
        keyboardType={keyboardType}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  )

  const SelectInput = ({
    label,
    value,
    options,
    onSelect,
  }: {
    label: string
    value: string
    options: { label: string; value: string }[]
    onSelect: (value: string) => void
  }) => (
    <View style={styles.formGroup}>
      <Text style={styles.formLabel}>{label}</Text>
      <View style={styles.selectContainer}>
        {options.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.selectOption,
              value === option.value && styles.selectOptionActive,
            ]}
            onPress={() => onSelect(option.value)}
          >
            <Text
              style={[
                styles.selectOptionText,
                value === option.value && styles.selectOptionTextActive,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chỉnh sửa hồ sơ</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 20}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
        >
          {/* Profile Section */}
          <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <MaterialIcons name="person" size={60} color={COLORS.card} />
            <TouchableOpacity style={styles.editAvatarButton}>
              <MaterialIcons name="edit" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
          <Text style={styles.profileText}>
            {formData.firstName} {formData.lastName}
          </Text>
          <Text style={styles.emailText}>{formData.email}</Text>
        </View>

        {/* Form Inputs */}
        <View style={styles.formContainer}>
          <FormInput
            label="Tên"
            value={formData.firstName}
            onChangeText={(text) =>
              setFormData({ ...formData, firstName: text })
            }
            placeholder="Nhập tên của bạn"
            error={errors.firstName}
          />

          <FormInput
            label="Họ"
            value={formData.lastName}
            onChangeText={(text) =>
              setFormData({ ...formData, lastName: text })
            }
            placeholder="Nhập họ của bạn"
            error={errors.lastName}
          />

          <FormInput
            label="Email"
            value={formData.email}
            onChangeText={(text) =>
              setFormData({ ...formData, email: text })
            }
            placeholder="Nhập email của bạn"
            keyboardType="email-address"
            error={errors.email}
          />

          <FormInput
            label="Số điện thoại"
            value={formData.phone}
            onChangeText={(text) =>
              setFormData({ ...formData, phone: text })
            }
            placeholder="Nhập số điện thoại"
            keyboardType="phone-pad"
            error={errors.phone}
          />

          <FormInput
            label="Địa chỉ"
            value={formData.address}
            onChangeText={(text) =>
              setFormData({ ...formData, address: text })
            }
            placeholder="Nhập địa chỉ của bạn"
          />

          <FormInput
            label="Ngày sinh"
            value={formData.dateOfBirth}
            onChangeText={(text) =>
              setFormData({ ...formData, dateOfBirth: text })
            }
            placeholder="DD/MM/YYYY"
          />

          <SelectInput
            label="Giới tính"
            value={formData.gender}
            options={[
              { label: 'Nam', value: 'male' },
              { label: 'Nữ', value: 'female' },
              { label: 'Khác', value: 'other' },
            ]}
            onSelect={(value) =>
              setFormData({ ...formData, gender: value })
            }
          />
        </View>

        {/* Additional Options */}
        <View style={styles.optionsSection}>
          <TouchableOpacity style={styles.optionItem}>
            <MaterialIcons name="lock-outline" size={20} color={COLORS.card} />
            <Text style={styles.optionText}>Đổi mật khẩu</Text>
            <MaterialIcons
              name="chevron-right"
              size={20}
              color={COLORS.textSecondary}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.optionItem}>
            <MaterialIcons
              name="verified-user"
              size={20}
              color={COLORS.card}
            />
            <Text style={styles.optionText}>Xác minh tài khoản</Text>
            <MaterialIcons
              name="chevron-right"
              size={20}
              color={COLORS.textSecondary}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.optionItem}>
            <MaterialIcons name="location-on" size={20} color={COLORS.card} />
            <Text style={styles.optionText}>Địa chỉ tiết kiệm</Text>
            <MaterialIcons
              name="chevron-right"
              size={20}
              color={COLORS.textSecondary}
            />
          </TouchableOpacity>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>

      {/* Action Buttons */}
      <View style={styles.actionContainer}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.cancelButtonText}>Hủy</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <MaterialIcons name="check" size={20} color="#fff" />
              <Text style={styles.saveButtonText}>Lưu thay đổi</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fdfbfb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: '#1e293b',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0a0a0a',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 200,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
    position: 'relative',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#080808',
    marginBottom: SPACING.sm,
  },
  emailText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  formContainer: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
  },
  formGroup: {
    marginBottom: SPACING.lg,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f0f0f',
    marginBottom: SPACING.sm,
  },
  formInput: {
    backgroundColor: COLORS.primary,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    color: '#fff',
    fontSize: 14,
  },
  formInputError: {
    borderColor: COLORS.danger,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 12,
    marginTop: SPACING.xs,
  },
  selectContainer: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  selectOption: {
    flex: 1,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  selectOptionActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '20',
  },
  selectOptionText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  selectOptionTextActive: {
    color: COLORS.primary,
  },
  optionsSection: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    gap: SPACING.sm,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  optionText: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  actionContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: '#e5e6e9',
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.primary,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
})
