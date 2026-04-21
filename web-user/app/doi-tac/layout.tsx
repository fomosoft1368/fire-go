import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Đăng Ký Làm Đối Tác Tài Xế FireGo – Thu Nhập Linh Hoạt',
  description: 'Tham gia cộng đồng đối tác FireGo. Thu nhập cao, lịch làm việc linh hoạt, hỗ trợ 24/7. Đăng ký ngay!',
}

export default function DoiTacLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
