import { breadcrumbFromNav, type RetroNav } from '@/lib/workspace/retro-breadcrumb'

const labelLookup = (path: string) => (path === '/x/a' ? 'alpha' : null)

describe('breadcrumbFromNav', () => {
  test('root produces single Agent Harness segment', () => {
    const nav: RetroNav = { kind: 'root' }
    expect(breadcrumbFromNav(nav, labelLookup)).toEqual([
      { id: 'root', label: 'Agent Harness' },
    ])
  })

  test('repo path uses label when available', () => {
    const nav: RetroNav = { kind: 'repo', repoPath: '/x/a' }
    expect(breadcrumbFromNav(nav, labelLookup)).toEqual([
      { id: 'root', label: 'Agent Harness' },
      { id: 'r:/x/a', label: 'alpha' },
    ])
  })

  test('repo path falls back to basename when label missing', () => {
    const nav: RetroNav = { kind: 'repo', repoPath: '/x/b' }
    expect(breadcrumbFromNav(nav, labelLookup)).toEqual([
      { id: 'root', label: 'Agent Harness' },
      { id: 'r:/x/b', label: 'b' },
    ])
  })

  test('type-group adds third segment with item type', () => {
    const nav: RetroNav = { kind: 'group', repoPath: '/x/a', itemType: 'skill' }
    const result = breadcrumbFromNav(nav, labelLookup)
    expect(result).toHaveLength(3)
    expect(result[2]).toEqual({ id: 'r:/x/a/t:skill', label: 'skill' })
  })
})
