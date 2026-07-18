import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './theme.css'
import './app.css'
import { AuthProvider } from './context/AuthContext.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
import { QuoteProvider } from './context/QuoteContext.jsx'
import PublicLayout from './components/PublicLayout.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import Home from './pages/Home.jsx'
import Catalog from './pages/Catalog.jsx'
import ProductDetail from './pages/ProductDetail.jsx'
import Login from './pages/admin/Login.jsx'
import AdminLayout from './pages/admin/AdminLayout.jsx'
import Dashboard from './pages/admin/Dashboard.jsx'
import ProductsAdmin from './pages/admin/ProductsAdmin.jsx'
import ProductEdit from './pages/admin/ProductEdit.jsx'
import ImportPdf from './pages/admin/ImportPdf.jsx'
import BulkPrices from './pages/admin/BulkPrices.jsx'
import AssignPhotos from './pages/admin/AssignPhotos.jsx'
import QuotesAdmin from './pages/admin/QuotesAdmin.jsx'
import QuoteBuilder from './pages/admin/QuoteBuilder.jsx'
import Quote from './pages/Quote.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
        <QuoteProvider>
        <Routes>
          {/* Tienda pública */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/catalogo" element={<Catalog />} />
            <Route path="/producto/:id" element={<ProductDetail />} />
            <Route path="/cotizacion" element={<Quote />} />
          </Route>

          {/* Acceso admin */}
          <Route path="/admin/login" element={<Login />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="productos" element={<ProductsAdmin />} />
            <Route path="productos/nuevo" element={<ProductEdit />} />
            <Route path="productos/:id" element={<ProductEdit />} />
            <Route path="importar" element={<ImportPdf />} />
            <Route path="fotos" element={<AssignPhotos />} />
            <Route path="precios" element={<BulkPrices />} />
            <Route path="cotizador" element={<QuoteBuilder />} />
            <Route path="cotizaciones" element={<QuotesAdmin />} />
          </Route>
          </Routes>
        </QuoteProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>
)
