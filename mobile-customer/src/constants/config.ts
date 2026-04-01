export const APP_NAME = 'Đặt Xe'
export const APP_VERSION = '1.0.0'

export const ANIMATION_DURATION = 300
export const DEBOUNCE_DELAY = 500

export const DEFAULT_FONT_FAMILY = {
  regular: 'System',
  bold: 'System',
}

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const

export const BORDER_RADIUS = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  full: 9999,
} as const

export const FONT_SIZES = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
} as const

// API Configuration
// 🌐 Tự động lấy IP từ Expo Metro (không cần sửa khi đổi mạng WiFi)
// - Dev: dùng cùng IP với Expo Metro server (exp://192.168.x.x:8081)
// - Production: trỏ về API server thật
const getApiBaseUrl = (): string => {
  if (__DEV__) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Constants = require('expo-constants').default
      // hostUri = '192.168.1.12:8081' (IP hiện tại của máy chạy Expo Metro)
      const hostUri: string | undefined = Constants.expoConfig?.hostUri
      if (hostUri) {
        const host = hostUri.split(':')[0] // Lấy IP, bỏ phần port
        console.log('[Config] 📱 Auto-detected backend host:', host)
        return `http://${host}:3000/api`
      }
    } catch (e) {
      console.warn('[Config] expo-constants not available:', e)
    }
  }
  return 'https://api.firego.vn/api' // Production fallback
}

export const API_BASE_URL = getApiBaseUrl()

// ====== Agora Voice Call Config ======
// ❗ Tạo tài khoản tại https://console.agora.io, tạo project, dán App ID vào đây
export const AGORA_APP_ID = process.env.REACT_APP_AGORA_APP_ID || '21478a4dfe134ebd8adfe7bbac134541'

// API timeout in milliseconds (30 seconds for physical devices)
export const API_TIMEOUT = 30000
