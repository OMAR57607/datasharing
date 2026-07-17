import { useState } from 'react'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="app">
      <header className="hero">
        <h1>Mi App React</h1>
        <p className="subtitle">
          Proyecto base con React + Vite. Listo para construir lo que quieras.
        </p>
      </header>

      <main className="content">
        <div className="card">
          <button onClick={() => setCount((c) => c + 1)}>
            Contador: {count}
          </button>
          <p>
            Edita <code>src/App.jsx</code> y guarda para ver los cambios al
            instante.
          </p>
        </div>

        <section className="features">
          <div className="feature">
            <h3>⚡ Rápido</h3>
            <p>Vite ofrece recarga instantánea en desarrollo.</p>
          </div>
          <div className="feature">
            <h3>🧩 Componentes</h3>
            <p>Construye la interfaz con componentes de React reutilizables.</p>
          </div>
          <div className="feature">
            <h3>🚀 Desplegable</h3>
            <p>Ejecuta <code>npm run build</code> para generar la versión de producción.</p>
          </div>
        </section>
      </main>

      <footer className="footer">
        <p>Hecho con React + Vite</p>
      </footer>
    </div>
  )
}

export default App
