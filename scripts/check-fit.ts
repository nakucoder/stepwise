/**
 * Fails when Watch (at any step) or Do it (with the hint open) doesn't fit a short landscape
 * phone with larger text: the cases in fitCases.ts, each checked in a real (headless) Chrome by
 * fitProbe.ts. Watch is played with reduced motion, so every step is checked in its final pose.
 * It also fails when "The idea" scrolls beside the bars at 1440x900 (IDEA_SORTS, by
 * ideaProbe.ts), when heap sort's tree doesn't fit over the bars or in its sheet (treeProbe.ts), and
 * when the builder beaver's logs change size during a run on a phone (logProbe.ts).
 * The cases run side by side in one Chrome, each in its own window (FIT_JOBS at a time; by default
 * one per CPU), and their lines print in order.
 * With no argument it serves dist/ with `vite preview` (run after `vite build`);
 * given a URL (a preview or the live site), it checks that instead.
 */
import { spawn } from 'node:child_process'
import { availableParallelism } from 'node:os'
import { launchChrome } from './cdp.ts'
import { boxProbe } from './boxProbe.ts'
import {
  boxCases,
  boxName,
  boxUrl,
  desktopNoticeCases,
  desktopNoticeName,
  desktopNoticeUrl,
  FIT_SCREEN,
  fitCases,
  fitName,
  fitUrl,
  IDEA_SCREEN,
  ideaCases,
  ideaUrl,
  logCases,
  logName,
  logUrl,
  noticeCases,
  SAME_SIZE_ADD,
  sameSizeCases,
  sameSizeName,
  sameSizeUrl,
  treeCases,
  treeName,
  treeUrl,
} from './fitCases.ts'
import { fitProbe } from './fitProbe.ts'
import { ideaProbe } from './ideaProbe.ts'
import { logProbe } from './logProbe.ts'
import { noticeProbe } from './noticeProbe.ts'
import { sameSizeProbe } from './sameSizeProbe.ts'
import { treeProbe } from './treeProbe.ts'

const PORT = 4179
// How many cases run at once (FIT_JOBS overrides it): one per CPU, since more starve the pages' timers
// and the timing-sensitive checks fail.
const JOBS = Number(process.env.FIT_JOBS) || availableParallelism()

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
const setup = (level: string, look: string, textScale: string = FIT_SCREEN.textScale) => `
  localStorage.setItem('stepwise:level', ${JSON.stringify(level)})
  localStorage.setItem('stepwise:look', ${JSON.stringify(look)})
  new MutationObserver((_, observer) => {
    if (document.documentElement) {
      document.documentElement.style.fontSize = ${JSON.stringify(textScale)}
      observer.disconnect()
    }
  }).observe(document, { childList: true })`

/** How one case's page is opened: its screen, touch, reduced motion and storage. */
interface Page {
  width: number
  height: number
  mobile: boolean
  touch: boolean
  reducedMotion: boolean
  source: string
  url: string
}

/** One case: its page, the probe to run there, and its line (with its problems, if any). */
interface Task {
  page: Page
  expression: string
  report: (value: unknown) => { problems: string[]; line: string }
  failed: () => void
}

/**
 * Opens the case's page in its own browser context (its own storage, so cases running side by
 * side never see each other's level or look), runs its probe there and closes it.
 */
async function runProbe({ page, expression }: Task): Promise<unknown> {
  const { browserContextId } = await browser.send('Target.createBrowserContext', {})
  const { targetId } = await browser.send('Target.createTarget', {
    url: 'about:blank',
    browserContextId,
    newWindow: true,
  })
  const { sessionId } = (await browser.send('Target.attachToTarget', {
    targetId,
    flatten: true,
  })) as {
    sessionId: string
  }
  try {
    await browser.send('Page.enable', {}, sessionId)
    await browser.send(
      'Emulation.setDeviceMetricsOverride',
      { width: page.width, height: page.height, deviceScaleFactor: 1, mobile: page.mobile },
      sessionId,
    )
    // Every case's window acts as the focused one, so none is throttled as a background tab.
    await browser.send('Emulation.setFocusEmulationEnabled', { enabled: true }, sessionId)
    if (page.touch) {
      await browser.send('Emulation.setTouchEmulationEnabled', { enabled: true }, sessionId)
    }
    if (page.reducedMotion) {
      await browser.send(
        'Emulation.setEmulatedMedia',
        { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] },
        sessionId,
      )
    }
    await browser.send('Page.addScriptToEvaluateOnNewDocument', { source: page.source }, sessionId)
    const loaded = browser.next('Page.loadEventFired', sessionId)
    await browser.send('Page.navigate', { url: page.url }, sessionId)
    await loaded
    const { result } = (await browser.send(
      'Runtime.evaluate',
      { expression, awaitPromise: true, returnByValue: true },
      sessionId,
    )) as { result: { value?: unknown } }
    return result.value
  } finally {
    await browser.send('Target.disposeBrowserContext', { browserContextId })
  }
}

const mark = (problems: string[]) => (problems.length ? '✗' : '✓')
const listed = (problems: string[]) => (problems.length ? `\n    ${problems.join('\n    ')}` : '')

