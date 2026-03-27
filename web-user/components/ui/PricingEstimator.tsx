'use client'

import { useState } from 'react'
import { Calculator, MapPin, ArrowRight } from 'lucide-react'
import { SERVICES } from '@/lib/data/services'

export default function PricingEstimator() {
  const [serviceId, setServiceId] = useState('ghep-xe')
  const [distance, setDistance] = useState(5)
  const [hours, setHours] = useState(2)
  const [estimated, setEstimated] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  const service = SERVICES.find((s) => s.id === serviceId)!

  const handleEstimate = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/pricing/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service: serviceId, distance, hours }),
      })
      const data = await res.json()
      setEstimated(data.estimated)
    } catch {
      // fallback local calculation
      const s = SERVICES.find((sv) => sv.id === serviceId)!
      const price = s.pricing.unit === 'giờ'
        ? s.pricing.base * hours
        : s.pricing.base + s.pricing.perKm * distance
      setEstimated(price)
    }
    setLoading(false)
  }

  const isHourly = service.pricing.unit === 'giờ'

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-brand-lg border border-orange-100 max-w-xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center">
          <Calculator className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-800 text-slate-900 text-lg">Ước tính giá</h3>
          <p className="text-xs text-slate-500">Giá tham khảo, chưa bao gồm khuyến mãi</p>
        </div>
      </div>

      {/* Service select */}
      <div className="mb-4">
        <label className="block text-sm font-600 text-slate-700 mb-2">Dịch vụ</label>
        <div className="grid grid-cols-2 gap-2">
          {SERVICES.map((s) => (
            <button
              key={s.id}
              onClick={() => { setServiceId(s.id); setEstimated(null) }}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-600 transition-all ${
                serviceId === s.id
                  ? 'border-orange-500 bg-orange-50 text-orange-700'
                  : 'border-slate-200 text-slate-600 hover:border-orange-200 hover:bg-orange-50/50'
              }`}
            >
              <span>{s.emoji}</span>
              {s.name}
            </button>
          ))}
        </div>
      </div>

      {/* Distance / Hours input */}
      {isHourly ? (
        <div className="mb-4">
          <label className="block text-sm font-600 text-slate-700 mb-2">Số giờ</label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={1}
              max={8}
              value={hours}
              onChange={(e) => { setHours(Number(e.target.value)); setEstimated(null) }}
              className="flex-1 accent-orange-500"
            />
            <span className="w-14 text-center font-800 text-orange-600 text-lg">{hours}h</span>
          </div>
        </div>
      ) : (
        <div className="mb-4">
          <label className="flex items-center gap-1.5 text-sm font-600 text-slate-700 mb-2">
            <MapPin className="w-4 h-4 text-orange-500" />
            Khoảng cách (km)
          </label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={1}
              max={50}
              value={distance}
              onChange={(e) => { setDistance(Number(e.target.value)); setEstimated(null) }}
              className="flex-1 accent-orange-500"
            />
            <span className="w-14 text-center font-800 text-orange-600 text-lg">{distance}km</span>
          </div>
        </div>
      )}

      {/* Estimate button */}
      <button
        onClick={handleEstimate}
        disabled={loading}
        className="btn-primary w-full justify-center mb-4 disabled:opacity-60"
      >
        {loading ? 'Đang tính...' : 'Ước tính giá'}
        <ArrowRight className="w-4 h-4" />
      </button>

      {/* Result */}
      {estimated !== null && (
        <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-2xl p-4 border border-orange-100 text-center">
          <p className="text-sm text-slate-600 mb-1">Ước tính thanh toán</p>
          <p className="text-3xl font-900 text-orange-600">
            {estimated.toLocaleString('vi-VN')}đ
          </p>
          <p className="text-xs text-slate-400 mt-1">{service.pricing.note}</p>
        </div>
      )}
    </div>
  )
}
