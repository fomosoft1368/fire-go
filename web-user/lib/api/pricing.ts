// Server-side: dùng BACKEND_URL trực tiếp (không qua Next.js proxy)
// Tránh port conflict khi Next.js và NestJS cùng chạy local
const BACKEND_URL = process.env.BACKEND_URL || 'http://192.168.1.14:3000'

export interface PricingConfig {
  vehicleTypes: {
    type: string
    name: string
    baseFee: number
    pricePerKm: number
    minimumFare: number
  }[]
  hireDriverPricing: {
    vehicleType: string
    name: string
    openingFee: number
    freeKm: number
    pricePerExtraKm: number
  }[]
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

/** Giá/km ghép xe (sedan) */
export function getShareRidePricePerKm(config: PricingConfig): number {
  const sedan = config.vehicleTypes?.find(v => v.type === 'sedan')
  return sedan?.pricePerKm ?? 15000
}

/** Phí mở cửa lái hộ (sedan) */
export function getHireDriverBaseFee(config: PricingConfig): number {
  const sedan = config.hireDriverPricing?.find(v => v.vehicleType === 'sedan')
  return sedan?.openingFee ?? 50000
}

/** Giá/km vận chuyển (truck hoặc sedan fallback) */
export function getDeliveryPricePerKm(config: PricingConfig): number {
  const truck = config.vehicleTypes?.find(v => v.type === 'truck')
  const sedan = config.vehicleTypes?.find(v => v.type === 'sedan')
  return truck?.pricePerKm ?? sedan?.pricePerKm ?? 20000
}
