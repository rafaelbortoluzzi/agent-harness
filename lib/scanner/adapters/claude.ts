import fs from 'fs'
import os from 'os'
import path from 'path'
import matter from 'gray-matter'
import {
  makeId,
  type ItemType,
  type RegistryItem,
  type RuntimeAdapter,
  type Scope,
  type ValidationResult,
} from './base'

interface ClaudeAdapterOptions {
  personalDir?: string
}

function now(): string {
  return new Date().toISOString()
}

function readFrontmatter(filePath: string): Record<string, unknown> {
  try {
    const raw = fs.readFileSync(filePath, 'utf8')
    return matter(raw).data as Record<string, unknown>
  } catch {
    return {}
  }
}

function readJsonSafe(filePath: string): Record<string, unknown> | null {
  if (!fs.existsSync(filePath)) return null
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch {
    return null
  }
}

function scanSkillDir(dirPath: string, scope: Scope, repoPath: string | null): RegistryItem[] {
  if (!fs.existsSync(dirPath)) return []
  const out: RegistryItem[] = []
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) continue
    const skillPath = path.join(dirPath, entry.name, 'SKILL.md')
    if (!fs.existsSync(skillPath)) continue
    const meta = readFrontmatter(skillPath)
    out.push({
      id: makeId('claude', scope, 'skill', skillPath),
      runtime: 'claude',
      scope,
      type: 'skill',
      name: (meta.name as string) ?? entry.name,
      path: skillPath,
      repoPath,
      health: 'ok',
      issues: [],
      metadata: meta,
      scannedAt: now(),
    })
  }
  return out
}

function scanFileDir(
  dirPath: string,
  type: ItemType,
  scope: Scope,
  repoPath: string | null,
): RegistryItem[] {
  if (!fs.existsSync(dirPath)) return []
  const out: RegistryItem[] = []
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    if (!entry.isFile()) continue
    if (!entry.name.endsWith('.md') && !entry.name.endsWith('.json')) continue
    const filePath = path.join(dirPath, entry.name)
    const meta = entry.name.endsWith('.md') ? readFrontmatter(filePath) : {}
    out.push({
      id: makeId('claude', scope, type, filePath),
      runtime: 'claude',
      scope,
      type,
      name: (meta.name as string) ?? path.parse(entry.name).name,
      path: filePath,
      repoPath,
      health: 'ok',
      issues: [],
      metadata: meta,
      scannedAt: now(),
    })
  }
  return out
}

function hooksFromSettings(
  settingsPath: string,
  settings: Record<string, unknown>,
  scope: Scope,
  repoPath: string | null,
): RegistryItem[] {
  const hooks = (settings.hooks ?? {}) as Record<string, unknown[]>
  return Object.keys(hooks).map(name => ({
    id: makeId('claude', scope, 'hook', settingsPath, name),
    runtime: 'claude' as const,
    scope,
    type: 'hook' as const,
    name,
    path: settingsPath,
    repoPath,
    health: 'ok' as const,
    issues: [],
    metadata: { entries: Array.isArray(hooks[name]) ? hooks[name].length : 0 },
    scannedAt: now(),
  }))
}

function mcpsFromSettings(
  settingsPath: string,
  settings: Record<string, unknown>,
  scope: Scope,
  repoPath: string | null,
): RegistryItem[] {
  const servers = (settings.mcpServers ?? {}) as Record<string, Record<string, unknown>>
  return Object.keys(servers).map(name => ({
    id: makeId('claude', scope, 'mcp', settingsPath, name),
    runtime: 'claude' as const,
    scope,
    type: 'mcp' as const,
    name,
    path: settingsPath,
    repoPath,
    health: 'ok' as const,
    issues: [],
    metadata: servers[name],
    scannedAt: now(),
  }))
}

function pluginItem(pluginPath: string, fallbackName: string): RegistryItem {
  const manifest =
    readJsonSafe(path.join(pluginPath, 'manifest.json')) ??
    readJsonSafe(path.join(pluginPath, 'plugin.json')) ??
    {}
  const packageFile = fs.existsSync(path.join(pluginPath, `${fallbackName}.skill`))
    ? `${fallbackName}.skill`
    : null

  return {
    id: makeId('claude', 'personal', 'plugin', pluginPath),
    runtime: 'claude',
    scope: 'personal',
    type: 'plugin',
    name: (manifest.name as string) ?? fallbackName,
    path: pluginPath,
    repoPath: null,
    health: 'ok',
    issues: [],
    metadata: packageFile ? { ...manifest, packageFile } : manifest,
    scannedAt: now(),
  }
}

