import { tokenizeMarkdown, type Token } from '@/lib/workspace/retro-tokenize'

function flatten(source: string): Token[][] {
  return tokenizeMarkdown(source).map(line => line.tokens)
}

describe('tokenizeMarkdown', () => {
  test('empty input yields one empty line', () => {
    expect(tokenizeMarkdown('')).toEqual([{ tokens: [] }])
  })

  test('headings', () => {
    const lines = flatten('# Heading\n## Sub')
    expect(lines[0]).toEqual([
      { class: 'h1', text: '#' },
      { class: 's', text: ' Heading' },
    ])
    expect(lines[1]).toEqual([
      { class: 'h2', text: '##' },
      { class: 's', text: ' Sub' },
    ])
  })

  test('bullet lists', () => {
    expect(flatten('- alpha')[0]).toEqual([
      { class: 'dash', text: '-' },
      { class: 's', text: ' alpha' },
    ])
    expect(flatten('* beta')[0]).toEqual([
      { class: 'dash', text: '*' },
      { class: 's', text: ' beta' },
    ])
  })

  test('numbered list', () => {
    expect(flatten('1. first item')[0]).toEqual([
      { class: 'num', text: '1.' },
      { class: 's', text: ' first item' },
    ])
  })

  test('inline code splits body into s/em/s tokens', () => {
    expect(flatten('use `foo` here')[0]).toEqual([
      { class: 's', text: 'use ' },
      { class: 'em', text: '`foo`' },
      { class: 's', text: ' here' },
    ])
  })

  test('frontmatter delimiters toggle key parsing', () => {
    const lines = flatten('---\nname: foo\nage: 12\n---\n# After')
    expect(lines[0]).toEqual([{ class: 'dash', text: '---' }])
    expect(lines[1]).toEqual([
      { class: 'k', text: 'name' },
      { class: 'dash', text: ':' },
      { class: 's', text: ' foo' },
    ])
    expect(lines[2]).toEqual([
      { class: 'k', text: 'age' },
      { class: 'dash', text: ':' },
      { class: 's', text: ' 12' },
    ])
    expect(lines[3]).toEqual([{ class: 'dash', text: '---' }])
    expect(lines[4]).toEqual([
      { class: 'h1', text: '#' },
      { class: 's', text: ' After' },
    ])
  })

  test('plain body line is a single s token', () => {
    expect(flatten('just text')[0]).toEqual([{ class: 's', text: 'just text' }])
  })

  test('--- outside frontmatter context is still dash token', () => {
    // No leading frontmatter; a stray --- should still be classified as dash.
    expect(flatten('intro\n---\nbody')[1]).toEqual([{ class: 'dash', text: '---' }])
  })
})
