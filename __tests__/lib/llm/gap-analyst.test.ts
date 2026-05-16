import { parseRecommendations } from '@/lib/llm/gap-analyst'

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
