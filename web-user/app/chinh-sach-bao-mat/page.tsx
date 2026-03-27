import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Chính Sách Bảo Mật – FireGo',
  description: 'Chính sách bảo mật của FireGo. Chúng tôi cam kết bảo vệ thông tin cá nhân của bạn.',
}

const sections = [
  {
    title: '1. Thông tin chúng tôi thu thập',
    content: `Khi bạn sử dụng ứng dụng và website FireGo, chúng tôi có thể thu thập các loại thông tin sau:

**Thông tin cá nhân:** Họ tên, số điện thoại, địa chỉ email, ảnh đại diện khi bạn tạo tài khoản.

**Thông tin vị trí:** Vị trí GPS thời gian thực khi bạn đặt dịch vụ hoặc nhận đơn (áp dụng cho tài xế/đối tác).

**Thông tin thanh toán:** Lịch sử giao dịch, phương thức thanh toán (chúng tôi không lưu trữ số thẻ đầy đủ).

**Thông tin thiết bị:** Loại thiết bị, hệ điều hành, địa chỉ IP, nhật ký ứng dụng để cải thiện trải nghiệm.`,
  },
  {
    title: '2. Mục đích sử dụng thông tin',
    content: `Chúng tôi sử dụng thông tin thu thập được để:

- Cung cấp và cải thiện các dịch vụ của FireGo
- Kết nối khách hàng với tài xế/đối tác phù hợp
- Xử lý thanh toán và xuất hóa đơn
- Gửi thông báo về đơn hàng, khuyến mãi (bạn có thể tắt tính năng này)
- Phân tích và cải thiện hiệu suất ứng dụng
- Tuân thủ các nghĩa vụ pháp lý`,
  },
  {
    title: '3. Chia sẻ thông tin',
    content: `FireGo **không bán** thông tin cá nhân của bạn cho bên thứ ba. Chúng tôi chỉ chia sẻ thông tin trong các trường hợp:

- **Đối tác dịch vụ:** Tài xế/nhân viên nhận được thông tin cần thiết để hoàn thành dịch vụ (tên, điện thoại, điểm đón).
- **Đối tác kỹ thuật:** Các nhà cung cấp dịch vụ thanh toán, lưu trữ đám mây (AWS, Firebase) hoạt động theo hợp đồng bảo mật.
- **Yêu cầu pháp lý:** Khi có lệnh của cơ quan có thẩm quyền theo quy định pháp luật Việt Nam.`,
  },
  {
    title: '4. Bảo mật dữ liệu',
    content: `Chúng tôi áp dụng các biện pháp bảo mật tiêu chuẩn ngành:

- Mã hóa SSL/TLS cho tất cả dữ liệu truyền tải
- Mã hóa dữ liệu nhạy cảm khi lưu trữ
- Kiểm soát quyền truy cập nội bộ chặt chẽ
- Kiểm tra bảo mật định kỳ
- Sao lưu dữ liệu tự động hằng ngày`,
  },
  {
    title: '5. Quyền của người dùng',
    content: `Bạn có các quyền sau đối với dữ liệu cá nhân của mình:

- **Quyền truy cập:** Xem thông tin cá nhân đã cung cấp trong phần "Tài khoản" của app.
- **Quyền chỉnh sửa:** Cập nhật thông tin cá nhân bất kỳ lúc nào trong ứng dụng.
- **Quyền xóa:** Yêu cầu xóa tài khoản và dữ liệu liên kết qua email support@firego.vn.
- **Quyền từ chối:** Tắt nhận thông báo marketing trong phần cài đặt app.`,
  },
  {
    title: '6. Cookie và công nghệ theo dõi',
    content: `Website FireGo sử dụng cookie để:

- Ghi nhớ thông tin đăng nhập
- Phân tích lưu lượng truy cập (Google Analytics – ẩn danh hóa IP)
- Tối ưu hóa hiển thị quảng cáo (Meta Pixel)

Bạn có thể từ chối cookie thông qua cài đặt trình duyệt, tuy nhiên một số tính năng website có thể bị ảnh hưởng.`,
  },
  {
    title: '7. Dữ liệu trẻ em',
    content: `FireGo không cố ý thu thập thông tin từ trẻ em dưới 13 tuổi. Dịch vụ của chúng tôi hướng đến người dùng từ 18 tuổi trở lên. Nếu phụ huynh phát hiện con em mình đã cung cấp thông tin cho chúng tôi, vui lòng liên hệ ngay qua support@firego.vn.`,
  },
  {
    title: '8. Thay đổi chính sách',
    content: `FireGo có thể cập nhật Chính sách Bảo mật này định kỳ. Chúng tôi sẽ thông báo cho bạn qua email hoặc thông báo trong ứng dụng khi có thay đổi quan trọng. Việc tiếp tục sử dụng dịch vụ sau khi thay đổi có hiệu lực đồng nghĩa bạn chấp nhận chính sách mới.

**Ngày cập nhật gần nhất:** 25/03/2026`,
  },
]

export default function PrivacyPage() {
  return (
    <>
      <div className="gradient-primary py-14">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="text-sm text-orange-200 mb-4">
            <Link href="/" className="hover:text-white">Trang chủ</Link>
            <span className="mx-2">/</span>
            <span className="text-white font-600">Chính sách bảo mật</span>
          </nav>
          <h1 className="text-3xl sm:text-4xl font-900 text-white mb-2">Chính sách Bảo mật</h1>
          <p className="text-orange-100">Cập nhật lần cuối: 25/03/2026</p>
        </div>
      </div>

      <section className="py-14 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5 mb-10">
            <p className="text-orange-800 text-sm leading-relaxed">
              <strong>🔒 Cam kết của FireGo:</strong> Chúng tôi coi trọng quyền riêng tư của bạn và cam kết bảo vệ
              thông tin cá nhân theo đúng quy định của pháp luật Việt Nam về bảo vệ dữ liệu cá nhân
              (Nghị định 13/2023/NĐ-CP).
            </p>
          </div>

          <div className="space-y-8">
            {sections.map((section, i) => (
              <div key={i} className="border-b border-slate-100 pb-8 last:border-0">
                <h2 className="text-xl font-800 text-slate-900 mb-4">{section.title}</h2>
                <div className="text-slate-600 text-sm leading-relaxed whitespace-pre-line">
                  {section.content.split('**').map((part, j) =>
                    j % 2 === 1 ? <strong key={j} className="text-slate-800">{part}</strong> : part
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 bg-slate-50 rounded-2xl p-6 border border-slate-200">
            <h3 className="font-800 text-slate-900 mb-2">Liên hệ về bảo mật dữ liệu</h3>
            <p className="text-slate-600 text-sm mb-3">
              Nếu bạn có thắc mắc về chính sách bảo mật hoặc muốn thực hiện quyền của mình:
            </p>
            <div className="space-y-1 text-sm">
              <p>📧 Email: <a href="mailto:privacy@firego.vn" className="text-orange-600 hover:underline">privacy@firego.vn</a></p>
              <p>📞 Hotline: <a href="tel:19001234" className="text-orange-600 hover:underline">09222.33.666</a></p>
              <p>🏢 Địa chỉ: Số 9, Giáng Hương 3, Khu đô thị Vinh Heritage, Phường Trường Vinh, Tỉnh Nghệ An</p>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
