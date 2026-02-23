import React from 'react'
import { FiTrendingUp, FiClock, FiDollarSign, FiCalendar } from 'react-icons/fi'

export default function DriverBenefit() {
  const benefits = [
    {
      icon: FiDollarSign,
      title: 'Thu nhập cao',
      description: 'Kiếm từ 15-30 triệu/tháng tùy theo giờ hoạt động'
    },
    {
      icon: FiClock,
      title: 'Linh hoạt thời gian',
      description: 'Bạn quyết định khi nào làm việc, không có lịch cứng'
    },
    {
      icon: FiTrendingUp,
      title: 'Tăng lương theo theo dõi',
      description: 'Nhận bonus dựa trên đánh giá và chất lượng dịch vụ'
    },
    {
      icon: FiCalendar,
      title: 'Hỗ trợ toàn diện',
      description: 'Bảo hiểm, hỗ trợ kỹ thuật, cộng đồng tài xế'
    }
  ]

  return (
    <section id="driver" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-block bg-orange-100 text-primary px-4 py-2 rounded-full text-sm font-semibold mb-4">
            💰 Cơ hội kiếm tiền
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-secondary mb-4">
            Trở thành tài xế <span className="text-gradient">FireGo</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Hơn 50 nghìn tài xế đã kiếm được lợi tức cao thông qua FireGo
          </p>
        </div>

        {/* Benefits Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon
            return (
              <div key={index} className="bg-slate-50 p-8 rounded-xl hover:shadow-lg transition">
                <Icon className="w-10 h-10 text-primary mb-4" />
                <h3 className="text-lg font-bold text-secondary mb-2">{benefit.title}</h3>
                <p className="text-gray-600 text-sm">{benefit.description}</p>
              </div>
            )
          })}
        </div>

        {/* Registration Section */}
        <div className="bg-gradient-to-r from-primary to-orange-600 rounded-2xl p-12 text-white">
          <div className="max-w-2xl mx-auto text-center">
            <h3 className="text-3xl font-bold mb-4">Sẵn sàng kiếm tiền?</h3>
            <p className="text-lg mb-8 opacity-95">
              Đăng ký làm tài xế FireGo chỉ mất 15 phút. Không cần kinh nghiệm trước.
            </p>
            
            {/* Registration Steps */}
            <div className="grid md:grid-cols-3 gap-4 mb-8">
              <div className="bg-white/20 rounded-lg p-4">
                <div className="text-2xl font-bold mb-2">1️⃣</div>
                <p className="font-semibold">Kiểm tra điều kiện</p>
              </div>
              <div className="bg-white/20 rounded-lg p-4">
                <div className="text-2xl font-bold mb-2">2️⃣</div>
                <p className="font-semibold">Tải hồ sơ</p>
              </div>
              <div className="bg-white/20 rounded-lg p-4">
                <div className="text-2xl font-bold mb-2">3️⃣</div>
                <p className="font-semibold">Bắt đầu kiếm tiền</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="bg-white text-primary px-8 py-3 rounded-lg font-bold hover:bg-gray-100 transition">
                Đăng ký tài xế ngay
              </button>
              <button className="border-2 border-white text-white px-8 py-3 rounded-lg font-bold hover:bg-white/10 transition">
                Xem yêu cầu
              </button>
            </div>
          </div>
        </div>

        {/* Requirements */}
        <div className="mt-12 bg-blue-50 rounded-lg p-8">
          <h3 className="text-2xl font-bold text-secondary mb-6">Điều kiện trở thành tài xế:</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <ul className="space-y-3">
              <li className="flex items-center gap-3">
                <span className="text-primary font-bold">✓</span>
                <span>Từ 21 tuổi trở lên</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="text-primary font-bold">✓</span>
                <span>Có giấy phép lái xe hợp lệ</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="text-primary font-bold">✓</span>
                <span>Có xe riêng hoặc thuê</span>
              </li>
            </ul>
            <ul className="space-y-3">
              <li className="flex items-center gap-3">
                <span className="text-primary font-bold">✓</span>
                <span>Hộ chiếu/CMND còn hạn</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="text-primary font-bold">✓</span>
                <span>Xe đáp ứng tiêu chuẩn</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="text-primary font-bold">✓</span>
                <span>Không có lệnh cấm</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
