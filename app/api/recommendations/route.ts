import { NextRequest, NextResponse } from 'next/server'
import { getRecommendations } from '@/lib/registry/queries'

export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams
  const repoPath = sp.get('repoPath') ?? undefined
  return NextResponse.json(getRecommendations(repoPath))
}
