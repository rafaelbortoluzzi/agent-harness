import { buildAnalyzeRequest, parseRecommendations } from '@/lib/llm/gap-analyst'
import type { RegistryItem } from '@/lib/scanner/adapters/base'

const item: RegistryItem = {
  id: 'skill-1',
  runtime: 'claude',
  scope: 'repo',
  type: 'skill',
  name: 'release-helper',
  path: '/repo/.claude/skills/release-helper/SKILL.md',
  repoPath: '/repo',
  health: 'ok',
  issues: [],
  metadata: { description: 'release support' },
  scannedAt: '2026-05-18T00:00:00.000Z',
}

describe('parseRecommendations', () => {
  it('parses array', () => {
    const recs = parseRecommendations(
      '[{"kind":"skill","name":"release-tag","rationale":"missing release flow"}]',
    )
    expect(recs).toHaveLength(1)
    expect(recs[0]).toMatchObject({ kind: 'skill', name: 'release-tag' })
  })

  it('strips fences', () => {
    const recs = parseRecommendations(
      '```json\n[{"kind":"agent","name":"reviewer","rationale":"no code review"}]\n```',
    )
    expect(recs).toHaveLength(1)
  })

  it('caps at 5', () => {
    const arr = Array.from({ length: 10 }, (_, i) => ({
      kind: 'skill',
      name: `s-${i}`,
      rationale: `r${i}`,
    }))
    expect(parseRecommendations(JSON.stringify(arr))).toHaveLength(5)
  })

  it('drops invalid entries', () => {
    const recs = parseRecommendations(
      '[{"kind":"skill","name":"good","rationale":"ok"},{"kind":"weird"},"string"]',
    )
    expect(recs).toHaveLength(1)
  })

  it('returns [] on malformed', () => {
    expect(parseRecommendations('garbage')).toEqual([])
    expect(parseRecommendations('{"not":"array"}')).toEqual([])
  })
})

describe('buildAnalyzeRequest', () => {
  it('exposes the repo inventory prompt used for gap analysis', () => {
    const request = buildAnalyzeRequest('/repo', [item])

    expect(request.system).toContain('AI agent ecosystem analyst')
    expect(request.prompt).toContain('Repo: /repo')
    expect(request.prompt).toContain('[skill] release-helper')
  })

  it('can use the harness blueprint preset', () => {
    const request = buildAnalyzeRequest('/repo', [item], { presetId: 'harness-blueprint' })

    expect(request.system).toContain('agent harness blueprint')
    expect(request.system).toContain('skills, agents, hooks, MCPs')
  })
})
