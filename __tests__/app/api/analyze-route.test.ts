import { NextRequest } from 'next/server'
import { POST } from '@/app/api/analyze/route'
import { getLlmProviderName, hasLlmProvider } from '@/lib/llm/provider'
import { analyzeAndPersist } from '@/lib/llm/gap-analyst'
import { getItems, getRepos, recordAiRun } from '@/lib/registry/queries'

jest.mock('@/lib/llm/provider', () => ({
  getLlmProviderName: jest.fn(),
  hasLlmProvider: jest.fn(),
  isLlmProviderName: jest.fn((value: unknown) =>
    ['anthropic-api', 'openai-api', 'claude-code-cli', 'codex-cli'].includes(String(value)),
  ),
}))

jest.mock('@/lib/llm/gap-analyst', () => ({
  analyzeAndPersist: jest.fn(),
}))

jest.mock('@/lib/registry/queries', () => ({
  getItems: jest.fn(),
  getRepos: jest.fn(),
  recordAiRun: jest.fn(),
}))

const mockedGetLlmProviderName = getLlmProviderName as jest.Mock
const mockedHasLlmProvider = hasLlmProvider as jest.Mock
const mockedAnalyzeAndPersist = analyzeAndPersist as jest.Mock
const mockedGetItems = getItems as jest.Mock
const mockedGetRepos = getRepos as jest.Mock
const mockedRecordAiRun = recordAiRun as jest.Mock

describe('/api/analyze', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedGetLlmProviderName.mockReturnValue('anthropic-api')
    mockedHasLlmProvider.mockReturnValue(true)
    mockedGetRepos.mockReturnValue([{ path: '/repo-a' }, { path: '/repo-b' }])
    mockedGetItems.mockReturnValue([])
    mockedAnalyzeAndPersist.mockResolvedValue(1)
  })

  it('uses the selected provider and analyzes every repo by default', async () => {
    const response = await POST(
      new NextRequest('http://localhost/api/analyze', {
        method: 'POST',
        body: JSON.stringify({ provider: 'codex-cli' }),
      }),
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({ recommendations: 2, repos: 2, errors: [] })
    expect(mockedHasLlmProvider).toHaveBeenCalledWith('codex-cli')
    expect(mockedGetItems).toHaveBeenCalledWith({ repoPath: '/repo-a' })
    expect(mockedAnalyzeAndPersist).toHaveBeenCalledWith('/repo-a', [], {
      provider: 'codex-cli',
      target: { scope: 'repo', repoPath: '/repo-a' },
    })
    expect(mockedRecordAiRun).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'analyze',
        provider: 'codex-cli',
        status: 'done',
        resultSummary: '{"recommendations":2,"repos":2,"errors":[]}',
      }),
    )
  })

  it('can analyze a repo section only', async () => {
    await POST(
      new NextRequest('http://localhost/api/analyze', {
        method: 'POST',
        body: JSON.stringify({
          provider: 'claude-code-cli',
          target: { scope: 'section', repoPath: '/repo-a', itemType: 'skill' },
        }),
      }),
    )

    expect(mockedGetItems).toHaveBeenCalledWith({ repoPath: '/repo-a', type: 'skill' })
    expect(mockedAnalyzeAndPersist).toHaveBeenCalledWith('/repo-a', [], {
      provider: 'claude-code-cli',
      target: { scope: 'section', repoPath: '/repo-a', itemType: 'skill' },
    })
  })
})
