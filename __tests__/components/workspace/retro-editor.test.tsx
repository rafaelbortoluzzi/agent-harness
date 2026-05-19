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
  test('mounts a CodeMirror editor instance', () => {
    const { container } = render(<RetroEditor source={SAMPLE} runtime="claude" />)
    expect(container.querySelector('.cm-editor')).not.toBeNull()
  })

  test('status bar shows runtime and byte count', () => {
    render(<RetroEditor source={SAMPLE} runtime="codex" />)
    expect(screen.getByText(/codex/)).toBeInTheDocument()
    expect(screen.getByText(new RegExp(`${SAMPLE.length} bytes`))).toBeInTheDocument()
  })

  test('status bar shows line count derived from source', () => {
    render(<RetroEditor source={SAMPLE} runtime="claude" />)
    expect(screen.getByText(/Ln 6,/)).toBeInTheDocument()
  })

  test('idle state shows no save-status badge', () => {
    render(<RetroEditor source={SAMPLE} runtime="claude" />)
    expect(screen.queryByText(/unsaved|saving|saved/)).not.toBeInTheDocument()
  })
})
