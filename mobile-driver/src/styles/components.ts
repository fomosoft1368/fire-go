import { StyleSheet } from 'react-native'
import { COLORS, SPACING, BORDER_RADIUS } from '../constants'

/**
 * Theme Utilities & Presets
 * Predefined style combinations for common UI patterns
 */

// ============================================================================
// COMPONENT PRESETS
// ============================================================================

/**
 * Ride Card Styles
 */
export const rideCardStyles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  locationSection: {
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  locationText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  timeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  timeText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
})

/**
 * List Item Styles
 */
export const listItemStyles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightBorder,
  },
  itemLast: {
    borderBottomWidth: 0,
  },
  itemSelected: {
    backgroundColor: COLORS.primaryLight,
  },
  itemDisabled: {
    opacity: 0.5,
  },
  icon: {
    marginRight: SPACING.md,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  action: {
    marginLeft: SPACING.md,
  },
})

/**
 * Modal Overlay Styles
 */
export const overlayStyles = StyleSheet.create({
  bottomSheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheetContent: {
    backgroundColor: COLORS.lightBg,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  centerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerModalContent: {
    backgroundColor: COLORS.lightBg,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
    marginHorizontal: SPACING.lg,
  },
})

/**
 * Toast/Notification Styles
 */
export const toastStyles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  success: {
    backgroundColor: '#d1fae5',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.success,
  },
  error: {
    backgroundColor: '#fee2e2',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.danger,
  },
  warning: {
    backgroundColor: '#fef3c7',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.warning,
  },
  info: {
    backgroundColor: '#dbeafe',
    borderLeftWidth: 4,
    borderLeftColor: '#0ea5e9',
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  textSuccess: {
    color: '#065f46',
  },
  textError: {
    color: '#7f1d1d',
  },
  textWarning: {
    color: '#78350f',
  },
  textInfo: {
    color: '#0c2340',
  },
})

/**
 * Tab Navigation Styles
 */
export const tabStyles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.lightBg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightBorder,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: COLORS.primary,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  tabLabelActive: {
    color: COLORS.primary,
  },
})

/**
 * Progress Bar Styles
 */
export const progressStyles = StyleSheet.create({
  container: {
    height: 8,
    backgroundColor: COLORS.lightBorder,
    borderRadius: BORDER_RADIUS.full,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.full,
  },
  barSuccess: {
    backgroundColor: COLORS.success,
  },
  barWarning: {
    backgroundColor: COLORS.warning,
  },
  barDanger: {
    backgroundColor: COLORS.danger,
  },
})

/**
 * Stepper/Timeline Styles
 */
export const stepperStyles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
  },
  step: {
    marginBottom: SPACING.xl,
    flexDirection: 'row',
  },
  stepIndicator: {
    alignItems: 'center',
    marginRight: SPACING.lg,
  },
  stepNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.lightCard,
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '700',
  },
  stepNumberActive: {
    backgroundColor: COLORS.primary,
    color: '#fff',
  },
  stepNumberCompleted: {
    backgroundColor: COLORS.success,
  },
  stepConnector: {
    width: 2,
    height: SPACING.xl,
    backgroundColor: COLORS.lightBorder,
    marginTop: SPACING.sm,
  },
  stepConnectorActive: {
    backgroundColor: COLORS.primary,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  stepDescription: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
})

/**
 * Badge/Chip Styles
 */
export const chipStyles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.lightCard,
    gap: SPACING.xs,
  },
  chipOutlined: {
    borderWidth: 1,
    borderColor: COLORS.lightBorder,
  },
  chipFilled: {
    backgroundColor: COLORS.primary,
  },
  chipLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  chipLabelFilled: {
    color: '#fff',
  },
})

/**
 * Empty State Styles
 */
export const emptyStateStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xxl,
  },
  icon: {
    width: 100,
    height: 100,
    marginBottom: SPACING.xl,
    tintColor: COLORS.textSecondary,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
    lineHeight: 20,
  },
})

/**
 * Loading States
 */
export const loadingStyles = StyleSheet.create({
  skeleton: {
    backgroundColor: COLORS.lightCard,
    borderRadius: BORDER_RADIUS.md,
  },
  shimmer: {
    backgroundColor: '#f6f7f8',
    overflow: 'hidden',
  },
})

// ============================================================================
// SCREEN-SPECIFIC PRESETS
// ============================================================================

/**
 * Activity/Trip Details Screen
 */
export const detailsScreenStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.lightBg,
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: SPACING.xl,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    marginBottom: SPACING.sm,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  section: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightBorder,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
})

export default {
  rideCardStyles,
  listItemStyles,
  overlayStyles,
  toastStyles,
  tabStyles,
  progressStyles,
  stepperStyles,
  chipStyles,
  emptyStateStyles,
  detailsScreenStyles,
}
