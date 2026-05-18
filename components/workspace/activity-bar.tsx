'use client'
import useSWR from 'swr'
import { Bell, Folder, History, Search, Settings as SettingsIcon } from 'lucide-react'
import type { ComponentType, SVGProps } from 'react'
import { useWorkspace, type View } from '@/lib/workspace/store'

const fetcher = (u: string) => fetch(u).then(r => r.json())

interface Recommendation { id: string }

interface Nav {
  view: View
  icon: ComponentType<SVGProps<SVGSVGElement> & { size?: number; strokeWidth?: number }>
  label: string
  badgeKey?: 'recs'
}

const MAIN: Nav[] = [
  { view: 'explorer', icon: Folder, label: 'Explorer' },
  { view: 'search', icon: Search, label: 'Search' },
  { view: 'recs', icon: Bell, label: 'Recommendations', badgeKey: 'recs' },
  { view: 'history', icon: History, label: 'History' },
]

export function ActivityBar() {
  const { state, setView, openSettings } = useWorkspace()
  const { data: recs = [] } = useSWR<Recommendation[]>('/api/recommendations', fetcher)
  const recsCount = recs.length

  return (
    <nav className="ah-activity" aria-label="Activity bar">
      {MAIN.map(item => {
        const Icon = item.icon
        const active = state.view === item.view && !state.sidebarHidden
        const badge = item.badgeKey === 'recs' ? recsCount : 0
        return (
          <button
            key={item.view}
            type="button"
            title={item.label}
            aria-label={item.label}
            aria-pressed={active}
            className={`ah-ic${active ? ' on' : ''}`}
            onClick={() => setView(item.view, { behavior: 'toggle-on-active' })}
          >
            <Icon size={18} strokeWidth={1.5} />
            {badge > 0 && <span className="ah-badge">{badge > 99 ? '99+' : badge}</span>}
          </button>
        )
      })}
      <div className="ah-spacer" />
      <button
        type="button"
        title="Settings"
        aria-label="Settings"
        className="ah-ic"
        onClick={openSettings}
      >
        <SettingsIcon size={18} strokeWidth={1.5} />
      </button>
    </nav>
  )
}
