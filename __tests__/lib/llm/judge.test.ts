import { parseVerdict } from '@/lib/llm/judge'

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
