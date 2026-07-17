import { animate, stagger } from 'animejs'

export const reducedMotion = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// Revela un conjunto de elementos con un stagger (entrada desde abajo).
export function revealStagger(els, opts = {}) {
  if (!els || !els.length) return
  if (reducedMotion()) {
    els.forEach((e) => (e.style.opacity = '1'))
    return
  }
  animate(els, {
    y: [26, 0],
    opacity: [0, 1],
    duration: 640,
    delay: stagger(70),
    ease: 'outCubic',
    ...opts,
  })
}

// Observa un contenedor y revela sus hijos [.reveal] al entrar en viewport.
export function observeReveal(container, selector = '.reveal') {
  if (!container) return () => {}
  const els = [...container.querySelectorAll(selector)]
  if (!els.length) return () => {}
  if (reducedMotion()) {
    els.forEach((e) => (e.style.opacity = '1'))
    return () => {}
  }
  els.forEach((e) => (e.style.opacity = '0'))
  const io = new IntersectionObserver(
    (entries, obs) => {
      const shown = entries.filter((e) => e.isIntersecting).map((e) => e.target)
      if (shown.length) {
        revealStagger(shown)
        shown.forEach((t) => obs.unobserve(t))
      }
    },
    { threshold: 0.12 }
  )
  els.forEach((e) => io.observe(e))
  return () => io.disconnect()
}

export { animate, stagger }
