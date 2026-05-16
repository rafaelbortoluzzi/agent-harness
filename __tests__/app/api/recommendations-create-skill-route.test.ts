import fs from 'fs'
import os from 'os'
import path from 'path'
import { createHash } from 'crypto'
import { NextRequest } from 'next/server'
import { resetDbForTests } from '@/lib/registry/db'
import { upsertRecommendation } from '@/lib/registry/queries'
import { POST } from '@/app/api/recommendations/create-skill/route'

function recId(repoPath: string, kind: string, name: string): string {
  return createHash('sha256').update(`${repoPath}|${kind}|${name}`).digest('hex').slice(0, 16)
}

describe('/api/recommendations/create-skill', () => {
  let harnessDir: string
  let repoPath: string

  beforeEach(() => {
    harnessDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-harness-db-'))
    repoPath = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-harness-repo-'))
    process.env.AGENT_HARNESS_DIR = harnessDir
    resetDbForTests()
  })

  afterEach(() => {
    resetDbForTests()
    fs.rmSync(harnessDir, { recursive: true, force: true })
    fs.rmSync(repoPath, { recursive: true, force: true })
    delete process.env.AGENT_HARNESS_DIR
  })

  it('creates a skill from a skill recommendation', async () => {
    const id = recId(repoPath, 'skill', 'release-helper')
    upsertRecommendation({
      id,
      repoPath,
      kind: 'skill',
      name: 'release-helper',
      rationale: 'Automates release checklist creation for this repo.',
    })

    const response = await POST(
      new NextRequest('http://localhost/api/recommendations/create-skill', {
        method: 'POST',
        body: JSON.stringify({ recommendationId: id }),
      }),
    )

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.path).toBe(path.join(repoPath, '.claude', 'skills', 'release-helper', 'SKILL.md'))
    expect(fs.existsSync(body.path)).toBe(true)
  })

  it('rejects non-skill recommendations', async () => {
    const id = recId(repoPath, 'hook', 'session-logger')
    upsertRecommendation({
      id,
      repoPath,
      kind: 'hook',
      name: 'session-logger',
      rationale: 'Adds logging.',
    })

    const response = await POST(
      new NextRequest('http://localhost/api/recommendations/create-skill', {
        method: 'POST',
        body: JSON.stringify({ recommendationId: id }),
      }),
    )

    expect(response.status).toBe(400)
  })
})
