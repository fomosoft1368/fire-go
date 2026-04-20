/**
 * FireGo News System — RSS fetch + parse (client-safe)
 * KHÔNG import mongoose hay server-only modules ở đây.
 * Đây là file được import bởi cả server và client components.
 */

import { titleToSlug } from '@/lib/utils/slugify'
import { toImgUrl } from '@/lib/utils/imgSlug'

export interface NewsItem {
  title: string
  link: string
  description: string
  pubDate: string
  imageUrl: string | null   // /img/tieu-de-abc1234.jpg
  source: string
  sourceColor: string
  category: string
  slug: string
}

export interface ArticleDetail {
  title: string
  originalTitle: string
  content: string[]
  heroImage: string | null   // /img/tieu-de-abc1234.jpg
  bodyImages: string[]       // /img/tieu-de-anh-1-abc1234.jpg, ...
  source: string
  sourceUrl: string
  pubDate: string
  author: string
  slug: string
  category: string
}

interface RssSource {
  url: string
  source: string
  sourceColor: string
  category: string
}

const RSS_SOURCES: RssSource[] = [
  { url: 'https://vnexpress.net/rss/giao-thong.rss',  source: 'VnExpress', sourceColor: '#0065BD', category: 'Giao thông' },
  { url: 'https://vnexpress.net/rss/kinh-doanh.rss',  source: 'VnExpress', sourceColor: '#0065BD', category: 'Kinh doanh' },
  { url: 'https://vnexpress.net/rss/doi-song.rss',    source: 'VnExpress', sourceColor: '#0065BD', category: 'Đời sống' },
  { url: 'https://tuoitre.vn/rss/xe.rss',             source: 'Tuổi Trẻ',  sourceColor: '#C01D2E', category: 'Xe cộ' },
  { url: 'https://tuoitre.vn/rss/nhip-song-tre.rss',  source: 'Tuổi Trẻ',  sourceColor: '#C01D2E', category: 'Nhịp sống' },
  { url: 'https://dantri.com.vn/xa-hoi.rss',          source: 'Dân Trí',   sourceColor: '#E31B23', category: 'Xã hội' },
]

const _newsMap = new Map<string, NewsItem>()

// ─────────────────────────────────────────────────────
// Re-export toImgUrl as toProxyUrl for backwards compatibility
// ─────────────────────────────────────────────────────
export { toImgUrl as toProxyUrl }

// ─────────────────────────────────────────────────────
// HTML/XML parsing utilities
// ─────────────────────────────────────────────────────

export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ').trim()
}

function extractTag(xml: string, tag: string): string {
  const cdata = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, 'i')
  const c = xml.match(cdata)
  if (c) return c[1].trim()
  const normal = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i')
  const n = xml.match(normal)
  return n ? n[1].trim() : ''
}

function extractAttr(xml: string, tag: string, attr: string): string {
  const re = new RegExp(`<${tag}[^>]*${attr}=["']([^"']+)["']`, 'i')
  const m = xml.match(re)
  return m ? m[1] : ''
}

/** Extract image URL from RSS item — handles VnExpress data-src lazy loading */
function extractRssImage(xml: string): string | null {
  return (
    extractAttr(xml, 'media:content', 'url') ||
    extractAttr(xml, 'media:thumbnail', 'url') ||
    xml.match(/<enclosure[^>]+type=["']image[^"']*["'][^>]+url=["']([^"']+)["']/i)?.[1] ||
    xml.match(/<enclosure[^>]+url=["']([^"']+)["'][^>]+type=["']image[^"']*["']/i)?.[1] ||
    xml.match(/<img[^>]+data-src=["']([^"']{20,})["']/i)?.[1] ||
    xml.match(/<img[^>]+src=["']([^"']{20,})["'][^>]*>/i)?.[1] ||
    null
  )
}

function parseItems(xml: string, source: RssSource): NewsItem[] {
  const items: NewsItem[] = []
  const re = /<item[\s>]([\s\S]*?)<\/item>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(xml)) !== null) {
    const x = m[1]
    const title = stripHtml(extractTag(x, 'title'))
    const link  = extractTag(x, 'link') || extractAttr(x, 'link', 'href')
    if (!title || !link) continue

    const rawImg = extractRssImage(x)
    items.push({
      title,
      link,
      description: stripHtml(extractTag(x, 'description')).slice(0, 200),
      pubDate: extractTag(x, 'pubDate'),
      // Use article title as image name for clean SEO URLs
      imageUrl: toImgUrl(rawImg, title),
      source: source.source,
      sourceColor: source.sourceColor,
      category: source.category,
      slug: titleToSlug(title, link),
    })
  }
  return items
}

async function fetchFeed(src: RssSource): Promise<NewsItem[]> {
  try {
    const res = await fetch(src.url, {
      next: { revalidate: 1800 },
      headers: {
        'User-Agent': 'Mozilla/5.0 FireGo-News/1.0',
        Accept: 'application/rss+xml, text/xml',
      },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return []
    return parseItems(await res.text(), src)
  } catch { return [] }
}

export async function fetchAllNews(limit = 80): Promise<NewsItem[]> {
  const results = await Promise.allSettled(RSS_SOURCES.map(fetchFeed))
  const all: NewsItem[] = []
  for (const r of results) if (r.status === 'fulfilled') all.push(...r.value)

  all.sort((a, b) =>
    (b.pubDate ? new Date(b.pubDate).getTime() : 0) -
    (a.pubDate ? new Date(a.pubDate).getTime() : 0)
  )

  const seen = new Set<string>()
  const unique = all.filter(item => {
    const k = item.title.slice(0, 50)
    if (seen.has(k)) return false
    seen.add(k); return true
  }).slice(0, limit)

  _newsMap.clear()
  for (const item of unique) _newsMap.set(item.slug, item)

  return unique
}

export async function getNewsBySlug(slug: string): Promise<NewsItem | null> {
  if (_newsMap.has(slug)) return _newsMap.get(slug)!
  const all = await fetchAllNews()
  return all.find(n => n.slug === slug) ?? null
}

export function formatRelativeTime(pubDate: string): string {
  if (!pubDate) return ''
  try {
    const diff = Date.now() - new Date(pubDate).getTime()
    const min  = Math.round(diff / 60000)
    if (min < 1)  return 'Vừa xong'
    if (min < 60) return `${min} phút trước`
    const h = Math.floor(min / 60)
    if (h < 24)   return `${h} giờ trước`
    return `${Math.floor(h / 24)} ngày trước`
  } catch { return pubDate }
}
