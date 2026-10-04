import { readFileSync, statSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// The link preview card (Open Graph + Twitter), checked the way the sharing debuggers check it:
// required tags present, absolute https URLs, and an image of the size the tags promise.
const SITE = 'https://stepwise-lab.pages.dev'
// Prettier wraps long tags over several lines; collapsing whitespace makes them easy to match.
const html = readFileSync('index.html', 'utf8').replace(/\s+/g, ' ')

function meta(key: string): string | undefined {
  return new RegExp(`<meta (?:property|name)="${key}" content="([^"]*)"`).exec(html)?.[1]
}

/** Width and height from a PNG's IHDR chunk. */
function pngSize(path: string): { width: number; height: number } {
  const bytes = readFileSync(path)
  expect(bytes.subarray(1, 4).toString('ascii'), `${path} is a PNG`).toBe('PNG')
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) }
}

describe('link preview card', () => {
  it.each([
    'og:type',
    'og:site_name',
    'og:title',
    'og:description',
    'og:url',
    'og:image',
    'og:image:type',
    'og:image:width',
    'og:image:height',
    'og:image:alt',
    'twitter:card',
    'twitter:title',
    'twitter:description',
    'twitter:image',
    'twitter:image:alt',
  ])('has %s', (key) => {
    expect(meta(key)?.trim(), key).toBeTruthy()
  })

  it('uses absolute https URLs on the live site', () => {
    expect(meta('og:url')).toBe(`${SITE}/`)
    expect(meta('og:image')).toBe(`${SITE}/og-image.png`)
    expect(meta('twitter:image')).toBe(meta('og:image'))
  })

  it('asks for the large image card on Twitter/X', () => {
    expect(meta('twitter:card')).toBe('summary_large_image')
  })

  it('keeps the title and description short enough not to be cut off', () => {
    expect(meta('og:title')?.length).toBeLessThanOrEqual(60)
    expect(meta('og:description')?.length).toBeLessThanOrEqual(155)
    expect(meta('twitter:title')).toBe(meta('og:title'))
    expect(meta('twitter:description')).toBe(meta('og:description'))
  })

  it('serves a 1200×630 PNG that matches its tags and is small enough for WhatsApp', () => {
    const file = 'public/og-image.png'
    expect(pngSize(file)).toEqual({ width: 1200, height: 630 })
    expect(meta('og:image:width')).toBe('1200')
    expect(meta('og:image:height')).toBe('630')
    expect(meta('og:image:type')).toBe('image/png')
    expect(statSync(file).size).toBeLessThan(300 * 1024)
  })
})
