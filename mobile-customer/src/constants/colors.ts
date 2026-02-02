// Dark Mode Colors (Mặc định)
export const COLORS_DARK = {
  // Primary
  primary: '#FF6B00',
  primaryLight: '#FF6B0020',

  // Dark theme
  bg: '#0f172a',
  bgSecondary: '#1a202c',
  background: '#0f172a',
  border: 'rgba(255, 255, 255, 0.05)',
  borderLight: 'rgba(255, 255, 255, 0.1)',

  // Text
  text: '#ffffff',
  textSecondary: '#94a3b8',

  // Status
  success: '#4caf50',
  danger: '#ef4444',
  error: '#ef4444',
  warning: '#ffc107',

  // Semantic
  online: '#4caf50',
  offline: '#ef4444',
} as const

// Light Mode Colors
export const COLORS_LIGHT = {
  // Primary
  primary: '#FF6B00',
  primaryLight: '#FF6B0020',

  // Light theme
  bg: '#ffffff',
  bgSecondary: '#f5f5f5',
  background: '#ffffff',
  border: 'rgba(0, 0, 0, 0.05)',
  borderLight: 'rgba(0, 0, 0, 0.1)',

  // Text
  text: '#1a202c',
  textSecondary: '#64748b',

  // Status
  success: '#4caf50',
  danger: '#ef4444',
  error: '#ef4444',
  warning: '#ffc107',

  // Semantic
  online: '#4caf50',
  offline: '#ef4444',
} as const

// Default to Dark Mode
export const COLORS = COLORS_DARK as typeof COLORS_DARK

export type ThemeType = 'dark' | 'light'
