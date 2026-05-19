'use client'
import { useState } from 'react'
import useSWR from 'swr'
import { RetroModal } from './retro-modal'
import { useWorkspace } from '@/lib/workspace/store'
import type { PanelItem } from '@/components/item-side-panel'

const fetcher = (u: string) => fetch(u).then(r => r.json())

interface Recommendation {
  id: string
  repoPath: string
  kind: string
  name: string
  rationale: string
  createdAt: string
}

export function RetroRecsModal({ onClose }: { onClose: () => void }) {
  const { data } = useSWR<Recommendation[]>('/api/recommendations', fetcher)
  const recs = data ?? []

  return (
    <RetroModal title="Recommendations" onClose={onClose} width={600}>
      {recs.length === 0 ? (
        <p style={{ color: '#6b675d', padding: 12 }}>No recommendations yet. Run Scan to generate.</p>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {recs.map(r => (
            <li
              key={r.id}
              style={{
                padding: '8px 10px',
                borderBottom: '1px dotted #d8d4ca',
                display: 'flex',
                gap: 10,
              }}
            >
              <span
                style={{
                  fontWeight: 700,
                  fontSize: 11,
                  minWidth: 60,
                  textTransform: 'uppercase',
                  color: '#6b675d',
                }}
              >
                {r.kind}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700 }}>{r.name}</div>
                <div style={{ fontSize: 11, color: '#4a4740' }}>{r.rationale}</div>
                <div style={{ fontSize: 10, color: '#6b675d', marginTop: 2 }}>{r.repoPath}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </RetroModal>
  )
}

interface ScanRow {
  id: string
  startedAt: string
  finishedAt: string | null
  reposScanned: number | null
  itemsFound: number | null
  itemsBroken: number | null
  itemsNew: number | null
  itemsRemoved: number | null
  itemsChanged: number | null
  status: 'running' | 'done' | 'error'
}

export function RetroScanLogModal({ onClose }: { onClose: () => void }) {
  const { data } = useSWR<ScanRow[]>('/api/registry?resource=scans', fetcher)
  const scans = data ?? []
  return (
    <RetroModal title="Scan Log" onClose={onClose} width={700}>
      {scans.length === 0 ? (
        <p style={{ padding: 12, color: '#6b675d' }}>No scans yet.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr style={{ background: 'var(--rs-chrome-hi)', textAlign: 'left' }}>
              {['Started', 'Status', 'Repos', 'Found', 'New', 'Removed', 'Changed', 'Broken'].map(
                h => (
                  <th key={h} style={{ padding: '2px 6px', borderRight: '1px solid #8e887b' }}>
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {scans.map(s => (
              <tr key={s.id} style={{ borderBottom: '1px dotted #d8d4ca' }}>
                <td style={{ padding: '2px 6px', fontFamily: 'var(--font-plex-mono)' }}>
                  {new Date(s.startedAt).toLocaleString()}
                </td>
                <td
                  style={{
                    padding: '2px 6px',
                    color: s.status === 'error' ? '#b22222' : s.status === 'running' ? '#1f7a3a' : undefined,
                  }}
                >
                  {s.status}
                </td>
                <td style={{ padding: '2px 6px' }}>{s.reposScanned ?? '—'}</td>
                <td style={{ padding: '2px 6px' }}>{s.itemsFound ?? '—'}</td>
                <td style={{ padding: '2px 6px' }}>{s.itemsNew ?? '—'}</td>
                <td style={{ padding: '2px 6px' }}>{s.itemsRemoved ?? '—'}</td>
                <td style={{ padding: '2px 6px' }}>{s.itemsChanged ?? '—'}</td>
                <td style={{ padding: '2px 6px', color: (s.itemsBroken ?? 0) > 0 ? '#b22222' : undefined }}>
                  {s.itemsBroken ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </RetroModal>
  )
}

interface SnoozedRow {
  itemId: string
  reason: string | null
  snoozedAt: string
  untilDate: string | null
  name: string | null
  type: string | null
  runtime: string | null
  path: string | null
  repoPath: string | null
}

export function RetroSnoozedModal({ onClose }: { onClose: () => void }) {
  const { data, mutate } = useSWR<{ snoozed: SnoozedRow[] }>('/api/snooze?list=true', fetcher)
  const { openEditor } = useWorkspace()
  const rows = data?.snoozed ?? []

  const unsnooze = async (itemId: string) => {
    await fetch('/api/snooze', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId }),
    })
    await mutate()
  }

  return (
    <RetroModal title="Snoozed Items" onClose={onClose} width={520}>
      {rows.length === 0 ? (
        <p style={{ padding: 12, color: '#6b675d' }}>
          No snoozed items.
        </p>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {rows.map(r => (
            <li
              key={r.itemId}
              style={{
                padding: '8px 10px',
                borderBottom: '1px dotted #d8d4ca',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700 }}>{r.name ?? r.itemId}</div>
                <div style={{ fontSize: 10, color: '#6b675d' }}>
                  {r.type ?? '—'} · snoozed {new Date(r.snoozedAt).toLocaleDateString()}
                  {r.untilDate ? ` · until ${new Date(r.untilDate).toLocaleDateString()}` : ''}
                </div>
                {r.reason && <div style={{ fontSize: 11, color: '#4a4740' }}>{r.reason}</div>}
              </div>
              <button
                type="button"
                onClick={() => {
                  if (r.name && r.type && r.path) {
                    openEditor({ id: r.itemId, name: r.name, type: r.type, path: r.path })
                    onClose()
                  }
                }}
                disabled={!r.path || !r.name}
                style={{
                  padding: '2px 10px',
                  background: 'var(--rs-chrome)',
                  border: '2px solid',
                  borderColor: 'var(--rs-chrome-hi) var(--rs-chrome-shadow) var(--rs-chrome-shadow) var(--rs-chrome-hi)',
                  cursor: 'pointer',
                  fontSize: 11,
                }}
              >
                Open
              </button>
              <button
                type="button"
                onClick={() => unsnooze(r.itemId)}
                style={{
                  padding: '2px 10px',
                  background: 'var(--rs-chrome)',
                  border: '2px solid',
                  borderColor: 'var(--rs-chrome-hi) var(--rs-chrome-shadow) var(--rs-chrome-shadow) var(--rs-chrome-hi)',
                  cursor: 'pointer',
                  fontSize: 11,
                }}
              >
                Unsnooze
              </button>
            </li>
          ))}
        </ul>
      )}
    </RetroModal>
  )
}

export function RetroOptionsModal({ onClose }: { onClose: () => void }) {
  const { openSettings } = useWorkspace()
  return (
    <RetroModal title="Options" onClose={onClose} width={440}>
      <div style={{ padding: 12 }}>
        <p style={{ fontSize: 11, marginBottom: 12 }}>
          Configure discovery roots, scan intervals, LLM provider, and keyboard shortcuts in the
          full Settings tab.
        </p>
        <button
          type="button"
          onClick={() => {
            openSettings()
            onClose()
          }}
          style={{
            padding: '4px 14px',
            background: 'var(--rs-chrome)',
            border: '2px solid',
            borderColor: 'var(--rs-chrome-hi) var(--rs-chrome-shadow) var(--rs-chrome-shadow) var(--rs-chrome-hi)',
            boxShadow: 'inset 1px 1px 0 #fff, inset -1px -1px 0 var(--rs-chrome-deep)',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Open Settings
        </button>
      </div>
    </RetroModal>
  )
}

function HealthPill({ health }: { health: 'ok' | 'warning' | 'broken' }) {
  const color =
    health === 'broken' ? '#b22222' : health === 'warning' ? '#8a6500' : '#1f7a3a'
  return (
    <span
      style={{
        padding: '1px 8px',
        background: 'var(--rs-chrome-hi)',
        border: `1px solid ${color}`,
        color,
        fontSize: 10,
        fontWeight: 700,
        textTransform: 'uppercase',
      }}
    >
      {health}
    </span>
  )
}

function ScoreBar({ score }: { score: number | null | undefined }) {
  if (score == null) return <span style={{ color: '#6b675d' }}>—</span>
  const pct = Math.max(0, Math.min(100, score))
  const color = score >= 7 ? '#1f7a3a' : score >= 5 ? '#cc8a00' : '#b22222'
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span
        style={{
          width: 60,
          height: 8,
          background: 'var(--rs-chrome-hi)',
          border: '1px solid var(--rs-chrome-shadow)',
          position: 'relative',
        }}
      >
        <span
          style={{
            position: 'absolute',
            inset: 0,
            width: `${pct * 10}%`,
            background: color,
          }}
        />
      </span>
      <span style={{ fontFamily: 'var(--font-plex-mono)' }}>{score.toFixed(1)}</span>
    </span>
  )
}

export function RetroPropsModal({
  item,
  onClose,
  onChanged,
}: {
  item: PanelItem
  onClose: () => void
  onChanged?: () => void
}) {
  const [days, setDays] = useState(7)
  const [reason, setReason] = useState('')

  const snooze = async () => {
    await fetch('/api/snooze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId: item.id, days, reason }),
    })
    onChanged?.()
    onClose()
  }

  return (
    <RetroModal title={`${item.name} — Properties`} onClose={onClose} width={520}>
      <div style={{ padding: 4, fontSize: 11, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Row label="Name" value={item.name} />
        <Row label="Type" value={item.type} />
        <Row label="Runtime" value={item.runtime} />
        <Row label="Scope" value={item.scope} />
        <Row label="Path" value={item.path} mono />
        <Row label="Repo" value={item.repoPath ?? '—'} mono />
        <Row label="Health" value={<HealthPill health={item.health} />} />
        {item.issues.length > 0 && (
          <Row
            label="Issues"
            value={
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {item.issues.map((iss, i) => (
                  <li key={i} style={{ color: '#b22222' }}>
                    {iss}
                  </li>
                ))}
              </ul>
            }
          />
        )}
        <Row label="Score" value={<ScoreBar score={item.qualityScore ?? null} />} />
        {item.qualityRationale && (
          <Row
            label="Rationale"
            value={
              <blockquote
                style={{
                  margin: 0,
                  padding: '6px 10px',
                  background: 'var(--rs-chrome-hi)',
                  borderLeft: '3px solid var(--rs-chrome-shadow)',
                  fontStyle: 'italic',
                  color: '#4a4740',
                }}
              >
                {item.qualityRationale}
              </blockquote>
            }
          />
        )}
        <Row label="Scanned" value={new Date(item.scannedAt).toLocaleString()} />
        {item.judgedAt && <Row label="Judged" value={new Date(item.judgedAt).toLocaleString()} />}

        <div
          style={{
            marginTop: 10,
            padding: '8px 10px',
            background: 'var(--rs-chrome-hi)',
            border: '1px solid var(--rs-chrome-shadow)',
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Snooze</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              For
              <input
                type="number"
                min={0}
                value={days}
                onChange={e => setDays(Number(e.target.value) || 0)}
                style={{ width: 50 }}
              />
              days
            </label>
            <input
              type="text"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="reason (optional)"
              style={{ flex: 1, minWidth: 140 }}
            />
            <button
              type="button"
              onClick={snooze}
              style={{
                padding: '2px 12px',
                background: 'var(--rs-chrome)',
                border: '2px solid',
                borderColor: 'var(--rs-chrome-hi) var(--rs-chrome-shadow) var(--rs-chrome-shadow) var(--rs-chrome-hi)',
                cursor: 'pointer',
                fontWeight: 700,
              }}
            >
              Snooze
            </button>
          </div>
        </div>
      </div>
    </RetroModal>
  )
}

function Row({
  label,
  value,
  mono,
}: {
  label: string
  value: React.ReactNode
  mono?: boolean
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: 8, alignItems: 'start' }}>
      <span style={{ fontWeight: 700, color: '#4a4740' }}>{label}</span>
      <span style={{ fontFamily: mono ? 'var(--font-plex-mono), monospace' : undefined, wordBreak: 'break-all' }}>
        {value}
      </span>
    </div>
  )
}

export function RetroJudgeModal({
  unscoredCount,
  onClose,
  onStarted,
}: {
  unscoredCount: number
  onClose: () => void
  onStarted?: () => void
}) {
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const estimateSec = Math.max(2, unscoredCount * 3)

  const start = async () => {
    setRunning(true)
    setError(null)
    try {
      const resp = await fetch('/api/judge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (!resp.ok) {
        const j = await resp.json().catch(() => ({}))
        setError(j.error ?? `HTTP ${resp.status}`)
        setRunning(false)
        return
      }
      onStarted?.()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'judge failed')
      setRunning(false)
    }
  }

  return (
    <RetroModal title="Judge with LLM" onClose={onClose} width={440}>
      <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <p style={{ fontSize: 12, margin: 0 }}>
          <strong>{unscoredCount}</strong> unscored items will be sent to the configured LLM
          provider for evaluation.
        </p>
        <p style={{ fontSize: 11, color: '#6b675d', margin: 0 }}>
          Estimated time: ~{estimateSec}s · cost varies by provider.
        </p>
        {error && (
          <p style={{ fontSize: 11, color: '#b22222', margin: 0 }}>
            <strong>Error:</strong> {error}
          </p>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button
            type="button"
            onClick={onClose}
            disabled={running}
            style={{
              padding: '4px 14px',
              background: 'var(--rs-chrome)',
              border: '2px solid',
              borderColor: 'var(--rs-chrome-hi) var(--rs-chrome-shadow) var(--rs-chrome-shadow) var(--rs-chrome-hi)',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={start}
            disabled={running || unscoredCount === 0}
            style={{
              padding: '4px 14px',
              background: 'var(--rs-chrome)',
              border: '2px solid',
              borderColor: 'var(--rs-chrome-hi) var(--rs-chrome-shadow) var(--rs-chrome-shadow) var(--rs-chrome-hi)',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {running ? 'Judging…' : 'Start Judging'}
          </button>
        </div>
      </div>
    </RetroModal>
  )
}

export function RetroAboutModal({ onClose }: { onClose: () => void }) {
  return (
    <RetroModal title="About Agent Harness" onClose={onClose} width={460}>
      <div style={{ display: 'flex', gap: 14, padding: 4 }}>
        <div
          style={{
            width: 64,
            height: 64,
            background: 'linear-gradient(135deg, #f4c243, #d6720a)',
            color: '#000',
            fontFamily: 'var(--font-vt323), monospace',
            fontSize: 36,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid #4a2f06',
          }}
        >
          AH
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>Agent Harness</div>
          <div style={{ fontSize: 11, color: '#6b675d', marginTop: 2 }}>v0.0.0-dev · retro skin</div>
          <p style={{ fontSize: 11, marginTop: 8, lineHeight: 1.5 }}>
            Local-first manager for AI agent runtimes. Scans your repos for skills, agents, hooks,
            and rules; judges them with an LLM; surfaces recommendations.
          </p>
        </div>
      </div>
    </RetroModal>
  )
}

export function RetroHelpModal({ onClose }: { onClose: () => void }) {
  const rows: [string, string][] = [
    ['F1 / ?', 'Help'],
    ['F9', 'Scan'],
    ['Esc', 'Close modal'],
    ['Ctrl+N', 'New skill'],
    ['Ctrl+W', 'Close tab'],
  ]
  return (
    <RetroModal title="Keyboard Shortcuts" onClose={onClose} width={440}>
      <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
        <tbody>
          {rows.map(([k, label]) => (
            <tr key={k}>
              <td
                style={{
                  padding: '2px 6px',
                  fontFamily: 'var(--font-plex-mono), monospace',
                  fontWeight: 700,
                  width: 100,
                  background: 'var(--rs-chrome-hi)',
                  border: '1px solid var(--rs-chrome-lo)',
                }}
              >
                {k}
              </td>
              <td style={{ padding: '2px 6px' }}>{label}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </RetroModal>
  )
}
