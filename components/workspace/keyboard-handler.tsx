'use client'
import { useEffect } from 'react'
import { useWorkspace } from '@/lib/workspace/store'
import { DEFAULT_BINDINGS, eventMatches } from '@/lib/keyboard/bindings'

export function KeyboardHandler() {
  const {
    state,
    closeTab,
    reopenLast,
    setCurrent,
    setPalOpen,
    setHelpOpen,
    toggleSidebar,
    toggleSidePanel,
    toggleBottom,
    setBottomTab,
    openRecs,
    openSettings,
  } = useWorkspace()
  const { tabs, current, helpOpen, palOpen } = state

  useEffect(() => {
    const bindings = DEFAULT_BINDINGS

    const match = (e: KeyboardEvent, id: string) => {
      const b = bindings.find(x => x.id === id)
      if (!b) return false
      return b.keys.some(k => k && eventMatches(e, k))
    }

    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const tag = target?.tagName?.toLowerCase() ?? ''
      const inField =
        (tag === 'input' || tag === 'textarea') &&
        !target?.classList.contains('allow-shortcuts')

      if (!inField && match(e, 'help')) {
        e.preventDefault()
        setHelpOpen(true)
        return
      }

      if (e.key === 'Escape') {
        if (helpOpen) setHelpOpen(false)
        if (palOpen) setPalOpen(false)
        return
      }

      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && /^[1-9]$/.test(e.key)) {
        const n = parseInt(e.key, 10) - 1
        if (tabs[n]) {
          e.preventDefault()
          setCurrent(tabs[n].id)
          return
        }
      }

      if (match(e, 'tab-next')) {
        e.preventDefault()
        const i = tabs.findIndex(t => t.id === current)
        if (i >= 0 && tabs.length) setCurrent(tabs[(i + 1) % tabs.length]!.id)
        return
      }
      if (match(e, 'tab-prev')) {
        e.preventDefault()
        const i = tabs.findIndex(t => t.id === current)
        if (i >= 0 && tabs.length) setCurrent(tabs[(i - 1 + tabs.length) % tabs.length]!.id)
        return
      }
      if (match(e, 'tab-close')) {
        e.preventDefault()
        if (current) closeTab(current)
        return
      }
      if (match(e, 'tab-reopen')) {
        e.preventDefault()
        reopenLast()
        return
      }
      if (match(e, 'palette')) {
        e.preventDefault()
        setPalOpen(true)
        return
      }
      if (match(e, 'toggle-sidebar')) {
        e.preventDefault()
        toggleSidebar()
        return
      }
      if (match(e, 'toggle-side')) {
        e.preventDefault()
        toggleSidePanel()
        return
      }
      if (match(e, 'toggle-bottom')) {
        e.preventDefault()
        toggleBottom()
        return
      }
      if (match(e, 'focus-terminal')) {
        e.preventDefault()
        setBottomTab('terminal')
        return
      }
      if (match(e, 'recommendations')) {
        e.preventDefault()
        openRecs()
        return
      }
      if (match(e, 'settings')) {
        e.preventDefault()
        openSettings()
        return
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [
    tabs,
    current,
    helpOpen,
    palOpen,
    closeTab,
    reopenLast,
    setCurrent,
    setPalOpen,
    setHelpOpen,
    toggleSidebar,
    toggleSidePanel,
    toggleBottom,
    setBottomTab,
    openRecs,
    openSettings,
  ])

  return null
}
