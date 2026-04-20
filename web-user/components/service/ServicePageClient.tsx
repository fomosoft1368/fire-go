'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { CheckCircle, ArrowRight } from 'lucide-react'
import AppDownloadButtons from '@/components/ui/AppDownloadButtons'
import Link from 'next/link'
import Card3D from '@/components/ui/Card3D'
import Image from 'next/image'
import type { Service } from '@/lib/data/services'

interface ActivePricing {
  base: number
  perKm: number
  unit: string
}

interface Props {
  service: Service
  activePricing: ActivePricing
  allServices: Service[]
}

const containerVariants: import("framer-motion").Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
}
const itemVariants: import("framer-motion").Variants = {
  hidden: { opacity: 0, y: 50, rotateX: 20 },
  visible: {
    opacity: 1, y: 0, rotateX: 0,
    transition: { duration: 0.65, ease: [0.23, 1, 0.32, 1] as [number,number,number,number] },
  },
}

export default function ServicePageClient({ service, activePricing, allServices }: Props) {
  const featuresRef = useRef<HTMLElement>(null)
  const pricingRef = useRef<HTMLElement>(null)
  const ctaRef = useRef<HTMLElement>(null)
  const featuresInView = useInView(featuresRef, { once: true, margin: '-60px' })
  const pricingInView = useInView(pricingRef, { once: true, margin: '-60px' })
  const ctaInView = useInView(ctaRef, { once: true, margin: '-60px' })

  return (
    <>
      {/* Breadcrumb */}
      <div className="bg-white border-b border-slate-100 py-3 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-sm text-slate-500">
          <Link href="/" className="hover:text-orange-500 transition-colors">Trang chủ</Link>
          <span className="mx-2">/</span>
          <span className={`font-600 ${service.textColor}`}>{service.name}</span>
        </div>
      </div>

      {/* ── Hero ── */}
      <section className={`py-20 bg-gradient-to-br ${service.color} relative overflow-hidden`}>
        {/* 3D grid mesh */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)
            `,
            backgroundSize: '55px 55px',
            transform: 'perspective(400px) rotateX(22deg) scale(2)',
            transformOrigin: '50% 0%',
          }}
        />

        {/* Blobs */}
        <motion.div
          className="absolute -top-20 -right-20 w-72 h-72 bg-white/10 rounded-full blur-3xl"
          animate={{ scale: [1, 1.18, 1], opacity: [0.5, 0.85, 0.5] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full blur-2xl"
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left — text */}
            <div className="max-w-xl">
            {/* Emoji 3D float */}
            <motion.div
              className="text-7xl mb-6 inline-block"
              animate={{
                y: [0, -12, 0],
                rotateZ: [0, 5, -4, 0],
                rotateY: [0, 15, -10, 0],
              }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
              style={{ transformStyle: 'preserve-3d' }}
            >
              {service.emoji}
            </motion.div>

            <motion.h1
              className="text-4xl sm:text-5xl font-900 text-white mb-4"
              initial={{ opacity: 0, rotateX: 28, y: 40 }}
              animate={{ opacity: 1, rotateX: 0, y: 0 }}
              transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] as [number,number,number,number] }}
              style={{ perspective: '700px' }}
            >
              {service.name}
            </motion.h1>

            <motion.p
              className="text-xl text-white/90 mb-3 font-600"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
            >
              {service.tagline}
            </motion.p>

            <motion.p
              className="text-white/80 leading-relaxed mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.25 }}
            >
              {service.longDescription}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.35 }}
            >
              <AppDownloadButtons variant="large" />
            </motion.div>
          </div>{/* /Left */}

          {/* Right — 3D floating image (visible on all screens) */}
          {service.image && (
            <motion.div
              className="flex items-center justify-center relative mt-8 lg:mt-0"
              initial={{ opacity: 0, y: 30, rotateY: -10 }}
              animate={{ opacity: 1, y: 0, rotateY: 0 }}
              transition={{ duration: 0.95, delay: 0.3, ease: [0.23, 1, 0.32, 1] as [number,number,number,number] }}
              style={{ perspective: '900px' }}
            >
              <motion.div
                animate={{
                  y: [0, -12, 0],
                  rotateY: [0, 4, -3, 0],
                  rotateX: [0, 2, -2, 0],
                }}
                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                style={{ transformStyle: 'preserve-3d' }}
                className="relative"
              >
                <div className="absolute inset-0 rounded-3xl blur-3xl scale-90 bg-white/20" />
                <Image
                  src={service.image}
                  alt={`Dịch vụ ${service.name} – FireGo`}
                  width={460}
                  height={400}
                  className="relative rounded-3xl shadow-2xl object-cover w-full max-w-xs lg:max-w-none"
                  priority
                />
                {/* Price badge */}
                <motion.div
                  className="absolute -bottom-4 -left-4 glass rounded-2xl px-4 py-3 shadow-xl"
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <p className="text-xs text-slate-500">Từ</p>
                  <p className={`text-sm font-800 ${service.textColor}`}>
                    {service.pricing.base.toLocaleString('vi-VN')}đ/{service.pricing.unit}
                  </p>
                </motion.div>
              </motion.div>
            </motion.div>
          )}
          </div>{/* /grid */}
        </div>
      </section>

      {/* ── Features ── */}
      <section ref={featuresRef} className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, rotateX: 18, y: 30 }}
            animate={featuresInView ? { opacity: 1, rotateX: 0, y: 0 } : {}}
            transition={{ duration: 0.7, ease: [0.23, 1, 0.32, 1] as [number,number,number,number] }}
            style={{ perspective: '600px' }}
          >
            <h2 className="section-title mb-3">Tại sao chọn {service.name} của FireGo?</h2>
            <p className="section-subtitle">Những lợi ích nổi bật mà bạn sẽ nhận được</p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
            variants={containerVariants}
            initial="hidden"
            animate={featuresInView ? 'visible' : 'hidden'}
            style={{ perspective: '1000px' }}
          >
            {service.features.map((feature, i) => (
              <motion.div key={i} variants={itemVariants} style={{ transformStyle: 'preserve-3d' }}>
                <Card3D className="h-full" intensity={6}>
                  <div className="card p-6 flex items-start gap-4 h-full">
                    <motion.div
                      className={`w-10 h-10 rounded-full bg-gradient-to-br ${service.color} flex items-center justify-center shrink-0`}
                      whileHover={{ scale: 1.2, rotateY: 180 }}
                      transition={{ duration: 0.4 }}
                      style={{ transformStyle: 'preserve-3d' }}
                    >
                      <CheckCircle className="w-5 h-5 text-white" />
                    </motion.div>
                    <div>
                      <p className="font-600 text-slate-800">{feature}</p>
                    </div>
                  </div>
                </Card3D>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section
        ref={pricingRef}
        className="py-16 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #FFF7ED, #FFFBF5)' }}
      >
        {/* 3D perspective grid (bottom) */}
        <div
          className="absolute inset-0 pointer-events-none opacity-50"
          style={{
            backgroundImage: `
              linear-gradient(rgba(249,115,22,0.07) 1px, transparent 1px),
              linear-gradient(90deg, rgba(249,115,22,0.07) 1px, transparent 1px)
            `,
            backgroundSize: '72px 72px',
            transform: 'perspective(500px) rotateX(28deg) scale(1.6)',
            transformOrigin: '50% 100%',
          }}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={pricingInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
          >
            <h2 className="section-title mb-3">Bảng giá tham khảo</h2>
            <p className="section-subtitle mb-10">Giá minh bạch, không ẩn phí</p>
          </motion.div>

          <motion.div
            className="max-w-md mx-auto"
            initial={{ opacity: 0, rotateY: -25, scale: 0.92 }}
            animate={pricingInView ? { opacity: 1, rotateY: 0, scale: 1 } : {}}
            transition={{ duration: 0.75, ease: [0.23, 1, 0.32, 1] as [number,number,number,number] }}
            style={{ perspective: '800px' }}
          >
            <Card3D intensity={7}>
              <div className="bg-white rounded-3xl shadow-brand-lg p-8 border border-orange-100">
                <motion.div
                  className="text-5xl mb-4 inline-block"
                  animate={{ rotateY: [0, 15, -10, 0], y: [0, -5, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  {service.emoji}
                </motion.div>
                <h3 className="text-xl font-800 text-slate-900 mb-2">{service.name}</h3>
                {activePricing.base > 0 && (
                  <div className="mt-4 space-y-2 text-left">
                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                      <span className="text-slate-600 text-sm">Phí cơ bản</span>
                      <span className={`font-700 ${service.textColor}`}>
                        {activePricing.base.toLocaleString('vi-VN')}đ/{activePricing.unit}
                      </span>
                    </div>
                    {activePricing.perKm > 0 && (
                      <div className="flex justify-between items-center py-2 border-b border-slate-100">
                        <span className="text-slate-600 text-sm">Phí mỗi km thêm</span>
                        <span className={`font-700 ${service.textColor}`}>
                          {activePricing.perKm.toLocaleString('vi-VN')}đ/km
                        </span>
                      </div>
                    )}
                  </div>
                )}
                <p className="text-xs text-slate-400 mt-4 mb-6">{service.pricing.note}</p>
                <AppDownloadButtons />
              </div>
            </Card3D>
          </motion.div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section ref={ctaRef} className="py-16 gradient-hero relative overflow-hidden">
        {/* Mesh */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
            transform: 'perspective(450px) rotateX(35deg) scale(2)',
            transformOrigin: '50% 100%',
          }}
        />
        <motion.div
          className="absolute -top-16 -right-16 w-56 h-56 bg-white/10 rounded-full blur-3xl"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        />

        <div className="max-w-3xl mx-auto px-4 text-center relative z-10">
          <motion.h2
            className="text-3xl font-900 text-white mb-3"
            initial={{ opacity: 0, rotateX: 22, y: 30 }}
            animate={ctaInView ? { opacity: 1, rotateX: 0, y: 0 } : {}}
            transition={{ duration: 0.75, ease: [0.23, 1, 0.32, 1] as [number,number,number,number] }}
            style={{ perspective: '600px' }}
          >
            Sẵn sàng đặt {service.name}?
          </motion.h2>
          <motion.p
            className="text-orange-100 mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={ctaInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.15 }}
          >
            Tải app FireGo và đặt dịch vụ trong vài giây!
          </motion.p>
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={ctaInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.25 }}
          >
            <AppDownloadButtons variant="large" className="justify-center" />
          </motion.div>
        </div>
      </section>

      {/* ── Other services ── */}
      <section className="py-14 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl font-800 text-slate-900 mb-6 text-center">Khám phá thêm dịch vụ khác</h2>
          <div className="flex flex-wrap justify-center gap-3">
            {allServices.filter(s => s.id !== service.id).map((s, i) => (
              <motion.div
                key={s.id}
                whileHover={{ scale: 1.08, rotateY: 8, rotateX: -3 }}
                style={{ transformStyle: 'preserve-3d', perspective: 400 }}
                transition={{ type: 'spring', stiffness: 350, damping: 14 }}
              >
                <Link
                  href={`/${s.slug}`}
                  className={`flex items-center gap-2 ${s.bgColor} ${s.textColor} px-5 py-2.5 rounded-full font-600 text-sm transition-shadow hover:shadow-md`}
                >
                  {s.emoji} {s.name} <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
