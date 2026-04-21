'use client'

import { useRef } from 'react'
import { motion, useMotionValue, useSpring, useTransform, useInView } from 'framer-motion'
import { Shield, Clock, Star, Phone } from 'lucide-react'
import AppDownloadButtons from '@/components/ui/AppDownloadButtons'
import Link from 'next/link'
import Image from 'next/image'

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

// Floating geometric shapes for 3D background
const shapes = [
  { size: 80, left: '72%', top: '15%', delay: 0, duration: 6, color: 'rgba(255,255,255,0.06)' },
  { size: 50, left: '85%', top: '55%', delay: 1, duration: 8, color: 'rgba(251,191,36,0.10)' },
  { size: 120, left: '60%', top: '70%', delay: 0.5, duration: 7, color: 'rgba(255,255,255,0.04)' },
  { size: 40, left: '90%', top: '30%', delay: 2, duration: 5, color: 'rgba(251,191,36,0.08)' },
  { size: 65, left: '65%', top: '40%', delay: 1.5, duration: 9, color: 'rgba(255,255,255,0.05)' },
]

export default function HeroSection() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(sectionRef, { once: true })

  // Mouse parallax
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const springCfg = { stiffness: 60, damping: 18 }
  const layer1X = useSpring(useTransform(mouseX, [0, 1], [-18, 18]), springCfg)
  const layer1Y = useSpring(useTransform(mouseY, [0, 1], [-10, 10]), springCfg)
  const layer2X = useSpring(useTransform(mouseX, [0, 1], [-32, 32]), springCfg)
  const layer2Y = useSpring(useTransform(mouseY, [0, 1], [-18, 18]), springCfg)
  const layer3X = useSpring(useTransform(mouseX, [0, 1], [10, -10]), springCfg)
  const layer3Y = useSpring(useTransform(mouseY, [0, 1], [6, -6]), springCfg)

  function handleMouseMove(e: React.MouseEvent<HTMLElement>) {
    if (!sectionRef.current) return
    const rect = sectionRef.current.getBoundingClientRect()
    mouseX.set((e.clientX - rect.left) / rect.width)
    mouseY.set((e.clientY - rect.top) / rect.height)
  }

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden min-h-[88vh] flex items-center"
      onMouseMove={handleMouseMove}
    >
      {/* Background gradient */}
      <div className="absolute inset-0 gradient-hero opacity-95" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-orange-900/30" />

      {/* 3D Perspective grid mesh */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
          transform: 'perspective(400px) rotateX(25deg) scale(2)',
          transformOrigin: '50% 0%',
          opacity: 0.6,
        }}
      />

      {/* Parallax layer 1 — large slow blobs */}
      <motion.div
        style={{ x: layer1X, y: layer1Y }}
        className="absolute inset-0 pointer-events-none"
      >
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 right-1/4 w-64 h-64 bg-amber-300/15 rounded-full blur-2xl" />
      </motion.div>

      {/* Parallax layer 2 — floating 3D shapes */}
      <motion.div
        style={{ x: layer2X, y: layer2Y }}
        className="absolute inset-0 pointer-events-none preserve-3d"
      >
        {shapes.map((s, i) => (
          <motion.div
            key={i}
            className="absolute rounded-2xl border border-white/10 preserve-3d"
            style={{
              width: s.size,
              height: s.size,
              left: s.left,
              top: s.top,
              background: s.color,
              transformStyle: 'preserve-3d',
            }}
            animate={{
              rotateX: [0, 15, -10, 0],
              rotateY: [0, 20, -15, 0],
              rotateZ: [0, 5, -5, 0],
              y: [0, -15, 5, 0],
            }}
            transition={{
              duration: s.duration,
              delay: s.delay,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        ))}
      </motion.div>

      {/* Parallax layer 3 — bottom blob (counter-parallax) */}
      <motion.div
        style={{ x: layer3X, y: layer3Y }}
        className="absolute inset-0 pointer-events-none"
      >
        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-amber-300/20 rounded-full blur-2xl" />
      </motion.div>

      {/* Floating badges */}
      <motion.div
        className="absolute top-24 right-4 lg:right-24 hidden sm:block z-10"
        animate={{ y: [0, -10, 0], rotateZ: [0, 1.5, -1, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        style={{ perspective: 600 }}
      >
        <motion.div
          className="glass rounded-2xl px-4 py-3 shadow-lg"
          whileHover={{ scale: 1.05, rotateY: 5 }}
          style={{ transformStyle: 'preserve-3d' }}
        >
          <p className="text-xs font-600 text-slate-700">⭐ 4.9/5 trên App Store</p>
        </motion.div>
      </motion.div>

      <motion.div
        className="absolute bottom-28 right-6 lg:right-32 hidden sm:block z-10"
        animate={{ y: [0, -8, 0], rotateZ: [0, -1.5, 1, 0] }}
        transition={{ duration: 4, delay: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        style={{ perspective: 600 }}
      >
        <motion.div
          className="glass rounded-2xl px-4 py-3 shadow-lg"
          whileHover={{ scale: 1.05, rotateY: -5 }}
          style={{ transformStyle: 'preserve-3d' }}
        >
          <p className="text-xs font-600 text-slate-700">🚗 1,200 chuyến hôm nay</p>
        </motion.div>
      </motion.div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left — text */}
          <div className="max-w-xl">
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

          {/* Headline — 3D perspective reveal */}
          <motion.h1
            initial={{ opacity: 0, rotateX: 30, y: 40, scale: 0.92 }}
            animate={{ opacity: 1, rotateX: 0, y: 0, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.23, 1, 0.32, 1] as [number,number,number,number] }}
            style={{ perspective: '800px', transformStyle: 'preserve-3d' }}
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
            {services.map((s, i) => (
              <motion.div
                key={s.href}
                whileHover={{
                  scale: 1.08,
                  rotateY: 8,
                  rotateX: -4,
                  translateZ: 10,
                }}
                style={{ transformStyle: 'preserve-3d', perspective: 400 }}
                transition={{ type: 'spring', stiffness: 400, damping: 15 }}
              >
                <Link
                  href={s.href}
                  className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white text-sm font-600 px-3 py-1.5 rounded-full border border-white/30 transition-colors"
                >
                  {s.emoji} {s.name}
                </Link>
              </motion.div>
            ))}
          </motion.div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <AppDownloadButtons variant="large" />
          </motion.div>

          {/* Stats — 3D flip in */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex flex-wrap gap-6 mt-10"
          >
            {stats.map((stat, i) => (
              <motion.div
                key={i}
                className="flex items-center gap-2 text-white"
                initial={{ opacity: 0, rotateY: -90 }}
                animate={{ opacity: 1, rotateY: 0 }}
                transition={{ duration: 0.5, delay: 0.7 + i * 0.1, ease: 'easeOut' }}
                whileHover={{ scale: 1.08, rotateY: 5 }}
                style={{ transformStyle: 'preserve-3d', perspective: 300 }}
              >
                <div className="text-amber-300">{stat.icon}</div>
                <div>
                  <div className="text-xl font-900">{stat.value}</div>
                  <div className="text-xs text-orange-200">{stat.label}</div>
                </div>
              </motion.div>
            ))}
          </motion.div>
          </div>{/* /Left */}

          {/* Right — 3D floating image (visible on all screens) */}
          <motion.div
            className="flex items-center justify-center relative mt-10 lg:mt-0"
            initial={{ opacity: 0, y: 30, rotateY: -10 }}
            animate={{ opacity: 1, y: 0, rotateY: 0 }}
            transition={{ duration: 1, delay: 0.3, ease: [0.23, 1, 0.32, 1] as [number,number,number,number] }}
            style={{ perspective: '900px' }}
          >
            <motion.div
              animate={{
                y: [0, -14, 0],
                rotateY: [0, 4, -3, 0],
                rotateX: [0, 3, -2, 0],
              }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
              style={{ transformStyle: 'preserve-3d' }}
              className="relative"
            >
              {/* Glow behind image */}
              <div
                className="absolute inset-0 rounded-3xl blur-3xl scale-90"
                style={{ background: 'rgba(251,191,36,0.25)' }}
              />
              <Image
                src="/img-app-mockup.png"
                alt="FireGo app – dịch vụ di chuyển thông minh"
                width={480}
                height={420}
                className="relative rounded-3xl shadow-2xl object-cover w-full max-w-xs lg:max-w-none"
                priority
              />
              {/* Floating badge on image */}
              <motion.div
                className="absolute -bottom-4 -left-6 glass rounded-2xl px-4 py-3 shadow-xl"
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
              >
                <p className="text-xs font-600 text-slate-700">🔥 1,200+ chuyến hôm nay</p>
              </motion.div>
              <motion.div
                className="absolute -top-4 -right-6 glass rounded-2xl px-4 py-3 shadow-xl"
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
              >
                <p className="text-xs font-600 text-slate-700">⭐ 4.9 / 5 App Store</p>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>{/* /grid */}
      </div>
    </section>
  )
}
