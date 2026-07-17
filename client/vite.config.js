import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Redirige las llamadas /api al backend Express en desarrollo.
      '/api': 'http://localhost:4000',
    },
  },
})
