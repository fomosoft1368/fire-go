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
  // ============ GIAO HÀNG - Delivery Config ============
  deliveryGoodsTypes?: Array<{ key: string; label: string; icon: string; surcharge: number }>
  deliveryWeightRanges?: Array<{ key: string; label: string; surcharge: number }>
  deliveryVehicleTypes?: Array<{ key: string; label: string; description: string; icon: string; vehicleTypeMapping: string }>
  // ============ LÁI XE HỘ - Hire Driver Config ============
  hireDriverPricing?: Array<{
    vehicleType: string
    name: string
    openingFee: number
    freeKm: number
    pricePerExtraKm: number
    description?: string
  }>
}

interface FareBreakdown {
  rawPrice: number
  basePrice: number
  finalPrice: number
  isPeakTime: boolean
  peakMultiplier: number // ✅ 1.0 (giờ thường), 1.3 (sáng), 1.5 (chiều)
  discountApplied: number
  vehicleType: string
}

// ============ LÁI XE HỘ - Hire Driver Fare Breakdown ============
interface HireDriverFareBreakdown {
  total: number
  openingFee: number
  freeKm: number
  extraKm: number
  extraKmFee: number
  pricePerExtraKm: number
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
      type: 'bike',
      name: 'Xe máy',
      baseFee: 15000,
      pricePerKm: 1500,
      minimumFare: 20000,
    },
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
 * Trả về { isPeak, multiplier } - multiplier từ peakHours array (1.3 sáng, 1.5 chiều)
 */
export const isPeakHour = async (date: Date = new Date()): Promise<{ isPeak: boolean; multiplier: number }> => {
  const config = await getPricingConfig()
  const timeString = date.toTimeString().substring(0, 5) // HH:mm
  
  // Tìm khung giờ cao điểm phù hợp với multiplier riêng
  const peakRange = config.peakHours.find((peak) => {
    return timeString >= peak.startTime && timeString <= peak.endTime
  })
  
  if (peakRange) {
    console.log('🕒 [isPeakHour] In peak range:', {
      currentTime: timeString,
      rangeName: peakRange.name,
      multiplier: peakRange.multiplier,
    })
    return { isPeak: true, multiplier: peakRange.multiplier }
  }
  
  console.log('🕒 [isPeakHour] NOT in peak range:', { currentTime: timeString })
  return { isPeak: false, multiplier: 1.0 }
}

/**
 * CÔNG THỨC TÍNH GIÁ MỚI (THEO TÀI LIỆU)
 * 
 * BƯỚC 1: raw_price = (distance × price_per_km) + base_fee
 * BƯỚC 2: base_price = isPeakTime ? raw_price × peak_multiplier : raw_price
 * BƯỚC 3: final_price = base_price × (1 - discount_rate[N])
 * BƯỚC 4: Áp dụng minimum_fare
 * 
 * ⚠️ NGHIỆP VỤ GHÉP XE:
 * - Mỗi khách có hệ số peak riêng (đóng băng tại thời điểm đặt)
 * - Khi có khách mới ghép, chỉ tính lại discount, KHÔNG đổi hệ số peak của khách cũ
 */
