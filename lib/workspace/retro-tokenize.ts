export type TokenClass = 'dash' | 'k' | 's' | 'h1' | 'h2' | 'num' | 'em'

export interface Token {
  class: TokenClass
  text: string
}

export interface Line {
  tokens: Token[]
}

function splitInlineCode(text: string): Token[] {
  if (text === '') return []
  if (!text.includes('`')) return [{ class: 's', text }]
  const out: Token[] = []
  const re = /`[^`]+`/g
  let last = 0
  let match: RegExpExecArray | null
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) out.push({ class: 's', text: text.slice(last, match.index) })
    out.push({ class: 'em', text: match[0] })
    last = match.index + match[0].length
  }
  if (last < text.length) out.push({ class: 's', text: text.slice(last) })
  return out
}

function tokenizeLine(raw: string, inFrontmatter: boolean): { tokens: Token[]; toggleFrontmatter: boolean } {
  if (raw === '---') {
    return { tokens: [{ class: 'dash', text: '---' }], toggleFrontmatter: true }
  }

  if (inFrontmatter) {
    const colon = raw.indexOf(':')
    if (colon > 0) {
      return {
        tokens: [
          { class: 'k', text: raw.slice(0, colon) },
          { class: 'dash', text: ':' },
          { class: 's', text: raw.slice(colon + 1) },
        ],
        toggleFrontmatter: false,
      }
    }
    return { tokens: [{ class: 's', text: raw }], toggleFrontmatter: false }
  }

  const h2 = raw.match(/^(##)(\s.*)?$/)
  if (h2) {
    const tokens: Token[] = [{ class: 'h2', text: h2[1]! }]
    if (h2[2]) tokens.push({ class: 's', text: h2[2] })
    return { tokens, toggleFrontmatter: false }
  }

  const h1 = raw.match(/^(#)(\s.*)?$/)
  if (h1) {
    const tokens: Token[] = [{ class: 'h1', text: h1[1]! }]
    if (h1[2]) tokens.push({ class: 's', text: h1[2] })
    return { tokens, toggleFrontmatter: false }
  }

  const bullet = raw.match(/^([-*])(\s.*)?$/)
  if (bullet) {
    const tokens: Token[] = [{ class: 'dash', text: bullet[1]! }]
    if (bullet[2]) tokens.push({ class: 's', text: bullet[2] })
    return { tokens, toggleFrontmatter: false }
  }

  const num = raw.match(/^(\d+\.)(\s.*)?$/)
  if (num) {
    const tokens: Token[] = [{ class: 'num', text: num[1]! }]
    if (num[2]) tokens.push({ class: 's', text: num[2] })
    return { tokens, toggleFrontmatter: false }
  }

  return { tokens: splitInlineCode(raw), toggleFrontmatter: false }
}

export function tokenizeMarkdown(source: string): Line[] {
  const lines = source.split('\n')
  const out: Line[] = []
  let inFrontmatter = false
  let firstLine = true

  for (const raw of lines) {
    if (raw === '---' && firstLine) {
      out.push({ tokens: [{ class: 'dash', text: '---' }] })
      inFrontmatter = true
      firstLine = false
      continue
    }
    const result = tokenizeLine(raw, inFrontmatter)
    out.push({ tokens: result.tokens })
    if (result.toggleFrontmatter) inFrontmatter = !inFrontmatter
    firstLine = false
  }

  return out
}
