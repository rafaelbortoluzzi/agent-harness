'use client'
import { useWorkspace } from '@/lib/workspace/store'

const MENU_ITEMS = ['File', 'Edit', 'View', 'Tools', 'Help']

const TOOL_GROUPS: Array<{ label: string; key: string; disabled?: boolean }[]> = [
  [
    { label: 'Back', key: 'back' },
    { label: 'Forward', key: 'forward' },
    { label: 'Up', key: 'up' },
  ],
  [
    { label: 'Scan', key: 'scan' },
    { label: 'Judge', key: 'judge' },
  ],
  [
    { label: 'Recs', key: 'recs' },
    { label: 'Scan Log', key: 'log' },
    { label: 'Snoozed', key: 'snoozed' },
  ],
  [
    { label: 'Details', key: 'details' },
    { label: 'Icons', key: 'icons' },
  ],
  [
    { label: 'Props', key: 'props', disabled: true },
    { label: 'Options', key: 'options' },
    { label: 'Help', key: 'help' },
  ],
]

export function RetroShell() {
  const { state, setSkin, openRecs, openSettings } = useWorkspace()

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
        {MENU_ITEMS.map(m => (
          <span key={m} className="rs-menu-item">
            <u>{m[0]}</u>
            {m.slice(1)}
          </span>
        ))}
      </div>

      <div className="rs-toolbar">
        {TOOL_GROUPS.map((group, gi) => (
          <span key={gi} style={{ display: 'contents' }}>
            {group.map(btn => (
              <button
                key={btn.key}
                className="rs-tool-btn"
                disabled={btn.disabled}
                onClick={() => {
                  if (btn.key === 'recs') openRecs()
                  else if (btn.key === 'options') openSettings()
                }}
                style={btn.disabled ? { opacity: 0.5 } : undefined}
              >
                <span style={{ fontSize: 16 }}>▣</span>
                <span>{btn.label}</span>
              </button>
            ))}
            {gi < TOOL_GROUPS.length - 1 && <span className="rs-tool-sep" />}
          </span>
        ))}
        <div style={{ flex: 1 }} />
        <button
          className="rs-tool-btn"
          onClick={() => setSkin('modern')}
          title="Switch to Classic UI"
        >
          <span style={{ fontSize: 16 }}>⌘</span>
          <span>Classic UI</span>
        </button>
      </div>

      <div className="rs-address">
        <span className="rs-address-label">Address</span>
        <div className="rs-address-input">
          <span style={{ marginRight: 6 }}>📁</span>
          <span>Agent Harness</span>
        </div>
      </div>

      <div className="rs-body">
        <div className="rs-tree">
          <div style={{ padding: '4px 6px' }}>
            <strong>Agent Harness</strong>
            <div style={{ paddingLeft: 14, color: '#6b675d' }}>
              <em>tree placeholder</em>
            </div>
          </div>
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
              padding: 12,
            }}
          >
            <p>Retro shell scaffolding. Tree + details list + editor tabs pending.</p>
            <p style={{ marginTop: 8, color: '#6b675d' }}>
              Current modern store wired — tabs: {state.tabs.length}, view: {state.view}.
            </p>
          </div>
        </div>
      </div>

      <div className="rs-statusbar">
        <span className="rs-status-seg">0 objects</span>
        <span className="rs-status-seg">0 KB</span>
        <span className="rs-status-seg">0 broken</span>
        <span className="rs-status-seg">0 warnings</span>
        <span className="rs-status-seg flex">
          {state.scanning ? '⟳ Scanning…' : 'Watch daemon idle'}
        </span>
      </div>
    </div>
  )
}
