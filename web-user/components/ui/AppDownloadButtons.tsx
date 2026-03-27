'use client'

interface AppDownloadButtonsProps {
  variant?: 'default' | 'compact' | 'large'
  className?: string
}

const AppleIcon = ({ className = "w-6 h-6" }) => (
  <svg className={className} viewBox="0 0 384 512" fill="currentColor">
    <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/>
  </svg>
)

const PlayStoreIcon = ({ className = "w-6 h-6" }) => (
  <svg className={className} viewBox="0 0 512 512">
    <path fill="#0268D6" d="M37.8 45.4C30.6 51 26 59.8 26 71.4v369.2c0 11.6 4.5 20.3 11.7 26.1l4 2.8 206.6-206.7-1.1-1.2-205.4-205.5-4-10.7z"/>
    <path fill="#FFC107" d="M331 161.5L247.2 245.3 248.3 246.4l82.7 82.7 3.3-1.8 98.4-56c28.2-16 28.2-42.3 0-58.4L334.3 157l-3.3 4.5z"/>
    <path fill="#F44336" d="M331 329l-82.7-82.7-206.6 206.7C52.7 464 68 466.8 86 456.6L331 329z"/>
    <path fill="#4CAF50" d="M86 55.4C68 45.2 52.7 48 41.7 59L248.3 264.6 331 181.9 86 55.4z"/>
  </svg>
)

export default function AppDownloadButtons({ variant = 'default', className = '' }: AppDownloadButtonsProps) {
  const handleClick = async (platform: 'ios' | 'android') => {
    try {
      await fetch('/api/tracking/install-click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform, page: window.location.pathname }),
      })
    } catch {}
    const url = platform === 'ios'
      ? (process.env.NEXT_PUBLIC_APP_STORE_URL || '#')
      : (process.env.NEXT_PUBLIC_GOOGLE_PLAY_URL || '#')
    window.open(url, '_blank')
  }

  if (variant === 'compact') {
    return (
      <div className={`flex flex-col sm:flex-row items-stretch sm:items-center gap-2 ${className}`}>
        <button
          onClick={() => handleClick('ios')}
          aria-label="Tải ứng dụng trên App Store"
          className="flex items-center justify-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-xl text-sm font-600 hover:bg-slate-800 transition-colors shadow-sm"
        >
          <AppleIcon className="w-5 h-5 shrink-0" />
          <span className="mt-0.5">App Store</span>
        </button>
        <button
          onClick={() => handleClick('android')}
          aria-label="Tải ứng dụng trên Google Play"
          className="flex items-center justify-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-xl text-sm font-600 hover:bg-slate-800 transition-colors shadow-sm"
        >
          <PlayStoreIcon className="w-5 h-5 shrink-0" />
          <span className="mt-0.5">Google Play</span>
        </button>
      </div>
    )
  }

  if (variant === 'large') {
    return (
      <div className={`flex flex-col sm:flex-row gap-4 ${className}`}>
        <button
          onClick={() => handleClick('ios')}
          aria-label="Tải ứng dụng trên App Store"
          className="flex items-center justify-center gap-3 bg-slate-900 text-white px-6 py-4 rounded-2xl font-600 hover:bg-slate-800 transition-all hover:-translate-y-0.5 shadow-lg w-full sm:w-auto"
        >
          <AppleIcon className="w-8 h-8 shrink-0" />
          <div className="text-left">
            <div className="text-xs text-slate-300">Tải xuống trên</div>
            <div className="text-xl font-800 mt-0.5">App Store</div>
          </div>
        </button>
        <button
          onClick={() => handleClick('android')}
          aria-label="Tải ứng dụng trên Google Play"
          className="flex items-center justify-center gap-3 bg-slate-900 text-white px-6 py-4 rounded-2xl font-600 hover:bg-slate-800 transition-all hover:-translate-y-0.5 shadow-lg w-full sm:w-auto"
        >
          <PlayStoreIcon className="w-8 h-8 shrink-0" />
          <div className="text-left">
            <div className="text-xs text-slate-300">Tải xuống trên</div>
            <div className="text-xl font-800 mt-0.5">Google Play</div>
          </div>
        </button>
      </div>
    )
  }

  // default
  return (
    <div className={`flex flex-col sm:flex-row gap-3 ${className}`}>
      <button
        onClick={() => handleClick('ios')}
        aria-label="Tải ứng dụng trên App Store"
        className="flex items-center justify-center gap-3 bg-slate-900 text-white px-5 py-3 rounded-xl font-600 hover:bg-slate-800 transition-all hover:-translate-y-0.5 shadow-md w-full sm:w-auto"
      >
        <AppleIcon className="w-6 h-6 shrink-0" />
        <div className="text-left">
          <div className="text-xs text-slate-300 leading-tight">Tải xuống trên</div>
          <div className="text-base font-800 leading-tight mt-0.5">App Store</div>
        </div>
      </button>
      <button
        onClick={() => handleClick('android')}
        aria-label="Tải ứng dụng trên Google Play"
        className="flex items-center justify-center gap-3 bg-slate-900 text-white px-5 py-3 rounded-xl font-600 hover:bg-slate-800 transition-all hover:-translate-y-0.5 shadow-md w-full sm:w-auto"
      >
        <PlayStoreIcon className="w-6 h-6 shrink-0" />
        <div className="text-left">
          <div className="text-xs text-slate-300 leading-tight">Tải xuống trên</div>
          <div className="text-base font-800 leading-tight mt-0.5">Google Play</div>
        </div>
      </button>
    </div>
  )
}
