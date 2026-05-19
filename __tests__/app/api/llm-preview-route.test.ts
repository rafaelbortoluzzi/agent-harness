import { NextRequest } from 'next/server'
import { POST } from '@/app/api/llm/preview/route'
import { getItemById, getItems, getRepos } from '@/lib/registry/queries'

jest.mock('@/lib/registry/queries', () => ({
  getItemById: jest.fn(),
  getItems: jest.fn(),
  getRepos: jest.fn(),
}))

jest.mock('@/lib/config', () => ({
  getConfig: jest.fn(() => ({
    personalHarnessPreferences: 'Prefer repo-local skills with clear trigger conditions.',
  })),
}))

const mockedGetItemById = getItemById as jest.Mock
const mockedGetItems = getItems as jest.Mock
const mockedGetRepos = getRepos as jest.Mock

const item = {
  id: 'skill-1',
  runtime: 'claude',
  scope: 'repo',
  type: 'skill',
  name: 'release-helper',
  path: '/repo/.claude/skills/release-helper/SKILL.md',
  repoPath: '/repo',
  health: 'ok',
  issues: [],
  metadata: { description: 'release support' },
  scannedAt: '2026-05-18T00:00:00.000Z',
}

describe('/api/llm/preview', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedGetItemById.mockReturnValue(item)
    mockedGetItems.mockReturnValue([item])
    mockedGetRepos.mockReturnValue([{ path: '/repo' }])
  })

  it('returns the prompt for a unit judge action', async () => {
    const response = await POST(
      new NextRequest('http://localhost/api/llm/preview', {
        method: 'POST',
        body: JSON.stringify({
          action: 'judge',
          target: { scope: 'unit', itemId: 'skill-1' },
          presetId: 'personal-fit',
        }),
      }),
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.action).toBe('judge')
    expect(body.request.system).toContain('personal workflow')
    expect(body.request.prompt).toContain('release-helper')
    expect(body.request.prompt).toContain('Prefer repo-local skills')
  })

  it('returns the prompt for repo analysis', async () => {
    const response = await POST(
      new NextRequest('http://localhost/api/llm/preview', {
        method: 'POST',
        body: JSON.stringify({
          action: 'analyze',
          target: { scope: 'repo', repoPath: '/repo' },
          presetId: 'harness-blueprint',
        }),
      }),
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.request.system).toContain('agent harness blueprint')
    expect(body.request.prompt).toContain('[skill] release-helper')
  })
})
