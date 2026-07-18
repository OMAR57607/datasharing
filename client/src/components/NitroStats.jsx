import { useEffect, useMemo, useRef } from 'react'
import { animate, reducedMotion } from '../lib/anim.js'
import { makeOf, vehicleOf } from '../lib/vehicles.js'

// Geometría del tacómetro (semicírculo superior).
const CX = 100
const CY = 100
const R = 80
const ARC_LEN = Math.PI * R // largo del semicírculo
const GAUGE_FILL = 0.82 // barrido "alto rendimiento" (decorativo)
const rad = (deg) => (deg * Math.PI) / 180
const pt = (deg) => [CX + R * Math.cos(rad(deg)), CY - R * Math.sin(rad(deg))]

// Ticks del 0 (izq, 180°) al máx (der, 0°).
const TICKS = Array.from({ length: 11 }, (_, i) => {
  const deg = 180 - i * 18
  const [ox, oy] = pt(deg)
  const inner = R - (i % 5 === 0 ? 14 : 8)
  const ix = CX + inner * Math.cos(rad(deg))
  const iy = CY - inner * Math.sin(rad(deg))
  return { ox, oy, ix, iy, major: i % 5 === 0 }
})

// Banda premium de estadísticas con tacómetro animado (anime.js) y números
// que cuentan hacia arriba, alimentada con datos reales del catálogo.
export default function NitroStats({ products = [] }) {
  const rootRef = useRef(null)
  const needleRef = useRef(null)
  const arcRef = useRef(null)

  const stats = useMemo(() => {
    const marcas = new Set(products.map((p) => makeOf(p)).filter(Boolean)).size
    const categorias = new Set(products.map((p) => p.category).filter(Boolean)).size
    let minY = Infinity
    let maxY = -Infinity
    for (const p of products) {
      const v = vehicleOf(p)
      if (v.yearFrom) minY = Math.min(minY, v.yearFrom)
      if (v.yearTo) maxY = Math.max(maxY, v.yearTo)
    }
    return {
      productos: products.length,
      marcas,
      categorias,
      yearFrom: Number.isFinite(minY) ? minY : null,
      yearTo: Number.isFinite(maxY) ? maxY : null,
    }
  }, [products])

  useEffect(() => {
    const root = rootRef.current
    if (!root || !products.length) return

    const numEls = [...root.querySelectorAll('[data-count]')]
    const setFinals = () => {
      numEls.forEach((el) => {
        el.textContent = Number(el.dataset.count).toLocaleString('es-MX')
      })
    }

    // Sin movimiento: mostramos los valores finales y el arco lleno.
    if (reducedMotion()) {
      setFinals()
      if (arcRef.current) arcRef.current.style.strokeDashoffset = String(ARC_LEN * (1 - GAUGE_FILL))
      if (needleRef.current)
        needleRef.current.setAttribute('transform', `rotate(${GAUGE_FILL * 180 - 90} ${CX} ${CY})`)
      return
    }

    let played = false
    const play = () => {
      if (played) return
      played = true

      // Aguja: barre desde la izquierda con un settle elástico.
      const needle = { a: -90 }
      animate(needle, {
        a: GAUGE_FILL * 180 - 90,
        duration: 1900,
        ease: 'outElastic(1, 0.6)',
        onUpdate: () =>
          needleRef.current?.setAttribute('transform', `rotate(${needle.a} ${CX} ${CY})`),
      })

      // Arco naranja→rojo que se llena.
      const arc = { o: ARC_LEN }
      animate(arc, {
        o: ARC_LEN * (1 - GAUGE_FILL),
        duration: 1600,
        ease: 'outExpo',
        onUpdate: () => {
          if (arcRef.current) arcRef.current.style.strokeDashoffset = String(arc.o)
        },
      })

      // Números que cuentan hacia arriba.
      numEls.forEach((el) => {
        const target = Number(el.dataset.count)
        const obj = { n: 0 }
        animate(obj, {
          n: target,
          duration: 1700,
          ease: 'outExpo',
          onUpdate: () => {
            el.textContent = Math.round(obj.n).toLocaleString('es-MX')
          },
        })
      })
    }

    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && play()),
      { threshold: 0.35 }
    )
    io.observe(root)
    return () => io.disconnect()
  }, [products, stats])

  if (!products.length) return null

  const arcPath = `M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`

  return (
    <section className="section-tight">
      <div className="container">
        <div className="nitro-stats" ref={rootRef}>
          <div className="nitro-gauge">
            <svg viewBox="0 0 200 120" role="img" aria-label={`${stats.productos} productos en catálogo`}>
              <defs>
                <linearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#ffb020" />
                  <stop offset="55%" stopColor="#ff5a00" />
                  <stop offset="100%" stopColor="#e2231a" />
                </linearGradient>
              </defs>
              {/* Pista de fondo */}
              <path d={arcPath} className="gauge-track" />
              {/* Arco de progreso (animado) */}
              <path
                d={arcPath}
                ref={arcRef}
                className="gauge-fill"
                style={{ strokeDasharray: ARC_LEN, strokeDashoffset: ARC_LEN }}
              />
              {/* Ticks */}
              {TICKS.map((t, i) => (
                <line
                  key={i}
                  x1={t.ox}
                  y1={t.oy}
                  x2={t.ix}
                  y2={t.iy}
                  className={t.major ? 'tick tick-major' : 'tick'}
                />
              ))}
              {/* Aguja */}
              <g ref={needleRef} transform={`rotate(-90 ${CX} ${CY})`}>
                <line x1={CX} y1={CY} x2={CX} y2={CY - R + 10} className="needle" />
              </g>
              <circle cx={CX} cy={CY} r="7" className="hub" />
            </svg>
            <div className="gauge-readout">
              <strong data-count={stats.productos}>0</strong>
              <span>productos en catálogo</span>
            </div>
          </div>

          <div className="nitro-tiles">
            <div className="nitro-tile">
              <strong data-count={stats.marcas}>0</strong>
              <span>marcas de vehículo</span>
            </div>
            <div className="nitro-tile">
              <strong data-count={stats.categorias}>0</strong>
              <span>categorías</span>
            </div>
            <div className="nitro-tile">
              {stats.yearFrom ? (
                <strong className="nitro-range">
                  {stats.yearFrom}<i>–</i>{stats.yearTo}
                </strong>
              ) : (
                <strong>—</strong>
              )}
              <span>años de cobertura</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
