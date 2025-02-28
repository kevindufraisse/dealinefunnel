import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react']
  },
  build: {
    assetsInlineLimit: 4096,
    sourcemap: true,
    manifest: true,
    target: 'es2015',
    minify: 'terser',
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html')
      },
      output: {
        entryFileNames: 'assets/js/[name].[hash].js',
        chunkFileNames: 'assets/js/[name].[hash].js',
        assetFileNames: (assetInfo) => {
          const name = assetInfo?.name ?? '';
          if (name.endsWith('.css')) {
            return 'assets/css/[name].[hash][extname]';
          }
          if (name.match(/\.(png|jpe?g|gif|svg|ico|webp)$/)) {
            return 'assets/images/[name].[hash][extname]';
          }
          if (name.match(/\.(woff2?|eot|ttf|otf)$/)) {
            return 'assets/fonts/[name].[hash][extname]';
          }
          return 'assets/[name].[hash][extname]';
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