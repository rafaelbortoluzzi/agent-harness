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

## CLI

```sh
pnpm cli scan [--json]            # scan + persist registry
pnpm cli list --runtime claude    # list items, optionally filtered
pnpm cli doctor                   # repo health summary; exit 1 if broken
pnpm cli export <path>            # backup registry.db
pnpm cli snooze <item-id> [--days N] [--reason TEXT]
```

CLI is the source of truth for CI integration. UI is a view layer.

## UI

- **Dashboard** — health score per repo, broken items, "Scan Now" with progress polling
- **Inventory** — filterable + paginated table with debounced search; click row → side panel
- **Scan Log** — chronological scan history with duration + status
- **Settings** — discovery roots, explicit repos, depth, LLM key status

## Supported Runtimes

| Runtime | Scans |
|---------|-------|
| Claude Code | `~/.claude/skills/<name>/SKILL.md`, agents, rules, commands, plugins, hooks + MCPs from `settings.json` / `settings.local.json`, repo `.claude/`, `CLAUDE.md`, `.mcp.json` |
| Codex | `~/.codex/config.toml` (mcp_servers), `hooks.json`, `AGENTS.md`, `prompts/`, repo `AGENTS.md` |

Add your own — see [CONTRIBUTING.md](CONTRIBUTING.md).

## Security

- Next.js dev/start scripts bind to `127.0.0.1` only — never `0.0.0.0`
- `ANTHROPIC_API_KEY` read server-side only; never exposed to the client
- SQLite registry stored at `~/.agent-harness/registry.db` with WAL + foreign keys

## Data

User data lives at `~/.agent-harness/` (override with `AGENT_HARNESS_DIR`):

- `config.json` — discovery roots, depth, health weights
- `registry.db` — items, scans, repos, snoozes

## Roadmap

Phase 2 (separate plan):
- LLM judge — score skill quality with Claude
- LLM gap analyst — recommend missing skills/agents per repo
- LLM skill editor — stream-edit a skill, apply diff
- File watching — auto-scan on `.claude/` change
