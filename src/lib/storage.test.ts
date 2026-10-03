import { afterEach, describe, expect, it, vi } from 'vitest'
import { readPref, writePref } from './storage'

const isColor = (value: string): value is 'red' | 'blue' => value === 'red' || value === 'blue'

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
})

describe('readPref', () => {
  it('returns a valid stored value', () => {
    localStorage.setItem('k', 'red')
    expect(readPref('k', isColor)).toBe('red')
  })

  it('returns null when nothing is stored', () => {
    expect(readPref('k', isColor)).toBeNull()
  })

  it('returns null for an unexpected stored value', () => {
    localStorage.setItem('k', 'purple')
    expect(readPref('k', isColor)).toBeNull()
  })

  it('returns null instead of throwing when storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError')
    })
    expect(readPref('k', isColor)).toBeNull()
  })
})

describe('writePref', () => {
  it('stores the value', () => {
    expect(writePref('k', 'blue')).toBe(true)
    expect(localStorage.getItem('k')).toBe('blue')
  })

  it('returns false instead of throwing when storage is full or blocked', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError')
    })
    expect(writePref('k', 'blue')).toBe(false)
  })
})
