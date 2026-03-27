import { NextResponse } from 'next/server'
import { TESTIMONIALS } from '@/lib/data/testimonials'

export async function GET() {
  return NextResponse.json({
    success: true,
    data: TESTIMONIALS,
    total: TESTIMONIALS.length,
  })
}
