'use client'
import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import useSWR from 'swr'
import { useWorkspace } from '@/lib/workspace/store'
import {
  buildRetroTree,
  type TreeItem,
  type TreeRepo,
  type TreeNode,
} from '@/lib/workspace/retro-tree'
import {
  breadcrumbFromNav,
} from '@/lib/workspace/retro-breadcrumb'
import {
  initialRetroNavState,
  navigateUp,
  retroNavReducer,
} from '@/lib/workspace/retro-nav'
import {
  sortDetailsRows,
  type DetailsRow,
  type SortKey,
  type SortSpec,
} from '@/lib/workspace/retro-details'
import { RetroTree } from './retro-tree'
import { RetroMenuBar, type MenuDef } from './retro-menubar'
import { RetroEditor } from './retro-editor'
import { RetroIcon, iconForType, type RetroIconName } from './retro-icons'
import {
  RetroAboutModal,
  RetroHelpModal,
  RetroJudgeModal,
  RetroOptionsModal,
  RetroPropsModal,
  RetroRecsModal,
  RetroScanLogModal,
  RetroSnoozedModal,
} from './retro-modals'
import {
  initialModalState,
  retroModalReducer,
  type RetroModalKind,
} from '@/lib/workspace/retro-modal'
import { computeSplitterWidth } from '@/lib/workspace/retro-splitter'
import {
  cssVarsFromTweaks,
  defaultTweaks,
  loadTweaks,
  saveTweaks,
  type RetroTweaks,
} from '@/lib/workspace/retro-tweaks'
import { RetroTweaksModal } from './retro-tweaks-modal'
import type { ItemType } from '@/lib/scanner/adapters/base'
import type { PanelItem } from '@/components/item-side-panel'
import { WelcomeView } from '@/components/views/welcome-view'
import { RecommendationsView } from '@/components/views/recommendations-view'
import { SettingsView } from '@/components/views/settings-view'
import { MarkdownPreview } from './markdown-preview'
import { BottomPanel } from './bottom-panel'
import { EditorSidePanel } from './editor-side-panel'
import { ContextActionDialog, type ContextActionRequest } from './context-action-dialog'
import type { Tab } from '@/lib/workspace/store'

type RetroDialogTarget =
  | { kind: 'tab'; tab: Tab; item?: PanelItem | null }
  | { kind: 'repo'; repoPath: string; label?: string | null }
  | { kind: 'section'; repoPath: string; itemType: string; label: string }
  | { kind: 'unit'; item: PanelItem }

const fetcher = (u: string) => fetch(u).then(r => r.json())

const MENUS: MenuDef[] = [
  {
    label: 'File',
    items: [
      { id: 'new', label: 'New Skill…', kbd: 'Ctrl+N', disabled: true },
      { id: 'props', label: 'Properties' },
      { id: 'sep1', sep: true },
      { id: 'go-root', label: 'Go to Root' },
      { id: 'sep2', sep: true },
      { id: 'switch-modern', label: 'Switch to Modern UI…' },
    ],
  },
  {
    label: 'View',
    items: [
      { id: 'details', label: 'Details' },
      { id: 'icons', label: 'Large Icons', disabled: true },
      { id: 'sep1', sep: true },
      { id: 'refresh', label: 'Refresh', kbd: 'F5' },
    ],
  },
  {
    label: 'Tools',
    items: [
      { id: 'scan', label: 'Scan Repositories', kbd: 'F9' },
      { id: 'judge', label: 'Judge with LLM…' },
      { id: 'sep1', sep: true },
      { id: 'recs', label: 'Recommendations…' },
      { id: 'scan-log', label: 'Scan Log…' },
      { id: 'snoozed', label: 'Snoozed Items…' },
      { id: 'sep2', sep: true },
      { id: 'options', label: 'Options…' },
    ],
  },
  {
    label: 'Help',
    items: [
      { id: 'help', label: 'Keyboard Shortcuts…', kbd: 'F1' },
      { id: 'about', label: 'About Agent Harness…' },
    ],
  },
]

interface ApiRepo {
  path: string
  label: string | null
  healthScore: number | null
}

