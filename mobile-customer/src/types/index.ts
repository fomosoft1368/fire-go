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

// Import ride types
export {  Driver, NearbyRide, RideRequest } from './ride'

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
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'accepted' | 'arrived_at_pickup'
  pickupLocation: string
  dropoffLocation: string
  pickupDistrict?: string
  dropoffDistrict?: string
  distance?: string
  estimatedTime?: string
  estimatedFare: number
  actualFare?: number
  rideType: 'standard' | 'comfort' | 'xl' | 'hire' | 'share'
  driverName?: string
  driverRating?: number
  carPlate?: string
  bookingTime: string
  startTime?: string
  endTime?: string
  combinedTripId?: string
}

// Notification Types
export interface Notification {
  _id: string
  title: string
  message: string
  description?: string
  type: string
  channels: string[]
  driverId?: string
  customerId?: string
  isRead: boolean
  sentAt?: string
  createdAt?: string
  actionUrl?: string
}

// Navigation Types
export type RootStackParamList = {
  Login: undefined
  Main: undefined
  Home: undefined
  Notifications: undefined
  NotificationDetailScreen: {
    notification: Notification
    onDelete?: () => void
  }
  Bookings: undefined
  Promotions: undefined
  Profile: undefined
  Notification: undefined
  RideDetail: { rideId: string }
  BookingDetail: { bookingId: string }
  RideBooking: { distance: number; duration: number; startLng: number; startLat: number; endLng: number; endLat: number; pickupAddress: string; dropoffAddress: string }
  RideTracking: { rideId: string }
  FindingRideScreen: { distance: number; duration: number; startLng: number; startLat: number; endLng: number; endLat: number; pickupAddress: string; dropoffAddress: string }
  RideDetailRequest: { rideId: string; ride: NearbyRide }
  DriverFound: { rideId?: string; combinedTripId?: string; tripType?: 'ride' | 'combined_trip' }
  EditProfile: undefined
  ChangePassword: undefined
  PaymentMethods: undefined
  TransactionHistory: undefined
  FullscreenMap: {
    pickupCoordinates?: [number, number]
    dropoffCoordinates?: [number, number]
    pickupCoords?: { latitude: number; longitude: number }
    dropoffCoords?: { latitude: number; longitude: number }
    routeCoordinates?: Array<{ latitude: number; longitude: number }>
    drivers?: any[]
    routeInfo?: any
  }
  Delivery: undefined
  ConfirmDelivery: {
    deliveryId: string
    pickup: string
    dropoff: string
    goodsType: string
    weight: string
    vehicle: string
    estimatedPrice: number
  }
  FindingDelivery: {
    deliveryId: string
    pickup: string
    dropoff: string
    goodsType: string
    weight: string
    vehicle: string
    estimatedPrice: number
    distance?: string
  }
  DeliveryTracking: {
    deliveryId: string
    driver?: {
      id: string
      name: string
      phone: string
      rating: number
      totalTrips: number
      vehiclePlate: string
      avatar?: string
    }
  }
  DeliveryCompleted: {
    deliveryId: string
    totalAmount?: number
    distance?: string
    duration?: string
    driver?: {
      id: string
      name: string
      phone: string
      rating: number
      totalTrips: number
    }
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
