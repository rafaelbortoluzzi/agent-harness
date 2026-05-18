'use client'
import useSWR from 'swr'
import { useState } from 'react'
import { Bell, Folder, RefreshCw, Search, Sparkles } from 'lucide-react'
import { useWorkspace } from '@/lib/workspace/store'

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
  path: string
  repoPath: string | null
  health: 'ok' | 'warning' | 'broken'
  qualityScore: number | null
}

interface Scan {
  id: string
  status: string
  itemsFound: number | null
  itemsBroken: number | null
}

interface Config {
  llmConnected: boolean
  llmProvider: string
}

interface Recommendation {
  id: string
}

interface ScanPreviewRepo {
  path: string
  source: 'config' | 'auto-discovered' | 'manual'
  known: boolean
}

export function WelcomeView() {
  const { setPalOpen, openRecs, setScanning, state } = useWorkspace()
  const repos = useSWR<Repo[]>('/api/registry?resource=repos', fetcher)
  const scans = useSWR<Scan[]>('/api/registry?resource=scans', fetcher)
  const items = useSWR<Item[]>('/api/registry?limit=1000', fetcher)
  const recs = useSWR<Recommendation[]>('/api/recommendations', fetcher)
  const config = useSWR<Config>('/api/config', fetcher)
  const [judging, setJudging] = useState(false)
  const [scanChoices, setScanChoices] = useState<ScanPreviewRepo[] | null>(null)
  const [approvedRepos, setApprovedRepos] = useState<Set<string>>(new Set())

  const startScan = async (approvedAutoRepos?: string[]) => {
    setScanning(true)
    try {
      await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvedAutoRepos }),
      })
      await repos.mutate()
      await scans.mutate()
      await items.mutate()
    } finally {
      setScanning(false)
    }
  }

  const triggerScan = async () => {
    const resp = await fetch('/api/scan')
    const body = (await resp.json()) as { repos?: ScanPreviewRepo[] }
    const choices = (body.repos ?? []).filter(r => r.source === 'auto-discovered' && !r.known)
    if (choices.length > 0) {
      setApprovedRepos(new Set(choices.map(r => r.path)))
      setScanChoices(choices)
      return
    }
    await startScan(body.repos?.filter(r => r.source === 'auto-discovered').map(r => r.path))
  }

  const triggerJudge = async () => {
    setJudging(true)
    try {
      await fetch('/api/judge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      })
      await items.mutate()
    } finally {
      setJudging(false)
    }
  }

  const repoList = repos.data ?? []
  const itemList = items.data ?? []
  const reposSorted = [...repoList].sort(
    (a, b) => (a.healthScore ?? 0) - (b.healthScore ?? 0),
  )

  const total = itemList.length
  const broken = itemList.filter(i => i.health === 'broken').length
  const warns = itemList.filter(i => i.health === 'warning').length
  const unscored = itemList.filter(
    i => i.qualityScore === null || i.qualityScore === undefined,
  ).length
  const avg = repoList.length
    ? Math.round(
        repoList.reduce((a, r) => a + (r.healthScore ?? 0), 0) / repoList.length,
      )
    : 0

  return (
    <div className="ah-welcome">
      <h1>
        agent-harness
        <span className="ah-blink" />
      </h1>
      <p className="ah-sub">
        <b>{total}</b> items across <b>{repoList.length}</b> repos ·{' '}
        <span className={broken > 0 ? 'ah-red' : 'ah-muted'}>{broken} broken</span> ·{' '}
        <span className="ah-yellow">{warns} warnings</span> · avg <b>{avg}</b>/100
      </p>

      <div className="ah-stats">
        <div className="ah-stat">
          <div className="ah-big">{repoList.length}</div>
          <div className="ah-lbl">Repos</div>
        </div>
        <div className="ah-stat">
          <div className="ah-big">{total}</div>
          <div className="ah-lbl">Items</div>
        </div>
        <div className="ah-stat">
          <div className={`ah-big${broken > 0 ? ' bad' : ''}`}>{broken}</div>
          <div className="ah-lbl">Broken</div>
        </div>
        <div className="ah-stat">
          <div className="ah-big">
            {avg}
            <span style={{ fontSize: 14, color: 'var(--ah-fg-4)' }}>/100</span>
          </div>
          <div className="ah-lbl">Avg score</div>
        </div>
      </div>

      <div className="ah-w-grid">
        <section className="ah-section">
          <h2>Repo health</h2>
          {reposSorted.length === 0 && (
            <p style={{ color: 'var(--ah-fg-4)', fontSize: 12 }}>
              No repos scanned. Add roots in Settings, then click Scan.
            </p>
          )}
          {reposSorted.map(r => {
            const score = r.healthScore ?? 0
            const cl = score >= 75 ? '' : score >= 60 ? 'warning' : 'broken'
            const sc = score >= 75 ? '' : score >= 60 ? 'warn' : 'bad'
            return (
              <button
                key={r.path}
                type="button"
                className="ah-repo-row-w"
                onClick={() => {
                  // no-op: clicking would need to open repo's first item; skipped to avoid surprise tab opens
                }}
              >
                <Folder size={12} strokeWidth={1.4} />
                <span>
                  <span className="ah-nm">{r.label ?? r.path.split('/').pop()}</span>{' '}
                  <span className="ah-pth">· {r.path}</span>
                </span>
                <div className={`ah-bar ${cl}`.trim()}>
                  <i style={{ width: `${score}%` }} />
                </div>
                <span className={`ah-sc ${sc}`.trim()}>{r.healthScore ?? '—'}</span>
              </button>
            )
          })}
        </section>

        <div>
          <section className="ah-section">
            <h2>Quick actions</h2>
            <button type="button" className="ah-quick-action" onClick={() => setPalOpen(true)}>
              <span className="ah-qa-ic">
                <Search size={14} strokeWidth={1.6} />
              </span>
              <span>
                Find skill / agent…
                <span className="ah-desc">Search across all repos and runtimes</span>
              </span>
              <span className="ah-kbd-mini">⌘K</span>
            </button>
            <button
              type="button"
              className="ah-quick-action"
              onClick={() => void triggerScan()}
              disabled={state.scanning}
            >
              <span className="ah-qa-ic">
                <RefreshCw size={14} strokeWidth={1.6} />
              </span>
              <span>
                {state.scanning ? 'Scanning…' : 'Scan all repos'}
                <span className="ah-desc">
                  Rescan {repoList.length} discovery root{repoList.length === 1 ? '' : 's'}
                </span>
              </span>
              <span className="ah-kbd-mini">⌘S</span>
            </button>
            <button type="button" className="ah-quick-action" onClick={openRecs}>
              <span className="ah-qa-ic">
                <Bell size={14} strokeWidth={1.6} />
              </span>
              <span>
                Recommendations
                <span className="ah-desc">
                  {recs.data?.length ?? 0} LLM-suggested gaps
                </span>
              </span>
              <span className="ah-kbd-mini">⌘R</span>
            </button>
            <button
              type="button"
              className="ah-quick-action"
              onClick={() => void triggerJudge()}
              disabled={judging || !config.data?.llmConnected}
              title={config.data?.llmConnected ? '' : 'Set AGENT_HARNESS_LLM_PROVIDER'}
            >
              <span className="ah-qa-ic">
                <Sparkles size={14} strokeWidth={1.6} />
              </span>
              <span>
                {judging ? 'Judging…' : 'Judge with LLM'}
                <span className="ah-desc">
                  Score quality for {unscored} unscored item{unscored === 1 ? '' : 's'}
                </span>
              </span>
              <span className="ah-kbd-mini">⌘J</span>
            </button>
          </section>

          <section className="ah-section" style={{ marginTop: 24 }}>
            <h2>Provider</h2>
            <div style={{ fontSize: 12, color: 'var(--ah-fg-2)' }}>
              <div>
                LLM:{' '}
                <span style={{ color: 'var(--ah-fg-0)' }}>
                  {config.data?.llmProvider ?? 'unset'}
                </span>{' '}
                {config.data?.llmConnected ? (
                  <span style={{ color: 'oklch(0.78 0.14 145)' }}>· connected</span>
                ) : (
                  <span style={{ color: 'var(--ah-fg-4)' }}>· not configured</span>
                )}
              </div>
              <div style={{ marginTop: 4 }}>
                Latest scan:{' '}
                <span style={{ color: 'var(--ah-fg-1)' }}>
                  {scans.data?.[0]?.status ?? '—'}
                </span>
              </div>
            </div>
          </section>
        </div>
      </div>
      {scanChoices && (
        <div className="ah-dialog-overlay">
          <div className="ah-action-dialog ah-scan-dialog" role="dialog" aria-label="Confirm discovered repos">
            <div className="ah-action-head">
              <div>
                <div className="ah-action-title">Add discovered repos?</div>
                <div className="ah-action-meta">
                  <span>{scanChoices.length} auto-discovered</span>
                </div>
              </div>
              <button type="button" onClick={() => setScanChoices(null)} aria-label="Close scan dialog">
                x
              </button>
            </div>
            <div className="ah-scan-bulk">
              <button
                type="button"
                onClick={() => setApprovedRepos(new Set(scanChoices.map(r => r.path)))}
              >
                Yes to all
              </button>
              <button type="button" onClick={() => setApprovedRepos(new Set())}>
                No to all
              </button>
            </div>
            <div className="ah-scan-repos">
              {scanChoices.map(repo => {
                const approved = approvedRepos.has(repo.path)
                return (
                  <div key={repo.path} className="ah-scan-repo">
                    <span>{repo.path}</span>
                    <button
                      type="button"
                      className={approved ? 'on' : ''}
                      onClick={() =>
                        setApprovedRepos(prev => {
                          const next = new Set(prev)
                          next.add(repo.path)
                          return next
                        })
                      }
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      className={!approved ? 'on' : ''}
                      onClick={() =>
                        setApprovedRepos(prev => {
                          const next = new Set(prev)
                          next.delete(repo.path)
                          return next
                        })
                      }
                    >
                      No
                    </button>
                  </div>
                )
              })}
            </div>
            <div className="ah-dialog-footer">
              <button type="button" onClick={() => setScanChoices(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="primary"
                onClick={() => {
                  const approved = Array.from(approvedRepos)
                  setScanChoices(null)
                  void startScan(approved)
                }}
              >
                Start scan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
