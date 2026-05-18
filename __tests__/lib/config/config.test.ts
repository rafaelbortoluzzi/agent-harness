import fs from 'fs'
import os from 'os'
import path from 'path'
import { getConfig, getEffectiveWeights, setConfig } from '@/lib/config'

describe('config', () => {
  const testDir = path.join(os.tmpdir(), `harness-cfg-${Date.now()}-${Math.random()}`)

  beforeEach(() => {
    process.env.AGENT_HARNESS_DIR = testDir
    fs.rmSync(testDir, { recursive: true, force: true })
  })

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true })
    delete process.env.AGENT_HARNESS_DIR
  })

  it('returns defaults when file absent', () => {
    const c = getConfig()
    expect(c.roots).toEqual([])
    expect(c.discoveryDepth).toBe(2)
    expect(c.respectGitignore).toBe(true)
    expect(c.llmProvider).toBeUndefined()
  })

  it('persists changes', () => {
    setConfig({
      roots: ['/x'],
      explicitRepos: [],
      discoveryDepth: 3,
      respectGitignore: false,
      healthWeights: {},
      llmProvider: 'codex-cli',
    })
    const c = getConfig()
    expect(c.roots).toEqual(['/x'])
    expect(c.discoveryDepth).toBe(3)
    expect(c.respectGitignore).toBe(false)
    expect(c.llmProvider).toBe('codex-cli')
  })

  it('throws on malformed JSON', () => {
    fs.mkdirSync(testDir, { recursive: true })
    fs.writeFileSync(path.join(testDir, 'config.json'), '{not json}')
    expect(() => getConfig()).toThrow(/parse/i)
  })

  it('merges partial healthWeights with defaults via getEffectiveWeights', () => {
    setConfig({
      roots: [],
      explicitRepos: [],
      discoveryDepth: 2,
      respectGitignore: true,
      healthWeights: { perBrokenItem: 99 },
    })
    const w = getEffectiveWeights()
    expect(w.perBrokenItem).toBe(99)
    expect(w.missingInstruction).toBe(20)
  })
})
