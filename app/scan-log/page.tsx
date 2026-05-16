'use client'
import useSWR from 'swr'
import { Card, CardContent } from '@/components/ui/card'

interface Scan {
  id: string
  startedAt: string
  finishedAt: string | null
  reposScanned: number | null
  itemsFound: number | null
  itemsBroken: number | null
  itemsNew: number | null
  itemsRemoved: number | null
  itemsChanged: number | null
  status: string
  error: string | null
}

const fetcher = (u: string) => fetch(u).then(r => r.json())

function duration(start: string, end: string | null): string {
  if (!end) return 'running…'
  const ms = new Date(end).getTime() - new Date(start).getTime()
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`
}

export default function ScanLogPage() {
  const { data: scans = [] } = useSWR<Scan[]>('/api/registry?resource=scans', fetcher, {
    refreshInterval: 2000,
  })

  return (
    <div className="space-y-4 max-w-3xl">
      <h2 className="text-2xl font-bold">Scan Log</h2>

      {scans.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No scans yet. Go to Dashboard and click Scan Now.
        </p>
      )}

      <div className="space-y-2">
        {scans.map(scan => (
          <Card key={scan.id}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">
                    {new Date(scan.startedAt).toLocaleString()}
                    <span className="text-muted-foreground ml-2 text-xs">
                      ({duration(scan.startedAt, scan.finishedAt)})
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {scan.reposScanned ?? 0} repos · {scan.itemsFound ?? 0} items ·{' '}
                    {(scan.itemsBroken ?? 0) > 0 ? (
                      <span className="text-red-600">{scan.itemsBroken} broken</span>
                    ) : (
                      <span className="text-green-700">0 broken</span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    +{scan.itemsNew ?? 0} new · -{scan.itemsRemoved ?? 0} removed ·{' '}
                    {scan.itemsChanged ?? 0} changed
                  </div>
                  {scan.error && (
                    <div className="text-xs text-red-600 mt-1">Error: {scan.error}</div>
                  )}
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded ${
                    scan.status === 'done'
                      ? 'bg-green-100 text-green-700'
                      : scan.status === 'error'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-yellow-100 text-yellow-700'
                  }`}
                >
                  {scan.status}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
