'use client'
import { useEffect, useRef, useState } from 'react'

export interface MenuItem {
  id: string
  label?: string
  kbd?: string
  sep?: boolean
  disabled?: boolean
}

export interface MenuDef {
  label: string
  items: MenuItem[]
}

interface Props {
  menus: MenuDef[]
  onSelect: (id: string) => void
}

export function RetroMenuBar({ menus, onSelect }: Props) {
  const [open, setOpen] = useState<number | null>(null)
  const barRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (!barRef.current) return
      if (!barRef.current.contains(e.target as Node)) setOpen(null)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(null)
    }
    window.addEventListener('mousedown', onMouseDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  return (
    <div ref={barRef} className="rs-menubar" style={{ position: 'relative' }}>
      {menus.map((m, idx) => {
        const isOpen = open === idx
        return (
          <span key={m.label} style={{ position: 'relative' }}>
            <span
              className="rs-menu-item"
              style={{
                background: isOpen ? 'var(--rs-title-a)' : undefined,
                color: isOpen ? '#fff' : undefined,
              }}
              onClick={() => setOpen(isOpen ? null : idx)}
            >
              <u>{m.label[0]}</u>
              {m.label.slice(1)}
            </span>
            {isOpen && (
              <div
                role="menu"
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  zIndex: 100,
                  background: 'var(--rs-chrome)',
                  border: '2px solid',
                  borderColor: 'var(--rs-chrome-hi) var(--rs-chrome-shadow) var(--rs-chrome-shadow) var(--rs-chrome-hi)',
                  boxShadow:
                    'inset 1px 1px 0 #fff, inset -1px -1px 0 var(--rs-chrome-deep), 2px 2px 0 rgba(0,0,0,0.2)',
                  padding: 2,
                  minWidth: 180,
                  fontSize: 11,
                }}
              >
                {m.items.map(it => {
                  if (it.sep) {
                    return (
                      <div
                        key={it.id}
                        style={{
                          borderTop: '1px solid var(--rs-chrome-shadow)',
                          borderBottom: '1px solid var(--rs-chrome-hi)',
                          margin: '2px 2px',
                        }}
                      />
                    )
                  }
                  return (
                    <button
                      key={it.id}
                      type="button"
                      role="menuitem"
                      disabled={it.disabled}
                      onClick={() => {
                        onSelect(it.id)
                        setOpen(null)
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = 'var(--rs-title-a)'
                        e.currentTarget.style.color = '#fff'
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = ''
                        e.currentTarget.style.color = ''
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        width: '100%',
                        padding: '4px 18px 4px 22px',
                        background: 'transparent',
                        border: 'none',
                        textAlign: 'left',
                        cursor: it.disabled ? 'default' : 'pointer',
                        opacity: it.disabled ? 0.5 : 1,
                        fontFamily: 'inherit',
                        fontSize: 11,
                      }}
                    >
                      <span style={{ flex: 1 }}>{it.label}</span>
                      {it.kbd && (
                        <span style={{ marginLeft: 12, fontFamily: 'var(--font-plex-mono)', fontSize: 10 }}>
                          {it.kbd}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </span>
        )
      })}
    </div>
  )
}
