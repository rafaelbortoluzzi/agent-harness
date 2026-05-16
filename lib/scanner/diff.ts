import type { RegistryItem } from './adapters/base'

export interface ScanDiff {
  itemsNew: number
  itemsRemoved: number
  itemsChanged: number
}

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable)
  if (!value || typeof value !== 'object') return value

  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => [key, stable(nested)]),
  )
}

function comparable(item: RegistryItem) {
  return {
    runtime: item.runtime,
    scope: item.scope,
    type: item.type,
    name: item.name,
    path: item.path,
    repoPath: item.repoPath,
    health: item.health,
    issues: stable(item.issues),
    metadata: stable(item.metadata),
  }
}

export function computeScanDiff(
  previousItems: RegistryItem[],
  currentItems: RegistryItem[],
): ScanDiff {
  const previousById = new Map(previousItems.map(item => [item.id, item]))
  const currentById = new Map(currentItems.map(item => [item.id, item]))

  let itemsNew = 0
  let itemsRemoved = 0
  let itemsChanged = 0

  for (const id of currentById.keys()) {
    const previous = previousById.get(id)
    if (!previous) {
      itemsNew += 1
      continue
    }

    if (JSON.stringify(comparable(previous)) !== JSON.stringify(comparable(currentById.get(id)!))) {
      itemsChanged += 1
    }
  }

  for (const id of previousById.keys()) {
    if (!currentById.has(id)) itemsRemoved += 1
  }

  return { itemsNew, itemsRemoved, itemsChanged }
}
