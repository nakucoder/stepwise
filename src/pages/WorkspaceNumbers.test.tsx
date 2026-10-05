import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { describe, expect, it } from 'vitest'
import type { Level } from '../engine/types'
import { STORAGE_KEYS } from '../lib/storage'
import { PreferencesProvider } from '../preferences/PreferencesProvider'
import { WorkspacePage } from './WorkspacePage'

/** Shows the router's current search string, so tests can read the address. */
function Address() {
  return <output data-testid="address">{useLocation().search}</output>
}

function renderAt(path: string, level: Level = 'engineer') {
  localStorage.setItem(STORAGE_KEYS.level, level)
  const user = userEvent.setup()
  render(
    <PreferencesProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path=":categoryId/:algorithmId" element={<WorkspacePage />} />
        </Routes>
        <Address />
      </MemoryRouter>
    </PreferencesProvider>,
  )
  return user
}

const field = () => screen.getByRole('textbox', { name: 'Your numbers' })
const run = () => screen.getByRole('button', { name: 'Run' })
const address = () => screen.getByTestId('address').textContent
const bars = () =>
  [...document.querySelectorAll('.stage-bar-label')].map((label) => label.textContent)
const progress = () => screen.getByText(/^Step \d+ of \d+$/)
const message = () => document.querySelector('.numbers-message')
const presets = () => within(screen.getByRole('group', { name: /Presets|Or try/ }))

async function typeAndEnter(user: ReturnType<typeof userEvent.setup>, text: string) {
  await user.clear(field())
  await user.type(field(), `${text}{Enter}`)
}

describe('your numbers: running them', () => {
  it('starts with the default numbers and a clean address', () => {
    renderAt('/sorting/bubble-sort')
    expect(field()).toHaveValue('5 2 8 1 9 3')
    expect(bars()).toEqual(['5', '2', '8', '1', '9', '3'])
    expect(address()).toBe('')
  })

  it('runs typed numbers on Enter, from step 1, and puts them in the address', async () => {
    const user = renderAt('/sorting/bubble-sort')
    await user.click(screen.getByRole('button', { name: /Step/ }))
    await typeAndEnter(user, '7, 3,12')
    expect(bars()).toEqual(['7', '3', '12'])
    expect(field()).toHaveValue('7 3 12')
    expect(progress()).toHaveTextContent(/^Step 1 of/)
    expect(address()).toBe('?numbers=7,3,12')
  })

  it('runs typed numbers with the Run button', async () => {
    const user = renderAt('/sorting/bubble-sort')
    await user.clear(field())
    await user.type(field(), '4 1')
    await user.click(run())
    expect(bars()).toEqual(['4', '1'])
  })

  it('does nothing while typing, until Enter or Run', async () => {
    const user = renderAt('/sorting/bubble-sort')
    await user.clear(field())
    await user.type(field(), '9 8')
    expect(bars()).toEqual(['5', '2', '8', '1', '9', '3'])
    expect(address()).toBe('')
  })

  it('Run on the same numbers starts them again from step 1', async () => {
    const user = renderAt('/sorting/bubble-sort?numbers=3,1')
    await user.click(screen.getByRole('button', { name: /Step/ }))
    expect(progress()).toHaveTextContent(/^Step 2 of/)
    await user.click(run())
    expect(progress()).toHaveTextContent(/^Step 1 of/)
  })

  it('typing a space and the arrow keys edit the field, not the playback', async () => {
    const user = renderAt('/sorting/bubble-sort')
    await user.clear(field())
    await user.type(field(), '1 2{ArrowLeft}{ArrowRight} 3')
    expect(field()).toHaveValue('1 2 3')
    expect(progress()).toHaveTextContent(/^Step 1 of/)
    expect(screen.getByRole('button', { name: /Play/ })).toBeInTheDocument()
  })
})

