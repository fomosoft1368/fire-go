// Auth Types
export interface User {
  id: string
  firstName?: string
  lastName?: string
  name?: string
  email: string
  phone: string
  role: 'customer' | 'admin'
  avatar?: string
  rating?: number
  completedRides?: number
  averageRating?: number
  totalSpent?: number
  savedAddresses?: Array<{ address: string; label: string }>
  dateOfBirth?: string
  preferredDriverGender?: string
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
  Notification: undefined
  RideDetail: { rideId: string }
  BookingDetail: { bookingId: string }
  RideBooking: { distance: number; duration: number; startLng: number; startLat: number; endLng: number; endLat: number; pickupAddress: string; dropoffAddress: string }
  RideTracking: { rideId: string }
  EditProfile: undefined
  ChangePassword: undefined
  PaymentMethods: undefined
  TransactionHistory: undefined
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

// Ride Types
export interface CreateRideDto {
  pickupAddress: string
  pickupCoordinates: [number, number]
  dropoffAddress: string
  dropoffCoordinates: [number, number]
  distance: number
  duration: number
  baseFare: number
  distanceFare: number
  timeFare: number
  surgePricing?: number
  rideType?: 'share' | 'hire' // 'share' for shared rides, 'hire' for hired driver
  vehicleType?: string // Vehicle type like 'basic', 'comfort', 'premium' or 'sedan', 'suv', 'truck'
  notes?: string
  passengers?: number
  // Hire Driver specific fields
  carType?: 'sedan' | 'suv' | 'truck'
  licensePlate?: string
  transmission?: 'auto' | 'manual'
  driverNote?: string
  isScheduled?: boolean
  scheduledTime?: string
}
