import type { Metadata } from 'next'
import HeroSection from '@/components/home/HeroSection'
import ServicesOverview from '@/components/home/ServicesOverview'
import HowItWorks from '@/components/home/HowItWorks'
import PricingDemo from '@/components/home/PricingDemo'
import TestimonialSlider from '@/components/home/TestimonialSlider'
import AppDownloadCTA from '@/components/home/AppDownloadCTA'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export const metadata: Metadata = {
  title: 'FireGo – Ghép Xe, Lái Hộ, Vận Chuyển, Vệ Sinh Tại Vinh, Nghệ An',
  description: 'FireGo – Hệ sinh thái dịch vụ di động: ghép xe tiết kiệm, lái hộ an toàn, vận chuyển linh hoạt, vệ sinh chuyên nghiệp. Tải app ngay!',
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  name: 'FireGo',
  description: 'Hệ sinh thái dịch vụ di động: ghép xe, lái hộ, vận chuyển, vệ sinh',
  url: 'https://firego.vn',
  telephone: '09222.33.666',
    address: {
    '@type': 'PostalAddress',
    addressLocality: 'Vinh',
    addressRegion: 'Nghệ An',
    addressCountry: 'VN',
  },
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.9',
    reviewCount: '50000',
  },
}

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <HeroSection />
      <ServicesOverview />
      <HowItWorks />
      <PricingDemo />
      <TestimonialSlider />
      <AppDownloadCTA />

      {/* Partner CTA Banner */}
      <section className="py-16 bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-xl font-800 text-slate-900 mb-1">Bạn muốn trở thành đối tác FireGo?</h3>
            <p className="text-slate-500 text-sm">Thu nhập linh hoạt, lịch làm việc tự do, hỗ trợ 24/7.</p>
          </div>
          <Link href="/doi-tac" className="btn-primary shrink-0">
            Đăng ký làm đối tác <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </>
  )
}
