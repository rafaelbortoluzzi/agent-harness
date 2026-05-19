'use client'
import useSWR from 'swr'
import { useEffect, useMemo, useState } from 'react'
import {
  BarChart3,
  Clipboard,
  Eye,
  Save,
  SaveAll,
  Sparkles,
  Trash2,
  Wand2,
  X,
} from 'lucide-react'
import type { PanelItem } from '@/components/item-side-panel'
import type { Tab } from '@/lib/workspace/store'
import type { ActionTarget } from '@/lib/workspace/action-targets'

type DialogTarget =
  | { kind: 'tab'; tab: Tab; item?: PanelItem | null }
  | { kind: 'repo'; repoPath: string; label?: string | null }
  | { kind: 'section'; repoPath: string; itemType: string; label: string }
  | { kind: 'unit'; item: PanelItem }

export type ContextActionId =
  | 'close'
  | 'preview'
  | 'copy-path'
  | 'judge'
  | 'analyze'
  | 'improve'
  | 'save-as'
  | 'save'
  | 'remove'

export interface ContextActionRequest {
  id: ContextActionId
  provider?: string
  presetId?: string
  promptOverride?: { system: string; prompt: string }
  path?: string
  target: ActionTarget
  dialogTarget: DialogTarget
}

interface ProviderStatus {
  id: string
  displayName: string
  selected: boolean
  available: boolean
}

interface ConfigResponse {
  llmProvider: string
  llmProviders?: ProviderStatus[]
}

interface ActionDef {
  id: ContextActionId
  label: string
  shortcut: string
  icon: typeof Sparkles
}

interface PromptPreview {
  action: ContextActionId
  presetId?: string
  presets?: { id: string; label: string; description: string }[]
  request: { system: string; prompt: string; maxTokens?: number }
}

const fetcher = (u: string) => fetch(u).then(r => r.json())

function isMarkdown(path?: string): boolean {
  const lower = path?.toLowerCase() ?? ''
  return lower.endsWith('.md') || lower.endsWith('.mdx') || lower.endsWith('.markdown')
}

function describeTarget(target: DialogTarget): { title: string; scope: string; path?: string; actionTarget: ActionTarget } {
  if (target.kind === 'tab') {
    if (target.tab.kind === 'editor') {
      return {
        title: target.tab.name,
        scope: target.item ? 'unit' : 'tab',
        path: target.tab.path,
        actionTarget: target.item
          ? {
              scope: 'unit',
              itemId: target.item.id,
              repoPath: target.item.repoPath,
              itemType: target.item.type,
            }
          : { scope: 'all' },
      }
    }
    if (target.tab.kind === 'preview') {
      return {
        title: target.tab.name,
        scope: 'preview',
        path: target.tab.path,
        actionTarget: { scope: 'unit', itemId: target.tab.sourceId, itemType: target.tab.type },
      }
    }
    return { title: target.tab.name, scope: 'all', actionTarget: { scope: 'all' } }
  }
  if (target.kind === 'repo') {
    return {
      title: target.label ?? target.repoPath.split('/').pop() ?? target.repoPath,
      scope: 'repo',
      path: target.repoPath,
      actionTarget: { scope: 'repo', repoPath: target.repoPath },
    }
  }
  if (target.kind === 'section') {
    return {
      title: target.label,
      scope: 'section',
      path: target.repoPath,
      actionTarget: { scope: 'section', repoPath: target.repoPath, itemType: target.itemType },
    }
  }
  return {
    title: target.item.name,
    scope: 'unit',
    path: target.item.path,
    actionTarget: {
      scope: 'unit',
      itemId: target.item.id,
      repoPath: target.item.repoPath,
      itemType: target.item.type,
    },
  }
}

