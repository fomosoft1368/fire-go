'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Phone, Mail, MapPin, Clock, MessageCircle } from 'lucide-react'
import Link from 'next/link'
import Card3D from '@/components/ui/Card3D'

const contacts = [
  { icon: <Phone className="w-6 h-6" />, label: 'Hotline', value: '09222.33.666', href: 'tel:0922233666', color: 'bg-orange-50 text-orange-600', gradientFrom: 'from-orange-500', gradientTo: 'to-amber-400' },
  { icon: <Mail className="w-6 h-6" />, label: 'Email', value: 'support@firego.vn', href: 'mailto:support@firego.vn', color: 'bg-blue-50 text-blue-600', gradientFrom: 'from-blue-500', gradientTo: 'to-indigo-500' },
  { icon: <MessageCircle className="w-6 h-6" />, label: 'Live Chat', value: 'Chat trong app', href: '#', color: 'bg-green-50 text-green-600', gradientFrom: 'from-green-500', gradientTo: 'to-emerald-400' },
  { icon: <Clock className="w-6 h-6" />, label: 'Giờ hỗ trợ', value: '24/7 tất cả ngày', href: null, color: 'bg-purple-50 text-purple-600', gradientFrom: 'from-purple-500', gradientTo: 'to-pink-500' },
]

const cardVariants = {
  hidden: { opacity: 0, y: 50, rotateX: 22 },
  visible: {
    opacity: 1, y: 0, rotateX: 0,
    transition: { duration: 0.65, ease: [0.23, 1, 0.32, 1] as [number,number,number,number] },
  },
}

