import type { Metadata } from 'next'
import PartnerForm from '@/components/ui/PartnerForm'
import { CheckCircle } from 'lucide-react'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Đăng Ký Làm Đối Tác Tài Xế FireGo – Thu Nhập Linh Hoạt',
  description: 'Tham gia cộng đồng đối tác FireGo. Thu nhập cao, lịch làm việc linh hoạt, hỗ trợ 24/7. Đăng ký ngay!',
}

const benefits = [
  { icon: '💰', title: 'Thu nhập cao', description: 'Tài xế kiếm trung bình 8–15 triệu/tháng tùy khu vực và giờ hoạt động' },
  { icon: '⏰', title: 'Lịch linh hoạt', description: 'Tự quyết định giờ làm, không bị ràng buộc bởi ca cố định' },
  { icon: '🛡️', title: 'Bảo hiểm toàn diện', description: 'FireGo mua bảo hiểm tai nạn toàn diện cho đối tác trong suốt ca làm việc' },
  { icon: '📱', title: 'App hiện đại', description: 'Công cụ quản lý đơn hàng, thu nhập và hỗ trợ trực tiếp trong app' },
  { icon: '🤝', title: 'Cộng đồng thân thiện', description: 'Tham gia cộng đồng hàng nghìn đối tác, chia sẻ kinh nghiệm và hỗ trợ nhau' },
  { icon: '🌟', title: 'Chương trình thưởng', description: 'Nhận thưởng theo hiệu suất và đánh giá cao từ khách hàng mỗi tháng' },
]

export default function DoiTacPage() {
  return (
    <>
      {/* Hero */}
      <div className="bg-gradient-to-br from-orange-600 to-amber-500 py-20 relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <nav className="text-sm text-orange-200 mb-6">
            <Link href="/" className="hover:text-white">Trang chủ</Link>
            <span className="mx-2">/</span>
            <span className="text-white font-600">Đăng ký Đối Tác</span>
          </nav>
          <div className="max-w-2xl">
            <h1 className="text-4xl sm:text-5xl font-900 text-white mb-4">
              Cùng FireGo xây dựng thu nhập bền vững
            </h1>
            <p className="text-orange-100 text-lg leading-relaxed">
              Hàng nghìn đối tác đang kiếm thu nhập ổn định với lịch làm việc hoàn toàn tự do.
              Gia nhập ngay hôm nay!
            </p>
          </div>
        </div>
      </div>

      {/* Benefits */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="section-title mb-3">Tại sao chọn FireGo?</h2>
            <p className="section-subtitle">Chúng tôi cam kết đồng hành cùng sự thành công của bạn</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((b, i) => (
              <div key={i} className="card p-6">
                <div className="text-4xl mb-4">{b.icon}</div>
                <h3 className="text-lg font-800 text-slate-900 mb-2">{b.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{b.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Form */}
      <section className="py-20 bg-orange-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-5 gap-12">
            <div className="lg:col-span-2">
              <h2 className="section-title mb-4">Điền thông tin đăng ký</h2>
              <p className="text-slate-500 mb-6 leading-relaxed">
                Điền form bên dưới, chúng tôi sẽ liên hệ trong vòng 24–48 giờ làm việc.
              </p>
              <div className="space-y-3">
                {[
                  'Xét duyệt hồ sơ nhanh chóng',
                  'Đào tạo miễn phí trước khi ra mắt',
                  'Hỗ trợ kỹ thuật 24/7',
                  'Thanh toán đúng hạn mỗi tuần',
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-slate-700">
                    <CheckCircle className="w-4 h-4 text-orange-500 shrink-0" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
            <div className="lg:col-span-3 bg-white rounded-3xl p-6 sm:p-8 shadow-brand-lg border border-orange-100">
              <PartnerForm />
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
