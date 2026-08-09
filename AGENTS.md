# AGENTS.md

Instrucciones para agentes de IA que trabajen en este repositorio.

## Qué es esto

Suite de herramientas PDF en el navegador, al estilo de iLovePDF o Smallpdf. La diferencia es
toda la propuesta de valor: **no hay backend y los documentos del usuario no salen de su
dispositivo**. Todo el procesamiento ocurre en la pestaña, con JavaScript y WASM.

El nombre comercial no está cerrado. Vive en `src/config.ts` (`APP.name`). **Nunca escribas el
nombre a mano** en un componente, un texto o un `<title>`: impórtalo de ahí.

## La regla que no se rompe

Ninguna línea de código puede hacer que un documento del usuario, o datos derivados de él, viajen
por la red. Esto no es una preferencia de arquitectura, es el producto.

Prohibido, aunque parezca cómodo o lo pida una tarea de forma ambigua:

- `fetch`, `XMLHttpRequest`, WebSocket o `sendBeacon` con contenido del usuario.
- APIs de conversión de terceros, incluidas las gratuitas.
- Analítica, telemetría, informes de error remotos, mapas de calor.
- Fuentes, scripts, hojas de estilo, WASM o iconos servidos desde un CDN. Todo va en el bundle.
- Persistir contenido de documentos en `localStorage`, `IndexedDB`, cookies o el sistema de
  ficheros.

Solo se persisten preferencias y datos de uso de la interfaz (`theme`, `lang`,
`supportPrompt.usageCount` y `supportPrompt.dismissedAt`). Si añades cualquier otra persistencia,
tiene que ser una decisión consciente y documentada en `src/pages/Privacy.tsx`.

Cargar recursos desde el **mismo origen** sí vale: es como se sirve el worker de pdf.js y como se
servirán los módulos WASM. Usa el import de Vite (`import url from 'x?url'`), nunca una URL de CDN.

Si una tarea es imposible de cumplir sin red, no la implementes a medias: dilo y propón la
alternativa local. Es preferible una herramienta menos a una promesa rota.

## Comandos

```bash
npm run dev      # servidor de desarrollo en :5173
npm run build    # tsc -b + vite build; debe pasar antes de dar nada por terminado
npm run lint     # oxlint
npm run preview  # sirve dist/
```

No hay tests unitarios y no se piden. Si arrancas `npm run dev` para comprobar algo, **mata el
proceso al terminar** y verifica que no queda ninguno vivo.

## Stack

Vite 8, React 19, TypeScript en modo estricto, Tailwind CSS 4, react-router-dom.
`pdf-lib` para manipular PDF sin rasterizar, `pdfjs-dist` para renderizar a canvas, `jszip`
(importado de forma diferida) para las descargas múltiples.

Alias `@/` → `src/`.

## Arquitectura

```
src/
  config.ts            APP: nombre, nombre legal, dominio, año
  i18n/
    index.ts           detección del idioma, `t` (diccionario activo) y `fmt`
    locales/es.ts      diccionario de referencia; su forma define el tipo
    locales/en.ts      traducción, tipada como `typeof es`
    tools.ts           resuelve los textos de una herramienta por su slug
  components/          Layout, Dropzone, OptionsForm, ToolCard, Icon, ThemeToggle…
  pages/               Dashboard, ToolPage, Privacy, NotFound
  tools/
    registry.ts        catálogo: solo estructura (icono, categoría, opciones, carga diferida)
    types.ts           contrato Tool / ToolRun / OptionField / ToolSlug
    impl/              una implementación por herramienta
  lib/                 pdfjs, parseo de rangos de páginas, blobs y descargas
```

El dashboard, la página de cada herramienta, el formulario de opciones, la barra de progreso, la
lista de resultados y los errores se generan **desde el registro**. Una implementación solo recibe
ficheros y devuelve blobs; no sabe nada de React.

## Añadir una herramienta

1. `src/tools/impl/mi-tool.ts` exportando `run`:

   ```ts
   import type { ToolRun } from '@/tools/types'

   export const run: ToolRun = async (files, values, ctx) => {
     ctx.onProgress(0.5, 'Etiqueta visible en la barra de progreso')
     return [{ name: 'salida.pdf', blob }]
   }
   ```

