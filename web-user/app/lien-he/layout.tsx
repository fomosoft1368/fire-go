import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Liên Hệ FireGo – Hỗ Trợ 24/7',
  description: 'Liên hệ với FireGo qua hotline, email hoặc chat trực tiếp. Đội ngũ hỗ trợ 24/7 luôn sẵn sàng giúp đỡ bạn.',
}

export default function LienHeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
