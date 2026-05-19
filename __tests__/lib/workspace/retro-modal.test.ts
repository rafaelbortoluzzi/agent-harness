import {
  initialModalState,
  retroModalReducer,
  type RetroModalKind,
  type RetroModalState,
} from '@/lib/workspace/retro-modal'

describe('retroModalReducer', () => {
  test('initial state has no modal open', () => {
    expect(initialModalState).toEqual({ kind: null, position: null })
  })

  test('open sets the modal kind and clears position', () => {
    const next = retroModalReducer(initialModalState, { type: 'open', kind: 'recs' })
    expect(next.kind).toBe('recs')
    expect(next.position).toBeNull()
  })

  test('open with a different kind replaces position', () => {
    const start: RetroModalState = {
      kind: 'recs',
      position: { x: 10, y: 20 },
    }
    const next = retroModalReducer(start, { type: 'open', kind: 'about' })
    expect(next.kind).toBe('about')
    expect(next.position).toBeNull()
  })

  test('close resets to initial', () => {
    const start: RetroModalState = { kind: 'options', position: { x: 5, y: 5 } }
    expect(retroModalReducer(start, { type: 'close' })).toEqual(initialModalState)
  })

  test('drag stores position only when a modal is open', () => {
    const open: RetroModalState = { kind: 'recs', position: null }
    const dragged = retroModalReducer(open, { type: 'drag', x: 100, y: 50 })
    expect(dragged.position).toEqual({ x: 100, y: 50 })

    const closed: RetroModalState = { kind: null, position: null }
    const ignored = retroModalReducer(closed, { type: 'drag', x: 100, y: 50 })
    expect(ignored.position).toBeNull()
  })

  test.each<RetroModalKind>(['recs', 'scan-log', 'options', 'about', 'help', 'judge', 'snoozed', 'props'])(
    'accepts %s as a valid modal kind',
    kind => {
      const next = retroModalReducer(initialModalState, { type: 'open', kind })
      expect(next.kind).toBe(kind)
    },
  )
})
