import { jsPDF } from "jspdf";

export type PageSize = "auto" | "a4" | "a3" | "letter" | "legal";
export type Orientation = "portrait" | "landscape" | "auto";
export type Margin = "none" | "small" | "medium" | "large";
export type ImageFit = "original" | "fit-width" | "fit-height" | "fill" | "center";
export type Compression = "maximum" | "high" | "medium" | "low";

export type ImageItem = {
  id: string;
  file: File;
  name: string;
  url: string; // object URL for preview
  width: number;
  height: number;
  size: number;
  rotation: 0 | 90 | 180 | 270;
  type: string;
};

export type PdfSettings = {
  pageSize: PageSize;
  orientation: Orientation;
  margin: Margin;
  fit: ImageFit;
  compression: Compression;
  background: string; // hex "#ffffff"
};

// Sizes in points (1pt = 1/72 inch)
const PAGE_SIZES: Record<Exclude<PageSize, "auto">, [number, number]> = {
  a4: [595.28, 841.89],
  a3: [841.89, 1190.55],
  letter: [612, 792],
  legal: [612, 1008],
};

const MARGIN_PT: Record<Margin, number> = {
  none: 0,
  small: 18,
  medium: 36,
  large: 72,
};

const COMPRESSION_QUALITY: Record<Compression, number> = {
  maximum: 0.5,
  high: 0.7,
  medium: 0.85,
  low: 0.95,
};

const COMPRESSION_MAX_DIM: Record<Compression, number> = {
  maximum: 1200,
  high: 1800,
  medium: 2400,
  low: 4000,
};

export const SUPPORTED_MIME = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/bmp",
  "image/gif",
];

export function isSupported(file: File): boolean {
  if (SUPPORTED_MIME.includes(file.type)) return true;
  return /\.(jpe?g|png|webp|bmp|gif)$/i.test(file.name);
}

export function isHeic(file: File): boolean {
  return (
    /heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name)
  );
}

export async function readImageMeta(file: File): Promise<{
  url: string;
  width: number;
  height: number;
}> {
  const url = URL.createObjectURL(file);
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Could not decode image"));
    img.src = url;
  });
  return { url, width: img.naturalWidth, height: img.naturalHeight };
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => rej(new Error("Failed to load image"));
    img.src = url;
  });
}

/**
 * Render an image to a canvas with rotation + compression cap, and return a JPEG data URL.
 */
async function rasterize(
  item: ImageItem,
  bg: string,
  quality: number,
  maxDim: number,
): Promise<{ dataUrl: string; width: number; height: number }> {
  const img = await loadImage(item.url);

  // Effective natural dimensions post-rotation
  let w = img.naturalWidth;
  let h = img.naturalHeight;
  const rotated = item.rotation === 90 || item.rotation === 270;
  const naturalW = rotated ? h : w;
  const naturalH = rotated ? w : h;

  // Scale down for compression
  const scale = Math.min(1, maxDim / Math.max(naturalW, naturalH));
  const outW = Math.max(1, Math.round(naturalW * scale));
  const outH = Math.max(1, Math.round(naturalH * scale));

  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, outW, outH);
  ctx.imageSmoothingQuality = "high";

  ctx.save();
  ctx.translate(outW / 2, outH / 2);
  ctx.rotate((item.rotation * Math.PI) / 180);
  const drawW = rotated ? outH : outW;
  const drawH = rotated ? outW : outH;
  ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
  ctx.restore();

  const dataUrl = canvas.toDataURL("image/jpeg", quality);

  // free
  canvas.width = 0;
  canvas.height = 0;

  return { dataUrl, width: outW, height: outH };
}

function resolvePageDims(
  imgW: number,
  imgH: number,
  settings: PdfSettings,
): { pageW: number; pageH: number } {
  // Auto page = image size in pt (px≈pt for our purposes, keeps aspect intact)
  let base: [number, number];
  if (settings.pageSize === "auto") {
    base = [imgW, imgH];
  } else {
    base = PAGE_SIZES[settings.pageSize];
  }
  let [pw, ph] = base;

  const wantLandscape =
    settings.orientation === "landscape" ||
    (settings.orientation === "auto" && imgW > imgH);
  if (wantLandscape && ph > pw) [pw, ph] = [ph, pw];
  if (
    settings.orientation === "portrait" &&
    pw > ph
  )
    [pw, ph] = [ph, pw];

  return { pageW: pw, pageH: ph };
}

function computePlacement(
  imgW: number,
  imgH: number,
  pageW: number,
  pageH: number,
  margin: number,
  fit: ImageFit,
): { x: number; y: number; w: number; h: number } {
  const areaW = Math.max(1, pageW - margin * 2);
  const areaH = Math.max(1, pageH - margin * 2);

  let w = imgW;
  let h = imgH;

  switch (fit) {
    case "original": {
      // limit by area to prevent overflow
      const s = Math.min(1, Math.min(areaW / imgW, areaH / imgH));
      w = imgW * s;
      h = imgH * s;
      break;
    }
    case "fit-width": {
      const s = areaW / imgW;
      w = areaW;
      h = imgH * s;
      if (h > areaH) {
        const s2 = areaH / h;
        w *= s2;
        h *= s2;
      }
      break;
    }
    case "fit-height": {
      const s = areaH / imgH;
      h = areaH;
      w = imgW * s;
      if (w > areaW) {
        const s2 = areaW / w;
        w *= s2;
        h *= s2;
      }
      break;
    }
    case "fill": {
      w = areaW;
      h = areaH;
      break;
    }
    case "center":
    default: {
      const s = Math.min(areaW / imgW, areaH / imgH, 1);
      w = imgW * s;
      h = imgH * s;
      break;
    }
  }

  const x = margin + (areaW - w) / 2;
  const y = margin + (areaH - h) / 2;
  return { x, y, w, h };
}

export type Progress = (done: number, total: number) => void;

export async function generatePdf(
  items: ImageItem[],
  settings: PdfSettings,
  onProgress?: Progress,
): Promise<Blob> {
  if (items.length === 0) throw new Error("No images to convert");

  const quality = COMPRESSION_QUALITY[settings.compression];
  const maxDim = COMPRESSION_MAX_DIM[settings.compression];
  const margin = MARGIN_PT[settings.margin];

  let doc: jsPDF | null = null;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const raster = await rasterize(item, settings.background, quality, maxDim);
    const { pageW, pageH } = resolvePageDims(raster.width, raster.height, settings);

    if (!doc) {
      doc = new jsPDF({
        orientation: pageW > pageH ? "landscape" : "portrait",
        unit: "pt",
        format: [pageW, pageH],
        compress: true,
      });
    } else {
      doc.addPage([pageW, pageH], pageW > pageH ? "landscape" : "portrait");
    }

    // Background
    doc.setFillColor(settings.background);
    doc.rect(0, 0, pageW, pageH, "F");

    const placement = computePlacement(
      raster.width,
      raster.height,
      pageW,
      pageH,
      margin,
      settings.fit,
    );

    doc.addImage(
      raster.dataUrl,
      "JPEG",
      placement.x,
      placement.y,
      placement.w,
      placement.h,
      undefined,
      "FAST",
    );

    onProgress?.(i + 1, items.length);
    // yield to UI
    await new Promise((r) => setTimeout(r, 0));
  }

  return doc!.output("blob");
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}
