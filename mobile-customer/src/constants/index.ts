export * from './colors'
export * from './config'

<<<<<<< HEAD
// API Configuration - Sử dụng IP local network cho mobile development
// Android emulator: 10.0.2.2, iOS simulator: localhost, Physical device: IP máy thực
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://192.168.1.16:3000/api'
=======
// Note: API_BASE_URL is exported from ./config
>>>>>>> a157af2b83efad212d526bededc568d9cc216aeb

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
