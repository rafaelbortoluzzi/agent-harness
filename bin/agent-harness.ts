#!/usr/bin/env tsx
import fs from 'fs'
import os from 'os'
import path from 'path'
import { runScan } from '@/lib/scanner'
import { getItems, getRepos, snoozeItem } from '@/lib/registry/queries'
import type { Health, ItemType, Runtime } from '@/lib/scanner/adapters/base'

const cmd = process.argv[2]
const args = process.argv.slice(3)

function flag(name: string): string | undefined {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? args[i + 1] : undefined
}

function harnessDir(): string {
  return process.env.AGENT_HARNESS_DIR ?? path.join(os.homedir(), '.agent-harness')
}

async function main(): Promise<number> {
  switch (cmd) {
    case 'scan': {
      const json = args.includes('--json')
      if (!json) process.stderr.write('Scanning…\n')
      const result = await runScan(msg => {
        if (!json) process.stderr.write(`${msg}\n`)
      })
      if (json) {
        process.stdout.write(JSON.stringify(result) + '\n')
      } else {
        process.stderr.write(`Done. ${result.itemCount} items, ${result.brokenCount} broken.\n`)
      }
      return 0
    }

    case 'list': {
      const items = getItems({
        runtime: flag('runtime') as Runtime | undefined,
        health: flag('health') as Health | undefined,
        type: flag('type') as ItemType | undefined,
      })
      if (args.includes('--json')) {
        process.stdout.write(JSON.stringify(items, null, 2) + '\n')
      } else {
        for (const i of items) {
          process.stdout.write(
            `${i.health.padEnd(7)} ${i.runtime.padEnd(7)} ${i.type.padEnd(11)} ${i.name}\n`,
          )
        }
      }
      return 0
    }

    case 'doctor': {
      const repos = getRepos()
      process.stdout.write(`Repos: ${repos.length}\n`)
      for (const r of repos) {
        const score = r.healthScore?.toString() ?? '?'
        process.stdout.write(`  ${score.padStart(3)}  ${r.path}\n`)
      }
      const broken = getItems({ health: 'broken', excludeSnoozed: true })
      process.stdout.write(`\nBroken items: ${broken.length}\n`)
      for (const b of broken) {
        process.stdout.write(`  - ${b.name} (${b.runtime}/${b.type}): ${b.issues[0] ?? ''}\n`)
      }
      return broken.length > 0 ? 1 : 0
    }

    case 'export': {
      const dest = args[0]
      if (!dest) {
        process.stderr.write('Usage: agent-harness export <path>\n')
        return 1
      }
      const src = path.join(harnessDir(), 'registry.db')
      if (!fs.existsSync(src)) {
        process.stderr.write(`No registry found at ${src}. Run scan first.\n`)
        return 1
      }
      fs.copyFileSync(src, dest)
      process.stderr.write(`Exported to ${dest}\n`)
      return 0
    }

    case 'snooze': {
      const id = args[0]
      if (!id) {
        process.stderr.write('Usage: agent-harness snooze <item-id> [--days N] [--reason TEXT]\n')
        return 1
      }
      const days = Number(flag('days') ?? 0)
      const until = days > 0 ? new Date(Date.now() + days * 86400_000).toISOString() : null
      snoozeItem(id, flag('reason') ?? null, until)
      process.stderr.write(`Snoozed ${id}${until ? ` until ${until}` : ''}\n`)
      return 0
    }

    default:
      process.stderr.write('Usage: agent-harness <scan|list|doctor|export|snooze> [...flags]\n')
      return 1
  }
}

main()
  .then(code => process.exit(code))
  .catch(err => {
    process.stderr.write(`Error: ${err instanceof Error ? err.message : String(err)}\n`)
    process.exit(1)
  })
