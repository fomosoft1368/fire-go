import { StyleSheet } from 'react-native'
import { COLORS, SPACING } from '../constants'

/**
 * Typography Utilities
 * Helper functions and style combinations for text
 */

/**
 * Get heading style with optional color override
 */
export const getHeadingStyle = (level: 1 | 2 | 3 | 4 | 5 | 6, color?: string) => {
  const headings = {
    1: { fontSize: 32, fontWeight: '800' as const, letterSpacing: -0.8 },
    2: { fontSize: 28, fontWeight: '800' as const, letterSpacing: -0.6 },
    3: { fontSize: 24, fontWeight: '800' as const, letterSpacing: -0.5 },
    4: { fontSize: 20, fontWeight: '800' as const, letterSpacing: -0.4 },
    5: { fontSize: 18, fontWeight: '700' as const, letterSpacing: -0.3 },
    6: { fontSize: 16, fontWeight: '700' as const, letterSpacing: -0.2 },
  }
  
  return {
    ...headings[level],
    color: color || COLORS.text,
  }
}

/**
 * Get body text style with options
 */
export interface TextOptions {
  color?: string
  weight?: '400' | '500' | '600' | '700' | '800'
  size?: number
  lineHeight?: number
}

export const getBodyStyle = (options?: TextOptions) => {
  return {
    fontSize: options?.size || 14,
    fontWeight: (options?.weight || '400') as '400' | '500' | '600' | '700' | '800',
    color: options?.color || COLORS.text,
    lineHeight: options?.lineHeight || 20,
  }
}

/**
 * Get caption/small text style
 */
export const getCaptionStyle = (options?: TextOptions) => {
  return {
    fontSize: options?.size || 12,
    fontWeight: (options?.weight || '500') as '400' | '500' | '600' | '700' | '800',
    color: options?.color || COLORS.textSecondary,
    lineHeight: options?.lineHeight || 16,
  }
}

/**
 * Predefined text style combinations
 */
export const textStyles = StyleSheet.create({
  // Headings
  h1Bold: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.8,
    color: COLORS.text,
  },
  h2Bold: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.6,
    color: COLORS.text,
  },
  h3Bold: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: COLORS.text,
  },
  h4Bold: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
    color: COLORS.text,
  },

  // Body variations
  bodyRegular: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.text,
    lineHeight: 20,
  },
  bodyMedium: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
    lineHeight: 20,
  },
  bodySemibold: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    lineHeight: 20,
  },
  bodyBold: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    lineHeight: 20,
  },

  // Secondary text
  secondary: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  secondarySmall: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textSecondary,
    lineHeight: 16,
  },

  // Captions
  caption: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  captionBold: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
    lineHeight: 16,
  },

  // Small / Minimal
  small: {
    fontSize: 11,
    fontWeight: '400',
    color: COLORS.textSecondary,
  },
  smallBold: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.text,
  },

  // Label/Input text
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  labelSmall: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },

  // Button text
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  buttonTextSmall: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },

  // Status/Badge text
  badge: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
  },
  badgeSmall: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.text,
  },

  // Price/Highlight
  price: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },
  priceLarge: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.primary,
  },
  priceSmall: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },

  // Error/Danger text
  error: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.danger,
  },
  errorBold: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.danger,
  },

  // Success text
  success: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.success,
  },

  // Warning text
  warning: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.warning,
  },
})

/**
 * Create text style with custom values
 */
export const createTextStyle = (
  size: number,
  weight: '400' | '500' | '600' | '700' | '800',
  color: string,
  lineHeight?: number,
) => {
  return {
    fontSize: size,
    fontWeight: weight,
    color,
    lineHeight: lineHeight || size * 1.4,
  }
}

/**
 * Truncate text utilities
 */
export const truncateStyles = StyleSheet.create({
  truncateLine: {
    overflow: 'hidden',
  },
  truncateLines2: {
    overflow: 'hidden',
  },
})

export default textStyles
