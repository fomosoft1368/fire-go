# Global Styles Usage Guide

Comprehensive guide for using the centralized style system in mobile-driver.

## Quick Start

### Import styles

```tsx
import {
  screenStyles,
  buttonStyles,
  cardStyles,
  layoutStyles,
  typographyStyles,
  responsiveUtils,
} from '../styles'
```

### Basic screen template

```tsx
import React from 'react'
import { View, ScrollView, TouchableOpacity, Text } from 'react-native'
import { screenStyles, headerStyles, buttonStyles } from '../styles'

export const MyScreen = () => {
  return (
    <View style={screenStyles.container}>
      <View style={headerStyles.header}>
        <Text style={headerStyles.headerTitle}>My Screen</Text>
      </View>
      <ScrollView style={screenStyles.scrollView}>
        {/* Content */}
      </ScrollView>
    </View>
  )
}
```

## File Organization

- **globalStyles.ts** - Core styles organized by category
- **typography.ts** - Text styles and utilities
- **components.ts** - Specific component presets
- **responsive.ts** - Responsive design utilities
- **index.ts** - Central export file

## Style Categories

### 1. Screen Layouts

```tsx
import { screenStyles } from '../styles'

// Light background
<View style={screenStyles.container}>
  <ScrollView style={screenStyles.scrollView} contentContainerStyle={screenStyles.contentContainer}>
    {/* Content */}
  </ScrollView>
</View>

// Dark background
<View style={screenStyles.containerDark}>
```

### 2. Headers

```tsx
import { headerStyles } from '../styles'

<View style={headerStyles.header}>
  <Text style={headerStyles.headerTitle}>Title</Text>
  <Text style={headerStyles.headerSubtitle}>Subtitle</Text>
</View>
```

### 3. Buttons

```tsx
import { buttonStyles } from '../styles'

// Primary button
<TouchableOpacity style={buttonStyles.buttonPrimary} onPress={handlePress}>
  <Text style={buttonStyles.buttonPrimaryText}>Action</Text>
</TouchableOpacity>

// Secondary button
<TouchableOpacity style={buttonStyles.buttonSecondary} onPress={handlePress}>
  <Text style={buttonStyles.buttonSecondaryText}>Cancel</Text>
</TouchableOpacity>

// Danger button
<TouchableOpacity style={buttonStyles.buttonDanger} onPress={handleDelete}>
  <Text style={buttonStyles.buttonDangerText}>Delete</Text>
</TouchableOpacity>

// Icon button
<TouchableOpacity style={buttonStyles.iconButton}>
  <Icon />
</TouchableOpacity>
```

### 4. Cards

```tsx
import { cardStyles, shadowStyles } from '../styles'

<View style={[cardStyles.card, cardStyles.cardHighlight]}>
  <View style={cardStyles.cardContent}>
    <Text>Card content</Text>
  </View>
</View>

// Dark mode card
<View style={[cardStyles.card, cardStyles.cardDark]}>
```

### 5. Forms

```tsx
import { formStyles } from '../styles'

<View style={formStyles.formGroup}>
  <Text style={formStyles.label}>Email Address</Text>
  <TextInput
    style={formStyles.inputBase}
    placeholder="Enter email"
    keyboardType="email-address"
  />
  <Text style={formStyles.helpText}>We'll never share your email</Text>
</View>

// Input with error
<TextInput
  style={[formStyles.inputBase, formStyles.inputError]}
  placeholder="Enter value"
/>
<Text style={formStyles.errorText}>This field is required</Text>

// Input with success
<TextInput
  style={[formStyles.inputBase, formStyles.inputSuccess]}
  placeholder="Enter value"
/>
```

### 6. Typography

```tsx
import { typographyStyles, textStyles } from '../styles'

// Headings
<Text style={typographyStyles.h1}>Large Heading</Text>
<Text style={typographyStyles.h4}>Small Heading</Text>

// Body text
<Text style={typographyStyles.body}>Regular body text</Text>
<Text style={typographyStyles.bodyBold}>Bold body text</Text>

// Special text styles
<Text style={textStyles.price}>₹2,500</Text>
<Text style={textStyles.error}>Error message</Text>
<Text style={textStyles.success}>Success message</Text>
<Text style={textStyles.badge}>POOL</Text>
```

### 7. Layout Utilities

