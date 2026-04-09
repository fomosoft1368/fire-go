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
import { API_BASE_URL } from '../constants/config'

const COLORS = {
  primary: '#FF6B35',
  primaryLight: '#FF8C5A',
  primaryDark: '#E55A25',
  white: '#ffffff',
  text: '#111418',
  textSecondary: '#64748b',
  textTertiary: '#94a3b8',
  border: '#e2e8f0',
  background: '#ffffff',
  surface: '#f8fafc',
  darkBg: '#ffffff',
  darkCard: '#f1f5f9',
  darkText: '#111418',
  success: '#10b981',
  error: '#ef4444',
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
  vehicleType: string // sedan, suv, pickup, motorcycle

  // Driver License Info
  licenseNumber: string
  licenseExpiry: string

  // Service Selection
  driverTypes: string[] // rideshare, hire, delivery

  // Bank Info
  bankName: string
  bankAccount: string
  bankAccountHolder: string

  // Referral
  referralCode: string
}

interface FormErrors {
  [key: string]: string
}

export default function RegisterScreen({ navigation }: any) {
  const [step, setStep] = useState(1) // 1: Personal, 2: Vehicle
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [countdown, setCountdown] = useState(0)

  // Countdown timer for OTP
  React.useEffect(() => {
    let timer: NodeJS.Timeout
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000)
    }
    return () => clearTimeout(timer)
  }, [countdown])

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
    vehicleType: 'sedan',
    licenseNumber: '',
    licenseExpiry: '',
    driverTypes: ['rideshare'],
    bankName: '',
    bankAccount: '',
    bankAccountHolder: '',
    referralCode: '',
  })

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

    if (!formData.licenseNumber.trim()) {
      newErrors.licenseNumber = 'Số bằng lái không được để trống'
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
      handleRegister()
    }
  }

  const handlePreviousStep = () => {
    if (step > 1) {
      setStep(step - 1)
    }
  }

  const handleRegister = async () => {
    setIsLoading(true)
    try {
      await sendOtpVerification(formData.phone, formData.email)
      setIsVerifyingOtp(true)
    } catch (err: any) {
      // Error handled in sendOtpVerification
    } finally {
      setIsLoading(false)
    }
  }

  const sendOtpVerification = async (phone: string, email: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/driver/register-otp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, email }),
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Lỗi gửi mã OTP')
      }
      setCountdown(60)
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Không thể gửi mã OTP tới Email của bạn. Hoặc tài khoản này đã tồn tại.')
      throw err; // Re-throw to be caught by handleRegister
    }
  }

  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.length < 6) return
    setIsLoading(true)
    try {
      // 1. Verify OTP first
      const verifyResponse = await fetch(`${API_BASE_URL}/auth/driver/register-otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formData.phone, code: otpCode }),
      })
      
      const verifyData = await verifyResponse.json()
      
      if (!verifyResponse.ok) {
        throw new Error(verifyData.message || 'Mã OTP không hợp lệ')
      }

      // 2. Format the data for API Creation
      const registrationData = {
        firstName: formData.fullName.split(' ')[0],
        lastName: formData.fullName.split(' ').slice(1).join(' '),
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        vehicleModel: formData.vehicleModel,
        vehicleColor: formData.vehicleColor,
        vehiclePlate: formData.vehiclePlate,
        vehicleType: formData.vehicleType,
        licenseNumber: formData.licenseNumber,
        driverTypes: formData.driverTypes,
        referralCode: formData.referralCode,
      }

      // 3. Call registration API
      const response = await fetch(`${API_BASE_URL}/drivers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registrationData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || `Lỗi ${response.status}: ${response.statusText}`)
      }

      setIsLoading(false)

      Alert.alert(
        'Đăng ký thành công!',
        'Tài khoản của bạn đã được xác thực mã OTP và tiến hành chờ Admin duyệt hồ sơ.\n\nBạn sẽ nhận được thông báo khi hồ sơ được duyệt.',
        [
          {
            text: 'OK',
            onPress: () => {
              setIsVerifyingOtp(false)
              navigation?.goBack?.()
            },
          },
        ],
      )
    } catch (err: any) {
      setIsLoading(false)
      Alert.alert('Lỗi', err.message || 'Có lỗi xảy ra khi xác thực OTP và nộp hồ sơ.')
    }
  }

  const handleGoBack = () => {
    if (isVerifyingOtp) {
      setIsVerifyingOtp(false)
      return
    }
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
              Bước {step} / 2
            </Text>
          </View>
        </View>

        {/* Progress Bar (Hide in OTP mode) */}
        {!isVerifyingOtp && (
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${(step / 2) * 100}%` },
              ]}
            />
          </View>
        )}

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollViewContent}
        >
          {isVerifyingOtp ? (
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Xác thực Email</Text>
              <Text style={styles.stepDescription}>
                Chúng tôi đã gửi mã OTP gồm 6 chữ số qua Email tới địa chỉ {formData.email}
              </Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Nhập mã OTP</Text>
                <View style={[styles.inputWrapper, { height: 72 }]}>
                  <MaterialIcons name="security" size={24} color={COLORS.primary} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { fontSize: 24, letterSpacing: 8, fontWeight: '700' }]}
                    placeholder="------"
                    placeholderTextColor={COLORS.textSecondary}
                    value={otpCode}
                    onChangeText={setOtpCode}
                    editable={!isLoading}
                    keyboardType="number-pad"
                    maxLength={6}
                    autoFocus
                  />
                </View>
              </View>

              <TouchableOpacity 
                style={{ paddingVertical: 12, alignItems: 'center' }}
                onPress={() => sendOtpVerification(formData.phone, formData.email)}
                disabled={countdown > 0}
              >
                <Text style={{ color: countdown > 0 ? COLORS.textTertiary : COLORS.primary, fontWeight: 'bold' }}>
                  {countdown > 0 ? `Chưa nhận được? Gửi lại sau ${countdown}s` : 'Gửi lại mã OTP'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
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
              {renderInput('Mã giới thiệu (không bắt buộc)', 'referralCode', 'card-giftcard', 'Nhập mã người giới thiệu')}
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

              <Text style={styles.sectionTitle}>Thông tin bằng lái xe</Text>
              {renderInput('Số bằng lái', 'licenseNumber', 'badge', 'Nhập số bằng lái')}

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
            </>
          )}
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          {isVerifyingOtp ? (
            <TouchableOpacity
              style={[styles.button, styles.primaryButton, { flex: 1 }]}
              onPress={handleVerifyOtp}
              disabled={isLoading || otpCode.length < 6}
            >
              {isLoading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <>
                  <Text style={styles.primaryButtonText}>Xác thực</Text>
                  <MaterialIcons name="check-circle" size={20} color={COLORS.white} />
                </>
              )}
            </TouchableOpacity>
          ) : (
            <>
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

              {step < 2 ? (
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
                  onPress={handleNextStep}
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
            </>
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
    paddingHorizontal: 24,
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
    marginLeft: 16,
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
    paddingTop: 60,
    letterSpacing: 0.3,
  },
  stepIndicator: {
    backgroundColor: `${COLORS.primary}15`,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: `${COLORS.primary}30`,
  },
  stepText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 0.4,
  },
  progressBar: {
    height: 6,
    backgroundColor: `${COLORS.border}30`,
    borderRadius: 3,
    marginHorizontal: 20,
    marginTop: 16,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 3,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingHorizontal: 24,
    paddingVertical: 32,
    paddingBottom: 140,
  },
  stepContent: {
    marginBottom: 28,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.text,
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  stepDescription: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginBottom: 32,
    lineHeight: 24,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: COLORS.text,
    marginTop: 32,
    marginBottom: 18,
    letterSpacing: 0.2,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 16,
    backgroundColor: COLORS.darkCard,
    paddingHorizontal: 18,
    height: 62,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  inputIcon: {
    marginRight: 14,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
    paddingRight: 12,
    fontWeight: '500',
  },
  visibilityToggle: {
    padding: 10,
    marginLeft: 12,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 13,
    marginTop: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: `${COLORS.primary}12`,
    borderLeftWidth: 5,
    borderLeftColor: COLORS.primary,
    borderRadius: 14,
    padding: 18,
    marginTop: 32,
    gap: 14,
    alignItems: 'flex-start',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 22,
    fontWeight: '500',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 14,
    paddingHorizontal: 24,
    paddingVertical: 18,
    paddingBottom: 28,
    backgroundColor: COLORS.darkBg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 62,
    borderRadius: 16,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  secondaryButton: {
    borderWidth: 2,
    borderColor: COLORS.primary,
    backgroundColor: 'transparent',
  },
  successButton: {
    backgroundColor: COLORS.success,
    shadowColor: COLORS.success,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  secondaryButtonText: {
    color: COLORS.primary,
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  vehicleTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginBottom: 28,
  },
  vehicleTypeBtn: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 14,
    backgroundColor: COLORS.darkCard,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  vehicleTypeBtnActive: {
    borderColor: COLORS.primary,
    backgroundColor: `${COLORS.primary}20`,
  },
  vehicleTypeBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textSecondary,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  vehicleTypeBtnTextActive: {
    color: COLORS.primary,
    fontWeight: '900',
  },
  serviceTypeContainer: {
    gap: 14,
    marginBottom: 28,
  },
  serviceTypeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 18,
    paddingHorizontal: 18,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 14,
    backgroundColor: COLORS.darkCard,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  serviceTypeBtnActive: {
    borderColor: COLORS.primary,
    backgroundColor: `${COLORS.primary}20`,
  },
  serviceTypeBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: 0.2,
  },
  serviceTypeBtnTextActive: {
    color: COLORS.primary,
    fontWeight: '900',
  },
})
