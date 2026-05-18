'use client'
import type { ReactNode } from 'react'
import { WorkspaceProvider, useWorkspace } from '@/lib/workspace/store'
import { ActivityBar } from './activity-bar'
import { SidebarView } from './sidebar-view'
import { TabBar } from './tab-bar'
import { TabRenderer } from './tab-renderer'
import { BottomPanel } from './bottom-panel'
import { StatusBar } from './status-bar'
import { KeyboardHandler } from './keyboard-handler'
import { CommandPalette } from './command-palette'
import { HelpDialog } from './help-dialog'

export function Shell({ children }: { children: ReactNode }) {
  return (
    <WorkspaceProvider>
      <ShellInner />
      <KeyboardHandler />
      <CommandPalette />
      <HelpDialog />
      <div hidden aria-hidden>
        {children}
      </div>
    </WorkspaceProvider>
  )
}

function ShellInner() {
  const { state } = useWorkspace()
  return (
    <div className={`ah-shell${state.sidebarHidden ? ' collapsed' : ''}`}>
      <ActivityBar />
      {!state.sidebarHidden && <SidebarView />}
      <div className="ah-shell-main">
        <TabBar />
        <TabRenderer />
        <BottomPanel />
      </div>
      <StatusBar />
    </div>
  )
}
