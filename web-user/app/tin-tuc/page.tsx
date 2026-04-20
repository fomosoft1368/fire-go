import type { Metadata } from 'next'
import { fetchAllNews } from '@/lib/api/news'
import { persistNewsThumbnails } from '@/lib/api/newsServer'
import NewsPageClient from '@/components/news/NewsPageClient'

export const metadata: Metadata = {
  title: 'Tin Tức Giao Thông & Đời Sống – FireGo',
  description: 'Cập nhật tin tức giao thông, kinh doanh, đời sống mới nhất từ VnExpress, Tuổi Trẻ, Dân Trí. Đọc báo hàng ngày cùng FireGo.',
  openGraph: {
    title: 'Tin Tức – FireGo',
    description: 'Tin tức giao thông & đời sống mới nhất',
    type: 'website',
  },
}

// ISR: revalidate every 30 minutes
export const revalidate = 1800

export default async function TinTucPage() {
  const news = await fetchAllNews(80)

  // Persist image hashes to MongoDB for cold-start recovery (server-only)
  void persistNewsThumbnails(news)

  return <NewsPageClient news={news} />
}
