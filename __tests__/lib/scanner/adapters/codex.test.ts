import fs from 'fs'
import os from 'os'
import path from 'path'
import { CodexAdapter } from '@/lib/scanner/adapters/codex'

describe('CodexAdapter', () => {
  let tmp: string
  let adapter: CodexAdapter

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cdx-'))
    adapter = new CodexAdapter({ personalDir: tmp })
  })

  afterEach(() => fs.rmSync(tmp, { recursive: true, force: true }))

  it('parses TOML mcp_servers with command + args', async () => {
    fs.writeFileSync(
      path.join(tmp, 'config.toml'),
      `[mcp_servers.playwright]
command = "npx"
args = ["-y", "@playwright/mcp@latest"]
`,
    )
    const items = await adapter.scanPersonal()
    const mcp = items.find(i => i.type === 'mcp' && i.name === 'playwright')
    expect(mcp).toBeDefined()
    expect(mcp!.metadata).toMatchObject({ command: 'npx' })
    expect((mcp!.metadata as { args?: string[] }).args).toEqual(['-y', '@playwright/mcp@latest'])
  })

  it('tolerates malformed TOML without crashing', async () => {
    fs.writeFileSync(path.join(tmp, 'config.toml'), 'this is = [not] valid toml = =')
    await expect(adapter.scanPersonal()).resolves.toBeInstanceOf(Array)
  })

  it('scans hooks.json', async () => {
    fs.writeFileSync(
      path.join(tmp, 'hooks.json'),
      JSON.stringify({ hooks: { SessionStart: [{ type: 'command', command: 'echo hi' }] } }),
    )
    const items = await adapter.scanPersonal()
    expect(items.some(i => i.type === 'hook' && i.name === 'SessionStart')).toBe(true)
  })

  it('scans personal AGENTS.md', async () => {
    fs.writeFileSync(path.join(tmp, 'AGENTS.md'), '# Personal')
    const items = await adapter.scanPersonal()
    expect(items.some(i => i.scope === 'personal' && i.type === 'instruction')).toBe(true)
  })

  it('scans prompts dir as commands', async () => {
    fs.mkdirSync(path.join(tmp, 'prompts'))
    fs.writeFileSync(path.join(tmp, 'prompts', 'review.md'), '# Review')
    const items = await adapter.scanPersonal()
    expect(items.some(i => i.type === 'command' && i.name === 'review')).toBe(true)
  })

  it('scans repo AGENTS.md', async () => {
    const repo = path.join(tmp, 'r')
    fs.mkdirSync(repo)
    fs.writeFileSync(path.join(repo, 'AGENTS.md'), '# Repo')
    const items = await adapter.scanRepo(repo)
    expect(items.some(i => i.scope === 'repo' && i.type === 'instruction')).toBe(true)
  })

  it('validate flags missing path as broken', () => {
    const result = adapter.validate({
      id: 'x',
      runtime: 'codex',
      scope: 'personal',
      type: 'mcp',
      name: 'gone',
      path: '/nope',
      repoPath: null,
      health: 'ok',
      issues: [],
      metadata: {},
      scannedAt: new Date().toISOString(),
    })
    expect(result.health).toBe('broken')
  })
})
