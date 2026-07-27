// Esqueletos de carga: ocupan el mismo lugar que las tarjetas reales, así la
// grilla no salta cuando llegan los productos.
export function ProductGridSkeleton({ count = 8 }) {
  return (
    <div className="product-grid" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div className="sk-card" key={i}>
          <div className="sk sk-thumb" />
          <div className="sk-body">
            <div className="sk sk-line sm" />
            <div className="sk sk-line lg" />
            <div className="sk sk-line" />
          </div>
        </div>
      ))}
    </div>
  )
}

export default ProductGridSkeleton
