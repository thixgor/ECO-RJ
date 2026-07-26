import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    allowedHosts: [
      'table-sage-century-adventures.trycloudflare.com',
      '.trycloudflare.com'
    ],
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  },
  build: {
    chunkSizeWarningLimit: 3000, // Zoom SDK é grande (~2.8MB), aumentar limite
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Zoom SDK - carregado dinamicamente na página Lesson
            if (id.includes('@zoom/meetingsdk') || id.includes('zoom')) {
              return 'vendor-zoom';
            }
            // PDF - usado apenas para exportar exercícios
            if (id.includes('jspdf') || id.includes('html2canvas')) {
              return 'vendor-pdf';
            }
            // Icons - Lucide React
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            // React core
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'vendor-react';
            }
            // UI libraries
            if (id.includes('framer-motion') || id.includes('react-hot-toast')) {
              return 'vendor-ui';
            }
            // Outros vendors
            return 'vendor';
          }
        }
      }
    }
  }
})
