/**
 * Fails the build when an inline script in dist/index.html isn't allowed by its hash in the
 * Content-Security-Policy in dist/_headers. Browsers would block that script, so a saved dark
 * theme would flash white. Run after `vite build`.
 */
import { readFileSync } from 'node:fs'
import { inlineScripts, missingHashes } from './csp.ts'

const html = readFileSync('dist/index.html', 'utf8')
const headers = readFileSync('dist/_headers', 'utf8')
const missing = missingHashes(html, headers)

if (missing.length > 0) {
  console.error(
    `The CSP in public/_headers doesn't allow ${String(missing.length)} inline script(s) in index.html.\n` +
      `Put these in its script-src (and remove any stale sha256 sources):\n  ${missing.join('\n  ')}`,
  )
  process.exit(1)
}
console.log(`CSP allows all ${String(inlineScripts(html).length)} inline script(s) by hash.`)
