'use client'
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react'

export type View = 'explorer' | 'search' | 'recs' | 'history'

export type BottomTab = 'problems' | 'output' | 'terminal'

export type Tab =
  | { id: 'welcome'; kind: 'welcome'; name: string }
  | { id: 'recs'; kind: 'recs'; name: string }
  | { id: 'settings'; kind: 'settings'; name: string }
  | { id: string; kind: 'editor'; type: string; name: string; path: string }

export interface WorkspaceState {
  tabs: Tab[]
  current: string | null
  recentlyClosed: Tab[]
  view: View
  sidebarHidden: boolean
  sidePanelHidden: boolean
  bottomCollapsed: boolean
  bottomTab: BottomTab
  palOpen: boolean
  helpOpen: boolean
  scanning: boolean
}

const WELCOME_TAB: Tab = { id: 'welcome', kind: 'welcome', name: 'Welcome' }
const RECS_TAB: Tab = { id: 'recs', kind: 'recs', name: 'Recommendations' }
const SETTINGS_TAB: Tab = { id: 'settings', kind: 'settings', name: 'Settings' }

const initialState: WorkspaceState = {
  tabs: [WELCOME_TAB],
  current: 'welcome',
  recentlyClosed: [],
  view: 'explorer',
  sidebarHidden: false,
  sidePanelHidden: false,
  bottomCollapsed: true,
  bottomTab: 'problems',
  palOpen: false,
  helpOpen: false,
  scanning: false,
}

type Action =
  | { type: 'open-tab'; tab: Tab }
  | { type: 'close-tab'; id: string }
  | { type: 'reopen-last' }
  | { type: 'set-current'; id: string }
  | { type: 'set-view'; view: View; behavior?: 'toggle-on-active' }
  | { type: 'toggle-sidebar' }
  | { type: 'set-sidebar-hidden'; hidden: boolean }
  | { type: 'toggle-side-panel' }
  | { type: 'toggle-bottom' }
  | { type: 'set-bottom-tab'; tab: BottomTab }
  | { type: 'set-pal-open'; open: boolean }
  | { type: 'set-help-open'; open: boolean }
  | { type: 'set-scanning'; scanning: boolean }

function reducer(state: WorkspaceState, action: Action): WorkspaceState {
  switch (action.type) {
    case 'open-tab': {
      const exists = state.tabs.some(t => t.id === action.tab.id)
      const tabs = exists ? state.tabs : [...state.tabs, action.tab]
      return { ...state, tabs, current: action.tab.id }
    }
    case 'close-tab': {
      const idx = state.tabs.findIndex(t => t.id === action.id)
      if (idx < 0) return state
      const closed = state.tabs[idx]!
      const tabs = state.tabs.filter(t => t.id !== action.id)
      const recentlyClosed = [closed, ...state.recentlyClosed].slice(0, 10)
      const current =
        state.current === action.id
          ? tabs.length === 0
            ? null
            : tabs[Math.max(0, idx - 1)]!.id
          : state.current
      return { ...state, tabs, recentlyClosed, current }
    }
    case 'reopen-last': {
      if (state.recentlyClosed.length === 0) return state
      const [first, ...rest] = state.recentlyClosed
      const exists = state.tabs.some(t => t.id === first!.id)
      const tabs = exists ? state.tabs : [...state.tabs, first!]
      return { ...state, tabs, current: first!.id, recentlyClosed: rest }
    }
    case 'set-current':
      return { ...state, current: action.id }
    case 'set-view': {
      if (action.behavior === 'toggle-on-active' && action.view === state.view && !state.sidebarHidden) {
        return { ...state, sidebarHidden: true }
      }
      return { ...state, view: action.view, sidebarHidden: false }
    }
    case 'toggle-sidebar':
      return { ...state, sidebarHidden: !state.sidebarHidden }
    case 'set-sidebar-hidden':
      return { ...state, sidebarHidden: action.hidden }
    case 'toggle-side-panel':
      return { ...state, sidePanelHidden: !state.sidePanelHidden }
    case 'toggle-bottom':
      return { ...state, bottomCollapsed: !state.bottomCollapsed }
    case 'set-bottom-tab':
      return { ...state, bottomTab: action.tab, bottomCollapsed: false }
    case 'set-pal-open':
      return { ...state, palOpen: action.open }
    case 'set-help-open':
      return { ...state, helpOpen: action.open }
    case 'set-scanning':
      return { ...state, scanning: action.scanning }
    default:
      return state
  }
}

