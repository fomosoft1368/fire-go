import React from 'react'
import { FiDownload } from 'react-icons/fi'

export default function Download() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div className="max-w-7xl mx-auto">
        <div className="bg-gradient-to-br from-primary to-orange-600 rounded-2xl p-12">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Content */}
            <div className="text-white">
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Tải FireGo ngay hôm nay
              </h2>
              <p className="text-lg mb-8 opacity-95">
                Hơn 1 triệu người dùng đã tin tưởng FireGo. Hãy tham gia cộng đồng ngay bây giờ!
              </p>

              {/* Download Buttons */}
              <div className="space-y-4">
                <button className="w-full bg-white text-primary px-8 py-4 rounded-lg font-bold hover:bg-gray-100 transition flex items-center justify-center gap-3">
                  <img src="https://img.icons8.com/color/24/000000/apple.png" alt="iOS" />
                  Tải trên App Store
                </button>
                <button className="w-full bg-white text-primary px-8 py-4 rounded-lg font-bold hover:bg-gray-100 transition flex items-center justify-center gap-3">
                  <img src="https://img.icons8.com/color/24/000000/google-play.png" alt="Android" />
                  Tải trên Google Play
                </button>
              </div>

              {/* QR Code */}
              <div className="mt-8">
                <p className="text-sm opacity-75 mb-3">Quét mã QR để tải ngay:</p>
                <div className="bg-white rounded-lg p-4 inline-block">
                  <div className="w-24 h-24 bg-gray-200 rounded flex items-center justify-center">
                    <span className="text-sm text-gray-600">QR Code</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Phone Mockup */}
            <div className="hidden lg:flex justify-center">
              <div className="relative">
                <div className="w-64 h-96 bg-white rounded-3xl shadow-2xl flex items-center justify-center border-8 border-gray-200">
                  <div className="text-center">
                    <div className="text-6xl mb-4">📱</div>
                    <p className="text-gray-600 font-semibold">FireGo App</p>
                    <p className="text-sm text-gray-500 mt-2">v1.0.0</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* System Requirements */}
        <div className="mt-12 grid md:grid-cols-2 gap-8">
          <div className="bg-white p-8 rounded-xl">
            <h3 className="text-lg font-bold text-secondary mb-4">📱 Yêu cầu iPhone</h3>
            <ul className="space-y-2 text-gray-600">
              <li>• iOS 12.0 trở lên</li>
              <li>• RAM 2GB trở lên</li>
              <li>• 100MB dung lượng trống</li>
              <li>• Kết nối Internet ổn định</li>
            </ul>
          </div>
          <div className="bg-white p-8 rounded-xl">
            <h3 className="text-lg font-bold text-secondary mb-4">🤖 Yêu cầu Android</h3>
            <ul className="space-y-2 text-gray-600">
              <li>• Android 8.0 trở lên</li>
              <li>• RAM 2GB trở lên</li>
              <li>• 100MB dung lượng trống</li>
              <li>• Kết nối Internet ổn định</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
