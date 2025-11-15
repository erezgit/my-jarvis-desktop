import { resolve } from 'path'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { copyFileSync } from 'fs'

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
      external: [],
    },
  },
  resolve: {
    alias: {
      '@/app': resolve(__dirname, 'app'),
      '@/lib': resolve(__dirname, 'lib'),
      '@/resources': resolve(__dirname, 'resources'),
      'pdfjs-dist': 'pdfjs-dist',
    },
  },
  optimizeDeps: {
    include: ['pdfjs-dist'],
  },
  define: {
    'import.meta.env.VITE_DEPLOYMENT_MODE': JSON.stringify('web'),
  },
  plugins: [
    tailwindcss(),
    react(),
    // Copy favicon to output directory
    {
      name: 'copy-favicon',
      writeBundle() {
        try {
          copyFileSync(
            resolve(__dirname, 'public/favicon.ico'),
            resolve(__dirname, 'out/renderer/favicon.ico')
          );
          console.log('✅ Favicon copied to build output');
        } catch (error) {
          console.warn('⚠️ Could not copy favicon:', error);
        }
      }
    }
  ],
})
