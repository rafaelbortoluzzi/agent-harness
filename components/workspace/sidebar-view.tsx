'use client'
import useSWR from 'swr'
import { useWorkspace } from '@/lib/workspace/store'
import { Explorer } from './explorer'

const fetcher = (u: string) => fetch(u).then(r => r.json())

interface Recommendation {
  id: string
  name: string
  kind: string
  repoPath: string
  rationale: string
}

interface Scan {
  id: string
  startedAt: string
  finishedAt: string | null
  itemsFound: number | null
  status: string
}

function RecsSidebar() {
  const { data: recs = [] } = useSWR<Recommendation[]>('/api/recommendations', fetcher)
  const { openRecs } = useWorkspace()

  return (
    <aside className="ah-explorer" aria-label="Recommendations">
      <div className="ah-head">
        <span>Recommendations</span>
      </div>
      {recs.length === 0 && (
        <div style={{ padding: '12px 14px', fontSize: 11, color: 'var(--ah-fg-3)' }}>
          No recommendations.
        </div>
      )}
      <div style={{ overflow: 'auto' }}>
        {recs.map(r => (
          <button
            key={r.id}
            type="button"
            onClick={openRecs}
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'left',
              padding: '8px 14px',
              borderBottom: '1px solid var(--ah-line)',
              cursor: 'pointer',
              background: 'transparent',
              border: 'none',
              borderColor: 'transparent transparent var(--ah-line)',
              color: 'inherit',
              fontFamily: 'inherit',
            }}
          >
            <div style={{ fontSize: 12, color: 'var(--ah-fg-0)' }}>{r.name}</div>
            <div style={{ fontSize: 10, color: 'var(--ah-fg-4)', marginTop: 2 }}>
              {r.repoPath?.split('/').pop() ?? r.repoPath} · {r.kind}
            </div>
          </button>
        ))}
      </div>
    </aside>
  )
}

function HistorySidebar() {
  const { data: scans = [] } = useSWR<Scan[]>('/api/registry?resource=scans', fetcher, {
    refreshInterval: 5000,
  })
  return (
    <aside className="ah-explorer" aria-label="Scan history">
      <div className="ah-head">
        <span>Scan Log</span>
      </div>
      {scans.length === 0 && (
        <div style={{ padding: '12px 14px', fontSize: 11, color: 'var(--ah-fg-3)' }}>
          No scans yet.
        </div>
      )}
      <div style={{ overflow: 'auto' }}>
        {scans.map(s => (
          <div
            key={s.id}
            style={{
              padding: '8px 14px',
              borderBottom: '1px solid var(--ah-line)',
              fontSize: 11,
            }}
          >
            <div style={{ color: 'var(--ah-fg-1)' }}>
              {new Date(s.startedAt).toLocaleString()}
            </div>
            <div style={{ color: 'var(--ah-fg-4)', marginTop: 2, fontSize: 10 }}>
              {s.itemsFound ?? 0} items · {s.status}
            </div>
          </div>
        ))}
      </div>
    </aside>
  )
}

function SearchSidebar() {
  return (
    <aside className="ah-explorer" aria-label="Search">
      <div className="ah-head">
        <span>Search</span>
      </div>
      <div style={{ padding: '12px 14px', fontSize: 11, color: 'var(--ah-fg-3)' }}>
        Full-text search across all skill/agent bodies. (Step 9)
      </div>
    </aside>
  )
}

export function SidebarView() {
  const { state } = useWorkspace()
  switch (state.view) {
    case 'search':
      return <SearchSidebar />
    case 'recs':
      return <RecsSidebar />
    case 'history':
      return <HistorySidebar />
    case 'explorer':
    default:
      return <Explorer />
  }
}
