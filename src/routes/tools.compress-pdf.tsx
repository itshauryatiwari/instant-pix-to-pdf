import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useRef, useState } from "react";
import { PDFDocument } from "pdf-lib";
import {
  Check,
  Download,
  Loader2,
  Minimize2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PdfDropzone } from "@/components/pdf-dropzone";
import { ToolHeader, ToolLayout } from "@/components/tool-shell";
import { AdPlaceholder } from "@/components/ad-placeholder";
import { cn } from "@/lib/utils";
import {
  downloadBlob,
  formatBytes,
  friendlyPdfError,
  loadPdfDocument,
  timestampName,
} from "@/lib/pdf-common";

export const Route = createFileRoute("/tools/compress-pdf")({
  head: () => ({
    meta: [
      { title: "Compress PDF — Free Browser Tool — PDFMaker" },
      {
        name: "description",
        content:
          "Reduce PDF file size in your browser. Choose maximum quality, balanced, or maximum compression.",
      },
    ],
  }),
  component: CompressPdfPage,
});

type Level = "quality" | "balanced" | "max";

const LEVELS: Record<Level, { dpi: number; quality: number; label: string; desc: string }> = {
  quality: { dpi: 150, quality: 0.9, label: "Maximum quality", desc: "Light compression, best fidelity" },
  balanced: { dpi: 110, quality: 0.75, label: "Balanced", desc: "Good size vs quality — recommended" },
  max: { dpi: 72, quality: 0.55, label: "Maximum compression", desc: "Smallest file, softer images" },
};

