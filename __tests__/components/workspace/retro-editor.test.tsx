/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import { RetroEditor } from '@/components/workspace/retro-editor'

const SAMPLE = `---
name: foo
---
# Heading
- item
plain body`

describe('<RetroEditor />', () => {
  test('renders one line per source line', () => {
    render(<RetroEditor source={SAMPLE} runtime="claude" />)
    const lines = screen.getAllByTestId('retro-editor-line')
    expect(lines).toHaveLength(6)
  })

  test('renders line numbers starting at 1', () => {
    render(<RetroEditor source={SAMPLE} runtime="claude" />)
    expect(screen.getByText('1', { selector: '.retro-editor-lineno' })).toBeInTheDocument()
    expect(screen.getByText('6', { selector: '.retro-editor-lineno' })).toBeInTheDocument()
  })

  test('classifies tokens with the expected CSS classes', () => {
    const { container } = render(<RetroEditor source="# H" runtime="claude" />)
    expect(container.querySelector('.tok-h1')?.textContent).toBe('#')
    expect(container.querySelector('.tok-s')?.textContent).toBe(' H')
  })

  test('status bar shows runtime and byte count', () => {
    render(<RetroEditor source={SAMPLE} runtime="codex" />)
    expect(screen.getByText(/codex/)).toBeInTheDocument()
    expect(screen.getByText(new RegExp(`${SAMPLE.length} bytes`))).toBeInTheDocument()
  })
})
