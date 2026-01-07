# Dark/Light Theme Implementation - Fire-Go Mobile Customer

## Overview
Successfully implemented a comprehensive dark/light theme system for the mobile-customer app using Redux Toolkit for state management.

## Architecture

### 1. Color Palettes (`src/constants/colors.ts`)
- **COLORS_DARK**: Dark mode colors (default)
  - Primary: #FF6B00
  - Background: #0f172a
  - Text: #ffffff
  - Secondary background: #1a202c

- **COLORS_LIGHT**: Light mode colors
  - Primary: #FF6B00 (same)
  - Background: #ffffff
  - Text: #1a202c
  - Secondary background: #f5f5f5

### 2. Redux Slice (`src/redux/slices/themeSlice.ts`)
- **State**: `{ mode: 'dark' | 'light', isSystemTheme: boolean }`
- **Actions**:
  - `setTheme(mode)`: Set theme manually
  - `toggleTheme()`: Toggle between dark and light
  - `setSystemTheme()`: Use device system theme

- **Selector**: `useSelector((state: RootState) => state.theme.mode)`

### 3. Implementation Pattern

Every themed screen follows this pattern:

```tsx
import { COLORS_DARK, COLORS_LIGHT } from '../constants'
import { useSelector } from 'react-redux'

// In component
const themeMode = useSelector((state: RootState) => state.theme.mode)
const colors = themeMode === 'dark' ? COLORS_DARK : COLORS_LIGHT

// In JSX
<View style={[styles.container, { backgroundColor: colors.bg }]}>
  <Text style={{ color: colors.text }}>Content</Text>
</View>

// StatusBar adaptation
<StatusBar
  barStyle={themeMode === 'dark' ? 'light-content' : 'dark-content'}
  backgroundColor={colors.bg}
/>
```

## Updated Screens

### ✅ ProfileScreen
- **Status**: Fully themed
- **Features**:
  - Theme toggle in Settings menu
  - Icon changes based on mode (brightness-4 for dark, brightness-7 for light)
  - All colors dynamic
  - StatusBar adapts to theme

### ✅ HomeScreen
- **Status**: Fully themed
- **Components**:
  - Header with theme-aware colors
  - Ride mode selection buttons
  - Location inputs
  - Time/Passenger section with dynamic Switch styling
  - Price section

### ✅ HireDriverScreen
- **Status**: Fully themed
- **Components**:
  - Location cards with suggestions dropdown
  - Map component integration
  - Vehicle selection (sedan/suv/truck)
  - Input fields and forms
  - Price and calculate button
  - All suggestion items with dynamic colors

## Styling Strategy

### Style Sheet Pattern
Removed all hardcoded colors from StyleSheet.create():

**Before:**
```tsx
const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0f172a',
  },
})
```

**After:**
```tsx
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
})

// In JSX:
<View style={[styles.container, { backgroundColor: colors.bg }]} />
```

### Reusable Color Constants
- `colors.bg` - Main background
- `colors.bgSecondary` - Secondary background
- `colors.text` - Primary text
- `colors.textSecondary` - Secondary/muted text
- `colors.border` - Border color
- `colors.primary` - Primary action color (#FF6B00)
- `colors.danger` - Destructive actions (#ef4444)

## How to Use Theme Toggle

In **ProfileScreen**, the Settings menu includes a theme toggle:

```tsx
{
  icon: 'brightness-4' (or 'brightness-7'),
  label: 'Chế độ tối',
  isToggle: true,
  onPress: () => handleThemeChange()
}

const handleThemeChange = (value: boolean) => {
  dispatch(setTheme(value ? 'light' : 'dark'))
}
```

## Future Enhancements

### 1. Persist Theme to AsyncStorage
```tsx
// In App.tsx
useEffect(() => {
  AsyncStorage.getItem('theme').then(saved => {
    if (saved) dispatch(setTheme(saved as ThemeType))
  })
}, [])

// Save on change
useEffect(() => {
  AsyncStorage.setItem('theme', themeMode)
}, [themeMode])
```

### 2. System Theme Detection
```tsx
import { useColorScheme } from 'react-native'

const systemTheme = useColorScheme() // 'dark' | 'light' | null
```

### 3. Apply to Other Screens
- ChatScreen
- BookingsScreen
- WalletScreen
- DriverFoundScreen
- LoginScreen (if needed)

Same pattern as ProfileScreen, HomeScreen, HireDriverScreen

## Testing

To test the theme system:

1. Navigate to ProfileScreen
2. Scroll to Settings section
3. Toggle "Chế độ tối" switch
4. Observe all screens updating colors
5. Switch between HomeScreen and HireDriverScreen to verify consistency

## Key Files Modified

- `src/constants/colors.ts` - Color palettes
- `src/redux/slices/themeSlice.ts` - Theme state management
- `src/redux/store.ts` - Redux store configuration
- `src/screens/ProfileScreen.tsx` - Full theme support + toggle
- `src/screens/HomeScreen.tsx` - Full theme support
- `src/screens/HireDriverScreen.tsx` - Full theme support

## Status Bar Configuration

Each screen now includes:
```tsx
<StatusBar
  barStyle={themeMode === 'dark' ? 'light-content' : 'dark-content'}
  backgroundColor={colors.bg}
/>
```

This ensures the status bar text and background adapt to the current theme.

## Notes

- Primary brand color (#FF6B00) remains consistent across both themes
- All system colors (success, danger, warning) are theme-aware
- Border colors use opacity-based approach for better contrast
- Switch components use primary color with opacity for visual feedback
- Icons dynamically change color based on their context and theme
