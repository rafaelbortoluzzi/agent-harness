'use client'
import useSWR from 'swr'
import { useEffect, useMemo, useState } from 'react'
import CodeMirror, { EditorView } from '@uiw/react-codemirror'
import { markdown } from '@codemirror/lang-markdown'
import { yaml } from '@codemirror/lang-yaml'
import { json } from '@codemirror/lang-json'
import type { Extension } from '@codemirror/state'
import type { Tab } from '@/lib/workspace/store'
import { useWorkspace } from '@/lib/workspace/store'
import type { PanelItem } from '@/components/item-side-panel'
import { phosphorExtension } from './codemirror-theme'
import { EditorSidePanel } from './editor-side-panel'

interface FileResponse {
  id: string
  path: string
  body: string
  size: number
  mtimeMs: number
}

const fetcher = (u: string) => fetch(u).then(r => r.json())

type Status = 'idle' | 'saving' | 'saved' | 'error'

function languageFor(path: string): Extension | null {
  const lower = path.toLowerCase()
  if (lower.endsWith('.md') || lower.endsWith('.mdc') || lower.endsWith('.markdown')) {
    return markdown()
  }
  if (
    lower.endsWith('.yml') ||
    lower.endsWith('.yaml') ||
    lower.endsWith('.toml') ||
    lower.endsWith('skill.md')
  ) {
    return yaml()
  }
  if (lower.endsWith('.json')) return json()
  return null
}

function EditorBody({
  tab,
  initial,
  reload,
  item,
}: {
  tab: Extract<Tab, { kind: 'editor' }>
  initial: string
  reload: () => void
  item: PanelItem | null
}) {
  const { state } = useWorkspace()
  const [body, setBody] = useState<string>(initial)
  const original = initial
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)

  const dirty = body !== original
  const effectiveStatus: 'idle' | 'dirty' | 'saving' | 'saved' | 'error' =
    status === 'saving' || status === 'error' || status === 'saved'
      ? status
      : dirty
        ? 'dirty'
        : 'idle'

  const save = async () => {
    setStatus('saving')
    setError(null)
    try {
      const resp = await fetch(`/api/file?id=${encodeURIComponent(tab.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: body }),
      })
      if (!resp.ok) {
        const json = await resp.json().catch(() => ({}))
        setError(json.error ?? `HTTP ${resp.status}`)
        setStatus('error')
        return
      }
      setStatus('saved')
      reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'save failed')
      setStatus('error')
    }
  }

  const saveAs = async (destinationPath: string) => {
    setStatus('saving')
    setError(null)
    try {
      const resp = await fetch(`/api/file?id=${encodeURIComponent(tab.id)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destinationPath, content: body }),
      })
      if (!resp.ok) {
        const json = await resp.json().catch(() => ({}))
        setError(json.error ?? `HTTP ${resp.status}`)
        setStatus('error')
        return
      }
      setStatus('saved')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'save as failed')
      setStatus('error')
    }
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        const target = e.target as HTMLElement | null
        if (!target?.closest?.('.cm-editor')) return
        e.preventDefault()
        if (dirty) void save()
      }
    }
    window.addEventListener('keydown', handler, { capture: true })
    return () =>
      window.removeEventListener('keydown', handler, { capture: true } as EventListenerOptions)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, body, tab.id])

  useEffect(() => {
    const onSave = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail
      if (detail !== tab.id) return
      void save()
    }
    const onSaveAs = (e: Event) => {
      const detail = (e as CustomEvent<{ id: string; destinationPath: string }>).detail
      if (detail?.id !== tab.id || !detail.destinationPath) return
      void saveAs(detail.destinationPath)
    }
    window.addEventListener('ah:save-tab', onSave)
    window.addEventListener('ah:save-as-tab', onSaveAs)
    return () => {
      window.removeEventListener('ah:save-tab', onSave)
      window.removeEventListener('ah:save-as-tab', onSaveAs)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [body, tab.id])

  const reset = () => {
    setBody(original)
    setStatus('idle')
    setError(null)
  }

  const lang = useMemo(() => languageFor(tab.path), [tab.path])
  const extensions = useMemo<Extension[]>(
    () => [phosphorExtension, EditorView.lineWrapping, ...(lang ? [lang] : [])],
    [lang],
  )

  return (
    <>
      <div className="ah-editor">
        <div className="ah-editor-head">
          <span className={`ah-editor-status ${effectiveStatus}`}>
            {effectiveStatus === 'dirty'
              ? '● modified'
              : effectiveStatus === 'saving'
                ? 'saving…'
                : effectiveStatus === 'saved'
                  ? '✓ saved'
                  : effectiveStatus === 'error'
                    ? `✕ ${error ?? 'error'}`
                    : tab.path}
          </span>
          <span className="ah-grow" />
          <button
            type="button"
            className="ah-editor-btn"
            onClick={reset}
            disabled={!dirty || effectiveStatus === 'saving'}
          >
            Reset
          </button>
          <button
            type="button"
            className="ah-editor-btn primary"
            onClick={() => void save()}
            disabled={!dirty || effectiveStatus === 'saving'}
          >
            {effectiveStatus === 'saving' ? 'Saving…' : 'Save (⌘S)'}
          </button>
        </div>
        <div className="ah-cm-wrap">
          <CodeMirror
            value={body}
            onChange={v => setBody(v)}
            extensions={extensions}
            basicSetup={{
              lineNumbers: true,
              highlightActiveLine: false,
              highlightActiveLineGutter: false,
              foldGutter: true,
              autocompletion: false,
              searchKeymap: true,
              indentOnInput: true,
            }}
            theme="none"
            height="100%"
            style={{ height: '100%' }}
          />
        </div>
      </div>
      {!state.sidePanelHidden && item && <EditorSidePanel item={item} />}
    </>
  )
}

export function Editor({ tab }: { tab: Extract<Tab, { kind: 'editor' }> }) {
  const file = useSWR<FileResponse>(`/api/file?id=${encodeURIComponent(tab.id)}`, fetcher)
  const items = useSWR<PanelItem[]>('/api/registry?limit=1000', fetcher)
  const item = useMemo(
    () => items.data?.find(i => i.id === tab.id) ?? null,
    [items.data, tab.id],
  )

  if (file.error) {
    return (
      <div className="ah-editor">
        <div className="ah-editor-head">
          <span className="ah-editor-status error">load failed</span>
        </div>
        <div style={{ padding: 14, color: 'var(--ah-red)', fontSize: 12 }}>
          {String(file.error)}
        </div>
      </div>
    )
  }

  if (!file.data) {
    return (
      <div className="ah-editor">
        <div className="ah-editor-head">
          <span className="ah-editor-status">loading…</span>
        </div>
      </div>
    )
  }

  return (
    <EditorBody
      key={`${tab.id}:${file.data.mtimeMs}`}
      tab={tab}
      initial={file.data.body}
      reload={() => {
        void file.mutate()
        void items.mutate()
      }}
      item={item}
    />
  )
}
