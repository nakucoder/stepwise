/// <reference lib="dom" />

/**
 * Runs inside the page (sent as source text, so it must not use anything outside itself): heap
 * sort's tree, in Watch from step 2 to the end (step 1 shows The idea). `place` is where the tree
 * must be: over the bars ("stage", with no "The tree" button), or in its sheet ("sheet": the
 * button opens it at step 2 and the stage has no tree). At every step the tree is whole, every
 * number is at least 12px and inside its circle (and clear of the sheet's Close), the tree keeps
 * one height (nothing jumps), the bars are whole on screen and (with `barNumbers`) their numbers
 * sit inside their bars at 10px or more, the buttons around it are whole and 44px
 * tall, a phone's page doesn't scroll, and a desktop's left column fits. It returns the tree's height and the bars' least.
 */
export async function treeProbe(
  place: 'stage' | 'sheet',
  barNumbers = true,
): Promise<{ tree: number; bars: number; problems: string[] }> {
  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
  for (let k = 0; k < 100 && !document.querySelector('.stage-bars'); k++) await sleep(100)
  await document.fonts.ready

  const found = new Map<string, number>()
  let step = 0
  const problem = (text: string) => {
    if (!found.has(text)) found.set(text, step)
  }
  const rect = (element: Element) => element.getBoundingClientRect()
  const shown = (element: Element | null) =>
    element !== null && rect(element).width > 0 && rect(element).height > 0
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
    right = Math.min(right, innerWidth)
    bottom = Math.min(bottom, innerHeight)
    return right - left >= box.width - 1 && bottom - top >= box.height - 1
  }
  const phone = document.querySelector('.phone-grid') !== null
  const position = () =>
    (
      /Step (\d+) of (\d+)/.exec(
        (document.querySelector('.progress-full') ?? document.querySelector('.progress'))
          ?.textContent ?? '',
      ) ?? []
    )
      .slice(1)
      .map(Number)
  const press = (key: string) =>
    document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
  const settle = () =>
    new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))

  // Step 2: The idea folds away; on a phone on its side the tree's button opens its sheet.
  press('ArrowRight')
  await sleep(400)
  const button = document.querySelector<HTMLButtonElement>('.pill-tree')
  if (place === 'sheet') {
    if (!shown(button)) problem('the "The tree" button is missing')
    button?.click()
    await sleep(300)
  } else if (shown(button)) {
    problem('the "The tree" button shows, but the tree is over the bars')
  }

  const heights = new Set<number>()
  let bars = Infinity
  for (let k = 0, last = 0; k < 1000; k++) {
    for (let wait = 0; wait < 50 && (position()[0] ?? 0) === last; wait++) await sleep(10)
    await settle()
    await sleep(50)
    const [at = 0, of = 0] = position()
    last = at
    step = at

    const onStage = document.querySelector('.stage .heap-tree')
    const inSheet = document.querySelector('.sheet .heap-tree')
    const tree = place === 'stage' ? onStage : inSheet
    if (!shown(tree))
      problem(`the tree is not ${place === 'stage' ? 'over the bars' : 'in its sheet'}`)
    if (place === 'sheet' && shown(onStage)) problem('the stage shows a tree beside its sheet')
    if (tree && shown(tree)) {
      if (!whole(tree)) problem('the tree is cut off')
      heights.add(Math.round(rect(tree).height))
      for (const node of tree.querySelectorAll('.heap-tree-node')) {
        const text = node.querySelector('text')
        const circle = node.querySelector('circle')
        if (!text || !circle) continue
        const number = text.textContent
        const t = rect(text)
        const c = rect(circle)
        const size = parseFloat(getComputedStyle(text).fontSize) * (text.getScreenCTM()?.a ?? 1)
        if (size < 12) problem(`the tree's ${number} is ${size.toFixed(1)}px`)
        // The glyphs (not the line box) inside the circle, across; up and down, their middle.
        if (t.width > c.width - 2 || Math.abs(t.top + t.bottom - c.top - c.bottom) / 2 > 2)
          problem(`the tree's ${number} spills out of its circle`)
        if (!whole(circle)) problem(`the tree's ${number} is cut off`)
        const close = document.querySelector('.sheet-close')
        if (place === 'sheet' && close) {
          const x = rect(close)
          if (c.left < x.right && c.right > x.left && c.top < x.bottom && c.bottom > x.top)
            problem(`the tree's ${number} is under Close`)
        }
      }
    }

    bars = Math.min(
      bars,
      Math.round(rect(document.querySelector('.stage-bars') ?? document.body).height),
    )
    const field = document.querySelector('.stage-bars')
    if (!field || !whole(field)) problem('the bars are not whole on screen')
    for (const label of barNumbers ? document.querySelectorAll('.stage-bar-label') : []) {
      const bar = label.closest('.stage-bar') ?? label.parentElement
      if (!bar) continue
      const l = rect(label)
      const b = rect(bar)
      if (
        l.top < b.top - 0.5 ||
        l.bottom > b.bottom + 0.5 ||
        l.left < b.left - 0.5 ||
        l.right > b.right + 0.5
      )
        problem(`${label.textContent} spills out of its bar`)
      const size = parseFloat(getComputedStyle(label).fontSize)
      if (size < 10) problem(`${label.textContent} is ${size.toFixed(1)}px`)
    }

    for (const control of document.querySelectorAll(
      '.pills button, .sheet-close, .controls button',
    )) {
      // A button the layout leaves out (the tree's, where the tree is over the bars) isn't checked.
      if (getComputedStyle(control).display === 'none') continue
      const name = control.textContent.trim()
      if (!whole(control)) problem(`"${name}" is cut off`)
      if (rect(control).height < 43.5)
        problem(`"${name}" is ${String(Math.round(rect(control).height))}px tall`)
    }
    if (phone && (document.scrollingElement?.scrollHeight ?? 0) > innerHeight + 1)
      problem('the page scrolls')
    // A desktop's left column: the stage and the code (or the color key) fit it, never scroll.
    const left = document.querySelector('.workspace-left')
    if (left && left.scrollHeight > left.clientHeight + 1)
      problem("the stage's column scrolls (its parts don't fit)")

    if (at >= of) break
    press('ArrowRight')
  }
  if (heights.size > 1) problem(`the tree changes height: ${[...heights].join(', ')}px`)

  const problems = [...found].map(([text, at]) => `step ${String(at)}: ${text}`)
  return { tree: Math.max(0, ...heights), bars: Number.isFinite(bars) ? bars : 0, problems }
}
