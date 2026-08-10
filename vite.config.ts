import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    // Nada de este proyecto habla con la red: todo el peso va al bundle.
    chunkSizeWarningLimit: 1500,
  },
  server: {
    host: true,
    port: 5173,
    allowedHosts: ['.trycloudflare.com'],
  },
})
