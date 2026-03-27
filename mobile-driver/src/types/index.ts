// Auth Types
export interface User {
  id: string
  name: string
  email: string
  phone: string
  role: 'admin' | 'driver' | 'customer'
  avatar?: string
  // Driver-specific fields
  totalRides?: number
  averageRating?: number
  onlineHours?: number
  walletBalance?: number
  vehicleType?: string
  vehicleModel?: string
  vehiclePlate?: string
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
  ChatScreen: {
    customer: {
      id: string
      name: string
      phone?: string
      email?: string
    }
    rideId?: string
    deliveryId?: string
  }
  IncomingCall: {
    callId: string
    rideId: string
    channelName: string
    receiverToken: string
    receiverUid: number
    callerName: string
    callerRole: 'customer' | 'driver'
  }
  ActiveCall: {
    callId: string
    rideId: string
    channelName: string
    token: string
    uid: number
    otherPartyName: string
    role: 'caller' | 'receiver'
  }
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
