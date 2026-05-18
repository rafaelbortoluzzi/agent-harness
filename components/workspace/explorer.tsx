'use client'
import useSWR from 'swr'
import { Fragment, useMemo, useState } from 'react'
import {
  Anchor,
  BookOpen,
  Bot,
  ChevronDown,
  ChevronRight,
  FileText,
  Folder,
  FolderOpen,
  Plug,
  Sparkles,
  TerminalSquare,
} from 'lucide-react'
import { type PanelItem } from '@/components/item-side-panel'
import { useDebounce } from '@/lib/hooks/use-debounce'
import { useWorkspace } from '@/lib/workspace/store'
import {
  ContextActionDialog,
  type ContextActionRequest,
} from './context-action-dialog'

const fetcher = (u: string) => fetch(u).then(r => r.json())

interface Repo {
  path: string
  label: string | null
  healthScore: number | null
}

type FilterMode = 'all' | 'broken' | 'unscored'

const TYPE_ICON: Record<string, typeof Sparkles> = {
  skill: Sparkles,
  agent: Bot,
  hook: Anchor,
  mcp: Plug,
  rule: BookOpen,
  command: TerminalSquare,
  prompt: FileText,
}

function typeIcon(type: string) {
  return TYPE_ICON[type] ?? FileText
}

function highlight(text: string, query: string) {
  if (!query) return text
  const lc = text.toLowerCase()
  const ql = query.toLowerCase()
  const i = lc.indexOf(ql)
  if (i < 0) return text
  return (
    <>
      {text.slice(0, i)}
      <mark>{text.slice(i, i + query.length)}</mark>
      {text.slice(i + query.length)}
    </>
  )
}

function scoreClass(score: number | null): '' | 'warn' | 'bad' {
  if (score === null || score === undefined) return ''
  if (score >= 75) return ''
  if (score >= 60) return 'warn'
  return 'bad'
}

function repoLabel(repo: Repo): string {
  return repo.label ?? repo.path.split('/').pop() ?? repo.path
}

const EMPTY_REPOS: Repo[] = []
const EMPTY_ITEMS: PanelItem[] = []

