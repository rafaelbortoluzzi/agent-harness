'use client'
import { useWorkspace } from '@/lib/workspace/store'
import { DEFAULT_BINDINGS, formatCombo } from '@/lib/keyboard/bindings'

export function HelpDialog() {
  const { state, setHelpOpen } = useWorkspace()
  if (!state.helpOpen) return null

  const groups = new Map<string, typeof DEFAULT_BINDINGS>()
  for (const b of DEFAULT_BINDINGS) {
    if (!groups.has(b.group)) groups.set(b.group, [])
    groups.get(b.group)!.push(b)
  }

  return (
    <div
      className="ah-help-overlay"
      onClick={e => {
        if (e.target === e.currentTarget) setHelpOpen(false)
      }}
    >
      <div className="ah-help" role="dialog" aria-label="Keyboard shortcuts">
        <h2>Keyboard shortcuts</h2>
        {[...groups.entries()].map(([group, items]) => (
          <div key={group} style={{ marginBottom: 14 }}>
            <div
              style={{
                fontSize: 10,
                color: 'var(--ah-fg-3)',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                marginBottom: 6,
              }}
            >
              {group}
            </div>
            <dl className="ah-kb">
              {items.map(b => (
                <div key={b.id} style={{ display: 'contents' }}>
                  <dt>{b.label}</dt>
                  <dd>{b.keys.map(formatCombo).join(' · ')}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
        <div style={{ fontSize: 10, color: 'var(--ah-fg-4)', marginTop: 8 }}>
          Esc to close · Mod+1..9 to switch tabs
        </div>
      </div>
    </div>
  )
}
