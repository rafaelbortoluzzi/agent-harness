import Anthropic from '@anthropic-ai/sdk'

export const MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6'

let _client: Anthropic | null = null

export function hasApiKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY)
}

export function getClient(): Anthropic {
  if (_client) return _client
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not set')
  }
  _client = new Anthropic()
  return _client
}

export function resetClientForTests(): void {
  _client = null
}
