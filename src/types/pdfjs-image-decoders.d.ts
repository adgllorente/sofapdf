declare module 'pdfjs-dist/image_decoders/pdf.image_decoders.mjs' {
  export const JpxImage: {
    setOptions(options: { useWasm: boolean; useWorkerFetch: boolean; wasmUrl: string }): void
    readonly instance: {
      decode(bytes: Uint8Array, options: { numComponents: number }): Promise<Uint8Array>
    }
  }
}
