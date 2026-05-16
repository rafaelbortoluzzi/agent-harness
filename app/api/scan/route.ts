import { NextResponse } from 'next/server'
import { startBackgroundScan } from '@/lib/scanner/job-runner'

export async function POST() {
  try {
    const scanId = startBackgroundScan()
    return NextResponse.json({ scanId })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Scan failed' },
      { status: 500 },
    )
  }
}
