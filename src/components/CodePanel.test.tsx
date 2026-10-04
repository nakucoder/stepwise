import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { bubbleSort } from '../algorithms/sorting/bubbleSort'
import { CodePanel } from './CodePanel'

const SOURCE = bubbleSort.source.python

describe('CodePanel', () => {
  it('shows every line of the source, numbered', () => {
    const { container } = render(<CodePanel source={SOURCE} activeLine={null} />)
    const lines = [...container.querySelectorAll('.code-line')]
    expect(lines).toHaveLength(11)
    expect(lines[5]?.textContent).toContain('if a[j] > a[j + 1]:')
    expect(lines[5]?.querySelector('.code-number')?.textContent).toBe('6')
  })

  it('marks the active line for sight and for screen readers', () => {
    render(<CodePanel source={SOURCE} activeLine={6} />)
    const active = screen.getByRole('listitem', { current: 'step' })
    expect(active).toHaveClass('is-active')
    expect(active).toHaveTextContent('if a[j] > a[j + 1]: (current line)')
    expect(
      screen.getAllByRole('listitem').filter((li) => li.classList.contains('is-active')),
    ).toHaveLength(1)
  })

  it('marks nothing when no line is active', () => {
    render(<CodePanel source={SOURCE} activeLine={null} />)
    expect(screen.queryByRole('listitem', { current: 'step' })).not.toBeInTheDocument()
  })
})
