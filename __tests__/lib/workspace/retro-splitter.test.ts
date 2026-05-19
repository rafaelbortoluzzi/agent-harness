import { computeSplitterWidth } from '@/lib/workspace/retro-splitter'

describe('computeSplitterWidth', () => {
  test('returns base + delta when within bounds', () => {
    expect(computeSplitterWidth({ base: 240, delta: 30, min: 120, max: 600 })).toBe(270)
  })

  test('clamps below min', () => {
    expect(computeSplitterWidth({ base: 240, delta: -200, min: 120, max: 600 })).toBe(120)
  })

  test('clamps above max', () => {
    expect(computeSplitterWidth({ base: 240, delta: 1000, min: 120, max: 600 })).toBe(600)
  })

  test('accepts negative delta within bounds', () => {
    expect(computeSplitterWidth({ base: 300, delta: -50, min: 120, max: 600 })).toBe(250)
  })

  test('integer result (rounds towards floor)', () => {
    expect(computeSplitterWidth({ base: 240, delta: 30.7, min: 120, max: 600 })).toBe(270)
  })
})
