'use client'

import { motion } from 'framer-motion'
import { Shield, Clock, Star, Phone } from 'lucide-react'
import AppDownloadButtons from '@/components/ui/AppDownloadButtons'
import Link from 'next/link'

const stats = [
  { icon: <Star className="w-5 h-5" />, value: '4.9★', label: 'Đánh giá' },
  { icon: <Shield className="w-5 h-5" />, value: '50K+', label: 'Người dùng' },
  { icon: <Clock className="w-5 h-5" />, value: '24/7', label: 'Hỗ trợ' },
  { icon: <Phone className="w-5 h-5" />, value: '4', label: 'Dịch vụ' },
]

const services = [
  { emoji: '🚗', name: 'Ghép Xe', href: '/ghep-xe' },
  { emoji: '🧑‍✈️', name: 'Lái Hộ', href: '/lai-ho' },
  { emoji: '📦', name: 'Vận Chuyển', href: '/van-chuyen' },
  { emoji: '🧹', name: 'Vệ Sinh', href: '/ve-sinh' },
]

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden min-h-[88vh] flex items-center">
      {/* Background gradient */}
      <div className="absolute inset-0 gradient-hero opacity-95" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-orange-900/30" />

      {/* Decorative circles */}
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-amber-300/20 rounded-full blur-2xl" />

      {/* Floating badges */}
      <div className="absolute top-24 right-4 lg:right-24 hidden sm:block animate-float z-10">
        <div className="glass rounded-2xl px-4 py-3 shadow-lg">
          <p className="text-xs font-600 text-slate-700">⭐ 4.9/5 trên App Store</p>
        </div>
      </div>
      <div className="absolute bottom-28 right-6 lg:right-32 hidden sm:block animate-float-delayed z-10">
        <div className="glass rounded-2xl px-4 py-3 shadow-lg">
          <p className="text-xs font-600 text-slate-700">🚗 1,200 chuyến hôm nay</p>
        </div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-20">
        <div className="max-w-3xl">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm border border-white/30 rounded-full px-4 py-2 mb-6"
          >
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-white text-sm font-600">Đang hoạt động tại Vinh, Nghệ An</span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-900 text-white leading-tight mb-6"
          >
            Di chuyển thông minh,
            <br />
            <span className="text-amber-200">sống tiện nghi</span> hơn
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg sm:text-xl text-orange-100 leading-relaxed mb-8 max-w-xl"
          >
            Ghép xe tiết kiệm, lái hộ an toàn, vận chuyển linh hoạt và vệ sinh chuyên nghiệp –
            tất cả trong một ứng dụng duy nhất.
          </motion.p>

          {/* Service quick links */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-wrap gap-2 mb-8"
          >
            {services.map((s) => (
              <Link
                key={s.href}
                href={s.href}
                className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white text-sm font-600 px-3 py-1.5 rounded-full border border-white/30 transition-all hover:scale-105"
              >
                {s.emoji} {s.name}
              </Link>
            ))}
          </motion.div>

          {/* CTA buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <AppDownloadButtons variant="large" />
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex flex-wrap gap-6 mt-10"
          >
            {stats.map((stat, i) => (
              <div key={i} className="flex items-center gap-2 text-white">
                <div className="text-amber-300">{stat.icon}</div>
                <div>
                  <div className="text-xl font-900">{stat.value}</div>
                  <div className="text-xs text-orange-200">{stat.label}</div>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  )
}
