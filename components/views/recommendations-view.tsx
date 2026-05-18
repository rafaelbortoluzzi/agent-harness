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
  llmProviders?: { id: string; displayName: string; available: boolean; selected: boolean }[]
}

interface Repo {
  path: string
  label: string | null
}

interface Item {
  id: string
  name: string
  type: string
  repoPath: string | null
}

const fetcher = (u: string) => fetch(u).then(r => r.json())

export function RecommendationsView() {
  const { data: recs = [], mutate } = useSWR<Recommendation[]>('/api/recommendations', fetcher)
  const { data: config } = useSWR<Config>('/api/config', fetcher)
  const { data: repos = [] } = useSWR<Repo[]>('/api/registry?resource=repos', fetcher)
  const { data: items = [] } = useSWR<Item[]>('/api/registry?limit=1000', fetcher)
  const [analyzing, setAnalyzing] = useState(false)
  const [creatingId, setCreatingId] = useState<string | null>(null)
  const [created, setCreated] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [provider, setProvider] = useState('')
  const [scope, setScope] = useState<'all' | 'repo' | 'section' | 'unit'>('all')
  const [repoPath, setRepoPath] = useState('')
  const [itemType, setItemType] = useState('skill')
  const [itemId, setItemId] = useState('')

  const selectedProvider = provider || config?.llmProvider || ''
  const selectedRepo = repoPath || repos[0]?.path || ''
  const selectedItem = itemId || items[0]?.id || ''

  const buildTarget = () => {
    if (scope === 'repo') return { scope, repoPath: selectedRepo }
    if (scope === 'section') return { scope, repoPath: selectedRepo, itemType }
    if (scope === 'unit') return { scope, itemId: selectedItem }
    return { scope: 'all' }
  }

  const runAnalyze = async () => {
    setAnalyzing(true)
    setError(null)
    try {
      await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: selectedProvider, target: buildTarget() }),
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
      </p>

      {config?.llmConnected && (
        <div className="ah-rec-controls">
          <label>
            <span>Provider</span>
            <select value={selectedProvider} onChange={e => setProvider(e.target.value)}>
              {(config.llmProviders ?? []).map(p => (
                <option key={p.id} value={p.id} disabled={!p.available}>
                  {p.displayName} ({p.id})
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Scope</span>
            <select value={scope} onChange={e => setScope(e.target.value as typeof scope)}>
              <option value="all">All</option>
              <option value="repo">Repo</option>
              <option value="section">Section</option>
              <option value="unit">Unit</option>
            </select>
          </label>
          {(scope === 'repo' || scope === 'section') && (
            <label>
              <span>Repo</span>
              <select value={selectedRepo} onChange={e => setRepoPath(e.target.value)}>
                {repos.map(r => (
                  <option key={r.path} value={r.path}>
                    {r.label ?? r.path.split('/').pop()}
                  </option>
                ))}
              </select>
            </label>
          )}
          {scope === 'section' && (
            <label>
              <span>Section</span>
              <select value={itemType} onChange={e => setItemType(e.target.value)}>
                {Array.from(new Set(items.map(i => i.type))).map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </label>
          )}
          {scope === 'unit' && (
            <label>
              <span>Unit</span>
              <select value={selectedItem} onChange={e => setItemId(e.target.value)}>
                {items.map(i => (
                  <option key={i.id} value={i.id}>
                    {i.name} ({i.type})
                  </option>
                ))}
              </select>
            </label>
          )}
          <button type="button" onClick={() => void runAnalyze()} disabled={analyzing}>
            {analyzing ? 'Analyzing...' : 'Analyze'}
          </button>
        </div>
      )}

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
