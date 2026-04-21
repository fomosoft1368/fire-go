'use client'

interface AppDownloadButtonsProps {
  variant?: 'default' | 'compact' | 'large'
  className?: string
}

/** Apple logo — classic bitten apple, white fill */
const AppleIcon = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 814 1000" fill="white">
    <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105.3-57.2-155.5-127.4C46 790.7 0 663 0 541.8c0-207.5 135.4-317.3 269-317.3 70.1 0 128.4 46.4 172.5 46.4 42.8 0 109.6-49.1 189.2-49.1 30.8 0 130.9 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z"/>
  </svg>
)

/** Google Play — official 4-color logo */
const PlayStoreIcon = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 512 512">
    <path fill="#0268D6" d="M37.8 45.4C30.6 51 26 59.8 26 71.4v369.2c0 11.6 4.5 20.3 11.7 26.1l4 2.8 206.6-206.7-1.1-1.2-205.4-205.5-4-10.7z"/>
    <path fill="#FFC107" d="M331 161.5L247.2 245.3 248.3 246.4l82.7 82.7 3.3-1.8 98.4-56c28.2-16 28.2-42.3 0-58.4L334.3 157l-3.3 4.5z"/>
    <path fill="#F44336" d="M331 329l-82.7-82.7-206.6 206.7C52.7 464 68 466.8 86 456.6L331 329z"/>
    <path fill="#4CAF50" d="M86 55.4C68 45.2 52.7 48 41.7 59L248.3 264.6 331 181.9 86 55.4z"/>
  </svg>
)

const IOS_URL = process.env.NEXT_PUBLIC_APP_STORE_URL || 'https://apps.apple.com/us/app/firego/id6761891912'
const ANDROID_URL = process.env.NEXT_PUBLIC_GOOGLE_PLAY_URL || 'https://play.google.com/store/apps/details?id=com.firegotech.customer'

export default function AppDownloadButtons({ variant = 'default', className = '' }: AppDownloadButtonsProps) {
  // Sử dụng <a> thay vì <button> để mobile mở đúng store ngay lập tức
  // window.open bị block bởi mobile browser

  if (variant === 'compact') {
    return (
      <div className={`flex flex-col sm:flex-row items-stretch sm:items-center gap-2 ${className}`}>
        <a
          href={IOS_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Tải ứng dụng trên App Store"
          className="flex items-center justify-center gap-2 bg-black text-white px-4 py-2 rounded-xl text-sm font-600 hover:bg-slate-800 transition-all shadow-sm hover:-translate-y-0.5 no-underline"
        >
          <AppleIcon size={18} />
          <span>App Store</span>
        </a>
        <a
          href={ANDROID_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Tải ứng dụng trên Google Play"
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-amber-400 text-white px-4 py-2 rounded-xl text-sm font-600 hover:from-orange-600 hover:to-amber-500 transition-all shadow-sm hover:-translate-y-0.5 no-underline"
        >
          <PlayStoreIcon size={18} />
          <span>Google Play</span>
        </a>
      </div>
    )
  }

  if (variant === 'large') {
    return (
      <div className={`flex flex-col sm:flex-row gap-4 ${className}`}>
        <a
          href={IOS_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Tải ứng dụng trên App Store"
          className="flex items-center justify-center gap-3 bg-black text-white px-6 py-4 rounded-2xl font-600 hover:bg-slate-800 transition-all hover:-translate-y-1 shadow-lg hover:shadow-xl w-full sm:w-auto no-underline"
        >
          <AppleIcon size={32} />
          <div className="text-left">
            <div className="text-xs text-slate-300">Tải xuống trên</div>
            <div className="text-xl font-800 mt-0.5">App Store</div>
          </div>
        </a>
        <a
          href={ANDROID_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Tải ứng dụng trên Google Play"
          className="flex items-center justify-center gap-3 bg-gradient-to-r from-orange-500 to-amber-400 text-white px-6 py-4 rounded-2xl font-600 hover:from-orange-600 hover:to-amber-500 transition-all hover:-translate-y-1 shadow-lg hover:shadow-xl w-full sm:w-auto no-underline"
        >
          <PlayStoreIcon size={32} />
          <div className="text-left">
            <div className="text-xs text-white/80">Tải xuống trên</div>
            <div className="text-xl font-800 mt-0.5">Google Play</div>
          </div>
        </a>
      </div>
    )
  }

  // default
  return (
    <div className={`flex flex-col sm:flex-row gap-3 ${className}`}>
      <a
        href={IOS_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Tải ứng dụng trên App Store"
        className="flex items-center justify-center gap-3 bg-black text-white px-5 py-3 rounded-xl font-600 hover:bg-slate-800 transition-all hover:-translate-y-0.5 shadow-md w-full sm:w-auto no-underline"
      >
        <AppleIcon size={26} />
        <div className="text-left">
          <div className="text-xs text-slate-400 leading-tight">Tải xuống trên</div>
          <div className="text-base font-800 leading-tight mt-0.5">App Store</div>
        </div>
      </a>
      <a
        href={ANDROID_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Tải ứng dụng trên Google Play"
        className="flex items-center justify-center gap-3 bg-gradient-to-r from-orange-500 to-amber-400 text-white px-5 py-3 rounded-xl font-600 hover:from-orange-600 hover:to-amber-500 transition-all hover:-translate-y-0.5 shadow-md w-full sm:w-auto no-underline"
      >
        <PlayStoreIcon size={26} />
        <div className="text-left">
          <div className="text-xs text-white/80 leading-tight">Tải xuống trên</div>
          <div className="text-base font-800 leading-tight mt-0.5">Google Play</div>
        </div>
      </a>
    </div>
  )
}
