import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { PDFDocument } from "pdf-lib";
import { Download, FileOutput, Loader2, Trash2 } from "lucide-react";
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
  timestampName,
} from "@/lib/pdf-common";

export const Route = createFileRoute("/tools/extract-pages")({
  head: () => ({
    meta: [
      { title: "Extract PDF Pages — Free Browser Tool — PDFMaker" },
      {
        name: "description",
        content:
          "Extract selected pages, page ranges, odd, even, first or last pages from a PDF into a new document — entirely in your browser.",
      },
      { property: "og:title", content: "Extract PDF Pages — PDFMaker" },
      {
        property: "og:description",
        content: "Pull the pages you need out of a PDF, all in your browser.",
      },
    ],
    links: [{ rel: "canonical", href: "/tools/extract-pages" }],
  }),
  component: ExtractPage,
});

type Mode = "selected" | "ranges" | "odd" | "even" | "first" | "last";
type Thumb = { page: number; dataUrl: string };

function ExtractPage() {
  const [file, setFile] = useState<File | null>(null);
  const [thumbs, setThumbs] = useState<Thumb[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [mode, setMode] = useState<Mode>("selected");
  const [ranges, setRanges] = useState("1-3, 5");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const cancelRef = useRef(false);

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

  const pages = useMemo<number[]>(() => {
    if (!total) return [];
    try {
      switch (mode) {
        case "selected":
          return Array.from(selected).sort((a, b) => a - b);
        case "ranges":
          return parseRanges(ranges, total);
        case "odd":
          return Array.from({ length: total }, (_, i) => i + 1).filter((n) => n % 2 === 1);
        case "even":
          return Array.from({ length: total }, (_, i) => i + 1).filter((n) => n % 2 === 0);
        case "first":
          return [1];
        case "last":
          return [total];
      }
    } catch {
      return [];
    }
  }, [mode, total, ranges, selected]);

  const toggle = (n: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });

  const save = async () => {
    if (!file) return;
    if (pages.length === 0) {
      toast.error("No pages selected");
      return;
    }
    setProcessing(true);
    cancelRef.current = false;
    try {
      const buf = await file.arrayBuffer();
      const src = await PDFDocument.load(buf, { ignoreEncryption: true });
      const out = await PDFDocument.create();
      const copied = await out.copyPages(src, pages.map((p) => p - 1));
      copied.forEach((p) => {
        if (cancelRef.current) throw new Error("cancelled");
        out.addPage(p);
      });
      const bytes = await out.save();
      downloadBlob(new Blob([bytes as BlobPart], { type: "application/pdf" }), timestampName("extracted"));
      toast.success(`Extracted ${pages.length} page${pages.length === 1 ? "" : "s"}.`);
    } catch (e) {
      const msg = friendlyPdfError(e);
      if (msg === "Operation cancelled.") toast.message(msg);
      else toast.error("Extract failed", { description: msg });
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

  const selectableThumbs = mode === "selected";
  const isPageIncluded = (n: number) => pages.includes(n);

  return (
    <>
      <ToolHeader
        icon={FileOutput}
        title="Extract PDF Pages"
        description="Grab specific pages, ranges, odd or even pages from a PDF and save them as a new document."
      />
      <ToolLayout>
        {!file && (
          <PdfDropzone
            onFiles={onFiles}
            title="Drop a PDF here, or click to browse"
            subtitle="One PDF at a time · extract the pages you need"
          />
        )}

        {file && (
          <div className="glass-panel rounded-2xl p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {total} page{total === 1 ? "" : "s"} · {formatBytes(file.size)}
                </p>
              </div>
              <Button size="sm" variant="ghost" onClick={clear} className="text-muted-foreground hover:text-destructive">
                <Trash2 className="mr-1.5 h-4 w-4" /> Reset
              </Button>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Extract mode</Label>
                <Select value={mode} onValueChange={(v) => setMode(v as Mode)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="selected">Selected pages (click below)</SelectItem>
                    <SelectItem value="ranges">Custom ranges (e.g. 1-3, 5)</SelectItem>
                    <SelectItem value="odd">Odd pages only</SelectItem>
                    <SelectItem value="even">Even pages only</SelectItem>
                    <SelectItem value="first">First page only</SelectItem>
                    <SelectItem value="last">Last page only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {mode === "ranges" && (
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Page ranges</Label>
                  <Input value={ranges} onChange={(e) => setRanges(e.target.value)} placeholder="1-3, 5, 7-9" />
                </div>
              )}
            </div>

            <p className="mt-3 text-xs text-muted-foreground">
              Will extract{" "}
              <span className="font-medium text-foreground">
                {pages.length} page{pages.length === 1 ? "" : "s"}
              </span>
              .
            </p>
          </div>
        )}

        {loading && (
          <div className="glass-panel rounded-2xl p-4 sm:p-6">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" /> Rendering previews…
            </div>
          </div>
        )}

        {thumbs.length > 0 && (
          <div className="glass-panel rounded-2xl p-4 sm:p-6">
            <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
              {thumbs.map((t) => {
                const included = isPageIncluded(t.page);
                return (
                  <li key={t.page}>
                    <button
                      type="button"
                      onClick={() => selectableThumbs && toggle(t.page)}
                      disabled={!selectableThumbs}
                      className={cn(
                        "group relative flex w-full flex-col overflow-hidden rounded-xl border border-border/70 bg-background/70 text-left transition-all",
                        selectableThumbs && "cursor-pointer hover:border-primary/60",
                        included && "border-primary ring-2 ring-primary/40",
                      )}
                    >
                      <div className="relative flex aspect-[3/4] items-center justify-center overflow-hidden bg-muted/40">
                        <img src={t.dataUrl} alt={`Page ${t.page}`} className="max-h-full max-w-full object-contain" />
                        <span className="absolute left-1.5 top-1.5 rounded-md bg-background/80 px-1.5 py-0.5 text-[10px] font-semibold text-foreground shadow-sm backdrop-blur">
                          {t.page}
                        </span>
                        {included && (
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
                {pages.length === 0 ? "Choose pages to extract." : `${pages.length} page(s) → new PDF`}
              </div>
              <div className="flex gap-2">
                {processing && (
                  <Button variant="outline" size="lg" onClick={() => (cancelRef.current = true)}>Cancel</Button>
                )}
                <Button
                  onClick={save}
                  disabled={processing || pages.length === 0}
                  size="lg"
                  className="bg-gradient-primary text-primary-foreground shadow-[0_10px_24px_-12px_rgb(37_99_235_/_0.55)] hover:opacity-95"
                >
                  {processing ? (
                    <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Extracting…</>
                  ) : (
                    <><Download className="mr-1.5 h-4 w-4" /> Extract pages</>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="pt-2"><AdPlaceholder slot="bottom-banner" /></div>
      </ToolLayout>
    </>
  );
}
