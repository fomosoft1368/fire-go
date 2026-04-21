/**
 * Image proxy route — serves external news images from FireGo's own domain.
 * This is critical for SEO: all images appear to come from firego.vn
 *
 * Usage: /api/img?url=https://cdn.vnexpress.net/photo.jpg
 */
import { NextRequest, NextResponse } from 'next/server'

function isAllowed(url: string): boolean {
  try {
    const { protocol } = new URL(url)
    // Allow all http/https image URLs from external sources
    return protocol === 'https:' || protocol === 'http:'
  } catch {
    return false
  }
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')
  if (!url) return NextResponse.json({ error: 'Missing url' }, { status: 400 })

  if (!isAllowed(url)) {
    return NextResponse.json({ error: 'Domain not allowed' }, { status: 403 })
  }

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; FireGo-Image-Proxy/1.0)',
        'Referer': 'https://www.google.com/',
      },
      signal: AbortSignal.timeout(10000),
    })

    if (!res.ok) {
      return NextResponse.json({ error: 'Upstream error' }, { status: res.status })
    }

    const contentType = res.headers.get('content-type') ?? 'image/jpeg'
    const buffer = await res.arrayBuffer()

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        // Cache proxy images for 7 days
        'Cache-Control': 'public, max-age=604800, stale-while-revalidate=86400',
        'X-Proxy-Source': 'FireGo',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Fetch failed' }, { status: 502 })
  }
}
