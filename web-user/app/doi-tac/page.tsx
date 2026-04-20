'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { CheckCircle } from 'lucide-react'
import PartnerForm from '@/components/ui/PartnerForm'
import Link from 'next/link'
import Card3D from '@/components/ui/Card3D'
import Image from 'next/image'

const benefits = [
  { icon: '💰', title: 'Thu nhập cao', description: 'Tài xế kiếm trung bình 8–15 triệu/tháng tùy khu vực và giờ hoạt động' },
  { icon: '⏰', title: 'Lịch linh hoạt', description: 'Tự quyết định giờ làm, không bị ràng buộc bởi ca cố định' },
  { icon: '🛡️', title: 'Bảo hiểm toàn diện', description: 'FireGo mua bảo hiểm tai nạn toàn diện cho đối tác trong suốt ca làm việc' },
  { icon: '📱', title: 'App hiện đại', description: 'Công cụ quản lý đơn hàng, thu nhập và hỗ trợ trực tiếp trong app' },
  { icon: '🤝', title: 'Cộng đồng thân thiện', description: 'Tham gia cộng đồng hàng nghìn đối tác, chia sẻ kinh nghiệm và hỗ trợ nhau' },
  { icon: '🌟', title: 'Chương trình thưởng', description: 'Nhận thưởng theo hiệu suất và đánh giá cao từ khách hàng mỗi tháng' },
]

const steps = [
  'Xét duyệt hồ sơ nhanh chóng',
  'Đào tạo miễn phí trước khi ra mắt',
  'Hỗ trợ kỹ thuật 24/7',
  'Thanh toán đúng hạn mỗi tuần',
]

const cardVariants: import("framer-motion").Variants = {
  hidden: { opacity: 0, y: 55, rotateX: 22, scale: 0.92 },
  visible: {
    opacity: 1, y: 0, rotateX: 0, scale: 1,
    transition: { duration: 0.7, ease: [0.23, 1, 0.32, 1] as [number,number,number,number] },
  },
}

