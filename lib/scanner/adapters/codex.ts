import fs from 'fs'
import os from 'os'
import path from 'path'
import { parse as parseToml } from 'smol-toml'
import {
  makeId,
  type ItemType,
  type RegistryItem,
  type RuntimeAdapter,
  type ValidationResult,
} from './base'

interface CodexAdapterOptions {
  personalDir?: string
}

function now(): string {
  return new Date().toISOString()
}

export class CodexAdapter implements RuntimeAdapter {
  id = 'codex' as const
  producedTypes: ItemType[] = ['mcp', 'hook', 'instruction', 'command']
  private personalDir: string

  constructor(opts: CodexAdapterOptions = {}) {
    this.personalDir = opts.personalDir ?? path.join(os.homedir(), '.codex')
  }

  async scanPersonal(): Promise<RegistryItem[]> {
    const out: RegistryItem[] = []

    const tomlPath = path.join(this.personalDir, 'config.toml')
    if (fs.existsSync(tomlPath)) {
      try {
        const cfg = parseToml(fs.readFileSync(tomlPath, 'utf8')) as Record<string, unknown>
        const servers = (cfg.mcp_servers ?? {}) as Record<string, Record<string, unknown>>
        for (const [name, meta] of Object.entries(servers)) {
          out.push({
            id: makeId('codex', 'personal', 'mcp', name),
            runtime: 'codex',
            scope: 'personal',
            type: 'mcp',
            name,
            path: tomlPath,
            repoPath: null,
            health: 'ok',
            issues: [],
            metadata: meta,
            scannedAt: now(),
          })
        }
      } catch {
        // malformed toml — leave out; validator can flag at file level later
      }
    }

    const hooksPath = path.join(this.personalDir, 'hooks.json')
    if (fs.existsSync(hooksPath)) {
      try {
        const data = JSON.parse(fs.readFileSync(hooksPath, 'utf8')) as Record<string, unknown>
        const hooks = (data.hooks ?? {}) as Record<string, unknown>
        for (const name of Object.keys(hooks)) {
          out.push({
            id: makeId('codex', 'personal', 'hook', name),
            runtime: 'codex',
            scope: 'personal',
            type: 'hook',
            name,
            path: hooksPath,
            repoPath: null,
            health: 'ok',
            issues: [],
            metadata: {},
            scannedAt: now(),
          })
        }
      } catch {
        // malformed json
      }
    }

    const agentsPath = path.join(this.personalDir, 'AGENTS.md')
    if (fs.existsSync(agentsPath)) {
      out.push({
        id: makeId('codex', 'personal', 'instruction', agentsPath),
        runtime: 'codex',
        scope: 'personal',
        type: 'instruction',
        name: 'AGENTS.md',
        path: agentsPath,
        repoPath: null,
        health: 'ok',
        issues: [],
        metadata: {},
        scannedAt: now(),
      })
    }

    const promptsDir = path.join(this.personalDir, 'prompts')
    if (fs.existsSync(promptsDir)) {
      for (const entry of fs.readdirSync(promptsDir, { withFileTypes: true })) {
        if (!entry.isFile() || !entry.name.endsWith('.md')) continue
        const p = path.join(promptsDir, entry.name)
        out.push({
          id: makeId('codex', 'personal', 'command', p),
          runtime: 'codex',
          scope: 'personal',
          type: 'command',
          name: path.parse(entry.name).name,
          path: p,
          repoPath: null,
          health: 'ok',
          issues: [],
          metadata: {},
          scannedAt: now(),
        })
      }
    }

    return out
  }

  async scanRepo(repoPath: string): Promise<RegistryItem[]> {
    const out: RegistryItem[] = []
    const agentsPath = path.join(repoPath, 'AGENTS.md')
    if (fs.existsSync(agentsPath)) {
      out.push({
        id: makeId('codex', 'repo', 'instruction', agentsPath),
        runtime: 'codex',
        scope: 'repo',
        type: 'instruction',
        name: 'AGENTS.md',
        path: agentsPath,
        repoPath,
        health: 'ok',
        issues: [],
        metadata: {},
        scannedAt: now(),
      })
    }
    return out
  }

  validate(item: RegistryItem): ValidationResult {
    if (item.type === 'hook') return { health: 'ok', issues: [] }
    if (fs.existsSync(item.path)) return { health: 'ok', issues: [] }
    return { health: 'broken', issues: [`Path not found: ${item.path}`] }
  }
}
