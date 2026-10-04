import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { bubbleSort } from '../algorithms/sorting/bubbleSort'
import { DEFAULT_INPUT } from '../data/defaultInput'
import { collectFrames } from '../engine/collect'
import type { Level } from '../engine/types'
import { STORAGE_KEYS } from '../lib/storage'
import { PreferencesProvider } from '../preferences/PreferencesProvider'
import { WorkspacePage } from './WorkspacePage'

const FRAMES = collectFrames(bubbleSort, DEFAULT_INPUT).frames
const LAST = FRAMES.length

// Testing Library drains pending work after each simulated event with a zero-length timer,
// advancing it only through a global `jest`. Point that at Vitest's fake clock.
const jestShim = { advanceTimersByTime: (ms: number) => vi.advanceTimersByTime(ms) }

beforeEach(() => {
  vi.useFakeTimers()
  Object.assign(globalThis, { jest: jestShim })
})

afterEach(() => {
  vi.useRealTimers()
  Reflect.deleteProperty(globalThis, 'jest')
})

function renderWorkspace(level: Level = 'engineer', path = '/sorting/bubble-sort') {
  localStorage.setItem(STORAGE_KEYS.level, level)
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) })
  render(
    <PreferencesProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path=":categoryId/:algorithmId" element={<WorkspacePage />} />
        </Routes>
      </MemoryRouter>
    </PreferencesProvider>,
  )
  return user
}

const controls = () => screen.getByRole('group', { name: 'Playback' })
const button = (name: RegExp | string) => within(controls()).getByRole('button', { name })
const progress = () => screen.getByText(/^Step \d+ of \d+$/)
const explanation = () =>
  within(screen.getByRole('region', { name: "What's happening" })).getByText(/./, {
    selector: '.explain-text',
  })
const stat = (name: string) => screen.getByText(name).nextElementSibling
// The step announcer (the numbers form has a live region of its own).
const liveRegion = () => document.querySelector('.visually-hidden[aria-live="polite"]')

/** Advances fake time inside act; each tick is scheduled after the previous one renders. */
function wait(ms: number, times = 1) {
  for (let k = 0; k < times; k++) {
    act(() => {
      vi.advanceTimersByTime(ms)
    })
  }
}

