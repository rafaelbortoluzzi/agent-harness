'use client'
import type { ItemType } from '@/lib/scanner/adapters/base'

export type RetroIconName =
  | 'folder'
  | 'folder-open'
  | 'doc'
  | 'skill'
  | 'agent'
  | 'hook'
  | 'plug'
  | 'rule'
  | 'cmd'
  | 'prompt'
  | 'repo'
  | 'computer'
  | 'bell'
  | 'search'
  | 'refresh'
  | 'up'
  | 'back'
  | 'fwd'
  | 'view-list'
  | 'view-icons'
  | 'scan'
  | 'judge'
  | 'help'
  | 'props'
  | 'cog'
  | 'trash'
  | 'star'
  | 'warn'
  | 'broken'

const TYPE_ICON: Record<string, RetroIconName> = {
  skill: 'skill',
  agent: 'agent',
  hook: 'hook',
  mcp: 'plug',
  rule: 'rule',
  command: 'cmd',
  prompt: 'prompt',
  instruction: 'doc',
  plugin: 'plug',
}

export function iconForType(type: ItemType | string): RetroIconName {
  return TYPE_ICON[type] ?? 'doc'
}

export function RetroIcon({ name, size = 16 }: { name: RetroIconName; size?: number }) {
  const s = size
  const base = { width: s, height: s, display: 'block' as const, imageRendering: 'pixelated' as const }
  const view = '0 0 32 32'
  switch (name) {
    case 'folder':
      return (
        <svg viewBox={view} style={base}>
          <path d="M2 7 H11 L14 10 H30 V12 H2 Z" fill="#e09a1c" stroke="#3a2304" strokeWidth="1" />
          <path d="M2 11 H30 V27 H2 Z" fill="#f4c243" stroke="#3a2304" strokeWidth="1" />
          <path d="M3 12 H29" stroke="#fde18a" strokeWidth="1" fill="none" />
          <path d="M3 25 H29" stroke="#b07210" strokeWidth="1" fill="none" />
        </svg>
      )
    case 'folder-open':
      return (
        <svg viewBox={view} style={base}>
          <path d="M2 8 H11 L14 11 H30 V14 H2 Z" fill="#e09a1c" stroke="#3a2304" />
          <path
            d="M2 13 L5 27 H30 L33 13 Z"
            fill="#fcd068"
            stroke="#3a2304"
            transform="translate(-1.5 0)"
          />
          <path d="M3 14 L5.5 25" stroke="#fde7a4" strokeWidth="1" fill="none" />
        </svg>
      )
    case 'doc':
      return (
        <svg viewBox={view} style={base}>
          <path d="M6 3 H21 L27 9 V29 H6 Z" fill="#ffffff" stroke="#1a1814" />
          <path d="M21 3 V9 H27" fill="#dddacc" stroke="#1a1814" />
          <line x1="9" y1="13" x2="24" y2="13" stroke="#8e887b" />
          <line x1="9" y1="16" x2="24" y2="16" stroke="#8e887b" />
          <line x1="9" y1="19" x2="24" y2="19" stroke="#8e887b" />
          <line x1="9" y1="22" x2="20" y2="22" stroke="#8e887b" />
          <line x1="9" y1="25" x2="22" y2="25" stroke="#8e887b" />
        </svg>
      )
    case 'skill':
      return (
        <svg viewBox={view} style={base}>
          <path d="M6 3 H21 L27 9 V29 H6 Z" fill="#fff" stroke="#1a1814" />
          <path d="M21 3 V9 H27" fill="#dddacc" stroke="#1a1814" />
          <path
            d="M16 13 L18 18 L23 18.5 L19 22 L20 27 L16 24.5 L12 27 L13 22 L9 18.5 L14 18 Z"
            fill="#f4c243"
            stroke="#3a2304"
          />
        </svg>
      )
    case 'agent':
      return (
        <svg viewBox={view} style={base}>
          <path d="M6 3 H21 L27 9 V29 H6 Z" fill="#fff" stroke="#1a1814" />
          <path d="M21 3 V9 H27" fill="#dddacc" stroke="#1a1814" />
          <rect x="9" y="14" width="14" height="10" fill="#c0cbe0" stroke="#1a1814" />
          <rect x="11" y="16" width="3" height="3" fill="#1a3a8e" />
          <rect x="18" y="16" width="3" height="3" fill="#1a3a8e" />
          <rect x="12" y="21" width="8" height="1.5" fill="#1a1814" />
          <rect x="15" y="11" width="2" height="3" fill="#1a1814" />
        </svg>
      )
    case 'hook':
      return (
        <svg viewBox={view} style={base}>
          <path d="M6 3 H21 L27 9 V29 H6 Z" fill="#fff" stroke="#1a1814" />
          <path d="M21 3 V9 H27" fill="#dddacc" stroke="#1a1814" />
          <path
            d="M12 12 L20 12 L20 14 L18 14 L18 16 L24 22 L22 24 L16 18 L14 18 L14 20 L12 20 Z"
            fill="#c6c2b6"
            stroke="#1a1814"
          />
        </svg>
      )
    case 'plug':
      return (
        <svg viewBox={view} style={base}>
          <path d="M6 3 H21 L27 9 V29 H6 Z" fill="#fff" stroke="#1a1814" />
          <path d="M21 3 V9 H27" fill="#dddacc" stroke="#1a1814" />
          <rect x="11" y="12" width="10" height="9" fill="#7c98b8" stroke="#1a1814" />
          <rect x="13" y="9" width="2" height="3" fill="#1a1814" />
          <rect x="17" y="9" width="2" height="3" fill="#1a1814" />
          <path d="M16 21 V26" stroke="#1a1814" strokeWidth="1.5" />
        </svg>
      )
    case 'rule':
      return (
        <svg viewBox={view} style={base}>
          <path d="M5 5 H15 V27 H5 Z" fill="#a83737" stroke="#1a1814" />
          <path d="M17 5 H27 V27 H17 Z" fill="#a83737" stroke="#1a1814" />
          <path d="M15 5 H17 V27 H15 Z" fill="#1a1814" />
          <line x1="7" y1="9" x2="13" y2="9" stroke="#fcd068" />
          <line x1="7" y1="12" x2="13" y2="12" stroke="#fcd068" />
          <line x1="19" y1="9" x2="25" y2="9" stroke="#fcd068" />
          <line x1="19" y1="12" x2="25" y2="12" stroke="#fcd068" />
        </svg>
      )
    case 'cmd':
      return (
        <svg viewBox={view} style={base}>
          <rect x="3" y="5" width="26" height="22" fill="#1a1814" stroke="#000" />
          <rect x="3" y="5" width="26" height="3" fill="#c6c2b6" stroke="#000" />
          <text x="6" y="22" fill="#6abf6b" fontFamily="IBM Plex Mono, monospace" fontSize="11" fontWeight="700">
            &gt;_
          </text>
        </svg>
      )
    case 'prompt':
      return (
        <svg viewBox={view} style={base}>
          <path d="M6 3 H21 L27 9 V29 H6 Z" fill="#fff" stroke="#1a1814" />
          <path d="M21 3 V9 H27" fill="#dddacc" stroke="#1a1814" />
          <text x="9" y="22" fill="#1a3a8e" fontFamily="Tahoma, sans-serif" fontSize="13" fontWeight="700">
            ¶
          </text>
        </svg>
      )
    case 'repo':
      return (
        <svg viewBox={view} style={base}>
          <rect x="3" y="9" width="26" height="16" fill="#c6c2b6" stroke="#1a1814" />
          <rect x="3" y="9" width="26" height="2" fill="#8e887b" />
          <rect x="6" y="14" width="20" height="5" fill="#fff" stroke="#1a1814" />
          <rect x="23" y="20" width="3" height="2" fill="#6abf6b" />
        </svg>
      )
    case 'computer':
      return (
        <svg viewBox={view} style={base}>
          <rect x="3" y="4" width="26" height="18" fill="#c6c2b6" stroke="#1a1814" />
          <rect x="5" y="6" width="22" height="13" fill="#1a3a8e" stroke="#1a1814" />
          <rect x="10" y="22" width="12" height="2" fill="#8e887b" stroke="#1a1814" />
          <rect x="6" y="24" width="20" height="3" fill="#c6c2b6" stroke="#1a1814" />
        </svg>
      )
    case 'bell':
      return (
        <svg viewBox={view} style={base}>
          <path
            d="M16 5 C20 5 23 9 23 14 L23 18 L25 22 L7 22 L9 18 L9 14 C9 9 12 5 16 5 Z"
            fill="#fcd068"
            stroke="#3a2304"
          />
          <path d="M13 23 C13 25 14 27 16 27 C18 27 19 25 19 23" fill="none" stroke="#3a2304" />
        </svg>
      )
    case 'search':
      return (
        <svg viewBox={view} style={base}>
          <circle cx="13" cy="13" r="7" fill="#fff" stroke="#1a1814" strokeWidth="1.5" />
          <path d="M18 18 L26 26" stroke="#1a1814" strokeWidth="2.5" />
        </svg>
      )
    case 'refresh':
      return (
        <svg viewBox={view} style={base}>
          <path d="M6 16 A10 10 0 0 1 24 11 L26 9 V16 H19 L22 13 A7 7 0 0 0 9 16 Z" fill="#1f7a3a" stroke="#1a1814" />
          <path d="M26 16 A10 10 0 0 1 8 21 L6 23 V16 H13 L10 19 A7 7 0 0 0 23 16 Z" fill="#1f7a3a" stroke="#1a1814" />
        </svg>
      )
    case 'up':
      return (
        <svg viewBox={view} style={base}>
          <path d="M2 11 H11 L14 8 H22 V22 H2 Z" fill="#f4c243" stroke="#3a2304" />
          <path d="M16 11 L21 16 H18 V22 H14 V16 H11 Z" fill="#1a3a8e" stroke="#000" />
        </svg>
      )
    case 'back':
      return (
        <svg viewBox={view} style={base}>
          <path d="M22 8 L12 16 L22 24 Z" fill="#1a3a8e" stroke="#000" />
          <rect x="22" y="13" width="6" height="6" fill="#1a3a8e" stroke="#000" />
        </svg>
      )
    case 'fwd':
      return (
        <svg viewBox={view} style={base}>
          <path d="M10 8 L20 16 L10 24 Z" fill="#1a3a8e" stroke="#000" />
          <rect x="4" y="13" width="6" height="6" fill="#1a3a8e" stroke="#000" />
        </svg>
      )
    case 'view-list':
      return (
        <svg viewBox={view} style={base}>
          <rect x="4" y="5" width="24" height="22" fill="#fff" stroke="#1a1814" />
          <rect x="6" y="8" width="3" height="3" fill="#1a3a8e" />
          <line x1="11" y1="9.5" x2="25" y2="9.5" stroke="#1a1814" />
          <rect x="6" y="13" width="3" height="3" fill="#1a3a8e" />
          <line x1="11" y1="14.5" x2="25" y2="14.5" stroke="#1a1814" />
          <rect x="6" y="18" width="3" height="3" fill="#1a3a8e" />
          <line x1="11" y1="19.5" x2="25" y2="19.5" stroke="#1a1814" />
          <rect x="6" y="23" width="3" height="3" fill="#1a3a8e" />
          <line x1="11" y1="24.5" x2="25" y2="24.5" stroke="#1a1814" />
        </svg>
      )
    case 'view-icons':
      return (
        <svg viewBox={view} style={base}>
          <rect x="4" y="5" width="24" height="22" fill="#fff" stroke="#1a1814" />
          <rect x="6" y="8" width="6" height="5" fill="#f4c243" stroke="#1a1814" />
          <rect x="14" y="8" width="6" height="5" fill="#f4c243" stroke="#1a1814" />
          <rect x="22" y="8" width="6" height="5" fill="#f4c243" stroke="#1a1814" />
          <rect x="6" y="15" width="6" height="5" fill="#f4c243" stroke="#1a1814" />
          <rect x="14" y="15" width="6" height="5" fill="#f4c243" stroke="#1a1814" />
          <rect x="22" y="15" width="6" height="5" fill="#f4c243" stroke="#1a1814" />
        </svg>
      )
    case 'scan':
      return (
        <svg viewBox={view} style={base}>
          <rect x="4" y="6" width="24" height="20" fill="#fff" stroke="#1a1814" />
          <line x1="6" y1="9" x2="24" y2="9" stroke="#6abf6b" strokeWidth="2" />
          <line x1="6" y1="13" x2="20" y2="13" stroke="#1a3a8e" />
          <line x1="6" y1="16" x2="22" y2="16" stroke="#1a3a8e" />
          <line x1="6" y1="19" x2="18" y2="19" stroke="#1a3a8e" />
          <line x1="6" y1="22" x2="24" y2="22" stroke="#1a3a8e" />
          <rect x="4" y="6" width="24" height="2" fill="#6abf6b" opacity="0.6" />
        </svg>
      )
    case 'judge':
      return (
        <svg viewBox={view} style={base}>
          <path
            d="M16 4 L18 12 L26 13 L20 18 L22 26 L16 22 L10 26 L12 18 L6 13 L14 12 Z"
            fill="#f4c243"
            stroke="#3a2304"
          />
        </svg>
      )
    case 'help':
      return (
        <svg viewBox={view} style={base}>
          <circle cx="16" cy="16" r="12" fill="#fcd068" stroke="#3a2304" strokeWidth="1.5" />
          <text x="16" y="22" textAnchor="middle" fontFamily="Tahoma, sans-serif" fontWeight="700" fontSize="18" fill="#3a2304">
            ?
          </text>
        </svg>
      )
    case 'props':
      return (
        <svg viewBox={view} style={base}>
          <rect x="6" y="4" width="20" height="24" fill="#fff" stroke="#1a1814" />
          <line x1="9" y1="9" x2="23" y2="9" stroke="#1a1814" />
          <rect x="9" y="12" width="14" height="3" fill="#c6c2b6" stroke="#1a1814" />
          <rect x="9" y="17" width="14" height="3" fill="#c6c2b6" stroke="#1a1814" />
          <rect x="9" y="22" width="14" height="3" fill="#c6c2b6" stroke="#1a1814" />
        </svg>
      )
    case 'cog':
      return (
        <svg viewBox={view} style={base}>
          <circle cx="16" cy="16" r="6" fill="#c6c2b6" stroke="#1a1814" />
          <path
            d="M16 4 V8 M16 24 V28 M4 16 H8 M24 16 H28 M7 7 L10 10 M22 22 L25 25 M7 25 L10 22 M22 10 L25 7"
            stroke="#1a1814"
            strokeWidth="2"
          />
          <circle cx="16" cy="16" r="2" fill="#1a1814" />
        </svg>
      )
    case 'trash':
      return (
        <svg viewBox={view} style={base}>
          <rect x="7" y="9" width="18" height="3" fill="#c6c2b6" stroke="#1a1814" />
          <rect x="9" y="12" width="14" height="16" fill="#fff" stroke="#1a1814" />
          <line x1="13" y1="15" x2="13" y2="25" stroke="#1a1814" />
          <line x1="16" y1="15" x2="16" y2="25" stroke="#1a1814" />
          <line x1="19" y1="15" x2="19" y2="25" stroke="#1a1814" />
          <rect x="13" y="6" width="6" height="3" fill="#c6c2b6" stroke="#1a1814" />
        </svg>
      )
    case 'star':
      return (
        <svg viewBox={view} style={base}>
          <path
            d="M16 4 L19 13 L28 13 L21 19 L24 28 L16 22 L8 28 L11 19 L4 13 L13 13 Z"
            fill="#f4c243"
            stroke="#3a2304"
          />
        </svg>
      )
    case 'warn':
      return (
        <svg viewBox={view} style={base}>
          <path d="M16 4 L29 27 L3 27 Z" fill="#fcd068" stroke="#3a2304" strokeWidth="1.5" />
          <rect x="14.5" y="11" width="3" height="9" fill="#3a2304" />
          <rect x="14.5" y="22" width="3" height="3" fill="#3a2304" />
        </svg>
      )
    case 'broken':
      return (
        <svg viewBox={view} style={base}>
          <circle cx="16" cy="16" r="11" fill="#b22222" stroke="#3a0707" strokeWidth="1.5" />
          <rect x="6" y="14.5" width="20" height="3" fill="#fff" />
        </svg>
      )
    default:
      return <span style={{ display: 'inline-block', width: s, height: s }} />
  }
}