describe('your numbers: mistakes', () => {
  it('explains a mistake at the learner’s level and keeps the last good run', async () => {
    const user = renderAt('/sorting/bubble-sort?numbers=3,1', 'explorer')
    await typeAndEnter(user, '5 x 100')
    expect(message()).toHaveTextContent('“x” isn’t a number. Use numbers like 7 3 12.')
    expect(field()).toHaveAttribute('aria-invalid', 'true')
    expect(field()).toHaveAccessibleDescription(/“x” isn’t a number/)
    expect(field()).toHaveValue('5 x 100')
    expect(bars()).toEqual(['3', '1'])
    expect(address()).toBe('?numbers=3,1')
  })

  it('uses precise wording for Engineer', async () => {
    const user = renderAt('/sorting/bubble-sort')
    await typeAndEnter(user, '1 2 3 4 5 6 7 8 9 10 11 12 13')
    expect(message()).toHaveTextContent('Got 13 values; the limit is 12.')
  })

  it('announces messages through a live region that is always there', () => {
    renderAt('/sorting/bubble-sort')
    expect(message()).toHaveAttribute('aria-live', 'polite')
    expect(message()).toBeEmptyDOMElement()
  })

  it('clears the mistake after a good run', async () => {
    const user = renderAt('/sorting/bubble-sort')
    await typeAndEnter(user, '7')
    expect(message()).toHaveTextContent('Got 1 value; at least 2 are needed.')
    await typeAndEnter(user, '7 1')
    expect(message()).toBeEmptyDOMElement()
    expect(field()).toHaveAttribute('aria-invalid', 'false')
  })
})

describe('your numbers: presets', () => {
  it('labels the presets for each level', () => {
    renderAt('/sorting/bubble-sort', 'explorer')
    expect(
      presets()
        .getAllByRole('button')
        .map((b) => b.textContent),
    ).toEqual(['Mixed up', 'Already in order', 'Backwards', 'Almost in order'])
  })

  it('runs a preset in one click, with as many numbers as before', async () => {
    const user = renderAt('/sorting/bubble-sort?numbers=10,20,30,40,50')
    await user.click(presets().getByRole('button', { name: 'Reversed' }))
    const values = bars().map(Number)
    expect(values).toHaveLength(5)
    expect(values).toEqual([...values].sort((a, b) => b - a))
    expect(field()).toHaveValue(values.join(' '))
    expect(address()).toBe(`?numbers=${values.join(',')}`)
  })

  it('a preset replaces whatever was half-typed and clears a mistake', async () => {
    const user = renderAt('/sorting/bubble-sort')
    await typeAndEnter(user, 'oops')
    await user.click(presets().getByRole('button', { name: 'Already sorted' }))
    expect(message()).toBeEmptyDOMElement()
    expect(field()).toHaveValue(bars().join(' '))
  })
})

describe('your numbers: links', () => {
  it('opens a link with numbers on those numbers', () => {
    renderAt('/sorting/bubble-sort?numbers=4,0,9')
    expect(field()).toHaveValue('4 0 9')
    expect(bars()).toEqual(['4', '0', '9'])
  })

  it('falls back to the starting numbers, and says so, when a link’s numbers are bad', () => {
    renderAt('/sorting/bubble-sort?numbers=4,banana', 'explorer')
    expect(bars()).toEqual(['5', '2', '8', '1', '9', '3'])
    expect(message()).toHaveTextContent(
      'The numbers in that link didn’t work, so here are the starting numbers.',
    )
  })

  it('a good run replaces a bad link', async () => {
    const user = renderAt('/sorting/bubble-sort?numbers=999')
    await user.click(run())
    expect(address()).toBe('?numbers=5,2,8,1,9,3')
    expect(message()).toBeEmptyDOMElement()
  })
})

describe('your numbers: algorithms not built yet', () => {
  it('has no numbers form', () => {
    renderAt('/sorting/quick-sort')
    expect(screen.queryByRole('textbox', { name: 'Your numbers' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Run' })).not.toBeInTheDocument()
  })
})
