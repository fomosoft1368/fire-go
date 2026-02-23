import React, { useState } from 'react'

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <header className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md z-50 border-b border-gray-200">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-orange-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">🚗</span>
            </div>
            <span className="text-2xl font-bold text-gradient">FireGo</span>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-gray-600 hover:text-primary transition">Tính năng</a>
            <a href="#howitworks" className="text-gray-600 hover:text-primary transition">Cách hoạt động</a>
            <a href="#driver" className="text-gray-600 hover:text-primary transition">Trở thành tài xế</a>
            <a href="#faq" className="text-gray-600 hover:text-primary transition">Hỏi đáp</a>
          </div>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center gap-4">
            <button className="text-primary hover:text-orange-600 font-semibold transition">
              Đăng nhập
            </button>
            <button className="bg-primary text-white px-6 py-2 rounded-lg font-semibold hover:bg-orange-600 transition">
              Tải ứng dụng
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button 
            className="md:hidden text-2xl"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            ☰
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden mt-4 space-y-3 pb-4">
            <a href="#features" className="block text-gray-600 hover:text-primary">Tính năng</a>
            <a href="#howitworks" className="block text-gray-600 hover:text-primary">Cách hoạt động</a>
            <a href="#driver" className="block text-gray-600 hover:text-primary">Trở thành tài xế</a>
            <a href="#faq" className="block text-gray-600 hover:text-primary">Hỏi đáp</a>
            <button className="w-full bg-primary text-white py-2 rounded-lg font-semibold">
              Tải ứng dụng
            </button>
          </div>
        )}
      </nav>
    </header>
  )
}
