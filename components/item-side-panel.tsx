'use client'
import { useState } from 'react'
import useSWR from 'swr'
import { HealthBadge } from './health-badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const fetcher = (u: string) => fetch(u).then(r => r.json())

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
  qualityScore?: number | null
  qualityRationale?: string | null
  judgedAt?: string | null
}

interface SnoozeState {
  snooze: {
    itemId: string
    reason: string | null
    untilDate: string | null
  } | null
}

export function ItemSidePanel({
  item,
  onClose,
  onChanged,
}: {
  item: PanelItem
  onClose: () => void
  onChanged?: () => void
}) {
  const { data: config } = useSWR<{ llmConnected: boolean }>('/api/config', fetcher)
  const snooze = useSWR<SnoozeState>(`/api/snooze?itemId=${encodeURIComponent(item.id)}`, fetcher)
  const [showEditor, setShowEditor] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [streamed, setStreamed] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [applied, setApplied] = useState(false)
  const [snoozeDays, setSnoozeDays] = useState('7')
  const [snoozeReason, setSnoozeReason] = useState('')
  const [snoozing, setSnoozing] = useState(false)

  const canEdit =
    config?.llmConnected &&
    ['skill', 'agent', 'rule', 'command', 'instruction'].includes(item.type)

  const refreshAfterSnooze = async () => {
    await snooze.mutate()
    onChanged?.()
  }

  const saveSnooze = async () => {
    setSnoozing(true)
    setError(null)
    try {
      const resp = await fetch('/api/snooze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: item.id,
          days: Number(snoozeDays),
          reason: snoozeReason,
        }),
      })
      if (!resp.ok) setError(`Snooze failed: HTTP ${resp.status}`)
      else await refreshAfterSnooze()
    } finally {
      setSnoozing(false)
    }
  }

  const clearSnooze = async () => {
    setSnoozing(true)
    setError(null)
    try {
      const resp = await fetch('/api/snooze', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: item.id }),
      })
      if (!resp.ok) setError(`Unsnooze failed: HTTP ${resp.status}`)
      else await refreshAfterSnooze()
    } finally {
      setSnoozing(false)
    }
  }

  const runEdit = async () => {
    setStreaming(true)
    setStreamed('')
    setError(null)
    setApplied(false)
    try {
      const resp = await fetch('/api/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: item.id, prompt }),
      })
      if (!resp.ok || !resp.body) {
        setError(`HTTP ${resp.status}`)
        return
      }
      const reader = resp.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line) continue
          try {
            const chunk = JSON.parse(line) as { type: string; text?: string; error?: string }
            if (chunk.type === 'text' && chunk.text) {
              setStreamed(prev => prev + chunk.text)
            } else if (chunk.type === 'error' && chunk.error) {
              setError(chunk.error)
            }
          } catch {
            // skip
          }
        }
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setStreaming(false)
    }
  }

  const apply = async () => {
    setError(null)
    const resp = await fetch('/api/edit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId: item.id, apply: true, content: streamed }),
    })
    if (resp.ok) setApplied(true)
    else setError(`Apply failed: HTTP ${resp.status}`)
  }

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

        {item.qualityScore !== null && item.qualityScore !== undefined && (
          <div>
            <div className="text-xs text-muted-foreground mb-1">Quality (LLM)</div>
            <div className="flex items-center gap-2">
              <span
                className={`px-2 py-1 rounded text-sm font-mono font-bold ${
                  item.qualityScore >= 7
                    ? 'bg-green-100 text-green-800'
                    : item.qualityScore >= 4
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                }`}
              >
                {item.qualityScore}/10
              </span>
              {item.judgedAt && (
                <span className="text-xs text-muted-foreground">
                  {new Date(item.judgedAt).toLocaleDateString()}
                </span>
              )}
            </div>
            {item.qualityRationale && (
              <p className="text-xs text-muted-foreground mt-2 italic">{item.qualityRationale}</p>
            )}
          </div>
        )}

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

        <div className="border-t pt-3 space-y-2">
          <div className="text-xs text-muted-foreground">Snooze</div>
          {snooze.data?.snooze ? (
            <div className="space-y-2">
              <div className="text-xs bg-muted p-2 rounded">
                {snooze.data.snooze.untilDate
                  ? `Until ${new Date(snooze.data.snooze.untilDate).toLocaleDateString()}`
                  : 'No expiration'}
                {snooze.data.snooze.reason && (
                  <span className="block text-muted-foreground mt-1">
                    {snooze.data.snooze.reason}
                  </span>
                )}
              </div>
              <Button size="sm" variant="outline" onClick={clearSnooze} disabled={snoozing}>
                Unsnooze
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Select value={snoozeDays} onValueChange={v => setSnoozeDays(v ?? '7')}>
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 day</SelectItem>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="0">No expiry</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Reason"
                  value={snoozeReason}
                  onChange={e => setSnoozeReason(e.target.value)}
                />
              </div>
              <Button size="sm" variant="outline" onClick={saveSnooze} disabled={snoozing}>
                Snooze
              </Button>
            </div>
          )}
        </div>

        {canEdit && (
          <div className="border-t pt-3 space-y-2">
            {!showEditor ? (
              <Button size="sm" variant="outline" onClick={() => setShowEditor(true)}>
                Edit with Claude
              </Button>
            ) : (
              <>
                <Input
                  placeholder="Describe the edit (e.g. tighten triggers)…"
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={runEdit} disabled={streaming || !prompt.trim()}>
                    {streaming ? 'Streaming…' : 'Generate'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setShowEditor(false); setStreamed(''); setPrompt(''); setError(null); setApplied(false)
                    }}
                  >
                    Cancel
                  </Button>
                </div>
                {error && <div className="text-xs text-red-600">{error}</div>}
                {streamed && (
                  <>
                    <pre className="text-xs bg-muted p-2 rounded max-h-80 overflow-auto whitespace-pre-wrap">
                      {streamed}
                    </pre>
                    {!applied ? (
                      <Button size="sm" onClick={apply} disabled={streaming}>
                        Apply to disk
                      </Button>
                    ) : (
                      <span className="text-xs text-green-700">✓ Applied. Rescan to refresh metadata.</span>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
