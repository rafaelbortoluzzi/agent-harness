'use client'
import {
  Anchor,
  Bell,
  BookOpen,
  Bot,
  FileText,
  HelpCircle,
  Play,
  Plug,
  RefreshCw,
  Search,
  Settings as SettingsIcon,
  Sparkles,
  TerminalSquare,
  X,
} from 'lucide-react'
import { useWorkspace, type Tab } from '@/lib/workspace/store'

const TYPE_ICON: Record<string, typeof Sparkles> = {
  skill: Sparkles,
  agent: Bot,
  hook: Anchor,
  mcp: Plug,
  rule: BookOpen,
  command: TerminalSquare,
  prompt: FileText,
}

function TabIcon({ tab }: { tab: Tab }) {
  if (tab.kind === 'welcome') return <Play size={11} strokeWidth={1.6} />
  if (tab.kind === 'recs') return <Bell size={11} strokeWidth={1.5} />
  if (tab.kind === 'settings') return <SettingsIcon size={11} strokeWidth={1.5} />
  const Icon = TYPE_ICON[tab.type] ?? FileText
  return <Icon size={11} strokeWidth={1.5} />
}

function SidebarToggleIcon({
  side,
  on,
}: {
  side: 'left' | 'right' | 'bottom'
  on: boolean
}) {
  const fill = on ? 'currentColor' : 'none'
  const opacity = on ? 0.7 : 0.3
  return (
    <svg width="15" height="15" viewBox="0 0 16 16">
      <rect x="1.5" y="2.5" width="13" height="11" fill="none" stroke="currentColor" strokeWidth="1.2" />
      {side === 'left' && (
        <rect x="1.5" y="2.5" width="4" height="11" fill={fill} stroke="currentColor" strokeWidth="1.2" opacity={opacity} />
      )}
      {side === 'right' && (
        <rect x="10.5" y="2.5" width="4" height="11" fill={fill} stroke="currentColor" strokeWidth="1.2" opacity={opacity} />
      )}
      {side === 'bottom' && (
        <rect x="1.5" y="9" width="13" height="4.5" fill={fill} stroke="currentColor" strokeWidth="1.2" opacity={opacity} />
      )}
    </svg>
  )
}

export function TabBar({
  runScan,
  runJudge,
}: {
  runScan?: () => void | Promise<void>
  runJudge?: () => void | Promise<void>
}) {
  const { state, setCurrent, closeTab, setPalOpen, setHelpOpen, toggleSidebar, toggleSidePanel, toggleBottom } =
    useWorkspace()
  const { tabs, current, scanning, sidebarHidden, sidePanelHidden, bottomCollapsed } = state

  return (
    <div className="ah-tabs">
      {tabs.map(tab => {
        const active = tab.id === current
        return (
          <div
            key={tab.id}
            className={`ah-t${active ? ' on' : ''}`}
            onClick={() => setCurrent(tab.id)}
            title={tab.kind === 'editor' ? tab.path : tab.name}
          >
            <span className="ah-tab-ic">
              <TabIcon tab={tab} />
            </span>
            <span className="ah-nm">{tab.name}</span>
            <button
              type="button"
              className="ah-x"
              onClick={e => {
                e.stopPropagation()
                closeTab(tab.id)
              }}
              aria-label={`Close ${tab.name}`}
            >
              <X size={11} />
            </button>
          </div>
        )
      })}
      <div className="ah-right">
        <button
          type="button"
          className="ah-btn"
          onClick={() => setPalOpen(true)}
          title="Command palette (⌘K)"
        >
          <Search size={11} strokeWidth={1.6} />
          <span>⌘K</span>
        </button>
        {runScan && (
          <button
            type="button"
            className="ah-btn"
            onClick={() => void runScan()}
            disabled={scanning}
            title="Scan all repos"
          >
            <RefreshCw size={11} strokeWidth={1.6} />
            <span>{scanning ? 'Scanning…' : 'Scan'}</span>
          </button>
        )}
        {runJudge && (
          <button
            type="button"
            className="ah-btn primary"
            onClick={() => void runJudge()}
            title="Judge unscored items"
          >
            <Sparkles size={11} strokeWidth={1.6} />
            <span>Judge</span>
          </button>
        )}
        <div className="ah-sep" />
        <button
          type="button"
          className={`ah-icon-btn${!sidebarHidden ? ' on' : ''}`}
          onClick={toggleSidebar}
          title="Toggle Explorer"
        >
          <SidebarToggleIcon side="left" on={!sidebarHidden} />
        </button>
        <button
          type="button"
          className={`ah-icon-btn${!bottomCollapsed ? ' on' : ''}`}
          onClick={toggleBottom}
          title="Toggle bottom panel"
        >
          <SidebarToggleIcon side="bottom" on={!bottomCollapsed} />
        </button>
        <button
          type="button"
          className={`ah-icon-btn${!sidePanelHidden ? ' on' : ''}`}
          onClick={toggleSidePanel}
          title="Toggle side panel"
        >
          <SidebarToggleIcon side="right" on={!sidePanelHidden} />
        </button>
        <div className="ah-sep" />
        <button
          type="button"
          className="ah-icon-btn"
          onClick={() => setHelpOpen(true)}
          title="Keyboard shortcuts (?)"
        >
          <HelpCircle size={14} strokeWidth={1.6} />
        </button>
      </div>
    </div>
  )
}
