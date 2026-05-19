export type RetroModalKind =
  | 'recs'
  | 'scan-log'
  | 'options'
  | 'about'
  | 'help'
  | 'judge'
  | 'snoozed'
  | 'props'

export interface RetroModalState {
  kind: RetroModalKind | null
  position: { x: number; y: number } | null
}

export const initialModalState: RetroModalState = { kind: null, position: null }

export type RetroModalAction =
  | { type: 'open'; kind: RetroModalKind }
  | { type: 'close' }
  | { type: 'drag'; x: number; y: number }

export function retroModalReducer(state: RetroModalState, action: RetroModalAction): RetroModalState {
  switch (action.type) {
    case 'open':
      return { kind: action.kind, position: null }
    case 'close':
      return initialModalState
    case 'drag':
      if (state.kind === null) return state
      return { ...state, position: { x: action.x, y: action.y } }
  }
}
