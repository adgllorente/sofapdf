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
    rollupOptions: {
      output: {
        // pdf.js construye las URLs de sus decodificadores con su nombre
        // original, por eso los WASM no pueden llevar hash.
        assetFileNames: (asset) =>
          asset.names.some((name) => name.endsWith('.wasm'))
            ? 'assets/[name][extname]'
            : 'assets/[name]-[hash][extname]',
      },
    },
  },
  server: {
    host: true,
    port: 5173,
    allowedHosts: ['.trycloudflare.com'],
  },
})
