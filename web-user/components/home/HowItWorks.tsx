'use client'

import { useRef } from 'react'
import { motion, useInView, type Variants } from 'framer-motion'

const steps = [
  {
    step: '01',
    title: 'Tải app FireGo',
    description: 'Có mặt trên App Store (iOS) và Google Play (Android). Cài đặt miễn phí trong 30 giây.',
    icon: '📱',
    color: 'from-orange-500 to-amber-400',
    shadowColor: 'rgba(249,115,22,0.35)',
  },
  {
    step: '02',
    title: 'Đăng ký tài khoản',
    description: 'Chỉ cần số điện thoại là đủ. Xác minh OTP và tạo profile trong vài giây.',
    icon: '👤',
    color: 'from-blue-500 to-indigo-500',
    shadowColor: 'rgba(99,102,241,0.35)',
  },
  {
    step: '03',
    title: 'Chọn dịch vụ',
    description: 'Ghép xe, lái hộ, vận chuyển hay vệ sinh – chọn đúng nhu cầu của bạn hôm nay.',
    icon: '🎯',
    color: 'from-green-500 to-emerald-400',
    shadowColor: 'rgba(52,211,153,0.35)',
  },
  {
    step: '04',
    title: 'Đặt & tận hưởng',
    description: 'Xác nhận đặt, theo dõi real-time và thanh toán tiện lợi. Đơn giản vậy thôi!',
    icon: '✅',
    color: 'from-purple-500 to-pink-500',
    shadowColor: 'rgba(168,85,247,0.35)',
  },
]

const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.18 },
  },
}

const stepVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 80,
    rotateX: 35,
    scale: 0.88,
  },
  visible: {
    opacity: 1,
    y: 0,
    rotateX: 0,
    scale: 1,
    transition: {
      duration: 0.75,
      ease: [0.23, 1, 0.32, 1] as [number, number, number, number],
    },
  },
}

const connectorVariants: Variants = {
  hidden: { scaleX: 0, originX: 0 },
  visible: {
    scaleX: 1,
    transition: { duration: 1.2, ease: 'easeInOut', delay: 0.3 },
  },
}

export default function HowItWorks() {
  const ref = useRef<HTMLElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section
      ref={ref}
      className="py-20 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #FFF7ED 0%, #FFFBF5 50%, #FFF3E0 100%)' }}
    >
      {/* 3D perspective grid - subtle background depth */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage: `
            linear-gradient(rgba(249,115,22,0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(249,115,22,0.06) 1px, transparent 1px)
          `,
          backgroundSize: '80px 80px',
          transform: 'perspective(600px) rotateX(30deg) scale(1.5)',
          transformOrigin: '50% 100%',
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-14">
          <motion.span
            className="inline-block bg-orange-100 text-orange-700 text-xs font-700 uppercase tracking-wider px-3 py-1 rounded-full mb-4"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.5 }}
          >
            Đơn giản - Nhanh chóng
          </motion.span>
          <motion.h2
            className="section-title mb-4"
            initial={{ opacity: 0, rotateX: 20, y: 30 }}
            animate={isInView ? { opacity: 1, rotateX: 0, y: 0 } : {}}
            transition={{ duration: 0.7, ease: [0.23, 1, 0.32, 1] as [number,number,number,number] }}
            style={{ perspective: '600px' }}
          >
            Cách sử dụng FireGo
          </motion.h2>
          <motion.p
            className="section-subtitle max-w-xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.15 }}
          >
            Chỉ 4 bước cực đơn giản để trải nghiệm toàn bộ hệ sinh thái dịch vụ của chúng tôi
          </motion.p>
        </div>

        {/* Steps */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 relative"
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          style={{ perspective: '1000px' }}
        >
          {/* Connector line (desktop) — animated draw */}
          <motion.div
            className="hidden lg:block absolute top-10 left-[12.5%] right-[12.5%] h-0.5 bg-gradient-to-r from-orange-300 via-blue-300 to-purple-300 z-0 origin-left"
            variants={connectorVariants}
          />

          {steps.map((step, index) => (
            <motion.div
              key={index}
              className="relative z-10 flex flex-col items-center text-center"
              variants={stepVariants}
              style={{ transformStyle: 'preserve-3d' }}
            >
              {/* 3D icon circle */}
              <motion.div
                className={`w-20 h-20 rounded-full bg-gradient-to-br ${step.color} flex items-center justify-center text-3xl shadow-lg mb-4`}
                style={{
                  boxShadow: `0 12px 30px ${step.shadowColor}, 0 4px 12px rgba(0,0,0,0.1)`,
                  transformStyle: 'preserve-3d',
                }}
                whileHover={{
                  scale: 1.15,
                  rotateY: 360,
                  boxShadow: `0 20px 50px ${step.shadowColor}`,
                }}
                animate={{
                  y: [0, -6, 0],
                  rotateZ: [0, 2, -2, 0],
                }}
                transition={{
                  y: { duration: 3 + index * 0.5, repeat: Infinity, ease: 'easeInOut' },
                  rotateZ: { duration: 4 + index * 0.3, repeat: Infinity, ease: 'easeInOut' },
                  scale: { type: 'spring', stiffness: 300 },
                  rotateY: { duration: 0.6, ease: 'easeInOut' },
                }}
              >
                {step.icon}
              </motion.div>

              {/* Step number */}
              <motion.div
                className="text-5xl font-900 text-slate-100 -mt-2 mb-2 select-none"
                style={{
                  textShadow: '2px 4px 0px rgba(0,0,0,0.05)',
                  transform: 'perspective(300px) rotateX(10deg)',
                }}
              >
                {step.step}
              </motion.div>

              <h3 className="text-lg font-800 text-slate-900 mb-2">{step.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{step.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
