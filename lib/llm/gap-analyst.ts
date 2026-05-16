import { createHash } from 'crypto'
import { getClient, MODEL } from './client'
import { clearRecommendations, upsertRecommendation } from '@/lib/registry/queries'
import type { RegistryItem } from '@/lib/scanner/adapters/base'

const SYSTEM = `You are an AI agent ecosystem analyst.

Given the current set of skills/agents/rules/commands in a repo, identify GAPS — concrete skills or agents that would meaningfully improve the agent's effectiveness on this codebase but are missing today.

Rules:
- Only suggest items that DON'T already exist (compare names + descriptions)
- Suggestions must be specific, not generic ("git workflow assistant" is bad, "release-tag-generator that bumps version and writes CHANGELOG.md" is good)
- Up to 5 recommendations
- Each recommendation: kind (skill|agent|hook), name (kebab-case), rationale (one sentence on why it would help THIS repo)

Respond with ONLY a JSON array:
[{"kind": "skill", "name": "release-tag-generator", "rationale": "..."}]

No prose, no markdown. Empty array [] if nothing useful is missing.`

interface Recommendation {
  kind: 'skill' | 'agent' | 'hook'
  name: string
  rationale: string
}

function summarizeItems(items: RegistryItem[]): string {
  return items
    .filter(i => ['skill', 'agent', 'rule', 'command'].includes(i.type))
    .map(i => {
      const desc = (i.metadata as { description?: string }).description ?? ''
      return `- [${i.type}] ${i.name}${desc ? `: ${desc.slice(0, 100)}` : ''}`
    })
    .join('\n')
    .slice(0, 6000)
}

export function parseRecommendations(text: string): Recommendation[] {
  const cleaned = text.replace(/```(?:json)?/g, '').trim()
  const match = cleaned.match(/\[[\s\S]*\]/)
  if (!match) return []
  try {
    const parsed = JSON.parse(match[0])
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((r): r is Recommendation =>
        r &&
        ['skill', 'agent', 'hook'].includes(r.kind) &&
        typeof r.name === 'string' &&
        typeof r.rationale === 'string',
      )
      .slice(0, 5)
      .map(r => ({ kind: r.kind, name: r.name, rationale: r.rationale.slice(0, 500) }))
  } catch {
    return []
  }
}

export async function analyzeRepo(repoPath: string, items: RegistryItem[]): Promise<Recommendation[]> {
  const client = getClient()
  const inventory = summarizeItems(items)
  const userPrompt = `Repo: ${repoPath}\n\nCurrent inventory:\n${inventory || '(empty)'}\n\nWhat's missing?`

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: userPrompt }],
  })

  const text = response.content
    .map(c => (c.type === 'text' ? c.text : ''))
    .join('')
    .trim()
  return parseRecommendations(text)
}

export async function analyzeAndPersist(
  repoPath: string,
  items: RegistryItem[],
): Promise<number> {
  const recs = await analyzeRepo(repoPath, items)
  clearRecommendations(repoPath)
  for (const r of recs) {
    const id = createHash('sha256').update(`${repoPath}|${r.kind}|${r.name}`).digest('hex').slice(0, 16)
    upsertRecommendation({ id, repoPath, kind: r.kind, name: r.name, rationale: r.rationale })
  }
  return recs.length
}
