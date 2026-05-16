import fs from 'fs'
import os from 'os'
import path from 'path'
import { DEFAULT_HEALTH_WEIGHTS, type HealthWeights } from './health-weights'

export interface HarnessConfig {
  roots: string[]
  explicitRepos: string[]
  discoveryDepth: number
  respectGitignore: boolean
  healthWeights: Partial<HealthWeights>
}

const DEFAULT: HarnessConfig = {
  roots: [],
  explicitRepos: [],
  discoveryDepth: 2,
  respectGitignore: true,
  healthWeights: {},
}

export const CONFIG_DIR = (): string =>
  process.env.AGENT_HARNESS_DIR ?? path.join(os.homedir(), '.agent-harness')

const configPath = (): string => path.join(CONFIG_DIR(), 'config.json')

export function getConfig(): HarnessConfig {
  fs.mkdirSync(CONFIG_DIR(), { recursive: true })
  if (!fs.existsSync(configPath())) return { ...DEFAULT }
  const raw = fs.readFileSync(configPath(), 'utf8')
  try {
    return { ...DEFAULT, ...JSON.parse(raw) }
  } catch (err) {
    throw new Error(`Failed to parse ${configPath()}: ${(err as Error).message}`)
  }
}

export function setConfig(config: HarnessConfig): void {
  fs.mkdirSync(CONFIG_DIR(), { recursive: true })
  fs.writeFileSync(configPath(), JSON.stringify(config, null, 2))
}

export function getEffectiveWeights(): HealthWeights {
  return { ...DEFAULT_HEALTH_WEIGHTS, ...getConfig().healthWeights }
}
