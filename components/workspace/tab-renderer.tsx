'use client'
import { useWorkspace } from '@/lib/workspace/store'
import { WelcomeView } from '@/components/views/welcome-view'
import { RecommendationsView } from '@/components/views/recommendations-view'
import { SettingsView } from '@/components/views/settings-view'
import { Editor } from './editor'

export function TabRenderer() {
  const { state } = useWorkspace()
  const tab = state.tabs.find(t => t.id === state.current)
  if (!tab) {
    return (
      <div className="ah-editor-pane">
        <div className="ah-editor-body" style={{ padding: 24, color: 'var(--ah-fg-4)' }}>
          No tab open. Use the explorer or activity bar.
        </div>
      </div>
    )
  }

  return (
    <div className="ah-editor-pane">
      <div className="ah-editor-body">
        {tab.kind === 'welcome' && (
          <div className="ah-view-scroll">
            <WelcomeView />
          </div>
        )}
        {tab.kind === 'recs' && (
          <div className="ah-view-scroll">
            <RecommendationsView />
          </div>
        )}
        {tab.kind === 'settings' && (
          <div className="ah-view-scroll">
            <SettingsView />
          </div>
        )}
        {tab.kind === 'editor' && <Editor tab={tab} />}
      </div>
    </div>
  )
}
