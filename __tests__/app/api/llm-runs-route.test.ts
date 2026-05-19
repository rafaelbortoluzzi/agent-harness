import { GET } from '@/app/api/llm/runs/route'
import { getAiRuns } from '@/lib/registry/queries'

jest.mock('@/lib/registry/queries', () => ({
  getAiRuns: jest.fn(),
}))

const mockedGetAiRuns = getAiRuns as jest.Mock

describe('/api/llm/runs', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns recent AI run history', async () => {
    mockedGetAiRuns.mockReturnValue([
      {
        id: 'run-1',
        action: 'analyze',
        provider: 'codex-cli',
        presetId: 'harness-blueprint',
        target: { scope: 'repo', repoPath: '/repo' },
        systemPrompt: 'system',
        userPrompt: 'prompt',
        resultSummary: '{"recommendations":1}',
        status: 'done',
        createdAt: '2026-05-19T00:00:00.000Z',
      },
    ])

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toHaveLength(1)
    expect(body[0]).toMatchObject({ action: 'analyze', presetId: 'harness-blueprint' })
    expect(mockedGetAiRuns).toHaveBeenCalledWith(50)
  })
})
