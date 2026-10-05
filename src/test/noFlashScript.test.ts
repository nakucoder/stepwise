import { describe, expect, it, vi } from 'vitest'
import indexHtml from '../../index.html?raw'
import { STORAGE_KEYS } from '../lib/storage'

// The inline script in index.html runs before React to avoid a flash of the wrong theme.
// These tests run its exact source against jsdom.
const source = /<script>([\s\S]*?)<\/script>/.exec(indexHtml)?.[1] ?? ''

function runScript() {
  // eslint-disable-next-line @typescript-eslint/no-implied-eval -- running the page's own inline script
  const script = new Function(source) as () => void
  script()
}

const root = document.documentElement

describe('index.html no-flash script', () => {
  it('exists and uses the same storage keys as the app', () => {
    expect(source).toContain(STORAGE_KEYS.theme)
    expect(source).toContain(STORAGE_KEYS.level)
  })

  it('applies a saved theme and level', () => {
    localStorage.setItem(STORAGE_KEYS.theme, 'dark')
    localStorage.setItem(STORAGE_KEYS.level, 'explorer')
    runScript()
    expect(root.dataset.theme).toBe('dark')
    expect(root.dataset.level).toBe('explorer')
  })

  it('leaves the page alone when nothing valid is saved', () => {
    localStorage.setItem(STORAGE_KEYS.theme, 'sepia')
    runScript()
    expect(root.dataset.theme).toBeUndefined()
    expect(root.dataset.level).toBeUndefined()
  })

  it('does not throw when localStorage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError')
    })
    expect(runScript).not.toThrow()
    vi.restoreAllMocks()
  })
})