function actionsFor(target: DialogTarget, path?: string): ActionDef[] {
  const actions: ActionDef[] = []
  if (target.kind === 'tab') actions.push({ id: 'close', label: 'Close', shortcut: 'Cmd+W', icon: X })
  if (isMarkdown(path)) actions.push({ id: 'preview', label: 'Preview Markdown', shortcut: 'Cmd+Shift+P', icon: Eye })
  if (path) actions.push({ id: 'copy-path', label: 'Copy Path on Disk', shortcut: 'Cmd+Shift+C', icon: Clipboard })
  actions.push({ id: 'judge', label: 'Judge', shortcut: 'Cmd+J', icon: Sparkles })
  actions.push({ id: 'analyze', label: 'Analyze', shortcut: 'Cmd+Shift+A', icon: BarChart3 })
  if (target.kind === 'tab' || target.kind === 'unit') {
    actions.push({ id: 'improve', label: 'Improve', shortcut: 'Cmd+I', icon: Wand2 })
  }
  if (target.kind === 'tab' && target.tab.kind === 'editor') {
    actions.push({ id: 'save-as', label: 'Save As', shortcut: 'Cmd+Shift+S', icon: SaveAll })
    actions.push({ id: 'save', label: 'Save', shortcut: 'Cmd+S', icon: Save })
  }
  if (target.kind === 'repo' || target.kind === 'section' || target.kind === 'unit') {
    actions.push({ id: 'remove', label: 'Remove', shortcut: 'Cmd+Backspace', icon: Trash2 })
  }
  return actions
}

function shortcutMatches(e: KeyboardEvent, action: ContextActionId): boolean {
  const mod = e.metaKey || e.ctrlKey
  if (!mod) return false
  if (action === 'close') return !e.shiftKey && e.key.toLowerCase() === 'w'
  if (action === 'preview') return e.shiftKey && e.key.toLowerCase() === 'p'
  if (action === 'copy-path') return e.shiftKey && e.key.toLowerCase() === 'c'
  if (action === 'judge') return !e.shiftKey && e.key.toLowerCase() === 'j'
  if (action === 'analyze') return e.shiftKey && e.key.toLowerCase() === 'a'
  if (action === 'improve') return !e.shiftKey && e.key.toLowerCase() === 'i'
  if (action === 'save-as') return e.shiftKey && e.key.toLowerCase() === 's'
  if (action === 'save') return !e.shiftKey && e.key.toLowerCase() === 's'
  return e.key === 'Backspace' || e.key === 'Delete'
}

function isAiAction(action: ContextActionId): action is 'judge' | 'analyze' | 'improve' {
  return action === 'judge' || action === 'analyze' || action === 'improve'
}

