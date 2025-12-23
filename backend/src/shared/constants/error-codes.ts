// Error codes and messages

export const ERROR_CODES = {
  // Auth errors
  AUTH_001: 'Invalid email or password',
  AUTH_002: 'User not found',
  AUTH_003: 'Email already registered',
  AUTH_004: 'Invalid token',
  AUTH_005: 'Token expired',
  AUTH_006: 'Unauthorized',
  AUTH_007: 'Forbidden',

  // Validation errors
  VAL_001: 'Invalid input',
  VAL_002: 'Required field missing',
  VAL_003: 'Invalid format',
  VAL_004: 'Invalid vehicle plate format',
  VAL_005: 'License number invalid',

  // Driver errors
  DRV_001: 'Driver not found',
  DRV_002: 'Driver suspended',
  DRV_003: 'Driver profile already exists',
  DRV_004: 'Invalid driver status',
  DRV_005: 'Documents not approved',

  // Ride errors
  RDE_001: 'Ride not found',
  RDE_002: 'Invalid ride status',
  RDE_003: 'No drivers available',
  RDE_004: 'Cannot cancel ride',

  // Customer errors
  CUS_001: 'Customer not found',
  CUS_002: 'Invalid customer data',

  // Wallet errors
  WAL_001: 'Wallet not found',
  WAL_002: 'Insufficient balance',
  WAL_003: 'Invalid payment amount',
  WAL_004: 'Transaction failed',

  // General errors
  ERR_001: 'Internal server error',
  ERR_002: 'Resource not found',
  ERR_003: 'Conflict',
  ERR_004: 'Bad request',
  ERR_005: 'Service unavailable',
} as const;

export const SUCCESS_MESSAGES = {
  AUTH_LOGIN: 'Login successful',
  AUTH_REGISTER: 'Registration successful',
  DRIVER_CREATED: 'Driver profile created',
  DRIVER_UPDATED: 'Driver profile updated',
  RIDE_CREATED: 'Ride created successfully',
  RIDE_COMPLETED: 'Ride completed',
  PAYMENT_SUCCESS: 'Payment processed successfully',
} as const;
