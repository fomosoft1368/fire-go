'use client'

import { useRef, MouseEvent, ReactNode } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'

interface Card3DProps {
  children: ReactNode
  className?: string
  intensity?: number // 1-20, default 10
  glareEnabled?: boolean
}

export default function Card3D({
  children,
  className = '',
  intensity = 10,
  glareEnabled = true,
}: Card3DProps) {
  const ref = useRef<HTMLDivElement>(null)

  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  const springConfig = { stiffness: 260, damping: 20 }
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [intensity, -intensity]), springConfig)
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-intensity, intensity]), springConfig)
  const glareX = useTransform(mouseX, [-0.5, 0.5], ['0%', '100%'])
  const glareY = useTransform(mouseY, [-0.5, 0.5], ['0%', '100%'])

  function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width - 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5
    mouseX.set(x)
    mouseY.set(y)
  }

  function handleMouseLeave() {
    mouseX.set(0)
    mouseY.set(0)
  }

  return (
    <div
      ref={ref}
      style={{ perspective: '1000px' }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative"
    >
      <motion.div
        style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
        className={`relative transform-gpu ${className}`}
      >
        {children}

        {/* Glare overlay */}
        {glareEnabled && (
          <motion.div
            className="absolute inset-0 rounded-[inherit] pointer-events-none overflow-hidden"
            style={{ opacity: 0.12 }}
          >
            <motion.div
              className="absolute inset-0"
              style={{
                background: useTransform(
                  [glareX, glareY],
                  ([x, y]) =>
                    `radial-gradient(circle at ${x} ${y}, rgba(255,255,255,0.9) 0%, transparent 65%)`
                ),
              }}
            />
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}
