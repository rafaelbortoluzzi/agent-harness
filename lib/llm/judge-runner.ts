import { getUnjudgedItems, setVerdict } from '@/lib/registry/queries'
import { judgeItem } from './judge'
import type { Runtime } from '@/lib/scanner/adapters/base'

export interface JudgeOptions {
  runtime?: Runtime
  limit?: number
  concurrency?: number
  onProgress?: (n: number, total: number, name: string) => void
}

const ELIGIBLE_TYPES = ['skill', 'agent', 'rule', 'command', 'instruction']

export async function judgeUnjudged(options: JudgeOptions = {}): Promise<{ judged: number; failed: number }> {
  let items = getUnjudgedItems(ELIGIBLE_TYPES, options.limit)
  if (options.runtime) items = items.filter(i => i.runtime === options.runtime)

  const concurrency = options.concurrency ?? 4
  let judged = 0
  let failed = 0
  let index = 0
  const total = items.length

  async function worker(): Promise<void> {
    while (index < items.length) {
      const item = items[index++]
      try {
        const verdict = await judgeItem(item)
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
