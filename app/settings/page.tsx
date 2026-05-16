'use client'
import useSWR from 'swr'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Config {
  roots: string[]
  explicitRepos: string[]
  discoveryDepth: number
  respectGitignore: boolean
  healthWeights: Record<string, number>
  llmConnected: boolean
}

const fetcher = (u: string) => fetch(u).then(r => r.json())

export default function SettingsPage() {
  const { data: cfg, mutate } = useSWR<Config>('/api/config', fetcher)
  const [newRoot, setNewRoot] = useState('')
  const [newRepo, setNewRepo] = useState('')
  const [saved, setSaved] = useState(false)

  const save = async (partial: Partial<Config>) => {
    await fetch('/api/config', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(partial),
    })
    await mutate()
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  if (!cfg) return <p className="text-sm text-muted-foreground">Loading…</p>

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Settings</h2>
        {saved && <span className="text-sm text-green-600">✓ Saved</span>}
      </div>

      <Card>
        <CardHeader><CardTitle>Auto-Discovery Roots</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Directories searched for repos containing CLAUDE.md, AGENTS.md, .claude, or .codex.
            Search depth: {cfg.discoveryDepth}.
          </p>
          {cfg.roots.map(root => (
            <div key={root} className="flex items-center gap-2">
              <span className="font-mono text-sm flex-1 break-all">{root}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => save({ roots: cfg.roots.filter(r => r !== root) })}
              >
                ✕
              </Button>
            </div>
          ))}
          <div className="flex gap-2">
            <Input
              placeholder="/Users/you/code"
              value={newRoot}
              onChange={e => setNewRoot(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && newRoot.trim()) {
                  save({ roots: [...cfg.roots, newRoot.trim()] })
                  setNewRoot('')
                }
              }}
            />
            <Button
              variant="outline"
              onClick={() => {
                if (newRoot.trim()) {
                  save({ roots: [...cfg.roots, newRoot.trim()] })
                  setNewRoot('')
                }
              }}
            >
              Add
            </Button>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <label className="text-sm">Depth:</label>
            <Input
              type="number"
              min={1}
              max={6}
              className="w-20"
              value={cfg.discoveryDepth}
              onChange={e => save({ discoveryDepth: Number(e.target.value) })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Explicit Repos</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Specific repos that are always included regardless of marker files.
          </p>
          {cfg.explicitRepos.map(repo => (
            <div key={repo} className="flex items-center gap-2">
              <span className="font-mono text-sm flex-1 break-all">{repo}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  save({ explicitRepos: cfg.explicitRepos.filter(r => r !== repo) })
                }
              >
                ✕
              </Button>
            </div>
          ))}
          <div className="flex gap-2">
            <Input
              placeholder="/Users/you/code/my-repo"
              value={newRepo}
              onChange={e => setNewRepo(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && newRepo.trim()) {
                  save({ explicitRepos: [...cfg.explicitRepos, newRepo.trim()] })
                  setNewRepo('')
                }
              }}
            />
            <Button
              variant="outline"
              onClick={() => {
                if (newRepo.trim()) {
                  save({ explicitRepos: [...cfg.explicitRepos, newRepo.trim()] })
                  setNewRepo('')
                }
              }}
            >
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>LLM Integration (Phase 2)</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-2">
            Set <code className="bg-muted px-1 rounded">ANTHROPIC_API_KEY</code> in your shell
            environment to enable AI features.
          </p>
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                cfg.llmConnected ? 'bg-green-500' : 'bg-gray-400'
              }`}
            />
            <span className="text-sm text-muted-foreground">
              {cfg.llmConnected ? 'Connected' : 'Not configured'}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
