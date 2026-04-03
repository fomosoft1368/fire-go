export const APP_NAME = 'Driver App'
export const APP_VERSION = '1.0.0'

export const ANIMATION_DURATION = 300
export const DEBOUNCE_DELAY = 500

// API Configuration
// ✅ Đọc từ .env thông qua app.config.js → Constants.expoConfig.extra.apiUrl
// Để thay đổi URL: sửa REACT_APP_API_URL trong file .env rồi restart Metro
const getApiBaseUrl = (): string => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Constants = require('expo-constants').default
    const apiUrl: string | undefined = Constants.expoConfig?.extra?.apiUrl
    if (apiUrl) {
      console.log('[Config] ✅ API URL from .env:', apiUrl)
      return apiUrl
    }
  } catch (e) {
    console.warn('[Config] expo-constants not available:', e)
  }
  console.error('[Config] ❌ Không tìm thấy API URL! Kiểm tra REACT_APP_API_URL trong .env')
  return ''
}

export const API_BASE_URL = getApiBaseUrl()


// ====== Agora Voice Call Config ======
// ❗ Tạo tài khoản tại https://console.agora.io, tạo project, dán App ID vào đây
export const AGORA_APP_ID = process.env.REACT_APP_AGORA_APP_ID || '21478a4dfe134ebd8adfe7bbac134541'

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
  full: 9999,
} as const
