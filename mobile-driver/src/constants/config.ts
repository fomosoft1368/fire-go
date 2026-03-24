export const APP_NAME = 'Driver App'
export const APP_VERSION = '1.0.0'

export const ANIMATION_DURATION = 300
export const DEBOUNCE_DELAY = 500

// API Configuration
// 🌐 Change this to your development machine IP address
// - Android Emulator: 10.0.2.2 (special alias)
// - iOS Simulator: 127.0.0.1 or localhost
// - Physical Device: Your machine's IP (192.168.x.x)
export const API_BASE_URL = 'http://192.168.1.16:3000/api'

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
