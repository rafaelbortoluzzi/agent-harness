import {
  TINT_GRADIENTS,
  ACCENT_PALETTES,
  defaultTweaks,
  tweaksReducer,
  cssVarsFromTweaks,
  type Tint,
  type Accent,
} from '@/lib/workspace/retro-tweaks'

describe('retro tweaks', () => {
  test('default tweaks are teal + amber + scanlines on', () => {
    expect(defaultTweaks).toEqual({ tint: 'teal', accent: 'amber', scanlines: true })
  })

  test.each<Tint>(['teal', 'purple', 'navy', 'maroon', 'olive', 'black'])(
    'set-tint accepts %s',
    tint => {
      const next = tweaksReducer(defaultTweaks, { type: 'set-tint', tint })
      expect(next.tint).toBe(tint)
    },
  )

  test.each<Accent>(['amber', 'green', 'cyan', 'white'])(
    'set-accent accepts %s',
    accent => {
      const next = tweaksReducer(defaultTweaks, { type: 'set-accent', accent })
      expect(next.accent).toBe(accent)
    },
  )

  test('toggle-scanlines flips the boolean', () => {
    const off = tweaksReducer(defaultTweaks, { type: 'toggle-scanlines' })
    expect(off.scanlines).toBe(false)
    const on = tweaksReducer(off, { type: 'toggle-scanlines' })
    expect(on.scanlines).toBe(true)
  })

  test('TINT_GRADIENTS contains gradient strings for every tint', () => {
    for (const key of ['teal', 'purple', 'navy', 'maroon', 'olive', 'black'] as Tint[]) {
      expect(TINT_GRADIENTS[key]).toMatch(/linear-gradient/)
    }
  })

  test('ACCENT_PALETTES has fg + accent + accent2 for every accent', () => {
    for (const key of ['amber', 'green', 'cyan', 'white'] as Accent[]) {
      expect(ACCENT_PALETTES[key]).toEqual(
        expect.objectContaining({
          fg: expect.any(String),
          accent: expect.any(String),
          accent2: expect.any(String),
        }),
      )
    }
  })

  test('cssVarsFromTweaks emits --rs-title-grad and --rs-ed-* vars', () => {
    const vars = cssVarsFromTweaks(defaultTweaks)
    expect(vars['--rs-title-grad']).toBe(TINT_GRADIENTS.teal)
    expect(vars['--rs-ed-accent']).toBe(ACCENT_PALETTES.amber.accent)
    expect(vars['--rs-ed-accent-2']).toBe(ACCENT_PALETTES.amber.accent2)
    expect(vars['--rs-ed-fg']).toBe(ACCENT_PALETTES.amber.fg)
  })
})
