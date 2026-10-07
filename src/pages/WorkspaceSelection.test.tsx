import { render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it } from 'vitest'
import type { Level } from '../engine/types'
import { STORAGE_KEYS } from '../lib/storage'
import { PreferencesProvider } from '../preferences/PreferencesProvider'
import { setPhone } from '../test/matchMedia'
import { WorkspacePage } from './WorkspacePage'

function renderAt(path: string, level: Level) {
  localStorage.setItem(STORAGE_KEYS.level, level)
  return render(
    <PreferencesProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path=":categoryId/:algorithmId" element={<WorkspacePage />} />
        </Routes>
      </MemoryRouter>
    </PreferencesProvider>,
  )
}

describe('selection sort: Watch only, bars only (for now)', () => {
  it.each(['explorer', 'engineer'] as const)('%s: plays on bars, with no Do it switch', (level) => {
    const { container } = renderAt('/sorting/selection-sort', level)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      level === 'explorer' ? 'Pick the smallest, one at a time' : 'Selection sort',
    )
    expect(container.querySelectorAll('.stage-bar')).toHaveLength(6)
    expect(container.querySelector('.duck')).toBeNull()
    expect(screen.queryByRole('group', { name: 'Mode' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Do it' })).not.toBeInTheDocument()
  })

  it('a Do it link stays in Watch mode', () => {
    renderAt('/sorting/selection-sort?mode=do', 'explorer')
    expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Start' })).not.toBeInTheDocument()
  })

  it('offers no "Show as" switch until the robot can be drawn, even for Explorer', () => {
    renderAt('/sorting/selection-sort', 'explorer')
    expect(screen.queryByRole('group', { name: 'Show as' })).not.toBeInTheDocument()
  })

  it('opens your own numbers from a link', () => {
    renderAt('/sorting/selection-sort?numbers=3,1,2', 'engineer')
    expect(screen.getByRole('textbox', { name: 'Your numbers' })).toHaveValue('3 1 2')
  })

  it('phones: Watch controls, no Do it switch', () => {
    setPhone(true)
    renderAt('/sorting/selection-sort', 'explorer')
    const controls = screen.getByRole('button', { name: 'Play' }).closest('.controls')
    expect(controls).not.toBeNull()
    expect(
      within(controls as HTMLElement).getByRole('button', { name: /Step/ }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Mode' })).not.toBeInTheDocument()
    setPhone(false)
  })
})
