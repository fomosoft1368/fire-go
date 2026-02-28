// Dark Mode Colors (Mặc định)
export const COLORS_DARK = {
  // Primary
  primary: '#FF6B00',
  primaryLight: '#FF6B0020',

  // Dark theme
  bg: '#0f172a',
  bgSecondary: '#1a202c',
  background: '#faf9f9',
  card: '#f8f9fa',
  border: 'rgba(247, 144, 11, 0.05)',
  borderLight: 'rgba(255, 255, 255, 0.1)',
  borderhunt: 'rgba(247, 232, 21, 0.1)',

  // Text
  text: '#0e0d0d',
  textPrimary: '#131212',
  textSecondary: '#101111',

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
  bg: '#f0eded',
  bgSecondary: '#f5f5f5',
  background: '#ffffff',
  card: '#f8fafc',
  border: 'rgba(0, 0, 0, 0.05)',
  borderLight: 'rgba(0, 0, 0, 0.1)',

  // Text
  text: '#1a202c',
  textPrimary: '#1a202c',
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
