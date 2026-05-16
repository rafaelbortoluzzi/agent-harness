# Contributing

## Adding a New Runtime

1. Implement `RuntimeAdapter` in `lib/scanner/adapters/<runtime>.ts`:

```ts
import type { RuntimeAdapter, RegistryItem, ValidationResult, ItemType } from './base'
import { makeId } from './base'

export class MyRuntimeAdapter implements RuntimeAdapter {
  id = 'my-runtime' as const
  producedTypes: ItemType[] = ['skill', 'hook']

  async scanPersonal(): Promise<RegistryItem[]> {
    // scan ~/.my-runtime/ for items
    return []
  }

  async scanRepo(repoPath: string): Promise<RegistryItem[]> {
    // scan repo-level config files
    return []
  }

  validate(item: RegistryItem): ValidationResult {
    return { health: 'ok', issues: [] }
  }
}
```

`producedTypes` is required — the UI uses it to populate filter options dynamically.

2. Register in `lib/scanner/index.ts`:

```ts
import { MyRuntimeAdapter } from './adapters/my-runtime'
export const ADAPTERS: RuntimeAdapter[] = [
  new ClaudeAdapter(),
  new CodexAdapter(),
  new MyRuntimeAdapter(),
]
```

3. Add the runtime literal to `Runtime` in `lib/scanner/adapters/base.ts`.

4. Add tests in `__tests__/lib/scanner/adapters/<runtime>.test.ts`.

5. Update README runtimes table.

## Adding a Validator

1. Implement `Validator` in `lib/validators/<name>.ts`.
2. Wire it into the orchestrator's validator array in `lib/scanner/index.ts`.
3. Add tests in `__tests__/lib/validators/`.

## Running Tests

```sh
pnpm test
pnpm test --watch
```

## Local Dev

```sh
pnpm dev      # UI at http://127.0.0.1:3000
pnpm cli ...  # CLI
```

Migrations: edit `lib/registry/schema.ts`, then `pnpm exec drizzle-kit generate --name <description>`.
