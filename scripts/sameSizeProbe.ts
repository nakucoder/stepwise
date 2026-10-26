/// <reference lib="dom" />

/**
 * Runs inside the page (sent as source text, so it must not use anything outside itself) on a
 * phone on its side with the pizza cart: the boxes keep one size through the flow from a phone
 * test (PR #102), whatever the numbers, the step or a sheet. It starts on the numbers in the
 * address, plays a few steps (Do it: Start, an answer, Help), opens the Numbers sheet, adds `add`
 * to the numbers and runs them, closes the sheet and plays on. The box size is the scene's
 * `data-box`. On every step the tags under the values stay in their own column (into at most
 * half the gap) and on one row.
 */
export async function sameSizeProbe(
  mode: 'watch' | 'do',
  add: number,
): Promise<{ boxes: number[]; problems: string[] }> {
  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
  const problems: string[] = []
  const boxes: number[] = []
  const phases: string[] = []
  for (let k = 0; k < 100 && !document.querySelector('.pizza-scene'); k++) await sleep(100)
  await document.fonts.ready
  const settle = async () => {
    await sleep(500)
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  }
  const button = (selector: string, label: RegExp) =>
    [...document.querySelectorAll<HTMLButtonElement>(selector)].find((b) =>
      label.test(b.textContent.trim()),
    )
  const record = (phase: string) => {
    boxes.push(Number(document.querySelector<HTMLElement>('.pizza-scene')?.dataset.box ?? 0))
    phases.push(phase)
    // The tags: in their own column (half the gap at most), on one row.
    const gap =
      parseFloat(
        getComputedStyle(document.querySelector('.stage-axis') ?? document.body).columnGap,
      ) || 0
    for (const slot of document.querySelectorAll('.stage-mark-slot')) {
      const r = slot.getBoundingClientRect()
      for (const tag of slot.querySelectorAll('.stage-pointer, .stage-role, .stage-index')) {
        const q = tag.getBoundingClientRect()
        if (q.width === 0) continue
        if (Math.max(r.left - q.left, q.right - r.right) > gap / 2 + 0.5) {
          problems.push(`${phase}: "${tag.textContent}" runs into the next column`)
        }
      }
      const marks = slot.querySelector('.stage-marks')
      if (marks && marks.scrollHeight > marks.clientHeight + 1) {
        problems.push(`${phase}: the tags take a second row`)
      }
    }
  }
  const closeSheet = async () => {
    button('.sheet button', /^(Close|Got it|Start|Back to the steps)/)?.click()
    await settle()
  }
  const play = async (phase: string) => {
    if (mode === 'watch') {
      for (let k = 0; k < 6; k++) {
        button('button', /^Step$/)?.click()
        await sleep(80)
        record(`${phase} step ${String(k + 1)}`)
      }
      return
    }
    button('.answer-bar button', /^Start$/)?.click()
    for (let k = 0; k < 50 && !document.querySelector('.do-it-question'); k++) await sleep(100)
    await settle()
    record(`${phase} question`)
    button('.answer-bar button', /^(Right side|Keep order)/)?.click()
    await settle()
    record(`${phase} an answer`)
    button('.answer-bar button', /^Help/)?.click()
    await settle()
    record(`${phase} Help`)
  }

  await settle()
  record('first open')
  await closeSheet()
  record('a sheet closed')
  await play('the numbers')
  button('.pills button', /^Numbers$/)?.click()
  await settle()
  record('the Numbers sheet')
  const field = document.querySelector<HTMLInputElement>('input[name=numbers]')
  if (!field) problems.push('no numbers field')
  else {
    // React reads the field's value through the prototype's setter, not the instance's.
    // eslint-disable-next-line @typescript-eslint/unbound-method -- called with the field as `this`
    const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
    setValue?.call(field, `${field.value} ${String(add)}`)
    field.dispatchEvent(new Event('input', { bubbles: true }))
    field.form?.requestSubmit()
    await settle()
    record(`${String(add)} added`)
  }
  await closeSheet()
  record('the sheet closed')
  await play('the new numbers')

  const first = boxes[0] ?? 0
  const changed = boxes.findIndex((b) => b !== first)
  if (changed >= 0) {
    problems.push(
      `the boxes changed size: ${String(first)} px, then ${String(boxes[changed])} px at "${phases[changed] ?? ''}"`,
    )
  }
  return { boxes, problems: [...new Set(problems)] }
}
