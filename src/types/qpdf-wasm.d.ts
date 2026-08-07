/** El paquete no trae tipos; solo se declara lo que usa la app. */
declare module '@jspawn/qpdf-wasm/qpdf.js' {
  export type QpdfModule = {
    callMain: (args: string[]) => number
    FS: {
      writeFile: (path: string, data: Uint8Array) => void
      readFile: (path: string) => Uint8Array
      unlink: (path: string) => void
    }
  }

  export type QpdfModuleArg = {
    locateFile?: (path: string) => string
  }

  export default function createModule(arg?: QpdfModuleArg): Promise<QpdfModule>
}
