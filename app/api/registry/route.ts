import { NextRequest, NextResponse } from 'next/server'
import { getItems, getRepos, getScans, type ItemFilter } from '@/lib/registry/queries'
import type { Health, ItemType, Runtime, Scope } from '@/lib/scanner/adapters/base'

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
