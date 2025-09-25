import { defineConfig } from 'vite'

export default defineConfig({
  root: '.', // project root
  base: '/major-studio-1/', // base public path when served in production
  build: {
    outDir: 'dist',   // where to output the built files
    emptyOutDir: true // clean outDir before building
  },
  server: {
    open: true // auto open browser on dev
  }
})