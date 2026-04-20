'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { FAQ_ITEMS } from '@/lib/data/faq'
import FAQAccordion from '@/components/ui/FAQAccordion'
import Link from 'next/link'
import AppDownloadButtons from '@/components/ui/AppDownloadButtons'

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQ_ITEMS.map(item => ({
    '@type': 'Question',
    name: item.question,
    acceptedAnswer: { '@type': 'Answer', text: item.answer },
  })),
}

export default function FAQPage() {
  const faqRef = useRef<HTMLElement>(null)
  const ctaRef = useRef<HTMLDivElement>(null)
  const faqInView = useInView(faqRef, { once: true, margin: '-60px' })
  const ctaInView = useInView(ctaRef, { once: true, margin: '-60px' })

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* ── Hero ── */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 py-16 relative overflow-hidden">
        {/* 3D mesh */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)
            `,
            backgroundSize: '52px 52px',
            transform: 'perspective(400px) rotateX(22deg) scale(2)',
            transformOrigin: '50% 0%',
          }}
        />

        {/* Floating orbs */}
        <motion.div
          className="absolute -top-20 -right-20 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl"
          animate={{ scale: [1, 1.25, 1], opacity: [0.4, 0.75, 0.4] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-0 -left-10 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl"
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <nav className="text-sm text-slate-400 mb-6">
            <Link href="/" className="hover:text-white">Trang chủ</Link>
            <span className="mx-2">/</span>
            <span className="text-white font-600">FAQ</span>
          </nav>
          <div className="text-center">
            <motion.div
              className="text-5xl mb-4 inline-block"
              animate={{
                y: [0, -10, 0],
                rotateY: [0, 20, -15, 0],
                rotateZ: [0, 5, -4, 0],
              }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
              style={{ transformStyle: 'preserve-3d' }}
            >
              ❓
            </motion.div>

            <motion.h1
              className="text-3xl sm:text-4xl font-900 text-white mb-3"
              initial={{ opacity: 0, rotateX: 25, y: 35 }}
              animate={{ opacity: 1, rotateX: 0, y: 0 }}
              transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] as [number,number,number,number] }}
              style={{ perspective: '600px' }}
            >
              Câu hỏi thường gặp
            </motion.h1>

            <motion.p
              className="text-slate-400 max-w-xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.18 }}
            >
              Không tìm được câu trả lời? Hãy liên hệ với chúng tôi qua{' '}
              <a href="tel:0922233666" className="text-orange-400 hover:text-orange-300 font-600">09222.33.666</a>
            </motion.p>
          </div>
        </div>
      </div>

      {/* ── FAQ List ── */}
      <section ref={faqRef} className="py-14">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, rotateX: 20, y: 40 }}
            animate={faqInView ? { opacity: 1, rotateX: 0, y: 0 } : {}}
            transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] as [number,number,number,number] }}
            style={{ perspective: '700px' }}
          >
            <FAQAccordion items={FAQ_ITEMS} />
          </motion.div>

          {/* CTA box */}
          <motion.div
            ref={ctaRef}
            className="mt-14 bg-orange-50 rounded-3xl p-8 text-center border border-orange-100 relative overflow-hidden"
            initial={{ opacity: 0, y: 40, rotateX: 15, scale: 0.96 }}
            animate={ctaInView ? { opacity: 1, y: 0, rotateX: 0, scale: 1 } : {}}
            transition={{ duration: 0.75, ease: [0.23, 1, 0.32, 1] as [number,number,number,number] }}
            style={{ perspective: '700px' }}
          >
            {/* subtle 3D glow */}
            <div
              className="absolute inset-0 rounded-3xl pointer-events-none"
              style={{
                background: 'radial-gradient(ellipse 80% 60% at 50% 100%, rgba(249,115,22,0.08) 0%, transparent 70%)',
              }}
            />
            <motion.div
              className="text-4xl mb-3 inline-block"
              animate={{ y: [0, -6, 0], rotateZ: [0, 4, -3, 0] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              💬
            </motion.div>
            <h3 className="font-800 text-slate-900 text-xl mb-2">Vẫn còn thắc mắc?</h3>
            <p className="text-slate-500 mb-6">Tải app để chat trực tiếp với đội hỗ trợ 24/7</p>
            <AppDownloadButtons className="justify-center" />
          </motion.div>
        </div>
      </section>
    </>
  )
}
