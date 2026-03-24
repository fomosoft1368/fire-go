import React, { useState, useEffect } from 'react'
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
} from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'

const COLORS = {
  primary: '#FF6B35',
  white: '#ffffff',
  text: '#111418',
  textSecondary: '#64748b',
  border: '#e2e8f0',
  darkBg: '#ffffff',
  darkCard: '#f1f5f9',
}

type ForgotPasswordStep = 1 | 2 | 3

export default function ForgotPasswordScreen({ navigation }: any) {
  const [step, setStep] = useState<ForgotPasswordStep>(1)
  const [phoneEmail, setPhoneEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)

  // Countdown timer for resend OTP
  useEffect(() => {
    if (countdown <= 0) return
    
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
    return () => clearTimeout(timer)
  }, [countdown])

  const handleSendOTP = async () => {
    if (!phoneEmail) {
      Alert.alert('Lỗi', 'Vui lòng nhập email hoặc số điện thoại')
      return
    }

    setIsLoading(true)
    try {
      // Simulate API call to send OTP
      // In production: call backend API to send OTP via SMS/Email
      console.log('Sending OTP to:', phoneEmail)
      
      // Simulate delay
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      Alert.alert(
        'Thành công',
        `Mã OTP đã được gửi đến ${phoneEmail}\nVui lòng kiểm tra email hoặc Zalo của bạn`,
        [
          {
            text: 'OK',
            onPress: () => {
              setStep(2)
              setCountdown(60) // 60 seconds to resend
            },
          },
        ]
      )
    } catch (err) {
      Alert.alert('Lỗi', 'Không thể gửi mã OTP')
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyOTP = async () => {
    if (!otp || otp.length < 4) {
      Alert.alert('Lỗi', 'Vui lòng nhập mã OTP đầy đủ (4 chữ số)')
      return
    }

    setIsLoading(true)
    try {
      // Simulate API call to verify OTP
      // In production: call backend API to verify OTP
      console.log('Verifying OTP:', otp)
      
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // For demo: accept any 4-digit code, in production verify against backend
      if (otp.length === 4) {
        setStep(3)
      } else {
        Alert.alert('Lỗi', 'Mã OTP không hợp lệ')
      }
    } catch (err) {
      Alert.alert('Lỗi', 'Không thể xác nhận OTP')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendOTP = async () => {
    if (countdown > 0) return
    
    setIsLoading(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 1500))
      Alert.alert(
        'Thành công',
        `Mã OTP mới đã được gửi đến ${phoneEmail}`
      )
      setCountdown(60)
    } catch (err) {
      Alert.alert('Lỗi', 'Không thể gửi lại mã OTP')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResetPassword = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert('Lỗi', 'Vui lòng nhập mật khẩu mới')
      return
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Lỗi', 'Mật khẩu không khớp')
      return
    }

    if (newPassword.length < 6) {
      Alert.alert('Lỗi', 'Mật khẩu phải có ít nhất 6 ký tự')
      return
    }

    setIsLoading(true)
    try {
      // Simulate API call to reset password
      // In production: call backend API to reset password
      console.log('Resetting password for:', phoneEmail)
      
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      Alert.alert(
        'Thành công',
        'Mật khẩu của bạn đã được đặt lại. Vui lòng đăng nhập lại',
        [
          {
            text: 'OK',
            onPress: () => navigation?.goBack(),
          },
        ]
      )
    } catch (err) {
      Alert.alert('Lỗi', 'Không thể đặt lại mật khẩu')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.headerContainer}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              if (step === 1) {
                navigation?.goBack()
              } else {
                setStep((step - 1) as ForgotPasswordStep)
                setOtp('')
                setNewPassword('')
                setConfirmPassword('')
              }
            }}
          >
            <MaterialIcons name="arrow-back" size={24} color={COLORS.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Quên mật khẩu</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Content */}
        <View style={styles.container}>
          {step === 1 && (
            <>
              {/* Step 1: Enter Phone/Email */}
              <View style={styles.iconContainer}>
                <View style={styles.iconBox}>
                  <MaterialIcons name="lock-reset" size={48} color={COLORS.primary} />
                </View>
              </View>

              <View style={styles.descriptionContainer}>
                <Text style={styles.title}>Đặt lại mật khẩu</Text>
                <Text style={styles.subtitle}>
                  Nhập email hoặc số điện thoại để nhận mã OTP
                </Text>
              </View>

              <View style={styles.formContainer}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Email hoặc số điện thoại</Text>
                  <View style={styles.inputWrapper}>
                    <MaterialIcons
                      name="mail"
                      size={20}
                      color={COLORS.textSecondary}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Nhập email hoặc số điện thoại"
                      placeholderTextColor={COLORS.textSecondary}
                      value={phoneEmail}
                      onChangeText={setPhoneEmail}
                      editable={!isLoading}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoFocus
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={[
                    styles.sendButton,
                    isLoading && styles.sendButtonDisabled,
                  ]}
                  onPress={handleSendOTP}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color={COLORS.white} />
                  ) : (
                    <>
                      <Text style={styles.sendButtonText}>Gửi mã OTP</Text>
                      <MaterialIcons
                        name="arrow-forward"
                        size={20}
                        color={COLORS.white}
                        style={{ marginLeft: 8 }}
                      />
                    </>
                  )}
                </TouchableOpacity>

                <View style={styles.helpContainer}>
                  <Text style={styles.helpText}>
                    Mã OTP sẽ được gửi qua email hoặc Zalo của bạn
                  </Text>
                </View>
              </View>
            </>
          )}

          {step === 2 && (
            <>
              {/* Step 2: Enter OTP */}
              <View style={styles.iconContainer}>
                <View style={styles.iconBox}>
                  <MaterialIcons name="verified-user" size={48} color={COLORS.primary} />
                </View>
              </View>

              <View style={styles.descriptionContainer}>
                <Text style={styles.title}>Xác nhận OTP</Text>
                <Text style={styles.subtitle}>
                  Nhập mã OTP 4 chữ số được gửi đến{"\n"}
                  <Text style={styles.boldText}>{phoneEmail}</Text>
                </Text>
              </View>

              <View style={styles.formContainer}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Mã OTP</Text>
                  <View style={styles.inputWrapper}>
                    <MaterialIcons
                      name="numbers"
                      size={20}
                      color={COLORS.textSecondary}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Nhập 4 chữ số"
                      placeholderTextColor={COLORS.textSecondary}
                      value={otp}
                      onChangeText={setOtp}
                      editable={!isLoading}
                      keyboardType="number-pad"
                      maxLength={4}
                      autoFocus
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={[
                    styles.sendButton,
                    isLoading && styles.sendButtonDisabled,
                  ]}
                  onPress={handleVerifyOTP}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color={COLORS.white} />
                  ) : (
                    <>
                      <Text style={styles.sendButtonText}>Xác nhận</Text>
                      <MaterialIcons
                        name="arrow-forward"
                        size={20}
                        color={COLORS.white}
                        style={{ marginLeft: 8 }}
                      />
                    </>
                  )}
                </TouchableOpacity>

                <View style={styles.resendContainer}>
                  <Text style={styles.resendText}>
                    Không nhận được mã?{" "}
                  </Text>
                  <TouchableOpacity
                    onPress={handleResendOTP}
                    disabled={countdown > 0}
                  >
                    <Text
                      style={[
                        styles.resendLink,
                        countdown > 0 && styles.resendLinkDisabled,
                      ]}
                    >
                      {countdown > 0 ? `Gửi lại sau ${countdown}s` : "Gửi lại"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}

          {step === 3 && (
            <>
              {/* Step 3: Set New Password */}
              <View style={styles.iconContainer}>
                <View style={styles.iconBox}>
                  <MaterialIcons name="lock" size={48} color={COLORS.primary} />
                </View>
              </View>

              <View style={styles.descriptionContainer}>
                <Text style={styles.title}>Đặt mật khẩu mới</Text>
                <Text style={styles.subtitle}>
                  Nhập mật khẩu mới để bảo vệ tài khoản của bạn
                </Text>
              </View>

              <View style={styles.formContainer}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Mật khẩu mới</Text>
                  <View style={styles.inputWrapper}>
                    <MaterialIcons
                      name="lock"
                      size={20}
                      color={COLORS.textSecondary}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={[styles.input, { paddingRight: 48 }]}
                      placeholder="Nhập mật khẩu mới"
                      placeholderTextColor={COLORS.textSecondary}
                      value={newPassword}
                      onChangeText={setNewPassword}
                      editable={!isLoading}
                      secureTextEntry={!showPassword}
                      autoFocus
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      style={styles.visibilityToggle}
                    >
                      <MaterialIcons
                        name={showPassword ? "visibility" : "visibility-off"}
                        size={20}
                        color={COLORS.textSecondary}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Xác nhận mật khẩu</Text>
                  <View style={styles.inputWrapper}>
                    <MaterialIcons
                      name="lock"
                      size={20}
                      color={COLORS.textSecondary}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={[styles.input, { paddingRight: 48 }]}
                      placeholder="Xác nhận mật khẩu"
                      placeholderTextColor={COLORS.textSecondary}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      editable={!isLoading}
                      secureTextEntry={!showConfirmPassword}
                    />
                    <TouchableOpacity
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                      style={styles.visibilityToggle}
                    >
                      <MaterialIcons
                        name={showConfirmPassword ? "visibility" : "visibility-off"}
                        size={20}
                        color={COLORS.textSecondary}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity
                  style={[
                    styles.sendButton,
                    isLoading && styles.sendButtonDisabled,
                  ]}
                  onPress={handleResetPassword}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color={COLORS.white} />
                  ) : (
                    <>
                      <Text style={styles.sendButtonText}>Đặt lại mật khẩu</Text>
                      <MaterialIcons
                        name="arrow-forward"
                        size={20}
                        color={COLORS.white}
                        style={{ marginLeft: 8 }}
                      />
                    </>
                  )}
                </TouchableOpacity>

                <View style={styles.helpContainer}>
                  <Text style={styles.helpText}>
                    💡 Mật khẩu phải có ít nhất 6 ký tự
                  </Text>
                </View>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.darkBg,
  },
  scrollView: {
    flex: 1,
    backgroundColor: COLORS.darkBg,
  },
  scrollContent: {
    flexGrow: 1,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingTop: 40,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 32,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  descriptionContainer: {
    marginBottom: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: '90%',
  },
  formContainer: {
    marginBottom: 32,
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
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    height: 52,
    borderRadius: 10,
    marginTop: 12,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  sendButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
  helpContainer: {
    marginTop: 16,
    paddingHorizontal: 12,
  },
  helpText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  boldText: {
    fontWeight: '700',
    color: COLORS.text,
  },
  visibilityToggle: {
    padding: 8,
    marginLeft: 8,
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  resendText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  resendLink: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  resendLinkDisabled: {
    color: COLORS.textSecondary,
  },
})
