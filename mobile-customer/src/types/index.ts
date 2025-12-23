// Auth Types
export interface User {
  id: string
  name: string
  email: string
  phone: string
  role: 'customer' | 'admin'
  avatar?: string
  rating?: number
}

export interface AuthState {
  isLoading: boolean
  user: User | null
  token: string | null
  isAuthenticated: boolean
  error: string | null
}

// Booking Types
export interface RideBooking {
  id: string
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
  pickupLocation: string
  dropoffLocation: string
  distance: string
  estimatedTime: string
  estimatedFare: number
  actualFare?: number
  rideType: 'standard' | 'comfort' | 'xl'
  driverName?: string
  driverRating?: number
  carPlate?: string
  bookingTime: string
  startTime?: string
  endTime?: string
}

// Navigation Types
export type RootStackParamList = {
  Login: undefined
  Main: undefined
  Home: undefined
  Bookings: undefined
  Promotions: undefined
  Profile: undefined
  RideDetail: { rideId: string }
  BookingDetail: { bookingId: string }
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
