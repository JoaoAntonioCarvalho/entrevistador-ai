// O worker do pdfjs-dist não publica declarações de tipos — só precisamos
// importá-lo para registrar em globalThis.pdfjsWorker (ver pdf-to-images.ts)
declare module 'pdfjs-dist/legacy/build/pdf.worker.mjs';
