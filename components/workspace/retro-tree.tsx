'use client'
import type { TreeNode } from '@/lib/workspace/retro-tree'
import { RetroIcon, type RetroIconName } from './retro-icons'

function iconForNode(node: TreeNode, isExpanded: boolean): RetroIconName {
  if (node.kind === 'root') return 'computer'
  return isExpanded ? 'folder-open' : 'folder'
}

interface Props {
  tree: TreeNode
  expanded: string[]
  selectedId: string | null
  onSelect: (node: TreeNode) => void
  onToggle: (id: string) => void
  onContextMenu?: (node: TreeNode, e: React.MouseEvent) => void
}

function Row({
  node,
  expanded,
  selectedId,
  onSelect,
  onToggle,
  onContextMenu,
}: Props & { node: TreeNode }) {
  const isExpanded = expanded.includes(node.id)
  const isSelected = selectedId === node.id
  const hasChildren = node.children.length > 0
  const showToggle = hasChildren || node.kind === 'repo'

  const handleRowClick = () => {
    onSelect(node)
    if (showToggle) onToggle(node.id)
  }

  return (
    <li role="treeitem" aria-selected={isSelected} aria-expanded={hasChildren ? isExpanded : undefined}>
      <div
        className={`rs-tree-row${isSelected ? ' selected' : ''}`}
        onContextMenu={e => {
          if (!onContextMenu) return
          e.preventDefault()
          onContextMenu(node, e)
        }}
        style={{
          paddingLeft: 6 + node.depth * 14,
          paddingTop: 1,
          paddingBottom: 1,
          paddingRight: 6,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          background: isSelected ? '#1c3a6e' : undefined,
          color: isSelected ? '#fff' : undefined,
          cursor: 'default',
        }}
      >
        {showToggle ? (
          <button
            type="button"
            aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${node.label}`}
            onClick={e => {
              e.stopPropagation()
              onToggle(node.id)
            }}
            style={{
              width: 12,
              height: 12,
              fontSize: 10,
              lineHeight: 1,
              border: '1px solid currentColor',
              background: 'transparent',
              color: 'inherit',
              padding: 0,
            }}
          >
            {isExpanded ? '−' : '+'}
          </button>
        ) : (
          <span style={{ width: 12, height: 12 }} />
        )}
        <RetroIcon name={iconForNode(node, isExpanded)} size={16} />
        <span
          onClick={handleRowClick}
          style={{ flex: 1 }}
          data-testid={`retro-tree-label-${node.id}`}
        >
          {node.label}
          {node.kind !== 'root' && (
            <span style={{ marginLeft: 6, color: isSelected ? '#c9d7eb' : '#6b675d' }}>
              ({node.count})
            </span>
          )}
        </span>
      </div>
      {isExpanded && hasChildren && (
        <ul className="rs-tree-group" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {node.children.map(c => (
            <Row
              key={c.id}
              node={c}
              tree={c}
              expanded={expanded}
              selectedId={selectedId}
              onSelect={onSelect}
              onToggle={onToggle}
              onContextMenu={onContextMenu}
            />
          ))}
        </ul>
      )}
    </li>
  )
}

export function RetroTree(props: Props) {
  // Root is always expanded.
  const rootExpanded = props.expanded.includes(props.tree.id)
    ? props.expanded
    : [...props.expanded, props.tree.id]
  return (
    <ul role="tree" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      <Row {...props} expanded={rootExpanded} node={props.tree} />
    </ul>
  )
}
