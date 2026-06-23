import { createCanvas } from 'canvas';

export async function pdfToBase64Images(buffer: ArrayBuffer): Promise<string[]> {
  // Dynamic import: usa o legacy build (com polyfills para DOMMatrix no Node.js)
  // e adia a inicialização para o momento do uso, evitando erros no build do Next.js
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  pdfjsLib.GlobalWorkerOptions.workerSrc = '';

  const pdf = await pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
    useWorkerFetch: false,
    useSystemFonts: true,
  }).promise;

  const images: string[] = [];
  const totalPages = Math.min(pdf.numPages, 5);

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = createCanvas(Math.round(viewport.width), Math.round(viewport.height));

    await page.render({
      canvas: canvas as unknown as HTMLCanvasElement,
      viewport,
    }).promise;

    const base64 = canvas.toDataURL('image/jpeg', 0.85).split(',')[1];
    images.push(base64);
  }

  return images;
}
