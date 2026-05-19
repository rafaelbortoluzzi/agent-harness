'use client'
import { tokenizeMarkdown } from '@/lib/workspace/retro-tokenize'

interface Props {
  source: string
  runtime: string
}

export function RetroEditor({ source, runtime }: Props) {
  const lines = tokenizeMarkdown(source)
  const byteCount = source.length

  return (
    <div
      className="retro-editor"
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        background: '#000',
        color: '#d6d2c4',
        fontFamily: 'var(--font-vt323), var(--font-plex-mono), ui-monospace, monospace',
        fontSize: 18,
        lineHeight: 1,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ flex: 1, overflow: 'auto', padding: '4px 0' }}>
        {lines.map((line, i) => (
          <div
            key={i}
            data-testid="retro-editor-line"
            style={{
              display: 'grid',
              gridTemplateColumns: '48px 1fr',
              alignItems: 'baseline',
            }}
          >
            <span
              className="retro-editor-lineno"
              style={{
                textAlign: 'right',
                color: '#6b675d',
                borderRight: '1px solid #1a1814',
                paddingRight: 10,
                marginRight: 8,
              }}
            >
              {i + 1}
            </span>
            <span>
              {line.tokens.map((tok, j) => (
                <span key={j} className={`tok-${tok.class}`} style={{ color: colorFor(tok.class) }}>
                  {tok.text}
                </span>
              ))}
            </span>
          </div>
        ))}
      </div>
      <div
        style={{
          height: 22,
          background: '#1c3a6e',
          color: '#fff',
          fontFamily: 'var(--font-vt323), monospace',
          fontSize: 16,
          padding: '1px 8px',
          display: 'flex',
          gap: 16,
          alignItems: 'center',
          borderTop: '1px solid #000',
        }}
      >
        <Kbd label="F1">Help</Kbd>
        <Kbd label="F2">Save</Kbd>
        <Kbd label="F3">Find</Kbd>
        <Kbd label="F9">Run</Kbd>
        <span style={{ flex: 1 }} />
        <span>
          Ln {lines.length}, Col 1 · {byteCount} bytes · {runtime}
        </span>
      </div>
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background:
            'repeating-linear-gradient(180deg, rgba(255,255,255,0.025) 0 1px, transparent 1px 3px)',
        }}
      />
    </div>
  )
}

function Kbd({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <span
        style={{
          background: '#fff',
          color: '#1c3a6e',
          fontWeight: 700,
          padding: '0 4px',
        }}
      >
        {label}
      </span>
      {children}
    </span>
  )
}

function colorFor(cls: string): string | undefined {
  switch (cls) {
    case 'h1':
      return '#f4c243'
    case 'h2':
      return '#d6a020'
    case 'k':
      return '#6cb0e8'
    case 'dash':
      return '#d97aaa'
    case 'num':
      return '#6cb0e8'
    case 'em':
      return '#f4c243'
    case 's':
    default:
      return '#d6d2c4'
  }
}
