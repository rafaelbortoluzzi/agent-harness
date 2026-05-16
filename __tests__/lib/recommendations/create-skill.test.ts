import fs from 'fs'
import os from 'os'
import path from 'path'
import { createSkillFromRecommendation } from '@/lib/recommendations/create-skill'

describe('createSkillFromRecommendation', () => {
  let tmp: string

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-harness-rec-'))
  })

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true })
  })

  it('creates a draft SKILL.md under the recommendation repo', () => {
    const result = createSkillFromRecommendation({
      repoPath: tmp,
      name: 'release-helper',
      rationale: 'Automates release checklist creation for this repo.',
    })

    expect(result.path).toBe(path.join(tmp, '.claude', 'skills', 'release-helper', 'SKILL.md'))
    expect(fs.readFileSync(result.path, 'utf8')).toContain('name: release-helper')
    expect(fs.readFileSync(result.path, 'utf8')).toContain(
      'description: Automates release checklist creation for this repo.',
    )
  })

  it('refuses unsafe names and existing skill files', () => {
    expect(() =>
      createSkillFromRecommendation({
        repoPath: tmp,
        name: '../escape',
        rationale: 'bad',
      }),
    ).toThrow('unsafe skill name')

    createSkillFromRecommendation({
      repoPath: tmp,
      name: 'existing-skill',
      rationale: 'first',
    })

    expect(() =>
      createSkillFromRecommendation({
        repoPath: tmp,
        name: 'existing-skill',
        rationale: 'second',
      }),
    ).toThrow('already exists')
  })
})
