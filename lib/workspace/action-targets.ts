import type { ItemType, RegistryItem } from '@/lib/scanner/adapters/base'

export type ActionTarget =
  | { scope: 'all' }
  | { scope: 'repo'; repoPath: string }
  | { scope: 'section'; repoPath: string; itemType: ItemType | string }
  | { scope: 'unit'; itemId: string; repoPath?: string | null; itemType?: ItemType | string }

export function normalizeActionTarget(value: unknown): ActionTarget {
  if (!value || typeof value !== 'object') return { scope: 'all' }
  const target = value as Record<string, unknown>
  if (target.scope === 'repo' && typeof target.repoPath === 'string') {
    return { scope: 'repo', repoPath: target.repoPath }
  }
  if (
    target.scope === 'section' &&
    typeof target.repoPath === 'string' &&
    typeof target.itemType === 'string'
  ) {
    return { scope: 'section', repoPath: target.repoPath, itemType: target.itemType }
  }
  if (target.scope === 'unit' && typeof target.itemId === 'string') {
    return {
      scope: 'unit',
      itemId: target.itemId,
      repoPath: typeof target.repoPath === 'string' ? target.repoPath : undefined,
      itemType: typeof target.itemType === 'string' ? target.itemType : undefined,
    }
  }
  return { scope: 'all' }
}

export function itemMatchesActionTarget(item: RegistryItem, target: ActionTarget): boolean {
  if (target.scope === 'all') return true
  if (target.scope === 'repo') return item.repoPath === target.repoPath
  if (target.scope === 'section') {
    return item.repoPath === target.repoPath && item.type === target.itemType
  }
  return item.id === target.itemId
}
