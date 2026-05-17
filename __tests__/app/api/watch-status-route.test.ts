import fs from 'fs'
import os from 'os'
import path from 'path'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/watch/status/route'
import { writeWatchStatus } from '@/lib/watch/status'

describe('/api/watch/status', () => {
  const tmp = path.join(os.tmpdir(), `agent-harness-watch-route-${Date.now()}-${Math.random()}`)

  beforeEach(() => {
    process.env.AGENT_HARNESS_DIR = tmp
    fs.rmSync(tmp, { recursive: true, force: true })
  })

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true })
    delete process.env.AGENT_HARNESS_DIR
  })

  it('returns current watch status', async () => {
    writeWatchStatus({
      running: true,
      pid: 123,
      lastHeartbeatAt: new Date().toISOString(),
    })

    const response = await GET(new NextRequest('http://localhost/api/watch/status'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toMatchObject({ running: true, pid: 123, stale: false })
  })
})