export default function LienHePage() {
  const cardsRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<HTMLDivElement>(null)
  const cardsInView = useInView(cardsRef, { once: true, margin: '-60px' })
  const mapInView = useInView(mapRef, { once: true, margin: '-60px' })

  return (
    <>
      {/* ── Hero ── */}
      <div className="gradient-primary py-16 relative overflow-hidden">
        {/* 3D mesh */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)
            `,
            backgroundSize: '52px 52px',
            transform: 'perspective(400px) rotateX(22deg) scale(2)',
            transformOrigin: '50% 0%',
          }}
        />
        <motion.div
          className="absolute -top-16 -right-16 w-64 h-64 bg-white/10 rounded-full blur-3xl"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <nav className="text-sm text-orange-200 mb-6">
            <Link href="/" className="hover:text-white">Trang chủ</Link>
            <span className="mx-2">/</span>
            <span className="text-white font-600">Liên hệ</span>
          </nav>
          <div className="text-center">
            <motion.div
              className="text-5xl mb-5 inline-block"
              animate={{ y: [0, -10, 0], rotateY: [0, 15, -10, 0], rotateZ: [0, 5, -4, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
              style={{ transformStyle: 'preserve-3d' }}
            >
              📞
            </motion.div>
            <motion.h1
              className="text-4xl font-900 text-white mb-3"
              initial={{ opacity: 0, rotateX: 25, y: 35 }}
              animate={{ opacity: 1, rotateX: 0, y: 0 }}
              transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] as [number,number,number,number] }}
              style={{ perspective: '600px' }}
            >
              Liên hệ với chúng tôi
            </motion.h1>
            <motion.p
              className="text-orange-100 text-lg"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.18 }}
            >
              Chúng tôi luôn sẵn sàng hỗ trợ bạn 24/7
            </motion.p>
          </div>
        </div>
      </div>

      {/* ── Contact Cards + Office Info ── */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Contact cards */}
          <motion.div
            ref={cardsRef}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16"
            initial="hidden"
            animate={cardsInView ? 'visible' : 'hidden'}
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.11 } } }}
            style={{ perspective: '1000px' }}
          >
            {contacts.map((c, i) => (
              <motion.div key={i} variants={cardVariants} style={{ transformStyle: 'preserve-3d' }}>
                <Card3D className="h-full" intensity={8}>
                  <div className="card p-6 text-center h-full">
                    <motion.div
                      className={`w-14 h-14 bg-gradient-to-br ${c.gradientFrom} ${c.gradientTo} rounded-2xl flex items-center justify-center mx-auto mb-4 text-white shadow-lg`}
                      animate={{ y: [0, -5, 0], rotateZ: [0, 3, -2, 0] }}
                      whileHover={{ scale: 1.15, rotateY: 180 }}
                      transition={{
                        y: { duration: 3 + i * 0.5, repeat: Infinity, ease: 'easeInOut' },
                        rotateY: { duration: 0.5 },
                      }}
                      style={{ transformStyle: 'preserve-3d' }}
                    >
                      {c.icon}
                    </motion.div>
                    <h3 className="font-700 text-slate-800 mb-1">{c.label}</h3>
                    {c.href ? (
                      <a href={c.href} className="text-sm text-orange-600 hover:underline font-600">{c.value}</a>
                    ) : (
                      <p className="text-sm text-slate-500">{c.value}</p>
                    )}
                  </div>
                </Card3D>
              </motion.div>
            ))}
          </motion.div>

          {/* Office info + map */}
          <div ref={mapRef} className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -40, rotateY: 12 }}
              animate={mapInView ? { opacity: 1, x: 0, rotateY: 0 } : {}}
              transition={{ duration: 0.75, ease: [0.23, 1, 0.32, 1] as [number,number,number,number] }}
              style={{ perspective: '700px' }}
            >
              <h2 className="section-title mb-4">Văn phòng FireGo</h2>
              <div className="space-y-4">
                {[
                  { title: 'Vinh, Nghệ An (Trụ sở chính)', desc: 'Số 9, Giáng Hương 3, Khu đô thị Vinh Heritage, Phường Trường Vinh, Tỉnh Nghệ An' },
                  { title: 'Hà Nội (Chi nhánh)', desc: 'Quận Hoàn Kiếm, Hà Nội' },
                ].map((o, i) => (
                  <motion.div
                    key={i}
                    className="flex gap-3"
                    initial={{ opacity: 0, x: -20 }}
                    animate={mapInView ? { opacity: 1, x: 0 } : {}}
                    transition={{ duration: 0.5, delay: 0.15 + i * 0.1 }}
                  >
                    <MapPin className="w-5 h-5 text-orange-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-600 text-slate-800">{o.title}</p>
                      <p className="text-sm text-slate-500">{o.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
              <motion.div
                className="mt-8 p-5 bg-orange-50 rounded-2xl border border-orange-100"
                initial={{ opacity: 0, y: 20 }}
                animate={mapInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.35 }}
              >
                <p className="font-700 text-orange-800 mb-1">🤝 Muốn hợp tác kinh doanh?</p>
                <p className="text-sm text-orange-700 mb-3">Gửi email về <a href="mailto:partner@firego.vn" className="underline">partner@firego.vn</a></p>
                <Link href="/doi-tac" className="btn-primary text-sm py-2 px-4">Đăng ký đối tác</Link>
              </motion.div>
            </motion.div>

            {/* Map placeholder — 3D reveal */}
            <motion.div
              initial={{ opacity: 0, x: 40, rotateY: -12 }}
              animate={mapInView ? { opacity: 1, x: 0, rotateY: 0 } : {}}
              transition={{ duration: 0.75, delay: 0.1, ease: [0.23, 1, 0.32, 1] as [number,number,number,number] }}
              style={{ perspective: '700px' }}
            >
              <Card3D intensity={5}>
                <div className="bg-slate-100 rounded-3xl h-64 lg:h-80 flex items-center justify-center text-slate-400 text-sm">
                  <div className="text-center">
                    <motion.div
                      animate={{ y: [0, -8, 0], rotateZ: [0, 5, -4, 0] }}
                      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                    >
                      <MapPin className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    </motion.div>
                    <p>Bản đồ Google Maps</p>
                  </div>
                </div>
              </Card3D>
            </motion.div>
          </div>
        </div>
      </section>
    </>
  )
}
