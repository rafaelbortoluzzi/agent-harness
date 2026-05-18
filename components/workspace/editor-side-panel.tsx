'use client'
import useSWR from 'swr'
import { useState } from 'react'
import type { PanelItem } from '@/components/item-side-panel'
import { useWorkspace } from '@/lib/workspace/store'

const fetcher = (u: string) => fetch(u).then(r => r.json())

interface SnoozeState {
  snooze: { itemId: string; reason: string | null; untilDate: string | null } | null
}

interface Config {
  llmConnected: boolean
  llmEditorConnected: boolean
}

export function EditorSidePanel({ item }: { item: PanelItem }) {
  const { data: config } = useSWR<Config>('/api/config', fetcher)
  const { data: snooze, mutate: mutateSnooze } = useSWR<SnoozeState>(
    `/api/snooze?itemId=${encodeURIComponent(item.id)}`,
    fetcher,
  )
  const { closeTab } = useWorkspace()
  const [snoozing, setSnoozing] = useState(false)
  const [editing, setEditing] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [streamed, setStreamed] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [applying, setApplying] = useState(false)
  const [applied, setApplied] = useState(false)

  const judged = item.qualityScore !== null && item.qualityScore !== undefined
  const scorePct = judged ? Math.min(100, Math.max(0, (item.qualityScore! / 10) * 100)) : 0

  const snoozeFor = async (days: number) => {
    setSnoozing(true)
    try {
      await fetch('/api/snooze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: item.id, days }),
      })
      await mutateSnooze()
    } finally {
      setSnoozing(false)
    }
  }

  const unsnooze = async () => {
    setSnoozing(true)
    try {
      await fetch(`/api/snooze?itemId=${encodeURIComponent(item.id)}`, { method: 'DELETE' })
      await mutateSnooze()
    } finally {
      setSnoozing(false)
    }
  }

  const runStream = async () => {
    if (!prompt.trim()) return
    setStreaming(true)
    setStreamed('')
    setEditError(null)
    setApplied(false)
    try {
      const resp = await fetch('/api/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: item.id, prompt }),
      })
      if (!resp.ok || !resp.body) {
        const j = await resp.json().catch(() => ({}))
        setEditError(j.error ?? `HTTP ${resp.status}`)
        return
      }
      const reader = resp.body.getReader()
      const dec = new TextDecoder()
      let buf = ''
      let acc = ''
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.trim()) continue
          try {
            const chunk = JSON.parse(line) as { type: string; text?: string; error?: string }
            if (chunk.type === 'text' && chunk.text) {
              acc += chunk.text
              setStreamed(acc)
            } else if (chunk.type === 'error') {
              setEditError(chunk.error ?? 'stream error')
            }
          } catch {
            // ignore parse errors on partial line
          }
        }
      }
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'stream failed')
    } finally {
      setStreaming(false)
    }
  }

  const apply = async () => {
    if (!streamed) return
    setApplying(true)
    setEditError(null)
    try {
      const resp = await fetch('/api/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: item.id, content: streamed, apply: true }),
      })
      if (!resp.ok) {
        const j = await resp.json().catch(() => ({}))
        setEditError(j.error ?? `HTTP ${resp.status}`)
        return
      }
      setApplied(true)
      setEditing(false)
      setStreamed('')
      setPrompt('')
      // editor key uses mtime; saving updates mtime, file reloads
      window.dispatchEvent(new CustomEvent('ah:file-applied', { detail: item.id }))
    } finally {
      setApplying(false)
    }
  }

  return (
    <aside className="ah-side-panel" aria-label="Side panel">
      <div className="ah-side-section">
        <h4>Metadata</h4>
        <dl className="ah-kv">
          <dt>name</dt>
          <dd>{item.name}</dd>
          <dt>type</dt>
          <dd>{item.type}</dd>
          <dt>runtime</dt>
          <dd>{item.runtime}</dd>
          <dt>scope</dt>
          <dd>{item.scope}</dd>
          <dt>path</dt>
          <dd>{item.path}</dd>
        </dl>
      </div>

      <div className="ah-side-section">
        <h4>Health</h4>
        <div style={{ fontSize: 11, color: 'var(--ah-fg-2)' }}>
          <span style={{ color: 'var(--ah-fg-0)' }}>{item.health}</span>
          {item.issues.length > 0 && (
            <ul style={{ margin: '6px 0 0 16px', padding: 0, color: 'var(--ah-fg-2)' }}>
              {item.issues.map((iss, i) => (
                <li key={i} style={{ fontSize: 11, marginBottom: 2 }}>
                  {iss}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="ah-side-section">
        <h4>LLM Judge</h4>
        {judged ? (
          <>
            <div className="ah-score-bar">
              <span>{item.qualityScore!.toFixed(1)}/10</span>
              <span className="ah-bar">
                <span className="ah-bar-fill" style={{ width: `${scorePct}%` }} />
              </span>
            </div>
            {item.qualityRationale && <blockquote>{item.qualityRationale}</blockquote>}
          </>
        ) : (
          <div style={{ fontSize: 11, color: 'var(--ah-fg-4)' }}>
            Unscored. Run judge from Tab bar.
          </div>
        )}
      </div>

      <div className="ah-side-section">
        <h4>Edit with Claude</h4>
        {!config?.llmEditorConnected ? (
          <div style={{ fontSize: 11, color: 'var(--ah-fg-4)' }}>
            Set <code>ANTHROPIC_API_KEY</code> to enable streaming edits.
          </div>
        ) : !editing ? (
          <button
            type="button"
            onClick={() => setEditing(true)}
            style={{
              width: '100%',
              background: 'var(--ah-bg-5)',
              border: '1px solid var(--ah-line-3)',
              color: 'var(--ah-fg-0)',
              padding: '6px 10px',
              fontFamily: 'inherit',
              fontSize: 11,
              cursor: 'pointer',
              borderRadius: 2,
            }}
          >
            Open editor
          </button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <textarea
              className="allow-shortcuts"
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="What should I change?"
              rows={3}
              style={{
                background: 'var(--ah-bg-1)',
                border: '1px solid var(--ah-line-2)',
                color: 'var(--ah-fg-0)',
                fontFamily: 'var(--ah-font)',
                fontSize: 11,
                padding: 6,
                outline: 'none',
                resize: 'vertical',
                borderRadius: 2,
              }}
            />
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                type="button"
                onClick={() => void runStream()}
                disabled={streaming || !prompt.trim()}
                style={{
                  flex: 1,
                  background: 'var(--ah-bg-5)',
                  border: '1px solid var(--ah-line-3)',
                  color: 'var(--ah-fg-0)',
                  padding: '4px 8px',
                  fontFamily: 'inherit',
                  fontSize: 11,
                  cursor: streaming ? 'not-allowed' : 'pointer',
                  borderRadius: 2,
                  opacity: streaming || !prompt.trim() ? 0.5 : 1,
                }}
              >
                {streaming ? 'Streaming…' : 'Run'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(false)
                  setStreamed('')
                  setPrompt('')
                  setEditError(null)
                }}
                disabled={streaming || applying}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--ah-line)',
                  color: 'var(--ah-fg-3)',
                  padding: '4px 8px',
                  fontFamily: 'inherit',
                  fontSize: 11,
                  cursor: 'pointer',
                  borderRadius: 2,
                }}
              >
                Cancel
              </button>
            </div>
            {editError && (
              <div style={{ fontSize: 10, color: 'var(--ah-red)' }}>{editError}</div>
            )}
            {applied && (
              <div style={{ fontSize: 10, color: 'oklch(0.78 0.14 145)' }}>✓ applied</div>
            )}
            {streamed && (
              <>
                <pre
                  style={{
                    background: 'var(--ah-bg-1)',
                    border: '1px solid var(--ah-line)',
                    padding: 6,
                    maxHeight: 180,
                    overflow: 'auto',
                    fontSize: 10,
                    color: 'var(--ah-fg-1)',
                    margin: 0,
                    whiteSpace: 'pre-wrap',
                    borderRadius: 2,
                  }}
                >
                  {streamed}
                </pre>
                <button
                  type="button"
                  onClick={() => void apply()}
                  disabled={applying || streaming}
                  style={{
                    background: 'var(--ah-bg-6)',
                    border: '1px solid var(--ah-line-3)',
                    color: 'var(--ah-fg-0)',
                    padding: '4px 8px',
                    fontFamily: 'inherit',
                    fontSize: 11,
                    cursor: applying ? 'not-allowed' : 'pointer',
                    borderRadius: 2,
                  }}
                >
                  {applying ? 'Applying…' : 'Apply to file'}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <div className="ah-side-section">
        <h4>Actions</h4>
        <div className="ah-side-actions">
          {snooze?.snooze ? (
            <button type="button" onClick={() => void unsnooze()} disabled={snoozing}>
              Unsnooze
            </button>
          ) : (
            <>
              <button type="button" onClick={() => void snoozeFor(7)} disabled={snoozing}>
                Snooze 7d
              </button>
              <button type="button" onClick={() => void snoozeFor(30)} disabled={snoozing}>
                Snooze 30d
              </button>
            </>
          )}
          <button type="button" onClick={() => closeTab(item.id)}>
            Close tab
          </button>
        </div>
      </div>
    </aside>
  )
}
