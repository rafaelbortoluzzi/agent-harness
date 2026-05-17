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
  llmProvider: string
}

const fetcher = (u: string) => fetch(u).then(r => r.json())

export default function RecommendationsPage() {
  const { data: recs = [], mutate } = useSWR<Recommendation[]>('/api/recommendations', fetcher)
  const { data: config } = useSWR<Config>('/api/config', fetcher)
  const [analyzing, setAnalyzing] = useState(false)
  const [creatingId, setCreatingId] = useState<string | null>(null)
  const [created, setCreated] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)

  const grouped = recs.reduce<Record<string, Recommendation[]>>((acc, r) => {
    ;(acc[r.repoPath] ??= []).push(r)
    return acc
  }, {})

  const runAnalyze = async () => {
    setAnalyzing(true)
    setError(null)
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

  const createSkill = async (recommendationId: string) => {
    setCreatingId(recommendationId)
    setError(null)
    try {
      const resp = await fetch('/api/recommendations/create-skill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recommendationId }),
      })
      const body = await resp.json()
      if (!resp.ok) {
        setError(body.error ?? `Create failed: HTTP ${resp.status}`)
        return
      }
      setCreated(prev => ({ ...prev, [recommendationId]: body.path }))
    } finally {
      setCreatingId(null)
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
          Configure <code className="bg-muted px-1 rounded">AGENT_HARNESS_LLM_PROVIDER</code> to use the gap analyst.
        </p>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

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
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 bg-muted rounded uppercase">
                        {r.kind}
                      </span>
                      <span className="font-medium text-sm">{r.name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{r.rationale}</p>
                    {created[r.id] && (
                      <p className="text-xs text-green-700 mt-1 break-all">
                        Created: {created[r.id]}
                      </p>
                    )}
                  </div>
                  {r.kind === 'skill' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => createSkill(r.id)}
                      disabled={creatingId === r.id || Boolean(created[r.id])}
                    >
                      {creatingId === r.id ? 'Creating…' : created[r.id] ? 'Created' : 'Create skill'}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
