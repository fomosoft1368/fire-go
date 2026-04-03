/**
 * Axios instance dùng chung cho toàn app customer.
 * Tự động:
 *  - Gắn Authorization header từ AsyncStorage
 *  - Bắt lỗi 401 → logout + redirect về Login
 *
 * QUAN TRỌNG: File này cũng patch axios GLOBAL để bắt 401 từ MỌI service,
 * kể cả các service tạo axios.create() riêng (notificationService, messageService, etc.)
 */
import axios from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { API_BASE_URL } from '../constants'

// ─── Shared logout callback ───────────────────────────────────────────────────
type LogoutCallback = () => void
let onUnauthorized: LogoutCallback | null = null

export function registerUnauthorizedHandler(cb: LogoutCallback) {
  onUnauthorized = cb
  console.log('[apiClient] ✅ Unauthorized handler registered')
}

async function handle401() {
  console.warn('[apiClient] 🔒 401 Unauthorized — xóa token và logout...')
  await AsyncStorage.multiRemove(['authToken', 'refreshToken', 'user'])
  if (onUnauthorized) {
    onUnauthorized()
  }
}

// ─── apiClient instance (dùng trong các service mới) ─────────────────────────
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
})

apiClient.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('authToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error?.response?.status === 401) {
      await handle401()
    }
    return Promise.reject(error)
  },
)

// ─── GLOBAL axios interceptor — bắt 401 từ MỌI axios instance ────────────────
// Kể cả notificationService, messageService, authService, v.v. tạo axios.create() riêng
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error?.response?.status === 401) {
      // Tránh loop khi chính endpoint login trả 401 (sai password)
      const url: string = error?.config?.url || ''
      const isAuthEndpoint = url.includes('/login') || url.includes('/register') || url.includes('/auth/')
      if (!isAuthEndpoint) {
        await handle401()
      }
    }
    return Promise.reject(error)
  },
)
