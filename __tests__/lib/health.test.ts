import fs from 'fs'
import os from 'os'
import path from 'path'
import { computeHealthScore } from '@/lib/health'
import { setConfig } from '@/lib/config'
import { resetDbForTests } from '@/lib/registry/db'
import type { RegistryItem } from '@/lib/scanner/adapters/base'

const makeItem = (o: Partial<RegistryItem> = {}): RegistryItem => ({
  id: 'x',
  runtime: 'claude',
  scope: 'repo',
  type: 'skill',
  name: 'x',
  path: '/p',
  repoPath: '/repo',
  health: 'ok',
  issues: [],
  metadata: {},
  scannedAt: new Date().toISOString(),
  ...o,
})

describe('computeHealthScore', () => {
  const tmp = path.join(os.tmpdir(), `health-${Date.now()}-${Math.random()}`)

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

  it('returns 100 for well-instrumented repo', () => {
    const items = [
      makeItem({ type: 'instruction', name: 'CLAUDE.md' }),
      makeItem({ type: 'skill', name: 's1' }),
      makeItem({ type: 'hook', name: 'SessionStart' }),
    ]
    expect(computeHealthScore(items)).toBe(100)
  })

  it('deducts 20 for missing instruction', () => {
    const items = [
      makeItem({ type: 'skill', name: 's1' }),
      makeItem({ type: 'hook', name: 'SessionStart' }),
    ]
    expect(computeHealthScore(items)).toBe(80)
  })

  it('deducts 10 per broken item', () => {
    const items = [
      makeItem({ type: 'instruction', name: 'CLAUDE.md' }),
      makeItem({ type: 'skill', name: 's1', health: 'broken' }),
      makeItem({ type: 'hook', name: 'SessionStart' }),
    ]
    expect(computeHealthScore(items)).toBe(90)
  })

  it('deducts 5 per warning', () => {
    const items = [
      makeItem({ type: 'instruction', name: 'CLAUDE.md' }),
      makeItem({ type: 'skill', name: 's1', health: 'warning' }),
      makeItem({ type: 'hook', name: 'SessionStart' }),
    ]
    expect(computeHealthScore(items)).toBe(95)
  })

  it('clamps to 0 minimum', () => {
    const items = Array.from({ length: 15 }, (_, i) =>
      makeItem({ id: String(i), name: `i${i}`, health: 'broken' }),
    )
    expect(computeHealthScore(items)).toBe(0)
  })

  it('honors custom weights from config', () => {
    setConfig({
      roots: [],
      explicitRepos: [],
      discoveryDepth: 2,
      respectGitignore: true,
      healthWeights: { perBrokenItem: 50 },
    })
    const items = [
      makeItem({ type: 'instruction', name: 'CLAUDE.md' }),
      makeItem({ type: 'skill', name: 's1' }),
      makeItem({ type: 'hook', name: 'SessionStart' }),
      makeItem({ id: 'b', name: 'b', health: 'broken' }),
    ]
    expect(computeHealthScore(items)).toBe(50)
  })
})
