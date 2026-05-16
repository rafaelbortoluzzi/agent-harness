import { NextRequest, NextResponse } from 'next/server'
import { getSnooze, snoozeItem, unsnoozeItem } from '@/lib/registry/queries'

interface SnoozeBody {
  itemId?: string
  days?: number
  reason?: string
}

async function readBody(req: NextRequest): Promise<SnoozeBody> {
  try {
    return (await req.json()) as SnoozeBody
  } catch {
    return {}
  }
}

function untilDate(days: number | undefined): string | null {
  if (!days || days <= 0) return null
  return new Date(Date.now() + days * 86400_000).toISOString()
}

export async function GET(req: NextRequest) {
  const itemId = new URL(req.url).searchParams.get('itemId')
  if (!itemId) return NextResponse.json({ error: 'itemId is required' }, { status: 400 })

  return NextResponse.json({ snooze: getSnooze(itemId) })
}

export async function POST(req: NextRequest) {
  const body = await readBody(req)
  if (!body.itemId) return NextResponse.json({ error: 'itemId is required' }, { status: 400 })

  snoozeItem(body.itemId, body.reason?.trim() || null, untilDate(body.days))
  return NextResponse.json({ snooze: getSnooze(body.itemId) })
}

export async function DELETE(req: NextRequest) {
  const body = await readBody(req)
  if (!body.itemId) return NextResponse.json({ error: 'itemId is required' }, { status: 400 })

  unsnoozeItem(body.itemId)
  return NextResponse.json({ ok: true })
}
