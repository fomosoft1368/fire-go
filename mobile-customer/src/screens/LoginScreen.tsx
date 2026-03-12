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
  KeyboardAvoidingView,
  Platform,
  ImageBackground,
  Dimensions,
  Image,
} from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { useDispatch, useSelector } from 'react-redux'
import {
  loginStart,
  loginSuccess,
  loginFailure,
} from '../redux/slices/authSlice'
import { authService } from '../services/authService'
import type { RootState } from '../redux/store'
import { COLORS, SPACING, BORDER_RADIUS } from '../constants'

const { width, height } = Dimensions.get('window')

type AuthMode = 'login' | 'register'
type LoginStep = 1 | 2
type RegisterStep = 1 | 2 | 3

export default function LoginScreen() {
  const [authMode, setAuthMode] = useState<AuthMode>('login')
  const [loginStep, setLoginStep] = useState<LoginStep>(1)
  const [registerStep, setRegisterStep] = useState<RegisterStep>(1)

  // Login states
  const [loginIdentifier, setLoginIdentifier] = useState('') // email or phone
  const [loginPassword, setLoginPassword] = useState('')
  const [showLoginPassword, setShowLoginPassword] = useState(false)

  // Register states
  const [regName, setRegName] = useState('')
  const [regPhone, setRegPhone] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regConfirmPassword, setRegConfirmPassword] = useState('')
  const [showRegPassword, setShowRegPassword] = useState(false)
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false)

  const dispatch = useDispatch()
  const { isLoading, error } = useSelector((state: RootState) => state.auth)

  // Login handlers
  const handleLoginContinue = async () => {
    if (loginStep === 1) {
      if (!loginIdentifier) {
        Alert.alert('Thông báo', 'Vui lòng nhập email hoặc số điện thoại')
        return
      }
      setLoginStep(2)
    } else {
      if (!loginPassword) {
        Alert.alert('Thông báo', 'Vui lòng nhập mật khẩu')
        return
      }
      handleLogin()
    }
  }

  const handleLogin = async () => {
    dispatch(loginStart())
    try {
      // Logout first to clear old token/user data
      await authService.logout()
      console.log('[LoginScreen] Logged out, cleared old token')

      // Pass identifier (email or phone) to login
      const response = await authService.login(loginIdentifier, loginPassword)
      console.log('[LoginScreen] Login success, dispatching loginSuccess')
      dispatch(loginSuccess({ token: response.token, user: response.user }))
      console.log('[LoginScreen] Redux state updated with new token')
    } catch (err: any) {
      const errorMessage = err.message || 'Đăng nhập thất bại'
      dispatch(loginFailure(errorMessage))
      Alert.alert('Lỗi', errorMessage)
    }
  }

  const handleLoginBack = () => {
    setLoginStep(1)
    setLoginPassword('')
  }

  // Register handlers
  const handleRegisterContinue = async () => {
    if (registerStep === 1) {
      if (!regName || !regPhone) {
        Alert.alert('Thông báo', 'Vui lòng nhập tên và số điện thoại')
        return
      }
      setRegisterStep(2)
    } else if (registerStep === 2) {
      if (!regEmail) {
        Alert.alert('Thông báo', 'Vui lòng nhập email')
        return
      }
      setRegisterStep(3)
    } else {
      if (!regPassword || !regConfirmPassword) {
        Alert.alert('Thông báo', 'Vui lòng nhập mật khẩu')
        return
      }
      if (regPassword !== regConfirmPassword) {
        Alert.alert('Lỗi', 'Mật khẩu không khớp')
        return
      }
      handleRegister()
    }
  }

  const handleRegister = async () => {
    dispatch(loginStart())
    try {
      // Logout first to clear old token/user data
      await authService.logout()

      const response = await authService.register(
        regName,
        regEmail,
        regPhone,
        regPassword
      )
      dispatch(loginSuccess({ token: response.token, user: response.user }))
    } catch (err: any) {
      const errorMessage = err.message || 'Đăng ký thất bại'
      dispatch(loginFailure(errorMessage))
      Alert.alert('Lỗi', errorMessage)
    }
  }

  const handleRegisterBack = () => {
    if (registerStep > 1) {
      setRegisterStep((step) => (step - 1) as RegisterStep)
    }
  }

  const switchMode = (mode: AuthMode) => {
    setAuthMode(mode)
    setLoginStep(1)
    setRegisterStep(1)
    setLoginIdentifier('')
    setLoginPassword('')
    setShowLoginPassword(false)
    setRegName('')
    setRegPhone('')
    setRegEmail('')
    setRegPassword('')
    setRegConfirmPassword('')
    setShowRegPassword(false)
    setShowRegConfirmPassword(false)
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

          {/* Logo */}
          <View style={styles.logoWrapper}>
            <Image
              source={require('../assets/logooo.png')}
              style={{ width: 39, height: 39 }}
              resizeMode="contain"
            />
            <Text style={styles.appName}>firego</Text>
          </View>

          {/* Badge */}
          <View style={styles.badgeWrapper}>
            <View style={styles.badge}>
              <MaterialIcons name="verified" size={14} color={"#fff"} />
              <Text style={styles.badgeText}>Đối tác tin cậy</Text>
            </View>
          </View>
        </View>

        {/* Main Content */}
        <View style={styles.contentContainer}>
          {/* Greeting */}
          <View style={styles.greetingSection}>
            <Text style={styles.greeting}>Xin chào!</Text>
            <Text style={styles.tagline}>
              Đặt ghép xe tiện lợi & thuê tài xế lái hộ an toàn 24/7
            </Text>
          </View>

          {/* Auth Mode Tabs - Show on first step */}
          {(authMode === 'login' ? loginStep === 1 : registerStep === 1) && (
            <View style={styles.tabsContainer}>
              <TouchableOpacity
                style={[styles.tab, authMode === 'login' && styles.tabActive]}
                onPress={() => switchMode('login')}
              >
                <Text
                  style={[
                    styles.tabText,
                    authMode === 'login' && styles.tabTextActive,
                  ]}
                >
                  Đăng nhập
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.tab,
                  authMode === 'register' && styles.tabActive,
                ]}
                onPress={() => switchMode('register')}
              >
                <Text
                  style={[
                    styles.tabText,
                    authMode === 'register' && styles.tabTextActive,
                  ]}
                >
                  Đăng ký
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Back Button - Show on non-first steps */}
          {(authMode === 'login' ? loginStep > 1 : registerStep > 1) && (
            <View style={styles.backButtonContainer}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={
                  authMode === 'login' ? handleLoginBack : handleRegisterBack
                }
              >
                <MaterialIcons name="arrow-back" size={20} color="#FF6B35" />
              </TouchableOpacity>
            </View>
          )}

          {/* Form */}
          <View style={styles.formContainer}>
            {authMode === 'login' ? (
              // LOGIN FORM
              <>
                {loginStep === 1 && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Số điện thoại / Email</Text>
                    <View style={styles.inputWrapper}>
                      <MaterialIcons
                        name="person"
                        size={20}
                        color="#94a3b8"
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={styles.input}
                        placeholder="Nhập email hoặc số điện thoại..."
                        placeholderTextColor="#64748b"
                        value={loginIdentifier}
                        onChangeText={setLoginIdentifier}
                        editable={!isLoading}
                        keyboardType="default"
                        autoFocus
                      />
                    </View>
                  </View>
                )}

                {loginStep === 2 && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Mật khẩu</Text>
                    <View style={styles.inputWrapper}>
                      <MaterialIcons
                        name="lock"
                        size={20}
                        color="#94a3b8"
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={styles.input}
                        placeholder="Nhập mật khẩu..."
                        placeholderTextColor="#64748b"
                        value={loginPassword}
                        onChangeText={setLoginPassword}
                        editable={!isLoading}
                        secureTextEntry={!showLoginPassword}
                        autoFocus
                      />
                      <TouchableOpacity
                        onPress={() =>
                          setShowLoginPassword(!showLoginPassword)
                        }
                        hitSlop={{
                          top: 10,
                          right: 10,
                          bottom: 10,
                          left: 10,
                        }}
                      >
                        <MaterialIcons
                          name={
                            showLoginPassword ? 'visibility-off' : 'visibility'
                          }
                          size={20}
                          color="#94a3b8"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Forgot Password Link */}
                <View style={styles.forgotContainer}>
                  <TouchableOpacity>
                    <Text style={styles.forgotText}>Quên mật khẩu?</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              // REGISTER FORM
              <>
                {registerStep === 1 && (
                  <>
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Họ và tên</Text>
                      <View style={styles.inputWrapper}>
                        <MaterialIcons
                          name="person"
                          size={20}
                          color="#94a3b8"
                          style={styles.inputIcon}
                        />
                        <TextInput
                          style={styles.input}
                          placeholder="Nhập họ và tên..."
                          placeholderTextColor="#64748b"
                          value={regName}
                          onChangeText={setRegName}
                          editable={!isLoading}
                          autoFocus
                        />
                      </View>
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Số điện thoại</Text>
                      <View style={styles.inputWrapper}>
                        <MaterialIcons
                          name="phone"
                          size={20}
                          color="#94a3b8"
                          style={styles.inputIcon}
                        />
                        <TextInput
                          style={styles.input}
                          placeholder="Nhập số điện thoại..."
                          placeholderTextColor="#64748b"
                          value={regPhone}
                          onChangeText={setRegPhone}
                          editable={!isLoading}
                          keyboardType="phone-pad"
                        />
                      </View>
                    </View>
                  </>
                )}

                {registerStep === 2 && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Email</Text>
                    <View style={styles.inputWrapper}>
                      <MaterialIcons
                        name="email"
                        size={20}
                        color="#94a3b8"
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={styles.input}
                        placeholder="Nhập email..."
                        placeholderTextColor="#64748b"
                        value={regEmail}
                        onChangeText={setRegEmail}
                        editable={!isLoading}
                        keyboardType="email-address"
                        autoFocus
                      />
                    </View>
                  </View>
                )}

                {registerStep === 3 && (
                  <>
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Mật khẩu</Text>
                      <View style={styles.inputWrapper}>
                        <MaterialIcons
                          name="lock"
                          size={20}
                          color="#94a3b8"
                          style={styles.inputIcon}
                        />
                        <TextInput
                          style={styles.input}
                          placeholder="Nhập mật khẩu..."
                          placeholderTextColor="#64748b"
                          value={regPassword}
                          onChangeText={setRegPassword}
                          editable={!isLoading}
                          secureTextEntry={!showRegPassword}
                          autoFocus
                        />
                        <TouchableOpacity
                          onPress={() => setShowRegPassword(!showRegPassword)}
                          hitSlop={{
                            top: 10,
                            right: 10,
                            bottom: 10,
                            left: 10,
                          }}
                        >
                          <MaterialIcons
                            name={showRegPassword ? 'visibility-off' : 'visibility'}
                            size={20}
                            color="#94a3b8"
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
                          color="#94a3b8"
                          style={styles.inputIcon}
                        />
                        <TextInput
                          style={styles.input}
                          placeholder="Xác nhận mật khẩu..."
                          placeholderTextColor="#64748b"
                          value={regConfirmPassword}
                          onChangeText={setRegConfirmPassword}
                          editable={!isLoading}
                          secureTextEntry={!showRegConfirmPassword}
                        />
                        <TouchableOpacity
                          onPress={() =>
                            setShowRegConfirmPassword(!showRegConfirmPassword)
                          }
                          hitSlop={{
                            top: 10,
                            right: 10,
                            bottom: 10,
                            left: 10,
                          }}
                        >
                          <MaterialIcons
                            name={
                              showRegConfirmPassword
                                ? 'visibility-off'
                                : 'visibility'
                            }
                            size={20}
                            color="#94a3b8"
                          />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </>
                )}
              </>
            )}

            {/* Continue Button */}
            <TouchableOpacity
              style={[
                styles.continueButton,
                isLoading && styles.buttonDisabled,
              ]}
              onPress={
                authMode === 'login'
                  ? handleLoginContinue
                  : handleRegisterContinue
              }
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Text style={styles.continueButtonText}>Tiếp tục</Text>
                  <MaterialIcons
                    name="arrow-forward"
                    size={20}
                    color="#fff"
                    style={styles.buttonIcon}
                  />
                </>
              )}
            </TouchableOpacity>

            {/* Error Message */}
            {error && (
              <View style={styles.errorBox}>
                <MaterialIcons
                  name="error-outline"
                  size={16}
                  color="#ff6b6b"
                />
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
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    flexGrow: 1,
  },
  headerContainer: {
    height: height * 0.34,
    position: 'relative',
    overflow: 'hidden',
  },
  headerBackground: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  headerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  logoWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'flex-start',
    flexDirection: 'row',
    gap: 8,
    paddingLeft: 20,
    paddingTop: 24,
  },
  appName: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -1,
    color: '#FF6B35',
  },
  badgeWrapper: {
    position: 'absolute',
    bottom: 60,
    right: 20,
    zIndex: 10,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FF6B35',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
    letterSpacing: 0.3,
  },
  contentContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
    marginTop: -39,
    borderTopLeftRadius: 39,
    borderTopRightRadius: 39,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  greetingSection: {
    marginBottom: SPACING.xl,
    alignItems: 'center',
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111418',
    marginBottom: SPACING.xs,
  },
  tagline: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: BORDER_RADIUS.xl,
    padding: 6,
    marginBottom: SPACING.xl,
    height: 56,
  },
  tab: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.lg,
  },
  tabActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94a3b8',
  },
  tabTextActive: {
    color: '#FF6B00',
  },
  backButtonContainer: {
    marginBottom: SPACING.xl,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 107, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  formContainer: {
    marginBottom: SPACING.xl,
  },
  inputGroup: {
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginBottom: SPACING.sm,
    marginLeft: SPACING.sm,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: BORDER_RADIUS.xl,
    paddingHorizontal: SPACING.lg,
    height: 56,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  inputIcon: {
    marginRight: SPACING.md,
  },
  input: {
    flex: 1,
    color: '#111418',
    fontSize: 14,
    fontWeight: '500',
  },
  forgotContainer: {
    alignItems: 'flex-end',
    marginBottom: SPACING.lg,
  },
  forgotText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FF6B00',
  },
  continueButton: {
    backgroundColor: '#FF6B35',
    borderRadius: BORDER_RADIUS.xl,
    height: 56,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.sm,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  buttonIcon: {
    marginLeft: SPACING.sm,
  },
  errorBox: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginTop: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.xl,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  dividerText: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '600',
    marginHorizontal: SPACING.md,
    letterSpacing: 0.5,
  },
  socialContainer: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  socialButton: {
    flex: 1,
    height: 56,
    borderRadius: BORDER_RADIUS.xl,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  biometricContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
  },
  biometricButton: {
    alignItems: 'center',
    gap: SPACING.sm,
  },
  biometricIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 107, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  biometricText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
})

