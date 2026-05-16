'use client'
import { HealthBadge } from './health-badge'
import { Button } from '@/components/ui/button'

export interface PanelItem {
  id: string
  name: string
  type: string
  runtime: string
  scope: string
  health: 'ok' | 'warning' | 'broken'
  issues: string[]
  path: string
  repoPath: string | null
  metadata: Record<string, unknown>
  scannedAt: string
}

export function ItemSidePanel({ item, onClose }: { item: PanelItem; onClose: () => void }) {
  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-background border-l shadow-xl p-4 overflow-auto z-50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold truncate">{item.name}</h3>
        <Button variant="ghost" size="sm" onClick={onClose}>
          ✕
        </Button>
      </div>

      <div className="space-y-3 text-sm">
        <div className="flex gap-2 flex-wrap">
          <HealthBadge health={item.health} />
          <span className="px-2 py-0.5 bg-muted rounded text-xs">{item.runtime}</span>
          <span className="px-2 py-0.5 bg-muted rounded text-xs">{item.type}</span>
          <span className="px-2 py-0.5 bg-muted rounded text-xs">{item.scope}</span>
        </div>

        <div>
          <div className="text-xs text-muted-foreground mb-1">Path</div>
          <div className="font-mono text-xs break-all bg-muted p-2 rounded">{item.path}</div>
        </div>

        {item.issues.length > 0 && (
          <div>
            <div className="text-xs text-muted-foreground mb-1">Issues</div>
            {item.issues.map((issue, i) => (
              <div key={i} className="text-xs text-red-700 bg-red-50 p-2 rounded mb-1">
                {issue}
              </div>
            ))}
          </div>
        )}

        {Object.keys(item.metadata).length > 0 && (
          <div>
            <div className="text-xs text-muted-foreground mb-1">Metadata</div>
            <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-60">
              {JSON.stringify(item.metadata, null, 2)}
            </pre>
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          Scanned: {new Date(item.scannedAt).toLocaleString()}
        </div>
      </div>
    </div>
  )
}
