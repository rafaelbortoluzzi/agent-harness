'use client'
import useSWR from 'swr'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Anchor,
  BookOpen,
  Bot,
  FileText,
  Plug,
  Sparkles,
  TerminalSquare,
} from 'lucide-react'
import { useWorkspace } from '@/lib/workspace/store'
import type { PanelItem } from '@/components/item-side-panel'

const fetcher = (u: string) => fetch(u).then(r => r.json())

const TYPE_ICON: Record<string, typeof Sparkles> = {
  skill: Sparkles,
  agent: Bot,
  hook: Anchor,
  mcp: Plug,
  rule: BookOpen,
  command: TerminalSquare,
  prompt: FileText,
}

interface PalResult {
  id: string
  name: string
  type: string
  hint: string
  action: () => void
}

function highlight(text: string, q: string) {
  if (!q) return text
  const lc = text.toLowerCase()
  const ql = q.toLowerCase()
  const i = lc.indexOf(ql)
  if (i < 0) return text
  return (
    <>
      {text.slice(0, i)}
      <mark>{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  )
}

export function CommandPalette() {
  const { state, setPalOpen, openEditor, openRecs, openSettings, openWelcome, setBottomTab, toggleSidebar, toggleBottom } =
    useWorkspace()
  const { palOpen } = state
  const { data: items = [] } = useSWR<PanelItem[]>(palOpen ? '/api/registry?limit=1000' : null, fetcher)

  const [q, setQ] = useState('')
  const [idx, setIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (palOpen) inputRef.current?.focus()
  }, [palOpen])

  const commands: PalResult[] = useMemo(
    () => [
      { id: 'cmd:welcome', name: 'Open Welcome', type: 'command', hint: 'tab', action: openWelcome },
      { id: 'cmd:settings', name: 'Open Settings', type: 'command', hint: 'tab', action: openSettings },
      { id: 'cmd:recs', name: 'Open Recommendations', type: 'command', hint: 'tab', action: openRecs },
      { id: 'cmd:problems', name: 'Show Problems', type: 'command', hint: 'panel', action: () => setBottomTab('problems') },
      { id: 'cmd:output', name: 'Show Output', type: 'command', hint: 'panel', action: () => setBottomTab('output') },
      { id: 'cmd:terminal', name: 'Focus Terminal', type: 'command', hint: 'panel', action: () => setBottomTab('terminal') },
      { id: 'cmd:toggle-sidebar', name: 'Toggle Sidebar', type: 'command', hint: 'panel', action: toggleSidebar },
      { id: 'cmd:toggle-bottom', name: 'Toggle Bottom Panel', type: 'command', hint: 'panel', action: toggleBottom },
    ],
    [openWelcome, openSettings, openRecs, setBottomTab, toggleSidebar, toggleBottom],
  )

  const results: PalResult[] = useMemo(() => {
    const ql = q.toLowerCase().trim()
    const itemResults: PalResult[] = items.map(i => ({
      id: i.id,
      name: i.name,
      type: i.type,
      hint: i.repoPath?.split('/').pop() ?? '',
      action: () => openEditor({ id: i.id, name: i.name, type: i.type, path: i.path }),
    }))
    if (!ql) {
      return [...commands, ...itemResults.slice(0, 30)]
    }
    const matches = (r: PalResult) =>
      r.name.toLowerCase().includes(ql) ||
      r.type.toLowerCase().includes(ql) ||
      r.hint.toLowerCase().includes(ql)
    return [...commands.filter(matches), ...itemResults.filter(matches).slice(0, 40)]
  }, [q, items, commands, openEditor])


  const close = () => setPalOpen(false)

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      close()
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setIdx(i => Math.min(i + 1, results.length - 1))
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setIdx(i => Math.max(i - 1, 0))
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      const r = results[idx]
      if (r) {
        r.action()
        close()
      }
    }
  }

  if (!palOpen) return null

  return (
    <div
      className="ah-pal-overlay"
      onClick={e => {
        if (e.target === e.currentTarget) close()
      }}
    >
      <div className="ah-pal" role="dialog" aria-label="Command palette">
        <div className="ah-pal-in">
          <span className="ah-gt">&gt;</span>
          <input
            ref={inputRef}
            className="allow-shortcuts"
            value={q}
            onChange={e => {
              setQ(e.target.value)
              setIdx(0)
            }}
            onKeyDown={onKey}
            placeholder="Type to search · commands or items"
            spellCheck={false}
            autoComplete="off"
          />
          <span className="ah-esc">ESC</span>
        </div>
        <div className="ah-pal-results">
          {results.map((r, i) => {
            const Icon = r.type === 'command' ? Sparkles : (TYPE_ICON[r.type] ?? FileText)
            return (
              <div
                key={r.id}
                className={`ah-pal-r${i === idx ? ' on' : ''}`}
                onMouseEnter={() => setIdx(i)}
                onClick={() => {
                  r.action()
                  close()
                }}
              >
                <span>
                  <Icon size={11} strokeWidth={1.5} />
                </span>
                <span>
                  {highlight(r.name, q)}
                  <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--ah-fg-4)' }}>
                    {r.type}
                  </span>
                </span>
                <span className="ah-pal-meta">{r.hint}</span>
              </div>
            )
          })}
          {results.length === 0 && (
            <div style={{ padding: '30px 16px', textAlign: 'center', color: 'var(--ah-fg-4)', fontSize: 12 }}>
              no matches
            </div>
          )}
        </div>
        <div className="ah-pal-footer">
          <span>
            <kbd>↑↓</kbd> navigate
          </span>
          <span>
            <kbd>↵</kbd> open
          </span>
          <span style={{ marginLeft: 'auto' }}>{results.length} results</span>
        </div>
      </div>
    </div>
  )
}
