import fs from 'fs'
import path from 'path'
import { CONFIG_DIR } from '@/lib/config'

const STATUS_FILE = 'watch-status.json'
const STALE_AFTER_MS = 60_000

export interface WatchStatusFile {
  running: boolean
  pid: number | null
  lastHeartbeatAt: string | null
}

export interface WatchStatus extends WatchStatusFile {
  stale: boolean
}

function statusPath(): string {
  return path.join(CONFIG_DIR(), STATUS_FILE)
}

export function writeWatchStatus(status: WatchStatusFile): void {
  fs.mkdirSync(CONFIG_DIR(), { recursive: true })
  fs.writeFileSync(statusPath(), JSON.stringify(status, null, 2))
}

export function clearWatchStatus(): void {
  fs.rmSync(statusPath(), { force: true })
}

export function getWatchStatus(opts: { now?: Date } = {}): WatchStatus {
  if (!fs.existsSync(statusPath())) {
    return { running: false, pid: null, lastHeartbeatAt: null, stale: false }
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(statusPath(), 'utf8')) as WatchStatusFile
    const lastHeartbeatAt = parsed.lastHeartbeatAt ?? null
    const age =
      lastHeartbeatAt === null
        ? Number.POSITIVE_INFINITY
        : (opts.now ?? new Date()).getTime() - new Date(lastHeartbeatAt).getTime()
    const stale = age > STALE_AFTER_MS

    return {
      running: Boolean(parsed.running) && !stale,
      pid: parsed.pid ?? null,
      lastHeartbeatAt,
      stale,
    }
  } catch {
    return { running: false, pid: null, lastHeartbeatAt: null, stale: true }
  }
}
