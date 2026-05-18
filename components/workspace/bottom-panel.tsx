'use client'
import useSWR from 'swr'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useWorkspace, type BottomTab } from '@/lib/workspace/store'
import type { PanelItem } from '@/components/item-side-panel'

const fetcher = (u: string) => fetch(u).then(r => r.json())

interface Scan {
  id: string
  status: string
  startedAt: string
  finishedAt: string | null
  reposScanned: number | null
  itemsFound: number | null
  itemsBroken: number | null
  itemsNew: number | null
  itemsRemoved: number | null
  itemsChanged: number | null
  error: string | null
}

function ProblemsBody() {
  const { data: items = [] } = useSWR<PanelItem[]>('/api/registry?limit=1000', fetcher)
  const { openEditor } = useWorkspace()
  const broken = items.filter(i => i.health === 'broken')
  const warnings = items.filter(i => i.health === 'warning')

  if (broken.length + warnings.length === 0) {
    return (
      <div className="ah-prob-row">
        <span />
        <span style={{ color: 'var(--ah-fg-4)' }}>No problems found in the workspace.</span>
        <span />
      </div>
    )
  }

  return (
    <>
      {broken.map(it => (
        <div
          key={it.id}
          className="ah-prob-row"
          onClick={() =>
            openEditor({ id: it.id, name: it.name, type: it.type, path: it.path })
          }
        >
          <span className="ah-ic bad">●</span>
          <span>
            <span style={{ color: 'var(--ah-fg-0)' }}>{it.name}</span>
            {it.issues[0] && <span style={{ color: 'var(--ah-fg-3)' }}> · {it.issues[0]}</span>}
          </span>
          <span className="ah-where">
            {it.repoPath?.split('/').pop() ?? '—'}/{it.type}
          </span>
        </div>
      ))}
      {warnings.map(it => (
        <div
          key={it.id}
          className="ah-prob-row"
          onClick={() =>
            openEditor({ id: it.id, name: it.name, type: it.type, path: it.path })
          }
        >
          <span className="ah-ic warn">▲</span>
          <span>
            <span style={{ color: 'var(--ah-fg-1)' }}>{it.name}</span>
            {it.issues[0] && <span style={{ color: 'var(--ah-fg-4)' }}> · {it.issues[0]}</span>}
          </span>
          <span className="ah-where">
            {it.repoPath?.split('/').pop() ?? '—'}/{it.type}
          </span>
        </div>
      ))}
    </>
  )
}

function OutputBody() {
  const { data: scans = [] } = useSWR<Scan[]>('/api/registry?resource=scans', fetcher, {
    refreshInterval: 3000,
  })
  const lines = scans.slice(0, 8).map(s => {
    const when = new Date(s.startedAt).toLocaleTimeString()
    const dur = s.finishedAt
      ? `${((new Date(s.finishedAt).getTime() - new Date(s.startedAt).getTime()) / 1000).toFixed(1)}s`
      : 'running'
    return `[scan ${when}] ${s.status} · ${s.itemsFound ?? 0} items · ${s.itemsBroken ?? 0} broken · +${s.itemsNew ?? 0}/-${s.itemsRemoved ?? 0}/${s.itemsChanged ?? 0}∆ · ${dur}`
  })
  return <pre>{lines.length ? lines.join('\n') : '(no scans yet)'}</pre>
}

function TerminalBody() {
  return (
    <pre>
{`$ pnpm cli watch
[watch] daemon online
[watch] event handler attached
$ _`}
    </pre>
  )
}

export function BottomPanel() {
  const { state, toggleBottom, setBottomTab } = useWorkspace()
  const { bottomCollapsed, bottomTab } = state
  const { data: items = [] } = useSWR<PanelItem[]>('/api/registry?limit=1000', fetcher)
  const broken = items.filter(i => i.health === 'broken').length
  const warns = items.filter(i => i.health === 'warning').length
  const probCount = broken + warns

  const setTab = (t: BottomTab) => setBottomTab(t)

  return (
    <div className={`ah-bottom${bottomCollapsed ? ' collapsed' : ''}`}>
      <div className="ah-bp-head">
        <button
          type="button"
          className={`ah-bp-tab${bottomTab === 'problems' ? ' on' : ''}`}
          onClick={() => setTab('problems')}
        >
          Problems{' '}
          {probCount > 0 && (
            <span className={`ah-ct ${broken > 0 ? 'bad' : 'warn'}`}>{probCount}</span>
          )}
        </button>
        <button
          type="button"
          className={`ah-bp-tab${bottomTab === 'output' ? ' on' : ''}`}
          onClick={() => setTab('output')}
        >
          Output
        </button>
        <button
          type="button"
          className={`ah-bp-tab${bottomTab === 'terminal' ? ' on' : ''}`}
          onClick={() => setTab('terminal')}
        >
          Terminal
        </button>
        <div className="ah-bp-actions">
          <button
            type="button"
            onClick={toggleBottom}
            title={bottomCollapsed ? 'Expand' : 'Collapse'}
          >
            {bottomCollapsed ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        </div>
      </div>
      {!bottomCollapsed && (
        <div className="ah-bp-body">
          {bottomTab === 'problems' && <ProblemsBody />}
          {bottomTab === 'output' && <OutputBody />}
          {bottomTab === 'terminal' && <TerminalBody />}
        </div>
      )}
    </div>
  )
}
