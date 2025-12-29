import axios from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'

const API_URL = 'http://192.168.1.19:3000/api'

const login = async (email: string, password: string) => {
  try {
    console.log('📱 Mobile - Login attempt with:', email)
    const response = await axios.post(`${API_URL}/auth/login`, {
      email,
      password,
    })

    console.log('📱 Mobile - Login response:', response.data)
    console.log('📱 Mobile - Access token:', response.data.accessToken)

    if (response.data.accessToken) {
      await AsyncStorage.setItem('token', response.data.accessToken)
    }

    return response.data
  } catch (error: any) {
    console.log('📱 Mobile - Login error status:', error.response?.status)
    console.log('📱 Mobile - Login error data:', error.response?.data)
    console.log('📱 Mobile - Login error message:', error.message)
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

export { login, register, registerDriver, logout, getCurrentUser }
