import { resolve } from 'path'
import react from '@vitejs/plugin-react-swc'
import { defineConfig } from 'vite'

// Web-only Vite configuration (not Electron)
// Note: Removed @tailwindcss/vite to avoid ESM import issues in Docker build
// Tailwind is still processed via PostCSS in the main build
export default defineConfig({
  root: './app',
  build: {
    outDir: '../out/renderer',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'app/index.html'),
      },
    },
  },
  resolve: {
    alias: {
      '@/app': resolve(__dirname, 'app'),
      '@/lib': resolve(__dirname, 'lib'),
      '@/resources': resolve(__dirname, 'resources'),
    },
  },
  plugins: [react()],
})
