import type { ItemType } from '@/lib/scanner/adapters/base'

export type RetroNav =
  | { kind: 'root' }
  | { kind: 'repo'; repoPath: string }
  | { kind: 'group'; repoPath: string; itemType: ItemType }

export interface Crumb {
  id: string
  label: string
}

export type RepoLabelLookup = (repoPath: string) => string | null

function basename(path: string): string {
  const trimmed = path.replace(/\/+$/, '')
  const idx = trimmed.lastIndexOf('/')
  return idx === -1 ? trimmed : trimmed.slice(idx + 1)
}

export function breadcrumbFromNav(nav: RetroNav, lookup: RepoLabelLookup): Crumb[] {
  const out: Crumb[] = [{ id: 'root', label: 'Agent Harness' }]
  if (nav.kind === 'root') return out

  const repoLabel = lookup(nav.repoPath) ?? basename(nav.repoPath)
  out.push({ id: `r:${nav.repoPath}`, label: repoLabel })

  if (nav.kind === 'group') {
    out.push({ id: `r:${nav.repoPath}/t:${nav.itemType}`, label: nav.itemType })
  }
  return out
}
