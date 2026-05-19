export type EditorStatus = 'idle' | 'saving' | 'saved' | 'error'

export interface EditorState {
  body: string
  original: string
  status: EditorStatus
  error: string | null
}

export const initialEditorState: EditorState = {
  body: '',
  original: '',
  status: 'idle',
  error: null,
}

export type EditorAction =
  | { type: 'hydrate'; body: string }
  | { type: 'edit'; body: string }
  | { type: 'saving' }
  | { type: 'saved' }
  | { type: 'error'; message: string }

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'hydrate':
      return { body: action.body, original: action.body, status: 'idle', error: null }
    case 'edit':
      return { ...state, body: action.body }
    case 'saving':
      return { ...state, status: 'saving', error: null }
    case 'saved':
      return { ...state, original: state.body, status: 'saved', error: null }
    case 'error':
      return { ...state, status: 'error', error: action.message }
  }
}

export type EffectiveStatus = EditorStatus | 'dirty'

export function effectiveStatus(state: EditorState): EffectiveStatus {
  if (state.status !== 'idle') return state.status
  return state.body !== state.original ? 'dirty' : 'idle'
}
