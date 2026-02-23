import React from 'react'

export default function HowWorks() {
  const steps = [
    {
      number: 1,
      title: 'Mở ứng dụng',
      description: 'Tải FireGo từ App Store hoặc Google Play'
    },
    {
      number: 2,
      title: 'Nhập địa chỉ',
      description: 'Chọn điểm đón và điểm trả khách'
    },
    {
      number: 3,
      title: 'Chọn xe',
      description: 'Lựa chọn loại xe phù hợp và xem giá'
    },
    {
      number: 4,
      title: 'Tài xế tới',
      description: 'Tài xế sẽ tới làm bạn trong vòng 5 phút'
    }
  ]

  return (
    <section id="howitworks" className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-secondary mb-4">
            Cách <span className="text-gradient">hoạt động</span> của FireGo
          </h2>
          <p className="text-xl text-gray-600">
            4 bước đơn giản để có một chuyến đi tuyệt vời
          </p>
        </div>

        {/* Steps */}
        <div className="grid md:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <div key={index} className="flex flex-col items-center">
              {/* Step Number */}
              <div className="w-16 h-16 rounded-full bg-primary text-white flex items-center justify-center text-3xl font-bold mb-4">
                {step.number}
              </div>

              {/* Step Content */}
              <h3 className="text-xl font-bold text-secondary mb-2 text-center">{step.title}</h3>
              <p className="text-gray-600 text-center">{step.description}</p>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute left-1/2 w-12 h-1 bg-gradient-to-r from-primary to-orange-600 -rotate-90 -mt-12" />
              )}
            </div>
          ))}
        </div>

        {/* Visual Demo */}
        <div className="mt-16 bg-white rounded-2xl p-8 shadow-lg">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h3 className="text-2xl font-bold text-secondary mb-4">Trực quan và dễ sử dụng</h3>
              <ul className="space-y-3">
                <li className="flex items-center gap-3">
                  <span className="w-2 h-2 bg-primary rounded-full"></span>
                  <span className="text-gray-700">Giao diện đơn giản, thân thiện</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-2 h-2 bg-primary rounded-full"></span>
                  <span className="text-gray-700">Theo dõi tài xế thời gian thực</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-2 h-2 bg-primary rounded-full"></span>
                  <span className="text-gray-700">Hỗ trợ khách hàng 24/7</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-2 h-2 bg-primary rounded-full"></span>
                  <span className="text-gray-700">Nhiều phương thức thanh toán</span>
                </li>
              </ul>
            </div>
            <div className="bg-gradient-to-br from-primary/10 to-blue-100 rounded-xl p-8 aspect-square flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl mb-3">📱</div>
                <p className="text-gray-600 font-semibold">App screenshot sẽ được hiển thị ở đây</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
