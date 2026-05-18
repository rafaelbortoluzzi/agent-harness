import { spawn, spawnSync } from 'child_process'
import { getConfig } from '@/lib/config'
import { getClient, MODEL, resetClientForTests } from './client'

export type LlmProviderName = 'anthropic-api' | 'openai-api' | 'claude-code-cli' | 'codex-cli'

export interface LlmProviderStatus {
  id: LlmProviderName
  displayName: string
  kind: 'CLI' | 'API'
  selected: boolean
  available: boolean
  reason: string
}

export interface LlmProviderTestResult {
  ok: boolean
  provider: LlmProviderName
  output?: string
  error?: string
}

export interface CompleteLlmTextOptions {
  system: string
  prompt: string
  maxTokens?: number
}

const PROVIDERS = new Set<LlmProviderName>([
  'anthropic-api',
  'openai-api',
  'claude-code-cli',
  'codex-cli',
])
const DEFAULT_PROVIDER: LlmProviderName = 'anthropic-api'
const CLI_TIMEOUT_MS = 120_000
const PROVIDER_META: Record<LlmProviderName, Omit<LlmProviderStatus, 'selected' | 'available' | 'reason'>> = {
  'anthropic-api': { id: 'anthropic-api', displayName: 'Claude API', kind: 'API' },
  'openai-api': { id: 'openai-api', displayName: 'Codex/OpenAI API', kind: 'API' },
  'claude-code-cli': { id: 'claude-code-cli', displayName: 'Claude Code CLI', kind: 'CLI' },
  'codex-cli': { id: 'codex-cli', displayName: 'Codex CLI', kind: 'CLI' },
}

export function isLlmProviderName(value: unknown): value is LlmProviderName {
  return typeof value === 'string' && PROVIDERS.has(value as LlmProviderName)
}

export function getLlmProviderName(): LlmProviderName {
  const configured = getConfig().llmProvider
  if (isLlmProviderName(configured)) return configured
  const raw = process.env.AGENT_HARNESS_LLM_PROVIDER
  if (isLlmProviderName(raw)) return raw
  return DEFAULT_PROVIDER
}

export function hasLlmProvider(): boolean {
  const provider = getLlmProviderName()
  return getProviderAvailability(provider).available
}

export function getLlmProviderStatuses(): LlmProviderStatus[] {
  const selected = getLlmProviderName()
  return Array.from(PROVIDERS).map(provider => ({
    ...PROVIDER_META[provider],
    selected: provider === selected,
    ...getProviderAvailability(provider),
  }))
}

function getProviderAvailability(provider: LlmProviderName): Pick<LlmProviderStatus, 'available' | 'reason'> {
  if (provider === 'anthropic-api') {
    return process.env.ANTHROPIC_API_KEY
      ? { available: true, reason: 'ANTHROPIC_API_KEY set' }
      : { available: false, reason: 'ANTHROPIC_API_KEY missing' }
  }
  if (provider === 'openai-api') {
    return process.env.OPENAI_API_KEY
      ? { available: true, reason: 'OPENAI_API_KEY set' }
      : { available: false, reason: 'OPENAI_API_KEY missing' }
  }
  const command = provider === 'codex-cli' ? 'codex' : 'claude'
  const lookup = process.platform === 'win32' ? 'where' : 'which'
  const result = spawnSync(lookup, [command], { stdio: 'ignore' })
  return result.status === 0
    ? { available: true, reason: `${command} command found` }
    : { available: false, reason: `${command} command not found` }
}

export function buildLlmPrompt(system: string, prompt: string): string {
  return `${system.trim()}

${prompt.trim()}`.trim()
}

export async function completeLlmText(options: CompleteLlmTextOptions): Promise<string> {
  const provider = getLlmProviderName()
  return completeLlmTextWithProvider(provider, options)
}

async function completeLlmTextWithProvider(
  provider: LlmProviderName,
  options: CompleteLlmTextOptions,
): Promise<string> {
  if (provider === 'anthropic-api') return completeAnthropic(options)
  if (provider === 'openai-api') return completeOpenAi(options)
  if (provider === 'claude-code-cli') return completeClaudeCodeCli(options)
  return completeCodexCli(options)
}

async function completeAnthropic(options: CompleteLlmTextOptions): Promise<string> {
  const client = getClient()
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: options.maxTokens ?? 1024,
    system: [{ type: 'text', text: options.system, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: options.prompt }],
  })

  return response.content
    .map(c => (c.type === 'text' ? c.text : ''))
    .join('')
    .trim()
}

async function completeOpenAi(options: CompleteLlmTextOptions): Promise<string> {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not set')
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? 'gpt-5.2-codex',
      input: buildLlmPrompt(options.system, options.prompt),
      max_output_tokens: options.maxTokens ?? 1024,
    }),
  })

  const body = await response.json()
  if (!response.ok) {
    const message = body?.error?.message ?? response.statusText
    throw new Error(`openai-api failed: ${message}`)
  }
  if (typeof body.output_text === 'string') return body.output_text.trim()
  const text = body.output
    ?.flatMap((item: { content?: { text?: string }[] }) => item.content ?? [])
    .map((content: { text?: string }) => content.text ?? '')
    .join('')
    .trim()
  if (text) return text
  throw new Error('openai-api returned no text output')
}

async function completeClaudeCodeCli(options: CompleteLlmTextOptions): Promise<string> {
  return runCli(
    'claude',
    [
      '-p',
      '--output-format',
      'text',
      '--no-session-persistence',
      '--permission-mode',
      'dontAsk',
      '--append-system-prompt',
      options.system,
      options.prompt,
    ],
  )
}

async function completeCodexCli(options: CompleteLlmTextOptions): Promise<string> {
  return runCli(
    'codex',
    ['exec', '--sandbox', 'read-only', '--skip-git-repo-check', '--cd', process.cwd(), '-'],
    buildLlmPrompt(options.system, options.prompt),
  )
}

function runCli(command: string, args: string[], input?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env: process.env,
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    let stdout = ''
    let stderr = ''
    const timer = setTimeout(() => {
      child.kill()
      reject(new Error(`${command} timed out after ${CLI_TIMEOUT_MS}ms`))
    }, CLI_TIMEOUT_MS)

    child.stdout.on('data', chunk => {
      stdout += chunk.toString()
    })
    child.stderr.on('data', chunk => {
      stderr += chunk.toString()
    })
    child.on('error', err => {
      clearTimeout(timer)
      reject(err)
    })
    child.on('close', code => {
      clearTimeout(timer)
      if (code === 0) {
        resolve(stdout.trim())
        return
      }
      reject(new Error(`${command} failed with exit ${code}: ${stderr.trim() || stdout.trim()}`))
    })

    if (input) child.stdin.write(input)
    child.stdin.end()
  })
}

export function resetLlmProviderForTests(): void {
  resetClientForTests()
}

export async function testLlmProvider(provider?: LlmProviderName): Promise<LlmProviderTestResult> {
  const selected = provider ?? getLlmProviderName()
  try {
    const output = await completeLlmTextWithProvider(selected, {
      system: 'You are a connectivity smoke test.',
      prompt: 'Reply exactly: ok',
      maxTokens: 16,
    })
    return { ok: true, provider: selected, output }
  } catch (err) {
    return {
      ok: false,
      provider: selected,
      error: (err as Error).message,
    }
  }
}
