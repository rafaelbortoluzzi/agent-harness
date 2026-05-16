import fs from 'fs'
import os from 'os'
import path from 'path'
import { sql } from 'drizzle-orm'
import { getDb, resetDbForTests } from '@/lib/registry/db'

describe('db migrations', () => {
  const tmp = path.join(os.tmpdir(), `harness-db-${Date.now()}-${Math.random()}`)

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

  it('creates all tables on first connect', () => {
    const db = getDb()
    const rows = db.all(sql`SELECT name FROM sqlite_master WHERE type='table'`) as { name: string }[]
    const names = rows.map(r => r.name)
    for (const t of ['items', 'scans', 'repos', 'snoozed_items']) {
      expect(names).toContain(t)
    }
  })

  it('is idempotent — second open does not fail', () => {
    getDb()
    resetDbForTests()
    expect(() => getDb()).not.toThrow()
  })
})