export const calculateFare = async (
  distance: number, // km
  carType: 'bike' | 'sedan' | 'suv' | 'truck' = 'sedan', // ============ GIAO HÀNG - Added bike ============
  totalPassengers: number = 1, // Tổng số người ghép trong chuyến
  isPeakTime?: boolean, // Hệ số peak của khách này (nếu undefined sẽ tự động check)
  peakMultiplier?: number // Multiplier cụ thể (1.0, 1.3, 1.5) - dùng cho khách cũ
): Promise<FareBreakdown> => {
  const config = await getPricingConfig()
  
  // Lấy config cho loại xe
  const vehicleConfig = config.vehicleTypes.find(v => v.type === carType)
  if (!vehicleConfig) {
    throw new Error(`Vehicle type ${carType} not found`)
  }

  console.log('💰 [calculateFare] CALCULATION:', {
    distance: distance + ' km',
    carType,
    baseFee: vehicleConfig.baseFee,
    pricePerKm: vehicleConfig.pricePerKm,
    minimumFare: vehicleConfig.minimumFare,
    totalPassengers,
    isPeakTime: isPeakTime !== undefined ? isPeakTime : 'auto-check',
    peakMultiplier: peakMultiplier || 'auto-check',
  })

  // ✅ Validation: distance should be 0-1000 km (anything above is wrong)
  if (distance > 10000) {
    console.error('❌ [calculateFare] INVALID DISTANCE:', distance, 'km - this looks like it was passed in meters! Converting...')
    // Attempt recovery: if distance looks like meters (> 1000km), convert it
    // But this should NOT happen - the bug should be fixed upstream
    console.warn('⚠️ [calculateFare] WARNING: Distance passed in wrong unit. This should be fixed in RideSharing.tsx')
  }

  // BƯỚC 1: Tính raw_price
  const rawPrice = distance * vehicleConfig.pricePerKm + vehicleConfig.baseFee
  console.log('  Step 1 (raw_price):', `${distance} × ${vehicleConfig.pricePerKm} + ${vehicleConfig.baseFee} = ${rawPrice}`)

  // BƯỚC 2: Xác định peak multiplier
  let actualMultiplier = 1.0
  let isPeak = false

  if (peakMultiplier !== undefined) {
    // ✅ Nếu truyền vào multiplier cụ thể (cho khách cũ)
    actualMultiplier = peakMultiplier
    isPeak = peakMultiplier > 1.0
  } else if (isPeakTime !== undefined) {
    // ✅ Nếu truyền isPeakTime boolean
    if (isPeakTime) {
      // Lấy multiplier từ config hiện tại
      const peakInfo = await isPeakHour()
      actualMultiplier = peakInfo.multiplier
      isPeak = true
    }
  } else {
    // ✅ Tự động check giờ hiện tại
    const peakInfo = await isPeakHour()
    isPeak = peakInfo.isPeak
    actualMultiplier = peakInfo.multiplier
  }

  const basePrice = rawPrice * actualMultiplier
  console.log('  Step 2 (base_price):', isPeak ? `${rawPrice} × ${actualMultiplier} = ${basePrice} (PEAK ${actualMultiplier})` : `${basePrice} (no peak)`)

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

  // Làm tròn lên nghìn
  const roundedFinalPrice = Math.ceil(finalPrice / 1000) * 1000

  const result = {
    rawPrice: Math.round(rawPrice),
    basePrice: Math.round(basePrice),
    finalPrice: roundedFinalPrice,
    isPeakTime: isPeak,
    peakMultiplier: actualMultiplier, // ✅ Thêm field này
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
// export const calculateCarpoolFares = async (
//   passengers: Array<{ distance: number; isPeakTime?: boolean }>,
//   carType: 'bike' | 'sedan' | 'suv' | 'truck' = 'sedan' // ============ GIAO HÀNG - Added bike ============
// ): Promise<{
//   breakdown: FareBreakdown[]
//   totalPrice: number
//   averagePerPerson: number
// }> => {
//   const config = await getPricingConfig()
//   const vehicleConfig = config.vehicleTypes.find(v => v.type === carType)
//   if (!vehicleConfig) {
//     throw new Error(`Vehicle type ${carType} not found`)
//   }

//   const totalPassengers = passengers.length
  
//   // Tìm discount rate
//   const discountConfig = config.carpoolDiscounts.find(
//     d => d.passengers === totalPassengers
//   )
//   const discountRate = discountConfig ? discountConfig.discount / 100 : 0

//   const breakdown: FareBreakdown[] = []
//   let totalPrice = 0

//   for (const passenger of passengers) {
//     // BƯỚC 1: raw_price
//     const rawPrice = passenger.distance * vehicleConfig.pricePerKm + vehicleConfig.baseFee

//     // BƯỚC 2: base_price
//     const isPeak = passenger.isPeakTime !== undefined 
//       ? passenger.isPeakTime 
//       : await isPeakHour()
//     const basePrice = isPeak ? rawPrice * config.peakMultiplier : rawPrice

//     // BƯỚC 3: final_price
//     let finalPrice = basePrice * (1 - discountRate)

//     // BƯỚC 4: minimum fare
//     if (finalPrice < vehicleConfig.minimumFare) {
//       finalPrice = vehicleConfig.minimumFare
//     }

//     // Làm tròn lên nghìn
//     const roundedFinalPrice = Math.ceil(finalPrice / 1000) * 1000

//     breakdown.push({
//       rawPrice: Math.round(rawPrice),
//       basePrice: Math.round(basePrice),
//       finalPrice: roundedFinalPrice,
//       isPeakTime: isPeak,
//       discountApplied: Math.round(discountRate * 100),
//       vehicleType: carType,
//     })

//     totalPrice += roundedFinalPrice
//   }

//   return {
//     breakdown,
//     totalPrice,
//     averagePerPerson: Math.round(totalPrice / totalPassengers),
//   }
// }
 //=========== TÍNH GIÁ GHÉP XE - Calculate Carpool Fares ============
export const calculateCarpoolFares = async (
  passengers: Array<{ distance: number; isPeakTime?: boolean; peakMultiplier?: number }>,
  carType: 'bike' | 'sedan' | 'suv' | 'truck' = 'sedan'
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

  // Tìm discount rate theo số người hiện tại
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
    // ✅ Dùng peakMultiplier đã lưu (1.0, 1.3, 1.5), KHÔNG check lại
    const actualMultiplier = passenger.peakMultiplier ?? 1.0
    const isPeak = actualMultiplier > 1.0
    const basePrice = rawPrice * actualMultiplier

    // BƯỚC 3: final_price (áp dụng discount theo số người hiện tại)
    let finalPrice = basePrice * (1 - discountRate)

    // BƯỚC 4: minimum fare
    if (finalPrice < vehicleConfig.minimumFare) {
      finalPrice = vehicleConfig.minimumFare
    }

    // Làm tròn lên nghìn
    const roundedFinalPrice = Math.ceil(finalPrice / 1000) * 1000

    breakdown.push({
      rawPrice: Math.round(rawPrice),
      basePrice: Math.round(basePrice),
      finalPrice: roundedFinalPrice,
      isPeakTime: isPeak,
      peakMultiplier: actualMultiplier, // ✅ Thêm vào breakdown
      discountApplied: Math.round(discountRate * 100),
      vehicleType: carType,
    })

    totalPrice += roundedFinalPrice
  }

  return {
    breakdown,
    totalPrice,
    averagePerPerson: Math.round(totalPrice / totalPassengers),
  }
}
/**
 * ============ LÁI XE HỘ - Calculate Hire Driver Fare ============
 * Tính giá lái xe hộ theo nghiệp vụ:
 * - Phí mở cửa (bao gồm km miễn phí)
 * - Phí vượt km (nếu vượt quá km miễn phí)
 * 
 * VD: Phí mở cửa 100k (10km đầu) + 10k/km vượt
 *     Đi 15km = 100k + (15-10) × 10k = 150k
 */
export const calculateHireDriverFare = async (
  distance: number,
  vehicleType: 'bike' | 'sedan' | 'suv' | 'truck' = 'sedan'
): Promise<HireDriverFareBreakdown> => {
  try {
    // Load config from cache or API
    const config = await getPricingConfig()

    // Find hire driver config for vehicle type
    const hireConfig = config.hireDriverPricing?.find(
      (h) => h.vehicleType === vehicleType
    )

    if (!hireConfig) {
      // Fallback to default
      const defaults: any = {
        bike: { openingFee: 50000, freeKm: 5, pricePerExtraKm: 5000 },
        sedan: { openingFee: 100000, freeKm: 10, pricePerExtraKm: 10000 },
        suv: { openingFee: 150000, freeKm: 10, pricePerExtraKm: 15000 },
        truck: { openingFee: 200000, freeKm: 10, pricePerExtraKm: 20000 },
      }
      const fallback = defaults[vehicleType] || defaults.sedan

      const extraKm = Math.max(0, distance - fallback.freeKm)
      const extraKmFee = extraKm * fallback.pricePerExtraKm
      const rawTotal = fallback.openingFee + extraKmFee
      const total = Math.ceil(rawTotal / 1000) * 1000 // Làm tròn lên nghìn

      console.log('[HireDriver] Using fallback config:', { vehicleType, ...fallback, distance, extraKm, rawTotal, total })

      return {
        total,
        openingFee: fallback.openingFee,
        freeKm: fallback.freeKm,
        extraKm,
        extraKmFee,
        pricePerExtraKm: fallback.pricePerExtraKm,
        vehicleType,
      }
    }

    // Calculate using config
    const extraKm = Math.max(0, distance - hireConfig.freeKm)
    const extraKmFee = extraKm * hireConfig.pricePerExtraKm
    const rawTotal = hireConfig.openingFee + extraKmFee
    const total = Math.ceil(rawTotal / 1000) * 1000 // Làm tròn lên nghìn

    console.log('[HireDriver] Calculated fare:', {
      vehicleType,
      distance,
      openingFee: hireConfig.openingFee,
      freeKm: hireConfig.freeKm,
      extraKm,
      extraKmFee,
      rawTotal,
      total,
    })

    return {
      total,
      openingFee: hireConfig.openingFee,
      freeKm: hireConfig.freeKm,
      extraKm,
      extraKmFee,
      pricePerExtraKm: hireConfig.pricePerExtraKm,
      vehicleType,
    }
  } catch (error) {
    console.error('[HireDriver] Error calculating fare:', error)
    
    // Emergency fallback
    const defaults: any = {
      bike: { openingFee: 50000, freeKm: 5, pricePerExtraKm: 5000 },
      sedan: { openingFee: 100000, freeKm: 10, pricePerExtraKm: 10000 },
      suv: { openingFee: 150000, freeKm: 10, pricePerExtraKm: 15000 },
      truck: { openingFee: 200000, freeKm: 10, pricePerExtraKm: 20000 },
    }
    const fallback = defaults[vehicleType] || defaults.sedan
    const extraKm = Math.max(0, distance - fallback.freeKm)
    const extraKmFee = extraKm * fallback.pricePerExtraKm
    const rawTotal = fallback.openingFee + extraKmFee
    const total = Math.ceil(rawTotal / 1000) * 1000 // Làm tròn lên nghìn

    return {
      total,
      openingFee: fallback.openingFee,
      freeKm: fallback.freeKm,
      extraKm,
      extraKmFee,
      pricePerExtraKm: fallback.pricePerExtraKm,
      vehicleType,
    }
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


