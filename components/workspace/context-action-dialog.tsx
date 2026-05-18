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

  const info = useMemo(() => (target ? describeTarget(target) : null), [target])
  const actions = useMemo(() => (target && info ? actionsFor(target, info.path) : []), [target, info])

  const run = (id: ContextActionId) => {
    if (!target || !info) return
    onAction({ id, provider: selectedProvider, path: info.path, target: info.actionTarget, dialogTarget: target })
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
      if (e.key === 'Escape') onOpenChange(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // run is intentionally derived from current props/state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, actions, provider, selectedProvider, target, info])

  if (!open || !target || !info) return null

  return (
    <div className="ah-dialog-overlay" onClick={e => e.target === e.currentTarget && onOpenChange(false)}>
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
          <button type="button" onClick={() => onOpenChange(false)} aria-label="Dismiss actions">
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
      </div>
    </div>
  )
}
