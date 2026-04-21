import {
  getPricingConfig,
  getShareRideStartingPrice,
  getHireDriverBaseFee,
  getDeliveryPricePerKm,
} from '@/lib/api/pricing'
import { SERVICES } from '@/lib/data/services'
import ServicesGrid from '@/components/home/ServicesGrid'

export default async function ServicesOverview() {
  const pricingConfig = await getPricingConfig()

  const dynamicPricing: Record<string, { base: number; unit: string }> = pricingConfig
    ? {
        'ghep-xe': { base: getShareRideStartingPrice(pricingConfig), unit: 'km' },
        'lai-ho': { base: getHireDriverBaseFee(pricingConfig), unit: 'chuyến' },
        'van-chuyen': { base: getDeliveryPricePerKm(pricingConfig), unit: 'km' },
        've-sinh': { base: 120000, unit: 'giờ' },
      }
    : {}

  return (
    <section className="py-20 bg-white relative overflow-hidden" id="dich-vu">
      {/* Subtle 3D background decoration */}
      <div
        className="absolute bottom-0 left-0 right-0 h-64 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% 100%, rgba(249,115,22,0.05) 0%, transparent 70%)',
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="text-center mb-14">
          <span className="inline-block bg-orange-100 text-orange-700 text-xs font-700 uppercase tracking-wider px-3 py-1 rounded-full mb-4">
            4 dịch vụ toàn diện
          </span>
          <h2 className="section-title mb-4">Mọi nhu cầu trong một ứng dụng</h2>
          <p className="section-subtitle max-w-2xl mx-auto">
            FireGo cung cấp hệ sinh thái dịch vụ tiện ích cho cuộc sống hiện đại –
            từ di chuyển, vận chuyển đến vệ sinh nhà cửa.
          </p>
        </div>

        {/* 3D Service cards — client component */}
        <ServicesGrid services={SERVICES} dynamicPricing={dynamicPricing} />
      </div>
    </section>
  )
}
