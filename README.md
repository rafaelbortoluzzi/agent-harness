# Agent Harness

Local-first tool that inventories, validates, and surfaces health of AI agent environments (skills, agents, hooks, MCPs, instructions, plugins) across Claude Code, Codex, and other runtimes.

## Quick Start

```sh
git clone https://github.com/<you>/agent-harness
cd agent-harness
pnpm install
pnpm cli scan
pnpm dev   # then open http://127.0.0.1:3000
```

Zero config needed. Add discovery roots via Settings or `~/.agent-harness/config.json`.

Current local smoke scan:

- 11 repos discovered from `/Users/rafaelbortoluzzi/code`
- 116 registry items
- 0 broken items
- Caveman detected from `~/.claude/plugins/marketplaces/caveman`

![Agent Harness dashboard](public/agent-harness-dashboard.png)

## CLI

```sh
pnpm cli scan [--json]            # scan + persist registry
pnpm cli list --runtime claude    # list items, optionally filtered
pnpm cli doctor                   # repo health summary; exit 1 if broken
pnpm cli export <path>            # backup registry.db
pnpm cli snooze <item-id> [--days N] [--reason TEXT]
pnpm cli judge [--runtime X] [--limit N]      # LLM quality scores
pnpm cli analyze [--repo PATH]                # LLM gap recommendations
pnpm cli watch                                # daemon: auto-scan on change
```

CLI is the source of truth for CI integration. UI is a view layer.

## UI

The web app is a VS Code-style local workspace for browsing, judging, editing,
and previewing agent runtime files.

- **Explorer** — repo tree grouped by runtime item type, with filters for all,
  broken/warn, and unscored items.
- **Tabs** — Welcome, recommendations/settings views, editor tabs, and internal
  preview tabs share one workspace tab bar.
- **Context actions** — right-click or Option-click tabs, repos, sections, and
  units to open an action dialog with keyboard shortcuts for close, preview,
  copy path, judge, analyze, improve, save, save as, and remove.
- **Markdown preview** — Preview Markdown opens a dedicated browser tab at
  `/preview?id=<item-id>` with rendered Markdown, tables, lists, code blocks,
  links, images, and normal page scrolling.
- **Side panel** — selected items show metadata, health, LLM score/rationale,
  edit controls, and snooze actions.
- **Recommendations** — scoped LLM analysis by all repos, repo, section, or
  unit, with provider selection and one-click skill draft creation.
- **Scan flow** — scanning previews auto-discovered repos and asks whether to
  add them with per-repo yes/no plus yes-to-all/no-to-all controls.
- **Status bar** — watch status, active LLM provider status, scan freshness,
  inventory counts, warnings, and current tab.

## Supported Runtimes

| Runtime | Scans |
|---------|-------|
| Claude Code | `~/.claude/skills/<name>/SKILL.md`, agents, rules, commands, plugins, hooks + MCPs from `settings.json` / `settings.local.json`, repo `.claude/`, `CLAUDE.md`, `.mcp.json` |
| Codex | `~/.codex/config.toml` (mcp_servers), `hooks.json`, `AGENTS.md`, `prompts/`, repo `AGENTS.md` |

Add your own — see [CONTRIBUTING.md](CONTRIBUTING.md).

## Security

- Next.js dev/start scripts bind to `127.0.0.1` only — never `0.0.0.0`
- `ANTHROPIC_API_KEY` is read server-side only when using the API provider; never exposed to the client
- SQLite registry stored at `~/.agent-harness/registry.db` with WAL + foreign keys

## Data

User data lives at `~/.agent-harness/` (override with `AGENT_HARNESS_DIR`):

- `config.json` — discovery roots, depth, health weights
- `registry.db` — items, scans, repos, snoozes

## LLM Features (Phase 2/V2)

All optional. Select a provider with `AGENT_HARNESS_LLM_PROVIDER`:

- `claude-code-cli` — uses local `claude` CLI login for judge and gap analysis.
- `codex-cli` — uses local `codex` CLI login for judge and gap analysis.
- `anthropic-api` — default; uses `ANTHROPIC_API_KEY`.

- **Judge** — `pnpm cli judge` scores each skill/agent/rule/command 0-10 with one-sentence rationale. The UI can judge all items, a repo, a section, or a single unit.
- **Gap analyst** — `pnpm cli analyze` recommends up to 5 missing skills/agents per repo based on the existing inventory. The UI supports all/repo/section/unit scope and provider selection.
- **Improve** — context actions can open an improvement prompt for a specific item using the selected provider.
- **Skill editor** — Editor tabs save back to disk, Save As can write to an absolute path, and streaming edits can be applied atomically (tmp + rename).
- **Watch** — `pnpm cli watch` runs a chokidar daemon over `~/.claude/`, `~/.codex/`, and `<repo>/.claude/`, debounced to 1.5s, triggering a full rescan on change. The header polls local watch status and shows on/stale/off.

## Roadmap

See [ROADMAP.md](ROADMAP.md) for the current status ledger, known debt, and
next development slice.

Phase 3 ideas:

- Remote registry for team-wide inventory
- Adapters for additional runtimes (Cursor, Aider, Continue)
