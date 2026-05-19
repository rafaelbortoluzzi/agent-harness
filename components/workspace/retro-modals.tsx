'use client'
import useSWR from 'swr'
import { RetroModal } from './retro-modal'

const fetcher = (u: string) => fetch(u).then(r => r.json())

interface Recommendation {
  id: string
  repoPath: string
  kind: string
  name: string
  rationale: string
  createdAt: string
}

export function RetroRecsModal({ onClose }: { onClose: () => void }) {
  const { data } = useSWR<Recommendation[]>('/api/recommendations', fetcher)
  const recs = data ?? []

  return (
    <RetroModal title="Recommendations" onClose={onClose} width={600}>
      {recs.length === 0 ? (
        <p style={{ color: '#6b675d', padding: 12 }}>No recommendations yet. Run Scan to generate.</p>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {recs.map(r => (
            <li
              key={r.id}
              style={{
                padding: '8px 10px',
                borderBottom: '1px dotted #d8d4ca',
                display: 'flex',
                gap: 10,
              }}
            >
              <span
                style={{
                  fontWeight: 700,
                  fontSize: 11,
                  minWidth: 60,
                  textTransform: 'uppercase',
                  color: '#6b675d',
                }}
              >
                {r.kind}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700 }}>{r.name}</div>
                <div style={{ fontSize: 11, color: '#4a4740' }}>{r.rationale}</div>
                <div style={{ fontSize: 10, color: '#6b675d', marginTop: 2 }}>{r.repoPath}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </RetroModal>
  )
}

export function RetroAboutModal({ onClose }: { onClose: () => void }) {
  return (
    <RetroModal title="About Agent Harness" onClose={onClose} width={460}>
      <div style={{ display: 'flex', gap: 14, padding: 4 }}>
        <div
          style={{
            width: 64,
            height: 64,
            background: 'linear-gradient(135deg, #f4c243, #d6720a)',
            color: '#000',
            fontFamily: 'var(--font-vt323), monospace',
            fontSize: 36,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid #4a2f06',
          }}
        >
          AH
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>Agent Harness</div>
          <div style={{ fontSize: 11, color: '#6b675d', marginTop: 2 }}>v0.0.0-dev · retro skin</div>
          <p style={{ fontSize: 11, marginTop: 8, lineHeight: 1.5 }}>
            Local-first manager for AI agent runtimes. Scans your repos for skills, agents, hooks,
            and rules; judges them with an LLM; surfaces recommendations.
          </p>
        </div>
      </div>
    </RetroModal>
  )
}

export function RetroHelpModal({ onClose }: { onClose: () => void }) {
  const rows: [string, string][] = [
    ['F1 / ?', 'Help'],
    ['F9', 'Scan'],
    ['Esc', 'Close modal'],
    ['Ctrl+N', 'New skill'],
    ['Ctrl+W', 'Close tab'],
  ]
  return (
    <RetroModal title="Keyboard Shortcuts" onClose={onClose} width={440}>
      <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
        <tbody>
          {rows.map(([k, label]) => (
            <tr key={k}>
              <td
                style={{
                  padding: '2px 6px',
                  fontFamily: 'var(--font-plex-mono), monospace',
                  fontWeight: 700,
                  width: 100,
                  background: 'var(--rs-chrome-hi)',
                  border: '1px solid var(--rs-chrome-lo)',
                }}
              >
                {k}
              </td>
              <td style={{ padding: '2px 6px' }}>{label}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </RetroModal>
  )
}
