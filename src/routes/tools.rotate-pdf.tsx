import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { degrees, PDFDocument } from "pdf-lib";
import {
  Download,
  Loader2,
  RotateCcw,
  RotateCw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { PdfDropzone } from "@/components/pdf-dropzone";
import { ToolHeader, ToolLayout } from "@/components/tool-shell";
import { AdPlaceholder } from "@/components/ad-placeholder";
import { cn } from "@/lib/utils";
import {
  downloadBlob,
  formatBytes,
  friendlyPdfError,
  loadPdfDocument,
  renderPageThumb,
  timestampName,
} from "@/lib/pdf-common";

export const Route = createFileRoute("/tools/rotate-pdf")({
  head: () => ({
    meta: [
      { title: "Rotate PDF — Free Browser Tool — PDFMaker" },
      {
        name: "description",
        content:
          "Rotate one, several or every page of a PDF by 90°, 180° or 270°. Preview thumbnails and save in your browser.",
      },
    ],
  }),
  component: RotatePdfPage,
});

type Thumb = { page: number; dataUrl: string; width: number; height: number };

function RotatePdfPage() {
  const [file, setFile] = useState<File | null>(null);
  const [thumbs, setThumbs] = useState<Thumb[]>([]);
  const [rotations, setRotations] = useState<number[]>([]); // index-aligned degrees
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const cancelRef = useRef(false);

  const onFiles = useCallback(async (files: File[]) => {
    const f = files[0];
    setFile(f);
    setThumbs([]);
    setRotations([]);
    setLoading(true);
    try {
      const buf = await f.arrayBuffer();
      const doc = await loadPdfDocument(buf);
      const count = doc.numPages;
      setRotations(new Array(count).fill(0));
      const list: Thumb[] = [];
      for (let i = 1; i <= count; i++) {
        const t = await renderPageThumb(doc, i, 200);
        list.push({ page: i, ...t });
        if (i % 4 === 0) setThumbs([...list]);
      }
      setThumbs(list);
    } catch (e) {
      toast.error("Could not open PDF", { description: friendlyPdfError(e) });
      setFile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const rotate = (idx: number, delta: number) =>
    setRotations((prev) =>
      prev.map((r, i) => (i === idx ? (((r + delta) % 360) + 360) % 360 : r)),
    );

  const rotateAll = (delta: number) =>
    setRotations((prev) => prev.map((r) => (((r + delta) % 360) + 360) % 360));

  const reset = () => setRotations((p) => p.map(() => 0));

  const save = async () => {
    if (!file) return;
    setProcessing(true);
    cancelRef.current = false;
    try {
      const buf = await file.arrayBuffer();
      const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
      const pages = doc.getPages();
      pages.forEach((page, i) => {
        const current = page.getRotation().angle;
        const next = (current + (rotations[i] ?? 0)) % 360;
        page.setRotation(degrees(next));
      });
      const bytes = await doc.save();
      const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
      downloadBlob(blob, timestampName("rotated"));
      toast.success("Rotated PDF ready — download started.");
    } catch (e) {
      toast.error("Rotation failed", { description: friendlyPdfError(e) });
    } finally {
      setProcessing(false);
    }
  };

  useEffect(() => {
    if (!processing) cancelRef.current = false;
  }, [processing]);

  const clear = () => {
    setFile(null);
    setThumbs([]);
    setRotations([]);
  };

  const hasChanges = rotations.some((r) => r !== 0);

  return (
    <>
      <ToolHeader
        icon={RotateCw}
        title="Rotate PDF"
        description="Rotate the whole document or individual pages by 90°, 180° or 270°. Preview the result before you save."
      />
      <ToolLayout>
        {!file && (
          <PdfDropzone
            onFiles={onFiles}
            title="Drop a PDF here, or click to browse"
            subtitle="One PDF at a time · rotate any or all pages"
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
                  {thumbs.length || "…"} page
                  {thumbs.length === 1 ? "" : "s"} · {formatBytes(file.size)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => rotateAll(-90)}>
                  <RotateCcw className="mr-1.5 h-4 w-4" />
                  Rotate all left
                </Button>
                <Button size="sm" variant="outline" onClick={() => rotateAll(90)}>
                  <RotateCw className="mr-1.5 h-4 w-4" />
                  Rotate all right
                </Button>
                <Button size="sm" variant="ghost" onClick={reset} disabled={!hasChanges}>
                  Reset
                </Button>
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
            </div>
          </div>
        )}

        {loading && (
          <div className="glass-panel rounded-2xl p-4 sm:p-6">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              Rendering page previews…
            </div>
          </div>
        )}

        {thumbs.length > 0 && (
          <div className="glass-panel rounded-2xl p-4 sm:p-6">
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {thumbs.map((t, i) => (
                <li
                  key={t.page}
                  className="group relative flex flex-col overflow-hidden rounded-xl border border-border/70 bg-background/70"
                >
                  <div className="relative flex aspect-[3/4] items-center justify-center overflow-hidden bg-muted/40">
                    <img
                      src={t.dataUrl}
                      alt={`Page ${t.page}`}
                      className="max-h-full max-w-full object-contain transition-transform duration-200"
                      style={{ transform: `rotate(${rotations[i] ?? 0}deg)` }}
                    />
                    <span className="absolute left-1.5 top-1.5 rounded-md bg-background/80 px-1.5 py-0.5 text-[10px] font-semibold text-foreground shadow-sm backdrop-blur">
                      {t.page}
                    </span>
                    {rotations[i] !== 0 && (
                      <span className="absolute right-1.5 top-1.5 rounded-md bg-primary/90 px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground shadow-sm">
                        {rotations[i]}°
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-center gap-1 border-t border-border/60 bg-background/70 p-1.5">
                    <button
                      type="button"
                      onClick={() => rotate(i, -90)}
                      aria-label={`Rotate page ${t.page} left`}
                      className={cn(
                        "grid h-7 w-7 place-items-center rounded text-muted-foreground hover:bg-accent hover:text-foreground",
                      )}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => rotate(i, 90)}
                      aria-label={`Rotate page ${t.page} right`}
                      className="grid h-7 w-7 place-items-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
                    >
                      <RotateCw className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {file && (
          <div className="sticky bottom-4 z-10">
            <div className="glass-panel flex flex-wrap items-center justify-between gap-3 rounded-2xl p-3 sm:p-4">
              <div className="text-sm text-muted-foreground">
                {hasChanges
                  ? `${rotations.filter((r) => r !== 0).length} page(s) will be rotated`
                  : "Rotate pages above, then save."}
              </div>
              <Button
                onClick={save}
                disabled={processing || thumbs.length === 0}
                size="lg"
                className="bg-gradient-primary text-primary-foreground shadow-[0_10px_24px_-12px_rgb(37_99_235_/_0.55)] hover:opacity-95"
              >
                {processing ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Download className="mr-1.5 h-4 w-4" />
                    Save rotated PDF
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
