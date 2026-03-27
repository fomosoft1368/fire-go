import type { Metadata } from 'next'
import './globals.css'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import StickyMobileCTA from '@/components/layout/StickyMobileCTA'

export const metadata: Metadata = {
  title: {
    default: 'FireGo – Ghép Xe, Lái Hộ, Vận Chuyển, Vệ Sinh Tại Vinh, Nghệ An',
    template: '%s | FireGo',
  },
  description: 'FireGo – Ứng dụng di động cung cấp dịch vụ ghép xe, lái hộ, vận chuyển hàng hóa và vệ sinh theo giờ tại Vinh, Nghệ An. Tiết kiệm, tiện lợi, an toàn.',
  keywords: ['ghép xe', 'lái hộ', 'vận chuyển', 'vệ sinh theo giờ', 'FireGo', 'app dịch vụ', 'Vinh', 'Nghệ An'],
  authors: [{ name: 'FireGo' }],
  creator: 'FireGo',
  metadataBase: new URL('https://firego.vn'),
  openGraph: {
    type: 'website',
    locale: 'vi_VN',
    url: 'https://firego.vn',
    siteName: 'FireGo',
    title: 'FireGo – Hệ Sinh Thái Dịch Vụ Di Động Toàn Diện',
    description: 'Ghép xe, lái hộ, vận chuyển, vệ sinh – tất cả trong một ứng dụng. Tải FireGo ngay!',
    images: [{ url: '/og-image.jpg', width: 1200, height: 630, alt: 'FireGo App' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FireGo – Hệ Sinh Thái Dịch Vụ Di Động',
    description: 'Ghép xe, lái hộ, vận chuyển, vệ sinh – tất cả trong một ứng dụng FireGo.',
    images: ['/og-image.jpg'],
  },
  robots: { index: true, follow: true },
  verification: { google: 'google-site-verification-code' },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="vi">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800;900&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        {/* Google Analytics */}
        {process.env.NEXT_PUBLIC_GA_ID && (
          <>
            <script async src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`} />
            <script
              dangerouslySetInnerHTML={{
                __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${process.env.NEXT_PUBLIC_GA_ID}');`,
              }}
            />
          </>
        )}
        {/* Meta Pixel */}
        {process.env.NEXT_PUBLIC_FB_PIXEL_ID && (
          <script
            dangerouslySetInnerHTML={{
              __html: `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${process.env.NEXT_PUBLIC_FB_PIXEL_ID}');fbq('track','PageView');`,
            }}
          />
        )}
      </head>
      <body suppressHydrationWarning className="min-h-screen flex flex-col" style={{ fontFamily: "'Be Vietnam Pro', Inter, sans-serif" }}>
        <Header />
        <main className="flex-1">
          {children}
        </main>
        <Footer />
        <StickyMobileCTA />
      </body>
    </html>
  )
}
