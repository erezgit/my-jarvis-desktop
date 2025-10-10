import { resolve } from 'path'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// Web-only Vite configuration (not Electron)
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
  define: {
    'import.meta.env.VITE_DEPLOYMENT_MODE': JSON.stringify('web'),
  },
  plugins: [tailwindcss(), react()],
})
