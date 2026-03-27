export const FAQ_ITEMS = [
  {
    id: 1,
    question: 'FireGo hoạt động ở những thành phố nào?',
    answer: 'Hiện tại FireGo đang hoạt động tại Vinh, Nghệ An. Chúng tôi đang mở rộng sang các tỉnh thành khác như Hà Nội, TP.HCM, Đà Nẵng. Hãy theo dõi app để nhận thông báo khi có mặt tại khu vực của bạn.',
    category: 'general',
  },
  {
    id: 2,
    question: 'Làm thế nào để đặt dịch vụ trên app?',
    answer: 'Rất đơn giản: (1) Tải app FireGo và đăng ký tài khoản. (2) Chọn dịch vụ bạn cần. (3) Nhập điểm đón/đến. (4) Chọn thời gian. (5) Xác nhận và thanh toán. Driver sẽ đến đúng giờ!',
    category: 'general',
  },
  {
    id: 3,
    question: 'Tôi có thể hủy đặt chỗ không? Có mất phí không?',
    answer: 'Bạn có thể hủy miễn phí trong vòng 5 phút sau khi đặt. Sau 5 phút sẽ tính phí hủy 10.000đ để đảm bảo tài xế không mất thời gian vô ích.',
    category: 'booking',
  },
  {
    id: 4,
    question: 'Phương thức thanh toán nào được chấp nhận?',
    answer: 'FireGo chấp nhận: Tiền mặt, Thẻ ATM nội địa, Thẻ quốc tế (Visa/Mastercard), Ví điện tử (MoMo, ZaloPay, VNPAY), và điểm thưởng FireGo Coin.',
    category: 'payment',
  },
  {
    id: 5,
    question: 'Tài xế được xác minh như thế nào?',
    answer: 'Tất cả tài xế đều phải qua quy trình: (1) Xác minh CMND/CCCD. (2) Kiểm tra lý lịch tư pháp. (3) Bằng lái xe hợp lệ. (4) Đào tạo kỹ năng và thái độ phục vụ. (5) Thử việc có giám sát. Chúng tôi cập nhật định kỳ hàng tháng.',
    category: 'safety',
  },
  {
    id: 6,
    question: 'Nếu tôi bỏ quên đồ trên xe thì sao?',
    answer: 'Hãy liên hệ hỗ trợ ngay trong app hoặc gọi 1900-xxxx. Chúng tôi sẽ kết nối bạn với tài xế để thu hồi đồ vật. Nếu không lấy lại được, chúng tôi có chính sách bồi thường theo quy định.',
    category: 'support',
  },
  {
    id: 7,
    question: 'Dịch vụ Lái Hộ có hoạt động ban đêm không?',
    answer: 'Có, dịch vụ Lái Hộ hoạt động 24/7, kể cả cuối tuần và ngày lễ. Đặc biệt phù hợp sau các buổi tiệc tối hay sự kiện về muộn. Đặt trước 2 tiếng để đảm bảo có tài xế.',
    category: 'booking',
  },
  {
    id: 8,
    question: 'Dịch vụ Vệ Sinh mang theo dụng cụ không?',
    answer: 'Có! Nhân viên vệ sinh FireGo tự mang theo toàn bộ dụng cụ và hóa chất vệ sinh đạt chuẩn. Bạn không cần chuẩn bị gì thêm. Hóa chất được kiểm định an toàn, không hại da tay và thân thiện với trẻ nhỏ, thú cưng.',
    category: 'service',
  },
  {
    id: 9,
    question: 'Làm thế nào để đăng ký làm tài xế/đối tác?',
    answer: 'Vào mục "Đăng ký đối tác" trên website này hoặc app FireGo. Điền đầy đủ thông tin, tải lên giấy tờ cần thiết. Đội ngũ của chúng tôi sẽ xét duyệt và liên hệ trong vòng 24-48 giờ làm việc.',
    category: 'partner',
  },
  {
    id: 10,
    question: 'Vận chuyển hàng hóa có giới hạn trọng lượng không?',
    answer: 'FireGo Vận Chuyển hỗ trợ từ hàng nhỏ (xe máy, tối đa 30kg) đến hàng nặng (xe tải 1-2 tấn). Khi đặt dịch vụ, hãy chọn loại xe phù hợp với kích thước và trọng lượng hàng của bạn.',
    category: 'service',
  },
]

export type FaqItem = typeof FAQ_ITEMS[0]
