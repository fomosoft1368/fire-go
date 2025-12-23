import AsyncStorage from '@react-native-async-storage/async-storage'
import type { User, LoginResponse, ApiResponse } from '../types'

const API_BASE_URL = 'http://localhost:3000/api'
const TOKEN_KEY = 'authToken'

// Mock credentials for testing without backend
const MOCK_CREDENTIALS = {
  phone: '0987100748',
  password: '123456789',
}

const MOCK_USER: User = {
  id: 'cust_001',
  name: 'Khách hàng',
  email: 'customer@gmail.com',
  phone: '0987100748',
  role: 'customer',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=customer1',
  rating: 4.8,
}

export const authService = {
  // Login with phone and password
  async login(phone: string, password: string): Promise<LoginResponse> {
    try {
      // Mock login - replace with real API when backend ready
      if (phone === MOCK_CREDENTIALS.phone && password === MOCK_CREDENTIALS.password) {
        const response: LoginResponse = {
          token: 'mock_token_customer_' + Date.now(),
          user: MOCK_USER,
        }
        await AsyncStorage.setItem(TOKEN_KEY, response.token)
        await AsyncStorage.setItem('user', JSON.stringify(response.user))
        return response
      }

      throw new Error('Invalid phone or password')

      // Real API call (uncomment when backend ready):
      // const response = await fetch(`${API_BASE_URL}/auth/login`, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({ phone, password }),
      // })
      //
      // if (!response.ok) {
      //   throw new Error('Login failed')
      // }
      //
      // const data: ApiResponse<LoginResponse> = await response.json()
      // if (data.success) {
      //   await AsyncStorage.setItem(TOKEN_KEY, data.data.token)
      //   await AsyncStorage.setItem('user', JSON.stringify(data.data.user))
      //   return data.data
      // } else {
      //   throw new Error(data.message || 'Login failed')
      // }
    } catch (error) {
      throw error
    }
  },

  async register(
    name: string,
    email: string,
    phone: string,
    password: string
  ): Promise<LoginResponse> {
    try {
      // Mock register
      const newUser: User = {
        id: 'cust_' + Date.now(),
        name,
        email,
        phone,
        role: 'customer',
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
        rating: 5,
      }

      const response: LoginResponse = {
        token: 'mock_token_customer_' + Date.now(),
        user: newUser,
      }

      await AsyncStorage.setItem(TOKEN_KEY, response.token)
      await AsyncStorage.setItem('user', JSON.stringify(response.user))
      return response

      // Real API call (uncomment when backend ready):
      // const response = await fetch(`${API_BASE_URL}/auth/register`, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({ name, email, phone, password }),
      // })
      //
      // const data: ApiResponse<LoginResponse> = await response.json()
      // if (data.success) {
      //   await AsyncStorage.setItem(TOKEN_KEY, data.data.token)
      //   await AsyncStorage.setItem('user', JSON.stringify(data.data.user))
      //   return data.data
      // } else {
      //   throw new Error(data.message || 'Registration failed')
      // }
    } catch (error) {
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
