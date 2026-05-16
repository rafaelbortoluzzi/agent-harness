import fs from 'fs'
import path from 'path'

interface CreateSkillInput {
  repoPath: string
  name: string
  rationale: string
}

interface CreateSkillResult {
  path: string
}

function assertSafeSkillName(name: string): void {
  if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(name)) {
    throw new Error('unsafe skill name')
  }
}

function skillBody(name: string, rationale: string): string {
  return `---
name: ${name}
description: ${rationale}
---

# ${name}

${rationale}

## When to Use

Use this skill when this repository needs the capability described above.
`
}

export function createSkillFromRecommendation(input: CreateSkillInput): CreateSkillResult {
  assertSafeSkillName(input.name)

  const skillDir = path.join(input.repoPath, '.claude', 'skills', input.name)
  const skillPath = path.join(skillDir, 'SKILL.md')
  if (fs.existsSync(skillPath)) throw new Error('skill already exists')

  fs.mkdirSync(skillDir, { recursive: true })
  fs.writeFileSync(skillPath, skillBody(input.name, input.rationale), { flag: 'wx' })
  return { path: skillPath }
}
