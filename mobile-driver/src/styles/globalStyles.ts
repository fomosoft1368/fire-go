import { StyleSheet } from 'react-native'
import { COLORS, SPACING, BORDER_RADIUS } from '../constants'

/**
 * Global Styles for mobile-driver
 * Contains reusable style patterns used across screens and components
 */

// ============================================================================
// SCREEN & CONTAINER STYLES
// ============================================================================

export const screenStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.lightBg,
  },
  containerDark: {
    flex: 1,
    backgroundColor: COLORS.darkBg,
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: SPACING.lg,
  },
})

// ============================================================================
// HEADER STYLES
// ============================================================================

export const headerStyles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.lightBg,
    paddingTop: SPACING.xl,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  headerDark: {
    backgroundColor: COLORS.darkBg,
    borderBottomColor: COLORS.darkBorder,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  headerTitleDark: {
    color: COLORS.lightBg,
  },
  headerSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginBottom: SPACING.xs,
    letterSpacing: -0.2,
  },
})

// ============================================================================
// BUTTON STYLES
// ============================================================================

export const buttonStyles = StyleSheet.create({
  // Primary Button
  buttonPrimary: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonPrimaryText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },

  // Secondary Button
  buttonSecondary: {
    backgroundColor: COLORS.lightCard,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.lightBorder,
  },
  buttonSecondaryText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },

  // Danger Button
  buttonDanger: {
    backgroundColor: COLORS.danger,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDangerText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },

  // Success Button
  buttonSuccess: {
    backgroundColor: COLORS.success,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSuccessText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },

  // Small Button
  buttonSmall: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Large Button (Full width)
  buttonLarge: {
    paddingVertical: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Icon Button
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
})

// ============================================================================
// CARD STYLES
// ============================================================================

export const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.lightCard,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardDark: {
    backgroundColor: COLORS.darkCard,
  },
  cardWhite: {
    backgroundColor: '#fff',
  },
  cardBordered: {
    borderWidth: 1,
    borderColor: COLORS.lightBorder,
  },
  cardBorderedDark: {
    borderColor: COLORS.darkBorder,
  },
  cardHighlight: {
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  cardContent: {
    flex: 1,
  },
})

// ============================================================================
// FORM & INPUT STYLES
// ============================================================================

export const formStyles = StyleSheet.create({
  formGroup: {
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  labelDark: {
    color: COLORS.lightBg,
  },
  inputBase: {
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    fontSize: 14,
    color: COLORS.text,
    backgroundColor: COLORS.lightCard,
    borderWidth: 1,
    borderColor: COLORS.lightBorder,
  },
  inputDark: {
    backgroundColor: COLORS.darkCard,
    borderColor: COLORS.darkBorder,
    color: COLORS.lightBg,
  },
  inputError: {
    borderColor: COLORS.danger,
  },
  inputSuccess: {
    borderColor: COLORS.success,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.danger,
    marginTop: SPACING.xs,
  },
  helpText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
})

// ============================================================================
// TYPOGRAPHY STYLES
// ============================================================================

export const typographyStyles = StyleSheet.create({
  h1: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.8,
  },
  h2: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.6,
  },
  h3: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  h4: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.4,
  },
  h5: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: -0.3,
  },
  h6: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: -0.2,
  },
  body: {
    fontSize: 14,
    fontWeight: '400',
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
  small: {
    fontSize: 11,
    fontWeight: '400',
    color: COLORS.textSecondary,
  },
})

// ============================================================================
// FLEX & LAYOUT UTILITIES
// ============================================================================

export const layoutStyles = StyleSheet.create({
  // Flex utilities
  flexCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  flexBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  flexAround: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  flexEvenly: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
  },
  flexStart: {
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
  },
  flexEnd: {
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
  },

  // Row & Column
  row: {
    flexDirection: 'row',
  },
  rowCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  column: {
    flexDirection: 'column',
  },
  columnCenter: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Gap utilities  
  gap4: { gap: SPACING.xs },
  gap8: { gap: SPACING.sm },
  gap12: { gap: SPACING.md },
  gap16: { gap: SPACING.lg },
  gap24: { gap: SPACING.xl },
  gap32: { gap: SPACING.xxl },

  // Padding utilities
  p4: { padding: SPACING.xs },
  p8: { padding: SPACING.sm },
  p12: { padding: SPACING.md },
  p16: { padding: SPACING.lg },
  p24: { padding: SPACING.xl },

  // Margin utilities
  m4: { margin: SPACING.xs },
  m8: { margin: SPACING.sm },
  m12: { margin: SPACING.md },
  m16: { margin: SPACING.lg },
  m24: { margin: SPACING.xl },
})

// ============================================================================
// SHADOW STYLES
// ============================================================================

