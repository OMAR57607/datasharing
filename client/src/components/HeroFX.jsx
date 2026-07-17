import { useEffect, useRef } from 'react'
import { animate, stagger, reducedMotion } from '../lib/anim.js'

// Efectos temáticos del hero: estelas de velocidad (naranja/azul, como el
// logo) y brasas flotantes. Todo con anime.js, y desactivado si el usuario
// prefiere menos movimiento.
export default function HeroFX() {
  const ref = useRef(null)

  useEffect(() => {
    const root = ref.current
    if (!root || reducedMotion()) return

    const streaks = [...root.querySelectorAll('.streak')]
    const embers = [...root.querySelectorAll('.ember')]

    const a1 = animate(streaks, {
      x: ['-24vw', '120vw'],
      duration: () => 1300 + Math.random() * 1400,
      delay: stagger(420, { start: 200 }),
      ease: 'inOutSine',
      loop: true,
    })

    const a2 = animate(embers, {
      y: ['12vh', '-72vh'],
      x: () => (Math.random() * 40 - 20) + 'px',
      opacity: [0, 0.9, 0],
      scale: [0.6, 1.1],
      duration: () => 4200 + Math.random() * 3200,
      delay: stagger(600),
      ease: 'outSine',
      loop: true,
    })

    return () => {
      a1.pause()
      a2.pause()
    }
  }, [])

  return (
    <div className="hero-fx" ref={ref} aria-hidden="true">
      {Array.from({ length: 7 }).map((_, i) => (
        <span
          key={`s${i}`}
          className={`streak ${i % 2 ? 'streak-blue' : 'streak-orange'}`}
          style={{ top: `${6 + i * 12}%`, width: `${140 + (i % 3) * 80}px` }}
        />
      ))}
      {Array.from({ length: 14 }).map((_, i) => (
        <span
          key={`e${i}`}
          className="ember"
          style={{ left: `${5 + i * 6.5}%` }}
        />
      ))}
    </div>
  )
}
