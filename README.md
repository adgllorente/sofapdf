# Herramientas PDF locales

Suite de herramientas PDF tipo iLovePDF con una diferencia: **no hay backend**. Todo el
procesamiento ocurre en el navegador del usuario. El documento nunca se sube a ningún sitio.

Ese es el producto. Cualquier decisión técnica que rompa esa promesa (una API de conversión, un
CDN de fuentes, analítica) rompe también el argumento de venta.

## Stack

- **Vite 8** + **React 19** + **TypeScript** — estándar, sin framework de más.
- **Tailwind CSS 4** con configuración CSS-first (`@theme` en `src/index.css`).
- **react-router-dom** para las rutas.
- **pdf-lib** para manipular PDF sin rasterizar.
- **pdfjs-dist** para renderizar páginas a canvas.
- **jszip** (carga diferida) para descargar varios resultados de una vez.

Sin dependencias de red en tiempo de ejecución: el worker de pdf.js se sirve desde el propio
bundle, las fuentes son las del sistema y no hay analítica.

## Arranque

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # comprobación de tipos + bundle en dist/
npm run preview
npm run lint
```

`dist/` es estático: sirve en cualquier hosting de ficheros.

## El nombre

Vive en `src/config.ts`, en la constante `APP`. Cambiar `name`, `legalName` y `domain` ahí
actualiza cabecera, pie, `<title>` y textos. No hay que tocar nada más.

## Estructura

```
src/
  config.ts            marca: nombre, nombre legal, dominio
  i18n/                detección de idioma y diccionarios (es, en)
  components/          Layout, Dropzone, OptionsForm, ToolCard, Icon…
  pages/               Dashboard, ToolPage, Privacy, NotFound
  tools/
    registry.ts        catálogo: estructura + opciones + carga diferida
    types.ts           contrato Tool / ToolRun
    impl/              una implementación por herramienta
  lib/                 pdfjs, parseo de rangos de páginas, descargas
```

## Idiomas

Español e inglés. Se elige leyendo `navigator.languages` al cargar la página y se aplica sin
preguntar; si el sistema no está en ninguno de los dos, cae a inglés. El idioma elegido y el tema
se guardan en `localStorage`, junto con el contador de usos y el aplazamiento del aviso de apoyo.
Solo son preferencias y métricas locales de la interfaz: nunca contienen documentos ni datos
derivados de ellos.

Todo el texto visible vive en `src/i18n/locales/`. `es.ts` es la referencia y `en.ts` está tipado
como `typeof es`, así que olvidar una clave rompe el build en lugar de colarse en producción.
Añadir un idioma es copiar `en.ts` y sumarlo al mapa de `src/i18n/index.ts`.

## Añadir una herramienta

1. Crea `src/tools/impl/mi-tool.ts` exportando `run: ToolRun`.

   ```ts
   export const run: ToolRun = async (files, values, ctx) => {
     ctx.onProgress(0.5, t.progress.writingPdf)
     return [{ name: 'salida.pdf', blob }]
   }
   ```

2. Añade la entrada en `TOOLS` (`src/tools/registry.ts`) con `status: 'ready'` y
   `load: () => import('./impl/mi-tool').then((m) => m.run)`, y el slug a `ToolSlug`.

3. Añade sus textos en `tools` de los dos diccionarios.

La UI (dropzone, formulario de opciones, progreso, resultados, descargas, errores) sale del
registro; la implementación solo recibe ficheros y devuelve blobs.

Las opciones son declarativas: `select`, `text`, `number` y `toggle`, con `showIf` para campos
dependientes. No hace falta escribir React para una herramienta nueva.

## Estado

Listas: unir, dividir, rotar, numerar páginas, imágenes a PDF, PDF a imágenes.

Pendientes (aparecen en el dashboard marcadas como «Pronto»): comprimir, OCR, proteger,
desbloquear, marca de agua, organizar, recortar, comparar, redactar, firmar, reparar, PDF/A,
PDF a texto y web a PDF.

Notas técnicas de lo pendiente:

- **Comprimir / reparar / proteger / desbloquear / PDF/A** necesitan un motor WASM. `qpdf-wasm`
  (Apache 2.0) cubre cifrado, reparación y linealización; para recomprimir imágenes lo limpio es
  extraer los XObject y pasarlos por `mozjpeg`/`jsquash` (MIT). Ghostscript y MuPDF harían más con
  menos código pero son **AGPL**: obligan a publicar el fuente del producto.
- **OCR** con `tesseract.js`: el modelo de idioma pesa 10-15 MB y se cachea tras la primera vez.
- **Redactar** debe borrar el contenido del content stream, no dibujar un rectángulo encima. Tapar
  no elimina: el texto se sigue pudiendo copiar.
- **Office ↔ PDF** queda fuera del alcance local: haría falta LibreOffice compilado a WASM
  (cientos de MB). Es la única familia de herramientas donde un servicio con servidor gana.

## Límites del enfoque

El trabajo lo hace el equipo del usuario. WASM de 32 bits topa en 4 GB y en la práctica mucho
antes, así que conviene procesar página a página y no cargar documentos enormes enteros en memoria.
Si en el futuro se activan Web Workers con `SharedArrayBuffer`, el hosting tendrá que servir las
cabeceras COOP/COEP.
