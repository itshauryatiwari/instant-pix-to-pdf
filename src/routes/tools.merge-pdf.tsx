import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Combine,
  Download,
  FileText,
  GripVertical,
  Loader2,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { PDFDocument } from "pdf-lib";
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
  timestampName,
} from "@/lib/pdf-common";

export const Route = createFileRoute("/tools/merge-pdf")({
  head: () => ({
    meta: [
      { title: "Merge PDF — Free Browser Tool — PDFMaker" },
      {
        name: "description",
        content:
          "Combine multiple PDFs into a single document. Drag to reorder, keep original quality, and merge entirely in your browser.",
      },
    ],
  }),
  component: MergePdfPage,
});

type MergeItem = {
  id: string;
  file: File;
  name: string;
  size: number;
  pages: number | null;
};

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function MergePdfPage() {
  const [items, setItems] = useState<MergeItem[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const cancelRef = useRef(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const addFiles = useCallback(async (files: File[]) => {
    const loaded: MergeItem[] = [];
    for (const f of files) {
      let pages: number | null = null;
      try {
        const buf = await f.arrayBuffer();
        const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
        pages = doc.getPageCount();
      } catch {
        toast.error(`Could not read “${f.name}”`, {
          description: "The file may be corrupted or password-protected.",
        });
        continue;
      }
      loaded.push({ id: uid(), file: f, name: f.name, size: f.size, pages });
    }
    if (loaded.length) setItems((p) => [...p, ...loaded]);
  }, []);

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setItems((prev) => {
      const from = prev.findIndex((p) => p.id === active.id);
      const to = prev.findIndex((p) => p.id === over.id);
      return from < 0 || to < 0 ? prev : arrayMove(prev, from, to);
    });
  };

  const totalSize = useMemo(() => items.reduce((a, b) => a + b.size, 0), [items]);
  const totalPages = useMemo(
    () => items.reduce((a, b) => a + (b.pages ?? 0), 0),
    [items],
  );

  const merge = async () => {
    if (items.length < 2) {
      toast.error("Add at least two PDFs to merge.");
      return;
    }
    setProcessing(true);
    setProgress({ done: 0, total: items.length });
    cancelRef.current = false;
    try {
      const out = await PDFDocument.create();
      for (let i = 0; i < items.length; i++) {
        if (cancelRef.current) throw new Error("cancelled");
        const item = items[i];
        const buf = await item.file.arrayBuffer();
        const src = await PDFDocument.load(buf, { ignoreEncryption: true });
        const copied = await out.copyPages(src, src.getPageIndices());
        copied.forEach((p) => out.addPage(p));
        setProgress({ done: i + 1, total: items.length });
        await new Promise((r) => setTimeout(r, 0));
      }
      const bytes = await out.save();
      const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
      downloadBlob(blob, timestampName("merged"));
      toast.success("Merged PDF ready — download started.");
    } catch (e) {
      const msg = friendlyPdfError(e);
      if (msg === "Operation cancelled.") toast.message(msg);
      else toast.error("Merge failed", { description: msg });
    } finally {
      setProcessing(false);
    }
  };

  useEffect(() => {
    if (!processing) cancelRef.current = false;
  }, [processing]);

  return (
    <>
      <ToolHeader
        icon={Combine}
        title="Merge PDF"
        description="Combine multiple PDFs into one file. Drag to reorder — pages, bookmarks and quality are preserved."
      />
      <ToolLayout>
        <PdfDropzone
          multiple
          onFiles={addFiles}
          title="Drop PDFs here, or click to browse"
          subtitle="Add two or more PDFs to merge · reorder by dragging"
        />

        {items.length > 0 && (
          <div className="glass-panel rounded-2xl p-4 sm:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  {items.length} file{items.length > 1 ? "s" : ""}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {totalPages} page{totalPages !== 1 ? "s" : ""} ·{" "}
                  {formatBytes(totalSize)} total
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setItems([])}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="mr-1.5 h-4 w-4" />
                Clear
              </Button>
            </div>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={onDragEnd}
            >
              <SortableContext
                items={items.map((i) => i.id)}
                strategy={verticalListSortingStrategy}
              >
                <ul className="flex flex-col gap-2">
                  {items.map((it, idx) => (
                    <MergeRow
                      key={it.id}
                      item={it}
                      index={idx}
                      onDelete={() =>
                        setItems((p) => p.filter((x) => x.id !== it.id))
                      }
                    />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          </div>
        )}

        {processing && (
          <div className="glass-panel rounded-2xl p-4 sm:p-6">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  Merging {progress.done} / {progress.total} files…
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

        <div className="sticky bottom-4 z-10">
          <div className="glass-panel flex flex-wrap items-center justify-between gap-3 rounded-2xl p-3 sm:p-4">
            <div className="text-sm text-muted-foreground">
              {items.length < 2
                ? "Add at least two PDFs to merge."
                : `Ready to merge ${items.length} PDFs · ${totalPages} pages`}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="lg"
                onClick={() => document.querySelector<HTMLInputElement>('input[type=file]')?.click()}
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Add more
              </Button>
              <Button
                onClick={merge}
                disabled={items.length < 2 || processing}
                size="lg"
                className="bg-gradient-primary text-primary-foreground shadow-[0_10px_24px_-12px_rgb(37_99_235_/_0.55)] hover:opacity-95"
              >
                {processing ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    Merging…
                  </>
                ) : (
                  <>
                    <Download className="mr-1.5 h-4 w-4" />
                    Merge PDFs
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        <div className="pt-2">
          <AdPlaceholder slot="bottom-banner" />
        </div>
      </ToolLayout>
    </>
  );
}

function MergeRow({
  item,
  index,
  onDelete,
}: {
  item: MergeItem;
  index: number;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });
  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : undefined,
      }}
      className={cn(
        "flex items-center gap-3 rounded-xl border border-border/70 bg-background/70 p-3",
        isDragging && "opacity-80 ring-2 ring-primary/40",
      )}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
        className="grid h-8 w-8 shrink-0 cursor-grab place-items-center rounded text-muted-foreground hover:bg-accent hover:text-foreground active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-primary/10 text-xs font-semibold text-primary">
        {index + 1}
      </span>
      <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {item.name}
        </p>
        <p className="text-xs text-muted-foreground">
          {item.pages ?? "?"} page{item.pages === 1 ? "" : "s"} ·{" "}
          {formatBytes(item.size)}
        </p>
      </div>
      <button
        type="button"
        onClick={onDelete}
        aria-label="Remove"
        className="grid h-8 w-8 shrink-0 place-items-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
      >
        <X className="h-4 w-4" />
      </button>
    </li>
  );
}
