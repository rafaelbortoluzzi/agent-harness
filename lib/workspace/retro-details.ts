import type { Health, ItemType, Runtime } from '@/lib/scanner/adapters/base'

export interface DetailsRow {
  id: string
  name: string
  type: ItemType
  size: number
  runtime: Runtime
  score: number | null
  modifiedAt: string
  health: Health
  snoozed: boolean
}

export type SortKey = 'name' | 'type' | 'size' | 'runtime' | 'score' | 'modified'
export type SortDir = 'asc' | 'desc'

export interface SortSpec {
  key: SortKey
  dir: SortDir
}

function fieldValue(row: DetailsRow, key: SortKey): string | number | null {
  switch (key) {
    case 'name':
      return row.name
    case 'type':
      return row.type
    case 'size':
      return row.size
    case 'runtime':
      return row.runtime
    case 'score':
      return row.score
    case 'modified':
      return row.modifiedAt
  }
}

function compare(a: string | number | null, b: string | number | null): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b
  if (typeof a === 'string' && typeof b === 'string') return a.localeCompare(b)
  return 0
}

export function sortDetailsRows(rows: DetailsRow[], spec: SortSpec): DetailsRow[] {
  const indexed = rows.map((row, idx) => ({ row, idx }))

  indexed.sort((x, y) => {
    if (spec.key === 'score') {
      const xn = x.row.score === null
      const yn = y.row.score === null
      if (xn && yn) return x.idx - y.idx
      if (xn) return 1
      if (yn) return -1
    }

    const av = fieldValue(x.row, spec.key)
    const bv = fieldValue(y.row, spec.key)
    const cmp = compare(av, bv)
    if (cmp !== 0) return spec.dir === 'asc' ? cmp : -cmp
    return x.idx - y.idx
  })

  return indexed.map(i => i.row)
}
