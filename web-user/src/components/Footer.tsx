import React from 'react'
import { FiFacebook, FiTwitter, FiInstagram, FiLinkedin } from 'react-icons/fi'

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-secondary text-white py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Top Section */}
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          {/* Logo & About */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">🚗</span>
              </div>
              <span className="text-2xl font-bold">FireGo</span>
            </div>
            <p className="text-gray-400 text-sm mb-4">
              Nền tảng di chuyển thông minh kết nối hàng triệu người dùng với tài xế uy tín.
            </p>
            {/* Social Icons */}
            <div className="flex gap-4">
              <a href="#" className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-primary transition">
                <FiFacebook size={18} />
              </a>
              <a href="#" className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-primary transition">
                <FiTwitter size={18} />
              </a>
              <a href="#" className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-primary transition">
                <FiInstagram size={18} />
              </a>
              <a href="#" className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-primary transition">
                <FiLinkedin size={18} />
              </a>
            </div>
          </div>

          {/* Links 1 */}
          <div>
            <h4 className="font-bold mb-4">Cho khách hàng</h4>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li><a href="#" className="hover:text-white transition">Tải ứng dụng</a></li>
              <li><a href="#" className="hover:text-white transition">Cách hoạt động</a></li>
              <li><a href="#" className="hover:text-white transition">Giá cước</a></li>
              <li><a href="#" className="hover:text-white transition">Hỗ trợ</a></li>
            </ul>
          </div>

          {/* Links 2 */}
          <div>
            <h4 className="font-bold mb-4">Cho tài xế</h4>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li><a href="#" className="hover:text-white transition">Đăng ký</a></li>
              <li><a href="#" className="hover:text-white transition">Điều khoản</a></li>
              <li><a href="#" className="hover:text-white transition">Hỗ trợ tài xế</a></li>
              <li><a href="#" className="hover:text-white transition">Blog</a></li>
            </ul>
          </div>

          {/* Links 3 */}
          <div>
            <h4 className="font-bold mb-4">Công ty</h4>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li><a href="#" className="hover:text-white transition">Về chúng tôi</a></li>
              <li><a href="#" className="hover:text-white transition">Tin tức</a></li>
              <li><a href="#" className="hover:text-white transition">Liên hệ</a></li>
              <li><a href="#" className="hover:text-white transition">Tuyển dụng</a></li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-700 my-8"></div>

        {/* Bottom Section */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-gray-400 text-sm">
            <p>&copy; {currentYear} FireGo. Tất cả quyền được bảo lưu.</p>
          </div>

          <div className="flex gap-6 text-sm text-gray-400">
            <a href="#" className="hover:text-white transition">Điều khoản sử dụng</a>
            <a href="#" className="hover:text-white transition">Chính sách bảo mật</a>
            <a href="#" className="hover:text-white transition">Chính sách cookie</a>
          </div>

          {/* Download Links */}
          <div className="flex gap-4">
            <a href="#" className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-lg hover:bg-white/20 transition text-sm">
              <img src="https://img.icons8.com/color/96/000000/apple.png" alt="iOS" className="w-4 h-4" />
              App Store
            </a>
            <a href="#" className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-lg hover:bg-white/20 transition text-sm">
              <img src="https://img.icons8.com/color/96/000000/google-play.png" alt="Android" className="w-4 h-4" />
              Play Store
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
