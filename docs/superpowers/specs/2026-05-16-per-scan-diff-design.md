# Per-Scan Diff Design

Date: 2026-05-16

## Goal

Show how each successful scan changed the registry at a glance. The Scan Log
should report counts for new, removed, and changed items so drift is visible
without opening the inventory manually.

## Chosen Approach

Store aggregate diff counters directly on each `scans` row:

- `items_new`
- `items_removed`
- `items_changed`

This is the first slice. It intentionally avoids a detailed per-item diff table.
That can be added later if the UI needs expandable scan details.

## Diff Semantics

During `runScan`, compare the freshly collected items against the registry state
before applying the scan results.

- New: item ID exists in the fresh scan but not in the previous registry.
- Removed: item ID exists in the previous registry but not in the fresh scan.
- Changed: item ID exists in both, but meaningful registry content changed.

Meaningful content for the first slice:

- `health`
- `issues`
- `metadata`
- `name`
- `path`
- `runtime`
- `scope`
- `type`
- `repoPath`

`scannedAt`, quality verdict fields, and judge timestamps are not diff inputs.

Failed scans should keep diff counters at zero or null and show the existing
error state.

## Data Flow

1. `runScan` reads existing registry items before upserting current scan items.
2. It validates current items as it already does today.
3. It computes aggregate diff counters.
4. It upserts current items and removes stale items.
5. It calls `finishScan` with the existing stats plus diff counters.

## UI

The Scan Log should append a compact diff line to each scan:

`+N new · -N removed · ~N changed`

If all counters are zero, show `No changes` to avoid noisy zeros.

The first version only shows counts. It does not link to filtered item lists or
show per-item details.

## API

`GET /api/registry?resource=scans` should include the three new scan fields in
its existing response. No new endpoint is needed.

## Tests

Add focused registry/scanner tests for:

- `finishScan` stores diff counters.
- a scan with a newly discovered item records `itemsNew`.
- a scan that omits a previously stored item records `itemsRemoved`.
- a scan that changes meaningful item content records `itemsChanged`.

Existing tests, lint, and build remain required verification.

## Out Of Scope

- A `scan_diffs` detail table.
- Expandable per-item diff details in the UI.
- Filtering inventory by a scan ID.
- Diffing LLM quality score/rationale changes.
