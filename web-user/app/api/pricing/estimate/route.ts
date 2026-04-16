import { NextRequest, NextResponse } from 'next/server'
import {
  getPricingConfig,
  calculateProgressivePrice,
  VehicleTypePrice,
} from '@/lib/api/pricing'
import { SERVICES } from '@/lib/data/services'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000'

/**
 * POST /api/pricing/estimate
 * Ước tính giá dịch vụ — gọi backend để tính đúng theo progressive pricing.
 *
 * Body: { service: string, distance?: number, hours?: number }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { service: serviceId, distance = 5, hours = 2 } = body

    const service = SERVICES.find(s => s.id === serviceId)
    if (!service) {
      return NextResponse.json({ error: 'Dịch vụ không hợp lệ' }, { status: 400 })
    }

    const km = Math.max(1, Math.min(distance, 200))
    let estimated: number
    let breakdown: Record<string, unknown> = {}

    // ===== VỆ SINH: tính theo giờ, không cần backend =====
    if (serviceId === 've-sinh') {
      const h = Math.max(1, Math.min(hours, 24))
      estimated = service.pricing.base * h
      breakdown = { base: service.pricing.base, hours: h, unit: 'giờ' }
    }

    // ===== GHÉP XE: gọi backend /api/pricing/calculate =====
    else if (serviceId === 'ghep-xe') {
      try {
        const res = await fetch(`${BACKEND_URL}/api/pricing/calculate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            passengers: [
              {
                distance: km,
                vehicleType: 'sedan',
                isPeakTime: false,
                peakMultiplier: 1.0,
              },
            ],
          }),
        })
        if (res.ok) {
          const data = await res.json()
          // Đây là giá 1 người ghép (sedan), không có giảm giá (1 người = 0%)
          estimated = data.breakdown?.[0]?.finalPrice ?? data.totalPrice
          breakdown = {
            base: data.breakdown?.[0]?.rawPrice,
            finalPrice: estimated,
            vehicleType: 'sedan',
            distance: km,
            source: 'backend',
          }
        } else {
          throw new Error('Backend error')
        }
      } catch {
        // Fallback: tính local theo progressive pricing
        const config = await getPricingConfig()
        const sedan = config?.vehicleTypes?.find((v: VehicleTypePrice) => v.type === 'sedan')
        if (sedan) {
          const distancePrice = calculateProgressivePrice(km, sedan)
          estimated = Math.round(distancePrice + sedan.baseFee)
          if (estimated < sedan.minimumFare) estimated = sedan.minimumFare
        } else {
          estimated = service.pricing.base + service.pricing.perKm * km
        }
        breakdown = { source: 'local_fallback', distance: km }
      }
    }

    // ===== LÁI HỘ: gọi backend calculate-hire-driver-fare hoặc tính local =====
    else if (serviceId === 'lai-ho') {
      const config = await getPricingConfig()
      const sedan = config?.hireDriverPricing?.find(v => v.vehicleType === 'sedan')
      if (sedan) {
        const extraKm = Math.max(0, km - sedan.freeKm)
        estimated = Math.round(sedan.openingFee + extraKm * sedan.pricePerExtraKm)
        breakdown = {
          openingFee: sedan.openingFee,
          freeKm: sedan.freeKm,
          extraKm,
          pricePerExtraKm: sedan.pricePerExtraKm,
          total: estimated,
        }
      } else {
        // Fallback hardcoded backend defaults: sedan 100k mở cửa, 10km free, 10k/km
        const freeKm = 10
        const extraKm = Math.max(0, km - freeKm)
        estimated = Math.round(100000 + extraKm * 10000)
        breakdown = { openingFee: 100000, freeKm, extraKm, pricePerExtraKm: 10000 }
      }
    }

    // ===== VẬN CHUYỂN: tính theo progressive pricing (xe bike hoặc truck) =====
    else if (serviceId === 'van-chuyen') {
      const config = await getPricingConfig()
      const bike = config?.vehicleTypes?.find((v: VehicleTypePrice) => v.type === 'bike')
      const truck = config?.vehicleTypes?.find((v: VehicleTypePrice) => v.type === 'truck')
      const vehicle = bike ?? truck
      if (vehicle) {
        const distancePrice = calculateProgressivePrice(km, vehicle)
        estimated = Math.round(distancePrice + vehicle.baseFee)
        if (estimated < vehicle.minimumFare) estimated = vehicle.minimumFare
        breakdown = {
          vehicleType: vehicle.type,
          baseFee: vehicle.baseFee,
          distancePrice,
          distance: km,
        }
      } else {
        // Fallback hardcoded backend defaults: bike 15k mở cửa + 1.5k/km
        estimated = Math.round(15000 + km * 1500)
        breakdown = { source: 'default_fallback' }
      }
    }

    // ===== Fallback chung =====
    else {
      estimated = service.pricing.unit === 'giờ'
        ? service.pricing.base * Math.max(1, Math.min(hours, 24))
        : service.pricing.base + service.pricing.perKm * km
    }

    // Làm tròn nghìn
    estimated = Math.round(estimated / 1000) * 1000

    return NextResponse.json({
      success: true,
      service: service.name,
      estimated,
      currency: 'VND',
      note: service.pricing.note,
      breakdown,
    })
  } catch {
    return NextResponse.json({ error: 'Lỗi hệ thống' }, { status: 500 })
  }
}
