import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { PDFDocument } from "pdf-lib";
import JSZip from "jszip";
import {
  Download,
  Loader2,
  Scissors,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  parseRanges,
  renderPageThumb,
} from "@/lib/pdf-common";

export const Route = createFileRoute("/tools/split-pdf")({
  head: () => ({
    meta: [
      { title: "Split PDF — Free Browser Tool — PDFMaker" },
      {
        name: "description",
        content:
          "Split a PDF into single pages, custom ranges, or extract selected pages. Download individually or as a ZIP.",
      },
    ],
  }),
  component: SplitPdfPage,
});

type Mode = "single" | "ranges" | "every" | "extract";
type Thumb = { page: number; dataUrl: string };

function SplitPdfPage() {
  const [file, setFile] = useState<File | null>(null);
  const [thumbs, setThumbs] = useState<Thumb[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const cancelRef = useRef(false);

  const [mode, setMode] = useState<Mode>("single");
  const [ranges, setRanges] = useState("1-3, 5");
  const [every, setEvery] = useState(1);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const onFiles = useCallback(async (files: File[]) => {
    const f = files[0];
    setFile(f);
    setThumbs([]);
    setSelected(new Set());
    setLoading(true);
    try {
      const buf = await f.arrayBuffer();
      const doc = await loadPdfDocument(buf);
      setTotalPages(doc.numPages);
      const list: Thumb[] = [];
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

  const groups = useMemo<number[][]>(() => {
    if (!totalPages) return [];
    try {
      if (mode === "single") {
        return Array.from({ length: totalPages }, (_, i) => [i + 1]);
      }
      if (mode === "ranges") {
        return ranges
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .map((r) => parseRanges(r, totalPages))
          .filter((arr) => arr.length > 0);
      }
      if (mode === "every") {
        const step = Math.max(1, every);
        const out: number[][] = [];
        for (let i = 1; i <= totalPages; i += step) {
          const chunk: number[] = [];
          for (let j = i; j < i + step && j <= totalPages; j++) chunk.push(j);
          out.push(chunk);
        }
        return out;
      }
      if (mode === "extract") {
        const arr = Array.from(selected).sort((a, b) => a - b);
        return arr.length ? [arr] : [];
      }
    } catch {
      return [];
    }
    return [];
  }, [mode, totalPages, ranges, every, selected]);

  const totalOutputs = groups.length;

  const split = async () => {
    if (!file) return;
    if (totalOutputs === 0) {
      toast.error("Nothing to split", {
        description: "Configure the split above and try again.",
      });
      return;
    }
    setProcessing(true);
    cancelRef.current = false;
    try {
      const buf = await file.arrayBuffer();
      const src = await PDFDocument.load(buf, { ignoreEncryption: true });
      const baseName = file.name.replace(/\.pdf$/i, "");
      const outputs: { name: string; bytes: Uint8Array }[] = [];
      for (let g = 0; g < groups.length; g++) {
        if (cancelRef.current) throw new Error("cancelled");
        const pages = groups[g];
        const out = await PDFDocument.create();
        const copied = await out.copyPages(
          src,
          pages.map((p) => p - 1),
        );
        copied.forEach((p) => out.addPage(p));
        const bytes = await out.save();
        const label =
          pages.length === 1
            ? `${pages[0]}`
            : `${pages[0]}-${pages[pages.length - 1]}`;
        outputs.push({ name: `${baseName}_pages-${label}.pdf`, bytes });
        await new Promise((r) => setTimeout(r, 0));
      }
      if (outputs.length === 1) {
        downloadBlob(
          new Blob([outputs[0].bytes as BlobPart], { type: "application/pdf" }),
          outputs[0].name,
        );
      } else {
        const zip = new JSZip();
        outputs.forEach((o) => zip.file(o.name, o.bytes));
        const blob = await zip.generateAsync({ type: "blob" });
        downloadBlob(blob, `${baseName}_split.zip`);
      }
      toast.success(
        `Split into ${outputs.length} file${outputs.length > 1 ? "s" : ""} — download started.`,
      );
    } catch (e) {
      const msg = friendlyPdfError(e);
      if (msg === "Operation cancelled.") toast.message(msg);
      else toast.error("Split failed", { description: msg });
    } finally {
      setProcessing(false);
    }
  };

  const clear = () => {
    setFile(null);
    setThumbs([]);
    setSelected(new Set());
    setTotalPages(0);
  };

  return (
    <>
      <ToolHeader
        icon={Scissors}
        title="Split PDF"
        description="Split by single pages, custom ranges, every N pages, or extract just the pages you pick. Downloads as ZIP when multiple."
      />
      <ToolLayout>
        {!file && (
          <PdfDropzone
            onFiles={onFiles}
            title="Drop a PDF here, or click to browse"
            subtitle="One PDF at a time · choose how to split"
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
                  {totalPages} page{totalPages === 1 ? "" : "s"} ·{" "}
                  {formatBytes(file.size)}
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

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium text-muted-foreground">
                  Split mode
                </Label>
                <Select value={mode} onValueChange={(v) => setMode(v as Mode)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">Every page → its own PDF</SelectItem>
                    <SelectItem value="ranges">Custom ranges (e.g. 1-3, 5)</SelectItem>
                    <SelectItem value="every">Every N pages</SelectItem>
                    <SelectItem value="extract">Extract selected pages</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {mode === "ranges" && (
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Ranges (comma separates output files)
                  </Label>
                  <Input
                    value={ranges}
                    onChange={(e) => setRanges(e.target.value)}
                    placeholder="1-3, 5, 7-9"
                  />
                </div>
              )}
              {mode === "every" && (
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Pages per file
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    max={totalPages || 1}
                    value={every}
                    onChange={(e) =>
                      setEvery(Math.max(1, parseInt(e.target.value || "1", 10)))
                    }
                  />
                </div>
              )}
              {mode === "extract" && (
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Selection
                  </Label>
                  <div className="text-sm text-muted-foreground">
                    {selected.size} page{selected.size === 1 ? "" : "s"} selected — click thumbnails below
                  </div>
                </div>
              )}
            </div>

            <p className="mt-3 text-xs text-muted-foreground">
              Will produce{" "}
              <span className="font-medium text-foreground">
                {totalOutputs} output file{totalOutputs === 1 ? "" : "s"}
              </span>
              .
            </p>
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
            <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
              {thumbs.map((t) => {
                const isSel = selected.has(t.page);
                return (
                  <li key={t.page}>
                    <button
                      type="button"
                      onClick={() => mode === "extract" && toggle(t.page)}
                      disabled={mode !== "extract"}
                      className={cn(
                        "group relative flex w-full flex-col overflow-hidden rounded-xl border border-border/70 bg-background/70 text-left transition-all",
                        mode === "extract" && "cursor-pointer hover:border-primary/60",
                        isSel && "border-primary ring-2 ring-primary/40",
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
                        {isSel && (
                          <span className="absolute right-1.5 top-1.5 rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground shadow-sm">
                            ✓
                          </span>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {file && (
          <div className="sticky bottom-4 z-10">
            <div className="glass-panel flex flex-wrap items-center justify-between gap-3 rounded-2xl p-3 sm:p-4">
              <div className="text-sm text-muted-foreground">
                {totalOutputs === 0
                  ? "Configure the split above."
                  : `Will produce ${totalOutputs} file${totalOutputs === 1 ? "" : "s"}`}
              </div>
              <div className="flex gap-2">
                {processing && (
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => (cancelRef.current = true)}
                  >
                    Cancel
                  </Button>
                )}
                <Button
                  onClick={split}
                  disabled={processing || totalOutputs === 0}
                  size="lg"
                  className="bg-gradient-primary text-primary-foreground shadow-[0_10px_24px_-12px_rgb(37_99_235_/_0.55)] hover:opacity-95"
                >
                  {processing ? (
                    <>
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                      Splitting…
                    </>
                  ) : (
                    <>
                      <Download className="mr-1.5 h-4 w-4" />
                      Split PDF
                    </>
                  )}
                </Button>
              </div>
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
