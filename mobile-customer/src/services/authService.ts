import AsyncStorage from '@react-native-async-storage/async-storage'
import type { User, LoginResponse, ApiResponse } from '../types'

// Update API_BASE_URL to your backend URL (use 10.0.2.2 for Android emulator, localhost for iOS)
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://192.168.1.19:3000/api'
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
      console.log('[Auth] Login attempt:', { identifier, apiUrl: API_BASE_URL })
      
      const response = await fetch(`${API_BASE_URL}/customers/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ identifier, password }),
      })

      console.log('[Auth] Login response status:', response.status)

      if (!response.ok) {
        let errorData: any
        try {
          errorData = await response.json()
        } catch {
          errorData = { message: `HTTP ${response.status}` }
        }
        console.error('[Auth] Login error:', errorData)
        throw new Error(errorData.message || 'Đăng nhập thất bại')
      }

      const data = await response.json()
      console.log('[Auth] Login success:', { userId: data.user.id })

      // Store tokens and user info
      await AsyncStorage.setItem(TOKEN_KEY, data.accessToken)
      await AsyncStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken)
      
      const user: User = {
        id: data.user.id,
        name: `${data.user.firstName} ${data.user.lastName}`,
        email: data.user.email,
        phone: data.user.phone || '',
        role: data.user.role,
        avatar: data.user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.user.email}`,
        rating: data.user.rating || 5,
      }
      
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(user))

      return {
        token: data.accessToken,
        user,
      }
    } catch (error: any) {
      console.error('[Auth] Login failed:', error.message || error)
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
        name: `${data.user.firstName} ${data.user.lastName}`,
        email: data.user.email,
        phone: data.user.phone || '',
        role: data.user.role,
        avatar: data.user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.user.email}`,
        rating: data.user.rating || 5,
      }

      await AsyncStorage.setItem(USER_KEY, JSON.stringify(user))

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
      await AsyncStorage.removeItem(TOKEN_KEY)
      await AsyncStorage.removeItem('user')
    } catch (error) {
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
}
