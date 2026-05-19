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

const OPENAI_SKILL_CREATOR_SYSTEM = `You are reviewing an AI skill against OpenAI-style Codex skill authoring guidance.

Score the asset 0-10 on these criteria, equally weighted:
- Trigger metadata: does the name and description clearly tell Codex when to use the skill?
- progressive disclosure: is SKILL.md concise, with heavy references, scripts, and assets split into bundled resources only when useful?
- Degrees of freedom: does it choose instructions, pseudocode, or scripts at the right level of specificity for the task risk?
- Validation integrity: does the skill avoid leaking intended answers into validation and include realistic usage checks where appropriate?

Respond with ONLY a JSON object of the form:
{"score": <0-10 integer>, "rationale": "<one short sentence>"}

No prose, no markdown, no code fences. Just the JSON object.`

const SUPERPOWERS_WRITING_SKILLS_SYSTEM = `You are reviewing a skill through the Superpowers writing-skills discipline: skill authoring is test-driven development for process documentation.

Score the asset 0-10 on these criteria, equally weighted:
- RED phase: does the skill require or preserve a failing pressure scenario before writing or changing guidance?
- GREEN phase: does the skill address the actual observed rationalizations with minimal, concrete instructions?
- REFACTOR phase: does it close loopholes, include red flags, and retest until agents comply?
- Discovery quality: does the description use concrete "Use when..." triggers without summarizing the workflow?

Respond with ONLY a JSON object of the form:
{"score": <0-10 integer>, "rationale": "<one short sentence>"}

No prose, no markdown, no code fences. Just the JSON object.`

const SUPERPOWERS_BRAINSTORMING_SYSTEM = `You are reviewing whether an AI-agent asset preserves design-before-implementation discipline.

Score the asset 0-10 on these criteria, equally weighted:
- design gate: does it prevent implementation before the user approves a concrete design?
- Question quality: does it drive one-question-at-a-time clarification instead of broad, vague interrogation?
- Alternatives: does it force 2-3 approaches with trade-offs before choosing an implementation path?
- Scope control: does it decompose oversized work and keep implementation units isolated and testable?

Respond with ONLY a JSON object of the form:
{"score": <0-10 integer>, "rationale": "<one short sentence>"}

No prose, no markdown, no code fences. Just the JSON object.`

const GRILL_WITH_DOCS_SYSTEM = `You are reviewing whether an AI-agent asset supports rigorous domain-language discovery with documentation.

Score the asset 0-10 on these criteria, equally weighted:
- glossary discipline: does it resolve fuzzy or conflicting domain terms into precise language?
- Code cross-checks: does it verify user claims against the code before accepting them?
- Documentation hygiene: does it capture only resolved domain terminology in CONTEXT.md, not implementation notes?
- ADR restraint: does it reserve ADRs for hard-to-reverse, surprising, trade-off decisions?

Respond with ONLY a JSON object of the form:
{"score": <0-10 integer>, "rationale": "<one short sentence>"}

No prose, no markdown, no code fences. Just the JSON object.`

const LLM_AS_JUDGE_SYSTEM = `You are evaluating whether a Codex or coding-agent asset is itself a good LLM-as-a-judge rubric.

Score the asset 0-10 using broad, low-precision judgment bands mapped to the final integer:
- 0-2: unusable or missing a concrete evaluation target.
- 3-5: has criteria, but they are vague, overlapping, or hard to apply consistently.
- 6-8: has clear criteria, required inputs, and useful rationale requirements.
- 9-10: adds hard gates, calibration guidance, and output constraints that make repeated judgments stable.

Judge these criteria:
- Rubric clarity: are criteria atomic, observable, and non-overlapping?
- Input discipline: does it state what context, references, examples, or asset body the judge must inspect?
- Reliability controls: does it use hard gates for deterministic failures and avoid fragile fine-grained scoring?
- Output contract: does it require a parseable JSON object with a short rationale suitable for run history?

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
  {
    id: 'openai-skill-creator',
    label: 'OpenAI Skill Creator',
    description: 'OpenAI Codex skill structure, metadata, progressive disclosure, and validation fit.',
  },
  {
    id: 'superpowers-writing-skills',
    label: 'Writing Skills TDD',
    description: 'Superpowers skill-writing discipline: RED/GREEN/REFACTOR, loopholes, and discovery.',
  },
  {
    id: 'superpowers-brainstorming',
    label: 'Brainstorming Discipline',
    description: 'Design approval, one-question clarification, alternatives, and scope control.',
  },
  {
    id: 'grill-with-docs',
    label: 'Grill With Docs',
    description: 'Domain glossary precision, code cross-checks, CONTEXT.md hygiene, and ADR restraint.',
  },
  {
    id: 'llm-as-judge',
    label: 'LLM-as-Judge',
    description: 'Rubric quality for Codex judges: criteria, hard gates, calibration, and JSON output.',
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
  switch (presetId) {
    case 'personal-fit':
      return PERSONAL_FIT_SYSTEM
    case 'openai-skill-creator':
      return OPENAI_SKILL_CREATOR_SYSTEM
    case 'superpowers-writing-skills':
      return SUPERPOWERS_WRITING_SKILLS_SYSTEM
    case 'superpowers-brainstorming':
      return SUPERPOWERS_BRAINSTORMING_SYSTEM
    case 'grill-with-docs':
      return GRILL_WITH_DOCS_SYSTEM
    case 'llm-as-judge':
      return LLM_AS_JUDGE_SYSTEM
    default:
      return SKILL_QUALITY_SYSTEM
  }
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