export const shadowStyles = StyleSheet.create({
  shadowSmall: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  shadowMedium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  shadowLarge: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  shadowPrimary: {
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  shadowDanger: {
    shadowColor: COLORS.danger,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
})

// ============================================================================
// BORDER STYLES
// ============================================================================

export const borderStyles = StyleSheet.create({
  borderThin: {
    borderWidth: 1,
    borderColor: COLORS.lightBorder,
  },
  borderMedium: {
    borderWidth: 2,
    borderColor: COLORS.lightBorder,
  },
  borderThick: {
    borderWidth: 3,
    borderColor: COLORS.lightBorder,
  },
  borderPrimary: {
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  borderDanger: {
    borderWidth: 2,
    borderColor: COLORS.danger,
  },
  borderSuccess: {
    borderWidth: 2,
    borderColor: COLORS.success,
  },
  borderTop: {
    borderTopWidth: 1,
    borderTopColor: COLORS.lightBorder,
  },
  borderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightBorder,
  },
  borderLeft: {
    borderLeftWidth: 2,
    borderLeftColor: COLORS.primary,
  },
  borderRadius4: {
    borderRadius: BORDER_RADIUS.sm,
  },
  borderRadius8: {
    borderRadius: BORDER_RADIUS.md,
  },
  borderRadius12: {
    borderRadius: BORDER_RADIUS.lg,
  },
  borderRadius16: {
    borderRadius: BORDER_RADIUS.xl,
  },
  borderRadiusFull: {
    borderRadius: BORDER_RADIUS.full,
  },
})

// ============================================================================
// STATUS & BADGE STYLES
// ============================================================================

export const statusStyles = StyleSheet.create({
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.full,
    gap: SPACING.xs,
  },
  statusActive: {
    backgroundColor: '#d1fae5',
  },
  statusInactive: {
    backgroundColor: '#fee2e2',
  },
  statusPending: {
    backgroundColor: '#fef3c7',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusDotActive: {
    backgroundColor: COLORS.success,
  },
  statusDotInactive: {
    backgroundColor: COLORS.danger,
  },
  statusDotPending: {
    backgroundColor: COLORS.warning,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0f172a',
  },
  badge: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgePrimary: {
    backgroundColor: COLORS.primaryLight,
  },
  badgeSuccess: {
    backgroundColor: '#d1fae5',
  },
  badgeWarning: {
    backgroundColor: '#fef3c7',
  },
  badgeDanger: {
    backgroundColor: '#fee2e2',
  },
})

// ============================================================================
// AVATAR & IMAGE STYLES
// ============================================================================

export const avatarStyles = StyleSheet.create({
  avatarBase: {
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarMedium: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarLarge: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  avatarXLarge: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  avatarBorder: {
    borderWidth: 3,
    borderColor: '#fff',
  },
  avatarBorderPrimary: {
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
})

// ============================================================================
// DIVIDER & SEPARATOR STYLES
// ============================================================================

export const dividerStyles = StyleSheet.create({
  divider: {
    height: 1,
    backgroundColor: COLORS.lightBorder,
    marginVertical: SPACING.md,
  },
  dividerDark: {
    backgroundColor: COLORS.darkBorder,
  },
  dividerThick: {
    height: 2,
  },
  dividerHorizontal: {
    height: 1,
    backgroundColor: COLORS.lightBorder,
  },
})

// ============================================================================
// MODAL & OVERLAY STYLES
// ============================================================================

export const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: COLORS.lightBg,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  modalHeader: {
    marginBottom: SPACING.lg,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
})

// ============================================================================
// SPACING UTILITIES
// ============================================================================

export const spacingStyles = StyleSheet.create({
  // Horizontal spacing
  sp4: { marginHorizontal: SPACING.xs },
  sp8: { marginHorizontal: SPACING.sm },
  sp12: { marginHorizontal: SPACING.md },
  sp16: { marginHorizontal: SPACING.lg },
  sp24: { marginHorizontal: SPACING.xl },

  // Vertical spacing
  mt4: { marginTop: SPACING.xs },
  mt8: { marginTop: SPACING.sm },
  mt12: { marginTop: SPACING.md },
  mt16: { marginTop: SPACING.lg },
  mt24: { marginTop: SPACING.xl },

  mb4: { marginBottom: SPACING.xs },
  mb8: { marginBottom: SPACING.sm },
  mb12: { marginBottom: SPACING.md },
  mb16: { marginBottom: SPACING.lg },
  mb24: { marginBottom: SPACING.xl },

  // Padding
  pt4: { paddingTop: SPACING.xs },
  pt8: { paddingTop: SPACING.sm },
  pt12: { paddingTop: SPACING.md },
  pt16: { paddingTop: SPACING.lg },
  pt24: { paddingTop: SPACING.xl },

  pb4: { paddingBottom: SPACING.xs },
  pb8: { paddingBottom: SPACING.sm },
  pb12: { paddingBottom: SPACING.md },
  pb16: { paddingBottom: SPACING.lg },
  pb24: { paddingBottom: SPACING.xl },
})

// ============================================================================
// DEFAULT EXPORTS
// ============================================================================

export const globalStyles = {
  ...screenStyles,
  ...headerStyles,
  ...buttonStyles,
  ...cardStyles,
  ...formStyles,
  ...typographyStyles,
  ...layoutStyles,
  ...shadowStyles,
  ...borderStyles,
  ...statusStyles,
  ...avatarStyles,
  ...dividerStyles,
  ...modalStyles,
  ...spacingStyles,
}

export default globalStyles
