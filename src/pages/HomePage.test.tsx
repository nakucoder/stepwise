import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { CATEGORIES } from '../data/categories'
import type { Level } from '../engine/types'
import { STORAGE_KEYS } from '../lib/storage'
import { PreferencesProvider } from '../preferences/PreferencesProvider'
import { HomePage } from './HomePage'

function renderHome(level: Level) {
  localStorage.setItem(STORAGE_KEYS.level, level)
  return render(
    <PreferencesProvider>
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    </PreferencesProvider>,
  )
}

const cards = () => within(screen.getByRole('list')).getAllByRole('link')

describe('HomePage', () => {
  describe.each([
    ['explorer', 'What do you want to watch run?'],
    ['engineer', 'Eight topics, in the order most people learn them'],
  ] as const)('%s', (level, headline) => {
    it('shows the level headline', () => {
      renderHome(level)
      expect(screen.getByRole('heading', { level: 1, name: headline })).toBeInTheDocument()
    })

    it('links to all eight categories in learning order', () => {
      renderHome(level)
      const links = cards()
      expect(links).toHaveLength(8)
      links.forEach((link, i) => {
        const category = CATEGORIES[i]
        expect(link).toHaveAccessibleName(category?.name)
        expect(link).toHaveAttribute('href', `/${String(category?.id)}`)
        expect(link).toHaveAccessibleDescription(category?.description[level])
      })
    })
  })

  it('Explorer: plain descriptions and how many there are to try', () => {
    renderHome('explorer')
    expect(screen.getByText('Dots joined by lines, like roads between towns.')).toBeInTheDocument()
    const graphs = screen.getByRole('link', { name: 'Graphs' })
    expect(within(graphs).getByText('7 to try')).toBeInTheDocument()
    expect(screen.queryByText(/Dijkstra/)).not.toBeInTheDocument()
  })

  it('Engineer: technical descriptions and algorithm lists', () => {
    renderHome('engineer')
    expect(screen.getByText('Maps and networks: shortest paths, BFS and DFS.')).toBeInTheDocument()
    expect(
      screen.getByText('BFS, DFS, Dijkstra, A*, topological sort, Prim, Kruskal'),
    ).toBeInTheDocument()
    expect(screen.queryByText(/to try$/)).not.toBeInTheDocument()
  })
})
