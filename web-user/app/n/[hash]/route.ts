/**
 * Image proxy — clean URL: /n/[base64url]
 *
 * [base64url] là base64url encoding của URL ảnh gốc.
 * Không cần lookup map, stateless, hoạt động across workers.
 *
 * URL example: /n/aHR0cHM6Ly9jZG5waG90by5kYW50cmkuY29tLnZuL3Bob3RvLmpwZw
 */
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ hash: string }> }
) {
  const { hash } = await params

  // Decode base64url → original URL
  let originalUrl: string
  try {
    originalUrl = Buffer.from(hash, 'base64url').toString('utf-8')
    if (!originalUrl.startsWith('http')) throw new Error('invalid')
  } catch {
    return new NextResponse(null, { status: 400 })
  }

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

    const ct = res.headers.get('content-type') ?? 'image/jpeg'
    const buf = await res.arrayBuffer()

    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': ct,
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=3600',
        'X-Proxied-By': 'FireGo',
      },
    })
  } catch {
    return new NextResponse(null, { status: 502 })
  }
}
