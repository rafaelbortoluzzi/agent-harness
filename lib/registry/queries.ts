import { randomUUID } from 'crypto'
import { and, desc, eq, isNull, notInArray, sql } from 'drizzle-orm'
import { getDb } from './db'
import { items, recommendations, repos, scans, snoozedItems } from './schema'
import type {
  Health,
  ItemType,
  RegistryItem,
  Runtime,
  Scope,
} from '@/lib/scanner/adapters/base'

export interface ItemFilter {
  runtime?: Runtime
  health?: Health
  type?: ItemType
  scope?: Scope
  repoPath?: string
  excludeSnoozed?: boolean
}

export interface Page {
  limit?: number
  offset?: number
}

export function upsertItem(item: RegistryItem): void {
  getDb()
    .insert(items)
    .values(item)
    .onConflictDoUpdate({
      target: items.id,
      set: {
        health: item.health,
        issues: item.issues,
        metadata: item.metadata,
        scannedAt: item.scannedAt,
      },
    })
    .run()
}

export function deleteItemsMissingFromScan(currentItemIds: string[]): number {
  const query = getDb().delete(items)
  const result = currentItemIds.length
    ? query.where(notInArray(items.id, currentItemIds)).run()
    : query.run()
  const snoozeQuery = getDb().delete(snoozedItems)
  if (currentItemIds.length) {
    snoozeQuery.where(notInArray(snoozedItems.itemId, currentItemIds)).run()
  } else {
    snoozeQuery.run()
  }
  return result.changes
}

function buildWhere(filter: ItemFilter) {
  const conds = []
  if (filter.runtime) conds.push(eq(items.runtime, filter.runtime))
  if (filter.health) conds.push(eq(items.health, filter.health))
  if (filter.type) conds.push(eq(items.type, filter.type))
  if (filter.scope) conds.push(eq(items.scope, filter.scope))
  if (filter.repoPath) conds.push(eq(items.repoPath, filter.repoPath))
  if (filter.excludeSnoozed) {
    const snoozed = getDb()
      .select({ id: snoozedItems.itemId })
      .from(snoozedItems)
      .all()
      .map(r => r.id)
    if (snoozed.length) conds.push(notInArray(items.id, snoozed))
  }
  return conds.length ? and(...conds) : undefined
}

export function getItems(filter: ItemFilter = {}, page: Page = {}): RegistryItem[] {
  let q = getDb().select().from(items).where(buildWhere(filter)).orderBy(desc(items.scannedAt))
    .$dynamic()
  if (page.limit !== undefined) q = q.limit(page.limit)
  if (page.offset !== undefined) q = q.offset(page.offset)
  return q.all() as RegistryItem[]
}

export function getItemById(id: string): RegistryItem | null {
  return (getDb().select().from(items).where(eq(items.id, id)).get() as RegistryItem | undefined) ?? null
}

export function countItems(filter: ItemFilter = {}): number {
  return getDb().select().from(items).where(buildWhere(filter)).all().length
}

export function startScan(): string {
  const id = randomUUID()
  getDb()
    .insert(scans)
    .values({ id, startedAt: new Date().toISOString(), status: 'running' })
    .run()
  return id
}

export function finishScan(
  id: string,
  stats: {
    reposScanned: number
    itemsFound: number
    itemsBroken: number
    itemsNew?: number
    itemsRemoved?: number
    itemsChanged?: number
  },
): void {
  getDb()
    .update(scans)
    .set({
      finishedAt: new Date().toISOString(),
      status: 'done',
      reposScanned: stats.reposScanned,
      itemsFound: stats.itemsFound,
      itemsBroken: stats.itemsBroken,
      itemsNew: stats.itemsNew ?? 0,
      itemsRemoved: stats.itemsRemoved ?? 0,
      itemsChanged: stats.itemsChanged ?? 0,
    })
    .where(eq(scans.id, id))
    .run()
}

export function failScan(id: string, error: string): void {
  getDb()
    .update(scans)
    .set({ finishedAt: new Date().toISOString(), status: 'error', error })
    .where(eq(scans.id, id))
    .run()
}

export function getScan(id: string) {
  return getDb().select().from(scans).where(eq(scans.id, id)).get()
}

export function getScans(limit = 20) {
  return getDb().select().from(scans).orderBy(desc(scans.startedAt)).limit(limit).all()
}

export function upsertRepo(repo: {
  path: string
  label?: string
  source: 'config' | 'auto-discovered' | 'manual'
}): void {
  getDb()
    .insert(repos)
    .values({
      path: repo.path,
      label: repo.label ?? null,
      source: repo.source,
      addedAt: new Date().toISOString(),
    })
    .onConflictDoUpdate({
      target: repos.path,
      set: { label: repo.label ?? null, source: repo.source },
    })
    .run()
}

export function updateRepoHealth(repoPath: string, score: number): void {
  getDb()
    .update(repos)
    .set({ healthScore: score, lastScannedAt: new Date().toISOString() })
    .where(eq(repos.path, repoPath))
    .run()
}

export function getRepos() {
  return getDb().select().from(repos).orderBy(repos.path).all()
}

export function snoozeItem(
  itemId: string,
  reason: string | null,
  untilDate: string | null,
): void {
  getDb()
    .insert(snoozedItems)
    .values({ itemId, reason, snoozedAt: new Date().toISOString(), untilDate })
    .onConflictDoUpdate({
      target: snoozedItems.itemId,
      set: { reason, untilDate },
    })
    .run()
}

export function unsnoozeItem(itemId: string): void {
  getDb().delete(snoozedItems).where(eq(snoozedItems.itemId, itemId)).run()
}

export function getSnoozed(): string[] {
  return getDb().select({ id: snoozedItems.itemId }).from(snoozedItems).all().map(r => r.id)
}

export function getSnooze(itemId: string) {
  return getDb().select().from(snoozedItems).where(eq(snoozedItems.itemId, itemId)).get() ?? null
}

export function setVerdict(itemId: string, score: number, rationale: string): void {
  getDb()
    .update(items)
    .set({
      qualityScore: score,
      qualityRationale: rationale,
      judgedAt: new Date().toISOString(),
    })
    .where(eq(items.id, itemId))
    .run()
}

export function getUnjudgedItems(types: string[], limit?: number): RegistryItem[] {
  let q = getDb()
    .select()
    .from(items)
    .where(and(isNull(items.judgedAt), sql`${items.type} IN (${sql.join(types.map(t => sql`${t}`), sql`, `)})`))
    .orderBy(desc(items.scannedAt))
    .$dynamic()
  if (limit) q = q.limit(limit)
  return q.all() as RegistryItem[]
}

export function upsertRecommendation(rec: {
  id: string
  repoPath: string
  kind: 'skill' | 'agent' | 'hook'
  name: string
  rationale: string
}): void {
  getDb()
    .insert(recommendations)
    .values({ ...rec, createdAt: new Date().toISOString() })
    .onConflictDoUpdate({
      target: recommendations.id,
      set: { rationale: rec.rationale, createdAt: new Date().toISOString() },
    })
    .run()
}

export function getRecommendations(repoPath?: string) {
  const q = getDb().select().from(recommendations).orderBy(desc(recommendations.createdAt))
  return repoPath
    ? q.where(eq(recommendations.repoPath, repoPath)).all()
    : q.all()
}

export function getRecommendationById(id: string) {
  return getDb().select().from(recommendations).where(eq(recommendations.id, id)).get() ?? null
}

export function clearRecommendations(repoPath: string): void {
  getDb().delete(recommendations).where(eq(recommendations.repoPath, repoPath)).run()
}
