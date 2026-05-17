'use client'
import useSWR from 'swr'

interface WatchStatus {
  running: boolean
  stale: boolean
}

const fetcher = (url: string) => fetch(url).then(r => r.json())

export function WatchStatusIndicator() {
  const { data } = useSWR<WatchStatus>('/api/watch/status', fetcher, {
    refreshInterval: 5000,
  })
  const running = data?.running === true
  const stale = data?.stale === true

  return (
    <div
      className={`ml-auto flex items-center gap-2 rounded px-2 py-1 text-xs ${
        running
          ? 'bg-green-50 text-green-700'
          : stale
            ? 'bg-yellow-50 text-yellow-700'
            : 'bg-muted text-muted-foreground'
      }`}
    >
      <span
        className={`size-2 rounded-full ${
          running ? 'bg-green-600' : stale ? 'bg-yellow-500' : 'bg-muted-foreground/50'
        }`}
      />
      <span>{running ? 'Watch on' : stale ? 'Watch stale' : 'Watch off'}</span>
    </div>
  )
}
