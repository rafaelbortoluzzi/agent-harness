import fs from 'fs'
import os from 'os'
import path from 'path'
import { ClaudeAdapter } from '@/lib/scanner/adapters/claude'

describe('ClaudeAdapter', () => {
  let tmp: string
  let adapter: ClaudeAdapter

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cla-'))
    adapter = new ClaudeAdapter({ personalDir: tmp })
  })

  afterEach(() => fs.rmSync(tmp, { recursive: true, force: true }))

  it('scans skill directory (Anthropic spec layout)', async () => {
    const skillDir = path.join(tmp, 'skills', 'my-skill')
    fs.mkdirSync(skillDir, { recursive: true })
    fs.writeFileSync(
      path.join(skillDir, 'SKILL.md'),
      '---\nname: my-skill\ndescription: test\nallowed-tools:\n  - Read\n  - Edit\n---\nBody',
    )
    const items = await adapter.scanPersonal()
    const skill = items.find(i => i.type === 'skill' && i.name === 'my-skill')
    expect(skill).toBeDefined()
    expect(skill!.metadata).toMatchObject({ description: 'test' })
    expect(Array.isArray((skill!.metadata as { 'allowed-tools'?: unknown[] })['allowed-tools'])).toBe(true)
  })

  it('skips skill dir without SKILL.md', async () => {
    fs.mkdirSync(path.join(tmp, 'skills', 'empty-skill'), { recursive: true })
    const items = await adapter.scanPersonal()
    expect(items.find(i => i.name === 'empty-skill')).toBeUndefined()
  })

  it('merges hooks from settings.json and settings.local.json', async () => {
    fs.writeFileSync(
      path.join(tmp, 'settings.json'),
      JSON.stringify({ hooks: { SessionStart: [{ hooks: [{ type: 'command', command: 'a' }] }] } }),
    )
    fs.writeFileSync(
      path.join(tmp, 'settings.local.json'),
      JSON.stringify({ hooks: { Stop: [{ hooks: [{ type: 'command', command: 'b' }] }] } }),
    )
    const items = await adapter.scanPersonal()
    const hooks = items.filter(i => i.type === 'hook').map(i => i.name)
    expect(hooks).toEqual(expect.arrayContaining(['SessionStart', 'Stop']))
  })

  it('scans plugin directories with manifest', async () => {
    const pluginDir = path.join(tmp, 'plugins', 'my-plugin')
    fs.mkdirSync(pluginDir, { recursive: true })
    fs.writeFileSync(
      path.join(pluginDir, 'manifest.json'),
      JSON.stringify({ name: 'my-plugin', version: '1.0.0' }),
    )
    const items = await adapter.scanPersonal()
    expect(items.some(i => i.type === 'plugin' && i.name === 'my-plugin')).toBe(true)
  })

  it('scans installed marketplace plugins by skill package', async () => {
    const marketplacePluginDir = path.join(tmp, 'plugins', 'marketplaces', 'caveman')
    fs.mkdirSync(marketplacePluginDir, { recursive: true })
    fs.writeFileSync(path.join(marketplacePluginDir, 'caveman.skill'), 'zip-bytes')

    const items = await adapter.scanPersonal()

    expect(items.some(i => i.type === 'plugin' && i.name === 'caveman')).toBe(true)
    expect(items.some(i => i.type === 'plugin' && i.name === 'marketplaces')).toBe(false)
  })

  it('scans commands directory', async () => {
    const cmdDir = path.join(tmp, 'commands')
    fs.mkdirSync(cmdDir, { recursive: true })
    fs.writeFileSync(path.join(cmdDir, 'review.md'), '# Review')
    const items = await adapter.scanPersonal()
    expect(items.some(i => i.type === 'command' && i.name === 'review')).toBe(true)
  })

  it('scans repo .claude/settings.json hooks', async () => {
    const repo = path.join(tmp, 'repo')
    fs.mkdirSync(path.join(repo, '.claude'), { recursive: true })
    fs.writeFileSync(
      path.join(repo, '.claude', 'settings.json'),
      JSON.stringify({ hooks: { PreToolUse: [{ hooks: [] }] } }),
    )
    const items = await adapter.scanRepo(repo)
    expect(items.some(i => i.type === 'hook' && i.scope === 'repo' && i.name === 'PreToolUse')).toBe(true)
  })

  it('scans repo .mcp.json', async () => {
    const repo = path.join(tmp, 'repo')
    fs.mkdirSync(repo)
    fs.writeFileSync(
      path.join(repo, '.mcp.json'),
      JSON.stringify({ mcpServers: { playwright: { command: 'npx' } } }),
    )
    const items = await adapter.scanRepo(repo)
    expect(items.some(i => i.type === 'mcp' && i.name === 'playwright' && i.scope === 'repo')).toBe(true)
  })

  it('scans repo CLAUDE.md', async () => {
    const repo = path.join(tmp, 'repo')
    fs.mkdirSync(repo)
    fs.writeFileSync(path.join(repo, 'CLAUDE.md'), '# Rules')
    const items = await adapter.scanRepo(repo)
    expect(items.some(i => i.type === 'instruction' && i.name === 'CLAUDE.md')).toBe(true)
  })

  it('validate flags missing path as broken', () => {
    const result = adapter.validate({
      id: 'x',
      runtime: 'claude',
      scope: 'personal',
      type: 'skill',
      name: 'gone',
      path: '/nope/missing',
      repoPath: null,
      health: 'ok',
      issues: [],
      metadata: {},
      scannedAt: new Date().toISOString(),
    })
    expect(result.health).toBe('broken')
  })

  it('validate skips path check for hook type', () => {
    const result = adapter.validate({
      id: 'x',
      runtime: 'claude',
      scope: 'personal',
      type: 'hook',
      name: 'SessionStart',
      path: '/nonexistent',
      repoPath: null,
      health: 'ok',
      issues: [],
      metadata: {},
      scannedAt: new Date().toISOString(),
    })
    expect(result.health).toBe('ok')
  })
})
