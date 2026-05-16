import fs from 'fs'
import os from 'os'
import path from 'path'
import { PathExistsValidator } from '@/lib/validators/path-exists'
import { DuplicatesValidator } from '@/lib/validators/duplicates'
import { CompletenessValidator } from '@/lib/validators/completeness'
import type { RegistryItem } from '@/lib/scanner/adapters/base'

const makeItem = (o: Partial<RegistryItem> = {}): RegistryItem => ({
  id: 'test',
  runtime: 'claude',
  scope: 'personal',
  type: 'skill',
  name: 'test-skill',
  path: '/nonexistent/path',
  repoPath: null,
  health: 'ok',
  issues: [],
  metadata: { description: 'a real description with enough content' },
  scannedAt: new Date().toISOString(),
  ...o,
})

describe('PathExistsValidator', () => {
  let tmp: string
  const v = new PathExistsValidator()

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'val-'))
  })

  afterEach(() => fs.rmSync(tmp, { recursive: true, force: true }))

  it('returns ok for existing file', () => {
    const p = path.join(tmp, 'f.md')
    fs.writeFileSync(p, 'content')
    expect(v.validate(makeItem({ path: p })).health).toBe('ok')
  })

  it('returns broken for missing file', () => {
    const r = v.validate(makeItem({ path: '/does/not/exist' }))
    expect(r.health).toBe('broken')
    expect(r.issues[0]).toMatch(/not found/)
  })

  it('skips check for hook type', () => {
    expect(v.validate(makeItem({ type: 'hook', path: '/missing' })).health).toBe('ok')
  })
})

describe('DuplicatesValidator', () => {
  it('flags duplicate name+type+runtime across locations', () => {
    const items = [
      makeItem({ id: '1', name: 'shared', repoPath: '/repo-a' }),
      makeItem({ id: '2', name: 'shared', repoPath: '/repo-b' }),
    ]
    const v = new DuplicatesValidator(items)
    expect(v.validate(items[0]).health).toBe('warning')
  })

  it('does not flag same name across different runtimes', () => {
    const items = [
      makeItem({ id: '1', runtime: 'claude', name: 'shared' }),
      makeItem({ id: '2', runtime: 'codex', name: 'shared' }),
    ]
    const v = new DuplicatesValidator(items)
    expect(v.validate(items[0]).health).toBe('ok')
  })

  it('does not flag unique items', () => {
    const items = [makeItem({ id: '1', name: 'unique' })]
    const v = new DuplicatesValidator(items)
    expect(v.validate(items[0]).health).toBe('ok')
  })
})

describe('CompletenessValidator', () => {
  let tmp: string

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'comp-'))
  })

  afterEach(() => fs.rmSync(tmp, { recursive: true, force: true }))

  it('warns when instruction file has minimal content', () => {
    const p = path.join(tmp, 'CLAUDE.md')
    fs.writeFileSync(p, 'x')
    const v = new CompletenessValidator()
    expect(v.validate(makeItem({ type: 'instruction', path: p })).health).toBe('warning')
  })

  it('passes for substantive instruction', () => {
    const p = path.join(tmp, 'CLAUDE.md')
    fs.writeFileSync(p, 'This is a substantive instruction file.')
    const v = new CompletenessValidator()
    expect(v.validate(makeItem({ type: 'instruction', path: p })).health).toBe('ok')
  })

  it('warns when skill missing description', () => {
    const p = path.join(tmp, 'SKILL.md')
    fs.writeFileSync(p, 'body')
    const v = new CompletenessValidator()
    expect(
      v.validate(makeItem({ type: 'skill', path: p, metadata: { name: 'x' } })).health,
    ).toBe('warning')
  })

  it('passes for skill with good description', () => {
    const p = path.join(tmp, 'SKILL.md')
    fs.writeFileSync(p, 'body')
    const v = new CompletenessValidator()
    expect(v.validate(makeItem({ type: 'skill', path: p })).health).toBe('ok')
  })
})
