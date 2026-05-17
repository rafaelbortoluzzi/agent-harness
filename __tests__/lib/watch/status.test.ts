import fs from 'fs'
import os from 'os'
import path from 'path'
import { clearWatchStatus, getWatchStatus, writeWatchStatus } from '@/lib/watch/status'

describe('watch status', () => {
  const tmp = path.join(os.tmpdir(), `agent-harness-watch-${Date.now()}-${Math.random()}`)

  beforeEach(() => {
    process.env.AGENT_HARNESS_DIR = tmp
    fs.rmSync(tmp, { recursive: true, force: true })
  })

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true })
    delete process.env.AGENT_HARNESS_DIR
  })

  it('returns stopped when no watcher has reported status', () => {
    expect(getWatchStatus()).toMatchObject({ running: false })
  })

  it('persists a running watcher heartbeat', () => {
    writeWatchStatus({ running: true, pid: 123, lastHeartbeatAt: '2026-05-16T00:00:00.000Z' })

    expect(getWatchStatus({ now: new Date('2026-05-16T00:00:10.000Z') })).toMatchObject({
      running: true,
      pid: 123,
      stale: false,
    })
  })

  it('marks old heartbeats as stale and clears status', () => {
    writeWatchStatus({ running: true, pid: 123, lastHeartbeatAt: '2026-05-16T00:00:00.000Z' })

    expect(getWatchStatus({ now: new Date('2026-05-16T00:02:00.000Z') })).toMatchObject({
      running: false,
      stale: true,
    })

    clearWatchStatus()

    expect(getWatchStatus()).toMatchObject({ running: false, stale: false })
  })
})
