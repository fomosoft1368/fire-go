import React from 'react'

export default function Testimonials() {
  const testimonials = [
    {
      name: 'Nguyễn Văn A',
      role: 'Khách hàng thường xuyên',
      avatar: '👨‍💼',
      content: 'FireGo làm cuộc sống của tôi dễ dàng hơn. App rất thân thiện, tài xế chuyên nghiệp, giá cả hợp lý.',
      rating: 5
    },
    {
      name: 'Trần Thị B',
      role: 'Tài xế',
      avatar: '👩‍🦰',
      content: 'Với FireGo tôi kiếm được thu nhập ổn định. Công ty hỗ trợ rất tốt, có bảo hiểm, bonus thường xuyên.',
      rating: 5
    },
    {
      name: 'Hoàng Minh C',
      role: 'Doanh nhân',
      avatar: '👨‍💻',
      content: 'Sử dụng FireGo mỗi ngày để di chuyển giữa các cuộc họp. An toàn, nhanh chóng, đáng tin cậy.',
      rating: 5
    },
  ]

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-secondary mb-4">
            Khách hàng nói gì về <span className="text-gradient">FireGo</span>
          </h2>
          <p className="text-xl text-gray-600">
            Hơn 100,000 đánh giá 5 sao từ những người dùng thực
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="bg-slate-50 p-8 rounded-xl">
              {/* Stars */}
              <div className="flex gap-1 mb-4">
                {Array(testimonial.rating).fill(0).map((_, i) => (
                  <span key={i} className="text-yellow-400 text-lg">⭐</span>
                ))}
              </div>

              {/* Content */}
              <p className="text-gray-700 mb-6 font-medium">"{testimonial.content}"</p>

              {/* Author */}
              <div className="flex items-center gap-3">
                <div className="text-3xl">{testimonial.avatar}</div>
                <div>
                  <p className="font-bold text-secondary">{testimonial.name}</p>
                  <p className="text-sm text-gray-600">{testimonial.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="mt-16 text-center">
          <p className="text-gray-600 mb-4">Đánh giá trung bình</p>
          <div className="flex justify-center gap-2 mb-2">
            {Array(5).fill(0).map((_, i) => (
              <span key={i} className="text-3xl">⭐</span>
            ))}
          </div>
          <p className="text-2xl font-bold text-secondary">4.8 / 5 từ 100K+ đánh giá</p>
        </div>
      </div>
    </section>
  )
}