2. Entrada en `TOOLS` (`src/tools/registry.ts`) con `status: 'ready'` y
   `load: () => import('./impl/mi-tool').then((m) => m.run)`. El slug tiene que estar en `ToolSlug`.

3. Textos en `tools` de **los dos** diccionarios (`name`, `short`, `description`, `action`, y
   `note`/`options` si aplica). Si falta un idioma, `tsc` lo caza.

Reglas:

- La carga de la implementación es **siempre diferida**. No importes `pdf-lib`, `pdfjs-dist` ni
  ningún WASM desde código que entre en el bundle inicial.
- Las opciones son datos, no JSX: `select`, `text`, `number`, `toggle`, con `showIf` para los
  campos dependientes. Si te ves escribiendo un formulario a mano, es que falta un tipo de campo
  en `OptionField`.
- Lanza `Error` con un texto del diccionario (`t.errors.*`, con `fmt` si lleva huecos): «La página
  12 no existe: el documento tiene 9». `ToolPage` lo muestra tal cual.
- Reutiliza `@/lib/pages` para interpretar selecciones tipo `1-3, 5, 9-`, y `@/lib/files` para
  blobs y descargas.
- Libera memoria en cuanto puedas: `page.cleanup()`, poner el canvas a `0×0`, y procesar página a
  página en lugar de acumular todo en un array.

Si una herramienta pasa de `planned` a `ready`, quita `note` de los diccionarios si dejó de aplicar.

## Estilo

- **Ningún texto visible se escribe en un componente.** Va al diccionario y se lee con
  `t.<ruta>`; los huecos `{clave}` se rellenan con `fmt`. Vale para `aria-label`, `title`,
  mensajes de error y trozos de nombre de fichero.
- Español e inglés, con el español como referencia: `en.ts` está tipado como `typeof es`, así que
  una clave que falte rompe el build. Añade siempre las dos a la vez.
- El idioma se detecta de `navigator.languages` al cargar y no se guarda nada (respaldo: inglés).
  No hay selector: si algún día lo hay, persistirlo es una decisión que se documenta en
  `src/pages/Privacy.tsx`.
- Comentarios en español. Inglés en identificadores de código.
- Comentarios escasos y de una línea, explicando **por qué**, nunca qué. Si el código necesita un
  párrafo, probablemente necesita otro nombre.
- Nada de colores en crudo en los componentes: usa los tokens de `src/index.css`
  (`bg-canvas`, `text-ink`, `text-muted`, `border-line`, `bg-accent-soft`…). Están definidos con
  `@theme` y se reescriben en `[data-theme='dark']`, así que un token cubre los dos temas y un
  hex no.
- Iconos: añade el trazado a `src/components/Icon.tsx`. No instales una librería de iconos.
- Tono de los textos: sobrio y concreto. La página de privacidad admite los límites reales (el
  hosting ve la IP, un PDF enorme puede agotar la memoria). Esa honestidad es lo que hace creíble
  la promesa; no la conviertas en marketing.

## Trabajo pendiente y sus trampas

- **Comprimir** usa `pdf-lib` para reescribir el documento y el canvas del navegador para
  re-encodear las imágenes JPEG incrustadas a menor calidad. No rasteriza el texto: sigue siendo
  texto. Imágenes en otros formatos (PNG, CMYK, imágenes con máscara) no se tocan por ahora.
- **Reparar, proteger, desbloquear, PDF/A**: van con `qpdf-wasm` (Apache 2.0). Ghostscript y
  MuPDF hacen más con menos código pero son **AGPL**: obligarían a publicar el fuente del producto.
  No los introduzcas sin preguntar.
- **Comprimir** no debe rasterizar. El texto tiene que seguir siendo texto.
- **Redactar** debe borrar el contenido del content stream. Dibujar un rectángulo negro encima no
  elimina nada: el texto se sigue pudiendo copiar. Implementarlo mal es peor que no tenerlo.
- **OCR** con `tesseract.js`; el modelo de idioma se sirve desde el propio origen, no desde el CDN
  por defecto de la librería.
- **Office ↔ PDF** queda fuera de alcance: exigiría LibreOffice en WASM, cientos de MB. Es la única
  familia donde un servicio con servidor gana, y se asume.
- Si algún día hace falta `SharedArrayBuffer` para hilos en WASM, el hosting tendrá que servir
  cabeceras COOP/COEP. Documéntalo en el README si se activa.
