import { NextRequest, NextResponse } from 'next/server'
import { getConfig } from '@/lib/config'
import { getLlmProviderName, hasLlmProvider, isLlmProviderName } from '@/lib/llm/provider'
import { judgeUnjudged } from '@/lib/llm/judge-runner'
import { recordAiRun } from '@/lib/registry/queries'
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
  const target = normalizeActionTarget(body.target)
  try {
    const personalContext = getConfig().personalHarnessPreferences
    const result = await judgeUnjudged({
      runtime: body.runtime as Runtime | undefined,
      limit: typeof body.limit === 'number' ? body.limit : undefined,
      provider,
      target,
      ...(typeof body.presetId === 'string' ? { presetId: body.presetId } : {}),
      ...(body.promptOverride ? { promptOverride: body.promptOverride } : {}),
      ...(personalContext ? { personalContext } : {}),
    })
    recordAiRun({
      action: 'judge',
      provider,
      presetId: typeof body.presetId === 'string' ? body.presetId : null,
      target: target as unknown as Record<string, unknown>,
      systemPrompt: body.promptOverride?.system,
      userPrompt: body.promptOverride?.prompt,
      resultSummary: JSON.stringify(result),
      status: 'done',
    })
    return NextResponse.json(result)
  } catch (err) {
    recordAiRun({
      action: 'judge',
      provider,
      presetId: typeof body.presetId === 'string' ? body.presetId : null,
      target: target as unknown as Record<string, unknown>,
      systemPrompt: body.promptOverride?.system,
      userPrompt: body.promptOverride?.prompt,
      resultSummary: err instanceof Error ? err.message : 'Judge failed',
      status: 'error',
    })
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Judge failed' },
      { status: 500 },
    )
  }
}