```tsx
import { layoutStyles } from '../styles'

// Centered content
<View style={layoutStyles.flexCenter}>
  <Text>Centered</Text>
</View>

// Space between (justify-content: space-between)
<View style={layoutStyles.flexBetween}>
  <Text>Left</Text>
  <Text>Right</Text>
</View>

// Row with gap
<View style={[layoutStyles.row, layoutStyles.gap16]}>
  <View style={{ flex: 1 }}>Item 1</View>
  <View style={{ flex: 1 }}>Item 2</View>
</View>

// Column centered
<View style={layoutStyles.columnCenter}>
  <Text>Item 1</Text>
  <Text>Item 2</Text>
</View>
```

### 8. Shadows

```tsx
import { shadowStyles } from '../styles'

<View style={[cardStyles.card, shadowStyles.shadowLarge]}>
  {/* Content */}
</View>

// Primary color shadow
<View style={[buttonStyles.buttonPrimary, shadowStyles.shadowPrimary]}>
```

### 9. Status & Badges

```tsx
import { statusStyles } from '../styles'

// Status indicator
<View style={[statusStyles.statusBadge, statusStyles.statusActive]}>
  <View style={[statusStyles.statusDot, statusStyles.statusDotActive]} />
  <Text style={statusStyles.statusText}>Active</Text>
</View>

// Badge
<View style={[statusStyles.badge, statusStyles.badgePrimary]}>
  <Text>NEW</Text>
</View>
```

### 10. Avatars

```tsx
import { avatarStyles } from '../styles'

<Image
  source={{ uri: userPhoto }}
  style={[
    avatarStyles.avatarLarge,
    avatarStyles.avatarBorderPrimary,
  ]}
/>
```

## Component Presets

For common components, use preset style objects:

### Ride Card

```tsx
import { rideCardStyles } from '../styles'

<View style={rideCardStyles.container}>
  <View style={rideCardStyles.header}>
    <Text>Ride Details</Text>
    <Text style={rideCardStyles.price}>₹250</Text>
  </View>
  <View style={rideCardStyles.locationSection}>
    <View style={rideCardStyles.locationRow}>
      <Text style={rideCardStyles.locationText}>Pickup</Text>
    </View>
  </View>
</View>
```

### Toast/Notification

```tsx
import { toastStyles } from '../styles'

<View style={[toastStyles.container, toastStyles.success]}>
  <Icon />
  <Text style={[toastStyles.text, toastStyles.textSuccess]}>
    Ride accepted!
  </Text>
</View>
```

### Empty State

```tsx
import { emptyStateStyles } from '../styles'

<View style={emptyStateStyles.container}>
  <Image style={emptyStateStyles.icon} source={requireIcon} />
  <Text style={emptyStateStyles.title}>No Rides</Text>
  <Text style={emptyStateStyles.description}>
    There are currently no available rides
  </Text>
</View>
```

## Responsive Design

### Screen size detection

```tsx
import { isSmallScreen, isMediumScreen, isLargeScreen, isTablet, screenWidth } from '../styles'

if (isSmallScreen) {
  // iPhone SE (< 375px)
}
if (isMediumScreen) {
  // iPhone (375-480px)
}
if (isLargeScreen) {
  // iPhone Plus, Android (480px+)
}
if (isTablet) {
  // Tablets (768px+)
}
```

### Responsive utilities

```tsx
import { scale, getResponsiveFontSize, getResponsiveSpacing, responsiveStyles } from '../styles'

// Scale value based on screen
const fontSize = getResponsiveFontSize(16) // Scales proportionally

// Get responsive spacing
const padding = getResponsiveSpacing(SPACING.lg)

// Responsive styles object
<View style={responsiveStyles.containerNormal} />
<Text style={responsiveStyles.textLarge} />
```

### Dynamic responsive padding

```tsx
import { getResponsivePadding } from '../styles'

const MyComponent = () => {
  return (
    <View style={{
      paddingHorizontal: getResponsivePadding(8, 12, 16), // small, medium, large
    }}>
      {/* Content */}
    </View>
  )
}
```

## Combining Styles

### Using spread operator

```tsx
const customStyles = StyleSheet.create({
  customButton: {
    ...buttonStyles.buttonPrimary,
    ...shadowStyles.shadowLarge,
    marginTop: SPACING.lg,
  }
})
```

### Using array syntax

```tsx
<View style={[
  cardStyles.card,
  cardStyles.cardHighlight,
  spacingStyles.mt16,
  isDarkMode && cardStyles.cardDark,
]}>
  {/* Content */}
</View>
```

### Creating local preset

```tsx
import { StyleSheet } from 'react-native'
import { buttonStyles, shadowStyles, spacingStyles, SPACING } from '../styles'

const styles = StyleSheet.create({
  customButton: {
    ...buttonStyles.buttonPrimary,
    ...shadowStyles.shadowPrimary,
    paddingVertical: SPACING.lg,
  },
})
```

