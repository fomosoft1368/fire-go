import PricingEstimator from '@/components/ui/PricingEstimator'

export default function PricingDemo() {
  return (
    <section className="py-20" style={{ background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: content */}
          <div>
            <span className="inline-block bg-orange-500/20 text-orange-300 text-xs font-700 uppercase tracking-wider px-3 py-1 rounded-full mb-4">
              Giá minh bạch
            </span>
            <h2 className="text-3xl sm:text-4xl font-900 text-white mb-4">
              Ước tính giá ngay,
              <br />
              <span className="text-amber-400">không lo bị chặt chém</span>
            </h2>
            <p className="text-slate-400 leading-relaxed mb-8">
              FireGo hiển thị giá ước tính trước khi bạn xác nhận đặt. Không có phí ẩn, không bất ngờ khi thanh toán.
            </p>

            <div className="space-y-4">
              {[
                { icon: '✅', text: 'Giá hiển thị ngay khi đặt xe' },
                { icon: '🎯', text: 'Tính theo km/giờ, rõ ràng minh bạch' },
                { icon: '🛡️', text: 'Không phụ thu giờ cao điểm cho dịch vụ ghép xe' },
                { icon: '💳', text: 'Nhiều phương thức thanh toán linh hoạt' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 text-slate-300 text-sm">
                  <span className="text-lg">{item.icon}</span>
                  {item.text}
                </div>
              ))}
            </div>
          </div>

          {/* Right: estimator */}
          <div>
            <PricingEstimator />
          </div>
        </div>
      </div>
    </section>
  )
}
