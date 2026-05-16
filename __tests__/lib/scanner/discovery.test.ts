import fs from 'fs'
import os from 'os'
import path from 'path'
import { discoverRepos } from '@/lib/scanner/discovery'

const baseCfg = { discoveryDepth: 2, respectGitignore: false, healthWeights: {} }

describe('discoverRepos', () => {
  let tmp: string

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'disc-'))
  })

  afterEach(() => fs.rmSync(tmp, { recursive: true, force: true }))

  it('finds repos at depth 1 (direct child)', async () => {
    const repo = path.join(tmp, 'project-a')
    fs.mkdirSync(repo)
    fs.writeFileSync(path.join(repo, 'CLAUDE.md'), '')
    const repos = await discoverRepos({ ...baseCfg, roots: [tmp], explicitRepos: [] })
    expect(repos.some(r => r.path === repo)).toBe(true)
  })

  it('finds repos at depth 2 (workspace pattern)', async () => {
    const repo = path.join(tmp, 'workspace', 'project-a')
    fs.mkdirSync(repo, { recursive: true })
    fs.writeFileSync(path.join(repo, 'CLAUDE.md'), '')
    const repos = await discoverRepos({ ...baseCfg, roots: [tmp], explicitRepos: [] })
    expect(repos.some(r => r.path === repo)).toBe(true)
  })

  it('respects discoveryDepth limit', async () => {
    const deep = path.join(tmp, 'a', 'b', 'c', 'd')
    fs.mkdirSync(deep, { recursive: true })
    fs.writeFileSync(path.join(deep, 'CLAUDE.md'), '')
    const repos = await discoverRepos({
      ...baseCfg,
      discoveryDepth: 2,
      roots: [tmp],
      explicitRepos: [],
    })
    expect(repos.find(r => r.path === deep)).toBeUndefined()
  })

  it('does not recurse into a discovered repo', async () => {
    const outer = path.join(tmp, 'outer')
    const inner = path.join(outer, 'sub')
    fs.mkdirSync(inner, { recursive: true })
    fs.writeFileSync(path.join(outer, 'CLAUDE.md'), '')
    fs.writeFileSync(path.join(inner, 'CLAUDE.md'), '')
    const repos = await discoverRepos({
      ...baseCfg,
      discoveryDepth: 5,
      roots: [tmp],
      explicitRepos: [],
    })
    expect(repos.find(r => r.path === inner)).toBeUndefined()
    expect(repos.find(r => r.path === outer)).toBeDefined()
  })

  it('skips node_modules + .git + other blocked dirs', async () => {
    for (const blocked of ['node_modules', '.git', 'dist', 'target']) {
      const dir = path.join(tmp, blocked, 'inside')
      fs.mkdirSync(dir, { recursive: true })
      fs.writeFileSync(path.join(dir, 'CLAUDE.md'), '')
    }
    const repos = await discoverRepos({
      ...baseCfg,
      discoveryDepth: 5,
      roots: [tmp],
      explicitRepos: [],
    })
    expect(repos).toHaveLength(0)
  })

  it('dedupes between root and explicit', async () => {
    const repo = path.join(tmp, 'r')
    fs.mkdirSync(repo)
    fs.writeFileSync(path.join(repo, 'CLAUDE.md'), '')
    const repos = await discoverRepos({
      ...baseCfg,
      roots: [tmp],
      explicitRepos: [repo],
    })
    expect(repos.filter(r => r.path === repo)).toHaveLength(1)
  })

  it('includes explicit repos that lack markers', async () => {
    const explicit = path.join(tmp, 'explicit')
    fs.mkdirSync(explicit)
    const repos = await discoverRepos({
      ...baseCfg,
      roots: [],
      explicitRepos: [explicit],
    })
    expect(repos.some(r => r.path === explicit && r.source === 'manual')).toBe(true)
  })

  it('tolerates non-existent roots', async () => {
    const repos = await discoverRepos({
      ...baseCfg,
      roots: ['/does/not/exist'],
      explicitRepos: [],
    })
    expect(repos).toEqual([])
  })
})
