'use client'
import useSWR from 'swr'
import { Anchor, Bot } from 'lucide-react'
import { useWorkspace } from '@/lib/workspace/store'

interface WatchStatus {
  running: boolean
  stale: boolean
}

interface Config {
  llmProvider: string
  llmConnected: boolean
}

interface Scan {
  id: string
  startedAt: string
  itemsFound: number | null
  itemsBroken: number | null
}

interface Item {
  id: string
  health: 'ok' | 'warning' | 'broken'
}

const fetcher = (u: string) => fetch(u).then(r => r.json())

function ago(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export function StatusBar() {
  const { state } = useWorkspace()
  const { data: watch } = useSWR<WatchStatus>('/api/watch/status', fetcher, {
    refreshInterval: 5000,
  })
  const { data: config } = useSWR<Config>('/api/config', fetcher)
  const { data: scans } = useSWR<Scan[]>('/api/registry?resource=scans', fetcher, {
    refreshInterval: 5000,
  })
  const { data: items = [] } = useSWR<Item[]>('/api/registry?limit=1000', fetcher)

  const latest = scans?.[0]
  const watchOn = watch?.running === true
  const watchStale = watch?.stale === true
  const totalItems = items.length
  const broken = items.filter(i => i.health === 'broken').length
  const warns = items.filter(i => i.health === 'warning').length

  const currentTab = state.tabs.find(t => t.id === state.current)
  const currentLabel = currentTab?.name ?? '—'

  return (
    <footer className="ah-statusbar" aria-label="Status bar">
      <span className="ah-seg">
        <Anchor size={11} strokeWidth={1.6} /> watch {watchOn ? 'ON' : watchStale ? 'STALE' : 'OFF'}
      </span>
      <span className="ah-seg">
        <Bot size={11} strokeWidth={1.6} /> {config?.llmProvider ?? 'no llm'}
        {config && !config.llmConnected ? ' off' : ''}
      </span>
      <span className="ah-seg">
        {latest ? `scan ${ago(latest.startedAt)}` : 'no scans'}
        {state.scanning ? ' · running' : ''}
      </span>
      <span className="ah-grow" />
      <span className="ah-seg">{totalItems} items</span>
      {broken > 0 ? (
        <span className="ah-seg alert">✕ {broken} broken</span>
      ) : (
        <span className="ah-seg">✓ 0 broken</span>
      )}
      <span className="ah-seg">▲ {warns} warn</span>
      <span className="ah-seg">{currentLabel}</span>
    </footer>
  )
}
