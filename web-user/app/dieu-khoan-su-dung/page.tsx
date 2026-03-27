import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Điều Khoản Sử Dụng – FireGo',
  description: 'Điều khoản và điều kiện sử dụng dịch vụ FireGo. Vui lòng đọc kỹ trước khi sử dụng.',
}

const terms = [
  {
    title: '1. Chấp nhận điều khoản',
    content: `Bằng cách tải xuống, cài đặt hoặc sử dụng ứng dụng FireGo, bạn đồng ý bị ràng buộc bởi các Điều khoản Sử dụng này. Nếu bạn không đồng ý với bất kỳ điều khoản nào, vui lòng không sử dụng dịch vụ của chúng tôi.

FireGo ("chúng tôi") cung cấp nền tảng kết nối người dùng với các nhà cung cấp dịch vụ ghép xe, lái hộ, vận chuyển và vệ sinh.`,
  },
  {
    title: '2. Điều kiện sử dụng',
    content: `Để sử dụng FireGo, bạn phải:

- Từ 18 tuổi trở lên (hoặc được sự giám sát của người giám hộ hợp pháp)
- Cung cấp thông tin đăng ký chính xác và đầy đủ
- Duy trì bảo mật tài khoản (mật khẩu, mã OTP)
- Không sử dụng dịch vụ cho mục đích bất hợp pháp
- Không gian lận, tấn công hoặc gây hại cho hệ thống`,
  },
  {
    title: '3. Tài khoản người dùng',
    content: `**Tạo tài khoản:** Bạn có trách nhiệm cung cấp thông tin chính xác và cập nhật kịp thời.

**Bảo mật tài khoản:** Mọi hoạt động dưới tài khoản của bạn đều là trách nhiệm của bạn. Hãy thông báo ngay cho chúng tôi nếu phát hiện truy cập trái phép.

**Một tài khoản/người dùng:** Mỗi người chỉ được đăng ký một tài khoản cá nhân. FireGo có quyền xóa các tài khoản trùng lặp không có thông báo.`,
  },
  {
    title: '4. Dịch vụ và giá cả',
    content: `**Bản chất dịch vụ:** FireGo là nền tảng trung gian kết nối, không phải nhà cung cấp dịch vụ trực tiếp. Tài xế/nhân viên là đối tác độc lập.

**Giá cước:** Được tính toán tự động dựa trên khoảng cách, thời gian và loại dịch vụ. Giá hiển thị trước khi xác nhận.

**Thanh toán:** Bạn đồng ý thanh toán đầy đủ cho dịch vụ đã sử dụng. FireGo có thể thay đổi bảng giá sau khi có thông báo trước.

**Phí hủy đơn:** Có thể áp dụng phí hủy nếu bạn hủy sau khi tài xế đã nhận đơn (theo chính sách từng dịch vụ).`,
  },
  {
    title: '5. Trách nhiệm của người dùng',
    content: `Khi sử dụng dịch vụ FireGo, bạn cam kết:

- Cung cấp địa chỉ đón/trả chính xác
- Ứng xử lịch sự, tôn trọng tài xế/nhân viên
- Không mang theo hàng cấm, vật liệu nguy hiểm
- Không quay phim, chụp ảnh tài xế/nhân viên mà không có sự đồng ý
- Báo cáo ngay nếu gặp sự cố trong quá trình sử dụng dịch vụ`,
  },
  {
    title: '6. Giới hạn trách nhiệm',
    content: `FireGo không chịu trách nhiệm về:

- Chất lượng dịch vụ của đối tác độc lập vượt quá mức kiểm soát hợp lý
- Thiệt hại gián tiếp, hậu quả từ việc sử dụng hoặc không thể sử dụng dịch vụ
- Sự cố kỹ thuật nằm ngoài tầm kiểm soát (thiên tai, tấn công mạng từ bên ngoài)
- Tổn thất vượt quá giá trị đơn hàng tương ứng

Trong mọi trường hợp, trách nhiệm tối đa của FireGo không vượt quá số tiền bạn đã thanh toán cho dịch vụ cụ thể.`,
  },
  {
    title: '7. Quyền sở hữu trí tuệ',
    content: `Toàn bộ nội dung trên ứng dụng và website FireGo (logo, giao diện, code, văn bản) thuộc quyền sở hữu của FireGo hoặc đã được cấp phép hợp lệ. Bạn không được sao chép, phân phối, sửa đổi mà không có sự đồng ý bằng văn bản của chúng tôi.`,
  },
  {
    title: '8. Chấm dứt dịch vụ',
    content: `FireGo có quyền tạm ngừng hoặc chấm dứt tài khoản của bạn nếu:

- Vi phạm Điều khoản Sử dụng này
- Hành vi gian lận hoặc lạm dụng hệ thống
- Nhận nhiều đánh giá tiêu cực từ đối tác
- Yêu cầu từ cơ quan pháp luật

Bạn cũng có thể xóa tài khoản bất kỳ lúc nào qua ứng dụng hoặc liên hệ support@firego.vn.`,
  },
  {
    title: '9. Luật áp dụng',
    content: `Các Điều khoản này được điều chỉnh bởi pháp luật nước Cộng hòa Xã hội Chủ nghĩa Việt Nam. Mọi tranh chấp phát sinh sẽ được giải quyết tại Tòa án có thẩm quyền tại Nghệ An, trừ khi các bên có thỏa thuận khác.

**Ngày cập nhật gần nhất:** 25/03/2026`,
  },
]

