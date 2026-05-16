import type { Config } from 'drizzle-kit'

export default {
  schema: './lib/registry/schema.ts',
  out: './lib/registry/migrations',
  dialect: 'sqlite',
} satisfies Config
