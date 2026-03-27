import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-8xl mb-6 animate-float">🔍</div>
        <h1 className="text-5xl font-900 text-slate-900 mb-3">404</h1>
        <p className="text-xl font-700 text-slate-700 mb-2">Trang không tìm thấy</p>
        <p className="text-slate-500 mb-8">
          Trang bạn đang tìm không tồn tại hoặc đã được di chuyển.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/" className="btn-primary">
            🏠 Về trang chủ
          </Link>
          <Link href="/lien-he" className="btn-secondary">
            Liên hệ hỗ trợ
          </Link>
        </div>
      </div>
    </div>
  )
}