let failed = 0
let ideaFailed = 0
let ideaChecked = 0
let boxFailed = 0
let desktopFailed = 0
let sameFailed = 0
let treeFailed = 0
let logFailed = 0
const trees = treeCases()
const logs = logCases()
const sames = sameSizeCases()
const desktops = desktopNoticeCases()
const boxes = boxCases()
const cases = [...fitCases(), ...noticeCases()]
const ideas = ideaCases()

const tasks: Task[] = [
  ...cases.map((fit): Task => {
    const screen = fit.screen ?? FIT_SCREEN
    return {
      page: {
        width: screen.width,
        height: screen.height,
        mobile: true,
        touch: true,
        reducedMotion: fit.mode === 'watch',
        source: setup(fit.level, fit.look, screen.textScale),
        url: fitUrl(base, fit),
      },
      expression: `(${fitProbe.toString()})(${JSON.stringify(fit.mode)}, ${JSON.stringify(fit.pivot !== undefined)}, ${JSON.stringify(fit.notice === true)})`,
      report: (value) => {
        const { stage, problems } = (value as Awaited<ReturnType<typeof fitProbe>> | undefined) ?? {
          stage: 0,
          problems: ['the check did not run'],
        }
        return {
          problems,
          line: `${fitName(fit).padEnd(40)} stage ${String(stage).padStart(3)}px`,
        }
      },
      failed: () => failed++,
    }
  }),

  // "The idea" beside the bars on a desktop, at the reader's normal text size.
  ...ideas.map((idea): Task => ({
    page: {
      width: IDEA_SCREEN.width,
      height: IDEA_SCREEN.height,
      mobile: false,
      touch: false,
      reducedMotion: false,
      source: `localStorage.setItem('stepwise:level', ${JSON.stringify(idea.level)})
          localStorage.setItem('stepwise:look', 'bars')`,
      url: ideaUrl(base, idea),
    },
    expression: `(${ideaProbe.toString()})(${JSON.stringify(idea.mode)})`,
    report: (value) => {
      const { need, room, problems } = (value as
        Awaited<ReturnType<typeof ideaProbe>> | undefined) ?? {
        need: 0,
        room: 0,
        problems: ['the check did not run'],
      }
      ideaChecked++
      const name = `${idea.path.split('/')[1] ?? idea.path} idea ${idea.mode} ${idea.level}`
      return {
        problems,
        line: `${name.padEnd(40)} needs ${String(need)}px of ${String(room)}px`,
      }
    },
    failed: () => ideaFailed++,
  })),

  // The pizza cart's boxes on phones: one size through a Do it run, and enough in a sheet's strip.
  ...boxes.map((cart): Task => {
    const { width, height, textScale, minBox } = cart.screen
    return {
      page: {
        width,
        height,
        mobile: true,
        touch: true,
        reducedMotion: false,
        source: setup(cart.level, 'character', textScale),
        url: boxUrl(base, cart),
      },
      expression: `(${boxProbe.toString()})(${JSON.stringify(cart.mode)}, ${JSON.stringify(cart.wrong)}, ${String(minBox)})`,
      report: (value) => {
        const { boxes: sizes, problems } = (value as
          Awaited<ReturnType<typeof boxProbe>> | undefined) ?? {
          boxes: [],
          problems: ['the check did not run'],
        }
        return { problems, line: `${boxName(cart).padEnd(40)} boxes ${sizes.join(' ')}px` }
      },
      failed: () => boxFailed++,
    }
  }),

  // The range notice on laptops, where Do it's Start scrolls the page to the answers.
  ...desktops.map((desktop): Task => ({
    page: {
      ...desktop.screen,
      mobile: false,
      touch: false,
      reducedMotion: false,
      source: setup(desktop.level, 'character', '100%'),
      url: desktopNoticeUrl(base, desktop),
    },
    expression: `(${noticeProbe.toString()})()`,
    report: (value) => {
      const { scrolled, problems } = (value as
        Awaited<ReturnType<typeof noticeProbe>> | undefined) ?? {
        scrolled: 0,
        problems: ['the check did not run'],
      }
      return {
        problems,
        line: `${desktopNoticeName(desktop).padEnd(40)} scrolled ${String(scrolled)}px`,
      }
    },
    failed: () => desktopFailed++,
  })),

  // The pizza cart's boxes on a phone on its side: one size, whatever the numbers, step or sheet.
  ...sames.map((same): Task => {
    const { width, height, textScale } = same.screen
    return {
      page: {
        width,
        height,
        mobile: true,
        touch: true,
        reducedMotion: true,
        source: setup(same.level, 'character', textScale),
        url: sameSizeUrl(base, same),
      },
      expression: `(${sameSizeProbe.toString()})(${JSON.stringify(same.mode)}, ${String(SAME_SIZE_ADD)})`,
      report: (value) => {
        const { boxes: sizes, problems } = (value as
          Awaited<ReturnType<typeof sameSizeProbe>> | undefined) ?? {
          boxes: [],
          problems: ['the check did not run'],
        }
        return {
          problems,
          line: `${sameSizeName(same).padEnd(40)} boxes ${[...new Set(sizes)].join(' ')}px`,
        }
      },
      failed: () => sameFailed++,
    }
  }),

  // Heap sort's tree: over the bars, or in its sheet on a phone on its side, at every step.
  ...trees.map((tree): Task => {
    const { width, height, textScale, mobile, place, barNumbers } = tree.screen
    return {
      page: {
        width,
        height,
        mobile,
        touch: mobile,
        reducedMotion: true,
        source: setup(tree.level, 'bars', textScale),
        url: treeUrl(base, tree),
      },
      expression: `(${treeProbe.toString()})(${JSON.stringify(place)}, ${String(barNumbers)})`,
      report: (value) => {
        const {
          tree: size,
          bars,
          problems,
        } = (value as Awaited<ReturnType<typeof treeProbe>> | undefined) ?? {
          tree: 0,
          bars: 0,
          problems: ['the check did not run'],
        }
        return {
          problems,
          line: `${treeName(tree).padEnd(40)} ${place} tree ${String(size)}px, bars ${String(bars)}px`,
        }
      },
      failed: () => treeFailed++,
    }
  }),

  // Heap sort's builder beaver on phones: one log size through a whole run, Watch and Do it.
  ...logs.map((log): Task => {
    const { width, height, textScale, minField } = log.screen
    return {
      page: {
        width,
        height,
        mobile: true,
        touch: true,
        reducedMotion: true,
        source: setup(log.level, 'character', textScale),
        url: logUrl(base, log),
      },
      expression: `(${logProbe.toString()})(${JSON.stringify(log.mode)}, ${String(minField)})`,
      report: (value) => {
        const {
          logs: sizes,
          fields,
          problems,
        } = (value as Awaited<ReturnType<typeof logProbe>> | undefined) ?? {
          logs: [],
          fields: [],
          problems: ['the check did not run'],
        }
        return {
          problems,
          line: `${logName(log).padEnd(40)} logs ${[...new Set(sizes)].join(' ')}px, field ${String(Math.min(...fields))}px or more`,
        }
      },
      failed: () => logFailed++,
    }
  }),
]

