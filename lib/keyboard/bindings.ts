export interface Binding {
  id: string
  label: string
  keys: string[]
  group: string
}

export const DEFAULT_BINDINGS: Binding[] = [
  { id: 'palette', label: 'Command palette', keys: ['Mod+K', 'Mod+Shift+P'], group: 'Navigation' },
  { id: 'tab-next', label: 'Next tab', keys: ['Mod+Tab'], group: 'Tabs' },
  { id: 'tab-prev', label: 'Previous tab', keys: ['Mod+Shift+Tab'], group: 'Tabs' },
  { id: 'tab-close', label: 'Close current tab', keys: ['Mod+W'], group: 'Tabs' },
  { id: 'tab-reopen', label: 'Reopen closed tab', keys: ['Mod+Shift+T'], group: 'Tabs' },
  { id: 'toggle-sidebar', label: 'Toggle explorer', keys: ['Mod+B'], group: 'Panels' },
  { id: 'toggle-side', label: 'Toggle side panel', keys: ['Mod+\\'], group: 'Panels' },
  { id: 'toggle-bottom', label: 'Toggle bottom panel', keys: ['Mod+J'], group: 'Panels' },
  { id: 'focus-terminal', label: 'Focus terminal', keys: ['Mod+`'], group: 'Panels' },
  { id: 'scan', label: 'Run scan', keys: ['Mod+S'], group: 'Actions' },
  { id: 'recommendations', label: 'Open recommendations', keys: ['Mod+R'], group: 'Actions' },
  { id: 'settings', label: 'Open settings', keys: ['Mod+,'], group: 'Actions' },
  { id: 'help', label: 'Show keyboard help', keys: ['?'], group: 'Actions' },
]

const LS_KEY = 'ah_bindings_v1'

export function loadBindings(): Binding[] {
  if (typeof window === 'undefined') return DEFAULT_BINDINGS
  try {
    const raw = window.localStorage.getItem(LS_KEY)
    if (!raw) return DEFAULT_BINDINGS
    const stored: { id: string; keys: string[] }[] = JSON.parse(raw)
    return DEFAULT_BINDINGS.map(d => {
      const found = stored.find(s => s.id === d.id)
      return found ? { ...d, keys: found.keys } : d
    })
  } catch {
    return DEFAULT_BINDINGS
  }
}

export function saveBindings(bindings: Binding[]): void {
  if (typeof window === 'undefined') return
  const slim = bindings.map(b => ({ id: b.id, keys: b.keys }))
  window.localStorage.setItem(LS_KEY, JSON.stringify(slim))
}

export function formatCombo(combo: string): string {
  const isMac = typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform)
  return combo
    .split('+')
    .map(p => {
      if (p === 'Mod') return isMac ? '⌘' : 'Ctrl'
      if (p === 'Shift') return isMac ? '⇧' : 'Shift'
      if (p === 'Alt') return isMac ? '⌥' : 'Alt'
      if (p === 'Tab') return '⇥'
      if (p === ' ' || p === 'Space') return 'Space'
      if (p === '`') return '`'
      if (p === '\\') return '\\'
      if (p.length === 1) return p.toUpperCase()
      return p
    })
    .join(isMac ? ' ' : '+')
}

export function eventToCombo(e: KeyboardEvent): string | null {
  const parts: string[] = []
  if (e.metaKey || e.ctrlKey) parts.push('Mod')
  if (e.shiftKey) parts.push('Shift')
  if (e.altKey) parts.push('Alt')
  let k = e.key
  if (k === 'Control' || k === 'Meta' || k === 'Shift' || k === 'Alt') return null
  if (k === ' ') k = 'Space'
  if (k.length === 1) k = k.toUpperCase()
  parts.push(k)
  return parts.join('+')
}

export function eventMatches(e: KeyboardEvent, combo: string): boolean {
  const want = combo.split('+')
  const wantsMod = want.includes('Mod')
  const wantsShift = want.includes('Shift')
  const wantsAlt = want.includes('Alt')
  const wantKey = want[want.length - 1]
  const gotMod = e.metaKey || e.ctrlKey
  if (wantsMod !== gotMod) return false
  if (wantsShift !== e.shiftKey) return false
  if (wantsAlt !== e.altKey) return false
  let k = e.key
  if (k === ' ') k = 'Space'
  if (k.length === 1) k = k.toUpperCase()
  return k === wantKey
}
