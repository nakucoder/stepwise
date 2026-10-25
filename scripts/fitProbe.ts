/// <reference lib="dom" />

/**
 * Runs inside the page (sent as source text, so it must not use anything outside itself) and
 * reports what doesn't fit. In Do it it starts, opens the hint and checks once; in Watch it steps
 * through the whole run from step 2 (step 1 shows The idea beside a strip of the bars) and checks
 * every step, so a step whose words or numbers don't fit can't hide.
 *
 * Every control is fully on screen through every clipping box, at least 44px tall, with no word
 * broken across lines; the question and the hint (Watch: the explanation) are whole (with the
 * pizza cart the hint's words may scroll, a line at least in view); every number sits inside its
 * bar (or its duck's water, or the pizza cart's dolly) and is at least 10px, and every
 * spaceship's digit is whole and at least 13px; quick sort's line under its range brackets is
 * never cut short; Engineer's tap targets are at least 44px tall; the page doesn't scroll.
 */
export async function fitProbe(
  mode: 'watch' | 'do' = 'do',
  pivotPicker = false,
): Promise<{ stage: number; problems: string[] }> {
  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
  const problems: string[] = []
  for (let k = 0; k < 100 && !document.querySelector('.phone-grid'); k++) await sleep(100)
  await document.fonts.ready

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

  /** Every control matching `selector`: whole, at least 44px tall, no word broken across lines. */
  const checkControls = (selector: string) => {
    for (const control of document.querySelectorAll(selector)) {
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
  }

  /** Everything that must fit, on the screen as it is now. */
  const check = () => {
    if (mode === 'do' && !document.querySelector('.hint-box'))
      problems.push('the hint did not open')

    checkControls(
      '.answer-bar button, .controls button, .mode-switch button, .hint-actions button, .pills button, .app-header button',
    )

    // With the pizza cart, the strip keeps one height through Do it so the stage never changes
    // (its boxes keep one size): the hint's words may scroll there, at least a line in view.
    const cart = document.querySelector('.is-pizza-cart') !== null
    for (const selector of mode === 'do' ? ['.do-it-question', '.hint-rungs'] : ['.explain-text']) {
      const element = document.querySelector(selector)
      const scrolls = cart && selector === '.hint-rungs'
      if (!element || !whole(element)) problems.push(`${selector} is cut off`)
      else if (scrolls && element.clientHeight < parseFloat(getComputedStyle(element).lineHeight))
        problems.push(`${selector} shows less than a line`)
      else if (!scrolls && element.scrollHeight > element.clientHeight + 3)
        problems.push(`${selector} scrolls`)
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

    // The pizza cart's digits on their dollies: at least 10px, inside the dolly, and whole.
    for (const digit of document.querySelectorAll('.pizza-digit')) {
      const number = digit.textContent
      const dolly = digit.closest('.pizza-dolly')
      const d = rect(digit)
      const b = dolly ? rect(dolly) : d
      if (
        d.left < b.left - 0.5 ||
        d.right > b.right + 0.5 ||
        d.top < b.top - 0.5 ||
        d.bottom > b.bottom + 0.5
      ) {
        problems.push(`${number} spills out of its dolly`)
      }
      const size = parseFloat(getComputedStyle(digit).fontSize)
      if (size < 10) problems.push(`${number} is ${size.toFixed(1)}px`)
      if (!whole(digit)) problems.push(`${number} is cut off`)
    }

    // Quick sort's line under its range brackets (what waits its turn): never cut short.
    const note = document.querySelector('.stage-part-note')
    if (note && note.scrollWidth > note.clientWidth + 1) {
      problems.push(`"${note.textContent}" is cut short`)
    }

    for (const pick of document.querySelectorAll('.stage-pick')) {
      if (rect(pick).height < 44)
        problems.push(`a tap target is ${String(Math.round(rect(pick).height))}px tall`)
    }
    if ((document.scrollingElement?.scrollHeight ?? 0) > height + 1)
      problems.push('the page scrolls')
  }

  // Quick sort's pivot rule: on a phone it is chosen in the Numbers sheet. Open it, check the
  // choices, and close it again before the run.
  if (pivotPicker) {
    const pill = [...document.querySelectorAll<HTMLButtonElement>('.pills button')].find(
      (b) => b.textContent.trim() === 'Numbers',
    )
    pill?.click()
    for (let k = 0; k < 50 && !document.querySelector('.sheet .pivot-picker'); k++) await sleep(50)
    await sleep(200)
    // The sheet scrolls inside itself, never the page: each choice, scrolled into view, must be
    // whole and tall enough, with no word broken.
    const choices = [...document.querySelectorAll('.sheet .pivot-picker button')]
    if (choices.length === 0) problems.push('the pivot rule is not in the Numbers sheet')
    for (const [k, choice] of choices.entries()) {
      choice.scrollIntoView({ block: 'nearest' })
      await sleep(50)
      checkControls(`.sheet .pivot-picker button:nth-child(${String(k + 1)})`)
    }
    document.querySelector<HTMLButtonElement>('.sheet-close')?.click()
    await sleep(300)
  }

  const answer = (name: string) =>
    [...document.querySelectorAll<HTMLButtonElement>('.answer-bar button')].find((b) =>
      b.textContent.trim().startsWith(name),
    )
  if (mode === 'do') {
    answer('Start')?.click()
    for (let k = 0; k < 100 && !document.querySelector('.do-it-question'); k++) await sleep(100)
    answer('Help')?.click()
    await sleep(400)
    check()
  } else {
    // Each problem once, with the first step it was seen at.
    const found = new Map<string, number>()
    const position = () =>
      (
        /Step (\d+) of (\d+)/.exec(document.querySelector('.progress-full')?.textContent ?? '') ??
        []
      )
        .slice(1)
        .map(Number)
    const press = (key: string) =>
      document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
    const settle = () =>
      new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    // Step 2: The idea folds away and the bars take the stage back.
    press('ArrowRight')
    await sleep(400)
    for (let k = 0, last = 0; k < 1000; k++) {
      // The new step is drawn (its number shows), then laid out.
      for (let wait = 0; wait < 50 && (position()[0] ?? 0) === last; wait++) await sleep(10)
      await settle()
      await sleep(50)
      const [at = 0, of = 0] = position()
      last = at
      problems.length = 0
      check()
      for (const problem of problems) if (!found.has(problem)) found.set(problem, at)
      if (at >= of) break
      press('ArrowRight')
    }
    problems.length = 0
    for (const [problem, at] of found) problems.push(`step ${String(at)}: ${problem}`)
  }

  const stage = document.querySelector('.phone-grid .stage')
  return { stage: stage ? Math.round(rect(stage).height) : 0, problems }
}
