import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useMemo, useRef, useState } from "react";
import JSZip from "jszip";
import {
  Download,
  Image as ImageIcon,
  Loader2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PdfDropzone } from "@/components/pdf-dropzone";
import { ToolHeader, ToolLayout } from "@/components/tool-shell";
import { AdPlaceholder } from "@/components/ad-placeholder";
import { cn } from "@/lib/utils";
import {
  downloadBlob,
  formatBytes,
  friendlyPdfError,
  loadPdfDocument,
  renderPageBlob,
  renderPageThumb,
} from "@/lib/pdf-common";

export const Route = createFileRoute("/tools/pdf-to-image")({
  head: () => ({
    meta: [
      { title: "PDF to Image — Free Browser Converter — PDFMaker" },
      {
        name: "description",
        content:
          "Convert PDF pages to PNG, JPEG or WEBP images. Choose resolution and quality, export all or selected pages, download as ZIP.",
      },
    ],
  }),
  component: PdfToImagePage,
});

type Fmt = "image/png" | "image/jpeg" | "image/webp";
const EXT: Record<Fmt, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

function PdfToImagePage() {
  const [file, setFile] = useState<File | null>(null);
  const [thumbs, setThumbs] = useState<{ page: number; dataUrl: string }[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const cancelRef = useRef(false);

  const [format, setFormat] = useState<Fmt>("image/png");
  const [dpi, setDpi] = useState<number>(150);
  const [quality, setQuality] = useState<number>(0.9);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [scope, setScope] = useState<"all" | "selected">("all");

  const onFiles = useCallback(async (files: File[]) => {
    const f = files[0];
    setFile(f);
    setThumbs([]);
    setSelected(new Set());
    setLoading(true);
    try {
      const buf = await f.arrayBuffer();
      const doc = await loadPdfDocument(buf);
      setTotal(doc.numPages);
      const list: { page: number; dataUrl: string }[] = [];
      for (let i = 1; i <= doc.numPages; i++) {
        const t = await renderPageThumb(doc, i, 180);
        list.push({ page: i, dataUrl: t.dataUrl });
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

  const toggle = (n: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });

  const pagesToExport = useMemo(() => {
    if (scope === "all") return Array.from({ length: total }, (_, i) => i + 1);
    return Array.from(selected).sort((a, b) => a - b);
  }, [scope, selected, total]);

  const exportImages = async () => {
    if (!file || pagesToExport.length === 0) {
      toast.error("Nothing to export");
      return;
    }
    setProcessing(true);
    setProgress({ done: 0, total: pagesToExport.length });
    cancelRef.current = false;
    try {
      const buf = await file.arrayBuffer();
      const doc = await loadPdfDocument(buf);
      const base = file.name.replace(/\.pdf$/i, "");
      const ext = EXT[format];
      const results: { name: string; blob: Blob }[] = [];
      for (let idx = 0; idx < pagesToExport.length; idx++) {
        if (cancelRef.current) throw new Error("cancelled");
        const p = pagesToExport[idx];
        const blob = await renderPageBlob(doc, p, dpi, format, quality);
        results.push({ name: `${base}_page-${p}.${ext}`, blob });
        setProgress({ done: idx + 1, total: pagesToExport.length });
        await new Promise((r) => setTimeout(r, 0));
      }
      if (results.length === 1) {
        downloadBlob(results[0].blob, results[0].name);
      } else {
        const zip = new JSZip();
        for (const r of results) zip.file(r.name, r.blob);
        const zipped = await zip.generateAsync({ type: "blob" });
        downloadBlob(zipped, `${base}_images.zip`);
      }
      toast.success(
        `Exported ${results.length} image${results.length > 1 ? "s" : ""}.`,
      );
    } catch (e) {
      const msg = friendlyPdfError(e);
      if (msg === "Operation cancelled.") toast.message(msg);
      else toast.error("Export failed", { description: msg });
    } finally {
      setProcessing(false);
    }
  };

  const clear = () => {
    setFile(null);
    setThumbs([]);
    setSelected(new Set());
    setTotal(0);
  };

  return (
    <>
      <ToolHeader
        icon={ImageIcon}
        title="PDF to Image"
        description="Export every page (or just the ones you pick) as PNG, JPEG or WEBP. Choose resolution and quality."
      />
      <ToolLayout>
        {!file && (
          <PdfDropzone
            onFiles={onFiles}
            title="Drop a PDF here, or click to browse"
            subtitle="One PDF at a time · export all or selected pages"
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
                  {total} page{total === 1 ? "" : "s"} · {formatBytes(file.size)}
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

            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium text-muted-foreground">
                  Format
                </Label>
                <Select value={format} onValueChange={(v) => setFormat(v as Fmt)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="image/png">PNG (lossless)</SelectItem>
                    <SelectItem value="image/jpeg">JPEG (smaller)</SelectItem>
                    <SelectItem value="image/webp">WEBP (modern)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium text-muted-foreground">
                  Resolution
                </Label>
                <Select value={String(dpi)} onValueChange={(v) => setDpi(Number(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="72">72 DPI (screen)</SelectItem>
                    <SelectItem value="100">100 DPI</SelectItem>
                    <SelectItem value="150">150 DPI (recommended)</SelectItem>
                    <SelectItem value="200">200 DPI</SelectItem>
                    <SelectItem value="300">300 DPI (print)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium text-muted-foreground">
                  Quality {format === "image/png" ? "(N/A for PNG)" : ""}
                </Label>
                <Select
                  value={String(quality)}
                  onValueChange={(v) => setQuality(Number(v))}
                  disabled={format === "image/png"}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0.6">Low</SelectItem>
                    <SelectItem value="0.75">Medium</SelectItem>
                    <SelectItem value="0.9">High</SelectItem>
                    <SelectItem value="1">Maximum</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium text-muted-foreground">
                  Pages
                </Label>
                <Select
                  value={scope}
                  onValueChange={(v) => setScope(v as "all" | "selected")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All pages</SelectItem>
                    <SelectItem value="selected">
                      Selected only ({selected.size})
                    </SelectItem>
                  </SelectContent>
                </Select>
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
            <p className="mb-3 text-xs text-muted-foreground">
              {scope === "selected"
                ? "Click thumbnails to include them in the export."
                : "All pages will be exported. Switch to “Selected only” to pick specific pages."}
            </p>
            <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
              {thumbs.map((t) => {
                const isSel = selected.has(t.page);
                const active = scope === "all" || isSel;
                return (
                  <li key={t.page}>
                    <button
                      type="button"
                      onClick={() => scope === "selected" && toggle(t.page)}
                      disabled={scope !== "selected"}
                      className={cn(
                        "relative block w-full overflow-hidden rounded-xl border border-border/70 bg-background/70 transition-all",
                        scope === "selected" && "cursor-pointer hover:border-primary/60",
                        isSel && "border-primary ring-2 ring-primary/40",
                        !active && "opacity-50",
                      )}
                    >
                      <div className="relative flex aspect-[3/4] items-center justify-center overflow-hidden bg-muted/40">
                        <img
                          src={t.dataUrl}
                          alt={`Page ${t.page}`}
                          className="max-h-full max-w-full object-contain"
                        />
                        <span className="absolute left-1.5 top-1.5 rounded-md bg-background/80 px-1.5 py-0.5 text-[10px] font-semibold text-foreground shadow-sm backdrop-blur">
                          {t.page}
                        </span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {processing && (
          <div className="glass-panel rounded-2xl p-4 sm:p-6">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  Exporting {progress.done} / {progress.total} image
                  {progress.total === 1 ? "" : "s"}…
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

        {file && (
          <div className="sticky bottom-4 z-10">
            <div className="glass-panel flex flex-wrap items-center justify-between gap-3 rounded-2xl p-3 sm:p-4">
              <div className="text-sm text-muted-foreground">
                {pagesToExport.length === 0
                  ? "Select at least one page."
                  : `Exporting ${pagesToExport.length} page${pagesToExport.length === 1 ? "" : "s"} as ${EXT[format].toUpperCase()}`}
              </div>
              <Button
                onClick={exportImages}
                disabled={processing || pagesToExport.length === 0}
                size="lg"
                className="bg-gradient-primary text-primary-foreground shadow-[0_10px_24px_-12px_rgb(37_99_235_/_0.55)] hover:opacity-95"
              >
                {processing ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    Exporting…
                  </>
                ) : (
                  <>
                    <Download className="mr-1.5 h-4 w-4" />
                    Export images
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
