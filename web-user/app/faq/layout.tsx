import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Câu Hỏi Thường Gặp – FireGo',
  description: 'Giải đáp mọi thắc mắc về dịch vụ ghép xe, lái hộ, vận chuyển và vệ sinh của FireGo. Hỗ trợ 24/7.',
}

export default function FAQLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
