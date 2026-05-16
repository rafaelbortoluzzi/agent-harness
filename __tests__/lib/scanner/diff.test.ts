import { computeScanDiff } from '@/lib/scanner/diff'
import type { RegistryItem } from '@/lib/scanner/adapters/base'

const item = (o: Partial<RegistryItem> = {}): RegistryItem => ({
  id: 'a',
  runtime: 'claude',
  scope: 'personal',
  type: 'skill',
  name: 'skill-a',
  path: '/skills/a',
  repoPath: null,
  health: 'ok',
  issues: [],
  metadata: {},
  scannedAt: '2026-05-16T00:00:00.000Z',
  ...o,
})

describe('computeScanDiff', () => {
  it('counts new and removed items by stable registry id', () => {
    const diff = computeScanDiff(
      [item({ id: 'removed' }), item({ id: 'kept' })],
      [item({ id: 'kept' }), item({ id: 'new' })],
    )

    expect(diff).toEqual({ itemsNew: 1, itemsRemoved: 1, itemsChanged: 0 })
  })

  it('counts changed items while ignoring scannedAt churn', () => {
    const previous = item({
      id: 'same',
      health: 'ok',
      metadata: { version: 1 },
      scannedAt: '2026-05-16T00:00:00.000Z',
    })
    const current = item({
      id: 'same',
      health: 'warning',
      metadata: { version: 1 },
      scannedAt: '2026-05-16T00:10:00.000Z',
    })

    expect(computeScanDiff([previous], [current])).toEqual({
      itemsNew: 0,
      itemsRemoved: 0,
      itemsChanged: 1,
    })
  })

  it('does not count metadata key order differences as changes', () => {
    const previous = item({ id: 'same', metadata: { a: 1, b: { c: 2, d: 3 } } })
    const current = item({ id: 'same', metadata: { b: { d: 3, c: 2 }, a: 1 } })

    expect(computeScanDiff([previous], [current])).toEqual({
      itemsNew: 0,
      itemsRemoved: 0,
      itemsChanged: 0,
    })
  })
})
