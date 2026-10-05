/**
 * Scrolls `container` (only) so `element` is fully visible. Unlike element.scrollIntoView,
 * this never scrolls the page or other ancestors, so stepping doesn't make the page jump.
 * `topInset` is space covered at the top of the container, e.g. a sticky table header.
 */
export function keepInView(container: HTMLElement, element: HTMLElement, topInset = 0): void {
  const box = container.getBoundingClientRect()
  const target = element.getBoundingClientRect()
  const visibleTop = box.top + topInset
  if (target.top < visibleTop) {
    container.scrollTop -= visibleTop - target.top
  } else if (target.bottom > box.bottom) {
    container.scrollTop += target.bottom - box.bottom
  }
}
