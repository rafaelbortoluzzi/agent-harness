import { NextRequest, NextResponse } from 'next/server'
import { getScanPreviewRepos, startBackgroundScan } from '@/lib/scanner/job-runner'

export async function GET() {
  try {
    return NextResponse.json({ repos: await getScanPreviewRepos() })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Scan preview failed' },
      { status: 500 },
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const scanId = startBackgroundScan({
      approvedAutoRepos: Array.isArray(body.approvedAutoRepos)
        ? body.approvedAutoRepos.filter((v: unknown): v is string => typeof v === 'string')
        : undefined,
      rejectedAutoRepos: Array.isArray(body.rejectedAutoRepos)
        ? body.rejectedAutoRepos.filter((v: unknown): v is string => typeof v === 'string')
        : undefined,
    })
    return NextResponse.json({ scanId })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Scan failed' },
      { status: 500 },
    )
  }
}
