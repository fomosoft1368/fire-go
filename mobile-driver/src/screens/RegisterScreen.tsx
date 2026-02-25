import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { useDispatch, useSelector } from 'react-redux'
import { loginStart, loginSuccess, loginFailure } from '../redux/slices/authSlice'
import type { RootState } from '../redux/store'

const COLORS = {
  primary: '#137fec',
  white: '#ffffff',
  text: '#ffffff',
  textSecondary: '#a0aec0',
  border: '#2d3748',
  background: '#0f172a',
  surface: '#1a202c',
  darkBg: '#0f172a',
  darkCard: '#1a202c',
  darkText: '#111418',
  success: '#10b981',
  error: '#ff6b6b',
}

interface FormData {
  // User Info
  fullName: string
  email: string
  phone: string
  password: string
  confirmPassword: string

  // Vehicle Info
  vehicleModel: string
  vehicleColor: string
  vehiclePlate: string
  vehicleLicense: string
  vehicleType: string // NEW: sedan, suv, pickup, motorcycle

  // Driver License Info
  licenseNumber: string
  licenseExpiry: string

  // Service Selection
  driverTypes: string[] // NEW: rideshare, hire, delivery

  // Banking Info
  bankName: string
  bankAccount: string
  bankAccountHolder: string
}

interface FormErrors {
  [key: string]: string
}

