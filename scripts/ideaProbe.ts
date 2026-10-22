/// <reference lib="dom" />

/**
 * Runs inside the page (sent as source text, so it must not use anything outside itself): opens
 * "The idea" (it is open at step 1 in Watch; Do it opens it from the band) and reports whether
 * it scrolls. Its answers must fit beside the bars (CLAUDE.md, rule 4).
 */
export async function ideaProbe(
  mode: 'watch' | 'do' = 'watch',
): Promise<{ need: number; room: number; problems: string[] }> {
  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
  for (let k = 0; k < 100 && !document.querySelector('.stage'); k++) await sleep(50)
  await document.fonts.ready
  if (mode === 'do') {
    document.querySelector<HTMLButtonElement>('.idea-open')?.click()
    for (let k = 0; k < 50 && !document.querySelector('section.idea'); k++) await sleep(50)
  }
  await sleep(200)
  const idea = document.querySelector<HTMLElement>('section.idea')
  if (!idea) return { need: 0, room: 0, problems: ['"The idea" did not open'] }
  const room = idea.clientHeight
  const scrolls = idea.scrollHeight > room + 1
  // The panel stretches to its room when the content fits, so measure the content at its own
  // height, then put the panel back.
  const style = idea.getAttribute('style')
  Object.assign(idea.style, { height: 'auto', minHeight: '0', maxHeight: 'none', flex: 'none' })
  const need = idea.offsetHeight
  if (style === null) idea.removeAttribute('style')
  else idea.setAttribute('style', style)
  return {
    need,
    room,
    problems: scrolls
      ? [`"The idea" scrolls: ${String(idea.scrollHeight)}px of content in ${String(room)}px`]
      : [],
  }
}
