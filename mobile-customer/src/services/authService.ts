import AsyncStorage from '@react-native-async-storage/async-storage'
import type { User, LoginResponse } from '../types'
import { API_BASE_URL } from '../constants'
import { registerPushToken } from './pushNotificationService'

const TOKEN_KEY = 'authToken'
const REFRESH_TOKEN_KEY = 'refreshToken'
const USER_KEY = 'user'

// Helper to normalize Vietnamese phone numbers
const normalizePhoneNumber = (phone: string): string => {
  let normalized = phone.replace(/\D/g, '')

  // If starts with 84, it's already international format
  if (normalized.startsWith('84')) {
    return '+' + normalized
  }

  // If starts with 0, remove it and add country code
  if (normalized.startsWith('0')) {
    return '+84' + normalized.substring(1)
  }

  // Otherwise assume it's missing country code
  return '+84' + normalized
}

export const authService = {
  // Login with identifier (email or phone) and password
  async login(identifier: string, password: string): Promise<LoginResponse> {
    try {
      const apiUrl = `${API_BASE_URL}/customers/login`
      console.log('\n========== 🔐 LOGIN REQUEST START ==========')
      console.log('📍 API URL:', apiUrl)
      console.log('🌐 BASE_URL:', API_BASE_URL)
      console.log('👤 Identifier:', identifier)
      console.log('🔑 Password length:', password.length)
      console.log('📦 Request body:', JSON.stringify({ identifier, password: '***' }, null, 2))
      console.log('📅 Timestamp:', new Date().toISOString())
      console.log('==========================================\n')

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ identifier, password }),
      })

      console.log('\n========== 📡 LOGIN RESPONSE RECEIVED ==========')
      console.log('📊 Status:', response.status, response.statusText)
      console.log('📋 Headers:', JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2))
      console.log('==========================================\n')

      if (!response.ok) {
        let errorData: any
        try {
          errorData = await response.json()
        } catch {
          errorData = { message: `HTTP ${response.status}` }
        }
        console.error('\n========== ❌ LOGIN ERROR ==========')
        console.error('🚫 Status:', response.status)
        console.error('💬 Error data:', JSON.stringify(errorData, null, 2))
        console.error('==========================================\n')
        throw new Error(errorData.message || 'Đăng nhập thất bại')
      }

      const data = await response.json()
      console.log('\n========== ✅ LOGIN SUCCESS ==========')
      console.log('👤 User ID:', data.user.id)
      console.log('📧 Email:', data.user.email)
      console.log('🎫 Token length:', data.accessToken?.length)
      console.log('==========================================\n')

      // Store tokens and user info
      await AsyncStorage.setItem(TOKEN_KEY, data.accessToken)
      await AsyncStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken)

      const user: User = {
        id: data.user.id,
        firstName: data.user.firstName,
        lastName: data.user.lastName,
        email: data.user.email,
        phone: data.user.phone || '',
        role: data.user.role,
        avatar: data.user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.user.email}`,
        completedRides: data.user.completedRides || 0,
        averageRating: data.user.averageRating || 5,
        totalSpent: data.user.totalSpent || 0,
        savedAddresses: data.user.savedAddresses || [],
        dateOfBirth: data.user.dateOfBirth,
        preferredDriverGender: data.user.preferredDriverGender,
      }

      await AsyncStorage.setItem(USER_KEY, JSON.stringify(user))

      // ✅ Đăng ký push notification token sau khi đăng nhập thành công
      registerPushToken().catch(e =>
        console.warn('[Auth] Push token registration failed (non-critical):', e.message)
      )

      return {
        token: data.accessToken,
        user,
      }
    } catch (error: any) {
      console.error('\n========== ❌ LOGIN EXCEPTION ==========')
      console.error('🚨 Error type:', error.constructor.name)
      console.error('💬 Error message:', error.message)

      if (error.name === 'TypeError' && error.message.includes('Network request failed')) {
        console.error('🌐 Network request failed - cannot reach server')
        console.error('📍 Check if:', {
          'Server is running': 'pm2 status',
          'Correct IP/URL': API_BASE_URL,
          'Firewall allows connection': 'Windows Firewall + Cloud provider',
        })
      }

      console.error('📚 Full error stack:', error.stack)
      console.error('==========================================\n')
      throw error
    }
  },

  // Register with name, email, phone, password
  async register(
    firstName: string,
    email: string,
    phone: string,
    password: string
  ): Promise<LoginResponse> {
    try {
      console.log('[Auth] Register attempt:', { firstName, email, phone: phone.replace(/\d(?=\d{4})/g, '*'), apiUrl: API_BASE_URL })

      // Split name into firstName and lastName
      const nameParts = firstName.split(' ')
      const lastNameOrFull = nameParts.length > 1 ? nameParts.pop() : ''
      const finalFirstName = nameParts.join(' ') || firstName

      // Normalize phone number to Vietnam format
      const normalizedPhone = normalizePhoneNumber(phone)
      console.log('[Auth] Normalized phone:', normalizedPhone)

      const registerPayload = {
        firstName: finalFirstName.trim(),
        lastName: lastNameOrFull?.trim() || '',
        email: email.trim(),
        phone: normalizedPhone,
        password,
        confirmPassword: password,
        role: 'customer',
      }

      console.log('[Auth] Register payload:', { ...registerPayload, password: '***', confirmPassword: '***' })

      const response = await fetch(`${API_BASE_URL}/customers/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registerPayload),
      })

      console.log('[Auth] Register response status:', response.status)

      if (!response.ok) {
        let errorData: any
        try {
          errorData = await response.json()
        } catch {
          const text = await response.text()
          console.error('[Auth] Response body:', text)
          errorData = { message: `HTTP ${response.status}: ${text}` }
        }
        console.error('[Auth] Register error:', errorData)
        throw new Error(errorData.message || 'Đăng ký thất bại')
      }

      const data = await response.json()
      console.log('[Auth] Register success:', { userId: data.user.id })

      // Store tokens and user info
      await AsyncStorage.setItem(TOKEN_KEY, data.accessToken)
      await AsyncStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken)

      const user: User = {
        id: data.user.id,
        firstName: data.user.firstName,
        lastName: data.user.lastName,
        email: data.user.email,
        phone: data.user.phone || '',
        role: data.user.role,
        avatar: data.user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.user.email}`,
        completedRides: data.user.completedRides || 0,
        averageRating: data.user.averageRating || 5,
        totalSpent: data.user.totalSpent || 0,
        savedAddresses: data.user.savedAddresses || [],
        dateOfBirth: data.user.dateOfBirth,
        preferredDriverGender: data.user.preferredDriverGender,
      }

      await AsyncStorage.setItem(USER_KEY, JSON.stringify(user))

      // ✅ Đăng ký push notification token sau khi đăng ký thành công
      registerPushToken().catch(e =>
        console.warn('[Auth] Push token registration failed (non-critical):', e.message)
      )

      return {
        token: data.accessToken,
        user,
      }
    } catch (error: any) {
      console.error('[Auth] Register failed:', error.message || error)
      throw error
    }
  },

  // Get current user from storage
  async getCurrentUser(): Promise<User | null> {
    try {
      const userJson = await AsyncStorage.getItem('user')
      return userJson ? JSON.parse(userJson) : null
    } catch (error) {
      return null
    }
  },

  // Logout
  async logout(): Promise<void> {
    try {
      console.log('[Auth] Logging out, clearing storage...')
      await AsyncStorage.removeItem(TOKEN_KEY)
      await AsyncStorage.removeItem(REFRESH_TOKEN_KEY)
      await AsyncStorage.removeItem(USER_KEY)
      // Clear all storage to be safe
      const keys = await AsyncStorage.getAllKeys()
      await AsyncStorage.multiRemove(keys.filter(k => k.includes('auth') || k.includes('user') || k.includes('token')))
      console.log('[Auth] Storage cleared completely')
    } catch (error) {
      console.error('[Auth] Logout error:', error)
      throw error
    }
  },

  // Get stored token
  async getToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(TOKEN_KEY)
    } catch (error) {
      return null
    }
  },

  // Update profile
  async updateProfile(userId: string, updateData: any): Promise<User> {
    try {
      console.log('[Auth] Update profile attempt:', { userId, updateData: { ...updateData, password: undefined } })

      const token = await this.getToken()
      if (!token) {
        throw new Error('No auth token found')
      }

      const response = await fetch(`${API_BASE_URL}/customers/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(updateData),
      })

      console.log('[Auth] Update profile response status:', response.status)

      if (!response.ok) {
        let errorData: any
        try {
          errorData = await response.json()
        } catch {
          errorData = { message: `HTTP ${response.status}` }
        }
        console.error('[Auth] Update profile error:', errorData)
        throw new Error(errorData.message || 'Cập nhật hồ sơ thất bại')
      }

      const data = await response.json()
      console.log('[Auth] Update profile success')

      // Update stored user info
      const user: User = {
        id: data._id || userId,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone || '',
        role: data.role || 'customer',
        avatar: data.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.email}`,
        completedRides: data.completedRides || 0,
        averageRating: data.averageRating || 5,
        totalSpent: data.totalSpent || 0,
        savedAddresses: data.savedAddresses || [],
        dateOfBirth: data.dateOfBirth,
        preferredDriverGender: data.preferredDriverGender,
      }

      // Store updated user info in Redux will be handled by the component
      return user
    } catch (error: any) {
      console.error('[Auth] Update profile failed:', error.message || error)
      throw error
    }
  },

  // Get current user ID
  async getUserId(): Promise<string> {
    try {
      const user = await this.getCurrentUser()
      if (!user?.id) {
        throw new Error('No user logged in')
      }
      return user.id
    } catch (error: any) {
      console.error('[Auth] Get user ID failed:', error.message || error)
      throw error
    }
  },

  // Gửi OTP xác minh SĐT
  async sendOtp(): Promise<{ message: string; expires: number }> {
    try {
      const token = await this.getToken()
      const response = await fetch(`${API_BASE_URL}/auth/customer/send-otp`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Lỗi gửi OTP')
      }
      return await response.json()
    } catch (error: any) {
      throw error
    }
  },

  // Xác minh OTP SĐT
  async verifyOtp(code: string): Promise<{ message: string }> {
    try {
      const token = await this.getToken()
      const response = await fetch(`${API_BASE_URL}/auth/customer/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ code })
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'OTP không hợp lệ')
      }
      return await response.json()
    } catch (error: any) {
      throw error
    }
  },

  // ===================== OTP LOGIN FLOW =====================
  async sendLoginOtp(phone: string, name?: string): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/customer/login-otp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, name })
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Lỗi gửi OTP')
      }
      return await response.json()
    } catch (error) {
      throw error
    }
  },

  async verifyLoginOtp(phone: string, code: string): Promise<LoginResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/customer/login-otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code })
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'OTP không hợp lệ')
      }
      
      const data = await response.json()
      
      // Store tokens and set up session
      await AsyncStorage.setItem(TOKEN_KEY, data.accessToken)
      if (data.refreshToken) {
        await AsyncStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken)
      }

      const user: User = {
        id: data.user.id,
        firstName: data.user.firstName,
        lastName: data.user.lastName,
        email: data.user.email,
        phone: data.user.phone || phone,
        role: data.user.role || 'customer',
        avatar: data.user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.user.email}`,
        completedRides: data.user.completedRides || 0,
        averageRating: data.user.averageRating || 5,
        totalSpent: data.user.totalSpent || 0,
        savedAddresses: data.user.savedAddresses || [],
        dateOfBirth: data.user.dateOfBirth,
        preferredDriverGender: data.user.preferredDriverGender,
        isPhoneVerified: data.user.isPhoneVerified,
      }

      await AsyncStorage.setItem(USER_KEY, JSON.stringify(user))

      // Register push token
      registerPushToken().catch(e =>
        console.warn('[Auth] Push token registration failed:', e.message)
      )

      return {
        token: data.accessToken,
        user,
      }
    } catch (error) {
      throw error
    }
  },
}