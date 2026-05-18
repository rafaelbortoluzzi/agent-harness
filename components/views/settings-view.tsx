'use client'
import useSWR from 'swr'
import { useEffect, useMemo, useState } from 'react'
import {
  DEFAULT_BINDINGS,
  eventToCombo,
  formatCombo,
  loadBindings,
  saveBindings,
  type Binding,
} from '@/lib/keyboard/bindings'

interface Config {
  roots: string[]
  explicitRepos: string[]
  discoveryDepth: number
  respectGitignore: boolean
  healthWeights: Record<string, number>
  llmConnected: boolean
  llmEditorConnected: boolean
  llmProvider: string
  llmProviders: LlmProviderStatus[]
}

interface LlmProviderStatus {
  id: string
  displayName: string
  kind: 'CLI' | 'API'
  selected: boolean
  available: boolean
  reason: string
}

interface LlmTestResult {
  ok: boolean
  provider: string
  output?: string
  error?: string
}

const fetcher = (u: string) => fetch(u).then(r => r.json())

function ShortcutsSection() {
  const [bindings, setBindingsState] = useState<Binding[]>(DEFAULT_BINDINGS)
  const [recording, setRecording] = useState<string | null>(null)

  useEffect(() => {
    // Hydrate from localStorage after mount to avoid SSR/client mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBindingsState(loadBindings())
  }, [])

  const updateBinding = (id: string, keys: string[]) => {
    setBindingsState(prev => {
      const next = prev.map(b => (b.id === id ? { ...b, keys } : b))
      saveBindings(next)
      return next
    })
  }

  useEffect(() => {
    if (!recording) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        setRecording(null)
        return
      }
      const combo = eventToCombo(e)
      if (!combo) return
      e.preventDefault()
      e.stopPropagation()
      updateBinding(recording, [combo])
      setRecording(null)
    }
    window.addEventListener('keydown', onKey, { capture: true })
    return () => window.removeEventListener('keydown', onKey, { capture: true } as EventListenerOptions)
  }, [recording])

  const reset = (id: string) => {
    const def = DEFAULT_BINDINGS.find(b => b.id === id)
    if (def) updateBinding(id, def.keys)
  }

  const groups = useMemo(() => {
    const by = new Map<string, Binding[]>()
    for (const b of bindings) {
      if (!by.has(b.group)) by.set(b.group, [])
      by.get(b.group)!.push(b)
    }
    return by
  }, [bindings])

  return (
    <div className="ah-settings-section">
      <h2>Keyboard shortcuts</h2>
      <p style={{ fontSize: 11, color: 'var(--ah-fg-3)', margin: '0 0 12px' }}>
        Saved per-browser in localStorage (<code>ah_bindings_v1</code>). Esc cancels recording.
      </p>
      {[...groups.entries()].map(([group, items]) => (
        <div key={group} style={{ marginBottom: 16 }}>
          <div
            style={{
              fontSize: 10,
              letterSpacing: '0.18em',
              color: 'var(--ah-fg-4)',
              textTransform: 'uppercase',
              marginBottom: 6,
            }}
          >
            {group}
          </div>
          <div className="ah-kb-table">
            {items.map(b => (
              <div key={b.id} style={{ display: 'contents' }}>
                <span className="ah-kb-label">{b.label}</span>
                <button
                  type="button"
                  className={recording === b.id ? 'recording' : ''}
                  onClick={() => setRecording(b.id)}
                  style={{ minWidth: 100 }}
                >
                  {recording === b.id
                    ? 'recording…'
                    : b.keys.map(formatCombo).join(' · ') || '—'}
                </button>
                <button
                  type="button"
                  onClick={() => reset(b.id)}
                  title="Reset to default"
                >
                  reset
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export function SettingsView() {
  const { data: cfg, mutate } = useSWR<Config>('/api/config', fetcher)
  const [newRoot, setNewRoot] = useState('')
  const [newRepo, setNewRepo] = useState('')
  const [saved, setSaved] = useState(false)
  const [testingProvider, setTestingProvider] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<Record<string, LlmTestResult>>({})

  const save = async (partial: Partial<Config>) => {
    await fetch('/api/config', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(partial),
    })
    await mutate()
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  const testProvider = async (provider: string) => {
    setTestingProvider(provider)
    const response = await fetch('/api/config/llm-test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider }),
    })
    const result = (await response.json()) as LlmTestResult
    setTestResults(prev => ({ ...prev, [provider]: result }))
    setTestingProvider(null)
  }

  if (!cfg) {
    return (
      <div className="ah-settings">
        <p style={{ fontSize: 12, color: 'var(--ah-fg-4)' }}>Loading…</p>
      </div>
    )
  }

  return (
    <div className="ah-settings">
      <h1>Settings</h1>
      <p className="ah-sub">
        Local configuration · stored in <code>~/.agent-harness/config.json</code>
        {saved && <span style={{ color: 'oklch(0.78 0.14 145)', marginLeft: 12 }}>✓ saved</span>}
      </p>

      <section className="ah-settings-section">
        <h2>Auto-discovery roots</h2>
        <p style={{ fontSize: 11, color: 'var(--ah-fg-3)', margin: '0 0 10px' }}>
          Directories scanned for repos with CLAUDE.md, AGENTS.md, .claude, or .codex. Depth:{' '}
          {cfg.discoveryDepth}.
        </p>
        {cfg.roots.map(root => (
          <div key={root} className="ah-settings-row">
            <span className="ah-path">{root}</span>
            <button
              type="button"
              onClick={() => save({ roots: cfg.roots.filter(r => r !== root) })}
            >
              ✕
            </button>
          </div>
        ))}
        <div className="ah-settings-input">
          <input
            className="allow-shortcuts"
            placeholder="/Users/you/code"
            value={newRoot}
            onChange={e => setNewRoot(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && newRoot.trim()) {
                save({ roots: [...cfg.roots, newRoot.trim()] })
                setNewRoot('')
              }
            }}
          />
          <button
            type="button"
            className="primary"
            onClick={() => {
              if (newRoot.trim()) {
                save({ roots: [...cfg.roots, newRoot.trim()] })
                setNewRoot('')
              }
            }}
          >
            Add
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
          <label style={{ fontSize: 12, color: 'var(--ah-fg-2)' }}>Depth:</label>
          <input
            type="number"
            className="ah-input allow-shortcuts"
            min={1}
            max={6}
            style={{ width: 60, flex: 'unset' }}
            value={cfg.discoveryDepth}
            onChange={e => save({ discoveryDepth: Number(e.target.value) })}
          />
        </div>
      </section>

      <section className="ah-settings-section">
        <h2>Explicit repos</h2>
        <p style={{ fontSize: 11, color: 'var(--ah-fg-3)', margin: '0 0 10px' }}>
          Always-included paths regardless of marker files.
        </p>
        {cfg.explicitRepos.map(repo => (
          <div key={repo} className="ah-settings-row">
            <span className="ah-path">{repo}</span>
            <button
              type="button"
              onClick={() =>
                save({ explicitRepos: cfg.explicitRepos.filter(r => r !== repo) })
              }
            >
              ✕
            </button>
          </div>
        ))}
        <div className="ah-settings-input">
          <input
            className="allow-shortcuts"
            placeholder="/Users/you/code/my-repo"
            value={newRepo}
            onChange={e => setNewRepo(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && newRepo.trim()) {
                save({ explicitRepos: [...cfg.explicitRepos, newRepo.trim()] })
                setNewRepo('')
              }
            }}
          />
          <button
            type="button"
            className="primary"
            onClick={() => {
              if (newRepo.trim()) {
                save({ explicitRepos: [...cfg.explicitRepos, newRepo.trim()] })
                setNewRepo('')
              }
            }}
          >
            Add
          </button>
        </div>
      </section>

      <section className="ah-settings-section">
        <h2>LLM provider</h2>
        <p style={{ fontSize: 11, color: 'var(--ah-fg-3)', margin: '0 0 10px' }}>
          Provider choice is saved locally. API keys stay in environment variables only.
        </p>
        <div className="ah-provider-list">
          {(cfg.llmProviders ?? []).map(provider => {
            const result = testResults[provider.id]
            return (
              <div
                key={provider.id}
                className={`ah-provider-row${provider.selected ? ' on' : ''}`}
              >
                <span
                  className={`ah-provider-dot${provider.available ? ' ok' : ''}`}
                  aria-hidden="true"
                />
                <div className="ah-provider-main">
                  <div className="ah-provider-name">
                    <span>{provider.displayName}</span>
                    <code>{provider.id}</code>
                    <small>{provider.kind}</small>
                  </div>
                  <div className="ah-provider-reason">
                    {provider.selected ? 'Selected · ' : ''}
                    {provider.reason}
                    {result && (
                      <span className={result.ok ? 'ok' : 'bad'}>
                        {' '}
                        · Test {result.ok ? `ok: ${result.output ?? 'connected'}` : result.error}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={provider.selected}
                  onClick={() => save({ llmProvider: provider.id } as Partial<Config>)}
                >
                  {provider.selected ? 'Using' : 'Use'}
                </button>
                <button
                  type="button"
                  disabled={testingProvider === provider.id}
                  onClick={() => testProvider(provider.id)}
                >
                  {testingProvider === provider.id ? 'Testing…' : 'Test'}
                </button>
              </div>
            )
          })}
        </div>
        {!cfg.llmEditorConnected && (
          <p style={{ fontSize: 11, color: 'var(--ah-fg-4)', marginTop: 6 }}>
            Editor streaming needs <code>ANTHROPIC_API_KEY</code>.
          </p>
        )}
      </section>

      <ShortcutsSection />
    </div>
  )
}
