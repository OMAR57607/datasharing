import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // En dev, las funciones /api corren con `vercel dev` (puerto 3000).
      '/api': 'http://localhost:3000',
    },
  },
})