function CompressPdfPage() {
  const [file, setFile] = useState<File | null>(null);
  const [level, setLevel] = useState<Level>("balanced");
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [result, setResult] = useState<{
    blob: Blob;
    filename: string;
    originalSize: number;
    newSize: number;
  } | null>(null);
  const cancelRef = useRef(false);

  const onFiles = useCallback((files: File[]) => {
    setFile(files[0]);
    setResult(null);
  }, []);

  const compress = async () => {
    if (!file) return;
    setProcessing(true);
    setResult(null);
    cancelRef.current = false;
    const { dpi, quality } = LEVELS[level];
    try {
      const buf = await file.arrayBuffer();
      const src = await loadPdfDocument(buf);
      const total = src.numPages;
      setProgress({ done: 0, total });

      const out = await PDFDocument.create();
      for (let i = 1; i <= total; i++) {
        if (cancelRef.current) throw new Error("cancelled");
        const page = await src.getPage(i);
        const vp1 = page.getViewport({ scale: 1 });
        const scale = dpi / 72;
        const vp = page.getViewport({ scale });
        const canvas = document.createElement("canvas");
        canvas.width = Math.ceil(vp.width);
        canvas.height = Math.ceil(vp.height);
        const ctx = canvas.getContext("2d")!;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: ctx, viewport: vp, canvas }).promise;
        const jpegDataUrl = canvas.toDataURL("image/jpeg", quality);
        const jpegBytes = dataUrlToBytes(jpegDataUrl);
        canvas.width = 0;
        canvas.height = 0;
        page.cleanup();

        const img = await out.embedJpg(jpegBytes);
        const newPage = out.addPage([vp1.width, vp1.height]);
        newPage.drawImage(img, {
          x: 0,
          y: 0,
          width: vp1.width,
          height: vp1.height,
        });
        setProgress({ done: i, total });
        await new Promise((r) => setTimeout(r, 0));
      }

      const bytes = await out.save();
      const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
      const filename = timestampName("compressed");
      setResult({
        blob,
        filename,
        originalSize: file.size,
        newSize: blob.size,
      });
      downloadBlob(blob, filename);
      toast.success("Compressed PDF ready — download started.");
    } catch (e) {
      const msg = friendlyPdfError(e);
      if (msg === "Operation cancelled.") toast.message(msg);
      else toast.error("Compression failed", { description: msg });
    } finally {
      setProcessing(false);
    }
  };

  const clear = () => {
    setFile(null);
    setResult(null);
  };

  const savings =
    result && result.originalSize > 0
      ? Math.round(((result.originalSize - result.newSize) / result.originalSize) * 100)
      : 0;

  return (
    <>
      <ToolHeader
        icon={Minimize2}
        title="Compress PDF"
        description="Rasterize each page to a compressed image and rebuild a smaller PDF. Actual output size depends on the source — we show it after processing, not estimated."
      />
      <ToolLayout>
        {!file && (
          <PdfDropzone
            onFiles={onFiles}
            title="Drop a PDF here, or click to browse"
            subtitle="One PDF at a time"
          />
        )}

        {file && (
          <div className="glass-panel rounded-2xl p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {file.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  Original size: {formatBytes(file.size)}
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={clear}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="mr-1.5 h-4 w-4" />
                Clear
              </Button>
            </div>

            <div className="mt-5">
              <Label className="text-xs font-medium text-muted-foreground">
                Compression level
              </Label>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {(Object.keys(LEVELS) as Level[]).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setLevel(k)}
                    className={cn(
                      "flex flex-col items-start rounded-xl border border-border/70 bg-background/70 p-3 text-left transition-all hover:border-primary/50",
                      level === k && "border-primary ring-2 ring-primary/30",
                    )}
                  >
                    <span className="text-sm font-medium text-foreground">
                      {LEVELS[k].label}
                    </span>
                    <span className="mt-0.5 text-xs text-muted-foreground">
                      {LEVELS[k].desc}
                    </span>
                  </button>
                ))}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Actual output size can't be reliably estimated in the browser without
                doing the work — we'll show the real result when it finishes.
              </p>
            </div>
          </div>
        )}

        {processing && (
          <div className="glass-panel rounded-2xl p-4 sm:p-6">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  Compressing… {progress.done} / {progress.total} page
                  {progress.total === 1 ? "" : "s"}
                </p>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-gradient-primary transition-all"
                    style={{
                      width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => (cancelRef.current = true)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {result && !processing && (
          <div className="glass-panel rounded-2xl p-4 sm:p-6">
            <div className="flex flex-wrap items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-emerald-500/15 text-emerald-700">
                <Check className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">
                  Compressed PDF ready
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatBytes(result.originalSize)} → {formatBytes(result.newSize)}{" "}
                  ({savings >= 0 ? `${savings}% smaller` : `${-savings}% larger`})
                </p>
              </div>
              <a
                href={URL.createObjectURL(result.blob)}
                download={result.filename}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-gradient-primary px-5 text-sm font-medium text-primary-foreground shadow-[0_10px_24px_-12px_rgb(37_99_235_/_0.55)] transition-opacity hover:opacity-95"
              >
                <Download className="h-4 w-4" />
                Download
              </a>
            </div>
            {savings < 0 && (
              <p className="mt-3 text-xs text-muted-foreground">
                Your PDF was already highly optimized. Try Maximum compression, or leave the original as-is.
              </p>
            )}
          </div>
        )}

        {file && (
          <div className="sticky bottom-4 z-10">
            <div className="glass-panel flex flex-wrap items-center justify-between gap-3 rounded-2xl p-3 sm:p-4">
              <div className="text-sm text-muted-foreground">
                {processing
                  ? "Working…"
                  : `Ready with ${LEVELS[level].label.toLowerCase()}`}
              </div>
              <Button
                onClick={compress}
                disabled={processing}
                size="lg"
                className="bg-gradient-primary text-primary-foreground shadow-[0_10px_24px_-12px_rgb(37_99_235_/_0.55)] hover:opacity-95"
              >
                {processing ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    Compressing…
                  </>
                ) : (
                  <>
                    <Minimize2 className="mr-1.5 h-4 w-4" />
                    Compress PDF
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        <div className="pt-2">
          <AdPlaceholder slot="bottom-banner" />
        </div>
      </ToolLayout>
    </>
  );
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(",")[1] ?? "";
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}
