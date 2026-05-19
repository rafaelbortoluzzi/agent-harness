import { sortDetailsRows, type DetailsRow, type SortKey } from '@/lib/workspace/retro-details'

const base: Omit<DetailsRow, 'id' | 'name' | 'score' | 'modifiedAt'> = {
  type: 'skill',
  size: 1024,
  runtime: 'claude',
  health: 'ok',
  snoozed: false,
}

const rows: DetailsRow[] = [
  { ...base, id: 'b', name: 'beta', score: 5, modifiedAt: '2026-01-02T00:00:00Z' },
  { ...base, id: 'a', name: 'alpha', score: null, modifiedAt: '2026-01-01T00:00:00Z' },
  { ...base, id: 'c', name: 'gamma', score: 9, modifiedAt: '2026-01-03T00:00:00Z' },
  { ...base, id: 'd', name: 'delta', score: null, modifiedAt: '2026-01-04T00:00:00Z' },
]

function ids(rs: DetailsRow[]) {
  return rs.map(r => r.id)
}

describe('sortDetailsRows', () => {
  test('sorts by name ascending', () => {
    expect(ids(sortDetailsRows(rows, { key: 'name', dir: 'asc' }))).toEqual([
      'a',
      'b',
      'd',
      'c',
    ])
  })

  test('sorts by name descending', () => {
    expect(ids(sortDetailsRows(rows, { key: 'name', dir: 'desc' }))).toEqual([
      'c',
      'd',
      'b',
      'a',
    ])
  })

  test('score sort: null values always trail regardless of direction', () => {
    const asc = sortDetailsRows(rows, { key: 'score', dir: 'asc' })
    expect(ids(asc)).toEqual(['b', 'c', 'a', 'd'])
    const desc = sortDetailsRows(rows, { key: 'score', dir: 'desc' })
    expect(ids(desc)).toEqual(['c', 'b', 'a', 'd'])
  })

  test('sorts by modifiedAt iso strings', () => {
    expect(ids(sortDetailsRows(rows, { key: 'modified', dir: 'desc' }))).toEqual([
      'd',
      'c',
      'b',
      'a',
    ])
  })

  test('stable for ties', () => {
    const tied: DetailsRow[] = [
      { ...base, id: '1', name: 'x', score: 1, modifiedAt: '2026-01-01T00:00:00Z' },
      { ...base, id: '2', name: 'x', score: 1, modifiedAt: '2026-01-01T00:00:00Z' },
      { ...base, id: '3', name: 'x', score: 1, modifiedAt: '2026-01-01T00:00:00Z' },
    ]
    expect(ids(sortDetailsRows(tied, { key: 'name', dir: 'asc' }))).toEqual(['1', '2', '3'])
  })

  test('does not mutate input', () => {
    const before = ids(rows)
    sortDetailsRows(rows, { key: 'score', dir: 'asc' })
    expect(ids(rows)).toEqual(before)
  })

  test.each<SortKey>(['name', 'type', 'size', 'runtime', 'score', 'modified'])(
    'accepts %s as sort key without throwing',
    key => {
      expect(() => sortDetailsRows(rows, { key, dir: 'asc' })).not.toThrow()
    },
  )
})