export function ContextActionDialog({
  open,
  target,
  onOpenChange,
  onAction,
}: {
  open: boolean
  target: DialogTarget | null
  onOpenChange: (open: boolean) => void
  onAction: (request: ContextActionRequest) => void
}) {
  const { data: config } = useSWR<ConfigResponse>(open ? '/api/config' : null, fetcher)
  const defaultProvider = config?.llmProvider ?? config?.llmProviders?.find(p => p.selected)?.id ?? ''
  const [provider, setProvider] = useState(defaultProvider)
  const selectedProvider = provider || defaultProvider
  const [previewAction, setPreviewAction] = useState<ContextActionId | null>(null)
  const [preview, setPreview] = useState<PromptPreview | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [systemPrompt, setSystemPrompt] = useState('')
  const [userPrompt, setUserPrompt] = useState('')
  const [presetId, setPresetId] = useState('')

  const info = useMemo(() => (target ? describeTarget(target) : null), [target])
  const actions = useMemo(() => (target && info ? actionsFor(target, info.path) : []), [target, info])

  const resetPreview = () => {
    setPreviewAction(null)
    setPreview(null)
    setPreviewError(null)
    setSystemPrompt('')
    setUserPrompt('')
    setPresetId('')
  }

  const close = () => {
    resetPreview()
    onOpenChange(false)
  }

  const loadPreview = async (id: ContextActionId, nextPresetId = presetId) => {
    if (!target || !info) return
    if (!isAiAction(id)) return
    setPreviewAction(id)
    setPreviewLoading(true)
    setPreviewError(null)
    try {
      const resp = await fetch('/api/llm/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: id,
          target: info.actionTarget,
          presetId: nextPresetId || undefined,
        }),
      })
      const body = await resp.json().catch(() => ({}))
      if (!resp.ok) {
        setPreviewError(body.error ?? `Preview failed: HTTP ${resp.status}`)
        return
      }
      const loaded = body as PromptPreview
      setPreview(loaded)
      setPresetId(loaded.presetId ?? nextPresetId ?? '')
      setSystemPrompt(loaded.request.system)
      setUserPrompt(loaded.request.prompt)
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : 'Preview failed')
    } finally {
      setPreviewLoading(false)
    }
  }

  const run = (id: ContextActionId) => {
    if (!target || !info) return
    if (isAiAction(id)) {
      void loadPreview(id)
      return
    }
    onAction({
      id,
      provider: selectedProvider,
      path: info.path,
      target: info.actionTarget,
      dialogTarget: target,
    })
  }

  const runPreview = () => {
    if (!target || !info || !previewAction) return
    onAction({
      id: previewAction,
      provider: selectedProvider,
      presetId: presetId || undefined,
      promptOverride: { system: systemPrompt, prompt: userPrompt },
      path: info.path,
      target: info.actionTarget,
      dialogTarget: target,
    })
  }

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      for (const action of actions) {
        if (!shortcutMatches(e, action.id)) continue
        e.preventDefault()
        run(action.id)
        return
      }
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // run is intentionally derived from current props/state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, actions, provider, selectedProvider, target, info])

  if (!open || !target || !info) return null

  return (
    <div className="ah-dialog-overlay" onClick={e => e.target === e.currentTarget && close()}>
      <div className="ah-action-dialog" role="dialog" aria-label={`${target.kind} actions`}>
        <div className="ah-action-head">
          <div>
            <div className="ah-action-title">{info.title}</div>
            <div className="ah-action-meta">
              <span>{info.scope}</span>
              {info.actionTarget.scope === 'section' && <span>{info.actionTarget.itemType}</span>}
              {info.path && <span>{info.path}</span>}
            </div>
          </div>
          <button type="button" onClick={close} aria-label="Dismiss actions">
            <X size={13} />
          </button>
        </div>

        <label className="ah-provider-pick">
          <span>Provider</span>
          <select
            aria-label="LLM provider"
            value={selectedProvider}
            onChange={e => setProvider(e.target.value)}
          >
            {(config?.llmProviders ?? []).map(p => (
              <option key={p.id} value={p.id} disabled={!p.available}>
                {p.displayName} ({p.id})
              </option>
            ))}
            {config && !config.llmProviders?.length && <option value={config.llmProvider}>{config.llmProvider}</option>}
          </select>
        </label>

        {previewAction ? (
          <div className="ah-prompt-preview">
            <div className="ah-prompt-preview-head">
              <button type="button" onClick={() => setPreviewAction(null)}>
                Back
              </button>
              <span>{previewAction}</span>
              <button
                type="button"
                onClick={() => runPreview()}
                disabled={previewLoading || !systemPrompt.trim() || !userPrompt.trim()}
              >
                Run {previewAction}
              </button>
            </div>
            {preview?.presets?.length ? (
              <label className="ah-provider-pick">
                <span>Preset</span>
                <select
                  aria-label="Prompt preset"
                  value={presetId}
                  onChange={e => {
                    const next = e.target.value
                    setPresetId(next)
                    void loadPreview(previewAction, next)
                  }}
                >
                  {preview.presets.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            {previewLoading && <div className="ah-prompt-note">Loading prompt…</div>}
            {previewError && <div className="ah-prompt-error">{previewError}</div>}
            {preview && (
              <>
                <label className="ah-prompt-field">
                  <span>System prompt</span>
                  <textarea
                    aria-label="System prompt"
                    value={systemPrompt}
                    onChange={e => setSystemPrompt(e.target.value)}
                    rows={7}
                  />
                </label>
                <label className="ah-prompt-field">
                  <span>User prompt</span>
                  <textarea
                    aria-label="User prompt"
                    value={userPrompt}
                    onChange={e => setUserPrompt(e.target.value)}
                    rows={9}
                  />
                </label>
              </>
            )}
          </div>
        ) : (
          <div className="ah-action-list">
            {actions.map(action => {
              const Icon = action.icon
              return (
                <button key={action.id} type="button" onClick={() => run(action.id)}>
                  <Icon size={13} strokeWidth={1.6} />
                  <span>{action.label}</span>
                  <kbd>{action.shortcut}</kbd>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
