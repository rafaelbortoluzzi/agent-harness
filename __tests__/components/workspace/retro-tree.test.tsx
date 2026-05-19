/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import { RetroTree } from '@/components/workspace/retro-tree'
import type { TreeNode } from '@/lib/workspace/retro-tree'

function buildSample(): TreeNode {
  return {
    id: 'root',
    kind: 'root',
    label: 'Agent Harness',
    depth: 0,
    count: 3,
    children: [
      {
        id: 'r:/x/a',
        kind: 'repo',
        label: 'alpha',
        depth: 1,
        count: 3,
        repoPath: '/x/a',
        children: [
          {
            id: 'r:/x/a/t:skill',
            kind: 'type-group',
            label: 'skill',
            depth: 2,
            count: 2,
            repoPath: '/x/a',
            itemType: 'skill',
            children: [],
          },
        ],
      },
    ],
  }
}

describe('<RetroTree />', () => {
  test('renders root label', () => {
    render(<RetroTree tree={buildSample()} expanded={[]} selectedId={null} onSelect={() => {}} onToggle={() => {}} />)
    expect(screen.getByText('Agent Harness')).toBeInTheDocument()
  })

  test('renders repo only at depth 1; type-group hidden until expanded', () => {
    const { rerender } = render(
      <RetroTree
        tree={buildSample()}
        expanded={[]}
        selectedId={null}
        onSelect={() => {}}
        onToggle={() => {}}
      />,
    )
    expect(screen.getByText('alpha')).toBeInTheDocument()
    expect(screen.queryByText('skill')).not.toBeInTheDocument()

    rerender(
      <RetroTree
        tree={buildSample()}
        expanded={['r:/x/a']}
        selectedId={null}
        onSelect={() => {}}
        onToggle={() => {}}
      />,
    )
    expect(screen.getByText('skill')).toBeInTheDocument()
  })

  test('clicking a row fires onSelect with node', () => {
    const onSelect = jest.fn()
    render(
      <RetroTree
        tree={buildSample()}
        expanded={['r:/x/a']}
        selectedId={null}
        onSelect={onSelect}
        onToggle={() => {}}
      />,
    )
    fireEvent.click(screen.getByText('alpha'))
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'r:/x/a', kind: 'repo' }))
  })

  test('clicking toggle button fires onToggle with node id', () => {
    const onToggle = jest.fn()
    render(
      <RetroTree
        tree={buildSample()}
        expanded={[]}
        selectedId={null}
        onSelect={() => {}}
        onToggle={onToggle}
      />,
    )
    const toggleBtn = screen.getByRole('button', { name: /expand alpha/i })
    fireEvent.click(toggleBtn)
    expect(onToggle).toHaveBeenCalledWith('r:/x/a')
  })

  test('selected row gets aria-selected', () => {
    render(
      <RetroTree
        tree={buildSample()}
        expanded={[]}
        selectedId={'r:/x/a'}
        onSelect={() => {}}
        onToggle={() => {}}
      />,
    )
    const row = screen.getByText('alpha').closest('[role="treeitem"]')
    expect(row).toHaveAttribute('aria-selected', 'true')
  })
})
