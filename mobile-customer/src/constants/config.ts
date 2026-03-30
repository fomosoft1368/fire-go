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
// 🌐 Đọc từ .env file: REACT_APP_API_URL=http://<YOUR_LAN_IP>:3000/api
// - Android Emulator: REACT_APP_API_URL=http://10.0.2.2:3000/api
// - iOS Simulator: REACT_APP_API_URL=http://localhost:3000/api
// - Physical Device: REACT_APP_API_URL=http://<YOUR_LAN_IP>:3000/api
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api'

// ====== Agora Voice Call Config ======
// ❗ Tạo tài khoản tại https://console.agora.io, tạo project, dán App ID vào đây
export const AGORA_APP_ID = process.env.REACT_APP_AGORA_APP_ID || '21478a4dfe134ebd8adfe7bbac134541'

// API timeout in milliseconds (30 seconds for physical devices)
export const API_TIMEOUT = 30000
