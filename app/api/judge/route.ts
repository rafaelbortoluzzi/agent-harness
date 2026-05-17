import { NextRequest, NextResponse } from 'next/server'
import { getLlmProviderName, hasLlmProvider } from '@/lib/llm/provider'
import { judgeUnjudged } from '@/lib/llm/judge-runner'
import type { Runtime } from '@/lib/scanner/adapters/base'

export async function POST(req: NextRequest) {
  if (!hasLlmProvider()) {
    return NextResponse.json(
      { error: `LLM provider ${getLlmProviderName()} is not configured` },
      { status: 400 },
    )
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
