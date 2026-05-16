import fs from 'fs'
import path from 'path'
import type { HarnessConfig } from '@/lib/config'

export interface DiscoveredRepo {
  path: string
  source: 'config' | 'auto-discovered' | 'manual'
}

const MARKERS = ['CLAUDE.md', 'AGENTS.md', '.claude', '.codex']
const ALWAYS_SKIP = new Set([
  'node_modules',
  '.git',
  '.next',
  'dist',
  'build',
  'target',
  'vendor',
  '.venv',
  '__pycache__',
])

function isRepo(dirPath: string): boolean {
  return MARKERS.some(m => fs.existsSync(path.join(dirPath, m)))
}

function walk(
  root: string,
  maxDepth: number,
  currentDepth: number,
  out: DiscoveredRepo[],
): void {
  if (currentDepth > maxDepth) return

  if (currentDepth > 0 && isRepo(root)) {
    out.push({ path: root, source: 'auto-discovered' })
    return // do not recurse into a discovered repo
  }

  let entries: fs.Dirent[]
  try {
    entries = fs.readdirSync(root, { withFileTypes: true })
  } catch {
    return
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    if (entry.name.startsWith('.') || ALWAYS_SKIP.has(entry.name)) continue
    walk(path.join(root, entry.name), maxDepth, currentDepth + 1, out)
  }
}

export async function discoverRepos(
  config: Pick<HarnessConfig, 'roots' | 'explicitRepos' | 'discoveryDepth'>,
): Promise<DiscoveredRepo[]> {
  const seen = new Set<string>()
  const out: DiscoveredRepo[] = []

  for (const root of config.roots) {
    if (!fs.existsSync(root)) continue
    const found: DiscoveredRepo[] = []
    walk(root, config.discoveryDepth ?? 2, 0, found)
    for (const r of found) {
      if (!seen.has(r.path)) {
        seen.add(r.path)
        out.push(r)
      }
    }
  }

  for (const explicit of config.explicitRepos) {
    if (!seen.has(explicit)) {
      seen.add(explicit)
      out.push({ path: explicit, source: 'manual' })
    }
  }

  return out
}
