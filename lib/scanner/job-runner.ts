import { startScan } from '@/lib/registry/queries'
import { getScanPreviewRepos, runScan, type ScanOptions } from './index'

export { getScanPreviewRepos }

let activeScanId: string | null = null

export function getActiveScanId(): string | null {
  return activeScanId
}

export function startBackgroundScan(options: ScanOptions = {}): string {
  if (activeScanId) return activeScanId
  const id = startScan()
  activeScanId = id
  runScan(undefined, id, options)
    .catch(() => {
      // failScan already invoked inside runScan; just clear flag
    })
    .finally(() => {
      activeScanId = null
    })
  return id
}
