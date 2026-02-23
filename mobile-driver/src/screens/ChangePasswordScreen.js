import { useState } from 'react'
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
} from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { COLORS, SPACING } from '../constants'
import { authService } from '../services/authService'

const PasswordInput = ({
  label,
  value,
  onChangeText,
  placeholder,
  isVisible,
  onToggleVisibility,
  error,
}) => (
  <View style={styles.formGroup}>
    <Text style={styles.formLabel}>{label}</Text>
    <View style={styles.passwordInputContainer}>
      <View style={styles.inputIconBox}>
        <MaterialIcons name="lock-outline" size={20} color={COLORS.primary} />
      </View>
      <TextInput
        style={[styles.formInput, error && styles.formInputError]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        secureTextEntry={!isVisible}
      />
      <TouchableOpacity
        style={styles.visibilityButton}
        onPress={onToggleVisibility}
      >
        <MaterialIcons
          name={isVisible ? 'visibility' : 'visibility-off'}
          size={20}
          color="#64748b"
        />
      </TouchableOpacity>
    </View>
    {error && (
      <View style={styles.errorContainer}>
        <MaterialIcons name="error-outline" size={14} color="#ef4444" />
        <Text style={styles.errorText}>{error}</Text>
      </View>
    )}
  </View>
)

export default function ChangePasswordScreen({ navigation }) {
  const [loading, setLoading] = useState(false)
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  })

  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  const [errors, setErrors] = useState({})

  const validateForm = () => {
    const newErrors = {}

    if (!formData.currentPassword.trim()) {
      newErrors.currentPassword = 'Vui lòng nhập mật khẩu hiện tại'
    }
    if (!formData.newPassword.trim()) {
      newErrors.newPassword = 'Vui lòng nhập mật khẩu mới'
    } else if (formData.newPassword.length < 6) {
      newErrors.newPassword = 'Mật khẩu phải có ít nhất 6 ký tự'
    } else if (formData.newPassword === formData.currentPassword) {
      newErrors.newPassword = 'Mật khẩu mới phải khác mật khẩu hiện tại'
    }
    if (!formData.confirmPassword.trim()) {
      newErrors.confirmPassword = 'Vui lòng xác nhận mật khẩu'
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Mật khẩu xác nhận không khớp'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleChangePassword = async () => {
    if (!validateForm()) {
      Alert.alert('Lỗi', 'Vui lòng kiểm tra lại thông tin')
      return
    }

    try {
      setLoading(true)

      // Call API to change password for driver
      const response = await authService.changePassword({
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      })

      Alert.alert(
        'Thành công',
        'Mật khẩu đã được thay đổi. Vui lòng đăng nhập lại với mật khẩu mới.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      )
    } catch (error) {
      console.error('Change password error:', error)
      Alert.alert(
        'Lỗi',
        error.response?.data?.message || error.message || 'Không thể đổi mật khẩu'
      )
    } finally {
      setLoading(false)
    }
  }

  const getPasswordStrength = () => {
    const password = formData.newPassword
    if (!password) return null

    let strength = 0
    if (password.length >= 8) strength++
    if (password.length >= 12) strength++
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++
    if (/\d/.test(password)) strength++
    if (/[^a-zA-Z0-9]/.test(password)) strength++

    if (strength <= 2)
      return { label: 'Yếu', color: '#ef4444', width: '33%' }
    if (strength <= 3)
      return { label: 'Trung bình', color: '#f59e0b', width: '66%' }
    return { label: 'Mạnh', color: '#10b981', width: '100%' }
  }

  const passwordStrength = getPasswordStrength()

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Đổi mật khẩu</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <View style={styles.infoBannerIcon}>
            <MaterialIcons name="shield" size={24} color={COLORS.primary} />
          </View>
          <View style={styles.infoBannerContent}>
            <Text style={styles.infoBannerTitle}>Bảo mật tài khoản</Text>
            <Text style={styles.infoBannerText}>
              Sử dụng mật khẩu mạnh gồm chữ cái, số và ký tự đặc biệt
            </Text>
          </View>
        </View>

        {/* Form */}
        <View style={styles.formContainer}>
          <PasswordInput
            label="Mật khẩu hiện tại"
            value={formData.currentPassword}
            onChangeText={(text) =>
              setFormData({ ...formData, currentPassword: text })
            }
            placeholder="Nhập mật khẩu hiện tại"
            isVisible={showPasswords.current}
            onToggleVisibility={() =>
              setShowPasswords({ ...showPasswords, current: !showPasswords.current })
            }
            error={errors.currentPassword}
          />

          <PasswordInput
            label="Mật khẩu mới"
            value={formData.newPassword}
            onChangeText={(text) =>
              setFormData({ ...formData, newPassword: text })
            }
            placeholder="Nhập mật khẩu mới"
            isVisible={showPasswords.new}
            onToggleVisibility={() =>
              setShowPasswords({ ...showPasswords, new: !showPasswords.new })
            }
            error={errors.newPassword}
          />

          {/* Password Strength Indicator */}
          {formData.newPassword && passwordStrength && (
            <View style={styles.strengthContainer}>
              <View style={styles.strengthBarBackground}>
                <View
                  style={[
                    styles.strengthBar,
                    {
                      width: passwordStrength.width,
                      backgroundColor: passwordStrength.color,
                    },
                  ]}
                />
              </View>
              <Text
                style={[
                  styles.strengthLabel,
                  { color: passwordStrength.color },
                ]}
              >
                Độ mạnh: {passwordStrength.label}
              </Text>
            </View>
          )}

          <PasswordInput
            label="Xác nhận mật khẩu mới"
            value={formData.confirmPassword}
            onChangeText={(text) =>
              setFormData({ ...formData, confirmPassword: text })
            }
            placeholder="Nhập lại mật khẩu mới"
            isVisible={showPasswords.confirm}
            onToggleVisibility={() =>
              setShowPasswords({
                ...showPasswords,
                confirm: !showPasswords.confirm,
              })
            }
            error={errors.confirmPassword}
          />

          {/* Password Requirements */}
          <View style={styles.requirementsBox}>
            <Text style={styles.requirementsTitle}>Yêu cầu mật khẩu:</Text>
            <View style={styles.requirementItem}>
              <MaterialIcons
                name={
                  formData.newPassword.length >= 6
                    ? 'check-circle'
                    : 'radio-button-unchecked'
                }
                size={16}
                color={
                  formData.newPassword.length >= 6 ? '#10b981' : '#94a3b8'
                }
              />
              <Text style={styles.requirementText}>Tối thiểu 6 ký tự</Text>
            </View>
            <View style={styles.requirementItem}>
              <MaterialIcons
                name={
                  /[A-Z]/.test(formData.newPassword)
                    ? 'check-circle'
                    : 'radio-button-unchecked'
                }
                size={16}
                color={
                  /[A-Z]/.test(formData.newPassword) ? '#10b981' : '#94a3b8'
                }
              />
              <Text style={styles.requirementText}>Ít nhất 1 chữ hoa</Text>
            </View>
            <View style={styles.requirementItem}>
              <MaterialIcons
                name={
                  /\d/.test(formData.newPassword)
                    ? 'check-circle'
                    : 'radio-button-unchecked'
                }
                size={16}
                color={/\d/.test(formData.newPassword) ? '#10b981' : '#94a3b8'}
              />
              <Text style={styles.requirementText}>Ít nhất 1 chữ số</Text>
            </View>
            <View style={styles.requirementItem}>
              <MaterialIcons
                name={
                  /[^a-zA-Z0-9]/.test(formData.newPassword)
                    ? 'check-circle'
                    : 'radio-button-unchecked'
                }
                size={16}
                color={
                  /[^a-zA-Z0-9]/.test(formData.newPassword)
                    ? '#10b981'
                    : '#94a3b8'
                }
              />
              <Text style={styles.requirementText}>
                Ít nhất 1 ký tự đặc biệt
              </Text>
            </View>
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            loading && styles.submitButtonDisabled,
          ]}
          onPress={handleChangePassword}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <MaterialIcons name="lock-open" size={20} color="#fff" />
              <Text style={styles.submitButtonText}>Đổi mật khẩu</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 50,
    paddingBottom: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.xxl,
  },

  // Info Banner
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: '#fff5eb',
    borderRadius: 16,
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
    borderWidth: 1,
    borderColor: '#ffe4cc',
  },
  infoBannerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  infoBannerContent: {
    flex: 1,
  },
  infoBannerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  infoBannerText: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
  },

  // Form
  formContainer: {
    marginBottom: SPACING.xl,
  },
  formGroup: {
    marginBottom: SPACING.xl,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: SPACING.sm,
    letterSpacing: -0.2,
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  inputIconBox: {
    width: 48,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  formInput: {
    flex: 1,
    fontSize: 15,
    color: '#0f172a',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    fontWeight: '600',
  },
  formInputError: {
    borderColor: '#fecaca',
  },
  visibilityButton: {
    width: 48,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.sm,
    paddingHorizontal: SPACING.xs,
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    fontWeight: '600',
  },

  // Password Strength
  strengthContainer: {
    marginTop: SPACING.md,
  },
  strengthBarBackground: {
    height: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: SPACING.sm,
  },
  strengthBar: {
    height: '100%',
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: 12,
    fontWeight: '700',
  },

  // Requirements
  requirementsBox: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginTop: SPACING.md,
  },
  requirementsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: SPACING.md,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  requirementText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },

  // Submit Button
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingVertical: SPACING.lg,
    gap: SPACING.sm,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.3,
  },
})
