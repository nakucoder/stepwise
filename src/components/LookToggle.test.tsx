import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { STORAGE_KEYS } from '../lib/storage'
import { PreferencesProvider } from '../preferences/PreferencesProvider'
import { LookToggle } from './LookToggle'
import type { CharacterId } from '../engine/types'

function renderToggle(character: CharacterId | undefined) {
  localStorage.setItem(STORAGE_KEYS.level, 'explorer')
  const user = userEvent.setup()
  const view = render(
    <PreferencesProvider>
      <LookToggle character={character} />
    </PreferencesProvider>,
  )
  return { user, ...view }
}

describe('LookToggle', () => {
  it('is hidden for an algorithm with no character', () => {
    renderToggle(undefined)
    expect(screen.queryByRole('group', { name: 'Show as' })).not.toBeInTheDocument()
  })

  it('shows the character’s own name, with its icon, and saves "character"', async () => {
    const { user, container } = renderToggle('ducks')
    const group = screen.getByRole('group', { name: 'Show as' })
    expect(within(group).getByRole('button', { name: 'Ducks' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(container.querySelector('.look-toggle-icon')).not.toBeNull()
    await user.click(within(group).getByRole('button', { name: 'Bars' }))
    expect(localStorage.getItem(STORAGE_KEYS.look)).toBe('bars')
    await user.click(within(group).getByRole('button', { name: 'Ducks' }))
    expect(localStorage.getItem(STORAGE_KEYS.look)).toBe('character')
  })

  it('names a character without an icon yet', () => {
    const { container } = renderToggle('robot')
    expect(screen.getByRole('button', { name: 'Robot' })).toBeInTheDocument()
    expect(container.querySelector('.look-toggle-icon')).toBeNull()
  })
})
