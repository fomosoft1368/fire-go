export * from './colors'
export * from './config'

export const API_BASE_URL = 'http://localhost:3000/api'

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
