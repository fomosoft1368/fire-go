# BackButton Component

Reusable back navigation button for mobile apps (customer and driver).

## Overview

A simple, flexible back button component that:
- Automatically handles navigation with `useNavigation` hook
- Supports custom callbacks
- Uses Material Icons
- Includes elevation/shadow styling option
- Proper touch area (hitSlop)
- TypeScript support

## Location

- **Customer App**: `mobile-customer/src/components/arrow-back.tsx`
- **Driver App**: `mobile-driver/src/components/BackButton.tsx`

## Props

```tsx
interface BackButtonProps {
  // Callback when button is pressed (optional)
  // If not provided, uses navigation.goBack()
  onPress?: () => void
  
  // Icon color
  // @default COLORS.text
  color?: string
  
  // Icon size
  // @default 24
  size?: number
  
  // Style overrides
  style?: any
  
  // MaterialIcons icon name
  // @default 'arrow-back'
  iconName?: string
  
  // Show with elevation/shadow
  // @default false
  elevated?: boolean
}
```

## Usage Examples

### Basic Usage

```tsx
import { BackButton } from '@/components'

export const MyScreen = () => {
  return (
    <View style={{ flex: 1 }}>
      <BackButton />
      {/* Screen content */}
    </View>
  )
}
```

### White Icon for Dark Headers

```tsx
<View style={{ backgroundColor: COLORS.primary, paddingTop: 16 }}>
  <BackButton color="#fff" />
  <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>
    Screen Title
  </Text>
</View>
```

### With Custom Callback

```tsx
const handleBackPress = () => {
  // Custom logic before navigation
  analytics.logEvent('screen_exited', { screen: 'ProfileEdit' })
  navigation.goBack()
}

<BackButton onPress={handleBackPress} />
```

### Elevated Style (White Background)

```tsx
// Useful for floating/overlay buttons
<BackButton elevated />

// Or with custom color
<BackButton elevated color={COLORS.primary} />
```

### Custom Icon and Size

```tsx
// Use close icon instead
<BackButton iconName="close" size={28} />

// Use chevron for breadcrumb
<BackButton iconName="chevron-left" />
```

### In Header (Common Pattern)

```tsx
import { BackButton } from '@/components'
import { View, Text } from 'react-native'
import { headerStyles, layoutStyles, SPACING } from '@/styles'

export const ScreenWithHeader = () => {
  return (
    <View style={headerStyles.header}>
      <View style={layoutStyles.rowBetween}>
        <BackButton color="#000" />
        <Text style={headerStyles.headerTitle}>My Screen</Text>
        <View style={{ width: 40 }} /> {/* Spacer for centering */}
      </View>
    </View>
  )
}
```

### Multiple Use Cases in One Screen

```tsx
export const DetailScreen = () => {
  const handleHeaderBackPress = () => {
    // Just navigate back
  }

  const handleFloatingBackPress = () => {
    // Extra logic
    saveData()
    navigation.goBack()
  }

  return (
    <View style={{ flex: 1 }}>
      {/* Header back button */}
      <BackButton onPress={handleHeaderBackPress} />
      
      {/* Content */}
      <ScrollView>
        {/* ... */}
      </ScrollView>

      {/* Floating back button (elevated) */}
      <BackButton elevated color={COLORS.primary} style={{ position: 'absolute', top: 20, left: 20 }} />
    </View>
  )
}
```

## Styling Integration

Component works with global styles system:

```tsx
import { BackButton } from '@/components'
import { layoutStyles, SPACING, COLORS } from '@/styles'

// Center aligned with spacing
<View style={[layoutStyles.rowCenter, { paddingHorizontal: SPACING.lg }]}>
  <BackButton />
  <Text style={{ flex: 1, textAlign: 'center' }}>Title</Text>
</View>
```

## Platform Notes

### Android
- Uses `elevation` for shadow effect
- Material-design compliant
- Touch target is adequate (recommended 48x48 minimum, this has padding)

