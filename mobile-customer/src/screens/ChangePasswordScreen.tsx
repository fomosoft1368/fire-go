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
import { COLORS, SPACING, BORDER_RADIUS } from '../constants'
import { authService } from '../services/authService'

interface ChangePasswordScreenProps {
  navigation: any
}

interface PasswordInputProps {
  label: string
  value: string
  onChangeText: (text: string) => void
  placeholder?: string
  isVisible: boolean
  onToggleVisibility: () => void
  error?: string
}

const PasswordInput = ({
  label,
  value,
  onChangeText,
  placeholder,
  isVisible,
  onToggleVisibility,
  error,
}: PasswordInputProps) => (
  <View style={styles.formGroup}>
    <Text style={styles.formLabel}>{label}</Text>
    <View style={styles.passwordInputContainer}>
      <TextInput
        style={[styles.formInput, error && styles.formInputError]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textSecondary}
        secureTextEntry={!isVisible}
      />
      <TouchableOpacity
        style={styles.visibilityButton}
        onPress={onToggleVisibility}
      >
        <MaterialIcons
          name={isVisible ? 'visibility' : 'visibility-off'}
          size={20}
          color={COLORS.textSecondary}
        />
      </TouchableOpacity>
    </View>
    {error && <Text style={styles.errorText}>{error}</Text>}
  </View>
)

export default function ChangePasswordScreen({ navigation }: ChangePasswordScreenProps) {
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

  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.currentPassword.trim()) {
      newErrors.currentPassword = 'Vui lòng nhập mật khẩu hiện tại'
    }
    if (!formData.newPassword.trim()) {
      newErrors.newPassword = 'Vui lòng nhập mật khẩu mới'
    } else if (formData.newPassword.length < 6) {
      newErrors.newPassword = 'Mật khẩu phải có ít nhất 6 ký tự'
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
      
      // Call API to change password
      const token = await authService.getToken()
      console.log('[ChangePassword] Token from storage:', token ? `${token.substring(0, 50)}...` : 'null')
      
      if (!token) {
        throw new Error('No auth token found')
      }
      
      // Try to decode token to see role
      try {
        const parts = token.split('.')
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]))
          console.log('[ChangePassword] Token payload:', payload)
        }
      } catch (e) {
        console.log('[ChangePassword] Could not decode token:', e)
      }
    
      const url = `${process.env.REACT_APP_API_URL || 'http://192.168.1.18:3000/api'}/customers/change-password`
      console.log('[ChangePassword] Request URL:', url)
      console.log('[ChangePassword] Authorization:', `Bearer ${token.substring(0, 20)}...`)
      
      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
        }),
      })
    
      console.log('[ChangePassword] Response status:', response.status)
      console.log('[ChangePassword] Response URL:', response.url)
      console.log('[ChangePassword] Response headers:', {
        'content-type': response.headers.get('content-type'),
      })

      if (!response.ok) {
        const error = await response.json()
        console.log('[ChangePassword] Error response full:', JSON.stringify(error))
        console.log('[ChangePassword] Error response:', error)
        throw new Error(error.message || 'Không thể đổi mật khẩu')
      }

      Alert.alert('Thành công', 'Mật khẩu đã được thay đổi')
      navigation.goBack()
    } catch (error: any) {
      console.error('Change password error:', error)
      Alert.alert('Lỗi', error.message || 'Không thể đổi mật khẩu')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
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
        {/* Info Section */}
        <View style={styles.infoSection}>
          <MaterialIcons name="info" size={20} color={COLORS.primary} />
          <Text style={styles.infoText}>
            Để bảo mật tài khoản, hãy sử dụng mật khẩu mạnh gồm chữ cái, số và ký tự đặc biệt
          </Text>
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
              setShowPasswords({
                ...showPasswords,
                current: !showPasswords.current,
              })
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
              setShowPasswords({
                ...showPasswords,
                new: !showPasswords.new,
              })
            }
            error={errors.newPassword}
          />

          <PasswordInput
            label="Xác nhận mật khẩu"
            value={formData.confirmPassword}
            onChangeText={(text) =>
              setFormData({ ...formData, confirmPassword: text })
            }
            placeholder="Xác nhận mật khẩu mới"
            isVisible={showPasswords.confirm}
            onToggleVisibility={() =>
              setShowPasswords({
                ...showPasswords,
                confirm: !showPasswords.confirm,
              })
            }
            error={errors.confirmPassword}
          />
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.cancelButtonText}>Hủy</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.saveButton,
              loading && styles.saveButtonDisabled,
            ]}
            onPress={handleChangePassword}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.saveButtonText}>Lưu mật khẩu mới</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  backButton: {
    padding: SPACING.sm,
    marginLeft: -SPACING.sm,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: SPACING.lg,
  },
  infoSection: {
    flexDirection: 'row',
    backgroundColor: '#1a3a3a',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
    gap: SPACING.md,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  formContainer: {
    marginBottom: SPACING.xl,
  },
  formGroup: {
    marginBottom: SPACING.lg,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: SPACING.sm,
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: BORDER_RADIUS.md,
    paddingRight: SPACING.sm,
    backgroundColor: '#1a202c',
  },
  formInput: {
    flex: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    fontSize: 14,
    color: '#fff',
  },
  formInputError: {
    borderColor: COLORS.danger,
  },
  visibilityButton: {
    padding: SPACING.sm,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.danger,
    marginTop: SPACING.xs,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.xl,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    paddingVertical: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
})
