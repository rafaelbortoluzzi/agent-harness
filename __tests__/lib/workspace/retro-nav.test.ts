import {
  initialRetroNavState,
  retroNavReducer,
  navigateUp,
  type RetroNavState,
} from '@/lib/workspace/retro-nav'

describe('retroNavReducer', () => {
  test('initial state is root with no expansion', () => {
    expect(initialRetroNavState).toEqual({
      nav: { kind: 'root' },
      expanded: [],
      selectedItemId: null,
    })
  })

  test('select repo updates nav and auto-expands the repo node', () => {
    const next = retroNavReducer(initialRetroNavState, {
      type: 'select-repo',
      repoPath: '/x/a',
    })
    expect(next.nav).toEqual({ kind: 'repo', repoPath: '/x/a' })
    expect(next.expanded).toContain('r:/x/a')
  })

  test('select type-group navigates into group and clears selection', () => {
    const start: RetroNavState = {
      nav: { kind: 'repo', repoPath: '/x/a' },
      expanded: ['r:/x/a'],
      selectedItemId: 'foo',
    }
    const next = retroNavReducer(start, {
      type: 'select-group',
      repoPath: '/x/a',
      itemType: 'skill',
    })
    expect(next.nav).toEqual({ kind: 'group', repoPath: '/x/a', itemType: 'skill' })
    expect(next.selectedItemId).toBeNull()
  })

  test('toggle-expanded adds when missing, removes when present', () => {
    const after = retroNavReducer(initialRetroNavState, {
      type: 'toggle-expanded',
      id: 'r:/x/a',
    })
    expect(after.expanded).toEqual(['r:/x/a'])
    const back = retroNavReducer(after, { type: 'toggle-expanded', id: 'r:/x/a' })
    expect(back.expanded).toEqual([])
  })

  test('select-item only changes selectedItemId', () => {
    const next = retroNavReducer(initialRetroNavState, {
      type: 'select-item',
      itemId: 'item-1',
    })
    expect(next.selectedItemId).toBe('item-1')
    expect(next.nav).toEqual(initialRetroNavState.nav)
  })

  test('go-root resets nav and selection', () => {
    const start: RetroNavState = {
      nav: { kind: 'group', repoPath: '/x/a', itemType: 'skill' },
      expanded: ['r:/x/a'],
      selectedItemId: 'foo',
    }
    const next = retroNavReducer(start, { type: 'go-root' })
    expect(next.nav).toEqual({ kind: 'root' })
    expect(next.selectedItemId).toBeNull()
    expect(next.expanded).toEqual(['r:/x/a'])
  })
})

describe('navigateUp', () => {
  test('group → repo', () => {
    expect(
      navigateUp({ kind: 'group', repoPath: '/x/a', itemType: 'skill' }),
    ).toEqual({ kind: 'repo', repoPath: '/x/a' })
  })

  test('repo → root', () => {
    expect(navigateUp({ kind: 'repo', repoPath: '/x/a' })).toEqual({ kind: 'root' })
  })

  test('root → root (no-op)', () => {
    expect(navigateUp({ kind: 'root' })).toEqual({ kind: 'root' })
  })
})
