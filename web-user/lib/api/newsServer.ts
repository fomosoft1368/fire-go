/**
 * @server-only
 * FireGo Article Detail — scraping + MongoDB cache
 * KHÔNG import file này từ client components.
 * Chỉ dùng trong Server Components (app/tin-tuc/[slug]/page.tsx).
 */
import 'server-only'

import { stripHtml, type ArticleDetail } from './news'
import { toImgUrl } from '@/lib/utils/imgSlug'

// ─────────────────────────────────────────────────────
// FireGo editorial voice
// ─────────────────────────────────────────────────────

const SERVICE_HOOKS: Record<string, string> = {
  'Giao thông': 'Di chuyển thông minh hơn, tiết kiệm hơn — hãy thử dịch vụ Ghép Xe FireGo ngay hôm nay.',
  'Xe cộ':      'Sở hữu xe nhưng bận việc? Dịch vụ Lái Hộ FireGo giúp bạn an toàn đến nơi cần đến.',
  'Kinh doanh': 'FireGo đang mở rộng hệ thống đối tác — thu nhập ổn định 8–15 triệu/tháng, lịch làm việc tự do.',
  'Đời sống':   'Cuộc sống hiện đại cần một trợ lý di chuyển thông minh — đó chính là FireGo.',
  'Nhịp sống':  'Sống trọn vẹn hơn khi không còn lo chuyện đi lại — FireGo lo cho bạn.',
  'Xã hội':     'Kết nối cộng đồng, chia sẻ hành trình — đó là sứ mệnh mà FireGo đang theo đuổi.',
}

// ─────────────────────────────────────────────────────
// HTML parsing helpers
// ─────────────────────────────────────────────────────

function extractParagraphs(html: string): string[] {
  const paras: string[] = []
  const re = /<p[^>]*>([\s\S]*?)<\/p>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    const t = stripHtml(m[1]).replace(/\s+/g, ' ').trim()
    if (t.length > 40) paras.push(t)
  }
  return paras
}

function sectionAfter(html: string, pattern: RegExp, maxLen = 60000): string | null {
  const m = html.match(pattern)
  if (!m || m.index == null) return null
  return html.slice(m.index, m.index + maxLen)
}

function extractHeroImage(html: string): string | null {
  const og = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
           || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)
  if (og?.[1]?.startsWith('http')) return og[1]

  // data-src (VnExpress lazy), then src
  const imgRe = /<img[^>]+(?:data-src|src)=["']([^"']{20,})["'][^>]*>/gi
  let m: RegExpExecArray | null
  while ((m = imgRe.exec(html)) !== null) {
    const u = m[1].startsWith('//') ? `https:${m[1]}` : m[1]
    if (u.startsWith('http') && !/logo|icon|avatar|banner|spacer|pixel|tracking|1x1/i.test(u)) return u
  }
  return null
}

function extractBodyImages(section: string, heroUrl: string | null): string[] {
  const results: string[] = []
  const seen = new Set<string>()
  if (heroUrl) seen.add(heroUrl)

  const imgRe = /<img[^>]+(?:data-src|src)=["']([^"']{20,})["'][^>]*>/gi
  let m: RegExpExecArray | null
  while ((m = imgRe.exec(section)) !== null && results.length < 6) {
    let u = m[1]
    if (u.startsWith('//')) u = `https:${u}`
    if (
      u.startsWith('http') && !seen.has(u) &&
      !/logo|icon|avatar|banner|spacer|pixel|ad[-_/]|tracking|1x1|gift|emoji/i.test(u) &&
      /\.(jpe?g|png|webp|gif)(\?|$)/i.test(u)
    ) {
      seen.add(u)
      results.push(u)
    }
  }
  return results
}

