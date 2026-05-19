'use client'
import { useEffect, useRef, useState, type ReactNode } from 'react'

interface Props {
  title: string
  onClose: () => void
  width?: number
  children: ReactNode
}

export function RetroModal({ title, onClose, width = 480, children }: Props) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const dragRef = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(
    null,
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current) return
      const { startX, startY, baseX, baseY } = dragRef.current
      setPos({ x: baseX + (e.clientX - startX), y: baseY + (e.clientY - startY) })
    }
    const onUp = () => {
      dragRef.current = null
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [])

  const startDrag = (e: React.MouseEvent) => {
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      baseX: pos?.x ?? 0,
      baseY: pos?.y ?? 0,
    }
  }

  const positioned: React.CSSProperties = pos
    ? {
        position: 'absolute',
        left: `calc(50% + ${pos.x}px - ${width / 2}px)`,
        top: `calc(50% + ${pos.y}px)`,
        transform: 'translateY(-50%)',
      }
    : {}

  return (
    <div
      data-testid="retro-modal-backdrop"
      onClick={e => {
        if (e.target === e.currentTarget) onClose()
      }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.35)',
        zIndex: 9000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        role="dialog"
        aria-label={title}
        style={{
          background: 'var(--rs-chrome)',
          width,
          maxWidth: '80vw',
          maxHeight: '86vh',
          border: '2px solid',
          borderColor: 'var(--rs-chrome-hi) var(--rs-chrome-shadow) var(--rs-chrome-shadow) var(--rs-chrome-hi)',
          boxShadow:
            'inset 1px 1px 0 #fff, inset -1px -1px 0 var(--rs-chrome-deep), 2px 2px 0 var(--rs-chrome-deep), 4px 4px 12px rgba(0,0,0,0.45)',
          display: 'flex',
          flexDirection: 'column',
          ...positioned,
        }}
      >
        <div
          onMouseDown={startDrag}
          style={{
            height: 22,
            padding: '0 4px 0 8px',
            background: 'linear-gradient(90deg, var(--rs-title-a), var(--rs-title-b))',
            color: '#fff',
            fontWeight: 700,
            fontSize: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            userSelect: 'none',
            cursor: 'move',
          }}
        >
          <span style={{ flex: 1 }}>{title}</span>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            style={{
              width: 18,
              height: 16,
              padding: 0,
              background: 'var(--rs-chrome)',
              border: '2px solid',
              borderColor: 'var(--rs-chrome-hi) var(--rs-chrome-shadow) var(--rs-chrome-shadow) var(--rs-chrome-hi)',
              boxShadow: 'inset 1px 1px 0 #fff, inset -1px -1px 0 var(--rs-chrome-deep)',
              color: '#1a1814',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            ×
          </button>
        </div>
        <div style={{ padding: 10, overflow: 'auto', flex: 1 }}>{children}</div>
      </div>
    </div>
  )
}