### iOS
- Uses `shadowColor`, `shadowOffset`, `shadowOpacity`, `shadowRadius`
- Smooth opacity animation
- Shadow rendering optimized

### Hit Slop
Component includes `hitSlop` to expand touch area for better UX:
```tsx
hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
```

This means the button is easily tappable even if you don't hit the exact center.

## Common Screen Patterns

### Simple Screen with Back Button

```tsx
const { BackButton } = require('@/components')
const { screenStyles, headerStyles } = require('@/styles')

export const SimpleScreen = () => {
  return (
    <View style={screenStyles.container}>
      <View style={headerStyles.header}>
        <BackButton />
        <Text style={headerStyles.headerTitle}>Title</Text>
      </View>
      {/* Content */}
    </View>
  )
}
```

### Modal with Back

```tsx
import { BackButton } from '@/components'
import { View, Text } from 'react-native'
import { modalStyles, buttonStyles } from '@/styles'

export const BottomSheetModal = ({ onClose }) => {
  return (
    <View style={modalStyles.modalContainer}>
      <BackButton onPress={onClose} />
      {/* Modal content */}
    </View>
  )
}
```

### Nested Navigation

```tsx
const handleBackPress = () => {
  // Custom behavior for nested navigation
  if (canGoBack) {
    navigation.goBack()
  } else {
    navigation.navigate('Home')
  }
}

<BackButton onPress={handleBackPress} />
```

## Accessibility

- Touch area expanded with `hitSlop` (20px total)
- Icon is easy to see and understand
- Works with screen readers (uses native button)
- Sufficient color contrast when used properly

## Performance

- Lightweight component
- Uses `activeOpacity={0.6}` for smooth feedback
- No unnecessary re-renders
- Uses navigation context efficiently

## Customization Tips

### Override with StyleSheet.create()

```tsx
import { StyleSheet } from 'react-native'
import { BackButton } from '@/components'

const styles = StyleSheet.create({
  customBackButton: {
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 20,
  }
})

<BackButton style={styles.customBackButton} />
```

### Icon Variants

```tsx
// Back arrow (default)
<BackButton />

// Close
<BackButton iconName="close" />

// Chevron
<BackButton iconName="chevron-left" />

// Navigation arrow
<BackButton iconName="navigate-before" />

// Times/X
<BackButton iconName="clear" />
```

## Testing

### Unit Test Example

```tsx
import { render, fireEvent } from '@testing-library/react-native'
import { BackButton } from '@/components'

describe('BackButton', () => {
  it('calls onPress when pressed', () => {
    const onPress = jest.fn()
    const { getByTestId } = render(<BackButton onPress={onPress} />)
    
    fireEvent.press(getByTestId('backButton'))
    expect(onPress).toHaveBeenCalled()
  })

  it('navigates back when no onPress prop', () => {
    const { getByTestId } = render(<BackButton />)
    // Navigation mock would be tested here
  })
})
```

## Browser/Web Support

Component is fully React Native - not available for web.
For web version, see `web-admin/` or `web-user/` components.

## Common Issues & Solutions

### Button not working?
- Check navigation context is available (component must be inside a navigator)
- Verify `onPress` callback doesn't have errors

### Styling looks wrong?
- Check if component is properly imported
- Verify COLORS and SPACING constants are correct
- Check for style conflicts

### Icon not showing?
- Ensure `@expo/vector-icons` is installed
- Check icon name exists in Material Icons
- Verify color is not transparent

## Related Components

- **StatusBadge** - Display status information
- **Badge** - Badge component for ride types
- **BalanceCard** - Balance display
- **See** - Global styles system for styling

## FileLocations for Reference

- Customer: `mobile-customer/src/components/arrow-back.tsx`
- Driver: `mobile-driver/src/components/BackButton.tsx`
- Styles: `mobile-driver/src/styles/` or `mobile-customer/src/styles/`
