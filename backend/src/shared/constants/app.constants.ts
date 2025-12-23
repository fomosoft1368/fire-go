// Shared constants for all modules

// Driver Status
export const DRIVER_STATUS = {
  OFFLINE: 'offline',
  ONLINE: 'online',
  ON_TRIP: 'on_trip',
  BREAK: 'break',
} as const;

// Ride Status
export const RIDE_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

// Document Status
export const DOCUMENT_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
} as const;

// User Roles
export const USER_ROLES = {
  CUSTOMER: 'customer',
  DRIVER: 'driver',
  ADMIN: 'admin',
  SUPPORT: 'support',
} as const;

// Notification Types
export const NOTIFICATION_TYPE = {
  RIDE_REQUEST: 'ride_request',
  RIDE_ACCEPTED: 'ride_accepted',
  RIDE_STARTED: 'ride_started',
  RIDE_COMPLETED: 'ride_completed',
  RIDE_CANCELLED: 'ride_cancelled',
  PAYMENT_RECEIVED: 'payment_received',
  DRIVER_RATED: 'driver_rated',
  DRIVER_SUSPENDED: 'driver_suspended',
} as const;

// Review Type
export const REVIEW_TYPE = {
  DRIVER: 'driver',
  CUSTOMER: 'customer',
  RIDE: 'ride',
} as const;

// Pagination defaults
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

// Distance defaults (meters)
export const DISTANCE = {
  NEARBY_DEFAULT: 5000,
  NEARBY_MAX: 50000,
  MIN_MATCH_DISTANCE: 500,
} as const;

// Timeout (milliseconds)
export const TIMEOUT = {
  RIDE_ACCEPTANCE: 30000, // 30s
  DRIVER_PICKUP: 300000,  // 5m
  REQUEST_TIMEOUT: 60000, // 1m
} as const;