function isPluginDir(pluginPath: string, name: string): boolean {
  return (
    fs.existsSync(path.join(pluginPath, 'manifest.json')) ||
    fs.existsSync(path.join(pluginPath, 'plugin.json')) ||
    fs.existsSync(path.join(pluginPath, `${name}.skill`))
  )
}

function scanPluginDir(pluginsDir: string): RegistryItem[] {
  if (!fs.existsSync(pluginsDir)) return []

  const out: RegistryItem[] = []
  const seen = new Set<string>()

  const addPlugin = (pluginPath: string, name: string) => {
    if (seen.has(pluginPath) || !isPluginDir(pluginPath, name)) return
    seen.add(pluginPath)
    out.push(pluginItem(pluginPath, name))
  }

  for (const entry of fs.readdirSync(pluginsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const pluginPath = path.join(pluginsDir, entry.name)
    addPlugin(pluginPath, entry.name)
  }

  const marketplaceDir = path.join(pluginsDir, 'marketplaces')
  if (fs.existsSync(marketplaceDir)) {
    for (const entry of fs.readdirSync(marketplaceDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue
      addPlugin(path.join(marketplaceDir, entry.name), entry.name)
    }
  }

  return out
}

export class ClaudeAdapter implements RuntimeAdapter {
  id = 'claude' as const
  producedTypes: ItemType[] = [
    'skill',
    'agent',
    'rule',
    'hook',
    'mcp',
    'instruction',
    'plugin',
    'command',
  ]
  private personalDir: string

  constructor(opts: ClaudeAdapterOptions = {}) {
    this.personalDir = opts.personalDir ?? path.join(os.homedir(), '.claude')
  }

  async scanPersonal(): Promise<RegistryItem[]> {
    const out: RegistryItem[] = []
    out.push(...scanSkillDir(path.join(this.personalDir, 'skills'), 'personal', null))
    out.push(...scanFileDir(path.join(this.personalDir, 'agents'), 'agent', 'personal', null))
    out.push(...scanFileDir(path.join(this.personalDir, 'rules'), 'rule', 'personal', null))
    out.push(...scanFileDir(path.join(this.personalDir, 'commands'), 'command', 'personal', null))

    for (const fname of ['settings.json', 'settings.local.json']) {
      const p = path.join(this.personalDir, fname)
      const obj = readJsonSafe(p)
      if (obj) {
        out.push(...hooksFromSettings(p, obj, 'personal', null))
        out.push(...mcpsFromSettings(p, obj, 'personal', null))
      }
    }

    out.push(...scanPluginDir(path.join(this.personalDir, 'plugins')))

    return out
  }

  async scanRepo(repoPath: string): Promise<RegistryItem[]> {
    const out: RegistryItem[] = []
    const claudeDir = path.join(repoPath, '.claude')

    out.push(...scanSkillDir(path.join(claudeDir, 'skills'), 'repo', repoPath))
    out.push(...scanFileDir(path.join(claudeDir, 'agents'), 'agent', 'repo', repoPath))
    out.push(...scanFileDir(path.join(claudeDir, 'rules'), 'rule', 'repo', repoPath))
    out.push(...scanFileDir(path.join(claudeDir, 'commands'), 'command', 'repo', repoPath))

    const settingsPath = path.join(claudeDir, 'settings.json')
    const settings = readJsonSafe(settingsPath)
    if (settings) {
      out.push(...hooksFromSettings(settingsPath, settings, 'repo', repoPath))
      out.push(...mcpsFromSettings(settingsPath, settings, 'repo', repoPath))
    }

    const claudeMd = path.join(repoPath, 'CLAUDE.md')
    if (fs.existsSync(claudeMd)) {
      out.push({
        id: makeId('claude', 'repo', 'instruction', claudeMd),
        runtime: 'claude',
        scope: 'repo',
        type: 'instruction',
        name: 'CLAUDE.md',
        path: claudeMd,
        repoPath,
        health: 'ok',
        issues: [],
        metadata: {},
        scannedAt: now(),
      })
    }

    const mcpPath = path.join(repoPath, '.mcp.json')
    const mcpObj = readJsonSafe(mcpPath)
    if (mcpObj) out.push(...mcpsFromSettings(mcpPath, mcpObj, 'repo', repoPath))

    return out
  }

  validate(item: RegistryItem): ValidationResult {
    if (item.type === 'hook') return { health: 'ok', issues: [] }
    if (fs.existsSync(item.path)) return { health: 'ok', issues: [] }
    return { health: 'broken', issues: [`Path not found: ${item.path}`] }
  }
}
