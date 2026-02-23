import React from 'react'
import { FiMapPin, FiDollarSign, FiClock, FiShield, FiUsers, FiSmartphone } from 'react-icons/fi'

export default function Features() {
  const features = [
    {
      icon: FiMapPin,
      title: 'Đặt xe nhanh chóng',
      description: 'Chỉ cần 2 cú chạm, tài xế sẽ tới làm bạn trong vòng 5 phút'
    },
    {
      icon: FiDollarSign,
      title: 'Giá cạnh tranh',
      description: 'Giá hiển thị trước, không phí ẩn, minh bạch 100%'
    },
    {
      icon: FiClock,
      title: 'An toàn tuyệt đối',
      description: 'Tất cả tài xế đều được xác thực danh tính và kiểm tra nền tảng'
    },
    {
      icon: FiShield,
      title: 'Chia sẻ vị trí',
      description: 'Chia sẻ hành trình với bạn bè, gia đình để an tâm hơn'
    },
    {
      icon: FiUsers,
      title: 'Ghép xe tiết kiệm',
      description: 'Chia sẻ chuyến đi với người khác, tiết kiệm đến 40%'
    },
    {
      icon: FiSmartphone,
      title: 'Giao hàng nhanh',
      description: 'Dịch vụ FireGo Delivery cho giao hàng cùng ngày'
    }
  ]

  return (
    <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-secondary mb-4">
            Tại sao chọn <span className="text-gradient">FireGo</span>?
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Hơn 1 triệu người dùng tin tưởng FireGo mỗi ngày
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <div 
                key={index}
                className="p-8 bg-slate-50 rounded-2xl hover:shadow-lg hover:bg-slate-100 transition duration-300 group cursor-pointer"
              >
                <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-white transition">
                  <Icon className="w-7 h-7 text-primary group-hover:text-white" />
                </div>
                <h3 className="text-xl font-bold text-secondary mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            )
          })}
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 text-center">
          <p className="text-lg text-gray-600 mb-6">
            Trải nghiệm ngay những lợi ích của FireGo
          </p>
          <button className="bg-primary text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-orange-600 transition">
            Tải ứng dụng miễn phí
          </button>
        </div>
      </div>
    </section>
  )
}
