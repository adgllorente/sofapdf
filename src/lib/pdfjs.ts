import * as pdfjs from 'pdfjs-dist'
// ?url deja que Vite copie el worker al bundle: se sirve desde el mismo origen,
// nunca desde un CDN.
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

export { pdfjs }
