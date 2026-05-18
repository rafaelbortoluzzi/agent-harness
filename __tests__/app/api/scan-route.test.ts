import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/scan/route'
import { getScanPreviewRepos, startBackgroundScan } from '@/lib/scanner/job-runner'

jest.mock('@/lib/scanner/job-runner', () => ({
  getScanPreviewRepos: jest.fn(),
  startBackgroundScan: jest.fn(),
}))

const mockedGetScanPreviewRepos = getScanPreviewRepos as jest.Mock
const mockedStartBackgroundScan = startBackgroundScan as jest.Mock

describe('/api/scan', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('previews discovered repos before starting a scan', async () => {
    mockedGetScanPreviewRepos.mockResolvedValue([
      { path: '/repo-a', source: 'auto-discovered', known: false },
      { path: '/repo-b', source: 'manual', known: true },
    ])

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.repos).toEqual([
      { path: '/repo-a', source: 'auto-discovered', known: false },
      { path: '/repo-b', source: 'manual', known: true },
    ])
    expect(mockedStartBackgroundScan).not.toHaveBeenCalled()
  })

  it('starts a scan with the repos approved in the confirmation dialog', async () => {
    mockedStartBackgroundScan.mockReturnValue('scan-1')

    const response = await POST(
      new NextRequest('http://localhost/api/scan', {
        method: 'POST',
        body: JSON.stringify({ approvedAutoRepos: ['/repo-a'], rejectedAutoRepos: ['/repo-c'] }),
      }),
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({ scanId: 'scan-1' })
    expect(mockedStartBackgroundScan).toHaveBeenCalledWith({
      approvedAutoRepos: ['/repo-a'],
      rejectedAutoRepos: ['/repo-c'],
    })
  })
})
