'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import AppDownloadButtons from '@/components/ui/AppDownloadButtons'

// Orbiting ring items
const orbitItems = ['🚗', '🧑‍✈️', '📦', '🧹']

export default function AppDownloadCTA() {
  const ref = useRef<HTMLElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-60px' })

  return (
    <section
      ref={ref}
      className="py-20 gradient-hero relative overflow-hidden"
    >
      {/* 3D perspective mesh background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
          transform: 'perspective(500px) rotateX(40deg) scale(2)',
          transformOrigin: '50% 100%',
          animation: 'mesh-pulse 4s ease-in-out infinite',
        }}
      />

      {/* Background blobs */}
      <motion.div
        className="absolute -top-20 -right-20 w-72 h-72 bg-white/10 rounded-full blur-3xl"
        animate={{ scale: [1, 1.2, 1], opacity: [0.6, 0.9, 0.6] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute -bottom-20 -left-20 w-72 h-72 bg-amber-300/20 rounded-full blur-2xl"
        animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
      />

      {/* Extra glow orbs */}
      <motion.div
        className="absolute top-1/2 left-1/4 w-48 h-48 bg-white/5 rounded-full blur-2xl"
        animate={{ x: [-20, 20, -20], y: [-15, 15, -15] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* 3D Fire orb with orbiting service icons */}
        <div className="flex justify-center mb-8">
          <div className="relative w-32 h-32" style={{ perspective: '400px' }}>
            {/* Rotating ring */}
            <motion.div
              className="absolute inset-0"
              animate={{ rotateY: 360, rotateX: 20 }}
              transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
              style={{ transformStyle: 'preserve-3d' }}
            >
              {orbitItems.map((emoji, i) => {
                const angle = (i / orbitItems.length) * 360
                const rad = (angle * Math.PI) / 180
                const rx = Math.cos(rad) * 54
                const ry = Math.sin(rad) * 54
                return (
                  <div
                    key={i}
                    className="absolute w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-lg border border-white/30"
                    style={{
                      left: `calc(50% + ${rx}px - 20px)`,
                      top: `calc(50% + ${ry}px - 20px)`,
                    }}
                  >
                    {emoji}
                  </div>
                )
              })}
            </motion.div>

            {/* Center fire */}
            <motion.div
              className="absolute inset-0 flex items-center justify-center text-5xl"
              animate={{
                rotateZ: [0, 5, -5, 0],
                scale: [1, 1.12, 0.96, 1],
                y: [0, -6, 2, 0],
              }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              🔥
            </motion.div>

            {/* Glow ring */}
            <div
              className="absolute inset-4 rounded-full pointer-events-none"
              style={{
                boxShadow: '0 0 40px 10px rgba(249,115,22,0.4)',
                animation: 'pulse-ring 2s ease-out infinite',
              }}
            />
          </div>
        </div>

        {/* Headline */}
        <motion.h2
          className="text-3xl sm:text-4xl lg:text-5xl font-900 text-white mb-4"
          initial={{ opacity: 0, rotateX: 25, y: 30 }}
          animate={isInView ? { opacity: 1, rotateX: 0, y: 0 } : {}}
          transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] as [number,number,number,number] }}
          style={{ perspective: '600px' }}
        >
          Sẵn sàng trải nghiệm?
        </motion.h2>

        <motion.p
          className="text-orange-100 text-lg mb-8 max-w-xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.15 }}
        >
          Tải FireGo ngay hôm nay và nhận{' '}
          <strong className="text-white">voucher 50.000đ</strong> cho chuyến đi đầu tiên!
        </motion.p>

        <motion.div
          className="flex justify-center mb-8"
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.25 }}
        >
          <AppDownloadButtons variant="large" />
        </motion.div>

        <motion.div
          className="flex flex-wrap justify-center gap-6 text-white/80 text-sm"
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          {['✅ Miễn phí tải xuống', '✅ Không quảng cáo phiền toái', '✅ Hỗ trợ 24/7'].map((t) => (
            <motion.span key={t} whileHover={{ scale: 1.05, color: '#ffffff' }}>
              {t}
            </motion.span>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
