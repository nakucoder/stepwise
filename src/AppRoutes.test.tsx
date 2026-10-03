import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { AppRoutes } from './AppRoutes'
import { STORAGE_KEYS } from './lib/storage'
import { PreferencesProvider } from './preferences/PreferencesProvider'

function renderAt(path: string) {
  localStorage.setItem(STORAGE_KEYS.level, 'engineer')
  return render(
    <PreferencesProvider>
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
      </MemoryRouter>
    </PreferencesProvider>,
  )
}

const h1 = () => screen.getByRole('heading', { level: 1 })

describe('routes', () => {
  it('/ shows the home page', () => {
    renderAt('/')
    expect(h1()).toHaveTextContent('Eight topics, in the order most people learn them')
  })

  it('/:category shows that category and links to its algorithms', () => {
    renderAt('/sorting')
    expect(h1()).toHaveTextContent('Sorting')
    expect(screen.getByRole('link', { name: 'Bubble sort' })).toHaveAttribute(
      'href',
      '/sorting/bubble-sort',
    )
  })

  it('/:category/:algorithm shows the workspace for that algorithm', () => {
    renderAt('/graphs/dijkstra')
    expect(h1()).toHaveTextContent('Dijkstra')
  })

  it.each(['/nope', '/sorting/nope', '/nope/bubble-sort', '/sorting/bubble-sort/extra'])(
    '%s shows the not-found page with a way home',
    (path) => {
      renderAt(path)
      expect(h1()).toHaveTextContent("That page doesn't exist")
      expect(screen.getByRole('link', { name: 'Go to the home page' })).toHaveAttribute('href', '/')
    },
  )

  it('the logo links home from any page', async () => {
    const user = userEvent.setup()
    renderAt('/trees')
    await user.click(screen.getByRole('link', { name: 'Stepwise' }))
    expect(h1()).toHaveTextContent('Eight topics, in the order most people learn them')
  })

  it('moves focus to the new page after navigating, by mouse or keyboard', async () => {
    const user = userEvent.setup()
    renderAt('/')
    await user.click(screen.getByRole('link', { name: 'Sorting' }))
    expect(h1()).toHaveTextContent('Sorting')
    expect(screen.getByRole('main')).toHaveFocus()

    await user.tab()
    expect(screen.getByRole('link', { name: 'Bubble sort' })).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(h1()).toHaveTextContent('Bubble sort')
    expect(screen.getByRole('main')).toHaveFocus()
  })
})
