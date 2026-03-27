import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { platform, page } = body

    // Log to console (could save to MongoDB or analytics service)
    console.log(`[INSTALL_CLICK] platform=${platform} page=${page} time=${new Date().toISOString()}`)

    // Optional: save to MongoDB for detailed tracking
    // await connectToDatabase()
    // await InstallClick.create({ platform, page, userAgent: request.headers.get('user-agent'), createdAt: new Date() })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false }, { status: 500 })
  }
}
