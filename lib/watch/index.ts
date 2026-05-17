import os from 'os'
import path from 'path'
import chokidar from 'chokidar'
import { getConfig } from '@/lib/config'
import { discoverRepos } from '@/lib/scanner/discovery'
import { runScan } from '@/lib/scanner'
import { clearWatchStatus, writeWatchStatus } from './status'

export interface WatchOptions {
  debounceMs?: number
  onScan?: (reason: string) => void
}

const WATCH_PATTERNS = [
  path.join(os.homedir(), '.claude'),
  path.join(os.homedir(), '.codex'),
]

const REPO_PATTERNS = ['.claude', 'CLAUDE.md', 'AGENTS.md', '.mcp.json']

export async function startWatcher(opts: WatchOptions = {}): Promise<() => Promise<void>> {
  const debounceMs = opts.debounceMs ?? 1500
  const config = getConfig()
  const repos = await discoverRepos(config)
  const heartbeat = () =>
    writeWatchStatus({
      running: true,
      pid: process.pid,
      lastHeartbeatAt: new Date().toISOString(),
    })
  heartbeat()
  const heartbeatTimer = setInterval(heartbeat, 15_000)

  const paths = [
    ...WATCH_PATTERNS,
    ...repos.flatMap(r => REPO_PATTERNS.map(p => path.join(r.path, p))),
  ]

  const watcher = chokidar.watch(paths, {
    ignored: /(^|[/\\])\../,
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 },
  })

  let pending: NodeJS.Timeout | null = null
  let lastChange = ''

  const trigger = (reason: string): void => {
    lastChange = reason
    if (pending) clearTimeout(pending)
    pending = setTimeout(async () => {
      opts.onScan?.(lastChange)
      try {
        await runScan()
      } catch {
        // failScan already invoked inside runScan
      }
      pending = null
    }, debounceMs)
  }

  watcher
    .on('add', p => trigger(`add ${p}`))
    .on('change', p => trigger(`change ${p}`))
    .on('unlink', p => trigger(`unlink ${p}`))
    .on('addDir', p => trigger(`addDir ${p}`))
    .on('unlinkDir', p => trigger(`unlinkDir ${p}`))

  return async () => {
    if (pending) clearTimeout(pending)
    clearInterval(heartbeatTimer)
    clearWatchStatus()
    await watcher.close()
  }
}
