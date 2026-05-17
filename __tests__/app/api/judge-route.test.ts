import { NextRequest } from 'next/server'
import { POST } from '@/app/api/judge/route'
import { getLlmProviderName, hasLlmProvider } from '@/lib/llm/provider'
import { judgeUnjudged } from '@/lib/llm/judge-runner'

jest.mock('@/lib/llm/provider', () => ({
  getLlmProviderName: jest.fn(),
  hasLlmProvider: jest.fn(),
}))

jest.mock('@/lib/llm/judge-runner', () => ({
  judgeUnjudged: jest.fn(),
}))

const mockedHasLlmProvider = hasLlmProvider as jest.Mock
const mockedGetLlmProviderName = getLlmProviderName as jest.Mock
const mockedJudgeUnjudged = judgeUnjudged as jest.Mock

describe('/api/judge', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedGetLlmProviderName.mockReturnValue('anthropic-api')
  })

  it('rejects requests when selected LLM provider is not configured', async () => {
    mockedHasLlmProvider.mockReturnValue(false)

    const response = await POST(new NextRequest('http://localhost/api/judge', { method: 'POST' }))
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toMatch(/anthropic-api is not configured/)
    expect(mockedJudgeUnjudged).not.toHaveBeenCalled()
  })

  it('runs judge when selected LLM provider is configured without requiring API key', async () => {
    mockedGetLlmProviderName.mockReturnValue('claude-code-cli')
    mockedHasLlmProvider.mockReturnValue(true)
    mockedJudgeUnjudged.mockResolvedValue({ judged: 1, failed: 0 })

    const response = await POST(
      new NextRequest('http://localhost/api/judge', {
        method: 'POST',
        body: JSON.stringify({ limit: 1 }),
      }),
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({ judged: 1, failed: 0 })
    expect(mockedJudgeUnjudged).toHaveBeenCalledWith({ runtime: undefined, limit: 1 })
  })
})
