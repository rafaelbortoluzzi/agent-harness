'use client'
import useSWR from 'swr'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { HealthBadge } from '@/components/health-badge'

const fetcher = (u: string) => fetch(u).then(r => r.json())

interface Repo {
  path: string
  label: string | null
  healthScore: number | null
}

interface Item {
  id: string
  name: string
  type: string
  runtime: string
  health: 'ok' | 'warning' | 'broken'
  issues: string[]
}

interface Scan {
  id: string
  status: string
  itemsFound: number
  itemsBroken: number
  reposScanned: number
}

interface Config {
  llmConnected: boolean
}

export default function Dashboard() {
  const repos = useSWR<Repo[]>('/api/registry?resource=repos', fetcher)
  const scans = useSWR<Scan[]>('/api/registry?resource=scans', fetcher)
  const broken = useSWR<Item[]>('/api/registry?health=broken', fetcher)

  const [scanId, setScanId] = useState<string | null>(null)
  const scan = useSWR<Scan>(scanId ? `/api/scan/${scanId}` : null, fetcher, {
    refreshInterval: 800,
    onSuccess: data => {
      if (data.status !== 'running') {
        setScanId(null)
        void repos.mutate()
        void scans.mutate()
        void broken.mutate()
      }
    },
  })

  const triggerScan = async () => {
    const r = await fetch('/api/scan', { method: 'POST' }).then(r => r.json())
    setScanId(r.scanId)
  }

  const config = useSWR<Config>('/api/config', fetcher)
  const [judging, setJudging] = useState(false)
  const triggerJudge = async () => {
    setJudging(true)
    try {
      await fetch('/api/judge', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
    } finally {
      setJudging(false)
    }
  }

  const repoList = repos.data ?? []
  const brokenList = broken.data ?? []
  const summary = scans.data?.[0]
  const avgScore = repoList.length
    ? Math.round(repoList.reduce((a, r) => a + (r.healthScore ?? 0), 0) / repoList.length)
    : 0
  const running = scan.data?.status === 'running'

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Dashboard</h2>
        <div className="flex gap-2">
          {config.data?.llmConnected && (
            <Button variant="outline" onClick={triggerJudge} disabled={judging}>
              {judging ? 'Judging…' : 'Judge with LLM'}
            </Button>
          )}
          <Button onClick={triggerScan} disabled={running}>
            {running ? 'Scanning…' : 'Scan Now'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Repos', value: repoList.length },
          { label: 'Items', value: summary?.itemsFound ?? 0 },
          { label: 'Broken', value: summary?.itemsBroken ?? 0 },
          { label: 'Avg Score', value: `${avgScore}/100` },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="pt-6 text-center">
              <div className="text-3xl font-bold">{s.value}</div>
              <div className="text-sm text-muted-foreground mt-1">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Repo Health</CardTitle>
        </CardHeader>
        <CardContent>
          {repoList.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No repos scanned. Go to Settings to add roots, then click Scan Now.
            </p>
          )}
          <div className="space-y-2">
            {repoList.map(repo => (
              <div
                key={repo.path}
                className="flex items-center justify-between py-2 border-b last:border-0"
              >
                <div className="min-w-0">
                  <div className="font-medium text-sm">
                    {repo.label ?? repo.path.split('/').pop()}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">{repo.path}</div>
                </div>
                <HealthBadge score={repo.healthScore} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {brokenList.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Broken Items ({brokenList.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {brokenList.map(item => (
                <div key={item.id} className="flex items-center gap-3 py-1">
                  <HealthBadge health="broken" />
                  <div className="min-w-0">
                    <span className="font-medium text-sm">{item.name}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      {item.runtime}/{item.type}
                    </span>
                    <div className="text-xs text-red-600 truncate">
                      {item.issues?.[0]}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
