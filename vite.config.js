import { defineConfig } from 'vite'
import path from 'path';
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: '/major-studio-1/', // base public path when served in production
  build: {
    rollupOptions: {
      input: {
        'stamp-collection': path.resolve(__dirname, 'stamp-collection/index.html')
      }
    }
  },
  plugins: [
    tailwindcss(),
  ]
})