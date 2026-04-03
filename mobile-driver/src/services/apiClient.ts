/**
 * Axios instance dùng chung cho toàn app driver.
 * QUAN TRỌNG: File này cũng patch axios GLOBAL để bắt 401 từ MỌI service.
 */
import axios from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { API_BASE_URL } from '../constants/config'

// ─── Shared logout callback ───────────────────────────────────────────────────
type LogoutCallback = () => void
let onUnauthorized: LogoutCallback | null = null

export function registerUnauthorizedHandler(cb: LogoutCallback) {
  onUnauthorized = cb
  console.log('[apiClient] ✅ Driver unauthorized handler registered')
}

async function handle401() {
  console.warn('[apiClient] 🔒 401 Unauthorized — xóa token driver và logout...')
  await AsyncStorage.multiRemove(['token', 'refreshToken'])
  if (onUnauthorized) {
    onUnauthorized()
  }
}

// ─── apiClient instance ───────────────────────────────────────────────────────
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
})

apiClient.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token')
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
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error?.response?.status === 401) {
      const url: string = error?.config?.url || ''
      const isAuthEndpoint = url.includes('/login') || url.includes('/register') || url.includes('/auth/')
      if (!isAuthEndpoint) {
        await handle401()
      }
    }
    return Promise.reject(error)
  },
)
