import fs from 'fs'
import os from 'os'
import path from 'path'
import { NextRequest } from 'next/server'
import { resetDbForTests } from '@/lib/registry/db'
import { getSnooze } from '@/lib/registry/queries'
import { DELETE, POST } from '@/app/api/snooze/route'

describe('/api/snooze', () => {
  const tmp = path.join(os.tmpdir(), `harness-snooze-route-${Date.now()}-${Math.random()}`)

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

  it('snoozes and unsnoozes an item', async () => {
    const post = await POST(
      new NextRequest('http://localhost/api/snooze', {
        method: 'POST',
        body: JSON.stringify({ itemId: 'abc', days: 7, reason: 'low priority' }),
      }),
    )

    expect(post.status).toBe(200)
    expect(getSnooze('abc')).toMatchObject({ itemId: 'abc', reason: 'low priority' })

    const del = await DELETE(
      new NextRequest('http://localhost/api/snooze', {
        method: 'DELETE',
        body: JSON.stringify({ itemId: 'abc' }),
      }),
    )

    expect(del.status).toBe(200)
    expect(getSnooze('abc')).toBeNull()
  })
})
