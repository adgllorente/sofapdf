# Herramientas PDF locales

Suite de herramientas PDF tipo iLovePDF con una diferencia: **no hay backend**. Todo el
procesamiento ocurre en el navegador del usuario. El documento nunca se sube a ningún sitio.

Ese es el producto. Cualquier decisión técnica que rompa esa promesa (una API de conversión, un
CDN de fuentes, analítica) rompe también el argumento de venta.

## Stack

- **Vite 8** + **React 19** + **TypeScript** — estándar, sin framework de más.
- **Tailwind CSS 4** con configuración CSS-first (`@theme` en `src/index.css`).
- **react-router-dom** para las rutas; **lucide-react** para los iconos.
- **MuPDF.js** (`mupdf`, WASM) como motor de todas las herramientas: páginas, contenido, render,
  texto, imágenes, redacción real, cifrado y reparación.
- **pdfjs-dist** para las vistas previas interactivas, que renderizan en un worker.
- **tesseract.js** para el OCR.
- **jszip** (carga diferida) para descargar varios resultados de una vez.

Los documentos no salen del navegador. El WASM de MuPDF, el worker de pdf.js y el modelo de OCR
se sirven desde el propio bundle, y las fuentes son las del sistema. La única petición a terceros
es Vercel Web Analytics, que cuenta visitas por ruta y nunca recibe documentos ni nada derivado
de ellos (detalle en la página de privacidad).

## Arranque

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # comprobación de tipos + bundle en dist/
npm run preview
npm run lint
```

`dist/` es estático: sirve en cualquier hosting de ficheros.

## Licencia

El código de este repositorio se distribuye bajo la [licencia MIT](LICENSE).

La aplicación publicada incluye [MuPDF](https://mupdf.com/) (© Artifex Software), licenciado bajo
la [GNU AGPL-3.0](https://www.gnu.org/licenses/agpl-3.0.html). Por tanto, la obra combinada que se
sirve a los usuarios se distribuye bajo AGPL-3.0, y su código fuente completo es este repositorio.
Si haces un fork y lo publicas como servicio, el AGPL te obliga a ofrecer también tu código
fuente.

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
  lib/                 mupdf, pdfjs, cifrado, parseo de rangos de páginas, descargas
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

2. Añade su carga diferida en `IMPLS` (`src/tools/impls.ts`), la entrada en `TOOLS`
   (`src/tools/registry.ts`) con `status: 'ready'` y `load: IMPLS['mi-tool']`, y el slug a
   `ToolSlug`. La implementación corre en un Web Worker: no puede usar el DOM.

3. Añade sus textos en `tools` de los dos diccionarios.

La UI (dropzone, formulario de opciones, progreso, resultados, descargas, errores) sale del
registro; la implementación solo recibe ficheros y devuelve blobs.

Las opciones son declarativas: `select`, `text`, `number` y `toggle`, con `showIf` para campos
dependientes. No hace falta escribir React para una herramienta nueva.

## Estado

El catálogo completo está en `src/tools/registry.ts`; todas las herramientas listadas ahí con
`status: 'ready'` funcionan en el navegador sobre MuPDF.

Notas técnicas:

- **Redactar** borra de verdad el contenido bajo cada rectángulo (texto, imágenes y trazos) con
  `applyRedactions` de MuPDF. El resto de la página sigue siendo texto seleccionable.
- **Comprimir** recomprime imágenes y compacta objetos; nunca rasteriza el texto.
- **OCR** con `tesseract.js`: el modelo de idioma pesa 10-15 MB y se cachea tras la primera vez.
- **PDF/A** no está: MuPDF no lo genera y Ghostscript (también AGPL) pesa mucho más.
- **Office ↔ PDF** queda fuera del alcance local: haría falta LibreOffice compilado a WASM
  (cientos de MB). Es la única familia de herramientas donde un servicio con servidor gana.

## Límites del enfoque

El trabajo lo hace el equipo del usuario. WASM de 32 bits topa en 4 GB y en la práctica mucho
antes, así que conviene procesar página a página y no cargar documentos enormes enteros en memoria.
La primera herramienta que se usa descarga el WASM de MuPDF (unos 3,6 MB comprimido); después
queda en la caché del navegador.
Si en el futuro se activan Web Workers con `SharedArrayBuffer`, el hosting tendrá que servir las
cabeceras COOP/COEP.
