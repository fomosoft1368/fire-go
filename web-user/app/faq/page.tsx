import type { Metadata } from 'next'
import { FAQ_ITEMS } from '@/lib/data/faq'
import FAQAccordion from '@/components/ui/FAQAccordion'
import Link from 'next/link'
import AppDownloadButtons from '@/components/ui/AppDownloadButtons'

export const metadata: Metadata = {
  title: 'Câu Hỏi Thường Gặp – FireGo',
  description: 'Giải đáp mọi thắc mắc về dịch vụ ghép xe, lái hộ, vận chuyển và vệ sinh của FireGo. Hỗ trợ 24/7.',
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQ_ITEMS.map(item => ({
    '@type': 'Question',
    name: item.question,
    acceptedAnswer: { '@type': 'Answer', text: item.answer },
  })),
}

export default function FAQPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="bg-gradient-to-br from-slate-800 to-slate-900 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="text-sm text-slate-400 mb-6">
            <Link href="/" className="hover:text-white">Trang chủ</Link>
            <span className="mx-2">/</span>
            <span className="text-white font-600">FAQ</span>
          </nav>
          <div className="text-center">
            <div className="text-5xl mb-4">❓</div>
            <h1 className="text-3xl sm:text-4xl font-900 text-white mb-3">Câu hỏi thường gặp</h1>
            <p className="text-slate-400 max-w-xl mx-auto">
              Không tìm được câu trả lời? Hãy liên hệ với chúng tôi qua{' '}
              <a href="tel:0922233666" className="text-orange-400 hover:text-orange-300 font-600">09222.33.666</a>
            </p>
          </div>
        </div>
      </div>

      <section className="py-14">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <FAQAccordion items={FAQ_ITEMS} />

          <div className="mt-14 bg-orange-50 rounded-3xl p-8 text-center border border-orange-100">
            <h3 className="font-800 text-slate-900 text-xl mb-2">Vẫn còn thắc mắc?</h3>
            <p className="text-slate-500 mb-6">Tải app để chat trực tiếp với đội hỗ trợ 24/7</p>
            <AppDownloadButtons className="justify-center" />
          </div>
        </div>
      </section>
    </>
  )
}
