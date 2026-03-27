'use client'

import { Swiper, SwiperSlide } from 'swiper/react'
import { Autoplay, Pagination } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/pagination'
import { TESTIMONIALS } from '@/lib/data/testimonials'
import RatingStars from '@/components/ui/RatingStars'
import { Quote } from 'lucide-react'

export default function TestimonialSlider() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="inline-block bg-orange-100 text-orange-700 text-xs font-700 uppercase tracking-wider px-3 py-1 rounded-full mb-4">
            Người dùng nói gì
          </span>
          <h2 className="section-title mb-4">Hơn 50,000 người đã tin dùng</h2>
          <p className="section-subtitle max-w-xl mx-auto">
            Những trải nghiệm thực tế từ cộng đồng người dùng FireGo
          </p>
        </div>

        <Swiper
          modules={[Autoplay, Pagination]}
          spaceBetween={24}
          slidesPerView={1}
          breakpoints={{
            640: { slidesPerView: 2 },
            1024: { slidesPerView: 3 },
          }}
          autoplay={{ delay: 4000, disableOnInteraction: false }}
          pagination={{ clickable: true }}
          className="pb-12"
        >
          {TESTIMONIALS.map((t) => (
            <SwiperSlide key={t.id}>
              <div className="card p-6 h-full flex flex-col hover:shadow-brand-lg">
                <Quote className="w-8 h-8 text-orange-200 mb-3" />
                <p className="text-slate-700 text-sm leading-relaxed flex-1 mb-5">
                  "{t.content}"
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 gradient-primary rounded-full flex items-center justify-center text-white font-800 text-sm shrink-0">
                    {t.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-700 text-slate-900 text-sm truncate">{t.name}</p>
                    <p className="text-xs text-slate-500 truncate">{t.location}</p>
                    <RatingStars rating={t.rating} size="sm" />
                  </div>
                  <span className="text-lg shrink-0" title={t.serviceLabel}>
                    {t.serviceLabel === 'Ghép Xe' ? '🚗' : t.serviceLabel === 'Lái Hộ' ? '🧑‍✈️' : t.serviceLabel === 'Vận Chuyển' ? '📦' : '🧹'}
                  </span>
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>

        {/* Overall rating */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-8 py-6 bg-orange-50 rounded-2xl">
          {[
            { label: 'App Store', rating: '4.9', count: '12K đánh giá' },
            { label: 'Google Play', rating: '4.8', count: '38K đánh giá' },
            { label: 'Người dùng hài lòng', rating: '98%', count: '50K+ khảo sát' },
          ].map((item) => (
            <div key={item.label} className="text-center">
              <div className="text-2xl font-900 text-orange-600">{item.rating}</div>
              <div className="text-sm font-600 text-slate-700">{item.label}</div>
              <div className="text-xs text-slate-400">{item.count}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
