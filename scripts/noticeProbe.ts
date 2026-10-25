/// <reference lib="dom" />

/**
 * Runs inside the page (sent as source text, so it must not use anything outside itself). On a
 * desktop or laptop screen where the page scrolls, Do it's Start moves to the answers below the
 * fold: with numbers the character can't carry, the stage's message and its button must still be
 * whole on screen whenever any of the bars are, after Start and with Help open.
 */
export async function noticeProbe(): Promise<{ scrolled: number; problems: string[] }> {
  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
  const problems: string[] = []
  for (let k = 0; k < 100 && !document.querySelector('.stage-view'); k++) await sleep(100)
  await document.fonts.ready

  const answer = (name: string) =>
    [...document.querySelectorAll<HTMLButtonElement>('.answer-bar button')].find((b) =>
      b.textContent.trim().startsWith(name),
    )
  /** Whether the whole box is inside the screen and hit there (nothing covers it). */
  const onScreen = (element: Element) => {
    const box = element.getBoundingClientRect()
    if (box.width === 0 || box.height === 0) return false
    if (box.top < -0.5 || box.left < -0.5) return false
    if (box.bottom > innerHeight + 0.5 || box.right > innerWidth + 0.5) return false
    const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2)
    return hit !== null && element.contains(hit)
  }
  const check = (when: string) => {
    const bars = [...document.querySelectorAll('.stage-bar')]
    const seen = bars.some((bar) => {
      const box = bar.getBoundingClientRect()
      return box.bottom > 0 && box.top < innerHeight
    })
    if (!seen) return
    const message = document.querySelector('.range-notice p')
    const button = document.querySelector('.range-notice button')
    if (!message || !button) problems.push(`${when}: the range notice is missing`)
    else {
      if (!onScreen(message)) problems.push(`${when}: the bars show, but not the message`)
      if (!onScreen(button)) problems.push(`${when}: the bars show, but not its button`)
    }
  }

  check('before Start')
  answer('Start')?.click()
  for (let k = 0; k < 100 && !document.querySelector('.do-it-question'); k++) await sleep(100)
  await sleep(300)
  check('after Start')
  answer('Help')?.click()
  await sleep(400)
  check('with Help open')
  return { scrolled: Math.round(scrollY), problems }
}
