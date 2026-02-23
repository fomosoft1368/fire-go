import React from 'react'
import { FiArrowRight, FiDownload } from 'react-icons/fi'

export default function Hero() {
  return (
    <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="animate-fadeInUp">
            <div className="inline-block bg-blue-100 text-primary px-4 py-2 rounded-full text-sm font-semibold mb-6">
              🎉 Giải pháp di chuyển thông minh
            </div>
            
            <h1 className="text-5xl lg:text-6xl font-bold text-secondary mb-6 leading-tight">
              Đi lại <span className="text-gradient">an toàn</span>, <span className="text-gradient">dễ dàng</span>
            </h1>
            
            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              FireGo - Nền tảng di chuyển thông minh kết nối hàng triệu người dùng với tài xế uy tín. 
              Đặt xe nhanh, giá rõ ràng, an toàn tuyệt đối.
            </p>

            {/* Features Highlight */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">1M+</div>
                <p className="text-gray-600 text-sm">Người dùng</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">50K+</div>
                <p className="text-gray-600 text-sm">Tài xế</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">4.8★</div>
                <p className="text-gray-600 text-sm">Đánh giá</p>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <button className="bg-primary text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-orange-600 transition flex items-center justify-center gap-2 group">
                Tải App Ngay <FiArrowRight className="group-hover:translate-x-1 transition" />
              </button>
              <button className="border-2 border-primary text-primary px-8 py-4 rounded-xl font-bold text-lg hover:bg-primary hover:text-white transition">
                Xem Demo
              </button>
            </div>

            {/* Download Links */}
            <div className="mt-8 flex gap-4">
              <a href="#" className="flex items-center gap-2 text-gray-600 hover:text-primary transition">
                <img src="https://img.icons8.com/color/96/000000/apple.png" alt="iOS" className="w-6 h-6" />
                App Store
              </a>
              <a href="#" className="flex items-center gap-2 text-gray-600 hover:text-primary transition">
                <img src="https://img.icons8.com/color/96/000000/google-play.png" alt="Android" className="w-6 h-6" />
                Google Play
              </a>
            </div>
          </div>

          {/* Right Image */}
          <div className="hidden lg:flex items-center justify-center">
            <div className="relative w-full h-96">
              {/* Phone mockup */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary to-orange-600 rounded-3xl transform rotate-3 opacity-20"></div>
              <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-primary rounded-3xl transform -rotate-3 opacity-20"></div>
              <div className="relative h-full bg-white rounded-3xl shadow-2xl flex items-center justify-center overflow-hidden">
                <div className="text-center p-8">
                  <div className="text-6xl mb-4">🚗</div>
                  <p className="text-gray-600 font-semibold">Mở ứng dụng FireGo</p>
                  <p className="text-sm text-gray-500 mt-2">Đặt xe trong 30 giây</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
