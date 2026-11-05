/// <reference lib="dom" />

/**
 * Runs inside the page (sent as source text, so it must not use anything outside itself) on a
 * phone with heap sort's builder beaver: its logs keep one size through a whole run, whatever the
 * step, the explanation, the question, the hint or a sheet. In Watch it steps through every step
 * (with The idea, then the Numbers sheet, opened and closed on the way); in Do it it starts, and at
 * every question opens the hint and takes Show me, and records every step played, to
 * the end. The log's size is the scene's `data-log`, the field's height its measured box. On every
 * step the tags under the stacks keep one row. With `minField`, the field is never shorter (the
 * tightest phone's 76 px).
 */
export async function logProbe(
  mode: 'watch' | 'do',
  minField: number,
): Promise<{ logs: number[]; fields: number[]; problems: string[] }> {
  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
  const problems: string[] = []
  const logs: number[] = []
  const fields: number[] = []
  const phases: string[] = []
  for (let k = 0; k < 100 && !document.querySelector('.beaver-scene'); k++) await sleep(100)
  await document.fonts.ready
  const frame = () =>
    new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  const settle = async () => {
    await sleep(300)
    await frame()
  }
  const button = (selector: string, label: RegExp) =>
    [...document.querySelectorAll<HTMLButtonElement>(selector)].find((b) =>
      label.test(b.textContent.trim()),
    )
  const record = (phase: string) => {
    const scene = document.querySelector<HTMLElement>('.beaver-scene')
    if (!scene) {
      problems.push(`${phase}: no beaver`)
      return
    }
    // The strip over an open sheet (upright) is a different stage: it keeps the logs, not its height.
    const mini = document.querySelector('.phone-grid .stage.is-mini') !== null
    logs.push(Number(scene.dataset.log ?? 0))
    const field = scene.getBoundingClientRect().height
    if (!mini) fields.push(Math.round(field))
    phases.push(phase)
    if (!mini && field < minField - 0.5) {
      problems.push(`${phase}: the field is ${String(Math.round(field))}px`)
    }
    for (const marks of document.querySelectorAll('.stage-marks')) {
      if (marks.scrollHeight > marks.clientHeight + 1) {
        problems.push(`${phase}: the tags take a second row`)
      }
    }
  }
  const progress = () => document.querySelector('.progress-full, .progress')?.textContent ?? ''

  if (mode === 'watch') {
    const press = (key: string) =>
      document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
    await settle()
    record('step 1')
    for (let k = 2; k < 400; k++) {
      const before = progress()
      press('ArrowRight')
      for (let wait = 0; wait < 50 && progress() === before; wait++) await sleep(10)
      if (progress() === before) break
      // Step 2: The idea folds away and the stage takes its height back (as in fitProbe.ts).
      if (k === 2) await settle()
      await frame()
      record(`step ${String(k)}`)
      // A sheet on the way: opened, then closed (sideways it opens beside the stage).
      if (k === 4) {
        button('.pills button', /^Numbers$/)?.click()
        await settle()
        record('the Numbers sheet')
        button('.sheet button', /^Close$/)?.click()
        await settle()
        record('the sheet closed')
      }
    }
  } else {
    button('.answer-bar button', /^Start$/)?.click()
    await settle()
    for (let k = 0, last = ''; k < 600; k++) {
      if (document.querySelector('.do-it-panel.is-done')) break
      const now = progress() + (document.querySelector('.do-it-panel')?.textContent ?? '')
      if (now === last) {
        await sleep(50)
        continue
      }
      last = now
      await frame()
      if (document.querySelector('.do-it-question')) {
        record(`${progress()}: the question`)
        button('.answer-bar button', /Help/)?.click()
        await settle()
        record(`${progress()}: the hint`)
        button('.hint-actions button', /^Show me/)?.click()
        await settle()
        last = ''
      } else {
        record(`${progress()}: played`)
      }
    }
    await settle()
    record('the end')
  }

  const first = logs[0] ?? 0
  const changed = logs.findIndex((log) => log !== first)
  if (changed >= 0) {
    problems.push(
      `the logs changed size: ${String(first)} px, then ${String(logs[changed])} px at "${phases[changed] ?? ''}"`,
    )
  }
  if (logs.length < 5) problems.push(`only ${String(logs.length)} steps were seen`)
  return { logs, fields, problems: [...new Set(problems)] }
}
