import AppDownloadButtons from '@/components/ui/AppDownloadButtons'

export default function AppDownloadCTA() {
  return (
    <section className="py-20 gradient-hero relative overflow-hidden">
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-amber-300/20 rounded-full blur-2xl" />

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="text-6xl mb-6 animate-float">🔥</div>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-900 text-white mb-4">
          Sẵn sàng trải nghiệm?
        </h2>
        <p className="text-orange-100 text-lg mb-8 max-w-xl mx-auto">
          Tải FireGo ngay hôm nay và nhận <strong className="text-white">voucher 50.000đ</strong> cho chuyến đi đầu tiên!
        </p>

        <div className="flex justify-center mb-8">
          <AppDownloadButtons variant="large" />
        </div>

        <div className="flex flex-wrap justify-center gap-6 text-white/80 text-sm">
          <span>✅ Miễn phí tải xuống</span>
          <span>✅ Không quảng cáo phiền toái</span>
          <span>✅ Hỗ trợ 24/7</span>
        </div>
      </div>
    </section>
  )
}
