import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { inlineScripts, missingHashes, sha256Source } from './csp.ts'

const headersWith = (scriptSrc: string) =>
  `/*\n  Content-Security-Policy: default-src 'self'; script-src ${scriptSrc}; object-src 'none'\n`

describe('CSP hash check', () => {
  it('hashes a script the way browsers do', () => {
    // Reference value from Python's hashlib, independent of this code.
    expect(sha256Source('alert(1)')).toBe("'sha256-bhHHL3z2vDgxUt0W3dWQOrprscmda2Y5pLsLg4GF+pI='")
  })

  it('finds inline scripts and skips ones loaded from a file', () => {
    const html = `<script>a()</script><script type="module" src="/main.js"></script><script>\n  b()\n</script>`
    expect(inlineScripts(html)).toEqual(['a()', '\n  b()\n'])
  })

  it('passes when every inline script is allowed by its hash', () => {
    const html = '<script>alert(1)</script>'
    expect(missingHashes(html, headersWith(`'self' ${sha256Source('alert(1)')}`))).toEqual([])
  })

  it('fails when the script changes but the hash does not', () => {
    const html = '<script>alert(2)</script>'
    expect(missingHashes(html, headersWith(`'self' ${sha256Source('alert(1)')}`))).toEqual([
      sha256Source('alert(2)'),
    ])
  })

  it('only counts hashes in script-src, not in other directives', () => {
    const hash = sha256Source('alert(1)')
    const headers = `/*\n  Content-Security-Policy: script-src 'self'; style-src ${hash}\n`
    expect(missingHashes('<script>alert(1)</script>', headers)).toEqual([hash])
  })

  it("allows the real index.html's no-flash script in the real public/_headers", () => {
    const html = readFileSync('index.html', 'utf8')
    expect(inlineScripts(html)).toHaveLength(1)
    expect(missingHashes(html, readFileSync('public/_headers', 'utf8'))).toEqual([])
  })
})
