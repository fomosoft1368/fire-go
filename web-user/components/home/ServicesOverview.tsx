import Link from 'next/link'
import { ArrowRight, CheckCircle } from 'lucide-react'
import { SERVICES } from '@/lib/data/services'
import {
  getPricingConfig,
  getShareRidePricePerKm,
  getHireDriverBaseFee,
  getDeliveryPricePerKm,
} from '@/lib/api/pricing'

export default async function ServicesOverview() {
  const pricingConfig = await getPricingConfig()

  // Tính giá động từ API, fallback về giá mặc định trong SERVICES
  const dynamicPricing: Record<string, { base: number; unit: string }> = pricingConfig
    ? {
        'ghep-xe': { base: getShareRidePricePerKm(pricingConfig), unit: 'km' },
        'lai-ho': { base: getHireDriverBaseFee(pricingConfig), unit: 'chuyến' },
        'van-chuyen': { base: getDeliveryPricePerKm(pricingConfig), unit: 'km' },
        've-sinh': { base: 120000, unit: 'giờ' }, // Vệ sinh theo giờ, giữ nguyên
      }
    : {}

  return (
    <section className="py-20 bg-white" id="dich-vu">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-14">
          <span className="inline-block bg-orange-100 text-orange-700 text-xs font-700 uppercase tracking-wider px-3 py-1 rounded-full mb-4">
            4 dịch vụ toàn diện
          </span>
          <h2 className="section-title mb-4">
            Mọi nhu cầu trong một ứng dụng
          </h2>
          <p className="section-subtitle max-w-2xl mx-auto">
            FireGo cung cấp hệ sinh thái dịch vụ tiện ích cho cuộc sống hiện đại –
            từ di chuyển, vận chuyển đến vệ sinh nhà cửa.
          </p>
        </div>

        {/* Service cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {SERVICES.map((service) => {
            const price = dynamicPricing[service.id] ?? {
              base: service.pricing.base,
              unit: service.pricing.unit,
            }
            return (
              <Link
                key={service.id}
                href={`/${service.slug}`}
                className="card group p-6 flex flex-col hover:shadow-brand-lg cursor-pointer"
              >
                {/* Icon */}
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${service.color} flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition-transform shadow-lg`}>
                  {service.emoji}
                </div>

                {/* Content */}
                <h3 className="text-xl font-800 text-slate-900 mb-1">{service.name}</h3>
                <p className={`text-sm font-600 ${service.textColor} mb-3`}>{service.tagline}</p>
                <p className="text-sm text-slate-500 leading-relaxed mb-4 flex-1">{service.description}</p>

                {/* Top features */}
                <ul className="space-y-1.5 mb-5">
                  {service.features.slice(0, 3).map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                      <CheckCircle className={`w-3.5 h-3.5 ${service.textColor} mt-0.5 shrink-0`} />
                      {f}
                    </li>
                  ))}
                </ul>

                {/* Pricing hint - giá động từ API */}
                <div className={`${service.bgColor} rounded-xl px-3 py-2 mb-4`}>
                  <span className="text-xs text-slate-500">Từ </span>
                  <span className={`font-800 text-sm ${service.textColor}`}>
                    {price.base.toLocaleString('vi-VN')}đ/{price.unit}
                  </span>
                </div>

                {/* CTA link */}
                <div className={`flex items-center gap-1 text-sm font-700 ${service.textColor} group-hover:gap-2 transition-all`}>
                  Xem chi tiết <ArrowRight className="w-4 h-4" />
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
