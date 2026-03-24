import { Dimensions, Platform, StyleSheet } from 'react-native'
import { SPACING } from '../constants'

/**
 * Responsive & Spacing Utilities
 * Device-aware and responsive style helpers
 */

// ============================================================================
// DEVICE DIMENSIONS & BREAKPOINTS
// ============================================================================

const { width: screenWidth, height: screenHeight } = Dimensions.get('window')

export const SCREEN_WIDTH = screenWidth
export const SCREEN_HEIGHT = screenHeight

/**
 * Breakpoints for responsive design
 * Small: < 375px (iPhoneSE)
 * Medium: 375-480px (iPhone)
 * Large: > 480px (iPhone Plus, Samsung)
 */
export const BREAKPOINTS = {
  small: 375,
  medium: 480,
  large: 9999,
} as const

export const isSmallScreen = screenWidth < BREAKPOINTS.small
export const isMediumScreen = screenWidth >= BREAKPOINTS.small && screenWidth < BREAKPOINTS.medium
export const isLargeScreen = screenWidth >= BREAKPOINTS.medium

export const isTablet = screenWidth >= 768

// ============================================================================
// RESPONSIVE HELPERS
// ============================================================================

/**
 * Get responsive width percentage
 */
export const getResponsiveWidth = (percentage: number) => {
  return (screenWidth * percentage) / 100
}

/**
 * Get responsive height percentage
 */
export const getResponsiveHeight = (percentage: number) => {
  return (screenHeight * percentage) / 100
}

/**
 * Scale value based on screen size
 */
export const scale = (value: number) => {
  const standardScreenWidth = 375
  return (screenWidth / standardScreenWidth) * value
}

/**
 * Get responsive font size
 */
export const getResponsiveFontSize = (baseSize: number) => {
  return Math.round(scale(baseSize))
}

/**
 * Get responsive spacing based on screen size
 */
export const getResponsiveSpacing = (baseSpacing: number) => {
  if (isSmallScreen) return Math.round(baseSpacing * 0.8)
  if (isLargeScreen) return Math.round(baseSpacing * 1.1)
  return baseSpacing
}

// ============================================================================
// RESPONSIVE STYLE GENERATORS
// ============================================================================

/**
 * Get responsive padding
 */
export const getResponsivePadding = (
  small?: number,
  medium?: number,
  large?: number,
) => {
  if (isSmallScreen) return small || SPACING.md
  if (isLargeScreen) return large || SPACING.xl
  return medium || SPACING.lg
}

/**
 * Get responsive margin
 */
export const getResponsiveMargin = (
  small?: number,
  medium?: number,
  large?: number,
) => {
  if (isSmallScreen) return small || SPACING.md
  if (isLargeScreen) return large || SPACING.xl
  return medium || SPACING.lg
}

/**
 * Get responsive font size
 */
export const getResponsiveFont = (
  small?: number,
  medium?: number,
  large?: number,
) => {
  if (isSmallScreen) return small || 12
  if (isLargeScreen) return large || 16
  return medium || 14
}

// ============================================================================
// RESPONSIVE STYLES
// ============================================================================

export const responsiveStyles = StyleSheet.create({
  // Container variants
  containerTight: {
    paddingHorizontal: getResponsivePadding(SPACING.sm, SPACING.md, SPACING.lg),
  },
  containerNormal: {
    paddingHorizontal: getResponsivePadding(SPACING.md, SPACING.lg, SPACING.lg),
  },
  containerLoose: {
    paddingHorizontal: getResponsivePadding(SPACING.lg, SPACING.xl, SPACING.xl),
  },

  // Text sizes
  textSmall: {
    fontSize: getResponsiveFontSize(11),
  },
  textBase: {
    fontSize: getResponsiveFontSize(14),
  },
  textLarge: {
    fontSize: getResponsiveFontSize(16),
  },
  textXLarge: {
    fontSize: getResponsiveFontSize(20),
  },

  // Full width
  fullWidth: {
    width: '100%',
  },
  fullHeight: {
    height: '100%',
  },

  // Half width (for two-column layouts)
  halfWidth: {
    width: screenWidth / 2 - SPACING.md,
  },

  // Grid layouts
  thirdWidth: {
    width: screenWidth / 3 - SPACING.md,
  },
})

// ============================================================================
// GRID & LAYOUT UTILITIES
// ============================================================================

/**
 * Get grid column width
 */
