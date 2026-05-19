import { NextRequest } from 'next/server'
import { GET, PATCH } from '@/app/api/config/route'
import { getConfig } from '@/lib/config'

jest.mock('@/lib/llm/provider', () => ({
  getLlmProviderName: jest.fn(() => 'codex-cli'),
  getLlmProviderStatuses: jest.fn(() => [
    {
      id: 'codex-cli',
      displayName: 'Codex CLI',
      kind: 'CLI',
      selected: true,
      available: true,
      reason: 'codex command found',
    },
  ]),
  hasLlmProvider: jest.fn(() => true),
  isLlmProviderName: jest.fn((value: string) => value === 'codex-cli'),
}))

describe('/api/config', () => {
  beforeEach(() => {
    process.env.AGENT_HARNESS_DIR = `/tmp/harness-config-route-${Date.now()}-${Math.random()}`
  })

  afterEach(() => {
    delete process.env.AGENT_HARNESS_DIR
  })

  it('returns provider status metadata', async () => {
    const response = await GET()
    const body = await response.json()

    expect(body.llmProvider).toBe('codex-cli')
    expect(body.llmConnected).toBe(true)
    expect(body.llmProviders).toEqual([
      expect.objectContaining({ id: 'codex-cli', selected: true, available: true }),
    ])
  })

  it('persists a valid provider and ignores derived fields', async () => {
    const response = await PATCH(
      new NextRequest('http://localhost/api/config', {
        method: 'PATCH',
        body: JSON.stringify({ llmProvider: 'codex-cli', llmConnected: false }),
      }),
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.llmProvider).toBe('codex-cli')
    expect(getConfig().llmProvider).toBe('codex-cli')
    expect('llmConnected' in getConfig()).toBe(false)
  })

  it('persists personal harness preferences', async () => {
    const response = await PATCH(
      new NextRequest('http://localhost/api/config', {
        method: 'PATCH',
        body: JSON.stringify({
          personalHarnessPreferences: 'Prefer small repo-local skills over generic global prompts.',
        }),
      }),
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.personalHarnessPreferences).toContain('repo-local skills')
    expect(getConfig().personalHarnessPreferences).toContain('repo-local skills')
  })

  it('rejects invalid providers', async () => {
    const response = await PATCH(
      new NextRequest('http://localhost/api/config', {
        method: 'PATCH',
        body: JSON.stringify({ llmProvider: 'bad-provider' }),
      }),
    )
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toMatch(/Invalid LLM provider/)
  })
})
