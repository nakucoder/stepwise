import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it } from 'vitest'
import type { Level } from '../engine/types'
import { STORAGE_KEYS } from '../lib/storage'
import { PreferencesProvider } from '../preferences/PreferencesProvider'
import { setPhone } from '../test/matchMedia'
import { WorkspacePage } from './WorkspacePage'

function renderAt(level: Level, path = '/sorting/bubble-sort') {
  localStorage.setItem(STORAGE_KEYS.level, level)
  const user = userEvent.setup()
  const view = render(
    <PreferencesProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path=":categoryId/:algorithmId" element={<WorkspacePage />} />
        </Routes>
      </MemoryRouter>
    </PreferencesProvider>,
  )
  return { user, container: view.container }
}

const lookGroup = () => screen.getByRole('group', { name: 'Show as' })
const lookButton = (name: 'Bars' | 'Ducks') => within(lookGroup()).getByRole('button', { name })

describe('Bars / Ducks switch', () => {
  it('Explorer: ducks by default', () => {
    const { container } = renderAt('explorer')
    expect(lookButton('Ducks')).toHaveAttribute('aria-pressed', 'true')
    expect(container.querySelectorAll('.duck')).toHaveLength(6)
    expect(container.querySelector('.stage-bar')).toBeNull()
  })

  it('Engineer: bars by default, with the same switch', () => {
    const { container } = renderAt('engineer')
    expect(lookButton('Bars')).toHaveAttribute('aria-pressed', 'true')
    expect(container.querySelectorAll('.stage-bar')).toHaveLength(6)
    expect(container.querySelector('.duck')).toBeNull()
  })

  it('switches the look and remembers the choice', async () => {
    const { user, container } = renderAt('explorer')
    await user.click(lookButton('Bars'))
    expect(lookButton('Bars')).toHaveAttribute('aria-pressed', 'true')
    expect(container.querySelectorAll('.stage-bar')).toHaveLength(6)
    expect(localStorage.getItem(STORAGE_KEYS.look)).toBe('bars')
  })

  it('a saved choice wins over the level default', () => {
    localStorage.setItem(STORAGE_KEYS.look, 'ducks')
    const { container } = renderAt('engineer')
    expect(lookButton('Ducks')).toHaveAttribute('aria-pressed', 'true')
    expect(container.querySelectorAll('.duck')).toHaveLength(6)
  })

  it('is not offered for algorithms that aren’t built yet', () => {
    renderAt('explorer', '/sorting/quick-sort')
    expect(screen.queryByRole('group', { name: 'Show as' })).not.toBeInTheDocument()
  })

  it('phones: in the Menu, which keeps the stage’s height for the data', () => {
    setPhone(true)
    renderAt('explorer')
    expect(screen.queryByRole('group', { name: 'Show as' })).not.toBeInTheDocument()
  })
})
