/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ContextActionDialog } from '@/components/workspace/context-action-dialog'
import type { PanelItem } from '@/components/item-side-panel'

const item: PanelItem = {
  id: 'skill-1',
  name: 'gamp-config',
  type: 'skill',
  runtime: 'claude',
  scope: 'repo',
  health: 'ok',
  issues: [],
  path: '/repo/.claude/skills/gamp-config/SKILL.md',
  repoPath: '/repo',
  metadata: {},
  scannedAt: '2026-05-18T00:00:00.000Z',
  qualityScore: null,
}

beforeEach(() => {
  global.fetch = jest.fn(async input => {
    if (String(input).startsWith('/api/config')) {
      return {
        json: async () => ({
          llmProvider: 'codex-cli',
          llmProviders: [
            {
              id: 'codex-cli',
              displayName: 'Codex CLI',
              kind: 'CLI',
              selected: true,
              available: true,
              reason: 'codex command found',
            },
            {
              id: 'anthropic-api',
              displayName: 'Claude API',
              kind: 'API',
              selected: false,
              available: false,
              reason: 'ANTHROPIC_API_KEY missing',
            },
          ],
        }),
      } as Response
    }
    return { json: async () => ({}) } as Response
  })
})

afterEach(() => {
  jest.restoreAllMocks()
  delete (global as typeof globalThis & { fetch?: unknown }).fetch
})

it('shows tab actions with shortcuts, markdown preview, and provider selection', async () => {
  const onAction = jest.fn()

  render(
    <ContextActionDialog
      open
      target={{
        kind: 'tab',
        tab: { id: item.id, kind: 'editor', name: item.name, type: item.type, path: item.path },
        item,
      }}
      onOpenChange={() => {}}
      onAction={onAction}
    />,
  )

  expect(await screen.findByRole('dialog', { name: /tab actions/i })).toBeInTheDocument()

  for (const label of [
    'Close',
    'Preview Markdown',
    'Copy Path on Disk',
    'Judge',
    'Improve',
    'Save As',
    'Save',
  ]) {
    const button = screen
      .getAllByRole('button')
      .find(btn => btn.querySelector('span')?.textContent === label)
    expect(button).toBeDefined()
    expect(button!.querySelector('kbd')).not.toBeNull()
  }

  expect(screen.getByLabelText('LLM provider')).toHaveValue('codex-cli')

  fireEvent.keyDown(window, { key: 'P', metaKey: true, shiftKey: true })

  await waitFor(() =>
    expect(onAction).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'preview',
        provider: 'codex-cli',
        target: expect.objectContaining({ scope: 'unit', itemId: item.id }),
      }),
    ),
  )
})

it('shows explorer section actions scoped to repo and type', async () => {
  render(
    <ContextActionDialog
      open
      target={{ kind: 'section', repoPath: '/repo', itemType: 'skill', label: 'skills' }}
      onOpenChange={() => {}}
      onAction={() => {}}
    />,
  )

  expect(await screen.findByText('section')).toBeInTheDocument()
  expect(screen.getByText('/repo')).toBeInTheDocument()
  expect(screen.getByText('skill')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /copy path on disk/i })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /judge/i })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /analyze/i })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /remove/i })).toBeInTheDocument()
})
