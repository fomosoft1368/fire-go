import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  StatusBar,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { COLORS, SPACING, BORDER_RADIUS } from '../constants'
import { changePassword } from '../services/authService'

export default function ChangePasswordScreen() {
  const navigation = useNavigation()
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.currentPassword) {
      newErrors.currentPassword = 'Vui lòng nhập mật khẩu hiện tại'
    }

    if (!formData.newPassword) {
      newErrors.newPassword = 'Vui lòng nhập mật khẩu mới'
    } else if (formData.newPassword.length < 6) {
      newErrors.newPassword = 'Mật khẩu mới phải có ít nhất 6 ký tự'
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Vui lòng xác nhận mật khẩu mới'
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Mật khẩu xác nhận không khớp'
    }

    if (formData.currentPassword === formData.newPassword) {
      newErrors.newPassword = 'Mật khẩu mới phải khác mật khẩu cũ'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleChangePassword = async () => {
    if (!validateForm()) {
      return
    }

    setIsLoading(true)
    try {
      await changePassword(formData.currentPassword, formData.newPassword)
      
      Alert.alert('Thành công', 'Đổi mật khẩu thành công!', [
        {
          text: 'OK',
          onPress: () => {
            navigation.goBack()
          },
        },
      ])

      // Clear form
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Lỗi đổi mật khẩu'
      
      if (errorMessage.includes('current')) {
        Alert.alert('Lỗi', 'Mật khẩu hiện tại không đúng')
      } else {
        Alert.alert('Lỗi', errorMessage)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const renderPasswordInput = (
    label: string,
    field: 'currentPassword' | 'newPassword' | 'confirmPassword',
    showField: keyof typeof showPasswords
  ) => {
    return (
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{label}</Text>
        <View style={[styles.inputContainer, errors[field] && styles.inputError]}>
          <TextInput
            style={styles.input}
            placeholder={`Nhập ${label.toLowerCase()}`}
            placeholderTextColor={COLORS.textDarkSecondary}
            secureTextEntry={!showPasswords[showField]}
            value={formData[field]}
            onChangeText={(text) => {
              setFormData({ ...formData, [field]: text })
              if (errors[field]) {
                setErrors({ ...errors, [field]: '' })
              }
            }}
            editable={!isLoading}
          />
          <TouchableOpacity
            onPress={() =>
              setShowPasswords({ ...showPasswords, [showField]: !showPasswords[showField] })
            }
            style={styles.eyeIcon}
          >
            <MaterialIcons
              name={showPasswords[showField] ? 'visibility' : 'visibility-off'}
              size={20}
              color={COLORS.textDarkSecondary}
            />
          </TouchableOpacity>
        </View>
        {errors[field] && <Text style={styles.errorText}>{errors[field]}</Text>}
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.lightBg} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <MaterialIcons name="arrow-back" size={24} color={COLORS.textDark} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Đổi Mật Khẩu</Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Info Box */}
          <View style={styles.infoBox}>
            <MaterialIcons name="info" size={18} color={COLORS.primary} />
            <Text style={styles.infoText}>
              Vui lòng nhập mật khẩu hiện tại và mật khẩu mới để đảm bảo tính bảo mật
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {renderPasswordInput('Mật khẩu hiện tại', 'currentPassword', 'current')}
            {renderPasswordInput('Mật khẩu mới', 'newPassword', 'new')}
            {renderPasswordInput('Xác nhận mật khẩu mới', 'confirmPassword', 'confirm')}

            {/* Password Requirements */}
            <View style={styles.requirementsBox}>
              <Text style={styles.requirementsTitle}>Yêu cầu mật khẩu:</Text>
              <View style={styles.requirementItem}>
                <MaterialIcons
                  name={formData.newPassword.length >= 6 ? 'check-circle' : 'radio-button-unchecked'}
                  size={16}
                  color={formData.newPassword.length >= 6 ? '#22c55e' : COLORS.textSecondary}
                />
                <Text style={styles.requirementText}>Ít nhất 6 ký tự</Text>
              </View>
              <View style={styles.requirementItem}>
                <MaterialIcons
                  name={
                    formData.newPassword &&
                    formData.newPassword !== formData.currentPassword &&
                    formData.currentPassword
                      ? 'check-circle'
                      : 'radio-button-unchecked'
                  }
                  size={16}
                  color={
                    formData.newPassword &&
                    formData.newPassword !== formData.currentPassword &&
                    formData.currentPassword
                      ? '#22c55e'
                      : COLORS.textSecondary
                  }
                />
                <Text style={styles.requirementText}>Khác mật khẩu hiện tại</Text>
              </View>
              <View style={styles.requirementItem}>
                <MaterialIcons
                  name={formData.newPassword === formData.confirmPassword && formData.confirmPassword ? 'check-circle' : 'radio-button-unchecked'}
                  size={16}
                  color={formData.newPassword === formData.confirmPassword && formData.confirmPassword ? '#22c55e' : COLORS.textSecondary}
                />
                <Text style={styles.requirementText}>Xác nhận mật khẩu khớp</Text>
              </View>
            </View>
          </View>

          {/* Buttons */}
          <View style={styles.buttonGroup}>
            <TouchableOpacity
              style={[styles.cancelButton, isLoading && styles.buttonDisabled]}
              onPress={() => navigation.goBack()}
              disabled={isLoading}
            >
              <Text style={styles.cancelButtonText}>Hủy</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.submitButton,
                isLoading && styles.buttonDisabled,
              ]}
              onPress={handleChangePassword}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={COLORS.text} />
              ) : (
                <Text style={styles.submitButtonText}>Đổi Mật Khẩu</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.lightBg,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.lg,
    marginBottom: SPACING.xl,
    paddingTop: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightBorder,
  },
  backButton: {
    padding: SPACING.sm,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.lightCard,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    gap: SPACING.md,
    marginBottom: SPACING.xl,
    borderWidth: 1,
    borderLeftWidth: 4,
    borderColor: COLORS.lightBorder,
    borderLeftColor: COLORS.primary,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textDark,
    lineHeight: 20,
  },
  form: {
    marginBottom: SPACING.xl,
  },
  inputGroup: {
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textDark,
    marginBottom: SPACING.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lightCard,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.lightBorder,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  inputError: {
    borderColor: '#ef4444',
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textDark,
  },
  eyeIcon: {
    padding: SPACING.sm,
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: SPACING.xs,
  },
  requirementsBox: {
    backgroundColor: COLORS.lightCard,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.lightBorder,
    marginTop: SPACING.lg,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  requirementsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: SPACING.md,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.sm,
  },
  requirementText: {
    fontSize: 12,
    color: COLORS.textDarkSecondary,
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: SPACING.md,
    paddingHorizontal: SPACING.md,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.lightBorder,
    backgroundColor: COLORS.lightCard,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  submitButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
})
