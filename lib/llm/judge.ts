import fs from 'fs'
import {
  completeLlmText,
  completeLlmTextWithProvider,
  type CompleteLlmTextOptions,
  type LlmProviderName,
} from './provider'
import type { RegistryItem } from '@/lib/scanner/adapters/base'

export interface Verdict {
  score: number
  rationale: string
}

const SKILL_QUALITY_SYSTEM = `You are reviewing AI agent assets (skills, agents, rules, commands) used inside coding-agent environments like Claude Code or Codex.

Score the asset 0-10 on these criteria, equally weighted:
- Clarity: would a future agent understand when to invoke it?
- Specificity: does the description/body avoid generic boilerplate?
- Actionability: does it tell the agent what to DO, not just what exists?
- Triggering: are "use when" conditions concrete (symptoms, file types, situations)?

Respond with ONLY a JSON object of the form:
{"score": <0-10 integer>, "rationale": "<one short sentence>"}

No prose, no markdown, no code fences. Just the JSON object.`

const PERSONAL_FIT_SYSTEM = `You are judging whether an AI agent asset fits a personal coding-agent harness.

Score the asset 0-10 on these criteria, equally weighted:
- personal workflow fit: does it support real repeated work for this user or repo?
- time or token savings: would it reduce repeated explanation, context loading, or manual steps?
- Invocation precision: is it clear when the agent should and should not use it?
- Harness leverage: does it improve repo-specific agent behavior more than a generic prompt would?

Respond with ONLY a JSON object of the form:
{"score": <0-10 integer>, "rationale": "<one short sentence>"}

No prose, no markdown, no code fences. Just the JSON object.`

export const JUDGE_PRESETS = [
  {
    id: 'skill-quality',
    label: 'Skill Quality',
    description: 'General clarity, specificity, actionability, and triggering quality.',
  },
  {
    id: 'personal-fit',
    label: 'Personal Fit',
    description: 'Usefulness for your personal workflow, repo harness, and token/time savings.',
  },
] as const

export type JudgePresetId = (typeof JUDGE_PRESETS)[number]['id']

export interface PromptOverride {
  system: string
  prompt: string
}

export interface JudgeRequestOptions {
  presetId?: string
  promptOverride?: PromptOverride
  personalContext?: string
}

function judgeSystemForPreset(presetId?: string): string {
  return presetId === 'personal-fit' ? PERSONAL_FIT_SYSTEM : SKILL_QUALITY_SYSTEM
}

export function buildJudgeUserPrompt(item: RegistryItem, body: string): string {
  return `Asset type: ${item.type}
Runtime: ${item.runtime}
Name: ${item.name}
Path: ${item.path}
Metadata: ${JSON.stringify(item.metadata)}

---BEGIN BODY---
${body.slice(0, 8000)}
---END BODY---`
}

export function buildJudgeRequest(
  item: RegistryItem,
  body: string,
  options: JudgeRequestOptions = {},
): CompleteLlmTextOptions {
  if (options.promptOverride?.system && options.promptOverride.prompt) {
    return {
      system: options.promptOverride.system,
      prompt: options.promptOverride.prompt,
      maxTokens: 256,
    }
  }
  const personal = options.personalContext?.trim()
  const prompt = buildJudgeUserPrompt(item, body)
  return {
    system: judgeSystemForPreset(options.presetId),
    prompt: personal
      ? `${prompt}

Personal harness preferences:
${personal}`
      : prompt,
    maxTokens: 256,
  }
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

export async function judgeItem(
  item: RegistryItem,
  provider?: LlmProviderName,
  options: JudgeRequestOptions = {},
): Promise<Verdict> {
  if (!['skill', 'agent', 'rule', 'command', 'instruction'].includes(item.type)) {
    return { score: 0, rationale: 'Item type not eligible for judging' }
  }
  const body = readBody(item)
  if (!body) return { score: 0, rationale: 'Empty or unreadable body' }

  const request = buildJudgeRequest(item, body, options)
  const text = provider
    ? await completeLlmTextWithProvider(provider, request)
    : await completeLlmText(request)

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
