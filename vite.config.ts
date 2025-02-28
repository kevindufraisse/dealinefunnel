import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react']
  },
  build: {
    rollupOptions: {
      input: {
        main: './index.html',
        countdown: './public/countdown.js'
      },
      output: {
        entryFileNames: (chunkInfo) => {
          return chunkInfo.name === 'countdown' ? 'countdown.js' : '[name]-[hash].js';
        }
      }
    }
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8888/.netlify/functions',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
});