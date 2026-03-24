# Style Migration Guide

Guide for refactoring existing components to use the new global style system.

## Overview

The new centralized style system provides:
- Reusable style patterns
- Consistency across the app
- Easier maintenance
- Better performance

## Step-by-Step Migration Process

### Step 1: Identify Candidates

Start with components that:
- Have repeating style patterns
- Use styles also defined in other components
- Are simple enough to refactor without logic changes

**Good candidates:**
- RideCard components
- List items
- Buttons
- Cards
- Form inputs

### Step 2: Compare with Globals

Check if the component's styles exist in the global system:

**In component:**
```tsx
const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
})
```

**In globals:**
```tsx
// globalStyles.cardStyles.card matches exactly!
```

### Step 3: Create Refactored Version

#### Example 1: Simple Card Component

**Before:**
```tsx
import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'

export const RideInfoCard = ({ title, value, icon, onPress }) => {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.row}>
        <MaterialIcons name={icon} size={24} color="#ff6b35" />
        <View style={styles.content}>
          <Text style={styles.label}>{title}</Text>
          <Text style={styles.value}>{value}</Text>
        </View>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  content: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  value: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ff6b35',
    marginTop: 4,
  },
})
```

**After:**
```tsx
import React from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { cardStyles, layoutStyles, textStyles, COLORS, SPACING } from '../styles'

export const RideInfoCard = ({ title, value, icon, onPress }) => {
  return (
    <TouchableOpacity 
      style={[cardStyles.card, { marginBottom: SPACING.md }]} 
      onPress={onPress}
    >
      <View style={[layoutStyles.row, layoutStyles.gap12]}>
        <MaterialIcons name={icon} size={24} color={COLORS.primary} />
        <View style={{ flex: 1 }}>
          <Text style={[textStyles.bodySemibold, { color: COLORS.text }]}>
            {title}
          </Text>
          <Text style={[textStyles.priceLarge, { marginTop: SPACING.xs }]}>
            {value}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  )
}
```

**Changes:**
- ✅ Removed 30+ lines of duplicate StyleSheet
- ✅ Used cardStyles.card instead of custom card styles
- ✅ Used layoutStyles.row + layoutStyles.gap12 for layout
- ✅ Used textStyles for typography
- ✅ Used COLORS and SPACING constants

#### Example 2: Button with Local Variants

**Before:**
```tsx
const styles = StyleSheet.create({
  button: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonPrimary: {
    backgroundColor: '#ff6b35',
  },
  buttonSecondary: {
    backgroundColor: '#f5f6f8',
    borderWidth: 1,
    borderColor: '#e0e4eb',
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  buttonTextSecondary: {
    color: '#0a0a0a',
  },
})
```

**After:**
```tsx
import { StyleSheet } from 'react-native'
import { buttonStyles } from '../styles'

const styles = StyleSheet.create({
  // No local styles needed - buttonStyles covers all variants!
})

// Or remove StyleSheet entirely and use:
// buttonStyles.buttonPrimary
// buttonStyles.buttonSecondary
// buttonStyles.buttonPrimaryText
// buttonStyles.buttonSecondaryText
```

#### Example 3: Form Component

**Before:**
```tsx
const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  input: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: '#000',
    backgroundColor: '#f5f6f8',
    borderWidth: 1,
    borderColor: '#e0e4eb',
  },
  error: {
    borderColor: '#ff4444',
  },
  errorText: {
    fontSize: 12,
    color: '#ff4444',
    marginTop: 4,
  },
})
```

**After:**
```tsx
import { formStyles } from '../styles'

// All these styles exist in formStyles!
// formStyles.formGroup
// formStyles.label
// formStyles.inputBase
// formStyles.inputError
// formStyles.errorText
```

#### Example 4: Complex Component with Custom Logic

**Before:**
```tsx
const HomeScreen = () => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Home</Text>
      </View>
      {/* Content */}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F4F7',
  },
  header: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    paddingTop: 48,
    borderBottomWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  // ... many more styles
})
```

**After:**
```tsx
import { screenStyles, headerStyles, typographyStyles } from '../styles'

const HomeScreen = () => {
  return (
    <View style={screenStyles.container}>
      <View style={headerStyles.header}>
        <Text style={headerStyles.headerTitle}>Home</Text>
      </View>
      {/* Content */}
    </View>
  )
}

// Local styles object is now empty or contains only component-specific styles
```

## Common Refactoring Patterns

### Pattern 1: Replace Container Styles

