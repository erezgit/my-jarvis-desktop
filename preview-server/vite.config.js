import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import mdx from '@mdx-js/rollup'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'

export default defineConfig({
  plugins: [
    react(),
    mdx({
      remarkPlugins: [remarkGfm],
      rehypePlugins: [rehypeHighlight],
      providerImportSource: '@mdx-js/react'
    })
  ],
  server: {
    port: 5174,
    hmr: true,
    cors: true
  },
  optimizeDeps: {
    include: ['react', 'react-dom', '@mdx-js/react']
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
})