import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it } from 'vitest'
import type { Level } from '../engine/types'
import { STORAGE_KEYS } from '../lib/storage'
import { PreferencesProvider } from '../preferences/PreferencesProvider'
import { CategoryPage } from './CategoryPage'
import { WorkspacePage } from './WorkspacePage'

function renderAt(path: string, level: Level) {
  localStorage.setItem(STORAGE_KEYS.level, level)
  return render(
    <PreferencesProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path=":categoryId" element={<CategoryPage />} />
          <Route path=":categoryId/:algorithmId" element={<WorkspacePage />} />
        </Routes>
      </MemoryRouter>
    </PreferencesProvider>,
  )
}

const sidebar = () => screen.getByRole('navigation', { name: 'Topics' })
const main = () => screen.getByRole('main')

describe('topic sidebar', () => {
  it('lists all eight topics, with the current one open and the current page marked', () => {
    renderAt('/sorting/bubble-sort', 'engineer')
    const nav = sidebar()
    const topics = within(nav)
      .getAllByRole('link')
      .filter((link) => !link.getAttribute('href')?.includes('/sorting/'))
    expect(topics.map((link) => link.textContent)).toEqual([
      '1Sorting',
      '2Searching',
      '3Linked lists',
      '4Trees',
      '5Graphs',
      '6Hashing',
      '7Pattern matching',
      '8Dynamic programming',
    ])
    // Only the open topic lists its algorithms.
    expect(within(nav).getByRole('link', { name: 'Merge sort' })).toBeInTheDocument()
    expect(within(nav).queryByRole('link', { name: 'Binary search' })).not.toBeInTheDocument()
    expect(within(nav).getByRole('link', { name: 'Bubble sort' })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  it('marks the topic itself as the current page on its category page', () => {
    renderAt('/trees', 'engineer')
    expect(within(sidebar()).getByRole('link', { name: /Trees/ })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })
})

describe('Explorer-friendly algorithm names', () => {
  it('Explorer: the sidebar uses plain names, with the current one marked', () => {
    renderAt('/searching/binary-search', 'explorer')
    const nav = sidebar()
    expect(
      within(nav).getByRole('link', { name: 'Guess the middle, then halve it Soon' }),
    ).toHaveAttribute('aria-current', 'page')
    expect(within(nav).queryByRole('link', { name: 'Binary search' })).not.toBeInTheDocument()
  })

  it('Explorer: built algorithms first, the rest marked "Soon", in the sidebar and the list', () => {
    renderAt('/sorting', 'explorer')
    const nav = sidebar()
    const sidebarLinks = within(nav)
      .getAllByRole('link')
      .filter((link) => link.closest('.sidebar-algorithms'))
    expect(sidebarLinks[0]).toHaveAccessibleName('Bubble the biggest to the end')
    expect(sidebarLinks[1]).toHaveAccessibleName('Pick the smallest, one at a time')
    expect(sidebarLinks[2]).toHaveAccessibleName('Slot each card into place')
    expect(sidebarLinks[3]).toHaveAccessibleName('Split in half, then zip back together Soon')
    const listLinks = within(main()).getAllByRole('link')
    expect(listLinks[0]).toHaveTextContent('Bubble the biggest to the end')
    expect(listLinks[0]).not.toHaveTextContent('Coming soon')
    expect(listLinks[1]).toHaveTextContent('Pick the smallest, one at a time')
    expect(listLinks[1]).not.toHaveTextContent('Coming soon')
    expect(listLinks[2]).toHaveTextContent('Slot each card into place')
    expect(listLinks[2]).not.toHaveTextContent('Coming soon')
    expect(listLinks[3]).toHaveTextContent('Coming soon')
    expect(within(nav).getByRole('link', { name: 'Searching Soon' })).toBeInTheDocument()
  })

  it('Engineer: no "soon" labels in the sidebar or the list', () => {
    renderAt('/sorting', 'engineer')
    expect(screen.queryByText(/^(Soon|Coming soon)$/)).not.toBeInTheDocument()
  })

  it('Engineer: the sidebar uses the real names', () => {
    renderAt('/searching/binary-search', 'engineer')
    expect(within(sidebar()).getByRole('link', { name: 'Binary search' })).toBeInTheDocument()
  })

  it('Explorer: the category page shows the plain name with the real name beneath', () => {
    renderAt('/sorting', 'explorer')
    const link = within(main()).getByRole('link', { name: /Bubble the biggest to the end/ })
    expect(link).toHaveAttribute('href', '/sorting/bubble-sort')
    expect(within(link).getByText('Bubble sort')).toBeInTheDocument()
  })

  it('Engineer: the category page shows only the real names', () => {
    renderAt('/sorting', 'engineer')
    expect(within(main()).getByRole('link', { name: 'Bubble sort' })).toBeInTheDocument()
    expect(screen.queryByText('Bubble the biggest to the end')).not.toBeInTheDocument()
  })
})

describe('CategoryPage', () => {
  it.each([
    ['engineer', 'Branching data: search trees, heaps and traversals.', 'Algorithms'],
    ['explorer', 'Things that branch out, like a family tree.', 'Pick one to watch'],
  ] as const)('%s: band and algorithm list', (level, description, listHeading) => {
    renderAt('/trees', level)
    expect(screen.getByRole('heading', { level: 1, name: 'Trees' })).toBeInTheDocument()
    expect(screen.getByText(description)).toBeInTheDocument()
    expect(within(main()).getByRole('heading', { level: 2, name: listHeading })).toBeVisible()
    const links = within(within(main()).getByRole('list')).getAllByRole('link')
    expect(links).toHaveLength(8)
    expect(links[0]).toHaveAttribute('href', '/trees/bst-insert')
  })
})

describe('complexity and best-for line in the band', () => {
  it('Engineer: Big O with the worst case circled, and what it is best for', () => {
    renderAt('/sorting/bubble-sort', 'engineer')
    const summary = document.querySelector('.band-summary')
    expect(summary).toHaveTextContent('Time O(n²) worst, O(n) best. Space O(1).')
    expect(summary).toHaveTextContent('Best for: small or nearly sorted lists.')
    expect(summary?.querySelector('.circled')).toHaveTextContent('O(n²)')
  })

  it('Explorer: a plain sentence and no Big O', () => {
    renderAt('/sorting/bubble-sort', 'explorer')
    const summary = document.querySelector('.band-summary')
    expect(summary).toHaveTextContent(
      'Fast for short lists that are almost in order. Slow for long, jumbled ones.',
    )
    expect(summary).not.toHaveTextContent('O(')
  })

  it('shows nothing for an algorithm that isn’t built yet', () => {
    renderAt('/sorting/quick-sort', 'engineer')
    expect(document.querySelector('.band-summary')).toBeNull()
  })
})

describe('WorkspacePage skeleton', () => {
  it('shows the algorithm in the band and every panel from design D', () => {
    renderAt('/sorting/bubble-sort', 'engineer')
    expect(screen.getByRole('heading', { level: 1, name: 'Bubble sort' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Visualization' })).toBeInTheDocument()
    // Step 1 shows "The idea" in the rail; the step panels start from step 2.
    expect(screen.getByRole('region', { name: 'The idea' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Start' }))
    expect(screen.getByRole('region', { name: "What's happening" })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Trace table' })).toBeInTheDocument()
    expect(screen.getByText('Comparisons')).toBeInTheDocument()
    expect(screen.getByText('Swaps')).toBeInTheDocument()
    const numbers = screen.getByRole('textbox', { name: 'Your numbers' })
    expect(numbers).toHaveValue('5 2 8 1 9 3')
    expect(numbers).not.toHaveAttribute('readonly')
    expect(screen.getByRole('button', { name: 'Run' })).toBeInTheDocument()
  })

  it('Engineer: shows the code panel, not the color key', () => {
    renderAt('/sorting/bubble-sort', 'engineer')
    expect(screen.getByRole('region', { name: 'Code' })).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'What the colors mean' })).not.toBeInTheDocument()
  })

  it('Explorer: hides the code panel and shows the color key and friendly headings', () => {
    renderAt('/sorting/bubble-sort', 'explorer')
    expect(screen.queryByRole('region', { name: 'Code' })).not.toBeInTheDocument()
    const key = screen.getByRole('list', { name: 'What the colors mean' })
    expect(
      within(key)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['Looking at these two', 'Trading places', 'In its final spot'])
    fireEvent.click(screen.getByRole('button', { name: 'Got it, let’s start' }))
    expect(screen.getByRole('region', { name: 'What happened so far' })).toBeInTheDocument()
  })

  it('for an algorithm that isn’t built yet: a note, no numbers, and disabled controls', () => {
    renderAt('/sorting/quick-sort', 'engineer')
    expect(screen.getByText(/Quick sort isn’t built yet/)).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'Your numbers' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Try bubble sort' })).toHaveAttribute(
      'href',
      '/sorting/bubble-sort',
    )
    expect(screen.getByText('No steps yet')).toBeInTheDocument()
    expect(screen.getAllByText('—')).toHaveLength(2)
    const controls = screen.getByRole('group', { name: 'Playback' })
    for (const name of [/Back/, /Play/, /Step/]) {
      expect(within(controls).getByRole('button', { name })).toBeDisabled()
    }
    const speed = within(controls).getByRole('group', { name: 'Speed' })
    expect(within(speed).getByRole('button', { name: '1×' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })
})
