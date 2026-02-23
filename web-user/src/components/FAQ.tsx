import React, { useState } from 'react'
import { FiChevronDown, FiChevronUp } from 'react-icons/fi'

export default function FAQ() {
  const [activeIndex, setActiveIndex] = useState(0)

  const faqs = [
    {
      question: 'FireGo an toàn không?',
      answer: 'Có, FireGo áp dụng các biện pháp bảo mật hàng đầu. Tất cả tài xế đều được xác thực danh tính, kiểm tra nền tảng, và có bảo hiểm. Bạn cũng có thể chia sẻ hành trình với gia đình.'
    },
    {
      question: 'Giá cước được tính như thế nào?',
      answer: 'Giá cước được tính dựa trên quãng đường, thời gian, và loại xe. FireGo hiển thị giá ước tính trước khi bạn xác nhận đặt xe. Không có phí ẩn, minh bạch 100%.'
    },
    {
      question: 'Có thể hủy chuyến được không?',
      answer: 'Có, bạn có thể hủy chuyến miễn phí trước khi tài xế đến điểm đón. Nếu hủy sau, có thể phát sinh phí hủy tùy theo chính sách.'
    },
    {
      question: 'Làm cách nào để trở thành tài xế?',
      answer: 'Tải ứng dụng FireGo, chọn "Trở thành tài xế", điền đầy đủ thông tin và tài liệu, chờ xác thực (48 giờ), sau đó bắt đầu kiếm tiền.'
    },
    {
      question: 'Có hỗ trợ khách hàng 24/7 không?',
      answer: 'Có, FireGo cung cấp hỗ trợ 24/7 qua hotline, email, và chat trong ứng dụng. Đội ngũ hỗ trợ sẵn sàng giúp bạn mọi lúc.'
    },
    {
      question: 'Tôi quên đồ trên xe thì sao?',
      answer: 'Vào "Lịch sử chuyến", chọn chuyến đó, nhấn "Liên hệ tài xế" hoặc gọi hotline. Chúng tôi sẽ giúp bạn lấy lại đồ trong vòng 24 giờ.'
    }
  ]

  return (
    <section id="faq" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-secondary mb-4">
            Câu hỏi <span className="text-gradient">thường gặp</span>
          </h2>
          <p className="text-lg text-gray-600">
            Tìm câu trả lời cho những thắc mắc của bạn
          </p>
        </div>

        {/* FAQ Items */}
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setActiveIndex(activeIndex === index ? -1 : index)}
                className="w-full px-6 py-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition"
              >
                <h3 className="text-left font-bold text-secondary">{faq.question}</h3>
                <span className="text-primary">
                  {activeIndex === index ? <FiChevronUp /> : <FiChevronDown />}
                </span>
              </button>

              {activeIndex === index && (
                <div className="px-6 py-4 bg-white text-gray-700 border-t border-gray-200">
                  <p>{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Contact Support */}
        <div className="mt-12 text-center bg-blue-50 p-8 rounded-lg">
          <h3 className="text-xl font-bold text-secondary mb-3">
            Không tìm thấy câu trả lời?
          </h3>
          <p className="text-gray-600 mb-6">
            Liên hệ đội hỗ trợ của chúng tôi, họ sẽ giúp bạn ngay
          </p>
          <button className="bg-primary text-white px-8 py-3 rounded-lg font-bold hover:bg-orange-600 transition">
            Liên hệ hỗ trợ
          </button>
        </div>
      </div>
    </section>
  )
}
