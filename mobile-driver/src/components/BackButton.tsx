import React from 'react'
import { TouchableOpacity, StyleSheet } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { COLORS, SPACING } from '../constants'

interface BackButtonProps {
  /**
   * Callback when button is pressed
   * If not provided, will use navigation.goBack()
   */
  onPress?: () => void
  
  /**
   * Color of the icon
   * @default COLORS.text
   */
  color?: string
  
  /**
   * Size of the icon
   * @default 24
   */
  size?: number
  
  /**
   * Style overrides for the button
   */
  style?: any
  
  /**
   * Icon name from MaterialIcons
   * @default 'arrow-back'
   */
  iconName?: string
  
  /**
   * Whether to show as elevated button
   * @default false
   */
  elevated?: boolean
}

/**
 * BackButton Component
 * 
 * Reusable back navigation button for mobile driver app.
 * Uses Material Icons and handles navigation automatically.
 * 
 * @example
 * ```tsx
 * // Basic usage
 * <BackButton />
 * 
 * // With custom color
 * <BackButton color="#fff" />
 * 
 * // With custom callback
 * <BackButton onPress={() => handleCustomAction()} />
 * 
 * // Elevated style
 * <BackButton elevated />
 * ```
 */
export const BackButton: React.FC<BackButtonProps> = ({
  onPress,
  color = COLORS.text,
  size = 24,
  style,
  iconName = 'arrow-back',
  elevated = false,
}) => {
  const navigation = useNavigation()

  const handlePress = () => {
    if (onPress) {
      onPress()
    } else {
      navigation.goBack()
    }
  }

  return (
    <TouchableOpacity
      style={[
        styles.button,
        elevated && styles.buttonElevated,
        style,
      ]}
      onPress={handlePress}
      activeOpacity={0.6}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <MaterialIcons name={iconName as any} size={size} color={color} />
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  button: {
    padding: SPACING.md,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonElevated: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
})
