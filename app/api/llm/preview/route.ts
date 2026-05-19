import fs from 'fs'
import { NextRequest, NextResponse } from 'next/server'
import { getConfig } from '@/lib/config'
import { buildAnalyzeRequest, ANALYZE_PRESETS } from '@/lib/llm/gap-analyst'
import { buildEditRequest } from '@/lib/llm/editor'
import { buildJudgeRequest, JUDGE_PRESETS } from '@/lib/llm/judge'
import { getItemById, getItems, getRepos } from '@/lib/registry/queries'
import type { ItemType, RegistryItem } from '@/lib/scanner/adapters/base'
import { normalizeActionTarget, type ActionTarget } from '@/lib/workspace/action-targets'

type PreviewAction = 'judge' | 'analyze' | 'improve'

function readBody(item: RegistryItem): string {
  try {
    if (!fs.existsSync(item.path) || fs.statSync(item.path).isDirectory()) return ''
    return fs.readFileSync(item.path, 'utf8')
  } catch {
    return ''
  }
}

function firstRepoTarget(target: ActionTarget): { repoPath: string; target: ActionTarget } | null {
  if (target.scope === 'repo' || target.scope === 'section') {
    return { repoPath: target.repoPath, target }
  }
  if (target.scope === 'unit') {
    const item = getItemById(target.itemId)
    if (!item?.repoPath) return null
    return {
      repoPath: item.repoPath,
      target: { scope: 'unit', itemId: item.id, repoPath: item.repoPath, itemType: item.type },
    }
  }
  const repo = getRepos()[0]
  return repo ? { repoPath: repo.path, target: { scope: 'repo', repoPath: repo.path } } : null
}

function previewItems(repoPath: string, target: ActionTarget): RegistryItem[] {
  if (target.scope === 'section') {
    return getItems({ repoPath, type: target.itemType as ItemType }).slice(0, 100)
  }
  if (target.scope === 'unit') {
    const item = getItemById(target.itemId)
    return item ? [item] : []
  }
  return getItems({ repoPath }).slice(0, 100)
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const action = body.action as PreviewAction
  const target = normalizeActionTarget(body.target)
  const presetId = typeof body.presetId === 'string' ? body.presetId : undefined
  const personalContext = getConfig().personalHarnessPreferences ?? ''

  if (action === 'judge') {
    const item =
      target.scope === 'unit'
        ? getItemById(target.itemId)
        : firstRepoTarget(target)
          ? previewItems(firstRepoTarget(target)!.repoPath, firstRepoTarget(target)!.target)[0]
          : null
    if (!item) return NextResponse.json({ error: 'No item available for prompt preview' }, { status: 404 })
    return NextResponse.json({
      action,
      presetId: presetId ?? JUDGE_PRESETS[0].id,
      presets: JUDGE_PRESETS,
      request: buildJudgeRequest(item, readBody(item), { presetId, personalContext }),
      target,
    })
  }

  if (action === 'analyze') {
    const repo = firstRepoTarget(target)
    if (!repo) return NextResponse.json({ error: 'No repo available for prompt preview' }, { status: 404 })
    return NextResponse.json({
      action,
      presetId: presetId ?? ANALYZE_PRESETS[0].id,
      presets: ANALYZE_PRESETS,
      request: buildAnalyzeRequest(repo.repoPath, previewItems(repo.repoPath, repo.target), {
        presetId,
        target: repo.target,
        personalContext,
      }),
      target: repo.target,
    })
  }

  if (action === 'improve') {
    if (target.scope !== 'unit') {
      return NextResponse.json({ error: 'Improve preview requires a unit target' }, { status: 400 })
    }
    const item = getItemById(target.itemId)
    if (!item) return NextResponse.json({ error: 'item not found' }, { status: 404 })
    return NextResponse.json({
      action,
      presetId: 'improve-default',
      presets: [],
      request: buildEditRequest(
        item,
        readBody(item),
        typeof body.prompt === 'string'
          ? body.prompt
          : 'Improve this agent asset for clarity, concrete triggering conditions, and actionable steps. Preserve the existing format.',
      ),
      target,
    })
  }

  return NextResponse.json({ error: `Unsupported preview action: ${String(action)}` }, { status: 400 })
}
