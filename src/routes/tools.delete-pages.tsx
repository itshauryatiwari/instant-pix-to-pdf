import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { PDFDocument } from "pdf-lib";
import { Download, Loader2, Trash2 } from "lucide-react";
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

export const Route = createFileRoute("/tools/delete-pages")({
  head: () => ({
    meta: [
      { title: "Delete PDF Pages — Free Browser Tool — PDFMaker" },
      {
        name: "description",
        content:
          "Preview and remove unwanted pages from a PDF. Multi-select, keyboard support, and 100% private processing in your browser.",
      },
      { property: "og:title", content: "Delete PDF Pages — PDFMaker" },
      {
        property: "og:description",
        content:
          "Preview PDF pages and delete the ones you don't need — entirely in your browser.",
      },
    ],
    links: [{ rel: "canonical", href: "/tools/delete-pages" }],
  }),
  component: DeletePagesPage,
});

type Thumb = { page: number; dataUrl: string };

function DeletePagesPage() {
  const [file, setFile] = useState<File | null>(null);
  const [thumbs, setThumbs] = useState<Thumb[]>([]);
  const [total, setTotal] = useState(0);
  const [deleted, setDeleted] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const cancelRef = useRef(false);

  const onFiles = useCallback(async (files: File[]) => {
    const f = files[0];
    setFile(f);
    setThumbs([]);
    setDeleted(new Set());
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

  const toggle = (n: number) =>
    setDeleted((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });

  const keptCount = useMemo(() => total - deleted.size, [total, deleted]);

  const save = async () => {
    if (!file) return;
    if (deleted.size === 0) {
      toast.error("Nothing selected", { description: "Click pages to mark them for deletion." });
      return;
    }
    if (keptCount === 0) {
      toast.error("Can't delete every page", { description: "At least one page must remain." });
      return;
    }
    setProcessing(true);
    cancelRef.current = false;
    try {
      const buf = await file.arrayBuffer();
      const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
      const toRemove = Array.from(deleted).sort((a, b) => b - a);
      for (const n of toRemove) {
        if (cancelRef.current) throw new Error("cancelled");
        doc.removePage(n - 1);
      }
      const bytes = await doc.save();
      downloadBlob(new Blob([bytes as BlobPart], { type: "application/pdf" }), timestampName("pages-removed"));
      toast.success(`Removed ${deleted.size} page${deleted.size === 1 ? "" : "s"}.`);
    } catch (e) {
      const msg = friendlyPdfError(e);
      if (msg === "Operation cancelled.") toast.message(msg);
      else toast.error("Delete failed", { description: msg });
    } finally {
      setProcessing(false);
    }
  };

  const clear = () => {
    setFile(null);
    setThumbs([]);
    setDeleted(new Set());
    setTotal(0);
  };

  return (
    <>
      <ToolHeader
        icon={Trash2}
        title="Delete PDF Pages"
        description="Preview every page, click to mark the ones you want to remove, then export a clean PDF."
      />
      <ToolLayout>
        {!file && (
          <PdfDropzone
            onFiles={onFiles}
            title="Drop a PDF here, or click to browse"
            subtitle="Pick the pages to delete, we keep the rest"
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
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => setDeleted(new Set())} disabled={deleted.size === 0}>
                  Clear selection
                </Button>
                <Button size="sm" variant="ghost" onClick={clear} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="mr-1.5 h-4 w-4" /> Reset
                </Button>
              </div>
            </div>
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
                const isDel = deleted.has(t.page);
                return (
                  <li key={t.page}>
                    <button
                      type="button"
                      onClick={() => toggle(t.page)}
                      aria-pressed={isDel}
                      aria-label={`${isDel ? "Restore" : "Delete"} page ${t.page}`}
                      className={cn(
                        "group relative flex w-full flex-col overflow-hidden rounded-xl border border-border/70 bg-background/70 text-left transition-all hover:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/40",
                        isDel && "border-destructive/60 ring-2 ring-destructive/40",
                      )}
                    >
                      <div className="relative flex aspect-[3/4] items-center justify-center overflow-hidden bg-muted/40">
                        <img
                          src={t.dataUrl}
                          alt={`Page ${t.page}`}
                          className={cn("max-h-full max-w-full object-contain transition", isDel && "opacity-30 grayscale")}
                        />
                        <span className="absolute left-1.5 top-1.5 rounded-md bg-background/80 px-1.5 py-0.5 text-[10px] font-semibold text-foreground shadow-sm backdrop-blur">
                          {t.page}
                        </span>
                        {isDel && (
                          <span className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-md bg-destructive text-destructive-foreground shadow-sm">
                            <Trash2 className="h-3.5 w-3.5" />
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
                {deleted.size === 0
                  ? "Click pages to mark for deletion."
                  : `${deleted.size} to delete · ${keptCount} will remain`}
              </div>
              <div className="flex gap-2">
                {processing && (
                  <Button variant="outline" size="lg" onClick={() => (cancelRef.current = true)}>
                    Cancel
                  </Button>
                )}
                <Button
                  onClick={save}
                  disabled={processing || deleted.size === 0 || keptCount === 0}
                  size="lg"
                  className="bg-gradient-primary text-primary-foreground shadow-[0_10px_24px_-12px_rgb(37_99_235_/_0.55)] hover:opacity-95"
                >
                  {processing ? (
                    <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Saving…</>
                  ) : (
                    <><Download className="mr-1.5 h-4 w-4" /> Save PDF</>
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
