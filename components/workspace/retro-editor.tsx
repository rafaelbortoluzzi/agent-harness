'use client'
import { useEffect, useReducer } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { markdown } from '@codemirror/lang-markdown'
import { yaml } from '@codemirror/lang-yaml'
import type { Extension } from '@codemirror/state'
import { retroExtension } from './retro-codemirror-theme'
import {
  editorReducer,
  effectiveStatus,
  initialEditorState,
} from '@/lib/workspace/retro-editor-state'

interface Props {
  source: string
  runtime: string
  path?: string
  tabId?: string
  scanlines?: boolean
  onSaved?: () => void
}

function languageFor(path?: string): Extension | null {
  if (!path) return markdown()
  const lower = path.toLowerCase()
  if (lower.endsWith('.yml') || lower.endsWith('.yaml') || lower.endsWith('.toml')) {
    return yaml()
  }
  return markdown()
}

export function RetroEditor({ source, runtime, path, tabId, scanlines = true, onSaved }: Props) {
  const [state, dispatch] = useReducer(editorReducer, initialEditorState)

  useEffect(() => {
    dispatch({ type: 'hydrate', body: source })
  }, [source])

  const status = effectiveStatus(state)
  const byteCount = state.body.length
  const lineCount = state.body.split('\n').length

  const save = async () => {
    if (!tabId) return
    dispatch({ type: 'saving' })
    try {
      const resp = await fetch(`/api/file?id=${encodeURIComponent(tabId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: state.body }),
      })
      if (!resp.ok) {
        const j = await resp.json().catch(() => ({}))
        dispatch({ type: 'error', message: j.error ?? `HTTP ${resp.status}` })
        return
      }
      dispatch({ type: 'saved' })
      onSaved?.()
    } catch (err) {
      dispatch({ type: 'error', message: err instanceof Error ? err.message : 'save failed' })
    }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        const target = e.target as HTMLElement | null
        if (!target?.closest?.('.cm-editor')) return
        e.preventDefault()
        if (status === 'dirty') void save()
      }
      if (e.key === 'F2') {
        e.preventDefault()
        if (status === 'dirty') void save()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, state.body, tabId])

  const lang = languageFor(path)
  const extensions: Extension[] = [...retroExtension]
  if (lang) extensions.push(lang)

  const statusBlurb = (() => {
    switch (status) {
      case 'dirty':
        return '● unsaved'
      case 'saving':
        return '⟳ saving…'
      case 'saved':
        return '✓ saved'
      case 'error':
        return `× ${state.error ?? 'error'}`
      case 'idle':
      default:
        return ''
    }
  })()

  return (
    <div
      className="retro-editor"
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        background: '#000',
        color: '#d6d2c4',
        fontFamily: 'var(--font-vt323), var(--font-plex-mono), monospace',
        fontSize: 18,
        lineHeight: 1,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
        <CodeMirror
          value={state.body}
          theme="dark"
          extensions={extensions}
          height="100%"
          basicSetup={{
            lineNumbers: true,
            foldGutter: false,
            highlightActiveLine: false,
            autocompletion: false,
          }}
          onChange={value => dispatch({ type: 'edit', body: value })}
          style={{ height: '100%' }}
          data-testid="retro-editor-cm"
        />
      </div>
      <div
        style={{
          height: 22,
          background: '#1c3a6e',
          color: '#fff',
          fontFamily: 'var(--font-vt323), monospace',
          fontSize: 16,
          padding: '1px 8px',
          display: 'flex',
          gap: 16,
          alignItems: 'center',
          borderTop: '1px solid #000',
          zIndex: 2,
          position: 'relative',
        }}
      >
        <Kbd label="F1">Help</Kbd>
        <Kbd label="F2">Save</Kbd>
        <Kbd label="F3">Find</Kbd>
        <Kbd label="F9">Run</Kbd>
        {statusBlurb && (
          <span
            style={{
              color: status === 'error' ? '#ffb0b0' : status === 'dirty' ? '#f4c243' : '#d6f5d6',
            }}
          >
            {statusBlurb}
          </span>
        )}
        <span style={{ flex: 1 }} />
        <span>
          Ln {lineCount}, Col 1 · {byteCount} bytes · {runtime}
        </span>
      </div>
      {scanlines && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            background:
              'repeating-linear-gradient(180deg, rgba(255,255,255,0.025) 0 1px, transparent 1px 3px)',
            zIndex: 1,
          }}
        />
      )}
    </div>
  )
}

function Kbd({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <span
        style={{
          background: '#fff',
          color: '#1c3a6e',
          fontWeight: 700,
          padding: '0 4px',
        }}
      >
        {label}
      </span>
      {children}
    </span>
  )
}
