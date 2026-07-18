import { useCallback, useRef } from 'react'

// Tilt 3D premium: la tarjeta se inclina siguiendo el cursor y expone un
// destello (glare) en la posición del mouse. Se desactiva en pantallas
// táctiles y si el usuario prefiere menos movimiento.
export function useTilt({ max = 9, scale = 1.03 } = {}) {
  const ref = useRef(null)
  const raf = useRef(0)

  const disabled = () =>
    typeof window === 'undefined' ||
    window.matchMedia?.('(hover: none)').matches ||
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  const onMouseMove = useCallback(
    (e) => {
      const el = ref.current
      if (!el || disabled()) return
      const r = el.getBoundingClientRect()
      const px = (e.clientX - r.left) / r.width
      const py = (e.clientY - r.top) / r.height
      cancelAnimationFrame(raf.current)
      raf.current = requestAnimationFrame(() => {
        const rx = (0.5 - py) * max * 2
        const ry = (px - 0.5) * max * 2
        el.style.transform = `perspective(900px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) scale(${scale})`
        el.style.setProperty('--gx', `${(px * 100).toFixed(1)}%`)
        el.style.setProperty('--gy', `${(py * 100).toFixed(1)}%`)
        el.style.setProperty('--glare', '1')
      })
    },
    [max, scale]
  )

  const onMouseLeave = useCallback(() => {
    const el = ref.current
    if (!el) return
    cancelAnimationFrame(raf.current)
    el.style.transform = ''
    el.style.setProperty('--glare', '0')
  }, [])

  return { ref, onMouseMove, onMouseLeave }
}
