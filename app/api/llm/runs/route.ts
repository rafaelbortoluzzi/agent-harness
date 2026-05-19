import { NextResponse } from 'next/server'
import { getAiRuns } from '@/lib/registry/queries'

export async function GET() {
  return NextResponse.json(getAiRuns(50))
}
