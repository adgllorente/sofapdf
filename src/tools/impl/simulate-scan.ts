import { fmt, t } from '@/i18n'
import { mupdf, pdfBlob, readPdf, usingPdf, yieldToUI } from '@/lib/mupdf'
import { num } from '@/lib/overlay'
import { baseName } from '@/lib/pages'
import type { ToolRun } from '@/tools/types'

const TARGET_DPI_SCALE = 2

const NOISE_AMPLITUDES: Record<string, number> = {
  low: 6,
  medium: 12,
  high: 24,
}

function clamp(value: number, min = 0, max = 255): number {
  return Math.max(min, Math.min(max, value))
}

function pageAngle(pageIndex: number, skew: string): number {
  if (skew === 'none') return 0
  const max = skew === 'slight' ? 0.75 : skew === 'medium' ? 1.5 : 2.6
  // Variación pseudoaleatoria determinista según el índice de página
  const pseudo = Math.sin((pageIndex + 1) * 12.9898 + 78.233)
  const norm = pseudo - Math.floor(pseudo)
  const sign = (pageIndex % 2 === 0 ? 1 : -1) * (norm > 0.4 ? 1 : -1)
  return sign * (0.3 + 0.7 * norm) * max
}

function pageShift(pageIndex: number, scale: number): [number, number] {
  const p1 = Math.sin((pageIndex + 1) * 43.123)
  const p2 = Math.cos((pageIndex + 1) * 91.456)
  const sx = (p1 - Math.floor(p1) - 0.5) * 3 * scale
  const sy = (p2 - Math.floor(p2) - 0.5) * 3 * scale
  return [sx, sy]
}

/** Suavizado óptico 2D separable para imitar el desenfoque analógico de la lente. */
function applyOpticalSoftness(pixels: Uint8ClampedArray, width: number, height: number, stride: number): void {
  const rowBytes = width * 3
  const rowBuf = new Uint8Array(rowBytes)

  // Paso horizontal
  for (let y = 0; y < height; y++) {
    const rowOffset = y * stride
    for (let x = 0; x < width; x++) {
      const xPrev = x > 0 ? x - 1 : 0
      const xNext = x < width - 1 ? x + 1 : width - 1
      const i = rowOffset + x * 3
      const iP = rowOffset + xPrev * 3
      const iN = rowOffset + xNext * 3
      const bi = x * 3
      rowBuf[bi] = Math.round(pixels[iP] * 0.18 + pixels[i] * 0.64 + pixels[iN] * 0.18)
      rowBuf[bi + 1] = Math.round(pixels[iP + 1] * 0.18 + pixels[i] * 0.64 + pixels[iN + 1] * 0.18)
      rowBuf[bi + 2] = Math.round(pixels[iP + 2] * 0.18 + pixels[i] * 0.64 + pixels[iN + 2] * 0.18)
    }
    pixels.set(rowBuf, rowOffset)
  }

  // Paso vertical reutilizando filas
  const prevRow = new Uint8Array(pixels.subarray(0, rowBytes))
  const currRow = new Uint8Array(rowBytes)
  const outRow = new Uint8Array(rowBytes)

  for (let y = 0; y < height; y++) {
    const nextY = y < height - 1 ? y + 1 : height - 1
    const nextRow = pixels.subarray(nextY * stride, nextY * stride + rowBytes)
    currRow.set(pixels.subarray(y * stride, y * stride + rowBytes))

    for (let i = 0; i < rowBytes; i++) {
      outRow[i] = Math.round(prevRow[i] * 0.18 + currRow[i] * 0.64 + nextRow[i] * 0.18)
    }

    pixels.set(outRow, y * stride)
    prevRow.set(currRow)
  }
}

