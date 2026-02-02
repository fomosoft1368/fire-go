import { API_BASE_URL } from '../constants'
/**
 * Pricing Calculation Utilities
 * Tính giá cước dựa trên khoảng cách và giờ cao điểm (KHÔNG tính thời gian)
 * Logic ghép xe: giảm giá theo số người
 */

// Config từ backend API
interface VehicleTypePrice {
  type: string
  name: string
  baseFee: number
  pricePerKm: number
  minimumFare: number
}

interface CarpoolDiscount {
  passengers: number
  discount: number
}

interface PeakHour {
  id: string
  name: string
  startTime: string
  endTime: string
  multiplier: number
}

interface PricingConfig {
  vehicleTypes: VehicleTypePrice[]
  peakMultiplier: number
  driverShare: number
  maxDiscountRate: number
  carpoolDiscounts: CarpoolDiscount[]
  peakHours: PeakHour[]
}

interface FareBreakdown {
  rawPrice: number
  basePrice: number
  finalPrice: number
  isPeakTime: boolean
  discountApplied: number
  vehicleType: string
}

// Cache config để tránh gọi API liên tục
let cachedConfig: PricingConfig | null = null
let lastFetchTime: number = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 phút

/**
 * Lấy pricing config từ backend
 */
export const getPricingConfig = async (): Promise<PricingConfig> => {
  const now = Date.now()
  
  // Return cache nếu còn valid
  if (cachedConfig && now - lastFetchTime < CACHE_DURATION) {
    console.log('📦 [Pricing] Using CACHED config:', {
      sedan_pricePerKm: cachedConfig.vehicleTypes.find(v => v.type === 'sedan')?.pricePerKm,
      cacheAge: Math.round((now - lastFetchTime) / 1000) + 's'
    })
    return cachedConfig
  }

  try {
    console.log('🌐 [Pricing] Fetching from API:', `${API_BASE_URL}/pricing/config`)
    const response = await fetch(`${API_BASE_URL}/pricing/config`, {
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    console.log('📡 [Pricing] API Response:', response.status, response.ok ? 'OK' : 'FAILED')
    
    if (!response.ok) {
      throw new Error('Failed to fetch pricing config')
    }
    
    const config = await response.json()
    console.log('✅ [Pricing] Got config from BACKEND:', {
      sedan_baseFee: config.vehicleTypes?.find((v: any) => v.type === 'sedan')?.baseFee,
      sedan_pricePerKm: config.vehicleTypes?.find((v: any) => v.type === 'sedan')?.pricePerKm,
      sedan_minimumFare: config.vehicleTypes?.find((v: any) => v.type === 'sedan')?.minimumFare,
    })
    cachedConfig = config
    lastFetchTime = now
    
    return config
  } catch (error) {
    // Chỉ log nếu không phải network error
    if (!(error instanceof TypeError && error.message === 'Network request failed')) {
      console.warn('⚠️ [Pricing] API unavailable, using DEFAULT config:', error)
    } else {
      console.warn('⚠️ [Pricing] Network failed, using DEFAULT config')
    }
    
    // Fallback to default config nếu API lỗi
    const defaultConfig = getDefaultConfig()
    console.log('📋 [Pricing] DEFAULT config:', {
      sedan_pricePerKm: defaultConfig.vehicleTypes.find(v => v.type === 'sedan')?.pricePerKm,
      note: 'THIS IS NOT FROM BACKEND!'
    })
    cachedConfig = defaultConfig
    lastFetchTime = now
    return defaultConfig
  }
}

/**
 * Clear cache - gọi khi cần force refresh config
 */
export const clearPricingCache = () => {
  console.log('🗑️ [Pricing] Cache cleared')
  cachedConfig = null
  lastFetchTime = 0
}

/**
 * Config mặc định (dùng khi API lỗi)
 */
const getDefaultConfig = (): PricingConfig => ({
  vehicleTypes: [
    {
      type: 'sedan',
      name: 'Sedan (4-5 chỗ)',
      baseFee: 20000,
      pricePerKm: 2000,
      minimumFare: 30000,
    },
    {
      type: 'suv',
      name: 'SUV (7 chỗ)',
      baseFee: 25000,
      pricePerKm: 3000,
      minimumFare: 40000,
    },
    {
      type: 'truck',
      name: 'Truck (Bán tải)',
      baseFee: 30000,
      pricePerKm: 4000,
      minimumFare: 50000,
    },
  ],
  peakMultiplier: 1.2,
  driverShare: 85,
  maxDiscountRate: 30,
  carpoolDiscounts: [
    { passengers: 1, discount: 0 },
    { passengers: 2, discount: 15 },
    { passengers: 3, discount: 25 },
    { passengers: 4, discount: 30 },
  ],
  peakHours: [
    {
      id: 'morning',
      name: 'Giờ cao điểm sáng',
      startTime: '07:00',
      endTime: '09:00',
      multiplier: 1.2,
    },
    {
      id: 'evening',
      name: 'Giờ cao điểm chiều',
      startTime: '17:00',
      endTime: '19:00',
      multiplier: 1.2,
    },
  ],
})

/**
 * Kiểm tra có phải giờ cao điểm không (theo config từ backend)
 */
export const isPeakHour = async (date: Date = new Date()): Promise<boolean> => {
  const config = await getPricingConfig()
  const timeString = date.toTimeString().substring(0, 5) // HH:mm
  
  return config.peakHours.some((peak) => {
    return timeString >= peak.startTime && timeString <= peak.endTime
  })
}

/**
 * CÔNG THỨC TÍNH GIÁ MỚI (THEO TÀI LIỆU)
 * 
 * BƯỚC 1: raw_price = (distance × price_per_km) + base_fee
 * BƯỚC 2: base_price = isPeakTime ? raw_price × peak_multiplier : raw_price
 * BƯỚC 3: final_price = base_price × (1 - discount_rate[N])
 * BƯỚC 4: Áp dụng minimum_fare
 */
export const calculateFare = async (
  distance: number, // km
  carType: 'sedan' | 'suv' | 'truck' = 'sedan',
  totalPassengers: number = 1, // Tổng số người ghép trong chuyến
  checkPeakTime: boolean = true // Có check giờ cao điểm không
): Promise<FareBreakdown> => {
  const config = await getPricingConfig()
  
  // Lấy config cho loại xe
  const vehicleConfig = config.vehicleTypes.find(v => v.type === carType)
  if (!vehicleConfig) {
    throw new Error(`Vehicle type ${carType} not found`)
  }

  console.log('💰 [calculateFare] CALCULATION:', {
    distance: distance + 'km',
    carType,
    baseFee: vehicleConfig.baseFee,
    pricePerKm: vehicleConfig.pricePerKm,
    minimumFare: vehicleConfig.minimumFare,
    totalPassengers,
  })

  // BƯỚC 1: Tính raw_price
  const rawPrice = distance * vehicleConfig.pricePerKm + vehicleConfig.baseFee
  console.log('  Step 1 (raw_price):', `${distance} × ${vehicleConfig.pricePerKm} + ${vehicleConfig.baseFee} = ${rawPrice}`)

  // BƯỚC 2: Tính base_price (áp dụng peak nếu cần)
  const isPeak = checkPeakTime ? await isPeakHour() : false
  const basePrice = isPeak ? rawPrice * config.peakMultiplier : rawPrice
  console.log('  Step 2 (base_price):', isPeak ? `${rawPrice} × ${config.peakMultiplier} = ${basePrice} (PEAK)` : `${basePrice} (no peak)`)

  // BƯỚC 3: Tìm discount rate theo số người
  const discountConfig = config.carpoolDiscounts.find(
    d => d.passengers === totalPassengers
  )
  const discountRate = discountConfig ? discountConfig.discount / 100 : 0
  console.log('  Step 3 (discount):', `${totalPassengers} people = ${discountRate * 100}% discount`)

  // Tính final_price
  let finalPrice = basePrice * (1 - discountRate)
  console.log('  Step 4 (final):', `${basePrice} × (1 - ${discountRate}) = ${finalPrice}`)

  // BƯỚC 4: Áp dụng minimum fare
  if (finalPrice < vehicleConfig.minimumFare) {
    console.log('  Step 5 (minimum):', `${finalPrice} < ${vehicleConfig.minimumFare}, using minimum`)
    finalPrice = vehicleConfig.minimumFare
  }

  const result = {
    rawPrice: Math.round(rawPrice),
    basePrice: Math.round(basePrice),
    finalPrice: Math.round(finalPrice),
    isPeakTime: isPeak,
    discountApplied: Math.round(discountRate * 100),
    vehicleType: carType,
  }
  console.log('✅ [calculateFare] RESULT:', result)
  
  return result
}

/**
 * Tính giá cho nhiều khách (ghép xe)
 * Trả về giá cho từng khách
 */
export const calculateCarpoolFares = async (
  passengers: Array<{ distance: number; isPeakTime?: boolean }>,
  carType: 'sedan' | 'suv' | 'truck' = 'sedan'
): Promise<{
  breakdown: FareBreakdown[]
  totalPrice: number
  averagePerPerson: number
}> => {
  const config = await getPricingConfig()
  const vehicleConfig = config.vehicleTypes.find(v => v.type === carType)
  if (!vehicleConfig) {
    throw new Error(`Vehicle type ${carType} not found`)
  }

  const totalPassengers = passengers.length
  
  // Tìm discount rate
  const discountConfig = config.carpoolDiscounts.find(
    d => d.passengers === totalPassengers
  )
  const discountRate = discountConfig ? discountConfig.discount / 100 : 0

  const breakdown: FareBreakdown[] = []
  let totalPrice = 0

  for (const passenger of passengers) {
    // BƯỚC 1: raw_price
    const rawPrice = passenger.distance * vehicleConfig.pricePerKm + vehicleConfig.baseFee

    // BƯỚC 2: base_price
    const isPeak = passenger.isPeakTime !== undefined 
      ? passenger.isPeakTime 
      : await isPeakHour()
    const basePrice = isPeak ? rawPrice * config.peakMultiplier : rawPrice

    // BƯỚC 3: final_price
    let finalPrice = basePrice * (1 - discountRate)

    // BƯỚC 4: minimum fare
    if (finalPrice < vehicleConfig.minimumFare) {
      finalPrice = vehicleConfig.minimumFare
    }

    breakdown.push({
      rawPrice: Math.round(rawPrice),
      basePrice: Math.round(basePrice),
      finalPrice: Math.round(finalPrice),
      isPeakTime: isPeak,
      discountApplied: Math.round(discountRate * 100),
      vehicleType: carType,
    })

    totalPrice += Math.round(finalPrice)
  }

  return {
    breakdown,
    totalPrice,
    averagePerPerson: Math.round(totalPrice / totalPassengers),
  }
}

/**
 * Format số tiền VNĐ
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount)
}

/**
 * Format khoảng cách
 */
export const formatDistance = (km: number): string => {
  if (km < 1) {
    return `${Math.round(km * 1000)}m`
  }
  return `${km.toFixed(1)}km`
}

/**
 * Format thời gian
 */
export const formatDuration = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes} phút`
  }
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours}h ${mins}p` : `${hours} giờ`
}