## Spacing System

Always use spacing constants from the global system:

```tsx
import { SPACING } from '../constants'

const padding = SPACING.lg  // 16
const margin = SPACING.md   // 12
const gap = SPACING.sm      // 8
```

| Token | Value | Use Case |
|-------|-------|----------|
| xs    | 4     | Icon spacing, tight gaps |
| sm    | 8     | Small padding, form spacing |
| md    | 12    | Standard form fields |
| lg    | 16    | Main container padding |
| xl    | 24    | Section spacing |
| xxl   | 32    | Major section gaps |

## Color Usage

Use colors from COLORS constant:

```tsx
import { COLORS } from '../constants'

// Primary action
backgroundColor: COLORS.primary

// Text
color: COLORS.text
color: COLORS.textSecondary

// Status
color: COLORS.success   // Green
color: COLORS.danger    // Red
color: COLORS.warning   // Orange

// Backgrounds
backgroundColor: COLORS.lightBg      // Light
backgroundColor: COLORS.lightCard    // Card background
```

## Best Practices

### ✅ DO

- Use global styles for all common patterns
- Combine multiple style objects for complex components
- Use layout utilities (flex-center, gap, etc.)
- Respect the spacing system
- Use responsive utilities for cross-device compatibility
- Create local styles only for unique component-specific patterns

### ❌ DON'T

- Don't hardcode colors (use COLORS constant)
- Don't hardcode spacing values (use SPACING or layout styles)
- Don't create duplicate styles (check globals first)
- Don't use inline styles for complex components
- Don't ignore responsive design

## Performance Tips

1. **Memoize complex style compositions**
   ```tsx
   const memoizedStyle = useMemo(() => [
     cardStyles.card,
     shadowStyles.shadowLarge,
   ], [])
   ```

2. **Use StyleSheet.create()** - Already done in global styles

3. **Avoid inline object creation** - Store in constants/styles object

4. **Reuse style combinations** - Don't repeat array spreads

## Migration Guide

### From inline styles to globals

```tsx
// Before
const oldStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
  },
  button: {
    backgroundColor: '#ff6b35',
    paddingVertical: 12,
    borderRadius: 8,
  },
})

// After
import { screenStyles, buttonStyles, SPACING } from '../styles'

// Use combined globals:
<View style={[screenStyles.container, { paddingHorizontal: SPACING.lg }]}>
  <TouchableOpacity style={buttonStyles.buttonPrimary} />
</View>
```

## Examples by Screen Type

### Detail/Profile Screen

```tsx
import { screenStyles, headerStyles, cardStyles, buttonStyles, formStyles } from '../styles'

<View style={screenStyles.container}>
  <View style={[headerStyles.header, { backgroundColor: COLORS.primary }]}>
    <Text style={[headerStyles.headerTitle, { color: '#fff' }]}>Profile</Text>
  </View>
  <ScrollView style={screenStyles.scrollView}>
    <View style={cardStyles.card}>
      {/* Content */}
    </View>
  </ScrollView>
</View>
```

### List Screen

```tsx
import { screenStyles, listItemStyles, emptyStateStyles } from '../styles'

<View style={screenStyles.container}>
  {items.length > 0 ? (
    <FlatList
      data={items}
      renderItem={({ item }) => (
        <View style={listItemStyles.item}>
          {/* Item content */}
        </View>
      )}
    />
  ) : (
    <View style={emptyStateStyles.container}>
      <Text style={emptyStateStyles.title}>No items</Text>
    </View>
  )}
</View>
```

### Modal/Bottom Sheet

```tsx
import { overlayStyles, buttonStyles } from '../styles'

<View style={overlayStyles.bottomSheetOverlay}>
  <View style={overlayStyles.bottomSheetContent}>
    {/* Content */}
    <TouchableOpacity style={buttonStyles.buttonPrimary}>
      <Text style={buttonStyles.buttonPrimaryText}>Done</Text>
    </TouchableOpacity>
  </View>
</View>
```

## Troubleshooting

### Styles not applying?
- Check import paths
- Verify style object name
- Ensure StyleSheet.create() is used
- Check for conflicting styles

### Layout issues?
- Use responsive utilities for different screen sizes
- Check flex properties
- Verify padding/margin values
- Test on multiple devices

### Colors look wrong?
- Use COLORS constants, not hardcoded hex
- Check theme/dark mode logic
- Verify color contrast for accessibility

## Additional Resources

- See `src/screens/` for real-world component examples
- Check individual style file comments for detailed info
- Refer to constants/colors.ts for available colors
