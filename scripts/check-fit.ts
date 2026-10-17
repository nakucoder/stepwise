/**
 * Fails when Do it doesn't fit a short landscape phone with larger text and the hint open: the
 * cases in fitCases.ts, each checked in a real (headless) Chrome by fitProbe.ts. With no
 * argument it serves dist/ with `vite preview` (run after `vite build`); given a URL (a preview
 * or the live site), it checks that instead.
 */
import { spawn } from 'node:child_process'
import { launchChrome } from './cdp.ts'
import { FIT_SCREEN, fitCases, fitName, fitUrl } from './fitCases.ts'
import { fitProbe } from './fitProbe.ts'

const PORT = 4179

async function serveDist(): Promise<{ base: string; stop: () => void }> {
  const server = spawn(
    process.execPath,
    ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PORT), '--strictPort'],
    { stdio: 'ignore' },
  )
  const base = `http://localhost:${String(PORT)}`
  for (let k = 0; k < 100; k++) {
    try {
      if ((await fetch(base)).ok) return { base, stop: () => server.kill() }
    } catch {
      // Not listening yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  server.kill()
  throw new Error('vite preview did not start')
}

const given = process.argv[2]?.replace(/\/$/, '')
const served = given ? null : await serveDist()
const base = given ?? served?.base ?? ''
const browser = await launchChrome()
// The reader's text size is in place before anything renders, as on a phone (a later change
// isn't seen by container queries measured in rem).
const setup = (level: string, look: string) => `
  localStorage.setItem('stepwise:level', ${JSON.stringify(level)})
  localStorage.setItem('stepwise:look', ${JSON.stringify(look)})
  new MutationObserver((_, observer) => {
    if (document.documentElement) {
      document.documentElement.style.fontSize = ${JSON.stringify(FIT_SCREEN.textScale)}
      observer.disconnect()
    }
  }).observe(document, { childList: true })`

let failed = 0
const cases = fitCases()
try {
  for (const fit of cases) {
    const { targetId } = await browser.send('Target.createTarget', { url: 'about:blank' })
    const { sessionId } = (await browser.send('Target.attachToTarget', {
      targetId,
      flatten: true,
    })) as {
      sessionId: string
    }
    await browser.send('Page.enable', {}, sessionId)
    await browser.send(
      'Emulation.setDeviceMetricsOverride',
      { width: FIT_SCREEN.width, height: FIT_SCREEN.height, deviceScaleFactor: 1, mobile: true },
      sessionId,
    )
    await browser.send('Emulation.setTouchEmulationEnabled', { enabled: true }, sessionId)
    await browser.send(
      'Page.addScriptToEvaluateOnNewDocument',
      { source: setup(fit.level, fit.look) },
      sessionId,
    )
    const loaded = browser.next('Page.loadEventFired', sessionId)
    await browser.send('Page.navigate', { url: fitUrl(base, fit) }, sessionId)
    await loaded
    const { result } = (await browser.send(
      'Runtime.evaluate',
      { expression: `(${fitProbe.toString()})()`, awaitPromise: true, returnByValue: true },
      sessionId,
    )) as { result: { value?: Awaited<ReturnType<typeof fitProbe>> } }
    await browser.send('Target.closeTarget', { targetId })
    const { stage, problems } = result.value ?? { stage: 0, problems: ['the check did not run'] }
    if (problems.length > 0) failed++
    console.log(
      `${problems.length ? '✗' : '✓'} ${fitName(fit).padEnd(40)} stage ${String(stage).padStart(3)}px` +
        (problems.length ? `\n    ${problems.join('\n    ')}` : ''),
    )
  }
} finally {
  await browser.close()
  served?.stop()
}

const { width, height, textScale } = FIT_SCREEN
if (failed > 0) {
  console.error(
    `${String(failed)} of ${String(cases.length)} cases don't fit ${String(width)}x${String(height)} at ${textScale} with the hint open.`,
  )
  process.exit(1)
}
console.log(
  `All ${String(cases.length)} cases fit ${String(width)}x${String(height)} at ${textScale} with the hint open.`,
)
