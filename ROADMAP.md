# Agent Harness Roadmap

Last updated: 2026-05-17

This file is the project status ledger. Keep it updated when phases finish,
when priorities change, or when new known debt is discovered.

## Current Status

Agent Harness is a local-first Next.js + TypeScript app and CLI for scanning,
validating, judging, and editing agent runtime assets such as skills, agents,
hooks, MCPs, instructions, plugins, and rules.

| Phase | Status | Tag |
| --- | --- | --- |
| 1a - Scanner, registry, CLI | Done | v0.1.0 |
| 1b - UI, API, CI | Done | v0.1.0 |
| 2 - LLM judge, gap analyst, editor, watch mode | Done | v0.2.0 |
| 3a - Per-scan registry diff in Scan Log | Done | unreleased |
| 3b - Snooze UI | Done | unreleased |
| 3c - Create skill from recommendation | Done | unreleased |
| 3d - Watch mode status indicator | Done | unreleased |

Confirmed locally on 2026-05-17:

- Tests: 100 passing.
- Build: passing, with the known Turbopack trace warning listed below.
- Lint: passing for touched source/test files; full lint is currently blocked
  by untracked design handoff reference JSX.
- Routes: 21 generated app routes.
- Tags: v0.1.0, v0.2.0.
- Package version: 0.2.0.
- CLI: available for scan, list, doctor, export, snooze, judge, analyze, watch.
- Real local scan: 11 repos, 116 items, 0 broken.
- Detected plugins: Caveman from `~/.claude/plugins/marketplaces/caveman`.

## Progress Log

### 2026-05-16

- Added this roadmap as the shared status ledger.
- Aligned `package.json` version with the latest `v0.2.0` tag.
- Saved `/Users/rafaelbortoluzzi/code` as the real auto-discovery root through
  `/api/config`.
- Ran a real scan and confirmed 11 repos, 116 registry items, and 0 broken
  items.
- Fixed Claude marketplace plugin detection so packaged plugins such as Caveman
  are scanned from `plugins/marketplaces/<name>/<name>.skill`.
- Added stale registry item cleanup after successful scans, so removed or
  reclassified items no longer stay visible after later scans.
- Fixed current ESLint errors in config tests, dashboard polling, and the
  mobile breakpoint hook.
- Committed the current work locally as
  `9262f72 chore: document roadmap and scan real plugins`.
- GitHub publishing is blocked until GitHub CLI (`gh`) is installed or a remote
  repository is created manually.
- Captured a real dashboard screenshot at
  `public/agent-harness-dashboard.png` and added it to the README.
- LLM smoke is blocked until `ANTHROPIC_API_KEY` is exported in the shell used
  to run Agent Harness.
- Cleaned up snoozes for stale registry items during successful scans.
- Added per-scan diff counters for new, removed, and changed registry items,
  persisted them on scan completion, and surfaced them in Scan Log.
- Fixed scan summaries to count broken items and repo health from validated
  registry items rather than pre-validation adapter output.
- Added `/api/snooze` plus Inventory/side-panel controls to snooze and
  unsnooze items without using the CLI.
- Added `/api/recommendations/create-skill` and a Recommendations page action
  that creates `.claude/skills/<name>/SKILL.md` drafts from skill
  recommendations.
- Verified the create-skill recommendation flow in Browser with a temporary
  recommendation, then removed the temporary registry row and draft skill.
- Added watch status persistence, `/api/watch/status`, and a header indicator
  that shows whether `pnpm cli watch` is running, stale, or off.
- Created the public GitHub repo at
  `https://github.com/rafaelbortoluzzi/agent-harness`, pushed `main`, and
  pushed tags `v0.1.0` and `v0.2.0`.
- Added a dedicated `getItemById` registry query and switched `/api/edit` away
  from full-list lookups.

### 2026-05-17

- Added selectable LLM providers through `AGENT_HARNESS_LLM_PROVIDER`:
  `anthropic-api`, `claude-code-cli`, and `codex-cli`.
- Switched judge and gap analysis to the provider abstraction so Claude Code CLI
  and Codex CLI can run from local logged-in subscriptions instead of API
  credits.
- Kept inventory editor streaming on the Anthropic API path and exposed that
  separately in UI config.
- Verified tiny provider smokes and `pnpm cli judge --limit 1 --json` with both
  `claude-code-cli` and `codex-cli`.
- Fixed the VSCode-style central pane so non-editor tabs such as Settings,
  Welcome, and Recommendations scroll inside the app shell instead of being
  clipped behind the bottom panel.
- Moved LLM provider selection into runtime app config at
  `~/.agent-harness/config.json`, while preserving env-var fallback through
  `AGENT_HARNESS_LLM_PROVIDER`.
- Added Settings UI provider rows with selected/available/test states, plus
  `/api/config/llm-test` for smoke-testing the chosen provider.
- Added `openai-api` as a Codex/OpenAI API provider using `OPENAI_API_KEY` and
  the Responses API, with `gpt-5.2-codex` as the default model.
- Kept API keys environment-only; the app persists only the selected provider.
- Committed the runtime provider and scroll fix locally as
  `b846be2 feat: add LLM selection and view scroll`.

## Immediate Next Work

1. Run gap analysis end to end with one CLI provider.
2. Run editor stream/apply smoke with `ANTHROPIC_API_KEY` set.
3. Decide whether stale registry cleanup should also cascade to recommendations
   when repos are removed.
4. Add Playwright E2E smoke for Settings scroll and provider switching.

## Phase 3 Backlog

| Item | Effort | Value |
| --- | --- | --- |
| Additional adapters: Cursor `.cursorrules`, Aider, Continue | M each | Medium |
| Remote registry for multi-developer sharing | L | High for teams |
| Playwright E2E smoke for the main pages | M | Regression safety |
| Per-skill judge history instead of overwrite-only results | S | Trend tracking |
| Paginate broken item dashboard list | XS | Scale |

## Known Debt

- `lib/scanner/index.ts` uses singleton adapter instances, which makes adapter
  mocking awkward. Refactor toward factory injection.
- `judgeUnjudged` uses fixed concurrency of 4; make this configurable.
- `/api/judge`, `/api/analyze`, and `/api/edit` have no rate limiting.
- Recommendations can become orphaned if repos are removed without a later
  `analyzeAndPersist` cleanup.
- Build emits a Next/Turbopack trace warning through the scanner import path:
  `next.config.ts -> lib/scanner/adapters/claude.ts -> lib/scanner/index.ts`.
- Concurrent CLI commands can contend on SQLite and return `database is locked`.
- Full `pnpm lint` also scans untracked design handoff reference JSX in the
  current worktree; either commit/exclude/fix those reference files before
  treating global lint as a release gate again.

## Coverage

Current tests cover config, config API provider metadata, provider smoke-test
route behavior, database helpers, registry queries, Claude adapter, Codex
adapter, discovery, validators, health scoring, LLM provider selection, judge
parser, and gap parser.

Missing or incomplete coverage:

- LLM integration tests with mocked SDK and fixtures.
- UI tests.
- Watcher integration tests.
- Editor stream tests.
- CLI/SQLite concurrency behavior.

## Update Rules

- Move completed work from backlog into Current Status or a short dated note.
- Keep Immediate Next Work to the next concrete slice, not the full wishlist.
- Add debt only when it has a concrete file, behavior, or operational impact.
- When a release tag is cut, update the phase table and confirmed local checks.
