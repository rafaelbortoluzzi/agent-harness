import fs from 'fs'
import { getClient, MODEL } from './client'
import type { RegistryItem } from '@/lib/scanner/adapters/base'

export interface Verdict {
  score: number
  rationale: string
}

const SYSTEM = `You are reviewing AI agent assets (skills, agents, rules, commands) used inside coding-agent environments like Claude Code or Codex.

Score the asset 0-10 on these criteria, equally weighted:
- Clarity: would a future agent understand when to invoke it?
- Specificity: does the description/body avoid generic boilerplate?
- Actionability: does it tell the agent what to DO, not just what exists?
- Triggering: are "use when" conditions concrete (symptoms, file types, situations)?

Respond with ONLY a JSON object of the form:
{"score": <0-10 integer>, "rationale": "<one short sentence>"}

No prose, no markdown, no code fences. Just the JSON object.`

function buildUserPrompt(item: RegistryItem, body: string): string {
  return `Asset type: ${item.type}
Runtime: ${item.runtime}
Name: ${item.name}
Path: ${item.path}
Metadata: ${JSON.stringify(item.metadata)}

---BEGIN BODY---
${body.slice(0, 8000)}
---END BODY---`
}

function readBody(item: RegistryItem): string {
  if (!fs.existsSync(item.path)) return ''
  try {
    const stat = fs.statSync(item.path)
    if (stat.isDirectory()) return ''
    return fs.readFileSync(item.path, 'utf8')
  } catch {
    return ''
  }
}

export async function judgeItem(item: RegistryItem): Promise<Verdict> {
  if (!['skill', 'agent', 'rule', 'command', 'instruction'].includes(item.type)) {
    return { score: 0, rationale: 'Item type not eligible for judging' }
  }
  const body = readBody(item)
  if (!body) return { score: 0, rationale: 'Empty or unreadable body' }

  const client = getClient()
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 256,
    system: [
      { type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } },
    ],
    messages: [{ role: 'user', content: buildUserPrompt(item, body) }],
  })

  const text = response.content
    .map(c => (c.type === 'text' ? c.text : ''))
    .join('')
    .trim()

  return parseVerdict(text)
}

export function parseVerdict(text: string): Verdict {
  const cleaned = text.replace(/```(?:json)?/g, '').trim()
  const match = cleaned.match(/\{[\s\S]*?\}/)
  if (!match) return { score: 0, rationale: `Unparseable LLM response: ${text.slice(0, 120)}` }
  try {
    const parsed = JSON.parse(match[0]) as Partial<Verdict>
    const score = Math.max(0, Math.min(10, Math.round(Number(parsed.score))))
    const rationale = (parsed.rationale ?? '').toString().slice(0, 500)
    if (!Number.isFinite(score) || !rationale) {
      return { score: 0, rationale: `Malformed verdict: ${text.slice(0, 120)}` }
    }
    return { score, rationale }
  } catch {
    return { score: 0, rationale: `JSON parse failed: ${text.slice(0, 120)}` }
  }
}
