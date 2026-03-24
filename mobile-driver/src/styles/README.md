# Global Styles for Mobile Driver

Contains reusable style patterns and components for consistent UI across the mobile driver application.

## Overview

This directory contains centralized style definitions organized by category:

- **screenStyles** - Screen containers and layouts
- **headerStyles** - Header and top navigation  
- **buttonStyles** - Button variations (primary, secondary, danger, etc.)
- **cardStyles** - Card and container components
- **formStyles** - Form inputs and validation UI
- **typographyStyles** - Text sizes and weights (h1-h6, body, caption)
- **layoutStyles** - Flex utilities and spacing
- **shadowStyles** - Drop shadow definitions
- **borderStyles** - Border and border-radius utilities
- **statusStyles** - Status badges and indicators
- **avatarStyles** - Avatar component sizes
- **dividerStyles** - Dividers and separators
- **modalStyles** - Modal and overlay styles
- **spacingStyles** - Margin and padding utilities

## Usage

### Basic Import

```tsx
import { screenStyles, buttonStyles, cardStyles } from '../styles'

export const MyScreen = () => {
  return (
    <View style={screenStyles.container}>
      <View style={cardStyles.card}>
        <Text>Content</Text>
      </View>
      <TouchableOpacity style={buttonStyles.buttonPrimary}>
        <Text style={buttonStyles.buttonPrimaryText}>Action</Text>
      </TouchableOpacity>
    </View>
  )
}
```

### Combine Multiple Styles

```tsx
import { StyleSheet } from 'react-native'
import { buttonStyles, shadowStyles, spacingStyles } from '../styles'

const localStyles = StyleSheet.create({
  customButton: {
    ...buttonStyles.buttonPrimary,
    ...shadowStyles.shadowLarge,
    ...spacingStyles.mt16,
  },
})
```

### Access Constants

All styles use values from `src/constants`:

```tsx
import { COLORS, SPACING, BORDER_RADIUS } from '../constants'

// COLORS - Primary, dark/light themes, status, semantic
// SPACING - xs(4), sm(8), md(12), lg(16), xl(24), xxl(32)
// BORDER_RADIUS - sm(4), md(8), lg(12), xl(16), full(9999)
```

## Common Patterns

### Full Screen with Header

```tsx
import { screenStyles, headerStyles } from '../styles'

<View style={screenStyles.container}>
  <View style={headerStyles.header}>
    <Text style={headerStyles.headerTitle}>Screen Title</Text>
  </View>
  <ScrollView style={screenStyles.scrollView}>
    {/* Content */}
  </ScrollView>
</View>
```

### Card with Button

```tsx
import { cardStyles, buttonStyles } from '../styles'

<View style={cardStyles.card}>
  <View style={cardStyles.cardContent}>
    <Text>Card content</Text>
  </View>
  <TouchableOpacity style={[buttonStyles.buttonPrimary, spacingStyles.mt16]}>
    <Text style={buttonStyles.buttonPrimaryText}>Action</Text>
  </TouchableOpacity>
</View>
```

### Form Input

```tsx
import { formStyles } from '../styles'

<View style={formStyles.formGroup}>
  <Text style={formStyles.label}>Email</Text>
  <TextInput style={formStyles.inputBase} placeholder="Enter email" />
  <Text style={formStyles.helpText}>Use a valid email address</Text>
</View>
```

### Flex Layout Utilities

```tsx
import { layoutStyles, typographyStyles } from '../styles'

// Center content
<View style={layoutStyles.flexCenter}>
  <Text>Centered</Text>
</View>

// Space between
<View style={layoutStyles.flexBetween}>
  <Text>Left</Text>
  <Text>Right</Text>
</View>

// Row with gap
<View style={[layoutStyles.row, layoutStyles.gap12]}>
  <Text>Item 1</Text>
  <Text>Item 2</Text>
</View>
```

### Status Indicators

```tsx
import { statusStyles } from '../styles'

<View style={[statusStyles.statusBadge, statusStyles.statusActive]}>
  <View style={[statusStyles.statusDot, statusStyles.statusDotActive]} />
  <Text style={statusStyles.statusText}>Active</Text>
</View>
```

### Avatar with Border

```tsx
import { avatarStyles } from '../styles'

<Image
  source={{ uri: avatarUrl }}
  style={[
    avatarStyles.avatarMedium,
    avatarStyles.avatarBorderPrimary,
  ]}
/>
```

## Spacing Guidelines

Use the defined spacing system consistently:

| Token | Value | Usage |
|-------|-------|-------|
| xs    | 4px   | Small gaps, icon spacing |
| sm    | 8px   | Small padding, minor gaps |
| md    | 12px  | Standard padding, form fields |
| lg    | 16px  | Main padding, card spacing |
| xl    | 24px  | Large sections, headers |
| xxl   | 32px  | Major sections, screen gaps |

## Color Usage

### Primary
- `COLORS.primary` (#ff6b35) - Action buttons, highlights
- `COLORS.primaryLight` (#ff6b3520) - Light backgrounds

### Status
- `COLORS.success` (#4caf50) - Confirmations, accepted actions
- `COLORS.danger` (#ff4444) - Errors, rejections, deletes
- `COLORS.warning` (#ffc107) - Warnings, pending states
- `COLORS.offline` (#ff4444) - Offline status

### Text
- `COLORS.text` - Main text on light backgrounds
- `COLORS.textSecondary` - Secondary text, captions
- `COLORS.textDark` - Dark theme main text
- `COLORS.textDarkSecondary` - Dark theme secondary text

## Dark Mode Support

Many styles include dark mode variants:

```tsx
// Use appropriate variant based on theme
const isDarkMode = useIsDarkMode() // Your theme hook

<View style={[
  cardStyles.card,
  isDarkMode && cardStyles.cardDark,
]}>
```

## Best Practices

1. **Use global styles first** - Check if a style already exists before creating new ones
2. **Combine with care** - Spread multiple styles or use array syntax
3. **Consistency** - Use global colors and spacing, not hardcoded values
4. **Accessibility** - Ensure sufficient contrast and touch targets (min 44px)
5. **Performance** - Define complex styles as constants, not inline

## Adding New Global Styles

When adding new commonly-used styles:

1. Add to appropriate section in `globalStyles.ts`
2. Group related styles together
3. Use consistent naming (e.g., `button*`, `card*`, `status*`)
4. Add comments for complex styles
5. Update this README

## Examples

See specific screen implementations for real-world usage:
- `HomeScreen.tsx` - Layout and header patterns
- `RideCard.tsx` - Card and button compositions
- `ActiveRideScreen.tsx` - Complex form and overlay patterns
