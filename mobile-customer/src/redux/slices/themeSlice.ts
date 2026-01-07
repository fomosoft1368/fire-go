import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { ThemeType } from '../../constants/colors'

interface ThemeState {
  mode: ThemeType
  isSystemTheme: boolean
}

const initialState: ThemeState = {
  mode: 'dark',
  isSystemTheme: false,
}

const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    setTheme: (state, action: PayloadAction<ThemeType>) => {
      state.mode = action.payload
      state.isSystemTheme = false
    },
    toggleTheme: (state) => {
      state.mode = state.mode === 'dark' ? 'light' : 'dark'
      state.isSystemTheme = false
    },
    setSystemTheme: (state) => {
      state.isSystemTheme = true
      // System theme will be determined by device settings
    },
  },
})

export const { setTheme, toggleTheme, setSystemTheme } = themeSlice.actions
export default themeSlice.reducer
