import { NextRequest, NextResponse } from 'next/server'
import { getLlmProviderName, hasLlmProvider, isLlmProviderName } from '@/lib/llm/provider'
import { analyzeAndPersist } from '@/lib/llm/gap-analyst'
import { getItemById, getItems, getRepos } from '@/lib/registry/queries'
import type { ItemType } from '@/lib/scanner/adapters/base'
import { normalizeActionTarget, type ActionTarget } from '@/lib/workspace/action-targets'

function repoTargets(target: ActionTarget): { path: string; target: ActionTarget }[] {
  if (target.scope === 'repo' || target.scope === 'section') {
    return [{ path: target.repoPath, target }]
  }
  if (target.scope === 'unit') {
    const item = getItemById(target.itemId)
    if (!item?.repoPath) return []
    return [{
      path: item.repoPath,
      target: {
        scope: 'unit',
        itemId: item.id,
        repoPath: item.repoPath,
        itemType: item.type,
      },
    }]
  }
  return getRepos().map(r => ({ path: r.path, target: { scope: 'repo', repoPath: r.path } }))
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const provider = isLlmProviderName(body.provider) ? body.provider : getLlmProviderName()
  if (!hasLlmProvider(provider)) {
    return NextResponse.json(
      { error: `LLM provider ${provider} is not configured` },
      { status: 400 },
    )
  }
  const target = body.repoPath
    ? ({ scope: 'repo', repoPath: body.repoPath as string } satisfies ActionTarget)
    : normalizeActionTarget(body.target)
  const repos = repoTargets(target)

  let total = 0
  const errors: string[] = []
  for (const repo of repos) {
    const items =
      repo.target.scope === 'section'
        ? getItems({ repoPath: repo.path, type: repo.target.itemType as ItemType })
        : repo.target.scope === 'unit'
          ? [getItemById(repo.target.itemId)].filter(item => item !== null)
          : getItems({ repoPath: repo.path })
    try {
      const analyzeOptions = {
        provider,
        target: repo.target,
        ...(typeof body.presetId === 'string' ? { presetId: body.presetId } : {}),
        ...(body.promptOverride ? { promptOverride: body.promptOverride } : {}),
      }
      total += await analyzeAndPersist(repo.path, items, analyzeOptions)
    } catch (err) {
      errors.push(`${repo.path}: ${(err as Error).message}`)
    }
  }
  return NextResponse.json({ recommendations: total, repos: repos.length, errors })
}
