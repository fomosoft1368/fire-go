const steps = [
  {
    step: '01',
    title: 'Tải app FireGo',
    description: 'Có mặt trên App Store (iOS) và Google Play (Android). Cài đặt miễn phí trong 30 giây.',
    icon: '📱',
    color: 'from-orange-500 to-amber-400',
  },
  {
    step: '02',
    title: 'Đăng ký tài khoản',
    description: 'Chỉ cần số điện thoại là đủ. Xác minh OTP và tạo profile trong vài giây.',
    icon: '👤',
    color: 'from-blue-500 to-indigo-500',
  },
  {
    step: '03',
    title: 'Chọn dịch vụ',
    description: 'Ghép xe, lái hộ, vận chuyển hay vệ sinh – chọn đúng nhu cầu của bạn hôm nay.',
    icon: '🎯',
    color: 'from-green-500 to-emerald-400',
  },
  {
    step: '04',
    title: 'Đặt & tận hưởng',
    description: 'Xác nhận đặt, theo dõi real-time và thanh toán tiện lợi. Đơn giản vậy thôi!',
    icon: '✅',
    color: 'from-purple-500 to-pink-500',
  },
]

export default function HowItWorks() {
  return (
    <section className="py-20" style={{ background: 'linear-gradient(135deg, #FFF7ED 0%, #FFFBF5 50%, #FFF3E0 100%)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <span className="inline-block bg-orange-100 text-orange-700 text-xs font-700 uppercase tracking-wider px-3 py-1 rounded-full mb-4">
            Đơn giản - Nhanh chóng
          </span>
          <h2 className="section-title mb-4">Cách sử dụng FireGo</h2>
          <p className="section-subtitle max-w-xl mx-auto">
            Chỉ 4 bước cực đơn giản để trải nghiệm toàn bộ hệ sinh thái dịch vụ của chúng tôi
          </p>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 relative">
          {/* Connector line (desktop) */}
          <div className="hidden lg:block absolute top-10 left-[12.5%] right-[12.5%] h-0.5 bg-gradient-to-r from-orange-300 via-blue-300 to-purple-300 z-0" />

          {steps.map((step, index) => (
            <div key={index} className="relative z-10 flex flex-col items-center text-center">
              {/* Circle icon */}
              <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${step.color} flex items-center justify-center text-3xl shadow-lg mb-4 hover:scale-110 transition-transform`}>
                {step.icon}
              </div>

              {/* Step number */}
              <div className="text-5xl font-900 text-slate-100 -mt-2 mb-2 select-none">{step.step}</div>

              <h3 className="text-lg font-800 text-slate-900 mb-2">{step.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
