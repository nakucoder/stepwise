import { describe, expect, it } from 'vitest'
import tokensCss from './tokens.css?raw'

/** Parses `--name: value;` declarations inside the first block matching `selector {`. */
function declarations(selector: string): Map<string, string> {
  const start = tokensCss.indexOf(`${selector} {`)
  if (start === -1) throw new Error(`Selector not found: ${selector}`)
  const end = tokensCss.indexOf('}', start)
  const block = tokensCss.slice(start, end)
  const result = new Map<string, string>()
  for (const match of block.matchAll(/(--[\w-]+):\s*([^;]+);/g)) {
    const [, name, value] = match
    if (name && value) result.set(name, value.trim())
  }
  return result
}

/** WCAG 2.x relative luminance of a #rrggbb color. */
function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const [r = 0, g = 0, b = 0] = channels.map((c) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  )
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05)
}

const light = declarations(':root')
const darkFromSystem = declarations(":root:not([data-theme='light'])")
const darkExplicit = declarations(":root[data-theme='dark']")
const dark = new Map([...light, ...darkExplicit])

function color(theme: Map<string, string>, name: string): string {
  const value = theme.get(name)
  if (!value?.startsWith('#')) throw new Error(`${name} is not a hex color: ${String(value)}`)
  return value
}

const categories = [
  'sorting',
  'searching',
  'linked-lists',
  'trees',
  'graphs',
  'hashing',
  'pattern-matching',
  'dynamic-programming',
]

describe('design tokens', () => {
  it('keeps the system dark theme and the explicit dark theme identical', () => {
    expect(Object.fromEntries(darkFromSystem)).toEqual(Object.fromEntries(darkExplicit))
  })

  it('defines a color and a text color for every category', () => {
    for (const id of categories) {
      expect(light.has(`--cat-${id}`), id).toBe(true)
      expect(light.has(`--cat-on-${id}`), id).toBe(true)
    }
  })

  // Small text needs 4.5:1 (WCAG AA). These are the pairs measured for design D.
  const smallTextPairs: [text: string, background: string][] = [
    ['--color-ink', '--color-bg'],
    ['--color-muted', '--color-bg'],
    ['--color-ink', '--color-surface'],
    ['--color-note', '--color-bg'],
    ['--color-on-selected', '--color-selected'],
    ['--role-on-comparing', '--role-comparing'],
    ['--role-on-swapping', '--role-swapping'],
    ['--role-on-sorted', '--role-sorted'],
    ['--role-on-pivot', '--role-pivot'],
    ...categories.map((id): [string, string] => [`--cat-on-${id}`, `--cat-${id}`]),
  ]

  for (const [themeName, theme] of [
    ['light', light],
    ['dark', dark],
  ] as const) {
    it.each(smallTextPairs)(`${themeName}: %s on %s meets 4.5:1`, (text, background) => {
      expect(contrast(color(theme, text), color(theme, background))).toBeGreaterThanOrEqual(4.5)
    })
  }
})
