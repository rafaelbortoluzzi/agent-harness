import { buildJudgeRequest, parseVerdict } from '@/lib/llm/judge'
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

describe('parseVerdict', () => {
  it('parses clean JSON', () => {
    const v = parseVerdict('{"score": 8, "rationale": "Clear triggers, concrete examples."}')
    expect(v.score).toBe(8)
    expect(v.rationale).toMatch(/Clear/)
  })

  it('strips code fences', () => {
    const v = parseVerdict('```json\n{"score": 5, "rationale": "Mid."}\n```')
    expect(v.score).toBe(5)
    expect(v.rationale).toBe('Mid.')
  })

  it('clamps score into [0,10]', () => {
    expect(parseVerdict('{"score": 99, "rationale": "high"}').score).toBe(10)
    expect(parseVerdict('{"score": -3, "rationale": "low"}').score).toBe(0)
  })

  it('returns score=0 with diagnostic when malformed', () => {
    const v = parseVerdict('not json at all')
    expect(v.score).toBe(0)
    expect(v.rationale).toMatch(/Unparseable/)
  })

  it('returns score=0 when JSON missing required fields', () => {
    const v = parseVerdict('{"foo": "bar"}')
    expect(v.score).toBe(0)
  })
})

describe('buildJudgeRequest', () => {
  it('exposes the system and user prompts used for judging', () => {
    const request = buildJudgeRequest(item, 'body text')

    expect(request.system).toContain('Score the asset 0-10')
    expect(request.prompt).toContain('Name: release-helper')
    expect(request.prompt).toContain('body text')
    expect(request.maxTokens).toBe(256)
  })

  it('can switch to a personal fit preset', () => {
    const request = buildJudgeRequest(item, 'body text', { presetId: 'personal-fit' })

    expect(request.system).toContain('personal workflow')
    expect(request.system).toContain('time or token savings')
  })
})
