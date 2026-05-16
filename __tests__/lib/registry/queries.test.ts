import fs from 'fs'
import os from 'os'
import path from 'path'
import { resetDbForTests } from '@/lib/registry/db'
import {
  upsertItem,
  getItems,
  countItems,
  startScan,
  finishScan,
  failScan,
  getScan,
  snoozeItem,
  getSnoozed,
  deleteItemsMissingFromScan,
} from '@/lib/registry/queries'
import type { RegistryItem } from '@/lib/scanner/adapters/base'

const item = (o: Partial<RegistryItem> = {}): RegistryItem => ({
  id: 'a',
  runtime: 'claude',
  scope: 'personal',
  type: 'skill',
  name: 's1',
  path: '/p',
  repoPath: null,
  health: 'ok',
  issues: [],
  metadata: {},
  scannedAt: new Date().toISOString(),
  ...o,
})

describe('queries', () => {
  const tmp = path.join(os.tmpdir(), `harness-q-${Date.now()}-${Math.random()}`)

  beforeEach(() => {
    process.env.AGENT_HARNESS_DIR = tmp
    resetDbForTests()
    fs.rmSync(tmp, { recursive: true, force: true })
  })

  afterEach(() => {
    resetDbForTests()
    fs.rmSync(tmp, { recursive: true, force: true })
    delete process.env.AGENT_HARNESS_DIR
  })

  it('upsert + filter by runtime', () => {
    upsertItem(item({ id: '1', runtime: 'claude' }))
    upsertItem(item({ id: '2', runtime: 'codex' }))
    expect(getItems({ runtime: 'claude' })).toHaveLength(1)
  })

  it('upsert updates existing row instead of inserting', () => {
    upsertItem(item({ id: '1', health: 'ok' }))
    upsertItem(item({ id: '1', health: 'broken', issues: ['x'] }))
    const all = getItems({})
    expect(all).toHaveLength(1)
    expect(all[0].health).toBe('broken')
    expect(all[0].issues).toEqual(['x'])
  })

  it('removes registry items that are missing from the latest scan', () => {
    upsertItem(item({ id: 'kept', name: 'kept' }))
    upsertItem(item({ id: 'stale', name: 'stale' }))

    const removed = deleteItemsMissingFromScan(['kept'])

    expect(removed).toBe(1)
    expect(getItems({}).map(i => i.id)).toEqual(['kept'])
  })

  it('removes snoozes for items that are missing from the latest scan', () => {
    upsertItem(item({ id: 'kept', name: 'kept' }))
    upsertItem(item({ id: 'stale', name: 'stale' }))
    snoozeItem('kept', 'still relevant', null)
    snoozeItem('stale', 'obsolete', null)

    deleteItemsMissingFromScan(['kept'])

    expect(getSnoozed()).toEqual(['kept'])
  })

  it('paginates results', () => {
    for (let i = 0; i < 50; i++) {
      upsertItem(item({ id: String(i), name: `s${i}` }))
    }
    expect(getItems({}, { limit: 10 })).toHaveLength(10)
    expect(getItems({}, { limit: 10, offset: 40 })).toHaveLength(10)
    expect(countItems({})).toBe(50)
  })

  it('snooze hides item from broken list when excludeSnoozed=true', () => {
    upsertItem(item({ id: 'x', health: 'broken' }))
    upsertItem(item({ id: 'y', health: 'broken' }))
    snoozeItem('x', 'flaky', null)
    expect(getItems({ health: 'broken', excludeSnoozed: true })).toHaveLength(1)
    expect(getItems({ health: 'broken' })).toHaveLength(2)
  })

  it('scan lifecycle: start → finish → status done', () => {
    const id = startScan()
    finishScan(id, { reposScanned: 2, itemsFound: 5, itemsBroken: 1 })
    const scan = getScan(id)
    expect(scan?.status).toBe('done')
    expect(scan?.itemsFound).toBe(5)
    expect(scan?.itemsBroken).toBe(1)
  })

  it('failScan stores error and status', () => {
    const id = startScan()
    failScan(id, 'boom')
    const scan = getScan(id)
    expect(scan?.status).toBe('error')
    expect(scan?.error).toBe('boom')
  })
})
