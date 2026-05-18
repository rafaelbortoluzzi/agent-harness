'use client'
import useSWR from 'swr'
import { useState } from 'react'
import { Plus } from 'lucide-react'

interface Recommendation {
  id: string
  repoPath: string
  kind: 'skill' | 'agent' | 'hook'
  name: string
  rationale: string
  createdAt: string
  score?: number | null
}

interface Config {
  llmConnected: boolean
  llmProvider: string
}

const fetcher = (u: string) => fetch(u).then(r => r.json())

export function RecommendationsView() {
  const { data: recs = [], mutate } = useSWR<Recommendation[]>('/api/recommendations', fetcher)
  const { data: config } = useSWR<Config>('/api/config', fetcher)
  const [analyzing, setAnalyzing] = useState(false)
  const [creatingId, setCreatingId] = useState<string | null>(null)
  const [created, setCreated] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)

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
    <div className="ah-rec-view">
      <h1>Recommendations</h1>
      <p className="ah-sub">
        LLM-detected gaps · {recs.length} suggested
        {config?.llmConnected && (
          <button
            type="button"
            onClick={() => void runAnalyze()}
            disabled={analyzing}
            style={{
              float: 'right',
              background: 'var(--ah-bg-5)',
              border: '1px solid var(--ah-line-3)',
              color: 'var(--ah-fg-0)',
              fontFamily: 'inherit',
              fontSize: 11,
              padding: '4px 12px',
              cursor: analyzing ? 'not-allowed' : 'pointer',
              borderRadius: 2,
              opacity: analyzing ? 0.5 : 1,
            }}
          >
            {analyzing ? 'Analyzing…' : 'Analyze repos'}
          </button>
        )}
      </p>

      {!config?.llmConnected && (
        <p style={{ fontSize: 11, color: 'var(--ah-fg-4)' }}>
          Configure <code>AGENT_HARNESS_LLM_PROVIDER</code> to enable analysis.
        </p>
      )}
      {error && <p style={{ color: 'var(--ah-red)', fontSize: 12 }}>{error}</p>}
      {recs.length === 0 && config?.llmConnected && !analyzing && (
        <p style={{ fontSize: 12, color: 'var(--ah-fg-4)' }}>
          No recommendations yet. Click Analyze repos.
        </p>
      )}

      <div className="ah-rec-list">
        {recs.map((r, i) => (
          <div className="ah-rec-card" key={r.id}>
            <span className="ah-n">{String(i + 1).padStart(2, '0')}</span>
            <div>
              <h3>
                {r.name}
                <span className="ah-typ">{r.kind}</span>
              </h3>
              <p>{r.rationale}</p>
              <div className="ah-for">
                FOR: <span style={{ color: 'var(--ah-fg-1)' }}>{r.repoPath?.split('/').pop()}</span>
              </div>
              {created[r.id] && (
                <div style={{ color: 'oklch(0.78 0.14 145)', fontSize: 11, marginTop: 6 }}>
                  Created: {created[r.id]}
                </div>
              )}
            </div>
            <div className="ah-right">
              {r.score !== null && r.score !== undefined && (
                <div className="ah-score">
                  {r.score.toFixed(1)}
                  <span>/10</span>
                </div>
              )}
              <div className="ah-actions">
                {r.kind === 'skill' && (
                  <button
                    type="button"
                    className="primary"
                    onClick={() => void createSkill(r.id)}
                    disabled={creatingId === r.id || Boolean(created[r.id])}
                  >
                    <Plus size={11} strokeWidth={1.6} style={{ marginRight: 4 }} />
                    {creatingId === r.id ? 'Creating…' : created[r.id] ? 'Created' : 'Draft'}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
