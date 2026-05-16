import { getConfig } from '@/lib/config'
import {
  failScan,
  finishScan,
  startScan,
  updateRepoHealth,
  upsertItem,
  upsertRepo,
} from '@/lib/registry/queries'
import { computeHealthScore } from '@/lib/health'
import { CompletenessValidator } from '@/lib/validators/completeness'
import { DuplicatesValidator } from '@/lib/validators/duplicates'
import { PathExistsValidator } from '@/lib/validators/path-exists'
import { ClaudeAdapter } from './adapters/claude'
import { CodexAdapter } from './adapters/codex'
import type { RegistryItem, RuntimeAdapter } from './adapters/base'
import { discoverRepos } from './discovery'

export const ADAPTERS: RuntimeAdapter[] = [new ClaudeAdapter(), new CodexAdapter()]

export interface ScanResult {
  scanId: string
  itemCount: number
  brokenCount: number
}

export async function runScan(
  onProgress?: (msg: string) => void,
  scanId?: string,
): Promise<ScanResult> {
  const id = scanId ?? startScan()
  try {
    const config = getConfig()
    const repos = await discoverRepos(config)
    onProgress?.(`Discovered ${repos.length} repos`)

    const personalResults = await Promise.all(ADAPTERS.map(a => a.scanPersonal()))
    const allItems: RegistryItem[] = personalResults.flat()

    const repoResults = await Promise.all(
      repos.map(async repo => {
        upsertRepo({ path: repo.path, source: repo.source })
        const lists = await Promise.all(ADAPTERS.map(a => a.scanRepo(repo.path)))
        return { repoPath: repo.path, items: lists.flat() }
      }),
    )

    for (const { items } of repoResults) allItems.push(...items)
    onProgress?.(`Collected ${allItems.length} items`)

    const pathV = new PathExistsValidator()
    const dupV = new DuplicatesValidator(allItems)
    const compV = new CompletenessValidator()

    for (const item of allItems) {
      const results = [pathV.validate(item), dupV.validate(item), compV.validate(item)]
      const issues = results.flatMap(r => r.issues)
      const broken = results.some(r => r.health === 'broken')
      const warning = results.some(r => r.health === 'warning')
      upsertItem({
        ...item,
        health: broken ? 'broken' : warning ? 'warning' : 'ok',
        issues,
      })
    }

    for (const { repoPath, items } of repoResults) {
      updateRepoHealth(repoPath, computeHealthScore(items))
    }

    const brokenCount = allItems.filter(i => i.health === 'broken').length
    finishScan(id, {
      reposScanned: repos.length,
      itemsFound: allItems.length,
      itemsBroken: brokenCount,
    })

    return { scanId: id, itemCount: allItems.length, brokenCount }
  } catch (err) {
    failScan(id, (err as Error).message)
    throw err
  }
}
