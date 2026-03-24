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
// - Android Emulator: use 10.0.2.2
// - iOS Simulator: use 127.0.0.1 or localhost
// - Physical Device: use your machine's IP (192.168.x.x)
// Set REACT_APP_API_URL in .env file
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://api.firego.vn/api'

// API timeout in milliseconds (30 seconds for physical devices)
export const API_TIMEOUT = 30000
