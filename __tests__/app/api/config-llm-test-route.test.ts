import { NextRequest } from 'next/server'
import { POST } from '@/app/api/config/llm-test/route'
import { testLlmProvider } from '@/lib/llm/provider'

jest.mock('@/lib/llm/provider', () => ({
  isLlmProviderName: jest.fn((value: string) =>
    ['anthropic-api', 'openai-api', 'claude-code-cli', 'codex-cli'].includes(value),
  ),
  testLlmProvider: jest.fn(),
}))

const mockedTestLlmProvider = testLlmProvider as jest.Mock

describe('/api/config/llm-test', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('tests the requested provider', async () => {
    mockedTestLlmProvider.mockResolvedValue({ ok: true, provider: 'codex-cli', output: 'ok' })

    const response = await POST(
      new NextRequest('http://localhost/api/config/llm-test', {
        method: 'POST',
        body: JSON.stringify({ provider: 'codex-cli' }),
      }),
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({ ok: true, provider: 'codex-cli', output: 'ok' })
    expect(mockedTestLlmProvider).toHaveBeenCalledWith('codex-cli')
  })

  it('returns 400 when the provider test fails', async () => {
    mockedTestLlmProvider.mockResolvedValue({
      ok: false,
      provider: 'anthropic-api',
      error: 'ANTHROPIC_API_KEY not set',
    })

    const response = await POST(
      new NextRequest('http://localhost/api/config/llm-test', {
        method: 'POST',
        body: JSON.stringify({ provider: 'anthropic-api' }),
      }),
    )

    expect(response.status).toBe(400)
  })
})
