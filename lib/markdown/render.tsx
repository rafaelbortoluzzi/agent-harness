import type { ReactNode } from 'react'

function inline(text: string): ReactNode[] {
  const tokenPattern =
    /(!\[[^\]]*]\([^)]+\)|\[[^\]]+]\([^)]+\)|`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g
  const nodes: ReactNode[] = []
  let cursor = 0
  let match: RegExpExecArray | null

  while ((match = tokenPattern.exec(text)) !== null) {
    if (match.index > cursor) nodes.push(text.slice(cursor, match.index))
    const token = match[0]
    const key = nodes.length
    const image = token.match(/^!\[([^\]]*)]\(([^)]+)\)$/)
    const link = token.match(/^\[([^\]]+)]\(([^)]+)\)$/)
    if (image) {
      // Markdown previews must render arbitrary local/remote image references.
      // eslint-disable-next-line @next/next/no-img-element
      nodes.push(<img key={key} src={image[2]} alt={image[1]} />)
    } else if (link) {
      nodes.push(
        <a key={key} href={link[2]} target="_blank" rel="noreferrer">
          {link[1]}
        </a>,
      )
    } else if (token.startsWith('`')) {
      nodes.push(<code key={key}>{token.slice(1, -1)}</code>)
    } else if (token.startsWith('**')) {
      nodes.push(<strong key={key}>{inline(token.slice(2, -2))}</strong>)
    } else {
      nodes.push(<em key={key}>{inline(token.slice(1, -1))}</em>)
    }
    cursor = tokenPattern.lastIndex
  }

  if (cursor < text.length) nodes.push(text.slice(cursor))
  return nodes
}

function splitTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map(cell => cell.trim())
}

function isTableSeparator(line: string): boolean {
  const cells = splitTableRow(line)
  return cells.length > 1 && cells.every(cell => /^:?-{3,}:?$/.test(cell))
}

function alignFromSeparator(cell: string): 'left' | 'center' | 'right' | undefined {
  if (cell.startsWith(':') && cell.endsWith(':')) return 'center'
  if (cell.endsWith(':')) return 'right'
  return undefined
}

function isBlockStart(line: string, nextLine?: string): boolean {
  return (
    line.startsWith('```') ||
    /^#{1,6}\s+/.test(line) ||
    /^\s*[-*]\s+/.test(line) ||
    /^\s*\d+\.\s+/.test(line) ||
    line.startsWith('>') ||
    /^\s*---+\s*$/.test(line) ||
    (line.includes('|') && nextLine !== undefined && isTableSeparator(nextLine))
  )
}

export function renderMarkdownNodes(markdown: string): ReactNode[] {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  const nodes: ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i] ?? ''
    const nextLine = lines[i + 1]

    if (!line.trim()) {
      i++
      continue
    }

    if (line.startsWith('```')) {
      const language = line.replace(/^```/, '').trim()
      const code: string[] = []
      i++
      while (i < lines.length && !lines[i]!.startsWith('```')) code.push(lines[i++]!)
      if (i < lines.length) i++
      nodes.push(
        <pre key={nodes.length}>
          <code className={language ? `language-${language}` : undefined}>{code.join('\n')}</code>
        </pre>,
      )
      continue
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/)
    if (heading) {
      const level = heading[1]!.length
      const content = inline(heading[2]!)
      if (level === 1) nodes.push(<h1 key={nodes.length}>{content}</h1>)
      else if (level === 2) nodes.push(<h2 key={nodes.length}>{content}</h2>)
      else if (level === 3) nodes.push(<h3 key={nodes.length}>{content}</h3>)
      else if (level === 4) nodes.push(<h4 key={nodes.length}>{content}</h4>)
      else if (level === 5) nodes.push(<h5 key={nodes.length}>{content}</h5>)
      else nodes.push(<h6 key={nodes.length}>{content}</h6>)
      i++
      continue
    }

    if (/^\s*---+\s*$/.test(line)) {
      nodes.push(<hr key={nodes.length} />)
      i++
      continue
    }

    if (line.includes('|') && nextLine !== undefined && isTableSeparator(nextLine)) {
      const headers = splitTableRow(line)
      const separators = splitTableRow(nextLine)
      const rows: string[][] = []
      i += 2
      while (i < lines.length && lines[i]!.includes('|') && lines[i]!.trim()) {
        rows.push(splitTableRow(lines[i]!))
        i++
      }
      nodes.push(
        <table key={nodes.length}>
          <thead>
            <tr>
              {headers.map((header, index) => (
                <th key={index} style={{ textAlign: alignFromSeparator(separators[index] ?? '') }}>
                  {inline(header)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {headers.map((_, cellIndex) => (
                  <td
                    key={cellIndex}
                    style={{ textAlign: alignFromSeparator(separators[cellIndex] ?? '') }}
                  >
                    {inline(row[cellIndex] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>,
      )
      continue
    }

    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i]!)) {
        items.push(lines[i]!.replace(/^\s*[-*]\s+/, ''))
        i++
      }
      nodes.push(
        <ul key={nodes.length}>
          {items.map((item, index) => <li key={index}>{inline(item)}</li>)}
        </ul>,
      )
      continue
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i]!)) {
        items.push(lines[i]!.replace(/^\s*\d+\.\s+/, ''))
        i++
      }
      nodes.push(
        <ol key={nodes.length}>
          {items.map((item, index) => <li key={index}>{inline(item)}</li>)}
        </ol>,
      )
      continue
    }

    if (line.startsWith('>')) {
      const quote: string[] = []
      while (i < lines.length && lines[i]!.startsWith('>')) {
        quote.push(lines[i]!.replace(/^>\s?/, ''))
        i++
      }
      nodes.push(<blockquote key={nodes.length}>{quote.map((part, index) => <p key={index}>{inline(part)}</p>)}</blockquote>)
      continue
    }

    const para: string[] = [line]
    i++
    while (
      i < lines.length &&
      lines[i]!.trim() &&
      !isBlockStart(lines[i]!, lines[i + 1])
    ) {
      para.push(lines[i++]!)
    }
    nodes.push(<p key={nodes.length}>{inline(para.join(' '))}</p>)
  }

  return nodes
}
