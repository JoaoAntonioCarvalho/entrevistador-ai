import { createCanvas } from '@napi-rs/canvas';

export async function pdfToBase64Images(buffer: ArrayBuffer): Promise<string[]> {
  // Dynamic import: usa o legacy build (com polyfills para DOMMatrix no Node.js)
  // e adia a inicialização para o momento do uso, evitando erros no build do Next.js
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  // Registrar o worker no globalThis em vez de usar workerSrc: o fake worker
  // do pdfjs consulta globalThis.pdfjsWorker.WorkerMessageHandler ANTES de
  // tentar import(workerSrc) — evita resolver caminho de arquivo em runtime,
  // que falha na função serverless (worker fora do bundle) e no Windows
  // (import() exige URL file:// para caminho absoluto)
  if (!(globalThis as { pdfjsWorker?: unknown }).pdfjsWorker) {
    (globalThis as { pdfjsWorker?: unknown }).pdfjsWorker = await import(
      'pdfjs-dist/legacy/build/pdf.worker.mjs'
    );
  }

  const pdf = await pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
    useWorkerFetch: false,
    useSystemFonts: true,
  }).promise;

  const images: string[] = [];
  const totalPages = Math.min(pdf.numPages, 5);

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 2.0 });
    const canvas = createCanvas(Math.round(viewport.width), Math.round(viewport.height));

    await page.render({
      canvas: canvas as unknown as HTMLCanvasElement,
      viewport,
    }).promise;

    const base64 = canvas.toDataURL('image/jpeg', 0.95).split(',')[1];
    images.push(base64);
  }

  return images;
}
