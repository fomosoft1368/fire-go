// Server-side: dùng BACKEND_URL trực tiếp (không qua Next.js proxy)
// Tránh port conflict khi Next.js và NestJS cùng chạy local
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000'

export interface DistanceRange {
  id: string
  minKm: number
  maxKm: number  // -1 = vô hạn
  pricePerKm: number
}

export interface VehicleTypePrice {
  type: string
  name: string
  baseFee: number
  pricePerKm: number
  minimumFare: number
  distanceRanges: DistanceRange[]
}

export interface HireDriverPricingItem {
  vehicleType: string
  name: string
  openingFee: number
  freeKm: number
  pricePerExtraKm: number
  description?: string
}

export interface CarpoolDiscount {
  passengers: number
  discount: number  // phần trăm (0-100)
}

export interface PricingConfig {
  vehicleTypes: VehicleTypePrice[]
  hireDriverPricing: HireDriverPricingItem[]
  carpoolDiscounts: CarpoolDiscount[]
  peakMultiplier: number
  driverShare: number
}

export async function getPricingConfig(): Promise<PricingConfig | null> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/pricing/config`, {
      next: { revalidate: 300 }, // Cache 5 phút
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

/**
 * Tính giá progressive theo khoảng cách (giống backend).
 * Nếu không có distanceRanges thì dùng pricePerKm mặc định.
 */
export function calculateProgressivePrice(
  distance: number,
  vehicleConfig: VehicleTypePrice,
): number {
  if (!vehicleConfig.distanceRanges || vehicleConfig.distanceRanges.length === 0) {
    return distance * vehicleConfig.pricePerKm
  }

  const sortedRanges = [...vehicleConfig.distanceRanges].sort((a, b) => a.minKm - b.minKm)
  let totalPrice = 0
  let coveredDistance = 0

  for (const range of sortedRanges) {
    if (coveredDistance >= distance) break
    const rangeStart = range.minKm
    const rangeEnd = range.maxKm === -1 ? Infinity : range.maxKm
    if (distance <= rangeStart) continue

    const startKmInRange = Math.max(rangeStart, coveredDistance)
    const endKmInRange = Math.min(rangeEnd, distance)
    const distanceInRange = endKmInRange - startKmInRange
    if (distanceInRange <= 0) continue

    totalPrice += distanceInRange * range.pricePerKm
    coveredDistance += distanceInRange
  }

  return totalPrice
}

/**
 * Giá ghép xe "Từ" — baseFee của xe bike (rẻ nhất, 1 người không giảm).
 * Đây là phí mở cửa tối thiểu khách sẽ trả.
 * Unit: đ/km (hiển thị "Từ X đ/km")
 */
export function getShareRideStartingPrice(config: PricingConfig): number {
  // Ưu tiên xe bike (rẻ nhất), fallback sedan
  const bike = config.vehicleTypes?.find(v => v.type === 'bike')
  const sedan = config.vehicleTypes?.find(v => v.type === 'sedan')
  const vehicle = bike ?? sedan
  if (!vehicle) return 15000
  // Hiển thị giá/km dựa trên range đầu tiên (km gần)
  if (vehicle.distanceRanges && vehicle.distanceRanges.length > 0) {
    const sorted = [...vehicle.distanceRanges].sort((a, b) => a.minKm - b.minKm)
    return sorted[0].pricePerKm
  }
  return vehicle.pricePerKm
}

/** @deprecated dùng getShareRideStartingPrice thay thế */
export function getShareRidePricePerKm(config: PricingConfig): number {
  return getShareRideStartingPrice(config)
}

/**
 * Phí mở cửa lái hộ (sedan) — giá tối thiểu khi đặt lái hộ.
 * Bao gồm freeKm km đầu tiên.
 * Unit: đ/chuyến
 */
export function getHireDriverBaseFee(config: PricingConfig): number {
  const sedan = config.hireDriverPricing?.find(v => v.vehicleType === 'sedan')
  // Backend default: sedan = 100.000đ openingFee
  return sedan?.openingFee ?? 100000
}

/**
 * Giá vận chuyển "Từ" — baseFee của xe bike (rẻ nhất).
 * Unit: đ/km
 */
export function getDeliveryPricePerKm(config: PricingConfig): number {
  const bike = config.vehicleTypes?.find(v => v.type === 'bike')
  const truck = config.vehicleTypes?.find(v => v.type === 'truck')
  const vehicle = bike ?? truck
  if (!vehicle) return 15000
  if (vehicle.distanceRanges && vehicle.distanceRanges.length > 0) {
    const sorted = [...vehicle.distanceRanges].sort((a, b) => a.minKm - b.minKm)
    return sorted[0].pricePerKm
  }
  return vehicle.pricePerKm
}
