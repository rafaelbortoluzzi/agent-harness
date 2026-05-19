export type Tint = 'teal' | 'purple' | 'navy' | 'maroon' | 'olive' | 'black'
export type Accent = 'amber' | 'green' | 'cyan' | 'white'

export interface RetroTweaks {
  tint: Tint
  accent: Accent
  scanlines: boolean
}

export const defaultTweaks: RetroTweaks = {
  tint: 'teal',
  accent: 'amber',
  scanlines: true,
}

export const TINT_GRADIENTS: Record<Tint, string> = {
  teal: 'linear-gradient(90deg, #0e4a48, #117a78)',
  purple: 'linear-gradient(90deg, #321a4a, #6a3aa0)',
  navy: 'linear-gradient(90deg, #122849, #2e5a99)',
  maroon: 'linear-gradient(90deg, #4a1818, #8a3030)',
  olive: 'linear-gradient(90deg, #3a4818, #768a32)',
  black: 'linear-gradient(90deg, #0a0808, #2a2820)',
}

export interface AccentPalette {
  fg: string
  accent: string
  accent2: string
}

export const ACCENT_PALETTES: Record<Accent, AccentPalette> = {
  amber: { fg: '#d6d2c4', accent: '#f4c243', accent2: '#d6a020' },
  green: { fg: '#b0e8b0', accent: '#d6f5d6', accent2: '#6abf6b' },
  cyan: { fg: '#a8d0e0', accent: '#b8e8f5', accent2: '#6cc9e8' },
  white: { fg: '#e5e5e5', accent: '#ffffff', accent2: '#cfcfcf' },
}

export type TweaksAction =
  | { type: 'set-tint'; tint: Tint }
  | { type: 'set-accent'; accent: Accent }
  | { type: 'toggle-scanlines' }
  | { type: 'reset' }

export function tweaksReducer(state: RetroTweaks, action: TweaksAction): RetroTweaks {
  switch (action.type) {
    case 'set-tint':
      return { ...state, tint: action.tint }
    case 'set-accent':
      return { ...state, accent: action.accent }
    case 'toggle-scanlines':
      return { ...state, scanlines: !state.scanlines }
    case 'reset':
      return defaultTweaks
  }
}

export function cssVarsFromTweaks(tweaks: RetroTweaks): Record<string, string> {
  const palette = ACCENT_PALETTES[tweaks.accent]
  return {
    '--rs-title-grad': TINT_GRADIENTS[tweaks.tint],
    '--rs-ed-fg': palette.fg,
    '--rs-ed-accent': palette.accent,
    '--rs-ed-accent-2': palette.accent2,
  }
}

const STORAGE_KEY = 'ah:retro-tweaks'

export function loadTweaks(): RetroTweaks {
  if (typeof window === 'undefined') return defaultTweaks
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) return defaultTweaks
  try {
    const parsed = JSON.parse(raw)
    return {
      tint: parsed.tint in TINT_GRADIENTS ? parsed.tint : defaultTweaks.tint,
      accent: parsed.accent in ACCENT_PALETTES ? parsed.accent : defaultTweaks.accent,
      scanlines: typeof parsed.scanlines === 'boolean' ? parsed.scanlines : defaultTweaks.scanlines,
    }
  } catch {
    return defaultTweaks
  }
}

export function saveTweaks(tweaks: RetroTweaks) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tweaks))
}
