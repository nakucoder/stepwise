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

const step = (times: number) => {
  for (let k = 0; k < times; k++) fireEvent.keyDown(document, { key: 'ArrowRight' })
}

describe('insertion sort: Watch only, bars only (for now)', () => {
  it.each(['explorer', 'engineer'] as const)('%s: plays on bars, with no Do it switch', (level) => {
    const { container } = renderAt('/sorting/insertion-sort', level)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      level === 'explorer' ? 'Slot each card into place' : 'Insertion sort',
    )
    expect(container.querySelectorAll('.stage-bar')).toHaveLength(6)
    expect(screen.queryByRole('group', { name: 'Mode' })).not.toBeInTheDocument()
  })

  it('a Do it link stays in Watch mode', () => {
    renderAt('/sorting/insertion-sort?mode=do', 'explorer')
    expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Start' })).not.toBeInTheDocument()
  })

  it('offers no "Show as" switch until the penguins can be drawn, even for Explorer', () => {
    renderAt('/sorting/insertion-sort', 'explorer')
    expect(screen.queryByRole('group', { name: 'Show as' })).not.toBeInTheDocument()
  })

  it('counts shifts, not swaps', () => {
    renderAt('/sorting/insertion-sort', 'engineer')
    step(1)
    expect(screen.getByText('Shifts')).toBeInTheDocument()
    expect(screen.queryByText('Swaps')).not.toBeInTheDocument()
  })

  it('bubble and selection sort still count swaps', () => {
    renderAt('/sorting/selection-sort', 'engineer')
    step(1)
    expect(screen.getByText('Swaps')).toBeInTheDocument()
  })

  it('the stage says how many are in order so far', () => {
    renderAt('/sorting/insertion-sort', 'explorer')
    // Start, then "Round 1: take 2".
    step(2)
    expect(screen.getByText('round 1: the first one is in order')).toBeInTheDocument()
  })

  it.each([
    ['explorer', ['new one', 'this one', 'bigger?', 'slide?']],
    ['engineer', ['i', 'key', 'j', 'a[j]', 'a[j] > key?', 'action']],
  ] as const)('%s: the trace table’s columns', (level, headers) => {
    renderAt('/sorting/insertion-sort', level)
    step(3)
    const table = screen.getByRole('table')
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((th) => th.textContent),
    ).toEqual([...headers])
  })

  it('opens your own numbers from a link', () => {
    renderAt('/sorting/insertion-sort?numbers=3,1,2', 'engineer')
    expect(screen.getByRole('textbox', { name: 'Your numbers' })).toHaveValue('3 1 2')
  })

  it('phones: the caption counts shifts', () => {
    setPhone(true)
    renderAt('/sorting/insertion-sort?numbers=2,1', 'engineer')
    step(3)
    expect(document.querySelector('.explain-stats')).toHaveTextContent('1 comparison, 1 shift')
    setPhone(false)
  })
})
