import { NextRequest, NextResponse } from 'next/server'
import { isLlmProviderName, testLlmProvider } from '@/lib/llm/provider'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  if (body.provider !== undefined && !isLlmProviderName(body.provider)) {
    return NextResponse.json({ error: `Invalid LLM provider: ${body.provider}` }, { status: 400 })
  }
  const result = await testLlmProvider(body.provider)
  return NextResponse.json(result, { status: result.ok ? 200 : 400 })
}
