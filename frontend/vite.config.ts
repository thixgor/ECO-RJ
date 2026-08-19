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
          if (!id.includes('node_modules')) return;

          // O nome do pacote é extraído do caminho em vez de testado com
          // `id.includes(...)`. A verificação antiga por substring classificava
          // errado: `react-hot-toast` casava com `id.includes('react')` e caía em
          // `vendor-react` antes de chegar à regra de UI, e qualquer caminho que
          // por acaso contivesse "zoom" ia parar no chunk do SDK do Zoom.
          const match = /node_modules\/(?:(@[^/]+)\/)?([^/]+)/.exec(id.replace(/\\/g, '/'));
          if (!match) return 'vendor';
          const pacote = match[1] ? `${match[1]}/${match[2]}` : match[2];

          // Zoom SDK (~2,8 MB) — carregado sob demanda na página da aula ao vivo
          if (pacote === '@zoom/meetingsdk') return 'vendor-zoom';

          // Geração de PDF — só usada em certificados e exportações
          if (['jspdf', 'jspdf-autotable', 'html2canvas', 'qrcode'].includes(pacote)) {
            return 'vendor-pdf';
          }

          if (pacote === 'lucide-react') return 'vendor-icons';

          // Núcleo do React: react, react-dom, o runtime JSX e o `scheduler`
          // (dependência interna do react-dom) precisam ficar no MESMO chunk.
          if (['react', 'react-dom', 'react-router', 'react-router-dom', 'scheduler'].includes(pacote)) {
            return 'vendor-react';
          }

          if (pacote === 'react-hot-toast') return 'vendor-ui';

          return 'vendor';
        }
      }
    }
  }
})