// The cases run side by side, each in its own window (they mostly wait on the page's timers),
// and each line is printed in the cases' order as soon as every case before it is done.
const lines: (string | undefined)[] = []
let printed = 0
let nextTask = 0
async function worker(): Promise<void> {
  while (nextTask < tasks.length) {
    const k = nextTask++
    const task = tasks[k]
    if (!task) break
    const { problems, line } = task.report(await runProbe(task))
    if (problems.length > 0) task.failed()
    lines[k] = `${mark(problems)} ${line}${listed(problems)}`
    for (; lines[printed] !== undefined; printed++) console.log(lines[printed])
  }
}
try {
  await Promise.all(Array.from({ length: Math.min(JOBS, tasks.length) }, worker))
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
if (desktopFailed > 0) {
  console.error(
    `${String(desktopFailed)} of ${String(desktops.length)} laptop screens lose the range notice.`,
  )
}
if (sameFailed > 0) {
  console.error(
    `${String(sameFailed)} of ${String(sames.length)} cart checks change the boxes' size or crowd the tags.`,
  )
}
if (treeFailed > 0) {
  console.error(`${String(treeFailed)} of ${String(trees.length)} heap sort tree checks failed.`)
}
if (logFailed > 0) {
  console.error(
    `${String(logFailed)} of ${String(logs.length)} beaver checks change the logs' size or squeeze the field.`,
  )
}
if (
  failed > 0 ||
  ideaFailed > 0 ||
  boxFailed > 0 ||
  desktopFailed > 0 ||
  sameFailed > 0 ||
  treeFailed > 0 ||
  logFailed > 0
) {
  if (failed > 0) {
    console.error(
      `${String(failed)} of ${String(cases.length)} cases don't fit ${String(width)}x${String(height)} at ${textScale} (or, with the range notice, their phone).`,
    )
  }
  process.exit(1)
}
console.log(
  `All ${String(cases.length)} cases fit ${String(width)}x${String(height)} at ${textScale} (Watch at every step, Do it with the hint open), the range notice on phones too.`,
)
console.log(
  `All ${String(ideaChecked)} "The idea" panels fit at ${String(IDEA_SCREEN.width)}x${String(IDEA_SCREEN.height)}.`,
)
console.log(
  `All ${String(boxes.length)} pizza cart box checks pass (one size through Do it, room in a sheet's strip).`,
)
console.log(
  `All ${String(desktops.length)} laptop screens keep the range notice on screen with the bars.`,
)
console.log(
  `All ${String(sames.length)} cart checks keep one box size on a phone on its side (numbers, steps, sheets).`,
)
console.log(
  `All ${String(trees.length)} heap sort tree checks pass (over the bars or in its sheet, one height, every step).`,
)
console.log(
  `All ${String(logs.length)} beaver checks keep one log size through a run on phones (76px field or more on the tightest).`,
)
