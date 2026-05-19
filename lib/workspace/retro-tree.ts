import type { ItemType } from '@/lib/scanner/adapters/base'

export interface TreeRepo {
  path: string
  label: string | null
  healthScore: number | null
}

export interface TreeItem {
  id: string
  type: ItemType
  repoPath: string | null
}

export type TreeNodeKind = 'root' | 'repo' | 'type-group'

export interface TreeNode {
  id: string
  kind: TreeNodeKind
  label: string
  depth: number
  count: number
  children: TreeNode[]
  repoPath?: string
  itemType?: ItemType
}

function basename(path: string): string {
  const trimmed = path.replace(/\/+$/, '')
  const idx = trimmed.lastIndexOf('/')
  return idx === -1 ? trimmed : trimmed.slice(idx + 1)
}

export function buildRetroTree(repos: TreeRepo[], items: TreeItem[]): TreeNode {
  const reposSorted = [...repos].sort((a, b) => a.path.localeCompare(b.path))

  const repoChildren: TreeNode[] = reposSorted.map(repo => {
    const repoItems = items.filter(i => i.repoPath === repo.path)

    const grouped = new Map<ItemType, number>()
    for (const item of repoItems) {
      grouped.set(item.type, (grouped.get(item.type) ?? 0) + 1)
    }

    const groups: TreeNode[] = [...grouped.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([type, count]) => ({
        id: `r:${repo.path}/t:${type}`,
        kind: 'type-group' as const,
        label: type,
        depth: 2,
        count,
        children: [],
        repoPath: repo.path,
        itemType: type,
      }))

    return {
      id: `r:${repo.path}`,
      kind: 'repo' as const,
      label: repo.label ?? basename(repo.path),
      depth: 1,
      count: repoItems.length,
      children: groups,
      repoPath: repo.path,
    }
  })

  return {
    id: 'root',
    kind: 'root',
    label: 'Agent Harness',
    depth: 0,
    count: items.length,
    children: repoChildren,
  }
}
