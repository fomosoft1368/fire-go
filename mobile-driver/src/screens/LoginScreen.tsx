import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ImageBackground,
  SafeAreaView,
  Image,
  Platform,
} from 'react-native'
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view'
import { MaterialIcons } from '@expo/vector-icons'
import { useDispatch, useSelector } from 'react-redux'
import { loginStart, loginSuccess, loginFailure } from '../redux/slices/authSlice'
import { login as loginAPI } from '../services/authService'
import type { RootState } from '../redux/store'
import { API_BASE_URL } from '../constants/config'
import { KeyboardAvoidingView } from 'react-native'
const COLORS = {
  primary: '#FF6B35',
  white: '#ffffff',
  text: '#111418',
  textSecondary: '#64748b',
  border: '#e2e8f0',
  background: '#ffffff',
  surface: '#f8fafc',
  darkBg: '#ffffff',
  darkCard: '#f1f5f9',
  darkText: '#111418',
}

export default function LoginScreen({ navigation }: any) {
  const [phoneEmail, setPhoneEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)

  const dispatch = useDispatch()
  const { isLoading, error } = useSelector((state: RootState) => state.auth)

  const handleLogin = async () => {
    if (!phoneEmail || !password) {
      Alert.alert('Lỗi', 'Vui lòng nhập tất cả thông tin')
      return
    }

    dispatch(loginStart())
    try {
      const response = await loginAPI(phoneEmail, password)
      dispatch(loginSuccess({ token: response.accessToken, user: response.user }))
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Đăng nhập thất bại'
      dispatch(loginFailure(errorMessage))
      Alert.alert('Lỗi', errorMessage)
    }
  }

  const handleGoToRegister = () => {
    navigation?.navigate('Register')
  }

  const handleForgotPassword = () => {
    navigation?.navigate('ForgotPassword')
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          // contentContainerStyle={{ flexGrow: 1 }}
          keyboardDismissMode="interactive"
          contentContainerStyle={{ paddingBottom: 150 }}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Image
                source={require('../assets/fire-logo.png')}
                style={{ width: 39, height: 39 }}
                resizeMode="contain"
              />
              <Text style={styles.appName}>firego</Text>
            </View>
          </View>

          {/* Hero Banner */}
          <View style={styles.bannerContainer}>
            <ImageBackground
              source={require('../assets/heritage.png')}
              style={styles.banner}
            >
              <View style={styles.bannerOverlay} />
              <View style={styles.badgeContainer}>
                <View style={styles.badge}>
                  <MaterialIcons name="verified" size={14} color={COLORS.white} />
                  <Text style={styles.badgeText}>Đối tác tin cậy</Text>
                </View>
              </View>
            </ImageBackground>
          </View>

          {/* Welcome Section */}
          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeTitle}>Chào mừng tài xế</Text>
            <Text style={styles.welcomeSubtitle}>
              Đăng nhập để bắt đầu nhận cuốc và quản lý thu nhập của bạn ngay hôm nay.
            </Text>
          </View>

          {/* Login Form */}
          <View style={styles.formContainer}>
            {/* Phone/Email Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Số điện thoại hoặc Email</Text>
              <View style={styles.inputWrapper}>
                <MaterialIcons
                  name="person"
                  size={20}
                  color={COLORS.textSecondary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Nhập thông tin đăng nhập"
                  placeholderTextColor={COLORS.textSecondary}
                  value={phoneEmail}
                  onChangeText={setPhoneEmail}
                  editable={!isLoading}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Mật khẩu</Text>
              <View style={styles.inputWrapper}>
                <MaterialIcons
                  name="lock"
                  size={20}
                  color={COLORS.textSecondary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, { paddingRight: 48 }]}
                  placeholder="Nhập mật khẩu"
                  placeholderTextColor={COLORS.textSecondary}
                  value={password}
                  onChangeText={setPassword}
                  editable={!isLoading}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.visibilityToggle}
                >
                  <MaterialIcons
                    name={showPassword ? 'visibility' : 'visibility-off'}
                    size={20}
                    color={COLORS.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Error Message */}
            {error && <Text style={styles.errorText}>{error}</Text>}

            {/* Actions Row */}
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => setRememberMe(!rememberMe)}
              >
                <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                  {rememberMe && (
                    <MaterialIcons name="check" size={14} color={COLORS.white} />
                  )}
                </View>
                <Text style={styles.checkboxLabel}>Ghi nhớ tôi</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleForgotPassword}>
                <Text style={styles.forgotLink}>Quên mật khẩu?</Text>
              </TouchableOpacity>
            </View>

            {/* Login Button */}
            <TouchableOpacity
              style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <>
                  <Text style={styles.loginButtonText}>Đăng nhập</Text>
                  <MaterialIcons
                    name="arrow-forward"
                    size={20}
                    color={COLORS.white}
                    style={{ marginLeft: 8 }}
                  />
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Sign Up Link */}
          <View style={styles.signupContainer}>
            <Text style={styles.signupText}>Chưa có tài khoản? </Text>
            <TouchableOpacity onPress={handleGoToRegister}>
              <Text style={styles.signupLink}>Đăng ký tài xế</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.darkBg,
    paddingTop: 40,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  appName: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -1,
    color: '#FF6B35',
  },

  bannerContainer: {
    paddingHorizontal: 16,
    paddingTop: 6,
  },
  banner: {
    height: 260,
    borderRadius: 16,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  bannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  badgeContainer: {
    padding: 16,
    zIndex: 1,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.white,
  },
  welcomeSection: {
    paddingHorizontal: 16,
    paddingTop: 28,
    paddingBottom: 28,
    backgroundColor: COLORS.darkBg,
  },
  welcomeTitle: {
    fontSize: 36,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
    lineHeight: 44,
  },
  welcomeSubtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    lineHeight: 24,
  },
  formContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: COLORS.darkBg,
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
    color: '#ff6b6b',
    fontSize: 14,
    marginBottom: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 12,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.darkCard,
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  checkboxLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  forgotLink: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  loginButton: {
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
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: COLORS.darkBg,
  },
  signupText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  signupLink: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
})
