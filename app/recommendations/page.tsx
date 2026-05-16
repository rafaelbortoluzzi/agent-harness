'use client'
import useSWR from 'swr'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface Recommendation {
  id: string
  repoPath: string
  kind: 'skill' | 'agent' | 'hook'
  name: string
  rationale: string
  createdAt: string
}

interface Config {
  llmConnected: boolean
}

const fetcher = (u: string) => fetch(u).then(r => r.json())

export default function RecommendationsPage() {
  const { data: recs = [], mutate } = useSWR<Recommendation[]>('/api/recommendations', fetcher)
  const { data: config } = useSWR<Config>('/api/config', fetcher)
  const [analyzing, setAnalyzing] = useState(false)

  const grouped = recs.reduce<Record<string, Recommendation[]>>((acc, r) => {
    ;(acc[r.repoPath] ??= []).push(r)
    return acc
  }, {})

  const runAnalyze = async () => {
    setAnalyzing(true)
    try {
      await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      })
      await mutate()
    } finally {
      setAnalyzing(false)
    }
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Recommendations</h2>
        {config?.llmConnected && (
          <Button onClick={runAnalyze} disabled={analyzing}>
            {analyzing ? 'Analyzing…' : 'Analyze All Repos'}
          </Button>
        )}
      </div>

      {!config?.llmConnected && (
        <p className="text-sm text-muted-foreground">
          Set <code className="bg-muted px-1 rounded">ANTHROPIC_API_KEY</code> to use the gap analyst.
        </p>
      )}

      {recs.length === 0 && config?.llmConnected && (
        <p className="text-sm text-muted-foreground">
          No recommendations yet. Click Analyze All Repos.
        </p>
      )}

      {Object.entries(grouped).map(([repo, items]) => (
        <Card key={repo}>
          <CardHeader>
            <CardTitle className="text-sm font-mono break-all">{repo}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {items.map(r => (
              <div key={r.id} className="border-l-2 border-primary pl-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 bg-muted rounded uppercase">{r.kind}</span>
                  <span className="font-medium text-sm">{r.name}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{r.rationale}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
