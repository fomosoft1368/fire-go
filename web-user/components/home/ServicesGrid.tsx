'use client'

import Link from 'next/link'
import { ArrowRight, CheckCircle } from 'lucide-react'
import { motion, useInView } from 'framer-motion'
import { useRef, useState } from 'react'
import Card3D from '@/components/ui/Card3D'
import Image from 'next/image'
import type { Service } from '@/lib/data/services'

interface PriceMap {
  [key: string]: { base: number; unit: string }
}

interface ServicesGridProps {
  services: Service[]
  dynamicPricing: PriceMap
}

const containerVariants: import("framer-motion").Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
    },
  },
}

const cardVariants: import("framer-motion").Variants = {
  hidden: {
    opacity: 0,
    y: 60,
    rotateX: 25,
    scale: 0.92,
  },
  visible: {
    opacity: 1,
    y: 0,
    rotateX: 0,
    scale: 1,
    transition: {
      duration: 0.7,
      ease: [0.23, 1, 0.32, 1] as [number,number,number,number],
    },
  },
}

export default function ServicesGrid({ services, dynamicPricing }: ServicesGridProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  return (
    <motion.div
      ref={ref}
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
      variants={containerVariants}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      style={{ perspective: '1200px' }}
    >
      {services.map((service) => {
        const price = dynamicPricing[service.id] ?? {
          base: service.pricing.base,
          unit: service.pricing.unit,
        }

        return (
          <motion.div
            key={service.id}
            variants={cardVariants}
            style={{ transformStyle: 'preserve-3d' }}
            onHoverStart={() => setHoveredId(service.id)}
            onHoverEnd={() => setHoveredId(null)}
          >
            <Card3D className="h-full" intensity={8}>
              <Link
                href={`/${service.slug}`}
                className="card group flex flex-col hover:shadow-brand-lg cursor-pointer h-full overflow-hidden"
              >
                {/* Thumbnail image */}
                {service.image && (
                  <div className="relative h-36 overflow-hidden">
                    <Image
                      src={service.image}
                      alt={service.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      sizes="(max-width:768px) 100vw, 25vw"
                    />
                    {/* gradient overlay */}
                    <div className={`absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent`} />
                    {/* price badge on image */}
                    <div className={`absolute bottom-2 right-2 ${service.bgColor} rounded-lg px-2 py-1`}>
                      <span className={`text-xs font-800 ${service.textColor}`}>
                        Từ {price.base.toLocaleString('vi-VN')}đ/{price.unit}
                      </span>
                    </div>
                  </div>
                )}

                <div className="p-6 flex flex-col flex-1">
                {/* Icon with 3D float */}
                <motion.div
                  className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${service.color} flex items-center justify-center text-2xl mb-4 shadow-lg -mt-8 relative z-10 border-2 border-white`}
                  animate={
                    hoveredId === service.id
                      ? {
                          rotateY: [0, 180, 360],
                          scale: [1, 1.15, 1.1],
                        }
                      : {
                          rotateY: 0,
                          scale: 1,
                          y: [0, -4, 0],
                        }
                  }
                  transition={
                    hoveredId === service.id
                      ? { duration: 0.6, ease: 'easeInOut' }
                      : { duration: 3, repeat: Infinity, ease: 'easeInOut' }
                  }
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  {service.emoji}
                </motion.div>

                {/* Content */}
                <h3 className="text-xl font-800 text-slate-900 mb-1">{service.name}</h3>
                <p className={`text-sm font-600 ${service.textColor} mb-3`}>{service.tagline}</p>
                <p className="text-sm text-slate-500 leading-relaxed mb-4 flex-1">{service.description}</p>

                {/* Features */}
                <ul className="space-y-1.5 mb-5">
                  {service.features.slice(0, 3).map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                      <CheckCircle className={`w-3.5 h-3.5 ${service.textColor} mt-0.5 shrink-0`} />
                      {f}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <div className={`flex items-center gap-1 text-sm font-700 ${service.textColor} group-hover:gap-2 transition-all`}>
                  Xem chi tiết <ArrowRight className="w-4 h-4" />
                </div>
                </div>{/* /inner padding */}
              </Link>
            </Card3D>
          </motion.div>
        )
      })}
    </motion.div>
  )
}
