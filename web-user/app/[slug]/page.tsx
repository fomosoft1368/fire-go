import type { Metadata } from 'next'
import { SERVICES } from '@/lib/data/services'
import { CheckCircle, ArrowRight } from 'lucide-react'
import AppDownloadButtons from '@/components/ui/AppDownloadButtons'
import Link from 'next/link'
import {
  getPricingConfig,
  getShareRidePricePerKm,
  getHireDriverBaseFee,
  getDeliveryPricePerKm,
} from '@/lib/api/pricing'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const service = SERVICES.find(s => s.slug === slug)
  if (!service) return {}
  return {
    title: service.seo.title,
    description: service.seo.description,
    keywords: service.seo.keywords,
    openGraph: {
      title: service.seo.title,
      description: service.seo.description,
      type: 'website',
    },
  }
}

export function generateStaticParams() {
  return SERVICES.map(s => ({ slug: s.slug }))
}

export default async function ServicePage({ params }: Props) {
  const { slug } = await params
  const service = SERVICES.find(s => s.slug === slug)

  // Fetch giá động từ backend
  const pricingConfig = await getPricingConfig()
  const dynamicPricing = pricingConfig
    ? {
        'ghep-xe': { base: getShareRidePricePerKm(pricingConfig), perKm: 0, unit: 'km' },
        'lai-ho': { base: getHireDriverBaseFee(pricingConfig), perKm: pricingConfig.hireDriverPricing?.find(v => v.vehicleType === 'sedan')?.pricePerExtraKm ?? 0, unit: 'chuyến' },
        'van-chuyen': { base: getDeliveryPricePerKm(pricingConfig), perKm: 0, unit: 'km' },
        've-sinh': { base: 120000, perKm: 0, unit: 'giờ' },
      }
    : null
  const activePricing = dynamicPricing?.[slug as keyof typeof dynamicPricing] ?? {
    base: service?.pricing.base ?? 0,
    perKm: service?.pricing.perKm ?? 0,
    unit: service?.pricing.unit ?? 'km',
  }

  if (!service) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-4xl mb-4">😕</p>
          <h1 className="text-2xl font-800 text-slate-900 mb-2">Không tìm thấy dịch vụ</h1>
          <Link href="/" className="btn-primary">Về trang chủ</Link>
        </div>
      </div>
    )
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: service.name,
    description: service.longDescription,
    provider: { '@type': 'LocalBusiness', name: 'FireGo', url: 'https://firego.vn' },
    areaServed: ['Vinh', 'Nghệ An'],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Breadcrumb */}
      <div className="bg-white border-b border-slate-100 py-3 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-sm text-slate-500">
          <Link href="/" className="hover:text-orange-500 transition-colors">Trang chủ</Link>
          <span className="mx-2">/</span>
          <span className={`font-600 ${service.textColor}`}>{service.name}</span>
        </div>
      </div>

      {/* Hero */}
      <section className={`py-20 bg-gradient-to-br ${service.color} relative overflow-hidden`}>
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-2xl">
            <div className="text-7xl mb-6 animate-float">{service.emoji}</div>
            <h1 className="text-4xl sm:text-5xl font-900 text-white mb-4">{service.name}</h1>
            <p className="text-xl text-white/90 mb-3 font-600">{service.tagline}</p>
            <p className="text-white/80 leading-relaxed mb-8">{service.longDescription}</p>
            <AppDownloadButtons variant="large" />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="section-title mb-3">Tại sao chọn {service.name} của FireGo?</h2>
            <p className="section-subtitle">Những lợi ích nổi bật mà bạn sẽ nhận được</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {service.features.map((feature, i) => (
              <div key={i} className="card p-6 flex items-start gap-4">
                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${service.color} flex items-center justify-center shrink-0`}>
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-600 text-slate-800">{feature}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-16" style={{ background: 'linear-gradient(135deg, #FFF7ED, #FFFBF5)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="section-title mb-3">Bảng giá tham khảo</h2>
          <p className="section-subtitle mb-10">Giá minh bạch, không ẩn phí</p>
          <div className="max-w-md mx-auto bg-white rounded-3xl shadow-brand-lg p-8 border border-orange-100">
            <div className="text-5xl mb-4">{service.emoji}</div>
            <h3 className="text-xl font-800 text-slate-900 mb-2">{service.name}</h3>
            {activePricing.base > 0 && (
              <div className="mt-4 space-y-2 text-left">
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-slate-600 text-sm">Phí cơ bản</span>
                  <span className="font-700 text-orange-600">{activePricing.base.toLocaleString('vi-VN')}đ/{activePricing.unit}</span>
                </div>
                {activePricing.perKm > 0 && (
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                    <span className="text-slate-600 text-sm">Phí mỗi km thêm</span>
                    <span className="font-700 text-orange-600">{activePricing.perKm.toLocaleString('vi-VN')}đ/km</span>
                  </div>
                )}
              </div>
            )}
            <p className="text-xs text-slate-400 mt-4 mb-6">{service.pricing.note}</p>
            <AppDownloadButtons />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 gradient-hero">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-900 text-white mb-3">Sẵn sàng đặt {service.name}?</h2>
          <p className="text-orange-100 mb-6">Tải app FireGo và đặt dịch vụ trong vài giây!</p>
          <AppDownloadButtons variant="large" className="justify-center" />
        </div>
      </section>

      {/* Other services */}
      <section className="py-14 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl font-800 text-slate-900 mb-6 text-center">Khám phá thêm dịch vụ khác</h2>
          <div className="flex flex-wrap justify-center gap-3">
            {SERVICES.filter(s => s.id !== service.id).map(s => (
              <Link
                key={s.id}
                href={`/${s.slug}`}
                className={`flex items-center gap-2 ${s.bgColor} ${s.textColor} px-5 py-2.5 rounded-full font-600 text-sm hover:shadow-md transition-all hover:-translate-y-0.5`}
              >
                {s.emoji} {s.name} <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