export function Explorer() {
  const repos = useSWR<Repo[]>('/api/registry?resource=repos', fetcher)
  const items = useSWR<PanelItem[]>('/api/registry?limit=1000', fetcher)
  const { state, openEditor, toggleSidePanel } = useWorkspace()
  const currentTabId = state.current
  const selected = useMemo(
    () => (items.data ?? EMPTY_ITEMS).find(i => i.id === currentTabId) ?? null,
    [items.data, currentTabId],
  )

  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounce(query, 300)
  const [filter, setFilter] = useState<FilterMode>('all')
  const [repoOverrides, setRepoOverrides] = useState<Map<string, boolean>>(new Map())
  const [groupOverrides, setGroupOverrides] = useState<Map<string, boolean>>(new Map())
  const [actionTarget, setActionTarget] = useState<Parameters<typeof ContextActionDialog>[0]['target']>(null)

  const repoList = repos.data ?? EMPTY_REPOS
  const itemList = items.data ?? EMPTY_ITEMS

  const filtered = useMemo(() => {
    const q = debouncedQuery.toLowerCase()
    return itemList.filter(it => {
      if (q && !it.name.toLowerCase().includes(q) && !it.type.toLowerCase().includes(q)) {
        return false
      }
      if (filter === 'broken' && it.health !== 'broken' && it.health !== 'warning') return false
      if (filter === 'unscored' && it.qualityScore !== null && it.qualityScore !== undefined) {
        return false
      }
      return true
    })
  }, [itemList, debouncedQuery, filter])

  const grouped = useMemo(() => {
    const by: Record<string, Record<string, PanelItem[]>> = {}
    for (const it of filtered) {
      const r = it.repoPath ?? '(unscoped)'
      const t = it.type
      ;(by[r] ??= {})[t] ??= []
      by[r][t]!.push(it)
    }
    return by
  }, [filtered])

  const autoExpandedRepos = useMemo(() => {
    const s = new Set<string>()
    for (const r of repoList.slice(0, 3)) s.add(r.path)
    if (debouncedQuery) {
      for (const it of filtered) s.add(it.repoPath ?? '(unscoped)')
    }
    if (selected) s.add(selected.repoPath ?? '(unscoped)')
    return s
  }, [repoList, debouncedQuery, filtered, selected])

  const autoExpandedGroups = useMemo(() => {
    const s = new Set<string>()
    if (debouncedQuery) {
      for (const it of filtered) s.add(`${it.repoPath ?? '(unscoped)'}/${it.type}`)
    }
    if (selected) {
      const r = selected.repoPath ?? '(unscoped)'
      s.add(`${r}/${selected.type}`)
    }
    return s
  }, [debouncedQuery, filtered, selected])

  const isRepoOpen = (path: string) => {
    const ov = repoOverrides.get(path)
    return ov !== undefined ? ov : autoExpandedRepos.has(path)
  }

  const isGroupOpen = (key: string) => {
    const ov = groupOverrides.get(key)
    return ov !== undefined ? ov : autoExpandedGroups.has(key)
  }

  const toggleRepo = (path: string) =>
    setRepoOverrides(prev => {
      const next = new Map(prev)
      next.set(path, !isRepoOpen(path))
      return next
    })

  const toggleGroup = (key: string) =>
    setGroupOverrides(prev => {
      const next = new Map(prev)
      next.set(key, !isGroupOpen(key))
      return next
    })

  const collapseAll = () => {
    const repoMap = new Map<string, boolean>()
    for (const r of repoList) repoMap.set(r.path, false)
    for (const p of Object.keys(grouped)) repoMap.set(p, false)
    setRepoOverrides(repoMap)
    const groupMap = new Map<string, boolean>()
    for (const [r, byType] of Object.entries(grouped)) {
      for (const t of Object.keys(byType)) groupMap.set(`${r}/${t}`, false)
    }
    setGroupOverrides(groupMap)
  }

  const orderedRepos: Repo[] = useMemo(() => {
    const known = new Set(repoList.map(r => r.path))
    const extras: Repo[] = Object.keys(grouped)
      .filter(p => !known.has(p))
      .map(path => ({ path, label: path === '(unscoped)' ? '(unscoped)' : null, healthScore: null }))
    return [...repoList, ...extras]
  }, [repoList, grouped])

  const runAction = async (request: ContextActionRequest) => {
    const { id, provider, target, path, dialogTarget } = request
    if (id === 'copy-path' && path) await navigator.clipboard?.writeText(path)
    if (id === 'preview' && dialogTarget.kind === 'unit') {
      window.open(`/preview?id=${encodeURIComponent(dialogTarget.item.id)}`, '_blank', 'noopener,noreferrer')
    }
    if (id === 'judge') {
      await fetch('/api/judge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, target }),
      })
      await items.mutate()
    }
    if (id === 'analyze') {
      await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, target }),
      })
    }
    if (id === 'improve' && dialogTarget.kind === 'unit') {
      openEditor({
        id: dialogTarget.item.id,
        name: dialogTarget.item.name,
        type: dialogTarget.item.type,
        path: dialogTarget.item.path,
      })
      if (state.sidePanelHidden) toggleSidePanel()
      window.setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent('ah:open-improve', {
            detail: { itemId: dialogTarget.item.id, provider },
          }),
        )
      }, 0)
    }
    if (id === 'remove') {
      await fetch('/api/registry', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target }),
      })
      await repos.mutate()
      await items.mutate()
    }
    setActionTarget(null)
  }

  return (
    <aside className="ah-explorer" aria-label="Explorer">
      <div className="ah-head">
        <span>Explorer</span>
        <div className="ah-head-actions">
          <button
            type="button"
            title="Refresh"
            onClick={() => {
              void repos.mutate()
              void items.mutate()
            }}
          >
            ⟳
          </button>
          <button type="button" title="Collapse all" onClick={collapseAll}>
            ⤴
          </button>
        </div>
      </div>

      <div className="ah-search">
        <span className="ah-search-ic">⌕</span>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search skills, agents…"
          spellCheck={false}
        />
        {query && (
          <button type="button" className="ah-clear" onClick={() => setQuery('')}>
            ✕
          </button>
        )}
      </div>

      <div className="ah-filters">
        {(['all', 'broken', 'unscored'] as const).map(f => (
          <button
            key={f}
            type="button"
            className={`ah-f${filter === f ? ' on' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'broken' ? 'broken+warn' : f}
          </button>
        ))}
      </div>

      <div className="ah-tree">
        {orderedRepos.map(repo => {
          const repoGroup = grouped[repo.path]
          if (debouncedQuery && !repoGroup) return null
          const expanded = isRepoOpen(repo.path)
          const RepoIcon = expanded ? FolderOpen : Folder
          const sc = scoreClass(repo.healthScore)
          return (
            <Fragment key={repo.path}>
              <div
                className="ah-row repo"
                data-depth="0"
                onClick={e => {
                  if (e.altKey) {
                    setActionTarget({ kind: 'repo', repoPath: repo.path, label: repoLabel(repo) })
                    return
                  }
                  toggleRepo(repo.path)
                }}
                onContextMenu={e => {
                  e.preventDefault()
                  setActionTarget({ kind: 'repo', repoPath: repo.path, label: repoLabel(repo) })
                }}
              >
                <span className="ah-chev">
                  {expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                </span>
                <span className="ah-row-ico">
                  <RepoIcon size={12} strokeWidth={1.4} />
                </span>
                <span className="ah-nm">{repoLabel(repo)}</span>
                <span className={`ah-row-meta${sc ? ' ' + sc : ''}`}>
                  {repo.healthScore ?? '—'}
                </span>
              </div>

              {expanded && repoGroup &&
                Object.entries(repoGroup).map(([type, groupItems]) => {
                  const groupKey = `${repo.path}/${type}`
                  const gOpen = isGroupOpen(groupKey)
                  const GroupIcon = gOpen ? FolderOpen : Folder
                  return (
                    <Fragment key={groupKey}>
                      <div
                        className="ah-row group"
                        data-depth="1"
                        onClick={e => {
                          if (e.altKey) {
                            setActionTarget({
                              kind: 'section',
                              repoPath: repo.path,
                              itemType: type,
                              label: `${type}s`,
                            })
                            return
                          }
                          toggleGroup(groupKey)
                        }}
                        onContextMenu={e => {
                          e.preventDefault()
                          setActionTarget({
                            kind: 'section',
                            repoPath: repo.path,
                            itemType: type,
                            label: `${type}s`,
                          })
                        }}
                      >
                        <span className="ah-chev">
                          {gOpen ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                        </span>
                        <span className="ah-row-ico">
                          <GroupIcon size={11} strokeWidth={1.4} />
                        </span>
                        <span className="ah-nm">{type}s</span>
                        <span className="ah-row-meta">{groupItems.length}</span>
                      </div>

                      {gOpen &&
                        groupItems.map(it => {
                          const TypeIcon = typeIcon(it.type)
                          const sel = it.id === selected?.id
                          return (
                            <div
                              key={it.id}
                              className={`ah-row${sel ? ' sel focus' : ''}`}
                              data-depth="2"
                              onClick={e => {
                                if (e.altKey) {
                                  setActionTarget({ kind: 'unit', item: it })
                                  return
                                }
                                openEditor({
                                  id: it.id,
                                  name: it.name,
                                  type: it.type,
                                  path: it.path,
                                })
                              }}
                              onContextMenu={e => {
                                e.preventDefault()
                                setActionTarget({ kind: 'unit', item: it })
                              }}
                            >
                              <span className="ah-chev" />
                              <span className="ah-row-ico">
                                <TypeIcon size={11} strokeWidth={1.4} />
                              </span>
                              <span className="ah-nm">{highlight(it.name, debouncedQuery)}</span>
                              <span className="ah-row-meta">
                                <span className={`ah-dot ${it.health}`} />
                                {it.qualityScore !== null && it.qualityScore !== undefined
                                  ? it.qualityScore.toFixed(1)
                                  : '—'}
                              </span>
                            </div>
                          )
                        })}
                    </Fragment>
                  )
                })}
            </Fragment>
          )
        })}

        {repoList.length === 0 && itemList.length === 0 && (
          <div style={{ padding: '14px 14px', color: 'var(--ah-fg-4)', fontSize: 12 }}>
            No items. Add roots in Settings, then run a scan.
          </div>
        )}
      </div>
      <ContextActionDialog
        open={Boolean(actionTarget)}
        target={actionTarget}
        onOpenChange={open => {
          if (!open) setActionTarget(null)
        }}
        onAction={request => {
          void runAction(request)
        }}
      />
    </aside>
  )
}
