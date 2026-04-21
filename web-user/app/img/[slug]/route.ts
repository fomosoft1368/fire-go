/**
 * Image proxy — SEO-friendly URL: /img/tieu-de-bai-bao-abc1234.jpg
 *
 * Cách hoạt động:
 * 1. Parse slug → extract hash7 (7 ký tự cuối trước extension)
 * 2. Lookup global IMG_CACHE[hash] → originalUrl
 * 3. Nếu miss: fallback tới MongoDB ImageCache
 * 4. Fetch ảnh từ originalUrl với proper headers
 * 5. Cache response 24h
 */
import { NextRequest, NextResponse } from 'next/server'
import { IMG_CACHE } from '@/lib/utils/imgSlug'

function extractHashFromSlug(slug: string): string | null {
  // slug = "tieu-de-bai-bao-abc1234.jpg"
  // hash = "abc1234" (7 ký tự trước extension)
  const withoutExt = slug.replace(/\.[^.]+$/, '')        // "tieu-de-bai-bao-abc1234"
  const parts = withoutExt.split('-')
  const last = parts[parts.length - 1]
  if (last && last.length >= 6 && last.length <= 8 && /^[a-z0-9]+$/.test(last)) {
    return last
  }
  return null
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const hash = extractHashFromSlug(slug)

  if (!hash) {
    return new NextResponse(null, { status: 400 })
  }

  // 1. Check global in-memory map (fastest)
  let originalUrl = IMG_CACHE.get(hash)

  // 2. Fallback: MongoDB lookup (cold start after server restart)
  if (!originalUrl) {
    try {
      const { connectToDatabase } = await import('@/lib/mongodb')
      const { default: ImageCache } = await import('@/lib/models/ImageCache')
      await connectToDatabase()
      const cached = await ImageCache.findOne({ hash }).lean() as { originalUrl?: string } | null
      if (cached?.originalUrl) {
        originalUrl = cached.originalUrl
        IMG_CACHE.set(hash, originalUrl) // re-populate in-memory
      }
    } catch { /* MongoDB unavailable */ }
  }

  if (!originalUrl) {
    return new NextResponse(null, { status: 404 })
  }

  // 3. Fetch image from source
  try {
    const res = await fetch(originalUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36',
        'Referer': 'https://www.google.com/',
        'Accept': 'image/avif,image/webp,image/apng,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(10000),
    })

    if (!res.ok) return new NextResponse(null, { status: res.status })

    const contentType = res.headers.get('content-type') ?? 'image/jpeg'
    const buffer = await res.arrayBuffer()

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=3600',
        'X-Proxied-By': 'FireGo',
        'X-Original-Hash': hash,
      },
    })
  } catch {
    return new NextResponse(null, { status: 502 })
  }
}