/** Aplica textura de papel, contraste, grano de sensor y viñeteado de borde. */
function applyScannerEffects(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  stride: number,
  mode: string,
  noiseAmp: number,
): void {
  for (let y = 0; y < height; y++) {
    const row = y * stride
    const distY = Math.min(y, height - 1 - y)

    for (let x = 0; x < width; x++) {
      const idx = row + x * 3
      let r = pixels[idx]
      let g = pixels[idx + 1]
      let b = pixels[idx + 2]

      if (mode === 'bw') {
        const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
        const noise = (Math.random() - 0.5) * noiseAmp * 1.5
        const val = lum + noise < 140 ? 15 : 252
        r = g = b = val
      } else if (mode === 'grayscale') {
        let lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
        lum = (lum - 128) * 1.15 + 128 + 2
        lum += (Math.random() - 0.5) * noiseAmp
        r = g = b = lum
      } else {
        // Modo color: contraste analógico + tono cálido de papel
        r = (r - 128) * 1.12 + 128 + 3
        g = (g - 128) * 1.12 + 128 + 2
        b = (b - 128) * 1.12 + 128 - 1

        const lumNoise = (Math.random() - 0.5) * noiseAmp
        const chromaNoise = (Math.random() - 0.5) * 1.5
        r += lumNoise + chromaNoise
        g += lumNoise
        b += lumNoise - chromaNoise
      }

      // Viñeteado sutil en los bordes donde la tapa del escáner ajusta peor
      const distX = Math.min(x, width - 1 - x)
      const edgeDist = Math.min(distX, distY)
      if (edgeDist < 6) {
        const factor = 1 - ((6 - edgeDist) / 6) * 0.12
        r *= factor
        g *= factor
        b *= factor
      }

      pixels[idx] = clamp(r)
      pixels[idx + 1] = clamp(g)
      pixels[idx + 2] = clamp(b)
    }
  }
}

export const run: ToolRun = async (files, values, ctx) => {
  const [file] = files
  return usingPdf(await readPdf(file), async (doc) => {
    const total = doc.countPages()
    const stem = baseName(file.name)
    const mode = String(values.mode ?? 'color')
    const skew = String(values.skew ?? 'slight')
    const noise = String(values.noise ?? 'medium')
    const blur = Boolean(values.blur ?? true)
    const noiseAmp = NOISE_AMPLITUDES[noise] ?? 12

    const outDoc = new mupdf.PDFDocument()
    try {
      for (let i = 0; i < total; i++) {
        ctx.onProgress(i / total, fmt(t.progress.page, { n: i + 1 }))
        await yieldToUI()

        const page = doc.loadPage(i)
        let pw = 0
        let ph = 0
        let x0 = 0
        let y0 = 0
        let jpegBytes: Uint8Array

        try {
          const bounds = page.getBounds()
          x0 = bounds[0]
          y0 = bounds[1]
          pw = bounds[2] - x0
          ph = bounds[3] - y0

          // Evita desbordar memoria en planos o páginas gigantes
          let scale = TARGET_DPI_SCALE
          if (Math.max(pw, ph) * scale > 3000) {
            scale = 3000 / Math.max(pw, ph)
          }

          const width = Math.round(pw * scale)
          const height = Math.round(ph * scale)

          const pixmap = new mupdf.Pixmap(mupdf.ColorSpace.DeviceRGB, [0, 0, width, height], false)
          pixmap.clear(255)

          const cx = pw / 2
          const cy = ph / 2
          const angle = pageAngle(i, skew)
          const [shiftX, shiftY] = pageShift(i, scale)

          let matrix = mupdf.Matrix.translate(-cx, -cy)
          matrix = mupdf.Matrix.concat(matrix, mupdf.Matrix.rotate(angle))
          matrix = mupdf.Matrix.concat(matrix, mupdf.Matrix.translate(cx + shiftX / scale, cy + shiftY / scale))
          matrix = mupdf.Matrix.concat(matrix, mupdf.Matrix.scale(scale, scale))

          const device = new mupdf.DrawDevice(mupdf.Matrix.identity, pixmap)
          try {
            page.run(device, matrix)
          } finally {
            device.close()
          }

          const pixels = pixmap.getPixels()
          const stride = pixmap.getStride()

          if (blur) {
            applyOpticalSoftness(pixels, width, height, stride)
          }

          applyScannerEffects(pixels, width, height, stride, mode, noiseAmp)

          const quality = mode === 'bw' ? 82 : mode === 'grayscale' ? 76 : 78
          jpegBytes = pixmap.asJPEG(quality)
          pixmap.destroy()
        } finally {
          page.destroy()
        }

        const image = new mupdf.Image(jpegBytes)
        const ref = outDoc.addImage(image)
        image.destroy()

        const contents = `q ${num(pw)} 0 0 ${num(ph)} ${num(x0)} ${num(y0)} cm /Im0 Do Q`
        const outPage = outDoc.addPage([x0, y0, x0 + pw, y0 + ph], 0, { XObject: { Im0: ref } }, contents)
        outDoc.insertPage(-1, outPage)
      }

      return [
        {
          name: `${stem}-${t.filenames.scanned}.pdf`,
          blob: pdfBlob(outDoc),
        },
      ]
    } finally {
      outDoc.destroy()
    }
  })
}
