import { NextRequest, NextResponse } from 'next/server'
import { getScan } from '@/lib/registry/queries'

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const scan = getScan(id)
  if (!scan) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json(scan)
}
