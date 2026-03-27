import { NextRequest, NextResponse } from 'next/server'
import { SERVICES } from '@/lib/data/services'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { service: serviceId, distance = 5, hours = 2 } = body

    const service = SERVICES.find(s => s.id === serviceId)
    if (!service) {
      return NextResponse.json({ error: 'Dịch vụ không hợp lệ' }, { status: 400 })
    }

    let estimated: number

    if (service.pricing.unit === 'giờ') {
      estimated = service.pricing.base * Math.max(1, Math.min(hours, 24))
    } else {
      const km = Math.max(1, Math.min(distance, 200))
      estimated = service.pricing.base + service.pricing.perKm * km
      // 20% surge during rush hours (mocked)
      const now = new Date()
      const hour = now.getHours()
      if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) {
        if (serviceId !== 'ghep-xe') {
          estimated = Math.round(estimated * 1.2)
        }
      }
    }

    // Round to thousands
    estimated = Math.round(estimated / 1000) * 1000

    return NextResponse.json({
      success: true,
      service: service.name,
      estimated,
      currency: 'VND',
      note: service.pricing.note,
      breakdown: {
        base: service.pricing.base,
        perUnit: service.pricing.perKm,
        unit: service.pricing.unit,
        quantity: service.pricing.unit === 'giờ' ? hours : distance,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Lỗi hệ thống' }, { status: 500 })
  }
}
