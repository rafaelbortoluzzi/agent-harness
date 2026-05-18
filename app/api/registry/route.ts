import { NextRequest, NextResponse } from 'next/server'
import {
  deleteItemById,
  deleteItemsByRepo,
  deleteItemsByRepoAndType,
  getItems,
  getRepos,
  getScans,
  type ItemFilter,
} from '@/lib/registry/queries'
import type { Health, ItemType, Runtime, Scope } from '@/lib/scanner/adapters/base'
import { normalizeActionTarget } from '@/lib/workspace/action-targets'

export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams
  const resource = sp.get('resource') ?? 'items'

  if (resource === 'scans') return NextResponse.json(getScans())
  if (resource === 'repos') return NextResponse.json(getRepos())

  const filter: ItemFilter = { excludeSnoozed: sp.get('excludeSnoozed') !== 'false' }
  const runtime = sp.get('runtime'); if (runtime) filter.runtime = runtime as Runtime
  const health = sp.get('health'); if (health) filter.health = health as Health
  const type = sp.get('type'); if (type) filter.type = type as ItemType
  const scope = sp.get('scope'); if (scope) filter.scope = scope as Scope
  const repoPath = sp.get('repoPath'); if (repoPath) filter.repoPath = repoPath

  const limit = Number(sp.get('limit') ?? 100)
  const offset = Number(sp.get('offset') ?? 0)

  return NextResponse.json(getItems(filter, { limit, offset }))
}

export async function DELETE(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const target = normalizeActionTarget(body.target)
  if (target.scope === 'unit') {
    return NextResponse.json({ removed: deleteItemById(target.itemId) })
  }
  if (target.scope === 'section') {
    return NextResponse.json({
      removed: deleteItemsByRepoAndType(target.repoPath, target.itemType as ItemType),
    })
  }
  if (target.scope === 'repo') {
    return NextResponse.json({ removed: deleteItemsByRepo(target.repoPath) })
  }
  return NextResponse.json({ error: 'target required' }, { status: 400 })
}
