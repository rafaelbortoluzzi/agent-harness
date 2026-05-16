import { NextRequest, NextResponse } from 'next/server'
import { hasApiKey } from '@/lib/llm/client'
import { analyzeAndPersist } from '@/lib/llm/gap-analyst'
import { getItems, getRepos } from '@/lib/registry/queries'

export async function POST(req: NextRequest) {
  if (!hasApiKey()) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not set' }, { status: 400 })
  }
  const body = await req.json().catch(() => ({}))
  const repos = body.repoPath
    ? [{ path: body.repoPath as string }]
    : getRepos().map(r => ({ path: r.path }))

  let total = 0
  const errors: string[] = []
  for (const repo of repos) {
    const items = getItems({ repoPath: repo.path })
    try {
      total += await analyzeAndPersist(repo.path, items)
    } catch (err) {
      errors.push(`${repo.path}: ${(err as Error).message}`)
    }
  }
  return NextResponse.json({ recommendations: total, repos: repos.length, errors })
}
