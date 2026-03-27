import { SERVICES } from '@/lib/data/services'
import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    success: true,
    data: SERVICES.map(s => ({
      id: s.id,
      slug: s.slug,
      name: s.name,
      tagline: s.tagline,
      description: s.description,
      icon: s.emoji,
      color: s.color,
      pricing: s.pricing,
    })),
  })
}
