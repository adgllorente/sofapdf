import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

const PDFJS_WASM = ['openjpeg.wasm', 'jbig2.wasm', 'qcms_bg.wasm']

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
        // original, por eso esos WASM no pueden llevar hash. El de MuPDF sí lo
        // lleva: sin él, una caché podría servirlo viejo junto a un JS nuevo.
        assetFileNames: (asset) =>
          asset.names.some((name) => PDFJS_WASM.includes(name))
            ? 'assets/[name][extname]'
            : 'assets/[name]-[hash][extname]',
      },
    },
  },
  server: {
    host: true,
    port: 5173,
    allowedHosts: ['.trycloudflare.com', '.loca.lt'],
  },
})
