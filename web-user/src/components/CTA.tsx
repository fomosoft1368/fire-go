import React from 'react'

export default function CTA() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-5xl font-bold text-secondary mb-6">
          Sẵn sàng bắt đầu chưa?
        </h2>
        <p className="text-xl text-gray-600 mb-8">
          Hơn 1 triệu người dùng đang sử dụng FireGo mỗi ngày. Tham gia ngay!
        </p>

        {/* Dual CTA */}
        <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
          {/* Customer CTA */}
          <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition">
            <div className="text-4xl mb-4">🚗</div>
            <h3 className="text-2xl font-bold text-secondary mb-3">
              Tôi muốn đặt xe
            </h3>
            <p className="text-gray-600 mb-6">
              Tải ứng dụng FireGo và bắt đầu chuyến đi đầu tiên
            </p>
            <button className="w-full bg-primary text-white py-3 rounded-lg font-bold hover:bg-orange-600 transition">
              Tải App Ngay
            </button>
          </div>

          {/* Driver CTA */}
          <div className="bg-gradient-to-br from-primary to-orange-600 p-8 rounded-xl shadow-lg hover:shadow-xl transition text-white">
            <div className="text-4xl mb-4">💰</div>
            <h3 className="text-2xl font-bold mb-3">
              Tôi muốn kiếm tiền
            </h3>
            <p className="mb-6 opacity-95">
              Đăng ký làm tài xế và kiếm lợi tức cao
            </p>
            <button className="w-full bg-white text-primary py-3 rounded-lg font-bold hover:bg-gray-100 transition">
              Đăng ký tại xế
            </button>
          </div>
        </div>

        {/* Trust Badge */}
        <div className="mt-12 flex flex-col md:flex-row justify-center items-center gap-8 text-gray-600">
          <div className="flex items-center gap-2">
            <span className="text-2xl">✓</span>
            <span>Miễn phí</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">✓</span>
            <span>An toàn</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">✓</span>
            <span>Nhanh chóng</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">✓</span>
            <span>Hỗ trợ 24/7</span>
          </div>
        </div>
      </div>
    </section>
  )
}
