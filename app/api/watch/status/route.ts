import { NextResponse } from 'next/server'
import { getWatchStatus } from '@/lib/watch/status'

export async function GET() {
  return NextResponse.json(getWatchStatus())
}
