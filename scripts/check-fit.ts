/**
 * Fails when Watch (at any step) or Do it (with the hint open) doesn't fit a short landscape
 * phone with larger text: the cases in fitCases.ts, each checked in a real (headless) Chrome by
 * fitProbe.ts. Watch is played with reduced motion, so every step is checked in its final pose.
 * It also fails when "The idea" scrolls beside the bars at 1440x900 (IDEA_SORTS, by
 * ideaProbe.ts). With no argument it serves dist/ with `vite preview` (run after `vite build`);
 * given a URL (a preview or the live site), it checks that instead.
 */
import { spawn } from 'node:child_process'
import { launchChrome } from './cdp.ts'
import { boxProbe } from './boxProbe.ts'
import {
  boxCases,
  boxName,
  boxUrl,
  FIT_SCREEN,
  fitCases,
  fitName,
  fitUrl,
  IDEA_SCREEN,
  ideaCases,
  ideaUrl,
} from './fitCases.ts'
import { fitProbe } from './fitProbe.ts'
import { ideaProbe } from './ideaProbe.ts'

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
let ideaFailed = 0
let ideaChecked = 0
let boxFailed = 0
const boxes = boxCases()
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
    if (fit.mode === 'watch') {
      await browser.send(
        'Emulation.setEmulatedMedia',
        { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] },
        sessionId,
      )
    }
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
      {
        expression: `(${fitProbe.toString()})(${JSON.stringify(fit.mode)}, ${JSON.stringify(fit.pivot !== undefined)})`,
        awaitPromise: true,
        returnByValue: true,
      },
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

  // "The idea" beside the bars on a desktop, at the reader's normal text size.
  for (const idea of ideaCases()) {
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
      { width: IDEA_SCREEN.width, height: IDEA_SCREEN.height, deviceScaleFactor: 1, mobile: false },
      sessionId,
    )
    await browser.send(
      'Page.addScriptToEvaluateOnNewDocument',
      {
        source: `localStorage.setItem('stepwise:level', ${JSON.stringify(idea.level)})
          localStorage.setItem('stepwise:look', 'bars')`,
      },
      sessionId,
    )
    const loaded = browser.next('Page.loadEventFired', sessionId)
    await browser.send('Page.navigate', { url: ideaUrl(base, idea) }, sessionId)
    await loaded
    const { result } = (await browser.send(
      'Runtime.evaluate',
      {
        expression: `(${ideaProbe.toString()})(${JSON.stringify(idea.mode)})`,
        awaitPromise: true,
        returnByValue: true,
      },
      sessionId,
    )) as { result: { value?: Awaited<ReturnType<typeof ideaProbe>> } }
    await browser.send('Target.closeTarget', { targetId })
    const { need, room, problems } = result.value ?? {
      need: 0,
      room: 0,
      problems: ['the check did not run'],
    }
    ideaChecked++
    if (problems.length > 0) ideaFailed++
    const name = `${idea.path.split('/')[1] ?? idea.path} idea ${idea.mode} ${idea.level}`
    console.log(
      `${problems.length ? '✗' : '✓'} ${name.padEnd(40)} needs ${String(need)}px of ${String(room)}px` +
        (problems.length ? `\n    ${problems.join('\n    ')}` : ''),
    )
  }

  // The pizza cart's boxes on phones: one size through a Do it run, and enough in a sheet's strip.
  for (const cart of boxes) {
    const { targetId } = await browser.send('Target.createTarget', { url: 'about:blank' })
    const { sessionId } = (await browser.send('Target.attachToTarget', {
      targetId,
      flatten: true,
    })) as {
      sessionId: string
    }
    const { width, height, textScale, minBox } = cart.screen
    await browser.send('Page.enable', {}, sessionId)
    await browser.send(
      'Emulation.setDeviceMetricsOverride',
      { width, height, deviceScaleFactor: 1, mobile: true },
      sessionId,
    )
    await browser.send('Emulation.setTouchEmulationEnabled', { enabled: true }, sessionId)
    await browser.send(
      'Page.addScriptToEvaluateOnNewDocument',
      {
        source: `localStorage.setItem('stepwise:level', ${JSON.stringify(cart.level)})
          localStorage.setItem('stepwise:look', 'character')
          new MutationObserver((_, observer) => {
            if (document.documentElement) {
              document.documentElement.style.fontSize = ${JSON.stringify(textScale)}
              observer.disconnect()
            }
          }).observe(document, { childList: true })`,
      },
      sessionId,
    )
    const loaded = browser.next('Page.loadEventFired', sessionId)
    await browser.send('Page.navigate', { url: boxUrl(base, cart) }, sessionId)
    await loaded
    const { result } = (await browser.send(
      'Runtime.evaluate',
      {
        expression: `(${boxProbe.toString()})(${JSON.stringify(cart.mode)}, ${JSON.stringify(cart.wrong)}, ${String(minBox)})`,
        awaitPromise: true,
        returnByValue: true,
      },
      sessionId,
    )) as { result: { value?: Awaited<ReturnType<typeof boxProbe>> } }
    await browser.send('Target.closeTarget', { targetId })
    const { boxes: sizes, problems } = result.value ?? {
      boxes: [],
      problems: ['the check did not run'],
    }
    if (problems.length > 0) boxFailed++
    console.log(
      `${problems.length ? '✗' : '✓'} ${boxName(cart).padEnd(40)} boxes ${sizes.join(' ')}px` +
        (problems.length ? `\n    ${problems.join('\n    ')}` : ''),
    )
  }
} finally {
  await browser.close()
  served?.stop()
}

const { width, height, textScale } = FIT_SCREEN
if (ideaFailed > 0) {
  console.error(
    `${String(ideaFailed)} of ${String(ideaChecked)} "The idea" panels scroll at ${String(IDEA_SCREEN.width)}x${String(IDEA_SCREEN.height)}.`,
  )
}
if (boxFailed > 0) {
  console.error(`${String(boxFailed)} of ${String(boxes.length)} pizza cart box checks failed.`)
}
if (failed > 0 || ideaFailed > 0 || boxFailed > 0) {
  if (failed > 0) {
    console.error(
      `${String(failed)} of ${String(cases.length)} cases don't fit ${String(width)}x${String(height)} at ${textScale}.`,
    )
  }
  process.exit(1)
}
console.log(
  `All ${String(cases.length)} cases fit ${String(width)}x${String(height)} at ${textScale} (Watch at every step, Do it with the hint open).`,
)
console.log(
  `All ${String(ideaChecked)} "The idea" panels fit at ${String(IDEA_SCREEN.width)}x${String(IDEA_SCREEN.height)}.`,
)
console.log(
  `All ${String(boxes.length)} pizza cart box checks pass (one size through Do it, room in a sheet's strip).`,
)
