import { fireEvent, render, screen, within } from '@testing-library/react'
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

describe('selection sort: bars only (for now), in Watch and Do it', () => {
  it.each(['explorer', 'engineer'] as const)(
    '%s: plays on robots (Explorer) or bars (Engineer), with the Watch | Do it switch',
    (level) => {
      const { container } = renderAt('/sorting/selection-sort', level)
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
        level === 'explorer' ? 'Pick the smallest, one at a time' : 'Selection sort',
      )
      // Each level's default look: robots for Explorer, bars for Engineer.
      if (level === 'explorer') expect(container.querySelector('.robot-field')).not.toBeNull()
      else expect(container.querySelectorAll('.stage-bar')).toHaveLength(6)
      expect(container.querySelector('.duck')).toBeNull()
      expect(screen.getByRole('group', { name: 'Mode' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Do it' })).toBeInTheDocument()
    },
  )

  it('opens in Watch mode without ?mode=do', () => {
    renderAt('/sorting/selection-sort', 'explorer')
    expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Start' })).not.toBeInTheDocument()
  })

  it('offers Bars / Robots under "Show as", robots first for Explorer', () => {
    renderAt('/sorting/selection-sort', 'explorer')
    const group = screen.getByRole('group', { name: 'Show as' })
    expect(within(group).getByRole('button', { name: 'Robots' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(within(group).getByRole('button', { name: 'Bars' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  it('opens your own numbers from a link', () => {
    renderAt('/sorting/selection-sort?numbers=3,1,2', 'engineer')
    expect(screen.getByRole('textbox', { name: 'Your numbers' })).toHaveValue('3 1 2')
  })

  it.each([
    ['explorer', ['this one', 'smallest', 'smaller?', 'move?']],
    ['engineer', ['i', 'j', 'a[j]', 'min', 'a[min]', 'a[j] < a[min]?', 'swap?']],
  ] as const)(
    '%s: the trace table’s columns (Explorer leaves out where the smallest is)',
    (level, headers) => {
      renderAt('/sorting/selection-sort', level)
      for (let k = 0; k < 4; k++) fireEvent.keyDown(document, { key: 'ArrowRight' })
      const table = screen.getByRole('table')
      expect(
        within(table)
          .getAllByRole('columnheader')
          .map((th) => th.textContent),
      ).toEqual([...headers])
    },
  )

  it('only a swap is marked as a swap in the trace (a new smallest is a plain yes)', () => {
    const { container } = renderAt('/sorting/selection-sort', 'engineer')
    // 5 2 8 1 9 3: the first comparison finds a new smallest (2 < 5).
    for (let k = 0; k < 3; k++) fireEvent.keyDown(document, { key: 'ArrowRight' })
    const yes = container.querySelector('td[data-value="yes"]')
    expect(yes).toHaveAttribute('data-variable', 'smaller?')
  })

  it('phones: Watch controls, and the Watch | Do it switch', () => {
    setPhone(true)
    renderAt('/sorting/selection-sort', 'explorer')
    const controls = screen.getByRole('button', { name: 'Play' }).closest('.controls')
    expect(controls).not.toBeNull()
    expect(
      within(controls as HTMLElement).getByRole('button', { name: /Step/ }),
    ).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Mode' })).toBeInTheDocument()
    setPhone(false)
  })
})
