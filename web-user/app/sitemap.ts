import { MetadataRoute } from 'next'
import { SERVICES } from '@/lib/data/services'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://firego.vn'
  const now = new Date()

  return [
    { url: baseUrl, lastModified: now, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${baseUrl}/doi-tac`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/faq`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/lien-he`, lastModified: now, changeFrequency: 'yearly', priority: 0.6 },
    { url: `${baseUrl}/chinh-sach-bao-mat`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/dieu-khoan-su-dung`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    ...SERVICES.map(s => ({
      url: `${baseUrl}/${s.slug}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    })),
  ]
}
