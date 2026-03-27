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
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'accepted' | 'arrived_at_pickup' | 'finding'
  pickupLocation: string
  dropoffLocation: string
  pickupDistrict?: string
  dropoffDistrict?: string
  distance?: string
  estimatedTime?: string
  estimatedFare: number
  actualFare?: number
  rideType: 'standard' | 'comfort' | 'xl' | 'hire' | 'share' | 'delivery' | 'hourly'
  driverName?: string
  driverRating?: number
  carPlate?: string
  bookingTime: string
  startTime?: string
  endTime?: string
  combinedTripId?: string
  deliveryId?: string
  hourlyServiceId?: string
}

// ============ CHUYẾN ĐI LIÊN TỈNH - Inter-Provincial Route Types ============
export interface InterProvincialRoute {
  id: string
  name: string
  origin: {
    city: string
    province: string
    coordinates: { lat: number; lng: number }
    radius: number
  }
  destination: {
    city: string
    province: string
    coordinates: { lat: number; lng: number }
    radius: number
  }
  fixedPrice: number
  vehicleType: string
  isActive: boolean
  description?: string
  estimatedDuration?: number
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
  RideTracking: { 
    rideId: string
    status?: string
    pickupLocation?: string
    dropoffLocation?: string
    driverName?: string
    carPlate?: string
    estimatedFare?: number
  }
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
    deliveryId?: string
    pickup: string
    dropoff: string
    pickupCoordinates: [number, number]
    dropoffCoordinates: [number, number]
    goodsType: string
    weight: string
    vehicle: string
    estimatedPrice: number
    distance?: string
    duration?: string
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
  ChatScreen: {
    driver: {
      id: string
      name: string
      phone?: string
      avatar?: string
      rating?: number
      totalRides?: number
      carType?: string
      licensePlate?: string
      carColor?: string
      distance?: number
      eta?: number
      email?: string
    }
    rideId?: string
    deliveryId?: string
    combinedTripId?: string
  }
  HourlyService: undefined
  BookRide: undefined
  HireDriver: undefined
  FindingService: {
    serviceId: string
    serviceType: 'hourly' | 'delivery' | 'ride'
  }
  ServiceDetail: {
    serviceId: string
    serviceType: 'hourly' | 'delivery' | 'ride'
  }
  CancelTrip: {
    tripId: string
    tripType: 'ride' | 'delivery' | 'combined_trip'
    tripDetails?: {
      pickupAddress?: string
      dropoffAddress?: string
    }
  }
  RatingDriver: {
    rideId: string
    tripType?: 'ride' | 'combined'
    driver?: {
      name: string
      avatar?: string
      carType?: string
      licensePlate?: string
    }
  }
  PrivacyPolicy: undefined
  TermsOfService: undefined
  Support: undefined
  Topup: undefined
  Withdraw: undefined
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
  autoAssign?: boolean
  depositAmount?: number // Tiền cọc cho chuyến đi xa (lái xe hộ)
}