describe('workspace player: display', () => {
  it('starts on the first step with its explanation and zero stats', () => {
    renderWorkspace('engineer')
    expect(progress()).toHaveTextContent(`Step 1 of ${String(LAST)}`)
    expect(explanation()).toHaveTextContent(FRAMES[0]?.explanation.engineer ?? '')
    expect(stat('Comparisons')).toHaveTextContent('0')
    expect(stat('Swaps')).toHaveTextContent('0')
  })

  it('shows the explanation for the current level', () => {
    renderWorkspace('explorer')
    expect(explanation()).toHaveTextContent(FRAMES[0]?.explanation.explorer ?? '')
  })

  it('Explorer: the plain name is the title, with the real name beneath', () => {
    renderWorkspace('explorer')
    expect(
      screen.getByRole('heading', { level: 1, name: 'Bubble the biggest to the end' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Bubble sort', { selector: '.band-subtitle' })).toBeInTheDocument()
  })

  it('names the controls without their key hints, and exposes the shortcuts', () => {
    renderWorkspace('engineer')
    expect(button('Back')).toHaveAttribute('aria-keyshortcuts', 'ArrowLeft')
    expect(button('Play')).toHaveAttribute('aria-keyshortcuts', 'Space')
    expect(button('Step')).toHaveAttribute('aria-keyshortcuts', 'ArrowRight')
  })
})

describe('workspace player: mouse', () => {
  it('steps forward and back, asking then answering', async () => {
    const user = renderWorkspace('explorer')
    await user.click(button(/Step/))
    expect(explanation()).toHaveTextContent('Is 5 bigger than 2?')
    expect(stat('Comparisons')).toHaveTextContent('1')
    await user.click(button(/Step/))
    expect(explanation()).toHaveTextContent('Yes! 5 is bigger, so they trade places.')
    expect(stat('Swaps')).toHaveTextContent('1')
    await user.click(button(/Back/))
    expect(progress()).toHaveTextContent(`Step 2 of ${String(LAST)}`)
  })

  it('marks Back unavailable at the start and Step at the end, without losing focus', async () => {
    const user = renderWorkspace()
    expect(button(/Back/)).toHaveAttribute('aria-disabled', 'true')
    expect(button(/Step/)).toHaveAttribute('aria-disabled', 'false')

    await user.click(button(/Step/))
    expect(button(/Back/)).toHaveAttribute('aria-disabled', 'false')

    await user.click(button(/Back/))
    expect(button(/Back/)).toHaveFocus()
    expect(button(/Back/)).toHaveAttribute('aria-disabled', 'true')
    await user.click(button(/Back/))
    expect(progress()).toHaveTextContent('Step 1 of')

    await user.keyboard('{End}')
    expect(button(/Step/)).toHaveAttribute('aria-disabled', 'true')
    await user.click(button(/Step/))
    expect(progress()).toHaveTextContent(`Step ${String(LAST)} of ${String(LAST)}`)
  })

  it('plays one step per 800ms, and pauses', async () => {
    const user = renderWorkspace()
    await user.click(button(/Play/))
    expect(button(/Pause/)).toBeInTheDocument()
    wait(800)
    expect(progress()).toHaveTextContent('Step 2 of')
    wait(800, 2)
    expect(progress()).toHaveTextContent('Step 4 of')

    await user.click(button(/Pause/))
    expect(button(/Play/)).toBeInTheDocument()
    wait(800, 3)
    expect(progress()).toHaveTextContent('Step 4 of')
  })

  it('plays to the last step and stops there', async () => {
    const user = renderWorkspace()
    await user.click(button(/Play/))
    wait(800, LAST + 5)
    expect(progress()).toHaveTextContent(`Step ${String(LAST)} of ${String(LAST)}`)
    expect(button(/Play/)).toBeInTheDocument()
  })

  it('changes speed with the speed buttons', async () => {
    const user = renderWorkspace()
    const speed = within(controls()).getByRole('group', { name: 'Speed' })
    await user.click(within(speed).getByRole('button', { name: '4×' }))
    expect(within(speed).getByRole('button', { name: '4×' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(within(speed).getByRole('button', { name: '1×' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    await user.click(button(/Play/))
    wait(200)
    expect(progress()).toHaveTextContent('Step 2 of')
  })
})

describe('workspace player: stage', () => {
  it('shows the numbers and follows the steps', async () => {
    const user = renderWorkspace('explorer')
    const stage = screen.getByRole('region', { name: 'Visualization' })
    expect(within(stage).getByText('Numbers: 5, 2, 8, 1, 9, 3.')).toBeInTheDocument()
    await user.keyboard('{ArrowRight}')
    expect(within(stage).getByText('left')).toBeInTheDocument()
    expect(within(stage).getByText('right')).toBeInTheDocument()
    expect(within(stage).getAllByText('looking')).toHaveLength(2)
    await user.keyboard('{ArrowRight}')
    expect(
      within(stage).getByText('Numbers: 2, 5, 8, 1, 9, 3. Trading places: 2 and 5.'),
    ).toBeInTheDocument()
  })
})

const traceRegion = () =>
  screen.getByRole('region', { name: /^(Trace table|What happened so far)$/ })
const traceRows = () => within(traceRegion()).queryAllByRole('row').slice(1)
const rowText = (row: HTMLElement | undefined) =>
  [...(row?.querySelectorAll('td') ?? [])].map((cell) => cell.textContent)
const currentRow = () => traceRows().find((row) => row.getAttribute('aria-current') === 'step')

describe('workspace player: trace table', () => {
  it('starts empty, then adds a row with "?" when a question is asked', async () => {
    const user = renderWorkspace('engineer')
    expect(within(traceRegion()).getByText('Rows appear here as the steps run.')).toBeVisible()
    await user.keyboard('{ArrowRight}')
    expect(traceRows()).toHaveLength(1)
    expect(rowText(traceRows()[0])).toEqual(['0', '0', '5', '2', '?'])
    expect(currentRow()).toBe(traceRows()[0])
  })

  it('fills in the same row when the answer arrives, without a duplicate', async () => {
    const user = renderWorkspace('engineer')
    await user.keyboard('{ArrowRight}{ArrowRight}')
    expect(traceRows()).toHaveLength(1)
    expect(rowText(traceRows()[0])).toEqual(['0', '0', '5', '2', 'yes'])
    await user.keyboard('{ArrowRight}{ArrowRight}')
    expect(traceRows().map(rowText)).toEqual([
      ['0', '0', '5', '2', 'yes'],
      ['0', '1', '5', '8', 'no'],
    ])
  })

  it('removes rows when stepping back', async () => {
    const user = renderWorkspace('engineer')
    await user.keyboard('{ArrowRight}{ArrowRight}{ArrowRight}')
    expect(traceRows()).toHaveLength(2)
    await user.keyboard('{ArrowLeft}')
    expect(traceRows()).toHaveLength(1)
    await user.keyboard('{Home}')
    expect(traceRows()).toHaveLength(0)
  })

  it('separates rounds and ends with one row per comparison', async () => {
    const user = renderWorkspace('engineer')
    await user.keyboard('{End}')
    const rows = traceRows()
    expect(rows).toHaveLength(Number(stat('Comparisons')?.textContent))
    expect(rows.filter((row) => row.classList.contains('starts-group')).length).toBeGreaterThan(0)
    expect(rows[5]).toHaveClass('starts-group')
    expect(rowText(rows[5])[0]).toBe('1')
  })

  it('Explorer: friendly headers, and rounds and spots counted from 1', async () => {
    const user = renderWorkspace('explorer')
    await user.keyboard('{ArrowRight}')
    const headers = within(traceRegion())
      .getAllByRole('columnheader')
      .map((th) => th.textContent)
    expect(headers).toEqual(['round', 'spot', 'left', 'right', 'swap?'])
    expect(rowText(traceRows()[0])).toEqual(['1', '1', '5', '2', '?'])
    expect(within(traceRegion()).getByText('one row per question')).toBeInTheDocument()
  })
})

describe('workspace player: code and caption', () => {
  it('Engineer: highlights the active line as the steps change', async () => {
    const user = renderWorkspace('engineer')
    const code = screen.getByRole('region', { name: 'Code' })
    expect(within(code).getByRole('listitem', { current: 'step' })).toHaveTextContent('n = len(a)')
    await user.keyboard('{ArrowRight}')
    expect(within(code).getByRole('listitem', { current: 'step' })).toHaveTextContent(
      'if a[j] > a[j + 1]:',
    )
    await user.keyboard('{ArrowRight}')
    expect(within(code).getByRole('listitem', { current: 'step' })).toHaveTextContent(
      'a[j], a[j + 1] = a[j + 1], a[j]',
    )
  })

  it('names the current pass above the bars', async () => {
    const user = renderWorkspace('engineer')
    const stage = screen.getByRole('region', { name: 'Visualization' })
    await user.keyboard('{ArrowRight}')
    expect(within(stage).getByText('pass i = 0')).toBeInTheDocument()
  })

  it('Explorer: names the round, counted from 1', async () => {
    const user = renderWorkspace('explorer')
    const stage = screen.getByRole('region', { name: 'Visualization' })
    await user.keyboard('{ArrowRight}')
    expect(within(stage).getByText('round 1')).toBeInTheDocument()
  })
})

describe('workspace player: keyboard', () => {
  it('Right and Left step; Home and End jump', async () => {
    const user = renderWorkspace()
    await user.keyboard('{ArrowRight}{ArrowRight}')
    expect(progress()).toHaveTextContent('Step 3 of')
    await user.keyboard('{ArrowLeft}')
    expect(progress()).toHaveTextContent('Step 2 of')
    await user.keyboard('{End}')
    expect(progress()).toHaveTextContent(`Step ${String(LAST)} of`)
    await user.keyboard('{Home}')
    expect(progress()).toHaveTextContent('Step 1 of')
  })

  it('Space plays and pauses when no control has focus', async () => {
    const user = renderWorkspace()
    expect(document.activeElement).toBe(document.body)
    await user.keyboard(' ')
    expect(button(/Pause/)).toBeInTheDocument()
    wait(800)
    expect(progress()).toHaveTextContent('Step 2 of')
    await user.keyboard(' ')
    expect(button(/Play/)).toBeInTheDocument()
  })

  it('Space also plays when the page content itself has focus', async () => {
    const user = renderWorkspace()
    screen.getByRole('main').focus()
    await user.keyboard(' ')
    expect(button(/Pause/)).toBeInTheDocument()
  })

  it('Space on a focused button presses that button instead', async () => {
    const user = renderWorkspace()
    button(/Step/).focus()
    await user.keyboard(' ')
    expect(progress()).toHaveTextContent('Step 2 of')
    expect(button(/Play/)).toBeInTheDocument()
  })

  it('Space on a focused speed button selects that speed instead', async () => {
    const user = renderWorkspace()
    const twice = within(controls()).getByRole('button', { name: '2×' })
    twice.focus()
    await user.keyboard(' ')
    expect(twice).toHaveAttribute('aria-pressed', 'true')
    expect(button(/Play/)).toBeInTheDocument()
  })

  it('arrows still step while a button has focus', async () => {
    const user = renderWorkspace()
    button(/Play/).focus()
    await user.keyboard('{ArrowRight}')
    expect(progress()).toHaveTextContent('Step 2 of')
  })

  it('ignores shortcuts while typing in a field', async () => {
    const user = renderWorkspace()
    screen.getByRole('textbox', { name: 'Your numbers' }).focus()
    await user.keyboard('{ArrowRight} {End}')
    expect(progress()).toHaveTextContent('Step 1 of')
    expect(button(/Play/)).toBeInTheDocument()
  })

  it('ignores shortcuts with Ctrl, Alt or Cmd held', async () => {
    const user = renderWorkspace()
    await user.keyboard('{Control>}{ArrowRight}{/Control}')
    await user.keyboard('{Alt>}{ArrowRight}{/Alt}')
    await user.keyboard('{Meta>}{ArrowRight}{/Meta}')
    expect(progress()).toHaveTextContent('Step 1 of')
  })
})

describe('workspace player: screen reader announcements', () => {
  it('announces the explanation after a manual step', async () => {
    const user = renderWorkspace('explorer')
    await user.keyboard('{ArrowRight}')
    expect(liveRegion()).toHaveTextContent('Is 5 bigger than 2?')
  })

  it('does not announce every step while playing, then announces on pause', async () => {
    const user = renderWorkspace('explorer')
    const before = liveRegion()?.textContent
    await user.click(button(/Play/))
    wait(800, 3)
    expect(liveRegion()?.textContent).toBe(before)
    await user.click(button(/Pause/))
    expect(liveRegion()).toHaveTextContent(FRAMES[3]?.explanation.explorer ?? '')
  })
})

describe('workspace player: algorithms that aren’t built yet', () => {
  it('disables the controls and ignores the shortcuts', async () => {
    const user = renderWorkspace('engineer', '/sorting/quick-sort')
    for (const name of [/Back/, /Play/, /Step/]) expect(button(name)).toBeDisabled()
    await user.keyboard('{ArrowRight} ')
    expect(screen.getByText('No steps yet')).toBeInTheDocument()
  })
})
