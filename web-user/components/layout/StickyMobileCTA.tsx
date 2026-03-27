'use client'

import { useEffect, useState } from 'react'

export default function StickyMobileCTA() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 3000)
    return () => clearTimeout(timer)
  }, [])

  if (!visible) return null

  return (
    <div
      className="sticky-cta lg:hidden"
      style={{
        transform: visible ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 0.4s ease',
      }}
    >
      <div className="flex gap-2 max-w-md mx-auto">
        <a
          href={process.env.NEXT_PUBLIC_APP_STORE_URL || '#'}
          className="flex-1 flex items-center justify-center gap-2 bg-slate-900 text-white font-700 text-sm py-3 rounded-xl hover:bg-slate-800 transition-colors"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="white">
            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
          </svg>
          App Store
        </a>
        <a
          href={process.env.NEXT_PUBLIC_GOOGLE_PLAY_URL || '#'}
          className="flex-1 flex items-center justify-center gap-2 btn-primary text-sm py-3 rounded-xl"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="white">
            <path d="M3.18 23.76c.35.2.74.24 1.12.1l.06-.04 12.56-7.25-2.72-2.72-11.02 9.91zM.5 1.63C.18 2 0 2.55 0 3.26v17.48c0 .71.18 1.26.51 1.63l.08.08L10 12.87v-.23L.58 1.56l-.08.07zM20.63 10.35l-2.95-1.7-3.07 3.07 3.07 3.07 2.97-1.71c.85-.49.85-1.24-.02-1.73zM4.3.14L16.87 7.4l-2.72 2.72L3.12.23A1.3 1.3 0 014.3.14z"/>
          </svg>
          Google Play
        </a>
      </div>
    </div>
  )
}
