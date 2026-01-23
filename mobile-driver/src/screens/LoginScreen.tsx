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
  ImageBackground,
  SafeAreaView,
} from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { useDispatch, useSelector } from 'react-redux'
import { loginStart, loginSuccess, loginFailure } from '../redux/slices/authSlice'
import { login as loginAPI } from '../services/authService'
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
      console.log('🔓 LoginScreen - Calling loginAPI with:', phoneEmail)
      const response = await loginAPI(phoneEmail, password)
      console.log('🔓 LoginScreen - Got response:', response)
      console.log('🔓 LoginScreen - Access token:', response.accessToken)
      
      // Verify token was saved to AsyncStorage
      const AsyncStorage = require('@react-native-async-storage/async-storage').default
      const savedToken = await AsyncStorage.getItem('token')
      console.log('🔓 LoginScreen - Token saved to AsyncStorage:', !!savedToken)
      console.log('🔓 LoginScreen - Saved token value:', savedToken ? savedToken.substring(0, 30) + '...' : 'null')
      
      if (!savedToken) {
        console.error('🔓 LoginScreen - WARNING: Token was not saved to AsyncStorage!')
      }
      
      dispatch(loginSuccess({ token: response.accessToken, user: response.user }))
      console.log('🔓 LoginScreen - loginSuccess dispatched')
    } catch (err: any) {
      console.log('🔓 LoginScreen - Error caught:', err.response?.data?.message || err.message)
      const errorMessage = err.response?.data?.message || 'Đăng nhập thất bại'
      dispatch(loginFailure(errorMessage))
      Alert.alert('Lỗi', errorMessage)
    }
  }

  const handleGoToRegister = () => {
    navigation?.navigate('Register')
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <View style={styles.logoBg}>
              <MaterialIcons name="directions-car" size={24} color={COLORS.primary} />
            </View>
            <Text style={styles.appName}>Driver App</Text>
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
            <TouchableOpacity>
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

        {/* Social Login Divider */}
        <View style={styles.dividerContainer}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>Hoặc tiếp tục với</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Social Buttons */}
        <View style={styles.socialContainer}>
          <TouchableOpacity style={styles.socialButton}>
            <MaterialIcons name="mail" size={24} color="#4285F4" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.socialButton}>
            <MaterialIcons name="apple" size={24} color="#000000" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.socialButton}>
            <MaterialIcons name="public" size={24} color="#1877F2" />
          </TouchableOpacity>
        </View>

        {/* Sign Up Link */}
        <View style={styles.signupContainer}>
          <Text style={styles.signupText}>Chưa có tài khoản? </Text>
          <TouchableOpacity onPress={handleGoToRegister}>
            <Text style={styles.signupLink}>Đăng ký tài xế</Text>
          </TouchableOpacity>
        </View>

        {/* Footer Links */}
        <View style={styles.footerLinks}>
          <TouchableOpacity>
            <Text style={styles.footerLink}>Điều khoản</Text>
          </TouchableOpacity>
          <TouchableOpacity>
            <Text style={styles.footerLink}>Bảo mật</Text>
          </TouchableOpacity>
          <TouchableOpacity>
            <Text style={styles.footerLink}>Trợ giúp</Text>
          </TouchableOpacity>
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
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.darkBg,
    paddingTop: 40,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${COLORS.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appName: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  bannerContainer: {
    paddingHorizontal: 16,
    paddingTop: 20,
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
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 24,
    gap: 12,
    backgroundColor: COLORS.darkBg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  socialContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 16,
    paddingBottom: 24,
    backgroundColor: COLORS.darkBg,
  },
  socialButton: {
    width: 60,
    height: 52,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.darkCard,
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
  footerLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 28,
    paddingHorizontal: 16,
    paddingBottom: 32,
    backgroundColor: COLORS.darkBg,
  },
  footerLink: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
})