```tsx
// Before
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  }
})

// After
import { screenStyles } from '../styles'

// Use: screenStyles.container
```

### Pattern 2: Replace Button Styles

```tsx
// Before
const styles = StyleSheet.create({
  button: {
    backgroundColor: '#ff6b35',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  }
})

// After
import { buttonStyles } from '../styles'

// Use: buttonStyles.buttonPrimary + buttonStyles.buttonPrimaryText
```

### Pattern 3: Replace Text Styles

```tsx
// Before
const styles = StyleSheet.create({
  heading: {
    fontSize: 20,
    fontWeight: '800',
    color: '#000',
  },
  body: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  }
})

// After
import { typographyStyles } from '../styles'

// Use: typographyStyles.h4 + typographyStyles.body
```

### Pattern 4: Replace Layout Styles

```tsx
// Before
const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  }
})

// After
import { layoutStyles, SPACING } from '../styles'

// Use: [layoutStyles.flexBetween, layoutStyles.gap16]
// Or: layoutStyles.row for just flexDirection
```

### Pattern 5: Replace Card/Elevation Styles

```tsx
// Before
const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  }
})

// After
import { cardStyles, shadowStyles } from '../styles'

// Use: [cardStyles.card, shadowStyles.shadowMedium]
```

## Files Ready for Migration

### Priority 1 (High Impact)
These have many duplicate styles across the app:
- Button wrappers
- Card components
- List items
- Form inputs

### Priority 2 (Medium Impact)
High reuse but more component-specific:
- Ride request cards
- Trip detail screens
- Status badges

### Priority 3 (Low Impact)
Mostly custom, limited reuse:
- Complex modals
- Unique layouts
- One-off screens

## Testing After Migration

### Visual Testing
1. Compare before/after screenshots
2. Ensure same spacing and colors
3. Check shadows and borders

### Responsive Testing
1. Test on multiple device sizes
2. Check small screen adjustments
3. Verify tablet layouts

### Code Review
1. Check for missing imports
2. Verify style combinations are correct
3. Ensure no broken references

## Troubleshooting

### Styles don't match exactly

**Problem:** Migrated component looks different

**Solution:**
```tsx
// Compare values
console.log('Global style:', globalStyles.card)
console.log('Original style:', localStyles.card)

// Adjust if needed
<View style={[globalStyles.card, { customProp: value }]} />
```

### Can't find matching global style

**Problem:** Component style doesn't match any global

**Solution:**
1. Create a new global style (submit PR)
2. Use component-specific style temporarily
3. Add TODO comment for future refactoring

```tsx
// TODO: Move this style to globalStyles
const localStyles = StyleSheet.create({
  uniqueStyle: { /* custom */ }
})
```

### Performance issues

**Problem:** Component re-renders excessively after migration

**Solution:** Use useMemo for style combinations
```tsx
const memoizedStyle = useMemo(() => [
  cardStyles.card,
  { customProp: value }
], [value])

<View style={memoizedStyle} />
```

## Submitting Changes

When migrating a component:

1. Update component file
2. Remove local StyleSheet if empty
3. Add import for global styles
4. Test on device
5. Verify no visual regression
6. Create PR with migration notes

Example PR description:
```
refactor: Migrate HomeScreen to use global styles

- Replaced 40+ lines of custom styles with global styles
- Used screenStyles.container, headerStyles.header
- Removed duplicate style definitions
- Visual regression tested on iPhone SE & Android

Reduces:
- Code duplication
- Maintenance burden
- Bundle size
```

## Quick Reference: Translation Mapping

Common style translations:

| Old Pattern | New Import | New Usage |
|---|---|---|
| Container | screenStyles | screenStyles.container |
| Button | buttonStyles | buttonStyles.button{Primary\|Secondary\|Danger} |
| Card | cardStyles | cardStyles.card |
| Text | typographyStyles | typographyStyles.{h1-h6\|body\|caption} |
| Flex center | layoutStyles | layoutStyles.flexCenter |
| Row | layoutStyles | layoutStyles.row |
| Gap | layoutStyles | layoutStyles.gap{4\|8\|12\|16\|24\|32} |
| Shadow | shadowStyles | shadowStyles.shadow{Small\|Medium\|Large} |

## Next Steps

1. **Start with simple components** (buttons, cards)
2. **Document learnings** in component comments
3. **Create style combinations** as needed
4. **Refactor screens** in priority order
5. **Update team documentation**
6. **Create guidelines** for new components
