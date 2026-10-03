import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'
import { installMatchMedia, resetMatchMedia } from './matchMedia'

installMatchMedia()

afterEach(() => {
  cleanup()
  resetMatchMedia()
  localStorage.clear()
  delete document.documentElement.dataset.level
  delete document.documentElement.dataset.theme
})