function extractBody(html: string, url: string): string[] {
  let section: string | null = null

  if (url.includes('vnexpress.net')) {
    section =
      sectionAfter(html, /<article[^>]*class="[^"]*fck_detail[^"]*"/i) ||
      sectionAfter(html, /<div[^>]*class="[^"]*description_content[^"]*"/i) ||
      sectionAfter(html, /<div[^>]*class="[^"]*article-body[^"]*"/i)
  } else if (url.includes('tuoitre.vn')) {
    section =
      sectionAfter(html, /<div[^>]*class="[^"]*detail-content[^"]*"/i) ||
      sectionAfter(html, /<div[^>]*id="[^"]*main-detail-body[^"]*"/i) ||
      sectionAfter(html, /<div[^>]*class="[^"]*content-detail[^"]*"/i)
  } else if (url.includes('dantri.com.vn')) {
    section =
      sectionAfter(html, /<div[^>]*class="[^"]*singular-content[^"]*"/i) ||
      sectionAfter(html, /<div[^>]*class="[^"]*dt-news__body[^"]*"/i) ||
      sectionAfter(html, /<div[^>]*class="[^"]*article__body[^"]*"/i)
  }

  if (!section || extractParagraphs(section).length < 2) {
    section =
      sectionAfter(html, /<article[\s>]/i) ||
      sectionAfter(html, /<main[\s>]/i) ||
      sectionAfter(html, /<div[^>]*class="[^"]*article[^"]*"/i) ||
      html
  }

  const NOISE = /cookie|đăng ký|subscribe|©|quảng cáo|advertisement|đọc thêm|xem thêm|theo dõi|bình luận|chia sẻ thêm/i
  const seen = new Set<string>()
  return extractParagraphs(section)
    .filter(p => p.length > 60 && !NOISE.test(p))
    .filter(p => {
      const k = p.slice(0, 60)
      if (seen.has(k)) return false
      seen.add(k); return true
    })
}

