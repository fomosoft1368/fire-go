import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface AuthState {
  isLoading: boolean
  user: any
  token: string | null
  isAuthenticated: boolean
  error: string | null
}

const initialState: AuthState = {
  isLoading: false,
  user: null,
  token: null,
  isAuthenticated: false,
  error: null,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginStart: (state) => {
      state.isLoading = true
      state.error = null
    },
    loginSuccess: (state, action: PayloadAction<{ token: string; user: any }>) => {
      state.isLoading = false
      state.token = action.payload.token
      state.user = action.payload.user
      state.isAuthenticated = true
    },
    loginFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false
      state.error = action.payload
      state.isAuthenticated = false
    },
    logout: (state) => {
      state.token = null
      state.user = null
      state.isAuthenticated = false
      state.error = null
    },
    registerStart: (state) => {
      state.isLoading = true
      state.error = null
    },
    registerSuccess: (state, action: PayloadAction<{ token: string; user: any }>) => {
      state.isLoading = false
      state.token = action.payload.token
      state.user = action.payload.user
      state.isAuthenticated = true
    },
    registerFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false
      state.error = action.payload
    },
    restoreAuth: (state, action: PayloadAction<{ token: string; user: any } | null>) => {
      if (action.payload) {
        state.token = action.payload.token
        state.user = action.payload.user
        state.isAuthenticated = true
        state.isLoading = false
        state.error = null
      } else {
        state.token = null
        state.user = null
        state.isAuthenticated = false
        state.isLoading = false
        state.error = null
      }
    },
    updateUser: (state, action: PayloadAction<any>) => {
      state.user = { ...state.user, ...action.payload }
    },
  },
})

export const {
  loginStart,
  loginSuccess,
  loginFailure,
  logout,
  registerStart,
  registerSuccess,
  registerFailure,
  restoreAuth,
  updateUser,
} = authSlice.actions

export default authSlice.reducer
