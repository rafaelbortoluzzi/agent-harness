import { startScan } from '@/lib/registry/queries'
import { runScan } from './index'

let activeScanId: string | null = null

export function getActiveScanId(): string | null {
  return activeScanId
}

export function startBackgroundScan(): string {
  if (activeScanId) return activeScanId
  const id = startScan()
  activeScanId = id
  runScan(undefined, id)
    .catch(() => {
      // failScan already invoked inside runScan; just clear flag
    })
    .finally(() => {
      activeScanId = null
    })
  return id
}
