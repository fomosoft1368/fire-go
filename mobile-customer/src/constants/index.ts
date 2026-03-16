export * from './colors'
export * from './config'

// Note: API_BASE_URL is exported from ./config

export const RIDE_TYPES = {
  STANDARD: 'Tiêu chuẩn',
  COMFORT: 'Thoải mái',
  XL: 'Xe lớn',
} as const

export const FILTER_TYPES = {
  ALL: 'all',
  ONGOING: 'ongoing',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const