export default function RegisterScreen({ navigation }: any) {
  const [step, setStep] = useState(1) // 1: Personal, 2: Vehicle, 3: Banking
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})

  const [formData, setFormData] = useState<FormData>({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    vehicleModel: '',
    vehicleColor: '',
    vehiclePlate: '',
    vehicleLicense: '',
    vehicleType: 'sedan', // NEW
    licenseNumber: '',
    licenseExpiry: '',
    driverTypes: ['rideshare'], // NEW
    bankName: '',
    bankAccount: '',
    bankAccountHolder: '',
  })

  const dispatch = useDispatch()
  const { error } = useSelector((state: RootState) => state.auth)

  // Validation functions
  const validateStep1 = () => {
    const newErrors: FormErrors = {}

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Tên đầy đủ không được để trống'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email không được để trống'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email không hợp lệ'
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Số điện thoại không được để trống'
    } else if (!/^[0-9]{10,11}$/.test(formData.phone.replace(/\D/g, ''))) {
      newErrors.phone = 'Số điện thoại phải từ 10-11 chữ số'
    }

    if (!formData.password) {
      newErrors.password = 'Mật khẩu không được để trống'
    } else if (formData.password.length < 8) {
      newErrors.password = 'Mật khẩu phải có ít nhất 8 ký tự'
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Mật khẩu không trùng khớp'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateStep2 = () => {
    const newErrors: FormErrors = {}

    if (!formData.vehicleType.trim()) {
      newErrors.vehicleType = 'Loại xe không được để trống'
    }

    if (!formData.vehicleModel.trim()) {
      newErrors.vehicleModel = 'Model xe không được để trống'
    }

    if (!formData.vehicleColor.trim()) {
      newErrors.vehicleColor = 'Màu xe không được để trống'
    }

    if (!formData.vehiclePlate.trim()) {
      newErrors.vehiclePlate = 'Biển số xe không được để trống'
    }

    if (!formData.vehicleLicense.trim()) {
      newErrors.vehicleLicense = 'Số GPLX không được để trống'
    }

    if (!formData.licenseNumber.trim()) {
      newErrors.licenseNumber = 'Số bằng lái không được để trống'
    }

    if (!formData.licenseExpiry.trim()) {
      newErrors.licenseExpiry = 'Ngày hết hạn không được để trống'
    }

    if (formData.driverTypes.length === 0) {
      newErrors.driverTypes = 'Chọn ít nhất một loại dịch vụ'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: '',
      }))
    }
  }

  const toggleDriverType = (type: string) => {
    setFormData((prev) => {
      const types = prev.driverTypes;
      if (types.includes(type)) {
        return {
          ...prev,
          driverTypes: types.filter((t) => t !== type),
        }
      } else {
        return {
          ...prev,
          driverTypes: [...types, type],
        }
      }
    })
  }

  const handleNextStep = () => {
    if (step === 1 && validateStep1()) {
      setStep(2)
    } else if (step === 2 && validateStep2()) {
      setStep(3)
    }
  }

  const handlePreviousStep = () => {
    if (step > 1) {
      setStep(step - 1)
    }
  }

  const handleRegister = async () => {
    if (step !== 3) return

    setIsLoading(true)
    try {
      // Format the data for API
      const registrationData = {
        firstName: formData.fullName.split(' ')[0],
        lastName: formData.fullName.split(' ').slice(1).join(' '),
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        vehicleModel: formData.vehicleModel,
        vehicleColor: formData.vehicleColor,
        vehiclePlate: formData.vehiclePlate,
        vehicleLicense: formData.vehicleLicense,
        vehicleType: formData.vehicleType,
        licenseNumber: formData.licenseNumber,
        licenseExpiry: formData.licenseExpiry,
        driverTypes: formData.driverTypes,
        bankName: formData.bankName,
        bankAccount: formData.bankAccount,
        bankAccountHolder: formData.bankAccountHolder,
      }

      // Call registration API
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://192.168.1.18:3000/api'
      console.log('🚀 Calling API:', `${API_BASE_URL}/drivers`)
      console.log('📤 Registration Data:', registrationData)

      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 30000) // 30s timeout

      const response = await fetch(`${API_BASE_URL}/drivers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registrationData),
        signal: controller.signal,
      })

      clearTimeout(timeout)

      console.log('📥 Response Status:', response.status)

      const data = await response.json()
      console.log('📥 Response Data:', data)

      if (!response.ok) {
        throw new Error(data.message || `Lỗi ${response.status}: ${response.statusText}`)
      }

      setIsLoading(false)
      
      Alert.alert(
        'Đăng ký thành công!',
        'Tài khoản của bạn đang chờ duyệt. Vui lòng chờ admin duyệt hồ sơ của bạn.\n\nBạn sẽ nhận được thông báo khi hồ sơ được duyệt.',
        [
          {
            text: 'OK',
            onPress: () => {
              navigation?.goBack?.()
            },
          },
        ],
      )
    } catch (err: any) {
      setIsLoading(false)
      
      let errorMessage = 'Lỗi không xác định'
      
      if (err.name === 'AbortError') {
        errorMessage = 'Kết nối quá chậm (timeout 30 giây). Vui lòng kiểm tra kết nối mạng và thử lại.'
      } else if (err instanceof TypeError) {
        errorMessage = `Lỗi kết nối: ${err.message}. Vui lòng kiểm tra URL API và kết nối mạng.`
      } else {
        errorMessage = err.message
      }
      
      console.log('❌ Error:', errorMessage)
      Alert.alert('Lỗi đăng ký', errorMessage)
    }
  }

  const handleGoBack = () => {
    if (navigation?.goBack) {
      navigation.goBack()
    }
  }

  // Render error text
  const renderError = (field: keyof FormData) => {
    if (errors[field]) {
      return <Text style={styles.errorText}>{errors[field]}</Text>
    }
    return null
  }

  // Render input field
  const renderInput = (
    label: string,
    field: keyof FormData,
    icon: string,
    placeholder: string,
    options?: {
      keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad'
      secureTextEntry?: boolean
      multiline?: boolean
      numberOfLines?: number
      onVisibilityToggle?: () => void
      showVisibility?: boolean
    },
  ) => (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrapper}>
        <MaterialIcons
          name={icon as any}
          size={20}
          color={COLORS.textSecondary}
          style={styles.inputIcon}
        />
        <TextInput
          style={[
            styles.input,
            options?.multiline && { paddingTop: 14, paddingBottom: 14, textAlignVertical: 'top' },
            options?.secureTextEntry && { paddingRight: 48 },
          ]}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textSecondary}
          value={formData[field] as string}
          onChangeText={(value) => handleInputChange(field, value)}
          editable={!isLoading}
          keyboardType={options?.keyboardType || 'default'}
          secureTextEntry={options?.secureTextEntry || false}
          multiline={options?.multiline || false}
          numberOfLines={options?.numberOfLines || 1}
        />
        {options?.showVisibility && (
          <TouchableOpacity
            onPress={options.onVisibilityToggle}
            style={styles.visibilityToggle}
          >
            <MaterialIcons
              name={options.secureTextEntry ? 'visibility-off' : 'visibility'}
              size={20}
              color={COLORS.textSecondary}
            />
          </TouchableOpacity>
        )}
      </View>
      {renderError(field)}
    </View>
  )

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        {/* Header */}
        <View style={styles.headerContainer}>
          <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Đăng ký tài xế</Text>
          <View style={styles.stepIndicator}>
            <Text style={styles.stepText}>
              Bước {step} / 3
            </Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${(step / 3) * 100}%` },
            ]}
          />
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollViewContent}
        >
          {/* Step 1: Personal Info */}
          {step === 1 && (
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Thông tin cá nhân</Text>
              <Text style={styles.stepDescription}>
                Vui lòng nhập thông tin cá nhân của bạn để tạo tài khoản
              </Text>

              {renderInput('Tên đầy đủ', 'fullName', 'person', 'Nhập tên của bạn')}
              {renderInput('Email', 'email', 'mail', 'Nhập email', {
                keyboardType: 'email-address',
              })}
              {renderInput('Số điện thoại', 'phone', 'phone', 'Nhập số điện thoại', {
                keyboardType: 'phone-pad',
              })}
              {renderInput('Mật khẩu', 'password', 'lock', 'Nhập mật khẩu', {
                secureTextEntry: !showPassword,
                showVisibility: true,
                onVisibilityToggle: () => setShowPassword(!showPassword),
              })}
              {renderInput(
                'Xác nhận mật khẩu',
                'confirmPassword',
                'lock',
                'Nhập lại mật khẩu',
                {
                  secureTextEntry: !showConfirmPassword,
                  showVisibility: true,
                  onVisibilityToggle: () => setShowConfirmPassword(!showConfirmPassword),
                },
              )}
            </View>
          )}

          {/* Step 2: Vehicle Info */}
          {step === 2 && (
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Thông tin xe</Text>
              <Text style={styles.stepDescription}>
                Vui lòng nhập thông tin chi tiết về xe của bạn
              </Text>

              <Text style={styles.sectionTitle}>Loại xe</Text>
              <View style={styles.vehicleTypeContainer}>
                {[
                  { value: 'sedan', label: 'Sedan (4 chỗ)' },
                  { value: 'suv', label: 'SUV (7 chỗ)' },
                  { value: 'pickup', label: 'Bán tải' },
                  { value: 'motorcycle', label: 'Xe máy' },
                ].map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.vehicleTypeBtn,
                      formData.vehicleType === option.value && styles.vehicleTypeBtnActive,
                    ]}
                    onPress={() => handleInputChange('vehicleType', option.value)}
                  >
                    <Text
                      style={[
                        styles.vehicleTypeBtnText,
                        formData.vehicleType === option.value && styles.vehicleTypeBtnTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {renderError('vehicleType')}

              {renderInput('Model xe', 'vehicleModel', 'directions-car', 'Ví dụ: Toyota Camry')}
              {renderInput('Màu xe', 'vehicleColor', 'palette', 'Ví dụ: Trắng')}
              {renderInput('Biển số xe', 'vehiclePlate', 'confirmation-number', 'Ví dụ: 51A-123.45')}
              {renderInput('Số GPLX', 'vehicleLicense', 'card-travel', 'Nhập số GPLX')}

              <Text style={styles.sectionTitle}>Thông tin bằng lái xe</Text>
              {renderInput('Số bằng lái', 'licenseNumber', 'badge', 'Nhập số bằng lái')}
              {renderInput('Ngày hết hạn', 'licenseExpiry', 'event', 'Ví dụ: 2025-12-31', {
                keyboardType: 'numeric',
              })}

              <Text style={styles.sectionTitle}>Loại dịch vụ</Text>
              <Text style={styles.stepDescription}>
                Chọn loại dịch vụ bạn muốn cung cấp
              </Text>
              <View style={styles.serviceTypeContainer}>
                {[
                  { value: 'rideshare', label: ' Ghép xe' },
                  { value: 'hire', label: ' Lái xe hộ' },
                  { value: 'delivery', label: ' Vận chuyển' },
                ].map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.serviceTypeBtn,
                      formData.driverTypes.includes(option.value) && styles.serviceTypeBtnActive,
                    ]}
                    onPress={() => toggleDriverType(option.value)}
                  >
                    <MaterialIcons
                      name={formData.driverTypes.includes(option.value) ? 'check-box' : 'check-box-outline-blank'}
                      size={20}
                      color={formData.driverTypes.includes(option.value) ? COLORS.primary : COLORS.textSecondary}
                    />
                    <Text
                      style={[
                        styles.serviceTypeBtnText,
                        formData.driverTypes.includes(option.value) && styles.serviceTypeBtnTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {renderError('driverTypes')}
            </View>
          )}

          {/* Step 3: Banking Info */}
          {step === 3 && (
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Thông tin ngân hàng</Text>
              <Text style={styles.stepDescription}>
                Vui lòng nhập thông tin ngân hàng để nhận tiền từ các chuyến đi
              </Text>

              {renderInput('Tên ngân hàng', 'bankName', 'business', 'Ví dụ: Vietcombank')}
              {renderInput('Số tài khoản', 'bankAccount', 'account-balance', 'Nhập số tài khoản')}
              {renderInput(
                'Chủ tài khoản',
                'bankAccountHolder',
                'person',
                'Nhập tên chủ tài khoản',
              )}

              <View style={styles.infoBox}>
                <MaterialIcons name="info" size={20} color={COLORS.primary} />
                <Text style={styles.infoText}>
                  Thông tin ngân hàng sẽ được bảo mật và chỉ dùng để chuyển tiền cho bạn
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          {step > 1 && (
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={handlePreviousStep}
              disabled={isLoading}
            >
              <MaterialIcons name="arrow-back" size={20} color={COLORS.primary} />
              <Text style={styles.secondaryButtonText}>Quay lại</Text>
            </TouchableOpacity>
          )}

          {step < 3 ? (
            <TouchableOpacity
              style={[styles.button, styles.primaryButton, !step && { flex: 1 }]}
              onPress={handleNextStep}
              disabled={isLoading}
            >
              <Text style={styles.primaryButtonText}>Tiếp tục</Text>
              <MaterialIcons name="arrow-forward" size={20} color={COLORS.white} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.button, styles.primaryButton, styles.successButton]}
              onPress={handleRegister}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <>
                  <Text style={styles.primaryButtonText}>Hoàn thành đăng ký</Text>
                  <MaterialIcons name="check" size={20} color={COLORS.white} />
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.darkBg,
  },
  container: {
    flex: 1,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.darkBg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    flex: 1,
    marginLeft: 12,
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    paddingTop: 60,
  },
  stepIndicator: {
    backgroundColor: COLORS.darkCard,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  stepText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  progressBar: {
    height: 4,
    backgroundColor: COLORS.darkCard,
    borderRadius: 2,
    marginHorizontal: 16,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    paddingBottom: 140,
  },
  stepContent: {
    marginBottom: 24,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 24,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 24,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 10,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 10,
    backgroundColor: COLORS.darkCard,
    paddingHorizontal: 14,
    height: 56,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
    paddingRight: 12,
  },
  visibilityToggle: {
    padding: 8,
    marginLeft: 8,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 12,
    marginTop: 6,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: `${COLORS.primary}15`,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
    borderRadius: 8,
    padding: 12,
    marginTop: 24,
    gap: 12,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 24,
    backgroundColor: COLORS.darkBg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 10,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
  },
  secondaryButton: {
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    backgroundColor: 'transparent',
  },
  successButton: {
    backgroundColor: COLORS.success,
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButtonText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  vehicleTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 90,
  },
  vehicleTypeBtn: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 10,
    backgroundColor: COLORS.darkCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleTypeBtnActive: {
    borderColor: COLORS.primary,
    backgroundColor: `${COLORS.primary}20`,
  },
  vehicleTypeBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  vehicleTypeBtnTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  serviceTypeContainer: {
    gap: 12,
    marginBottom: 24,
  },
  serviceTypeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 10,
    backgroundColor: COLORS.darkCard,
  },
  serviceTypeBtnActive: {
    borderColor: COLORS.primary,
    backgroundColor: `${COLORS.primary}20`,
  },
  serviceTypeBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  serviceTypeBtnTextActive: {
    color: COLORS.primary,
  },
})
