// Paginación reutilizable: ‹ Anterior · números (con elipsis) · Siguiente ›
export default function Pagination({ page, pageCount, onPage }) {
  if (pageCount <= 1) return null

  const nums = []
  const wanted = new Set([1, pageCount, page, page - 1, page + 1])
  let last = 0
  for (let i = 1; i <= pageCount; i++) {
    if (!wanted.has(i)) continue
    if (i - last > 1) nums.push('…')
    nums.push(i)
    last = i
  }

  return (
    <nav className="pagination" aria-label="Paginación">
      <button
        className="page-btn"
        disabled={page === 1}
        onClick={() => onPage(page - 1)}
      >
        ‹ Anterior
      </button>
      {nums.map((n, i) =>
        n === '…' ? (
          <span key={`e${i}`} className="page-ellipsis">
            …
          </span>
        ) : (
          <button
            key={n}
            className={`page-btn ${n === page ? 'active' : ''}`}
            onClick={() => onPage(n)}
          >
            {n}
          </button>
        )
      )}
      <button
        className="page-btn"
        disabled={page === pageCount}
        onClick={() => onPage(page + 1)}
      >
        Siguiente ›
      </button>
    </nav>
  )
}
