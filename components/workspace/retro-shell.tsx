'use client'
import { useMemo, useReducer, useState } from 'react'
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
import type { ItemType } from '@/lib/scanner/adapters/base'
import type { PanelItem } from '@/components/item-side-panel'

const fetcher = (u: string) => fetch(u).then(r => r.json())

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
  const { state, setSkin, openEditor } = useWorkspace()

  const [navState, dispatch] = useReducer(retroNavReducer, initialRetroNavState)
  const [sort, setSort] = useState<SortSpec>({ key: 'name', dir: 'asc' })

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
    if (navState.nav.kind === 'root') return items.map(toDetailsRow)
    if (navState.nav.kind === 'repo') {
      const repoPath = navState.nav.repoPath
      return items.filter(i => i.repoPath === repoPath).map(toDetailsRow)
    }
    const { repoPath, itemType } = navState.nav
    return items
      .filter(i => i.repoPath === repoPath && i.type === itemType)
      .map(toDetailsRow)
  }, [items, navState.nav])

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

  return (
    <div className="rs-shell">
      <div className="rs-titlebar">
        <span>Agent Harness</span>
        <div className="rs-titlebar-spacer" />
        <button className="rs-titlebar-btn" aria-label="Minimize">_</button>
        <button className="rs-titlebar-btn" aria-label="Maximize">▢</button>
        <button className="rs-titlebar-btn" aria-label="Close">×</button>
      </div>

      <div className="rs-menubar">
        {['File', 'Edit', 'View', 'Tools', 'Help'].map(m => (
          <span key={m} className="rs-menu-item">
            <u>{m[0]}</u>
            {m.slice(1)}
          </span>
        ))}
      </div>

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
          <span style={{ fontSize: 16 }}>↑</span>
          <span>Up</span>
        </button>
        <span className="rs-tool-sep" />
        <button className="rs-tool-btn">
          <span style={{ fontSize: 16 }}>⟳</span>
          <span>Scan</span>
        </button>
        <div style={{ flex: 1 }} />
        <button
          className="rs-tool-btn"
          onClick={() => setSkin('modern')}
          title="Switch to Modern UI"
        >
          <span style={{ fontSize: 16 }}>⌘</span>
          <span>Modern UI</span>
        </button>
      </div>

      <div className="rs-address">
        <span className="rs-address-label">Address</span>
        <div className="rs-address-input">
          <span style={{ marginRight: 6 }}>📁</span>
          {crumbs.map((c, i) => (
            <span key={c.id}>
              {i > 0 && <span style={{ margin: '0 6px', color: '#6b675d' }}>▸</span>}
              {c.label}
            </span>
          ))}
        </div>
      </div>

      <div className="rs-body">
        <div className="rs-tree">
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
            />
          )}
        </div>
        <div className="rs-splitter" />
        <div className="rs-content">
          <div
            style={{
              flex: 1,
              background: '#fff',
              margin: 2,
              border: '2px solid',
              borderColor: 'var(--rs-chrome-shadow) var(--rs-chrome-hi) var(--rs-chrome-hi) var(--rs-chrome-shadow)',
              overflow: 'auto',
            }}
          >
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
                  return (
                    <tr
                      key={row.id}
                      onDoubleClick={() => {
                        const src = items.find(i => i.id === row.id)
                        if (src)
                          openEditor({
                            id: src.id,
                            name: src.name,
                            type: src.type,
                            path: src.path,
                          })
                      }}
                      onClick={() => dispatch({ type: 'select-item', itemId: row.id })}
                      style={{
                        background:
                          navState.selectedItemId === row.id ? '#1c3a6e' : undefined,
                        color: navState.selectedItemId === row.id ? '#fff' : undefined,
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
                        }}
                      >
                        {row.name}
                      </td>
                      <td style={{ padding: '1px 6px' }}>{row.type}</td>
                      <td style={{ padding: '1px 6px', fontFamily: 'IBM Plex Mono, monospace' }}>
                        {formatKb(row.size)}
                      </td>
                      <td style={{ padding: '1px 6px' }}>{row.runtime}</td>
                      <td style={{ padding: '1px 6px', color: scoreColor(row.score) }}>
                        {row.score === null ? '—' : row.score.toFixed(1)}
                      </td>
                      <td style={{ padding: '1px 6px' }}>{relativeTime(row.modifiedAt)}</td>
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
          </div>
        </div>
      </div>

      <div className="rs-statusbar">
        <span className="rs-status-seg">{rows.length} objects</span>
        <span className="rs-status-seg">{formatKb(totalSize)}</span>
        <span className="rs-status-seg" style={{ color: broken ? '#b22222' : undefined }}>
          {broken} broken
        </span>
        <span className="rs-status-seg" style={{ color: warnings ? '#8a6500' : undefined }}>
          {warnings} warnings
        </span>
        <span className="rs-status-seg flex">
          {state.scanning ? '⟳ Scanning…' : 'Watch daemon idle'}
        </span>
      </div>
    </div>
  )
}
