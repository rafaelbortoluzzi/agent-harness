import { NextRequest, NextResponse } from 'next/server'
import { hasApiKey } from '@/lib/llm/client'
import { judgeUnjudged } from '@/lib/llm/judge-runner'
import type { Runtime } from '@/lib/scanner/adapters/base'

export async function POST(req: NextRequest) {
  if (!hasApiKey()) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not set' }, { status: 400 })
  }
  const body = await req.json().catch(() => ({}))
  try {
    const result = await judgeUnjudged({
      runtime: body.runtime as Runtime | undefined,
      limit: typeof body.limit === 'number' ? body.limit : undefined,
    })
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Judge failed' },
      { status: 500 },
    )
  }
}
