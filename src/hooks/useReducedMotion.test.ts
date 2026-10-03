import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { setReducedMotion } from '../test/matchMedia'
import { useReducedMotion } from './useReducedMotion'

describe('useReducedMotion', () => {
  it('is false by default', () => {
    const { result } = renderHook(() => useReducedMotion())
    expect(result.current).toBe(false)
  })

  it('reads the system setting', () => {
    setReducedMotion(true)
    const { result } = renderHook(() => useReducedMotion())
    expect(result.current).toBe(true)
  })

  it('updates live when the setting changes', () => {
    const { result } = renderHook(() => useReducedMotion())
    act(() => {
      setReducedMotion(true)
    })
    expect(result.current).toBe(true)
    act(() => {
      setReducedMotion(false)
    })
    expect(result.current).toBe(false)
  })
})
