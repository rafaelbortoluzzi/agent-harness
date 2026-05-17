import { spawn } from 'child_process'
import { getClient, MODEL, hasApiKey, resetClientForTests } from './client'

export type LlmProviderName = 'anthropic-api' | 'claude-code-cli' | 'codex-cli'

export interface CompleteLlmTextOptions {
  system: string
  prompt: string
  maxTokens?: number
}

const PROVIDERS = new Set<LlmProviderName>(['anthropic-api', 'claude-code-cli', 'codex-cli'])
const DEFAULT_PROVIDER: LlmProviderName = 'anthropic-api'
const CLI_TIMEOUT_MS = 120_000

export function getLlmProviderName(): LlmProviderName {
  const raw = process.env.AGENT_HARNESS_LLM_PROVIDER
  if (!raw) return DEFAULT_PROVIDER
  if (PROVIDERS.has(raw as LlmProviderName)) return raw as LlmProviderName
  return DEFAULT_PROVIDER
}

export function hasLlmProvider(): boolean {
  const provider = getLlmProviderName()
  if (provider === 'anthropic-api') return hasApiKey()
  return true
}

export function buildLlmPrompt(system: string, prompt: string): string {
  return `${system.trim()}

${prompt.trim()}`.trim()
}

export async function completeLlmText(options: CompleteLlmTextOptions): Promise<string> {
  const provider = getLlmProviderName()
  if (provider === 'anthropic-api') return completeAnthropic(options)
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
