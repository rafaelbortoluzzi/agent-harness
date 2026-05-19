import { buildRetroTree, type TreeRepo, type TreeItem } from '@/lib/workspace/retro-tree'

const repoA: TreeRepo = { path: '/x/a', label: 'a', healthScore: 80 }
const repoB: TreeRepo = { path: '/x/b', label: null, healthScore: null }

const items: TreeItem[] = [
  { id: 'a-skill-1', type: 'skill', repoPath: '/x/a' },
  { id: 'a-skill-2', type: 'skill', repoPath: '/x/a' },
  { id: 'a-agent-1', type: 'agent', repoPath: '/x/a' },
  { id: 'b-hook-1', type: 'hook', repoPath: '/x/b' },
  { id: 'personal-1', type: 'skill', repoPath: null },
]

describe('buildRetroTree', () => {
  test('root node anchors entire tree', () => {
    const tree = buildRetroTree([], [])
    expect(tree.kind).toBe('root')
    expect(tree.id).toBe('root')
    expect(tree.label).toBe('Agent Harness')
    expect(tree.depth).toBe(0)
    expect(tree.children).toEqual([])
  })

  test('one repo node per repo, sorted by path', () => {
    const tree = buildRetroTree([repoB, repoA], [])
    expect(tree.children.map(c => c.id)).toEqual(['r:/x/a', 'r:/x/b'])
    expect(tree.children[0]!.kind).toBe('repo')
    expect(tree.children[0]!.depth).toBe(1)
  })

  test('repo label falls back to basename when missing', () => {
    const tree = buildRetroTree([repoB], [])
    expect(tree.children[0]!.label).toBe('b')
  })

  test('type-groups grouped per repo with item counts', () => {
    const tree = buildRetroTree([repoA, repoB], items)
    const a = tree.children.find(c => c.id === 'r:/x/a')!
    expect(a.children.map(c => ({ id: c.id, count: c.count }))).toEqual([
      { id: 'r:/x/a/t:agent', count: 1 },
      { id: 'r:/x/a/t:skill', count: 2 },
    ])
    expect(a.children[0]!.kind).toBe('type-group')
    expect(a.children[0]!.depth).toBe(2)
  })

  test('repos with no items render with empty children', () => {
    const tree = buildRetroTree([repoA], [])
    expect(tree.children[0]!.children).toEqual([])
  })

  test('items with null repoPath are skipped (personal scope deferred)', () => {
    const tree = buildRetroTree([repoA], items.filter(i => i.repoPath === null))
    expect(tree.children[0]!.children).toEqual([])
  })

  test('repo count totals item count across all groups', () => {
    const tree = buildRetroTree([repoA], items)
    expect(tree.children[0]!.count).toBe(3)
  })
})
