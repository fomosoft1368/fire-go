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
  KeyboardAvoidingView,
  Platform,
  ImageBackground,
  Dimensions,
  Image,
} from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { useDispatch, useSelector } from 'react-redux'
import { loginStart, loginSuccess, loginFailure } from '../redux/slices/authSlice'
import { authService } from '../services/authService'
import type { RootState } from '../redux/store'
import { COLORS, SPACING, BORDER_RADIUS } from '../constants'

const { width, height } = Dimensions.get('window')

type LoginStep = 1 | 2

export default function LoginScreen() {
  const [loginStep, setLoginStep] = useState<LoginStep>(1)

  // Step 1 states
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')

  // Step 2 states
  const [otpCode, setOtpCode] = useState('')
  const [countdown, setCountdown] = useState(0)

  const dispatch = useDispatch()
  const { isLoading, error } = useSelector((state: RootState) => state.auth)

  useEffect(() => {
    let timer: NodeJS.Timeout
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000)
    }
    return () => clearTimeout(timer)
  }, [countdown])

  const handleSendOtp = async () => {
    if (!phone) {
      Alert.alert('Thông báo', 'Vui lòng nhập số điện thoại')
      return
    }

    // Basic email validation if provided
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      Alert.alert('Thông báo', 'Email không hợp lệ')
      return
    }

    dispatch(loginStart())
    try {
      await authService.logout()

      await authService.sendLoginOtp(phone, email ? email.trim().toLowerCase() : undefined)
      dispatch(loginFailure('')) // clear error

      setLoginStep(2)
      setCountdown(60)
    } catch (err: any) {
      const errorMessage = err.message || 'Lỗi gửi mã OTP'
      dispatch(loginFailure(errorMessage))
      Alert.alert('Lỗi', errorMessage)
    }
  }

  // Step 2 handler
  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.length < 6) {
      Alert.alert('Thông báo', 'Vui lòng nhập đủ 6 số OTP')
      return
    }

    dispatch(loginStart())
    try {
      const response = await authService.verifyLoginOtp(phone, otpCode)
      dispatch(loginSuccess({ token: response.token, user: response.user }))
    } catch (err: any) {
      const errorMessage = err.message || 'Mã OTP không hợp lệ'
      dispatch(loginFailure(errorMessage))
      Alert.alert('Lỗi', errorMessage)
    }
  }

  const handleBack = () => {
    setLoginStep(1)
    setOtpCode('')
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header with Background Image */}
        <View style={styles.headerContainer}>
          <ImageBackground
            source={require('../assets/heritage.png')}
            style={styles.headerBackground}
            imageStyle={{ resizeMode: 'cover' }}
          >
            <View style={styles.headerOverlay} />
          </ImageBackground>

          <View style={styles.logoWrapper}>
            <Image
              source={require('../assets/icon-customer-Photoroom.png')}
              style={{ width: 39, height: 39 }}
              resizeMode="contain"
            />
            <Text style={styles.appName}>firego</Text>
          </View>

          <View style={styles.badgeWrapper}>
            <View style={styles.badge}>
              <MaterialIcons name="verified" size={14} color={"#fff"} />
              <Text style={styles.badgeText}>Đối tác tin cậy</Text>
            </View>
          </View>
        </View>

        <View style={styles.contentContainer}>
          <View style={styles.greetingSection}>
            <Text style={styles.greeting}>Xin chào!</Text>
            <Text style={styles.tagline}>
              Xác thực nhanh qua Email, an toàn & bảo mật
            </Text>
          </View>

          {loginStep === 2 && (
            <View style={styles.backButtonContainer}>
              <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                <MaterialIcons name="arrow-back" size={20} color="#FF6B35" />
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.formContainer}>
            {loginStep === 1 ? (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Số điện thoại *</Text>
                  <View style={styles.inputWrapper}>
                    <MaterialIcons name="phone" size={20} color="#94a3b8" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Nhập số điện thoại..."
                      placeholderTextColor="#64748b"
                      value={phone}
                      onChangeText={setPhone}
                      editable={!isLoading}
                      keyboardType="phone-pad"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Email (Bắt buộc nếu mới Đăng ký)</Text>
                  <View style={styles.inputWrapper}>
                    <MaterialIcons name="email" size={20} color="#94a3b8" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Nhập Email để nhận mã OTP..."
                      placeholderTextColor="#64748b"
                      value={email}
                      onChangeText={setEmail}
                      editable={!isLoading}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.continueButton, isLoading && styles.buttonDisabled]}
                  onPress={handleSendOtp}
                  disabled={isLoading || !phone}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Text style={styles.continueButtonText}>Nhận mã xác thực qua Email</Text>
                      <MaterialIcons name="arrow-forward" size={20} color="#fff" style={styles.buttonIcon} />
                    </>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Mã OTP</Text>
                  <View style={styles.inputWrapper}>
                    <MaterialIcons name="message" size={20} color="#94a3b8" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Nhập 6 số OTP (Gửi qua Email)"
                      placeholderTextColor="#64748b"
                      value={otpCode}
                      onChangeText={setOtpCode}
                      editable={!isLoading}
                      keyboardType="number-pad"
                      maxLength={6}
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={{ alignSelf: 'flex-end', marginBottom: SPACING.lg }}
                  onPress={handleSendOtp}
                  disabled={countdown > 0}
                >
                  <Text style={{ color: countdown > 0 ? '#94a3b8' : '#FF6B00', fontWeight: 'bold' }}>
                    {countdown > 0 ? `Chưa nhận được? Gửi lại sau ${countdown}s` : 'Gửi lại mã OTP'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.continueButton, isLoading && styles.buttonDisabled]}
                  onPress={handleVerifyOtp}
                  disabled={isLoading || otpCode.length < 6}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Text style={styles.continueButtonText}>Xác nhận & Đăng nhập</Text>
                      <MaterialIcons name="check" size={20} color="#fff" style={styles.buttonIcon} />
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}

            {error && (typeof error === 'string') && (
              <View style={styles.errorBox}>
                <MaterialIcons name="error-outline" size={16} color="#ff6b6b" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  scrollContent: { flexGrow: 1 },
  headerContainer: { height: height * 0.34, position: 'relative', overflow: 'hidden' },
  headerBackground: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  headerOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  logoWrapper: { position: 'absolute', top: 0, left: 0, alignItems: 'center', justifyContent: 'flex-start', flexDirection: 'row', gap: 8, paddingLeft: 20, paddingTop: 24 },
  appName: { fontSize: 32, fontWeight: '800', letterSpacing: -1, color: '#FF6B35' },
  badgeWrapper: { position: 'absolute', bottom: 60, right: 20, zIndex: 10 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FF6B35', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6, shadowColor: '#FF6B35', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4 },
  badgeText: { fontSize: 12, fontWeight: '600', color: '#ffffff', letterSpacing: 0.3 },
  contentContainer: { flex: 1, backgroundColor: '#ffffff', marginTop: -39, borderTopLeftRadius: 39, borderTopRightRadius: 39, paddingHorizontal: SPACING.lg, paddingTop: SPACING.xl, paddingBottom: SPACING.lg, shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
  greetingSection: { marginBottom: SPACING.xl, alignItems: 'center' },
  greeting: { fontSize: 28, fontWeight: '700', color: '#111418', marginBottom: SPACING.xs },
  tagline: { fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 20, maxWidth: 280 },
  backButtonContainer: { marginBottom: SPACING.xl },
  backButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255, 107, 0, 0.1)', justifyContent: 'center', alignItems: 'center' },
  formContainer: { marginBottom: SPACING.xl },
  inputGroup: { marginBottom: SPACING.lg },
  label: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: SPACING.sm, marginLeft: SPACING.sm },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: BORDER_RADIUS.xl, paddingHorizontal: SPACING.lg, height: 56, borderWidth: 1, borderColor: '#e2e8f0' },
  inputIcon: { marginRight: SPACING.md },
  input: { flex: 1, color: '#111418', fontSize: 14, fontWeight: '500' },
  continueButton: { backgroundColor: '#FF6B35', borderRadius: BORDER_RADIUS.xl, height: 56, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: SPACING.sm, shadowColor: '#FF6B35', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8 },
  buttonDisabled: { opacity: 0.6 },
  continueButtonText: { color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: 0.5 },
  buttonIcon: { marginLeft: SPACING.sm },
  errorBox: { backgroundColor: 'rgba(255, 107, 107, 0.1)', borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, marginTop: SPACING.lg, flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  errorText: { color: '#ff6b6b', fontSize: 12, fontWeight: '500', flex: 1 },
})
