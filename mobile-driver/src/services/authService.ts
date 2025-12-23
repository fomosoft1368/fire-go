import axios from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'

const API_URL = 'http://localhost:3000/api' // Đổi thành URL backend của bạn

// Mock data cho testing khi chưa có backend
const MOCK_CREDENTIALS = {
  admin: 'Admin@123',
}

const MOCK_USER = {
  id: 'admin-001',
  name: 'Quản trị viên',
  email: 'admin@datxe.com',
  phone: '0900000000',
  role: 'admin',
  avatar: 'https://i.pravatar.cc/150?img=1',
}

const generateMockToken = () => {
  return `mock_token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

const login = async (email: string, password: string) => {
  try {
    // Mock login - kiểm tra credentials
    if (email === 'admin' || email === 'admin@datxe.com') {
      if (password === MOCK_CREDENTIALS.admin) {
        const mockToken = generateMockToken()
        await AsyncStorage.setItem('token', mockToken)
        
        return {
          token: mockToken,
          user: MOCK_USER,
        }
      } else {
        throw new Error('Mật khẩu không đúng. Vui lòng nhập: Admin@123')
      }
    } else {
      throw new Error('Tài khoản không tồn tại. Vui lòng nhập: admin')
    }

    // Uncomment khi backend sẵn sàng
    /*
    const response = await axios.post(`${API_URL}/auth/login`, {
      email,
      password,
    })
    if (response.data.token) {
      await AsyncStorage.setItem('token', response.data.token)
    }
    return response.data
    */
  } catch (error) {
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
    if (response.data.token) {
      await AsyncStorage.setItem('token', response.data.token)
    }
    return response.data
  } catch (error) {
    throw error
  }
}

const registerDriver = async (driverData: any) => {
  try {
    // Step 1: Register user account
    const registerResponse = await axios.post(`${API_URL}/auth/register`, {
      email: driverData.email,
      password: driverData.password,
      phone: driverData.phone,
      name: driverData.fullName,
    })

    const token = registerResponse.data.token
    const userId = registerResponse.data.user.id

    if (token) {
      await AsyncStorage.setItem('token', token)
    }

    // Step 2: Create driver profile
    const driverResponse = await axios.post(
      `${API_URL}/drivers`,
      {
        vehicleModel: driverData.vehicleModel,
        vehicleColor: driverData.vehicleColor,
        vehiclePlate: driverData.vehiclePlate,
        vehicleLicense: driverData.vehicleLicense,
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
    
    // Mock getCurrentUser
    if (token.startsWith('mock_token_')) {
      return MOCK_USER
    }

    const response = await axios.get(`${API_URL}/auth/me`, {
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
