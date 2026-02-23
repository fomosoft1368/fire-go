import React from 'react'

export default function Stats() {
  const stats = [
    { number: '1M+', label: 'Người dùng hoạt động' },
    { number: '50K+', label: 'Tài xế đã xác thực' },
    { number: '4.8★', label: 'Đánh giá trung bình' },
    { number: '5M+', label: 'Chuyến đi hoàn thành' },
  ]

  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-primary to-orange-600">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <div key={index} className="text-center text-white">
              <div className="text-5xl font-bold mb-2">{stat.number}</div>
              <p className="text-lg opacity-90">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
