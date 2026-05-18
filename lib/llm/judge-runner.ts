import { getItemById, getUnjudgedItems, setVerdict } from '@/lib/registry/queries'
import { judgeItem } from './judge'
import type { Runtime } from '@/lib/scanner/adapters/base'
import type { LlmProviderName } from './provider'
import {
  itemMatchesActionTarget,
  type ActionTarget,
} from '@/lib/workspace/action-targets'

export interface JudgeOptions {
  runtime?: Runtime
  limit?: number
  concurrency?: number
  provider?: LlmProviderName
  target?: ActionTarget
  onProgress?: (n: number, total: number, name: string) => void
}

const ELIGIBLE_TYPES = ['skill', 'agent', 'rule', 'command', 'instruction']

export async function judgeUnjudged(options: JudgeOptions = {}): Promise<{ judged: number; failed: number }> {
  const target = options.target ?? { scope: 'all' }
  let items =
    target.scope === 'unit'
      ? [getItemById(target.itemId)].filter(item => item !== null)
      : getUnjudgedItems(ELIGIBLE_TYPES, options.limit)
  if (options.runtime) items = items.filter(i => i.runtime === options.runtime)
  items = items.filter(item => itemMatchesActionTarget(item, target))

  const concurrency = options.concurrency ?? 4
  let judged = 0
  let failed = 0
  let index = 0
  const total = items.length

  async function worker(): Promise<void> {
    while (index < items.length) {
      const item = items[index++]
      try {
        const verdict = await judgeItem(item, options.provider)
        setVerdict(item.id, verdict.score, verdict.rationale)
        judged++
      } catch (err) {
        setVerdict(item.id, 0, `judge error: ${(err as Error).message}`)
        failed++
      }
      options.onProgress?.(judged + failed, total, item.name)
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()))
  return { judged, failed }
}