export const getGridColumnWidth = (columns: number, gap: number = SPACING.md) => {
  const totalGapWidth = gap * (columns - 1)
  const availableWidth = screenWidth - SPACING.lg * 2 - totalGapWidth
  return availableWidth / columns
}

/**
 * Create responsive grid styles
 */
export const createGridStyles = (columns: number, gap: number = SPACING.md) => {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap,
      paddingHorizontal: SPACING.lg,
    },
    item: {
      width: getGridColumnWidth(columns, gap),
      justifyContent: 'flex-start',
    },
  })
}

// ============================================================================
// PLATFORM-SPECIFIC UTILITIES
// ============================================================================

export const isAndroid = Platform.OS === 'android'
export const isIOS = Platform.OS === 'ios'
export const isWeb = Platform.OS === 'web'

/**
 * Get platform-specific styles
 */
export const getPlatformStyle = (android?: any, ios?: any, defaultStyle?: any) => {
  if (isAndroid) return android || defaultStyle
  if (isIOS) return ios || defaultStyle
  return defaultStyle
}

/**
 * Platform-specific style adjustments
 */
export const platformStyles = StyleSheet.create({
  androidOnly: {
    ...Platform.select({
      android: { display: 'flex' },
      default: { display: 'none' },
    }),
  },
  iosOnly: {
    ...Platform.select({
      ios: { display: 'flex' },
      default: { display: 'none' },
    }),
  },
  // Status bar height adjustment
  statusBarSpacing: {
    ...Platform.select({
      android: { paddingTop: 0 },
      ios: { paddingTop: 12 },
    }),
  },
})

// ============================================================================
// SAFE AREA & NOTCH UTILITIES
// ============================================================================

/**
 * Get top inset (safe area + status bar)
 * Typically 44px on notched iPhones, 20px on regular phones
 */
export const getSafeAreaTop = () => {
  return isSmallScreen ? SPACING.lg : SPACING.xl
}

/**
 * Get bottom inset (safe area for notch)
 * Typically 20-34px on iPhones with home indicator
 */
export const getSafeAreaBottom = () => {
  return isSmallScreen ? SPACING.md : SPACING.lg
}

// ============================================================================
// ADAPTIVE STYLES
// ============================================================================

/**
 * Create adaptive button style
 */
export const getAdaptiveButtonPadding = () => {
  return {
    paddingVertical: isSmallScreen ? SPACING.sm : SPACING.md,
    paddingHorizontal: isSmallScreen ? SPACING.md : SPACING.lg,
  }
}

/**
 * Create adaptive card padding
 */
export const getAdaptiveCardPadding = () => {
  return {
    padding: getResponsivePadding(SPACING.sm, SPACING.md, SPACING.lg),
  }
}

/**
 * Create adaptive modal width
 */
export const getAdaptiveModalWidth = () => {
  if (isTablet) return screenWidth * 0.6
  if (isLargeScreen) return screenWidth * 0.8
  if (isMediumScreen) return screenWidth * 0.9
  return screenWidth * 0.95
}

// ============================================================================
// KEYBOARD & INPUT RESPONSIVE
// ============================================================================

/**
 * Get keyboard-aware bottom padding
 * Use in modal/sheet components that need to push above keyboard
 */
export const getKeyboardAvoidingViewPadding = (baseValue: number = 0) => {
  return baseValue + (isSmallScreen ? SPACING.md : SPACING.lg)
}

// ============================================================================
// EXPORTED UTILITIES OBJECT
// ============================================================================

export const responsiveUtils = {
  // Screen dimensions
  screenWidth: SCREEN_WIDTH,
  screenHeight: SCREEN_HEIGHT,
  isSmallScreen,
  isMediumScreen,
  isLargeScreen,
  isTablet,

  // Helpers
  scale,
  getResponsiveWidth,
  getResponsiveHeight,
  getResponsiveFontSize,
  getResponsiveSpacing,
  getResponsivePadding,
  getResponsiveMargin,
  getResponsiveFont,
  getGridColumnWidth,
  createGridStyles,
  getAdaptiveButtonPadding,
  getAdaptiveCardPadding,
  getAdaptiveModalWidth,

  // Platform
  isAndroid,
  isIOS,
  isWeb,
  getPlatformStyle,

  // Safe areas
  getSafeAreaTop,
  getSafeAreaBottom,
}

export default responsiveUtils
