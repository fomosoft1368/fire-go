/**
 * Pricing Calculation Utilities
 * Tính giá cước dựa trên khoảng cách, thời gian và các yếu tố khác
 */

interface PricingConfig {
  baseFare: number // Giá khởi điểm
  perKmRate: number // Giá/km
  perMinuteRate: number // Giá/phút
  surgePricing?: number // % tăng giá cao điểm (0-100)
  minimumFare?: number // Giá tối thiểu
}

interface FareBreakdown {
  baseFare: number
  distanceFare: number
  timeFare: number
  surgePricing: number
  subtotal: number
  total: number
}

// Cấu hình giá mặc định cho các loại xe
const PRICING_CONFIGS: Record<'sedan' | 'suv' | 'truck', PricingConfig> = {
  sedan: {
    baseFare: 20000, // 20k VNĐ
    perKmRate: 8000, // 8k/km
    perMinuteRate: 500, // 500đ/phút
    minimumFare: 30000, // 30k tối thiểu
  },
  suv: {
    baseFare: 30000, // 30k VNĐ
    perKmRate: 12000, // 12k/km
    perMinuteRate: 700, // 700đ/phút
    minimumFare: 50000, // 50k tối thiểu
  },
  truck: {
    baseFare: 40000, // 40k VNĐ
    perKmRate: 15000, // 15k/km
    perMinuteRate: 800, // 800đ/phút
    minimumFare: 60000, // 60k tối thiểu
  },
}

/**
 * Kiểm tra có phải giờ cao điểm không
 * Giờ cao điểm: 6h-9h sáng, 17h-20h chiều các ngày trong tuần
 */
export const isPeakHour = (date: Date = new Date()): boolean => {
  const hour = date.getHours()
  const day = date.getDay() // 0 = Sunday, 6 = Saturday

  // Cuối tuần không tính cao điểm
  if (day === 0 || day === 6) return false

  // Sáng 6h-9h hoặc chiều 17h-20h
  return (hour >= 6 && hour < 9) || (hour >= 17 && hour < 20)
}

/**
 * Tính toán chi tiết giá cước
 */
export const calculateFare = (
  distance: number, // km
  duration: number, // minutes
  carType: 'sedan' | 'suv' | 'truck' = 'sedan',
  customSurgePricing?: number // % tăng giá tùy chỉnh
): FareBreakdown => {
  const config = PRICING_CONFIGS[carType]

  // Tính các thành phần giá
  const baseFare = config.baseFare
  const distanceFare = Math.round(distance * config.perKmRate)
  const timeFare = Math.round(duration * config.perMinuteRate)

  const subtotal = baseFare + distanceFare + timeFare

  // Tính surge pricing
  let surgePricingPercent = customSurgePricing || 0

  // Nếu không có surge tùy chỉnh, kiểm tra giờ cao điểm
  if (!customSurgePricing && isPeakHour()) {
    surgePricingPercent = 20 // 20% tăng giá cao điểm
  }

  const surgePricing = Math.round((subtotal * surgePricingPercent) / 100)
  let total = subtotal + surgePricing

  // Áp dụng giá tối thiểu
  if (config.minimumFare && total < config.minimumFare) {
    total = config.minimumFare
  }

  return {
    baseFare,
    distanceFare,
    timeFare,
    surgePricing,
    subtotal,
    total,
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