function extractAuthor(html: string): string {
  const m = html.match(/class="[^"]*author[^"]*"[^>]*>([\s\S]*?)</)
           || html.match(/<meta[^>]+name=["']author["'][^>]+content=["']([^"']+)["']/i)
  return m ? stripHtml(m[1]).trim().slice(0, 80) : ''
}

function transformContent(paras: string[], category: string): string[] {
  if (paras.length === 0) return paras
  const hook = SERVICE_HOOKS[category] ?? 'FireGo — di chuyển thông minh, sống tiện nghi hơn.'
  const out = [...paras]
  if (out.length > 4) out.splice(3, 0, `💡 Góc nhìn FireGo: ${hook}`)
  return out
}

// ─────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────

export async function fetchArticleDetail(
  articleUrl: string,
  meta: { category?: string; slug?: string; fallbackDescription?: string } = {}
): Promise<ArticleDetail | null> {
  const slug     = meta.slug ?? ''
  const category = meta.category ?? 'Đời sống'

  // ── 1. Try MongoDB cache ──
  try {
    const { connectToDatabase } = await import('@/lib/mongodb')
    const { default: NewsArticle } = await import('@/lib/models/NewsArticle')
    await connectToDatabase()

    const cached = await NewsArticle.findOne({ slug }).lean() as Record<string, unknown> | null
    if (cached) {
      const hero   = (cached.heroImage as string | null) ?? null
      const bodies = (cached.bodyImages as string[] | null) ?? []
      const title  = cached.title as string

      return {
        title,
        originalTitle: title,
        content: cached.content as string[],
        // Re-generate clean /img/ URLs (title preserved in DB)
        heroImage: toImgUrl(hero, title),
        bodyImages: bodies.map((u, i) => toImgUrl(u, `${title} ảnh ${i + 1}`)).filter(Boolean) as string[],
        source: cached.source as string,
        sourceUrl: cached.sourceUrl as string,
        pubDate: cached.pubDate as string,
        author: cached.author as string,
        slug,
        category: cached.category as string,
      }
    }
  } catch { /* DB unavailable */ }

  // ── 2. Scrape from source ──
  try {
    const res = await fetch(articleUrl, {
      next: { revalidate: 3600 },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'vi-VN,vi;q=0.9',
        'Referer': 'https://www.google.com/',
      },
      signal: AbortSignal.timeout(12000),
    })
    if (!res.ok) return null
    const html = await res.text()

    const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1] ?? ''
    const h1Raw   = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? ''
    const originalTitle = stripHtml(h1Raw || ogTitle)

    const heroRaw    = extractHeroImage(html)
    const bodySection = sectionAfter(html, /<article[\s>]|<main[\s>]|<div[^>]*class="[^"]*content/i) ?? html
    const bodyImgRaw = extractBodyImages(bodySection, heroRaw)
    const bodyRaw    = extractBody(html, articleUrl)
    const content    = transformContent(bodyRaw, category)

    const finalContent = content.length > 0 ? content
      : meta.fallbackDescription
        ? [
            meta.fallbackDescription,
            `💡 Góc nhìn FireGo: ${SERVICE_HOOKS[category] ?? 'FireGo — di chuyển thông minh.'}`,
            'Xem bài gốc để đọc đầy đủ.',
          ]
        : ['Không thể tải nội dung. Vui lòng nhấn "Xem bài gốc" để đọc trực tiếp.']

    const pubDate = html.match(/<meta[^>]+property=["']article:published_time["'][^>]+content=["']([^"']+)["']/i)?.[1] ?? ''
    const author  = extractAuthor(html)

    let source = 'Báo điện tử'
    if (articleUrl.includes('vnexpress.net'))     source = 'VnExpress'
    else if (articleUrl.includes('tuoitre.vn'))   source = 'Tuổi Trẻ'
    else if (articleUrl.includes('dantri.com.vn')) source = 'Dân Trí'

    // ── 3. Save to MongoDB + persist image hashes (fire-and-forget) ──
    if (slug) {
      ;(async () => {
        try {
          const { connectToDatabase } = await import('@/lib/mongodb')
          const { default: NewsArticle } = await import('@/lib/models/NewsArticle')
          const { default: ImageCache } = await import('@/lib/models/ImageCache')
          const { IMG_CACHE } = await import('@/lib/utils/imgSlug')
          await connectToDatabase()

          // Save article
          await NewsArticle.findOneAndUpdate(
            { slug },
            {
              slug,
              title: originalTitle || 'Bài viết',
              content: finalContent,
              heroImage: heroRaw,   // store original URL
              bodyImages: bodyImgRaw,
              source, sourceUrl: articleUrl, category, pubDate, author,
              fetchedAt: new Date(),
              expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            },
            { upsert: true }
          )

          // Persist image hash → originalUrl to MongoDB
          const ops = []
          for (const [hash, originalUrl] of IMG_CACHE) {
            ops.push({
              updateOne: {
                filter: { hash },
                update: {
                  $set: {
                    originalUrl,
                    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                  },
                },
                upsert: true,
              },
            })
          }
          if (ops.length > 0) await ImageCache.bulkWrite(ops, { ordered: false })
        } catch { /* silent */ }
      })()
    }

    return {
      title: originalTitle || 'Bài viết',
      originalTitle: originalTitle || 'Bài viết',
      content: finalContent,
      // Generate clean image URLs with article title
      heroImage: toImgUrl(heroRaw, originalTitle),
      bodyImages: bodyImgRaw.map((u, i) =>
        toImgUrl(u, `${originalTitle} ảnh ${i + 1}`)
      ).filter(Boolean) as string[],
      source,
      sourceUrl: articleUrl,
      pubDate,
      author,
      slug,
      category,
    }
  } catch { return null }
}

/**
 * Persist tất cả hash trong IMG_CACHE vào MongoDB ImageCache collection.
 * Gọi từ Server Components sau fetchAllNews() để cold-start recovery.
 * Fire-and-forget — không await.
 */
export async function persistNewsThumbnails(_news: unknown[]): Promise<void> {
  try {
    const { connectToDatabase } = await import('@/lib/mongodb')
    const { default: ImageCache } = await import('@/lib/models/ImageCache')
    const { IMG_CACHE } = await import('@/lib/utils/imgSlug')
    await connectToDatabase()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ops: any[] = []
    for (const [hash, originalUrl] of IMG_CACHE) {
      ops.push({
        updateOne: {
          filter: { hash },
          update: {
            $set: {
              originalUrl,
              expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
          },
          upsert: true,
        },
      })
    }
    if (ops.length > 0) {
      await ImageCache.bulkWrite(ops, { ordered: false })
    }
  } catch { /* silent — DB unavailable */ }
}

