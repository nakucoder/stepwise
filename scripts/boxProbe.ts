/// <reference lib="dom" />

/**
 * Runs inside the page (sent as source text, so it must not use anything outside itself) on a
 * phone with the pizza cart: its boxes keep one size through a Do it run (the question, a wrong
 * answer, Help, and on to the next question), Do it's answer bar and the hint's buttons stay
 * whole on screen, and in Watch the strip over an open sheet (The idea, Numbers) keeps boxes of
 * at least `minBox` px. The box size is the scene's `data-box`.
 */
export async function boxProbe(
  mode: 'watch' | 'do',
  wrong: string,
  minBox: number,
): Promise<{ boxes: number[]; problems: string[] }> {
  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
  const problems: string[] = []
  const boxes: number[] = []
  for (let k = 0; k < 100 && !document.querySelector('.phone-grid'); k++) await sleep(100)
  await document.fonts.ready
  const box = () => Number(document.querySelector<HTMLElement>('.pizza-scene')?.dataset.box ?? 0)
  const settle = async () => {
    await sleep(600)
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  }
  /** Whether an element is wholly on the screen. */
  const onScreen = (element: Element | null) => {
    if (!element) return false
    const r = element.getBoundingClientRect()
    return r.height > 0 && r.top >= -0.5 && r.bottom <= innerHeight + 0.5
  }
  const click = (selector: string, label: string) => {
    const button = [...document.querySelectorAll<HTMLButtonElement>(selector)].find((b) =>
      b.textContent.trim().startsWith(label),
    )
    button?.click()
    return button !== undefined
  }

  if (mode === 'watch') {
    // Step 1 opens The idea: on a phone, upright, the stage is the strip over the sheet.
    await settle()
    boxes.push(box())
    click('.pills button', 'The idea')
    await settle()
    click('.pills button', 'Numbers')
    await settle()
    boxes.push(box())
    const [idea = 0, numbers = 0] = boxes
    if (idea < minBox) problems.push(`with The idea open the boxes are ${String(idea)}px`)
    if (numbers < minBox) problems.push(`with Numbers open the boxes are ${String(numbers)}px`)
    return { boxes, problems }
  }

  if (!click('.answer-bar button', 'Start')) problems.push('no Start')
  for (let k = 0; k < 50 && !document.querySelector('.do-it-question'); k++) await sleep(100)
  await settle()
  const steps: [string, () => boolean][] = [
    ['the question', () => true],
    ['a wrong answer', () => click('.answer-bar button', wrong)],
    ['Help', () => click('.answer-bar button', 'Help')],
    ['Show me', () => click('.hint-actions button', 'Show me')],
  ]
  for (const [name, act] of steps) {
    if (!act()) problems.push(`no button for ${name}`)
    await settle()
    if (name === 'Show me') {
      for (let k = 0; k < 60 && !document.querySelector('.do-it-question'); k++) await sleep(100)
      await settle()
    }
    boxes.push(box())
    for (const button of document.querySelectorAll('.answer-bar button')) {
      if (!onScreen(button))
        problems.push(`after ${name}, "${button.textContent.trim()}" is off screen`)
    }
    for (const button of document.querySelectorAll('.hint-actions button')) {
      const r = button.getBoundingClientRect()
      const strip = button.closest('.do-it-panel')?.getBoundingClientRect()
      if (
        !onScreen(button) ||
        (strip && (r.top < strip.top - 0.5 || r.bottom > strip.bottom + 0.5))
      )
        problems.push(`after ${name}, "${button.textContent.trim()}" is cut off`)
    }
  }
  if (new Set(boxes).size > 1) {
    problems.push(`the boxes change size: ${boxes.map(String).join(' → ')} px`)
  }
  if ((document.scrollingElement?.scrollHeight ?? 0) > innerHeight + 1)
    problems.push('the page scrolls')
  return { boxes, problems }
}