interface WorkspaceContextValue {
  state: WorkspaceState
  openTab: (tab: Tab) => void
  openWelcome: () => void
  openRecs: () => void
  openSettings: () => void
  openEditor: (item: { id: string; name: string; type: string; path: string }) => void
  closeTab: (id: string) => void
  reopenLast: () => void
  setCurrent: (id: string) => void
  setView: (view: View, opts?: { behavior?: 'toggle-on-active' }) => void
  toggleSidebar: () => void
  setSidebarHidden: (hidden: boolean) => void
  toggleSidePanel: () => void
  toggleBottom: () => void
  setBottomTab: (tab: BottomTab) => void
  setPalOpen: (open: boolean) => void
  setHelpOpen: (open: boolean) => void
  setScanning: (scanning: boolean) => void
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  const openTab = useCallback((tab: Tab) => dispatch({ type: 'open-tab', tab }), [])
  const openWelcome = useCallback(() => dispatch({ type: 'open-tab', tab: WELCOME_TAB }), [])
  const openRecs = useCallback(() => dispatch({ type: 'open-tab', tab: RECS_TAB }), [])
  const openSettings = useCallback(() => dispatch({ type: 'open-tab', tab: SETTINGS_TAB }), [])
  const openEditor = useCallback(
    (item: { id: string; name: string; type: string; path: string }) =>
      dispatch({
        type: 'open-tab',
        tab: {
          id: item.id,
          kind: 'editor',
          name: item.name,
          type: item.type,
          path: item.path,
        },
      }),
    [],
  )
  const closeTab = useCallback((id: string) => dispatch({ type: 'close-tab', id }), [])
  const reopenLast = useCallback(() => dispatch({ type: 'reopen-last' }), [])
  const setCurrent = useCallback((id: string) => dispatch({ type: 'set-current', id }), [])
  const setView = useCallback(
    (view: View, opts?: { behavior?: 'toggle-on-active' }) =>
      dispatch({ type: 'set-view', view, behavior: opts?.behavior }),
    [],
  )
  const toggleSidebar = useCallback(() => dispatch({ type: 'toggle-sidebar' }), [])
  const setSidebarHidden = useCallback(
    (hidden: boolean) => dispatch({ type: 'set-sidebar-hidden', hidden }),
    [],
  )
  const toggleSidePanel = useCallback(() => dispatch({ type: 'toggle-side-panel' }), [])
  const toggleBottom = useCallback(() => dispatch({ type: 'toggle-bottom' }), [])
  const setBottomTab = useCallback(
    (tab: BottomTab) => dispatch({ type: 'set-bottom-tab', tab }),
    [],
  )
  const setPalOpen = useCallback((open: boolean) => dispatch({ type: 'set-pal-open', open }), [])
  const setHelpOpen = useCallback((open: boolean) => dispatch({ type: 'set-help-open', open }), [])
  const setScanning = useCallback(
    (scanning: boolean) => dispatch({ type: 'set-scanning', scanning }),
    [],
  )

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      state,
      openTab,
      openWelcome,
      openRecs,
      openSettings,
      openEditor,
      closeTab,
      reopenLast,
      setCurrent,
      setView,
      toggleSidebar,
      setSidebarHidden,
      toggleSidePanel,
      toggleBottom,
      setBottomTab,
      setPalOpen,
      setHelpOpen,
      setScanning,
    }),
    [
      state,
      openTab,
      openWelcome,
      openRecs,
      openSettings,
      openEditor,
      closeTab,
      reopenLast,
      setCurrent,
      setView,
      toggleSidebar,
      setSidebarHidden,
      toggleSidePanel,
      toggleBottom,
      setBottomTab,
      setPalOpen,
      setHelpOpen,
      setScanning,
    ],
  )

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) throw new Error('useWorkspace must be used inside <WorkspaceProvider>')
  return ctx
}
