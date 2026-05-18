import { NextRequest, NextResponse } from 'next/server'
import { getLlmProviderName, hasLlmProvider, isLlmProviderName } from '@/lib/llm/provider'
import { judgeUnjudged } from '@/lib/llm/judge-runner'
import type { Runtime } from '@/lib/scanner/adapters/base'
import { normalizeActionTarget } from '@/lib/workspace/action-targets'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const provider = isLlmProviderName(body.provider) ? body.provider : getLlmProviderName()
  if (!hasLlmProvider(provider)) {
    return NextResponse.json(
      { error: `LLM provider ${provider} is not configured` },
      { status: 400 },
    )
  }
  try {
    const result = await judgeUnjudged({
      runtime: body.runtime as Runtime | undefined,
      limit: typeof body.limit === 'number' ? body.limit : undefined,
      provider,
      target: normalizeActionTarget(body.target),
    })
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Judge failed' },
      { status: 500 },
    )
  }
}
