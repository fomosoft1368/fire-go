// Auth Types
export interface User {
  id: string
  name: string
  email: string
  phone: string
  role: 'admin' | 'driver' | 'customer'
  avatar?: string
}

export interface AuthState {
  isLoading: boolean
  user: User | null
  token: string | null
  isAuthenticated: boolean
  error: string | null
}

// Ride Types
export interface RideItem {
  id: string
  type: 'POOL' | 'ASSIST' | 'XL'
  price: number
  pickupLocation: string
  dropoffLocation: string
  pickupTime: string
  time: string
  rating: number
  badge: string
  badgeColor: string
}

export interface RideFilter {
  type: 'all' | 'pool' | 'assist'
}

// Navigation Types
export type RootStackParamList = {
  Login: undefined
  Main: undefined
  Home: undefined
  Trips: undefined
  Earnings: undefined
  Profile: undefined
  RideDetail: { rideId: string }
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
}

export interface LoginResponse {
  token: string
  user: User
}
