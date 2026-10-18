/// <reference lib="dom" />

/**
 * Runs inside the page (sent as source text, so it must not use anything outside itself): starts
 * Do it, opens the hint, and reports what doesn't fit. Every control is fully on screen through
 * every clipping box, at least 44px tall, with no word broken across lines; the question and the
 * hint are whole; every number sits inside its bar (or its duck's water) and is at least 10px,
 * and every spaceship's digit is whole and at least 13px; Engineer's tap targets are at least
 * 44px tall; the page doesn't scroll.
 */
export async function fitProbe(): Promise<{ stage: number; problems: string[] }> {
  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
  const problems: string[] = []
  for (let k = 0; k < 100 && !document.querySelector('.phone-grid'); k++) await sleep(100)
  await document.fonts.ready
  const answer = (name: string) =>
    [...document.querySelectorAll<HTMLButtonElement>('.answer-bar button')].find((b) =>
      b.textContent.trim().startsWith(name),
    )
  answer('Start')?.click()
  for (let k = 0; k < 100 && !document.querySelector('.do-it-question'); k++) await sleep(100)
  answer('Help')?.click()
  await sleep(400)

  const rect = (element: Element) => element.getBoundingClientRect()
  const width = innerWidth
  const height = innerHeight
  /** Whether the whole box can be seen: inside the screen and every clipping ancestor. */
  const whole = (element: Element) => {
    const box = rect(element)
    if (box.width === 0 || box.height === 0) return false
    let [left, top, right, bottom] = [box.left, box.top, box.right, box.bottom]
    for (let parent = element.parentElement; parent; parent = parent.parentElement) {
      const style = getComputedStyle(parent)
      if (/hidden|auto|scroll|clip/.test(style.overflowX + style.overflowY)) {
        const clip = rect(parent)
        left = Math.max(left, clip.left)
        top = Math.max(top, clip.top)
        right = Math.min(right, clip.right)
        bottom = Math.min(bottom, clip.bottom)
      }
    }
    left = Math.max(left, 0)
    top = Math.max(top, 0)
    right = Math.min(right, width)
    bottom = Math.min(bottom, height)
    return right - left >= box.width - 1 && bottom - top >= box.height - 1
  }

  if (!document.querySelector('.hint-box')) problems.push('the hint did not open')

  const controls = document.querySelectorAll(
    '.answer-bar button, .mode-switch button, .hint-actions button, .pills button, .app-header button',
  )
  for (const control of controls) {
    const name = control.textContent.trim() || (control.getAttribute('aria-label') ?? '')
    if (!whole(control)) problems.push(`"${name}" is cut off`)
    if (rect(control).height < 43.5) {
      problems.push(`"${name}" is ${String(Math.round(rect(control).height))}px tall`)
    }
    const walker = document.createTreeWalker(control, NodeFilter.SHOW_TEXT)
    for (let text = walker.nextNode(); text; text = walker.nextNode()) {
      if (text.parentElement?.closest('.visually-hidden, .progress-full')) continue
      for (const word of (text.textContent ?? '').matchAll(/\S+/g)) {
        const range = document.createRange()
        range.setStart(text, word.index)
        range.setEnd(text, word.index + word[0].length)
        const lines = new Set(
          [...range.getClientRects()].filter((r) => r.width > 0).map((r) => Math.round(r.top)),
        )
        if (lines.size > 1) problems.push(`"${word[0]}" breaks across lines in "${name}"`)
      }
    }
  }

  for (const selector of ['.do-it-question', '.hint-rungs']) {
    const element = document.querySelector(selector)
    if (!element || !whole(element)) problems.push(`${selector} is cut off`)
    else if (element.scrollHeight > element.clientHeight + 3) problems.push(`${selector} scrolls`)
  }
  const strip = document.querySelector('.phone-grid .do-it-panel')
  if (strip && strip.scrollHeight > strip.clientHeight + 1)
    problems.push('the question strip scrolls')

  for (const label of document.querySelectorAll('.stage-bar-label')) {
    const bar = label.closest('.stage-bar, .duck-column') ?? label.parentElement
    if (!bar) continue
    const l = rect(label)
    const b = rect(bar)
    const number = label.textContent
    if (
      l.top < b.top - 0.5 ||
      l.bottom > b.bottom + 0.5 ||
      l.left < b.left - 0.5 ||
      l.right > b.right + 0.5
    ) {
      problems.push(`${number} spills out of its bar`)
    }
    const size = parseFloat(getComputedStyle(label).fontSize)
    if (size < 10) problems.push(`${number} is ${size.toFixed(1)}px`)
    if (!whole(label)) problems.push(`${number} is cut off`)
  }

  // A character's own numbers (the spaceships' digits on their plates, where the digits do the
  // comparing on a short stage): at least 13px, and whole.
  for (const digit of document.querySelectorAll('.space-digit')) {
    const number = digit.textContent
    const size = parseFloat(getComputedStyle(digit).fontSize)
    if (size < 13) problems.push(`${number} is ${size.toFixed(1)}px`)
    if (!whole(digit)) problems.push(`${number} is cut off`)
  }

  for (const pick of document.querySelectorAll('.stage-pick')) {
    if (rect(pick).height < 44)
      problems.push(`a tap target is ${String(Math.round(rect(pick).height))}px tall`)
  }
  if ((document.scrollingElement?.scrollHeight ?? 0) > height + 1) problems.push('the page scrolls')

  const stage = document.querySelector('.phone-grid .stage')
  return { stage: stage ? Math.round(rect(stage).height) : 0, problems }
}
