/**
 * @jest-environment jsdom
 */
import { render, screen, waitFor } from '@testing-library/react'
import { ItemSidePanel, type PanelItem } from '@/components/item-side-panel'

const item: PanelItem = {
  id: 'abc',
  name: 'Broken Skill',
  type: 'skill',
  runtime: 'claude',
  scope: 'personal',
  health: 'broken',
  issues: ['missing file'],
  path: '/tmp/missing',
  repoPath: null,
  metadata: {},
  scannedAt: '2026-05-16T00:00:00.000Z',
}

describe('ItemSidePanel', () => {
  afterEach(() => {
    delete (global as typeof globalThis & { fetch?: unknown }).fetch
  })

  it('shows a snooze action for an unsnoozed item', async () => {
    global.fetch = jest.fn(async input => {
      const url = String(input)
      if (url.startsWith('/api/config')) {
        return { json: async () => ({ llmConnected: false }) } as Response
      }
      if (url.startsWith('/api/snooze')) {
        return { json: async () => ({ snooze: null }) } as Response
      }
      return { json: async () => ({}) } as Response
    })

    render(<ItemSidePanel item={item} onClose={() => {}} />)

    await waitFor(() => expect(screen.getByRole('button', { name: 'Snooze' })).toBeDefined())
  })
})