export default function TermsPage() {
  return (
    <>
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 py-14">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="text-sm text-slate-400 mb-4">
            <Link href="/" className="hover:text-white">Trang chủ</Link>
            <span className="mx-2">/</span>
            <span className="text-white font-600">Điều khoản sử dụng</span>
          </nav>
          <h1 className="text-3xl sm:text-4xl font-900 text-white mb-2">Điều khoản Sử dụng</h1>
          <p className="text-slate-400">Cập nhật lần cuối: 25/03/2026</p>
        </div>
      </div>

      <section className="py-14 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 mb-10">
            <p className="text-blue-800 text-sm leading-relaxed">
              <strong>📋 Lưu ý quan trọng:</strong> Vui lòng đọc kỹ các điều khoản này trước khi sử dụng dịch vụ FireGo.
              Việc tiếp tục sử dụng dịch vụ đồng nghĩa bạn đã chấp nhận đầy đủ các điều khoản bên dưới.
            </p>
          </div>

          <div className="space-y-8">
            {terms.map((term, i) => (
              <div key={i} className="border-b border-slate-100 pb-8 last:border-0">
                <h2 className="text-xl font-800 text-slate-900 mb-4">{term.title}</h2>
                <div className="text-slate-600 text-sm leading-relaxed whitespace-pre-line">
                  {term.content.split('**').map((part, j) =>
                    j % 2 === 1 ? <strong key={j} className="text-slate-800">{part}</strong> : part
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 grid sm:grid-cols-2 gap-4">
            <Link href="/chinh-sach-bao-mat" className="flex items-center gap-3 p-5 bg-orange-50 rounded-2xl border border-orange-200 hover:border-orange-400 transition-colors group">
              <span className="text-2xl">🔒</span>
              <div>
                <p className="font-700 text-slate-900 group-hover:text-orange-600 transition-colors">Chính sách Bảo mật</p>
                <p className="text-xs text-slate-500">Cách chúng tôi bảo vệ dữ liệu của bạn</p>
              </div>
            </Link>
            <Link href="/lien-he" className="flex items-center gap-3 p-5 bg-slate-50 rounded-2xl border border-slate-200 hover:border-slate-400 transition-colors group">
              <span className="text-2xl">💬</span>
              <div>
                <p className="font-700 text-slate-900 group-hover:text-slate-600 transition-colors">Liên hệ hỗ trợ</p>
                <p className="text-xs text-slate-500">Câu hỏi về điều khoản? Liên hệ ngay</p>
              </div>
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
