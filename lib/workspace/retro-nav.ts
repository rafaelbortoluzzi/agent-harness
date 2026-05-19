import type { ItemType } from '@/lib/scanner/adapters/base'
import type { RetroNav } from '@/lib/workspace/retro-breadcrumb'

export interface RetroNavState {
  nav: RetroNav
  expanded: string[]
  selectedItemId: string | null
}

export const initialRetroNavState: RetroNavState = {
  nav: { kind: 'root' },
  expanded: [],
  selectedItemId: null,
}

export type RetroNavAction =
  | { type: 'select-repo'; repoPath: string }
  | { type: 'select-group'; repoPath: string; itemType: ItemType }
  | { type: 'select-item'; itemId: string }
  | { type: 'toggle-expanded'; id: string }
  | { type: 'go-root' }

function addExpanded(list: string[], id: string): string[] {
  return list.includes(id) ? list : [...list, id]
}

export function retroNavReducer(state: RetroNavState, action: RetroNavAction): RetroNavState {
  switch (action.type) {
    case 'select-repo':
      return {
        ...state,
        nav: { kind: 'repo', repoPath: action.repoPath },
        expanded: addExpanded(state.expanded, `r:${action.repoPath}`),
        selectedItemId: null,
      }
    case 'select-group':
      return {
        ...state,
        nav: { kind: 'group', repoPath: action.repoPath, itemType: action.itemType },
        expanded: addExpanded(state.expanded, `r:${action.repoPath}`),
        selectedItemId: null,
      }
    case 'select-item':
      return { ...state, selectedItemId: action.itemId }
    case 'toggle-expanded': {
      const exists = state.expanded.includes(action.id)
      return {
        ...state,
        expanded: exists
          ? state.expanded.filter(id => id !== action.id)
          : [...state.expanded, action.id],
      }
    }
    case 'go-root':
      return { ...state, nav: { kind: 'root' }, selectedItemId: null }
  }
}

export function navigateUp(nav: RetroNav): RetroNav {
  if (nav.kind === 'group') return { kind: 'repo', repoPath: nav.repoPath }
  if (nav.kind === 'repo') return { kind: 'root' }
  return { kind: 'root' }
}
