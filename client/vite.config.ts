import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 9000,
    allowedHosts: [
      'localhost',
      'localhost:5000',
      'localhost:9000',
      '127.0.0.1',
      '0.0.0.0',
      '0.0.0.0',
      'fin.tranphuc.site',
      'fin-api.tranphuc.site'
    ],
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          utils: ['axios', 'lucide-react', 'clsx', 'tailwind-merge', 'date-fns'],
          dnd: ['@hello-pangea/dnd']
        }
      }
    }
  }

})
