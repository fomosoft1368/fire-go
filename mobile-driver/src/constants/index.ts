export * from './colors'
export * from './config'

export const API_BASE_URL = 'http://localhost:3000/api'

export const RIDE_TYPES = {
  POOL: 'GHÉP XE',
  ASSIST: 'LAI XE HỘ',
  XL: 'XL',
} as const

export const FILTER_TYPES = {
  ALL: 'all',
  POOL: 'pool',
  ASSIST: 'assist',
} as const