const EMPTY_REPOS: ApiRepo[] = []
const EMPTY_ITEMS: PanelItem[] = []

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  if (Number.isNaN(ms)) return '—'
  const s = Math.max(0, Math.floor(ms / 1000))
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

function fakeSize(id: string): number {
  let seed = 0
  for (let i = 0; i < id.length; i++) seed = (seed * 31 + id.charCodeAt(i)) >>> 0
  return 256 + ((seed * 37) % 4096)
}

function toDetailsRow(item: PanelItem): DetailsRow {
  return {
    id: item.id,
    name: item.name,
    type: item.type as ItemType,
    size: fakeSize(item.id),
    runtime: (item.runtime as DetailsRow['runtime']) ?? 'generic',
    score: item.qualityScore ?? null,
    modifiedAt: item.scannedAt,
    health: item.health,
    snoozed: false,
  }
}

function formatKb(bytes: number): string {
  return `${(bytes / 1024).toFixed(1)} KB`
}

function scoreColor(score: number | null): string {
  if (score === null) return '#6b675d'
  if (score >= 70) return '#1f7a3a'
  if (score >= 50) return '#cc8a00'
  return '#b22222'
}

export function RetroShell() {
  const reposReq = useSWR<ApiRepo[]>('/api/registry?resource=repos', fetcher)
  const itemsReq = useSWR<PanelItem[]>('/api/registry?limit=1000', fetcher)
  const { state, setSkin, openEditor, setCurrent, closeTab } = useWorkspace()

  const [navState, dispatch] = useReducer(retroNavReducer, initialRetroNavState)
  const [sort, setSort] = useState<SortSpec>({ key: 'name', dir: 'asc' })
  const [treeWidth, setTreeWidth] = useState(240)
  const [tweaks, setTweaks] = useState<RetroTweaks>(defaultTweaks)
  const [tweaksOpen, setTweaksOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [showFiles, setShowFiles] = useState(false)
  const [actionTarget, setActionTarget] = useState<RetroDialogTarget | null>(null)

  useEffect(() => {
    setTweaks(loadTweaks())
  }, [])

  useEffect(() => {
    const vars = cssVarsFromTweaks(tweaks)
    for (const [k, v] of Object.entries(vars)) document.documentElement.style.setProperty(k, v)
    saveTweaks(tweaks)
  }, [tweaks])
  const dragRef = useRef<{ baseWidth: number; startX: number } | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault()
        openModal('help')
      } else if (e.key === 'F9') {
        e.preventDefault()
        openModal('recs')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current) return
      const { baseWidth, startX } = dragRef.current
      setTreeWidth(
        computeSplitterWidth({
          base: baseWidth,
          delta: e.clientX - startX,
          min: 160,
          max: 600,
        }),
      )
    }
    const onUp = () => {
      dragRef.current = null
      document.body.style.cursor = ''
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [])
  const [modal, dispatchModal] = useReducer(retroModalReducer, initialModalState)
  const openModal = (kind: RetroModalKind) => dispatchModal({ type: 'open', kind })
  const closeModal = () => dispatchModal({ type: 'close' })

  const repos = reposReq.data ?? EMPTY_REPOS
  const items = itemsReq.data ?? EMPTY_ITEMS

  const treeRepos: TreeRepo[] = useMemo(
    () => repos.map(r => ({ path: r.path, label: r.label, healthScore: r.healthScore })),
    [repos],
  )
  const treeItems: TreeItem[] = useMemo(
    () => items.map(i => ({ id: i.id, type: i.type as ItemType, repoPath: i.repoPath })),
    [items],
  )
  const tree = useMemo(() => buildRetroTree(treeRepos, treeItems), [treeRepos, treeItems])

  const repoLabel = (path: string) => repos.find(r => r.path === path)?.label ?? null
  const crumbs = breadcrumbFromNav(navState.nav, repoLabel)

  const rows: DetailsRow[] = useMemo(() => {
    let scoped: PanelItem[]
    if (navState.nav.kind === 'root') scoped = items
    else if (navState.nav.kind === 'repo') {
      const repoPath = navState.nav.repoPath
      scoped = items.filter(i => i.repoPath === repoPath)
    } else {
      const { repoPath, itemType } = navState.nav
      scoped = items.filter(i => i.repoPath === repoPath && i.type === itemType)
    }
    const q = search.trim().toLowerCase()
    if (q) scoped = scoped.filter(i => i.name.toLowerCase().includes(q))
    return scoped.map(toDetailsRow)
  }, [items, navState.nav, search])

  const sortedRows = useMemo(() => sortDetailsRows(rows, sort), [rows, sort])

  const onTreeSelect = (node: TreeNode) => {
    if (node.kind === 'root') dispatch({ type: 'go-root' })
    else if (node.kind === 'repo' && node.repoPath)
      dispatch({ type: 'select-repo', repoPath: node.repoPath })
    else if (node.kind === 'type-group' && node.repoPath && node.itemType)
      dispatch({
        type: 'select-group',
        repoPath: node.repoPath,
        itemType: node.itemType,
      })
  }

  const onSortClick = (key: SortKey) => {
    setSort(prev =>
      prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' },
    )
  }

  const broken = items.filter(i => i.health === 'broken').length
  const warnings = items.filter(i => i.health === 'warning').length
  const totalSize = rows.reduce((a, r) => a + r.size, 0)

  const runAction = async (request: ContextActionRequest) => {
    const { id, provider, target, path, dialogTarget, presetId, promptOverride } = request
    if (id === 'copy-path' && path) await navigator.clipboard?.writeText(path)
    if (id === 'preview' && dialogTarget.kind === 'unit') {
      window.open(
        `/preview?id=${encodeURIComponent(dialogTarget.item.id)}`,
        '_blank',
        'noopener,noreferrer',
      )
    }
    if (id === 'judge') {
      await fetch('/api/judge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, target, presetId, promptOverride }),
      })
      await itemsReq.mutate()
    }
    if (id === 'analyze') {
      await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, target, presetId, promptOverride }),
      })
    }
    if (id === 'remove') {
      await fetch('/api/registry', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target }),
      })
      await reposReq.mutate()
      await itemsReq.mutate()
    }
    setActionTarget(null)
  }

  return (
    <div className="rs-shell">
      <div className="rs-titlebar">
        <span>Agent Harness</span>
        <div className="rs-titlebar-spacer" />
        <button className="rs-titlebar-btn" aria-label="Minimize">_</button>
        <button className="rs-titlebar-btn" aria-label="Maximize">▢</button>
        <button className="rs-titlebar-btn" aria-label="Close">×</button>
      </div>

      <RetroMenuBar
        menus={MENUS}
        onSelect={id => {
          switch (id) {
            case 'switch-modern':
              setSkin('modern')
              break
            case 'recs':
              openModal('recs')
              break
            case 'scan-log':
              openModal('scan-log')
              break
            case 'snoozed':
              openModal('snoozed')
              break
            case 'options':
              openModal('options')
              break
            case 'help':
              openModal('help')
              break
            case 'about':
              openModal('about')
              break
            case 'judge':
              openModal('judge')
              break
            case 'props':
              if (navState.selectedItemId) openModal('props')
              break
            case 'go-root':
              dispatch({ type: 'go-root' })
              break
          }
        }}
      />

      <div className="rs-toolbar">
        <button
          className="rs-tool-btn"
          onClick={() =>
            navState.nav.kind === 'group'
              ? dispatch({
                  type: 'select-repo',
                  repoPath: (navigateUp(navState.nav) as { repoPath: string }).repoPath,
                })
              : dispatch({ type: 'go-root' })
          }
          disabled={navState.nav.kind === 'root'}
          style={navState.nav.kind === 'root' ? { opacity: 0.5 } : undefined}
        >
          <RetroIcon name="up" size={20} />
          <span>Up</span>
        </button>
        <span className="rs-tool-sep" />
        <button className="rs-tool-btn">
          <RetroIcon name="scan" size={20} />
          <span>Scan</span>
        </button>
        <button className="rs-tool-btn" onClick={() => openModal('judge')}>
          <RetroIcon name="judge" size={20} />
          <span>Judge</span>
        </button>
        <button
          className="rs-tool-btn"
          onClick={() => openModal('props')}
          disabled={!navState.selectedItemId}
          style={!navState.selectedItemId ? { opacity: 0.5 } : undefined}
        >
          <RetroIcon name="props" size={20} />
          <span>Props</span>
        </button>
        <span className="rs-tool-sep" />
        <button className="rs-tool-btn" onClick={() => openModal('recs')}>
          <RetroIcon name="star" size={20} />
          <span>Recs</span>
        </button>
        <button className="rs-tool-btn" onClick={() => openModal('scan-log')}>
          <RetroIcon name="scan" size={20} />
          <span>Scan Log</span>
        </button>
        <button className="rs-tool-btn" onClick={() => openModal('snoozed')}>
          <RetroIcon name="bell" size={20} />
          <span>Snoozed</span>
        </button>
        <span className="rs-tool-sep" />
        <button className="rs-tool-btn" onClick={() => openModal('options')}>
          <RetroIcon name="cog" size={20} />
          <span>Options</span>
        </button>
        <button className="rs-tool-btn" onClick={() => openModal('help')}>
          <RetroIcon name="help" size={20} />
          <span>Help</span>
        </button>
        <button className="rs-tool-btn" onClick={() => openModal('about')}>
          <RetroIcon name="props" size={20} />
          <span>About</span>
        </button>
        <button className="rs-tool-btn" onClick={() => setTweaksOpen(true)}>
          <RetroIcon name="cog" size={20} />
          <span>Tweaks</span>
        </button>
        <div style={{ flex: 1 }} />
        <button
          className="rs-tool-btn"
          onClick={() => setSkin('modern')}
          title="Switch to Modern UI"
        >
          <RetroIcon name="view-icons" size={20} />
          <span>Modern UI</span>
        </button>
      </div>

      <div className="rs-address">
        <span className="rs-address-label">Address</span>
        <div className="rs-address-input">
          <span style={{ marginRight: 6, display: 'inline-flex' }}>
            <RetroIcon name="folder-open" size={14} />
          </span>
          {crumbs.map((c, i) => (
            <span key={c.id}>
              {i > 0 && <span style={{ margin: '0 6px', color: '#6b675d' }}>▸</span>}
              {c.label}
            </span>
          ))}
        </div>
      </div>

      <div className="rs-body">
        <div className="rs-tree" style={{ width: treeWidth, display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              padding: '4px 4px 2px',
              borderBottom: '1px solid var(--rs-chrome-lo)',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              background: 'var(--rs-chrome)',
              position: 'sticky',
              top: 0,
              zIndex: 1,
            }}
          >
            <RetroIcon name="search" size={12} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Find skill, agent…"
              spellCheck={false}
              style={{
                flex: 1,
                fontSize: 11,
                padding: '2px 4px',
                background: '#fff',
                border: '2px solid',
                borderColor:
                  'var(--rs-chrome-shadow) var(--rs-chrome-hi) var(--rs-chrome-hi) var(--rs-chrome-shadow)',
                fontFamily: 'inherit',
                outline: 'none',
                minWidth: 0,
              }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                title="Clear"
                style={{
                  width: 16,
                  height: 16,
                  background: 'var(--rs-chrome)',
                  border: '1px solid var(--rs-chrome-shadow)',
                  fontSize: 10,
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                ×
              </button>
            )}
          </div>
          <div style={{ flex: 1, overflow: 'auto' }}>
          {reposReq.isLoading ? (
            <div style={{ padding: 6, color: '#6b675d' }}>Loading…</div>
          ) : (
            <RetroTree
              tree={tree}
              expanded={navState.expanded}
              selectedId={
                navState.nav.kind === 'root'
                  ? 'root'
                  : navState.nav.kind === 'repo'
                    ? `r:${navState.nav.repoPath}`
                    : `r:${navState.nav.repoPath}/t:${navState.nav.itemType}`
              }
              onSelect={onTreeSelect}
              onToggle={id => dispatch({ type: 'toggle-expanded', id })}
              onContextMenu={node => {
                if (node.kind === 'repo' && node.repoPath) {
                  setActionTarget({
                    kind: 'repo',
                    repoPath: node.repoPath,
                    label: node.label,
                  })
                } else if (node.kind === 'type-group' && node.repoPath && node.itemType) {
                  setActionTarget({
                    kind: 'section',
                    repoPath: node.repoPath,
                    itemType: node.itemType,
                    label: node.label,
                  })
                }
              }}
            />
          )}
          </div>
        </div>
        <div
          className="rs-splitter"
          onMouseDown={e => {
            dragRef.current = { baseWidth: treeWidth, startX: e.clientX }
            document.body.style.cursor = 'col-resize'
          }}
        />
        <div className="rs-content">
          <RetroContentTabs
            tabs={state.tabs}
            current={state.current}
            showFiles={showFiles}
            onActivate={id => {
              setShowFiles(false)
              setCurrent(id)
            }}
            onClose={closeTab}
            onFiles={() => setShowFiles(true)}
          />
          <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
            <div
              style={{
                flex: 1,
                background:
                  !showFiles &&
                  state.tabs.find(t => t.id === state.current)?.kind === 'editor'
                    ? '#000'
                    : '#fff',
                margin: 2,
                border: '2px solid',
                borderColor:
                  'var(--rs-chrome-shadow) var(--rs-chrome-hi) var(--rs-chrome-hi) var(--rs-chrome-shadow)',
                overflow: 'auto',
                display: 'flex',
                flexDirection: 'column',
                minWidth: 0,
              }}
            >
              {(() => {
                if (showFiles) {
                  return (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                      <thead>
                        <tr style={{ background: 'var(--rs-chrome)' }}>
                          {(
                            [
                              ['name', 'Name'],
                              ['type', 'Type'],
                              ['size', 'Size'],
                              ['runtime', 'Runtime'],
                              ['score', 'Score'],
                              ['modified', 'Modified'],
                            ] as [SortKey, string][]
                          ).map(([key, label]) => (
                            <th
                              key={key}
                              onClick={() => onSortClick(key)}
                              style={{
                                textAlign: 'left',
                                padding: '2px 6px',
                                borderRight: '1px solid #8e887b',
                                cursor: 'pointer',
                                userSelect: 'none',
                              }}
                            >
                              {label}
                              {sort.key === key && (
                                <span style={{ color: '#6b675d', marginLeft: 4 }}>
                                  {sort.dir === 'asc' ? '▲' : '▼'}
                                </span>
                              )}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sortedRows.map(row => {
                          const isBroken = row.health === 'broken'
                          const isWarn = row.health === 'warning'
                          const src = items.find(i => i.id === row.id)
                          return (
                            <tr
                              key={row.id}
                              onDoubleClick={() => {
                                if (src) {
                                  setShowFiles(false)
                                  openEditor({
                                    id: src.id,
                                    name: src.name,
                                    type: src.type,
                                    path: src.path,
                                  })
                                }
                              }}
                              onClick={() => dispatch({ type: 'select-item', itemId: row.id })}
                              onContextMenu={e => {
                                if (!src) return
                                e.preventDefault()
                                dispatch({ type: 'select-item', itemId: row.id })
                                setActionTarget({ kind: 'unit', item: src })
                              }}
                              style={{
                                background:
                                  navState.selectedItemId === row.id ? '#1c3a6e' : undefined,
                                color:
                                  navState.selectedItemId === row.id ? '#fff' : undefined,
                                cursor: 'default',
                              }}
                            >
                              <td
                                style={{
                                  padding: '1px 6px',
                                  color:
                                    navState.selectedItemId === row.id
                                      ? '#fff'
                                      : isBroken
                                        ? '#b22222'
                                        : isWarn
                                          ? '#8a6500'
                                          : undefined,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 6,
                                }}
                              >
                                <RetroIcon name={iconForType(row.type)} size={16} />
                                {row.name}
                              </td>
                              <td style={{ padding: '1px 6px' }}>{row.type}</td>
                              <td
                                style={{
                                  padding: '1px 6px',
                                  fontFamily: 'IBM Plex Mono, monospace',
                                }}
                              >
                                {formatKb(row.size)}
                              </td>
                              <td style={{ padding: '1px 6px' }}>{row.runtime}</td>
                              <td style={{ padding: '1px 6px', color: scoreColor(row.score) }}>
                                {row.score === null ? '—' : row.score.toFixed(1)}
                              </td>
                              <td style={{ padding: '1px 6px' }}>
                                {relativeTime(row.modifiedAt)}
                              </td>
                            </tr>
                          )
                        })}
                        {sortedRows.length === 0 && (
                          <tr>
                            <td colSpan={6} style={{ padding: 12, color: '#6b675d' }}>
                              No items.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  )
                }
                const activeTab = state.tabs.find(t => t.id === state.current)
                if (!activeTab) {
                  return (
                    <div style={{ padding: 14, color: '#6b675d', fontSize: 11 }}>
                      No tab open. Use the explorer or click Files.
                    </div>
                  )
                }
                if (activeTab.kind === 'welcome') {
                  return (
                    <div style={{ overflow: 'auto', flex: 1 }}>
                      <WelcomeView />
                    </div>
                  )
                }
                if (activeTab.kind === 'recs') {
                  return (
                    <div style={{ overflow: 'auto', flex: 1 }}>
                      <RecommendationsView />
                    </div>
                  )
                }
                if (activeTab.kind === 'settings') {
                  return (
                    <div style={{ overflow: 'auto', flex: 1 }}>
                      <SettingsView />
                    </div>
                  )
                }
                if (activeTab.kind === 'preview') {
                  return <MarkdownPreview tab={activeTab} />
                }
                if (activeTab.kind === 'editor') {
                  return (
                    <RetroEditorTab
                      tabId={activeTab.id}
                      runtime="claude"
                      scanlines={tweaks.scanlines}
                    />
                  )
                }
                return null
              })()}
            </div>
            {(() => {
              const activeTab = state.tabs.find(t => t.id === state.current)
              if (showFiles || !activeTab || activeTab.kind !== 'editor') return null
              if (state.sidePanelHidden) return null
              const item = items.find(i => i.id === activeTab.id)
              if (!item) return null
              return <EditorSidePanel item={item} />
            })()}
          </div>
          <BottomPanel />
        </div>
      </div>

      <div className="rs-statusbar">
        <span className="rs-status-seg">{rows.length} objects</span>
        <span className="rs-status-seg">{formatKb(totalSize)}</span>
        <span
          className="rs-status-seg"
          style={{ color: broken ? '#b22222' : undefined, display: 'inline-flex', alignItems: 'center', gap: 4 }}
        >
          <RetroIcon name="broken" size={12} /> {broken} broken
        </span>
        <span
          className="rs-status-seg"
          style={{ color: warnings ? '#8a6500' : undefined, display: 'inline-flex', alignItems: 'center', gap: 4 }}
        >
          <RetroIcon name="warn" size={12} /> {warnings} warnings
        </span>
        <span className="rs-status-seg flex">
          {state.scanning ? '⟳ Scanning…' : 'Watch daemon idle'}
        </span>
      </div>

      {modal.kind === 'recs' && <RetroRecsModal onClose={closeModal} />}
      {modal.kind === 'about' && <RetroAboutModal onClose={closeModal} />}
      {modal.kind === 'help' && <RetroHelpModal onClose={closeModal} />}
      {modal.kind === 'scan-log' && <RetroScanLogModal onClose={closeModal} />}
      {modal.kind === 'snoozed' && <RetroSnoozedModal onClose={closeModal} />}
      {modal.kind === 'options' && <RetroOptionsModal onClose={closeModal} />}
      {modal.kind === 'judge' && (
        <RetroJudgeModal
          unscoredCount={items.filter(i => i.qualityScore == null).length}
          onClose={closeModal}
          onStarted={() => itemsReq.mutate()}
        />
      )}
      {modal.kind === 'props' &&
        (() => {
          const selected = items.find(i => i.id === navState.selectedItemId)
          if (!selected) return null
          return (
            <RetroPropsModal
              item={selected}
              onClose={closeModal}
              onChanged={() => itemsReq.mutate()}
            />
          )
        })()}
      {tweaksOpen && (
        <RetroTweaksModal
          tweaks={tweaks}
          onChange={setTweaks}
          onClose={() => setTweaksOpen(false)}
        />
      )}
      <ContextActionDialog
        open={Boolean(actionTarget)}
        target={actionTarget}
        onOpenChange={open => {
          if (!open) setActionTarget(null)
        }}
        onAction={runAction}
      />
    </div>
  )
}

interface ContentTabsProps {
  tabs: ReturnType<typeof useWorkspace>['state']['tabs']
  current: string | null
  showFiles: boolean
  onActivate: (id: string) => void
  onClose: (id: string) => void
  onFiles: () => void
}

function RetroContentTabs({ tabs, current, showFiles, onActivate, onClose, onFiles }: ContentTabsProps) {
  const visibleTabs = tabs.filter(
    t => t.kind === 'editor' || t.kind === 'welcome' || t.kind === 'recs' || t.kind === 'settings' || t.kind === 'preview',
  )

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '4px 9px',
    marginRight: 2,
    background: active ? '#fff' : 'var(--rs-chrome)',
    border: '2px solid',
    borderColor: 'var(--rs-chrome-hi) var(--rs-chrome-shadow) var(--rs-chrome-shadow) var(--rs-chrome-hi)',
    boxShadow: 'inset 1px 1px 0 #fff, inset -1px -1px 0 var(--rs-chrome-deep)',
    borderBottom: 'none',
    fontWeight: active ? 700 : 400,
    fontSize: 11,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
  })

  return (
    <div
      style={{
        background: 'var(--rs-chrome)',
        padding: '4px 4px 0 4px',
        borderBottom: '1px solid var(--rs-chrome-lo)',
        display: 'flex',
      }}
    >
      <span
        role="tab"
        aria-selected={showFiles}
        style={tabStyle(showFiles)}
        onClick={onFiles}
      >
        <RetroIcon name="folder" size={12} /> Files
      </span>
      {visibleTabs.map(t => {
        const active = !showFiles && t.id === current
        const iconName: RetroIconName =
          t.kind === 'welcome'
            ? 'help'
            : t.kind === 'recs'
              ? 'star'
              : t.kind === 'settings'
                ? 'cog'
                : t.kind === 'preview'
                  ? 'doc'
                  : 'doc'
        return (
          <span
            key={t.id}
            role="tab"
            aria-selected={active}
            style={tabStyle(active)}
            onClick={() => onActivate(t.id)}
          >
            <RetroIcon name={iconName} size={12} />
            {t.name}
            <button
              type="button"
              aria-label={`Close ${t.name}`}
              onClick={e => {
                e.stopPropagation()
                onClose(t.id)
              }}
              style={{
                width: 13,
                height: 13,
                marginLeft: 4,
                padding: 0,
                fontSize: 10,
                fontWeight: 700,
                background: 'var(--rs-chrome)',
                border: '1px solid var(--rs-chrome-shadow)',
                cursor: 'pointer',
              }}
            >
              ×
            </button>
          </span>
        )
      })}
    </div>
  )
}

interface FileResponse {
  id: string
  path: string
  body: string
  size: number
  mtimeMs: number
}

function RetroEditorTab({
  tabId,
  runtime,
  scanlines,
}: {
  tabId: string
  runtime: string
  scanlines: boolean
}) {
  const file = useSWR<FileResponse>(`/api/file?id=${encodeURIComponent(tabId)}`, fetcher)
  if (file.error) {
    return (
      <div style={{ padding: 14, color: '#b22222', fontFamily: 'var(--rs-font-mono)' }}>
        load failed: {String(file.error)}
      </div>
    )
  }
  if (!file.data) {
    return (
      <div style={{ padding: 14, color: '#6b675d', fontFamily: 'var(--rs-font-mono)' }}>Loading…</div>
    )
  }
  return (
    <RetroEditor
      source={file.data.body}
      runtime={runtime}
      path={file.data.path}
      tabId={tabId}
      scanlines={scanlines}
      onSaved={() => file.mutate()}
    />
  )
}
