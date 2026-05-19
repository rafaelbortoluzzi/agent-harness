'use client'
import { RetroModal } from './retro-modal'
import {
  ACCENT_PALETTES,
  TINT_GRADIENTS,
  type Accent,
  type RetroTweaks,
  type Tint,
} from '@/lib/workspace/retro-tweaks'

interface Props {
  tweaks: RetroTweaks
  onChange: (next: RetroTweaks) => void
  onClose: () => void
}

const TINTS: Tint[] = ['teal', 'purple', 'navy', 'maroon', 'olive', 'black']
const ACCENTS: Accent[] = ['amber', 'green', 'cyan', 'white']

export function RetroTweaksModal({ tweaks, onChange, onClose }: Props) {
  return (
    <RetroModal title="Tweaks" onClose={onClose} width={460}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: 4 }}>
        <section>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Title-bar tint</div>
          <div style={{ display: 'flex', gap: 4 }}>
            {TINTS.map(t => (
              <button
                key={t}
                type="button"
                aria-label={t}
                aria-pressed={tweaks.tint === t}
                onClick={() => onChange({ ...tweaks, tint: t })}
                style={{
                  width: 48,
                  height: 24,
                  background: TINT_GRADIENTS[t],
                  border: '2px solid',
                  borderColor:
                    tweaks.tint === t
                      ? '#1a1814 #1a1814 #1a1814 #1a1814'
                      : 'var(--rs-chrome-hi) var(--rs-chrome-shadow) var(--rs-chrome-shadow) var(--rs-chrome-hi)',
                  boxShadow:
                    tweaks.tint === t
                      ? 'inset 1px 1px 0 var(--rs-chrome-deep)'
                      : 'inset 1px 1px 0 #fff, inset -1px -1px 0 var(--rs-chrome-deep)',
                  cursor: 'pointer',
                }}
              />
            ))}
          </div>
        </section>

        <section>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Editor accent</div>
          <div style={{ display: 'flex', gap: 4 }}>
            {ACCENTS.map(a => {
              const active = tweaks.accent === a
              return (
                <button
                  key={a}
                  type="button"
                  onClick={() => onChange({ ...tweaks, accent: a })}
                  style={{
                    padding: '4px 10px',
                    background: active ? '#000' : 'var(--rs-chrome)',
                    color: active ? ACCENT_PALETTES[a].accent : '#1a1814',
                    border: '2px solid',
                    borderColor: active
                      ? 'var(--rs-chrome-shadow) var(--rs-chrome-hi) var(--rs-chrome-hi) var(--rs-chrome-shadow)'
                      : 'var(--rs-chrome-hi) var(--rs-chrome-shadow) var(--rs-chrome-shadow) var(--rs-chrome-hi)',
                    fontWeight: active ? 700 : 400,
                    cursor: 'pointer',
                    fontFamily: 'var(--font-vt323), var(--font-plex-mono), monospace',
                    fontSize: 14,
                  }}
                >
                  {a}
                </button>
              )
            })}
          </div>
        </section>

        <section>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              type="checkbox"
              checked={tweaks.scanlines}
              onChange={() => onChange({ ...tweaks, scanlines: !tweaks.scanlines })}
            />
            CRT scanlines in editor
          </label>
        </section>
      </div>
    </RetroModal>
  )
}
