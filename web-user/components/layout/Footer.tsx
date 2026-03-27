import Link from 'next/link'
import { Flame, MapPin, Phone, Mail, MessageCircle } from 'lucide-react'

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  )
}

function YoutubeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  )
}

const services = [
  { href: '/ghep-xe', label: 'Ghép Xe' },
  { href: '/lai-ho', label: 'Lái Hộ' },
  { href: '/van-chuyen', label: 'Vận Chuyển' },
  { href: '/ve-sinh', label: 'Vệ Sinh' },
]

const links = [
  { href: '/doi-tac', label: 'Đăng ký Đối Tác' },
  { href: '/faq', label: 'Câu hỏi thường gặp' },
  { href: '/lien-he', label: 'Liên hệ' },
]

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 gradient-primary rounded-xl flex items-center justify-center">
                <Flame className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-extrabold">
                <span className="text-orange-400">Fire</span>Go
              </span>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed mb-4">
              Hệ sinh thái dịch vụ di động toàn diện. Ghép xe, lái hộ, vận chuyển và vệ sinh – mọi nhu cầu trong một app.
            </p>
            <div className="space-y-2 text-sm text-slate-400">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-orange-400 shrink-0" />
                <span>Số 9, Giáng Hương 3, Vinh Heritage, Nghệ An, Việt Nam</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-orange-400 shrink-0" />
                <a href="tel:0922233666" className="hover:text-orange-400 transition-colors">09222.33.666</a>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-orange-400 shrink-0" />
                <a href="mailto:support@firego.vn" className="hover:text-orange-400 transition-colors">support@firego.vn</a>
              </div>
            </div>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-white font-700 mb-4 text-base">Dịch vụ</h3>
            <ul className="space-y-2">
              {services.map((s) => (
                <li key={s.href}>
                  <Link href={s.href} className="text-slate-400 hover:text-orange-400 text-sm transition-colors">
                    {s.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-white font-700 mb-4 text-base">Hỗ trợ</h3>
            <ul className="space-y-2">
              {links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-slate-400 hover:text-orange-400 text-sm transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/chinh-sach-bao-mat" className="text-slate-400 hover:text-orange-400 text-sm transition-colors">Chính sách bảo mật</Link>
              </li>
              <li>
                <Link href="/dieu-khoan-su-dung" className="text-slate-400 hover:text-orange-400 text-sm transition-colors">Điều khoản sử dụng</Link>
              </li>
            </ul>
          </div>

          {/* Social + App */}
          <div>
            <h3 className="text-white font-700 mb-4 text-base">Tải ứng dụng</h3>
            <div className="space-y-3 mb-6">
              <a
                href={process.env.NEXT_PUBLIC_APP_STORE_URL || '#'}
                className="flex items-center gap-3 bg-white/10 hover:bg-white/20 rounded-xl px-4 py-2.5 transition-all group"
              >
                <svg className="w-6 h-6 shrink-0" viewBox="0 0 384 512" fill="currentColor">
                  <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/>
                </svg>
                <div>
                  <div className="text-xs text-slate-300">Tải trên</div>
                  <div className="text-sm font-700 text-white">App Store</div>
                </div>
              </a>
              <a
                href={process.env.NEXT_PUBLIC_GOOGLE_PLAY_URL || '#'}
                className="flex items-center gap-3 bg-white/10 hover:bg-white/20 rounded-xl px-4 py-2.5 transition-all group"
              >
                <svg className="w-6 h-6 shrink-0" viewBox="0 0 512 512">
                  <path fill="#0268D6" d="M37.8 45.4C30.6 51 26 59.8 26 71.4v369.2c0 11.6 4.5 20.3 11.7 26.1l4 2.8 206.6-206.7-1.1-1.2-205.4-205.5-4-10.7z"/>
                  <path fill="#FFC107" d="M331 161.5L247.2 245.3 248.3 246.4l82.7 82.7 3.3-1.8 98.4-56c28.2-16 28.2-42.3 0-58.4L334.3 157l-3.3 4.5z"/>
                  <path fill="#F44336" d="M331 329l-82.7-82.7-206.6 206.7C52.7 464 68 466.8 86 456.6L331 329z"/>
                  <path fill="#4CAF50" d="M86 55.4C68 45.2 52.7 48 41.7 59L248.3 264.6 331 181.9 86 55.4z"/>
                </svg>
                <div>
                  <div className="text-xs text-slate-300">Tải trên</div>
                  <div className="text-sm font-700 text-white">Google Play</div>
                </div>
              </a>
            </div>
            <h3 className="text-white font-700 mb-3 text-base">Theo dõi chúng tôi</h3>
            <div className="flex gap-3">
              <a href="#" aria-label="Facebook FireGo" className="w-9 h-9 bg-white/10 hover:bg-orange-500 rounded-lg flex items-center justify-center transition-colors">
                <FacebookIcon />
              </a>
              <a href="#" aria-label="YouTube FireGo" className="w-9 h-9 bg-white/10 hover:bg-orange-500 rounded-lg flex items-center justify-center transition-colors">
                <YoutubeIcon />
              </a>
              <a href="#" aria-label="Chat trực tuyến" className="w-9 h-9 bg-white/10 hover:bg-orange-500 rounded-lg flex items-center justify-center transition-colors">
                <MessageCircle className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-slate-500">
          <p>© 2026 FireGo. Tất cả quyền được bảo lưu.</p>
          <p className="text-xs">Giấy phép kinh doanh số: 0312XXXXXXXX – Sở KHĐT TP.HCM</p>
        </div>
      </div>
    </footer>
  )
}
