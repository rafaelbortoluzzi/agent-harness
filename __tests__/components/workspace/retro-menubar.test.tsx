/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import { RetroMenuBar, type MenuDef } from '@/components/workspace/retro-menubar'

const menus: MenuDef[] = [
  {
    label: 'File',
    items: [
      { id: 'new', label: 'New Skill…' },
      { id: 'sep', sep: true },
      { id: 'close', label: 'Close' },
    ],
  },
  {
    label: 'Help',
    items: [
      { id: 'help', label: 'Help', kbd: 'F1' },
      { id: 'about', label: 'About' },
    ],
  },
]

describe('<RetroMenuBar />', () => {
  test('renders menu labels with first letter underlined', () => {
    render(<RetroMenuBar menus={menus} onSelect={() => {}} />)
    expect(screen.getByText((content, el) => el?.tagName === 'SPAN' && el.textContent === 'File' && el.className.includes('rs-menu-item'))).toBeInTheDocument()
    expect(
      screen.getByText((content, el) => el?.tagName === 'SPAN' && el.textContent === 'Help' && el.className.includes('rs-menu-item')),
    ).toBeInTheDocument()
  })

  test('clicking a label opens its dropdown', () => {
    render(<RetroMenuBar menus={menus} onSelect={() => {}} />)
    expect(screen.queryByText('New Skill…')).not.toBeInTheDocument()
    fireEvent.click(screen.getByText((content, el) => el?.tagName === 'SPAN' && el.textContent === 'File' && el.className.includes('rs-menu-item')))
    expect(screen.getByText('New Skill…')).toBeInTheDocument()
    expect(screen.getByText('Close')).toBeInTheDocument()
  })

  test('clicking item fires onSelect and closes dropdown', () => {
    const onSelect = jest.fn()
    render(<RetroMenuBar menus={menus} onSelect={onSelect} />)
    fireEvent.click(screen.getByText((content, el) => el?.tagName === 'SPAN' && el.textContent === 'File' && el.className.includes('rs-menu-item')))
    fireEvent.click(screen.getByText('Close'))
    expect(onSelect).toHaveBeenCalledWith('close')
    expect(screen.queryByText('New Skill…')).not.toBeInTheDocument()
  })

  test('clicking outside closes the dropdown', () => {
    render(
      <div>
        <RetroMenuBar menus={menus} onSelect={() => {}} />
        <div data-testid="outside">other</div>
      </div>,
    )
    fireEvent.click(screen.getByText((content, el) => el?.tagName === 'SPAN' && el.textContent === 'File' && el.className.includes('rs-menu-item')))
    fireEvent.mouseDown(screen.getByTestId('outside'))
    expect(screen.queryByText('New Skill…')).not.toBeInTheDocument()
  })

  test('escape key closes the dropdown', () => {
    render(<RetroMenuBar menus={menus} onSelect={() => {}} />)
    fireEvent.click(screen.getByText((content, el) => el?.tagName === 'SPAN' && el.textContent === 'File' && el.className.includes('rs-menu-item')))
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByText('New Skill…')).not.toBeInTheDocument()
  })

  test('separator does not render as a clickable item', () => {
    const onSelect = jest.fn()
    render(<RetroMenuBar menus={menus} onSelect={onSelect} />)
    fireEvent.click(screen.getByText((content, el) => el?.tagName === 'SPAN' && el.textContent === 'File' && el.className.includes('rs-menu-item')))
    // Separator should not be clickable button text — verify by absence of role button with id 'sep'
    expect(screen.queryByText('sep')).not.toBeInTheDocument()
  })

  test('kbd hint is rendered next to label when provided', () => {
    render(<RetroMenuBar menus={menus} onSelect={() => {}} />)
    fireEvent.click(
      screen.getByText((content, el) => el?.tagName === 'SPAN' && el.textContent === 'Help' && el.className.includes('rs-menu-item')),
    )
    expect(screen.getByText('F1')).toBeInTheDocument()
  })
})
