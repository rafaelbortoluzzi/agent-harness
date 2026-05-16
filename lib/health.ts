import type { RegistryItem } from '@/lib/scanner/adapters/base'
import { getEffectiveWeights } from '@/lib/config'

export function computeHealthScore(items: RegistryItem[]): number {
  const w = getEffectiveWeights()
  let score = 100

  if (!items.some(i => i.type === 'instruction')) score -= w.missingInstruction
  if (!items.some(i => i.type === 'skill')) score -= w.missingSkills
  if (!items.some(i => i.type === 'hook')) score -= w.missingHooks
  score -= items.filter(i => i.health === 'broken').length * w.perBrokenItem
  score -= items.filter(i => i.health === 'warning').length * w.perWarning

  return Math.max(0, Math.min(100, score))
}
