import { NextRequest, NextResponse } from 'next/server'
import { getConfig, setConfig } from '@/lib/config'
import { getLlmProviderName, hasLlmProvider } from '@/lib/llm/provider'

export async function GET() {
  return NextResponse.json({
    ...getConfig(),
    llmConnected: hasLlmProvider(),
    llmEditorConnected: Boolean(process.env.ANTHROPIC_API_KEY),
    llmProvider: getLlmProviderName(),
  })
}

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  setConfig({ ...getConfig(), ...body })
  return NextResponse.json(getConfig())
}
