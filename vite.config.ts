import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    proxy: {
      '/api/image-tools': { target: process.env.WRISTO_API_PROXY || 'http://127.0.0.1:8088', changeOrigin: true },
      '/wristo-api': { target: process.env.WRISTO_API_PROXY || 'http://127.0.0.1:8088', changeOrigin: true, rewrite: path => path.replace(/^\/wristo-api/, '/api') },
    },
  },
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
