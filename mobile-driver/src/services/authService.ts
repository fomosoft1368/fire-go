import axios from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { API_BASE_URL } from '../constants/config'

const API_URL = API_BASE_URL

const login = async (email: string, password: string) => {
  try {
    const apiUrl = `${API_URL}/auth/login`
    console.log('\n========== 🔐 DRIVER LOGIN REQUEST START ==========')
    console.log('📍 API URL:', apiUrl)
    console.log('🌐 BASE_URL:', API_URL)
    console.log('👤 Email:', email)
    console.log('🔑 Password length:', password.length)
    console.log('📦 Request body:', JSON.stringify({ email, password: '***' }, null, 2))
    console.log('📅 Timestamp:', new Date().toISOString())
    console.log('🔧 Method: POST')
    console.log('📋 Headers:', JSON.stringify({ 'Content-Type': 'application/json' }, null, 2))
    console.log('==========================================\n')
    
    const response = await axios.post(apiUrl, {
      email,
      password,
    })

    console.log('\n========== ✅ DRIVER LOGIN SUCCESS ==========')
    console.log('📊 Status:', response.status)
    console.log('📋 Response headers:', JSON.stringify(response.headers, null, 2))
    console.log('📦 Response data keys:', Object.keys(response.data))
    console.log('👤 User:', response.data.user?.email || 'N/A')
    console.log('🎫 Token length:', response.data.accessToken?.length || 0)
    console.log('==========================================\n')

    if (response.data.accessToken) {
      await AsyncStorage.setItem('token', response.data.accessToken)
    }

    return response.data
  } catch (error: any) {
    console.error('\n========== ❌ DRIVER LOGIN ERROR ==========')
    console.error('🚨 Error type:', error.constructor.name)
    console.error('💬 Error message:', error.message)
    
    if (error.response) {
      // Server responded with error
      console.error('📊 Response status:', error.response.status)
      console.error('📋 Response headers:', JSON.stringify(error.response.headers, null, 2))
      console.error('💬 Response data:', JSON.stringify(error.response.data, null, 2))
    } else if (error.request) {
      // Request was made but no response
      console.error('📡 No response received')
      console.error('🔌 Request details:', {
        url: error.config?.url,
        method: error.config?.method,
        timeout: error.config?.timeout
      })
      console.error('🌐 Network error - možná server is down or unreachable')
    } else {
      // Something else happened
      console.error('⚠️ Unexpected error:', error.message)
    }
    
    console.error('📚 Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2))
    console.error('==========================================\n')
    throw error
  }
}

const register = async (email: string, password: string, name: string) => {
  try {
    const response = await axios.post(`${API_URL}/auth/register`, {
      email,
      password,
      name,
    })
    if (response.data.accessToken) {
      await AsyncStorage.setItem('token', response.data.accessToken)
    }
    return response.data
  } catch (error) {
    throw error
  }
}

const registerDriver = async (driverData: any) => {
  try {
    // Step 1: Register driver account
    const registerResponse = await axios.post(`${API_URL}/auth/register`, {
      email: driverData.email,
      password: driverData.password,
      phone: driverData.phone,
      firstName: driverData.firstName,
      lastName: driverData.lastName,
    })

    const token = registerResponse.data.accessToken
    const driverId = registerResponse.data.user.id

    if (token) {
      await AsyncStorage.setItem('token', token)
    }

    // Step 2: Update driver profile with vehicle info
    const driverResponse = await axios.patch(
      `${API_URL}/drivers/${driverId}`,
      {
        vehicleModel: driverData.vehicleModel,
        vehicleColor: driverData.vehicleColor,
        vehiclePlate: driverData.vehiclePlate,
        licenseNumber: driverData.licenseNumber,
        licenseExpiry: driverData.licenseExpiry,
        bankName: driverData.bankName || null,
        bankAccount: driverData.bankAccount || null,
        bankAccountHolder: driverData.bankAccountHolder || null,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    )

    return {
      token,
      user: registerResponse.data.user,
      driver: driverResponse.data,
    }
  } catch (error) {
    throw error
  }
}

const logout = async () => {
  await AsyncStorage.removeItem('token')
}

const getCurrentUser = async () => {
  try {
    const token = await AsyncStorage.getItem('token')
    if (!token) {
      return null
    }

    const response = await axios.get(`${API_URL}/auth/profile`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    return response.data
  } catch (error) {
    await AsyncStorage.removeItem('token')
    throw error
  }
}

const changePassword = async (currentPassword: string, newPassword: string) => {
  try {
    const token = await AsyncStorage.getItem('token')
    if (!token) {
      throw new Error('No authentication token found')
    }

    const response = await axios.post(
      `${API_URL}/auth/change-password`,
      {
        currentPassword,
        newPassword,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )
    return response.data
  } catch (error: any) {
    console.log('Change password error:', error.response?.data || error.message)
    throw error
  }
}

export { login, register, registerDriver, logout, getCurrentUser, changePassword }