export default function DoiTacPage() {
  const benefitsRef = useRef<HTMLElement>(null)
  const formRef = useRef<HTMLElement>(null)
  const benefitsInView = useInView(benefitsRef, { once: true, margin: '-60px' })
  const formInView = useInView(formRef, { once: true, margin: '-60px' })

  return (
    <>
      {/* ── Hero ── */}
      <div className="bg-gradient-to-br from-orange-600 to-amber-500 py-20 relative overflow-hidden">
        {/* 3D mesh */}
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
        <motion.div
          className="absolute -top-16 -right-16 w-64 h-64 bg-white/10 rounded-full blur-3xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.85, 0.5] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-0 -left-10 w-48 h-48 bg-amber-300/20 rounded-full blur-2xl"
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <nav className="text-sm text-orange-200 mb-6">
            <Link href="/" className="hover:text-white">Trang chủ</Link>
            <span className="mx-2">/</span>
            <span className="text-white font-600">Đăng ký Đối Tác</span>
          </nav>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left — text */}
            <div className="max-w-xl">
            {/* floating icon */}
            <motion.div
              className="text-6xl mb-5 inline-block"
              animate={{ y: [0, -10, 0], rotateZ: [0, 5, -4, 0], rotateY: [0, 12, -8, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
              style={{ transformStyle: 'preserve-3d' }}
            >
              🤝
            </motion.div>

            <motion.h1
              className="text-4xl sm:text-5xl font-900 text-white mb-4"
              initial={{ opacity: 0, rotateX: 28, y: 40 }}
              animate={{ opacity: 1, rotateX: 0, y: 0 }}
              transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] as [number,number,number,number] }}
              style={{ perspective: '700px' }}
            >
              Cùng FireGo xây dựng thu nhập bền vững
            </motion.h1>
            <motion.p
              className="text-orange-100 text-lg leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              Hàng nghìn đối tác đang kiếm thu nhập ổn định với lịch làm việc hoàn toàn tự do.
              Gia nhập ngay hôm nay!
            </motion.p>
            </div>{/* /Left hero text */}

            {/* Right — partner photo */}
            <motion.div
              className="hidden lg:flex items-center justify-center relative"
              initial={{ opacity: 0, x: 50, rotateY: -15 }}
              animate={{ opacity: 1, x: 0, rotateY: 0 }}
              transition={{ duration: 0.95, delay: 0.3, ease: [0.23, 1, 0.32, 1] as [number,number,number,number] }}
              style={{ perspective: '800px' }}
            >
              <motion.div
                animate={{ y: [0, -10, 0], rotateY: [0, 3, -2, 0] }}
                transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
                style={{ transformStyle: 'preserve-3d' }}
                className="relative"
              >
                <div className="absolute inset-0 rounded-3xl blur-3xl scale-90 bg-white/15" />
                <Image
                  src="/img-partner-driver.png"
                  alt="Đối tác tài xế FireGo – thu nhập linh hoạt"
                  width={440}
                  height={380}
                  className="relative rounded-3xl shadow-2xl object-cover"
                  priority
                />
                <motion.div
                  className="absolute -bottom-4 -left-4 glass rounded-2xl px-4 py-3 shadow-xl"
                  animate={{ y: [0, -5, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <p className="text-xs text-slate-500">Thu nhập trung bình</p>
                  <p className="text-sm font-800 text-orange-600">8–15 triệu/tháng</p>
                </motion.div>
              </motion.div>
            </motion.div>
          </div>{/* /hero grid */}
        </div>
      </div>

      {/* ── Benefits ── */}
      <section ref={benefitsRef} className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, rotateX: 18, y: 30 }}
            animate={benefitsInView ? { opacity: 1, rotateX: 0, y: 0 } : {}}
            transition={{ duration: 0.7, ease: [0.23, 1, 0.32, 1] as [number,number,number,number] }}
            style={{ perspective: '600px' }}
          >
            <h2 className="section-title mb-3">Tại sao chọn FireGo?</h2>
            <p className="section-subtitle">Chúng tôi cam kết đồng hành cùng sự thành công của bạn</p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
            initial="hidden"
            animate={benefitsInView ? 'visible' : 'hidden'}
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }}
            style={{ perspective: '1000px' }}
          >
            {benefits.map((b, i) => (
              <motion.div key={i} variants={cardVariants} style={{ transformStyle: 'preserve-3d' }}>
                <Card3D className="h-full" intensity={7}>
                  <div className="card p-6 h-full">
                    <motion.div
                      className="text-4xl mb-4 inline-block"
                      animate={{ y: [0, -6, 0], rotateZ: [0, 4, -3, 0] }}
                      transition={{ duration: 3 + i * 0.4, repeat: Infinity, ease: 'easeInOut' }}
                    >
                      {b.icon}
                    </motion.div>
                    <h3 className="text-lg font-800 text-slate-900 mb-2">{b.title}</h3>
                    <p className="text-slate-500 text-sm leading-relaxed">{b.description}</p>
                  </div>
                </Card3D>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Form ── */}
      <section ref={formRef} className="py-20 bg-orange-50 relative overflow-hidden">
        {/* bottom perspective grid */}
        <div
          className="absolute inset-0 pointer-events-none opacity-40"
          style={{
            backgroundImage: `
              linear-gradient(rgba(249,115,22,0.08) 1px, transparent 1px),
              linear-gradient(90deg, rgba(249,115,22,0.08) 1px, transparent 1px)
            `,
            backgroundSize: '64px 64px',
            transform: 'perspective(500px) rotateX(30deg) scale(1.5)',
            transformOrigin: '50% 100%',
          }}
        />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-5 gap-12">
            {/* Left info */}
            <motion.div
              className="lg:col-span-2"
              initial={{ opacity: 0, x: -40, rotateY: 15 }}
              animate={formInView ? { opacity: 1, x: 0, rotateY: 0 } : {}}
              transition={{ duration: 0.75, ease: [0.23, 1, 0.32, 1] as [number,number,number,number] }}
              style={{ perspective: '600px' }}
            >
              <h2 className="section-title mb-4">Điền thông tin đăng ký</h2>
              <p className="text-slate-500 mb-6 leading-relaxed">
                Điền form bên dưới, chúng tôi sẽ liên hệ trong vòng 24–48 giờ làm việc.
              </p>
              <div className="space-y-3">
                {steps.map((item, i) => (
                  <motion.div
                    key={i}
                    className="flex items-center gap-2 text-sm text-slate-700"
                    initial={{ opacity: 0, x: -20 }}
                    animate={formInView ? { opacity: 1, x: 0 } : {}}
                    transition={{ duration: 0.4, delay: 0.1 + i * 0.08 }}
                  >
                    <CheckCircle className="w-4 h-4 text-orange-500 shrink-0" />
                    {item}
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Form card */}
            <motion.div
              className="lg:col-span-3"
              initial={{ opacity: 0, x: 40, rotateY: -15 }}
              animate={formInView ? { opacity: 1, x: 0, rotateY: 0 } : {}}
              transition={{ duration: 0.75, delay: 0.1, ease: [0.23, 1, 0.32, 1] as [number,number,number,number] }}
              style={{ perspective: '700px' }}
            >
              <Card3D intensity={5}>
                <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-brand-lg border border-orange-100">
                  <PartnerForm />
                </div>
              </Card3D>
            </motion.div>
          </div>
        </div>
      </section>
    </>
  )
}
