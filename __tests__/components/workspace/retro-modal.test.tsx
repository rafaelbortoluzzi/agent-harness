/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import { RetroModal } from '@/components/workspace/retro-modal'

describe('<RetroModal />', () => {
  test('renders title and children', () => {
    render(
      <RetroModal title="Recommendations" onClose={() => {}}>
        <p>body</p>
      </RetroModal>,
    )
    expect(screen.getByText('Recommendations')).toBeInTheDocument()
    expect(screen.getByText('body')).toBeInTheDocument()
  })

  test('close button fires onClose', () => {
    const onClose = jest.fn()
    render(
      <RetroModal title="X" onClose={onClose}>
        body
      </RetroModal>,
    )
    fireEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  test('clicking backdrop closes', () => {
    const onClose = jest.fn()
    render(
      <RetroModal title="X" onClose={onClose}>
        body
      </RetroModal>,
    )
    fireEvent.click(screen.getByTestId('retro-modal-backdrop'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  test('clicking modal frame does not close', () => {
    const onClose = jest.fn()
    render(
      <RetroModal title="X" onClose={onClose}>
        <p data-testid="inside">body</p>
      </RetroModal>,
    )
    fireEvent.click(screen.getByTestId('inside'))
    expect(onClose).not.toHaveBeenCalled()
  })

  test('escape key closes', () => {
    const onClose = jest.fn()
    render(
      <RetroModal title="X" onClose={onClose}>
        body
      </RetroModal>,
    )
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  test('renders with role dialog', () => {
    render(
      <RetroModal title="X" onClose={() => {}}>
        body
      </RetroModal>,
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})
