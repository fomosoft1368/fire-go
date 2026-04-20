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
import ServicePageClient from '@/components/service/ServicePageClient'

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
      <ServicePageClient service={service} activePricing={activePricing} allServices={SERVICES} />
    </>
  )
}
