'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { Menu, X, Flame } from 'lucide-react'
import AppDownloadButtons from '@/components/ui/AppDownloadButtons'

const navLinks = [
  { href: '/', label: 'Trang chủ' },
  { href: '/ghep-xe', label: 'Ghép Xe' },
  { href: '/lai-ho', label: 'Lái Hộ' },
  { href: '/van-chuyen', label: 'Vận Chuyển' },
  { href: '/ve-sinh', label: 'Vệ Sinh' },
  { href: '/doi-tac', label: 'Đối Tác' },
  { href: '/tin-tuc', label: 'Tin Tức' },
  { href: '/faq', label: 'FAQ' },
]

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled ? 'glass shadow-brand' : 'bg-white/95'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-18">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group" aria-label="Trang chủ FireGo">
            <div className="w-9 h-9 gradient-primary rounded-xl flex items-center justify-center shadow-brand group-hover:scale-110 transition-transform">
              <Flame className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-extrabold tracking-tight">
              <span className="gradient-text">Fire</span>
              <span className="text-slate-800">Go</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav aria-label="Danh mục chính" className="hidden lg:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-600 text-slate-600 hover:text-orange-500 transition-colors relative group"
              >
                {link.label}
                <span className="absolute -bottom-0.5 left-0 w-0 h-0.5 bg-orange-500 group-hover:w-full transition-all duration-300 rounded-full" />
              </Link>
            ))}
          </nav>

          {/* CTA */}
          <div className="hidden lg:flex items-center gap-3">
            <AppDownloadButtons variant="compact" />
          </div>

          {/* Mobile menu toggle */}
          <button
            className="lg:hidden p-2 rounded-lg text-slate-600 hover:text-orange-500 hover:bg-orange-50 transition-colors"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Mở/đóng menu"
          >
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        className={`lg:hidden overflow-hidden transition-all duration-300 ${
          menuOpen ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-4 pb-4 pt-2 bg-white border-t border-slate-100 space-y-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="block px-4 py-2.5 text-sm font-600 text-slate-700 rounded-xl hover:bg-orange-50 hover:text-orange-600 transition-colors"
            >
              {link.label}
            </Link>
          ))}
          <div className="pt-3 pb-1">
            <AppDownloadButtons variant="compact" />
          </div>
        </div>
      </div>
    </header>
  )
}
