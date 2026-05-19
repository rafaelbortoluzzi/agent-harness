import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const items = sqliteTable('items', {
  id: text('id').primaryKey(),
  runtime: text('runtime').notNull(),
  scope: text('scope').notNull(),
  type: text('type').notNull(),
  name: text('name').notNull(),
  path: text('path').notNull(),
  repoPath: text('repo_path'),
  health: text('health').notNull().default('ok'),
  issues: text('issues', { mode: 'json' }).notNull().$type<string[]>().default([]),
  metadata: text('metadata', { mode: 'json' })
    .notNull()
    .$type<Record<string, unknown>>()
    .default({}),
  scannedAt: text('scanned_at').notNull(),
  qualityScore: integer('quality_score'),
  qualityRationale: text('quality_rationale'),
  judgedAt: text('judged_at'),
})

export const recommendations = sqliteTable('recommendations', {
  id: text('id').primaryKey(),
  repoPath: text('repo_path').notNull(),
  kind: text('kind', { enum: ['skill', 'agent', 'hook'] }).notNull(),
  name: text('name').notNull(),
  rationale: text('rationale').notNull(),
  createdAt: text('created_at').notNull(),
})

export const scans = sqliteTable('scans', {
  id: text('id').primaryKey(),
  startedAt: text('started_at').notNull(),
  finishedAt: text('finished_at'),
  reposScanned: integer('repos_scanned').default(0),
  itemsFound: integer('items_found').default(0),
  itemsBroken: integer('items_broken').default(0),
  itemsNew: integer('items_new').default(0),
  itemsRemoved: integer('items_removed').default(0),
  itemsChanged: integer('items_changed').default(0),
  status: text('status', { enum: ['running', 'done', 'error'] }).notNull().default('running'),
  error: text('error'),
})

export const repos = sqliteTable('repos', {
  path: text('path').primaryKey(),
  label: text('label'),
  source: text('source', { enum: ['config', 'auto-discovered', 'manual'] }).notNull(),
  addedAt: text('added_at').notNull(),
  lastScannedAt: text('last_scanned_at'),
  healthScore: integer('health_score'),
})

export const snoozedItems = sqliteTable('snoozed_items', {
  itemId: text('item_id').primaryKey(),
  reason: text('reason'),
  snoozedAt: text('snoozed_at').notNull(),
  untilDate: text('until_date'),
})

export const aiRuns = sqliteTable('ai_runs', {
  id: text('id').primaryKey(),
  action: text('action', { enum: ['judge', 'analyze', 'improve'] }).notNull(),
  provider: text('provider'),
  presetId: text('preset_id'),
  target: text('target', { mode: 'json' }).notNull().$type<Record<string, unknown>>(),
  systemPrompt: text('system_prompt').notNull(),
  userPrompt: text('user_prompt').notNull(),
  resultSummary: text('result_summary'),
  status: text('status', { enum: ['done', 'error'] }).notNull(),
  createdAt: text('created_at').notNull(),
})
