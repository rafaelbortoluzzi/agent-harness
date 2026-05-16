import { createHash } from 'crypto'

export type Runtime = 'claude' | 'codex' | 'generic'
export type Scope = 'personal' | 'repo' | 'workspace'
export type ItemType =
  | 'skill'
  | 'agent'
  | 'rule'
  | 'hook'
  | 'mcp'
  | 'instruction'
  | 'plugin'
  | 'command'
export type Health = 'ok' | 'warning' | 'broken'

export interface RegistryItem {
  id: string
  runtime: Runtime
  scope: Scope
  type: ItemType
  name: string
  path: string
  repoPath: string | null
  health: Health
  issues: string[]
  metadata: Record<string, unknown>
  scannedAt: string
}

export interface ValidationResult {
  health: Health
  issues: string[]
}

export interface RuntimeAdapter {
  id: Runtime
  producedTypes: ItemType[]
  scanPersonal(): Promise<RegistryItem[]>
  scanRepo(repoPath: string): Promise<RegistryItem[]>
  validate(item: RegistryItem): ValidationResult
}

export function makeId(...parts: string[]): string {
  return createHash('sha256').update(parts.join('|')).digest('hex')
}
