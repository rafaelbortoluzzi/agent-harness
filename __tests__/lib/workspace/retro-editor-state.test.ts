import {
  initialEditorState,
  editorReducer,
  effectiveStatus,
  type EditorState,
} from '@/lib/workspace/retro-editor-state'

describe('editorReducer', () => {
  test('hydrate sets body + original and idle status', () => {
    const next = editorReducer(initialEditorState, { type: 'hydrate', body: 'abc' })
    expect(next.body).toBe('abc')
    expect(next.original).toBe('abc')
    expect(next.status).toBe('idle')
    expect(next.error).toBeNull()
  })

  test('edit changes body but not original', () => {
    const hydrated = editorReducer(initialEditorState, { type: 'hydrate', body: 'abc' })
    const edited = editorReducer(hydrated, { type: 'edit', body: 'abcd' })
    expect(edited.body).toBe('abcd')
    expect(edited.original).toBe('abc')
  })

  test('saving sets status saving and clears error', () => {
    const start: EditorState = { body: 'x', original: 'y', status: 'error', error: 'boom' }
    expect(editorReducer(start, { type: 'saving' })).toEqual({
      body: 'x',
      original: 'y',
      status: 'saving',
      error: null,
    })
  })

  test('saved syncs original to body and clears status', () => {
    const start: EditorState = { body: 'new', original: 'old', status: 'saving', error: null }
    const next = editorReducer(start, { type: 'saved' })
    expect(next.original).toBe('new')
    expect(next.status).toBe('saved')
  })

  test('error stores message and switches status', () => {
    const start: EditorState = { body: 'x', original: 'y', status: 'saving', error: null }
    const next = editorReducer(start, { type: 'error', message: 'failed' })
    expect(next.status).toBe('error')
    expect(next.error).toBe('failed')
  })
})

describe('effectiveStatus', () => {
  test('returns concrete status when not idle', () => {
    expect(effectiveStatus({ body: 'a', original: 'a', status: 'saving', error: null })).toBe('saving')
    expect(effectiveStatus({ body: 'a', original: 'a', status: 'saved', error: null })).toBe('saved')
    expect(effectiveStatus({ body: 'a', original: 'a', status: 'error', error: 'x' })).toBe('error')
  })

  test('returns "dirty" when body differs from original and status is idle', () => {
    expect(effectiveStatus({ body: 'b', original: 'a', status: 'idle', error: null })).toBe('dirty')
  })

  test('returns "idle" when body matches original and status is idle', () => {
    expect(effectiveStatus({ body: 'a', original: 'a', status: 'idle', error: null })).toBe('idle')
  })
})
