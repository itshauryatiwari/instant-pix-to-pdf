import * as pdfjs from "pdfjs-dist";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - vite worker url
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl as string;

export { pdfjs };

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

export function timestampName(prefix: string, ext = "pdf"): string {
  const t = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  return `${prefix}-${t}.${ext}`;
}

export function isPdf(file: File): boolean {
  return file.type === "application/pdf" || /\.pdf$/i.test(file.name);
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export type PdfDoc = Awaited<ReturnType<typeof loadPdfDocument>>;

export async function loadPdfDocument(data: ArrayBuffer) {
  const task = pdfjs.getDocument({ data: new Uint8Array(data) });
  return task.promise;
}

/** Render a PDF page to a canvas at the given scale, returns dataURL. */
export async function renderPageThumb(
  doc: pdfjs.PDFDocumentProxy,
  pageNum: number,
  targetWidth = 220,
  format: "image/jpeg" | "image/png" | "image/webp" = "image/jpeg",
  quality = 0.8,
): Promise<{ dataUrl: string; width: number; height: number }> {
  const page = await doc.getPage(pageNum);
  const viewport1 = page.getViewport({ scale: 1 });
  const scale = targetWidth / viewport1.width;
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const ctx = canvas.getContext("2d")!;
  await page.render({ canvasContext: ctx, viewport, canvas }).promise;
  const dataUrl = canvas.toDataURL(format, quality);
  const w = canvas.width;
  const h = canvas.height;
  canvas.width = 0;
  canvas.height = 0;
  page.cleanup();
  return { dataUrl, width: w, height: h };
}

/** Render page to a Blob (used for PDF→Image export). */
export async function renderPageBlob(
  doc: pdfjs.PDFDocumentProxy,
  pageNum: number,
  dpi: number,
  format: "image/jpeg" | "image/png" | "image/webp",
  quality: number,
): Promise<Blob> {
  const page = await doc.getPage(pageNum);
  const scale = dpi / 72;
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const ctx = canvas.getContext("2d")!;
  if (format === "image/jpeg") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  await page.render({ canvasContext: ctx, viewport, canvas }).promise;
  const blob: Blob = await new Promise((res, rej) =>
    canvas.toBlob(
      (b) => (b ? res(b) : rej(new Error("Failed to encode image"))),
      format,
      quality,
    ),
  );
  canvas.width = 0;
  canvas.height = 0;
  page.cleanup();
  return blob;
}

/** Parse "1,3-5,8" into a sorted unique 1-based array within [1..total]. */
export function parseRanges(input: string, total: number): number[] {
  const out = new Set<number>();
  const parts = input
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  for (const p of parts) {
    const m = p.match(/^(\d+)\s*-\s*(\d+)$/);
    if (m) {
      let a = parseInt(m[1], 10);
      let b = parseInt(m[2], 10);
      if (a > b) [a, b] = [b, a];
      for (let i = a; i <= b; i++) if (i >= 1 && i <= total) out.add(i);
    } else if (/^\d+$/.test(p)) {
      const n = parseInt(p, 10);
      if (n >= 1 && n <= total) out.add(n);
    } else {
      throw new Error(`Invalid range: "${p}"`);
    }
  }
  return Array.from(out).sort((a, b) => a - b);
}

export function friendlyPdfError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/password|encrypt/i.test(msg))
    return "This PDF is password-protected. Please remove the password first with our Unlock PDF tool.";
  if (/InvalidPDF|Invalid PDF|corrupt|Missing PDF/i.test(msg))
    return "This file doesn't look like a valid PDF or is corrupted.";
  if (/memory|allocation/i.test(msg))
    return "Your browser ran out of memory. Try a smaller file or fewer pages at once.";
  if (msg === "cancelled") return "Operation cancelled.";
  return msg || "Something went wrong.";
}
