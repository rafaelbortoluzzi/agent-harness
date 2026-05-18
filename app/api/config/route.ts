import { NextRequest, NextResponse } from 'next/server'
import { getConfig, setConfig } from '@/lib/config'
import {
  getLlmProviderName,
  getLlmProviderStatuses,
  hasLlmProvider,
  isLlmProviderName,
} from '@/lib/llm/provider'

export async function GET() {
  return NextResponse.json({
    ...getConfig(),
    llmConnected: hasLlmProvider(),
    llmEditorConnected: Boolean(process.env.ANTHROPIC_API_KEY),
    llmProvider: getLlmProviderName(),
    llmProviders: getLlmProviderStatuses(),
  })
}

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  if (body.llmProvider !== undefined && !isLlmProviderName(body.llmProvider)) {
    return NextResponse.json({ error: `Invalid LLM provider: ${body.llmProvider}` }, { status: 400 })
  }
  const current = getConfig()
  setConfig({
    roots: Array.isArray(body.roots) ? body.roots : current.roots,
    explicitRepos: Array.isArray(body.explicitRepos) ? body.explicitRepos : current.explicitRepos,
    discoveryDepth:
      typeof body.discoveryDepth === 'number' ? body.discoveryDepth : current.discoveryDepth,
    respectGitignore:
      typeof body.respectGitignore === 'boolean' ? body.respectGitignore : current.respectGitignore,
    healthWeights:
      body.healthWeights && typeof body.healthWeights === 'object'
        ? body.healthWeights
        : current.healthWeights,
    llmProvider: body.llmProvider ?? current.llmProvider,
  })
  return NextResponse.json({
    ...getConfig(),
    llmConnected: hasLlmProvider(),
    llmEditorConnected: Boolean(process.env.ANTHROPIC_API_KEY),
    llmProvider: getLlmProviderName(),
    llmProviders: getLlmProviderStatuses(),
  })
}
