import type { Metadata } from 'next'
import { Phone, Mail, MapPin, Clock, MessageCircle } from 'lucide-react'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Liên Hệ FireGo – Hỗ Trợ 24/7',
  description: 'Liên hệ với FireGo qua hotline, email hoặc chat trực tiếp. Đội ngũ hỗ trợ 24/7 luôn sẵn sàng giúp đỡ bạn.',
}

const contacts = [
  { icon: <Phone className="w-6 h-6" />, label: 'Hotline', value: '09222.33.666', href: 'tel:0922233666', color: 'bg-orange-50 text-orange-600' },
  { icon: <Mail className="w-6 h-6" />, label: 'Email', value: 'support@firego.vn', href: 'mailto:support@firego.vn', color: 'bg-blue-50 text-blue-600' },
  { icon: <MessageCircle className="w-6 h-6" />, label: 'Live Chat', value: 'Chat trong app', href: '#', color: 'bg-green-50 text-green-600' },
  { icon: <Clock className="w-6 h-6" />, label: 'Giờ hỗ trợ', value: '24/7 tất cả ngày', href: null, color: 'bg-purple-50 text-purple-600' },
]

export default function LienHePage() {
  return (
    <>
      <div className="gradient-primary py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="text-sm text-orange-200 mb-6">
            <Link href="/" className="hover:text-white">Trang chủ</Link>
            <span className="mx-2">/</span>
            <span className="text-white font-600">Liên hệ</span>
          </nav>
          <div className="text-center">
            <h1 className="text-4xl font-900 text-white mb-3">Liên hệ với chúng tôi</h1>
            <p className="text-orange-100 text-lg">Chúng tôi luôn sẵn sàng hỗ trợ bạn 24/7</p>
          </div>
        </div>
      </div>

      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {contacts.map((c, i) => (
              <div key={i} className="card p-6 text-center">
                <div className={`w-14 h-14 ${c.color} rounded-2xl flex items-center justify-center mx-auto mb-4`}>
                  {c.icon}
                </div>
                <h3 className="font-700 text-slate-800 mb-1">{c.label}</h3>
                {c.href ? (
                  <a href={c.href} className="text-sm text-orange-600 hover:underline font-600">{c.value}</a>
                ) : (
                  <p className="text-sm text-slate-500">{c.value}</p>
                )}
              </div>
            ))}
          </div>

          {/* Office info */}
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="section-title mb-4">Văn phòng FireGo</h2>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <MapPin className="w-5 h-5 text-orange-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-600 text-slate-800">Vinh, Nghệ An (Trụ sở chính)</p>
                    <p className="text-sm text-slate-500">Số 9, Giáng Hương 3, Khu đô thị Vinh Heritage, Phường Trường Vinh, Tỉnh Nghệ An</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <MapPin className="w-5 h-5 text-orange-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-600 text-slate-800">Hà Nội (Chi nhánh)</p>
                    <p className="text-sm text-slate-500">Quận Hoàn Kiếm, Hà Nội</p>
                  </div>
                </div>
              </div>
              <div className="mt-8 p-5 bg-orange-50 rounded-2xl border border-orange-100">
                <p className="font-700 text-orange-800 mb-1">🤝 Muốn hợp tác kinh doanh?</p>
                <p className="text-sm text-orange-700 mb-3">Gửi email về <a href="mailto:partner@firego.vn" className="underline">partner@firego.vn</a></p>
                <Link href="/doi-tac" className="btn-primary text-sm py-2 px-4">
                  Đăng ký đối tác
                </Link>
              </div>
            </div>
            <div className="bg-slate-100 rounded-3xl h-64 lg:h-80 flex items-center justify-center text-slate-400 text-sm">
              {/* Google Maps embed would go here */}
              <div className="text-center">
                <MapPin className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                <p>Bản đồ Google Maps</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
