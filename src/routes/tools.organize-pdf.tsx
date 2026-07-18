import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useRef, useState } from "react";
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
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { PDFDocument, degrees } from "pdf-lib";
import {
  Download,
  Layers,
  Loader2,
  RotateCcw,
  RotateCw,
  Trash2,
  X,
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

export const Route = createFileRoute("/tools/organize-pdf")({
  head: () => ({
    meta: [
      { title: "Reorder PDF Pages — Free Browser Tool — PDFMaker" },
      {
        name: "description",
        content:
          "Drag and drop PDF pages into a new order, rotate or remove them, then export a new PDF — 100% in your browser.",
      },
      { property: "og:title", content: "Reorder PDF Pages — PDFMaker" },
      {
        property: "og:description",
        content:
          "Visually reorder PDF pages with drag & drop. No uploads, no sign-up.",
      },
    ],
    links: [{ rel: "canonical", href: "/tools/organize-pdf" }],
  }),
  component: OrganizePage,
});

type Item = { id: string; page: number; dataUrl: string; rotation: number };

function OrganizePage() {
  const [file, setFile] = useState<File | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const cancelRef = useRef(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onFiles = useCallback(async (files: File[]) => {
    const f = files[0];
    setFile(f);
    setItems([]);
    setLoading(true);
    try {
      const buf = await f.arrayBuffer();
      const doc = await loadPdfDocument(buf);
      setTotal(doc.numPages);
      const list: Item[] = [];
      for (let i = 1; i <= doc.numPages; i++) {
        const t = await renderPageThumb(doc, i, 180);
        list.push({ id: `p${i}`, page: i, dataUrl: t.dataUrl, rotation: 0 });
        if (i % 4 === 0) setItems([...list]);
      }
      setItems(list);
    } catch (e) {
      toast.error("Could not open PDF", { description: friendlyPdfError(e) });
      setFile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setItems((prev) => {
      const oldIdx = prev.findIndex((i) => i.id === active.id);
      const newIdx = prev.findIndex((i) => i.id === over.id);
      return arrayMove(prev, oldIdx, newIdx);
    });
  };

  const rotate = (id: string, d: number) =>
    setItems((prev) =>
      prev.map((it) =>
        it.id === id ? { ...it, rotation: (((it.rotation + d) % 360) + 360) % 360 } : it,
      ),
    );

  const remove = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));

  const save = async () => {
    if (!file || items.length === 0) return;
    setProcessing(true);
    cancelRef.current = false;
    try {
      const buf = await file.arrayBuffer();
      const src = await PDFDocument.load(buf, { ignoreEncryption: true });
      const out = await PDFDocument.create();
      const idxs = items.map((it) => it.page - 1);
      const copied = await out.copyPages(src, idxs);
      copied.forEach((page, i) => {
        if (cancelRef.current) throw new Error("cancelled");
        const extra = items[i].rotation;
        if (extra) {
          const cur = page.getRotation().angle;
          page.setRotation(degrees((cur + extra) % 360));
        }
        out.addPage(page);
      });
      const bytes = await out.save();
      downloadBlob(new Blob([bytes as BlobPart], { type: "application/pdf" }), timestampName("organized"));
      toast.success("Organized PDF ready — download started.");
    } catch (e) {
      const msg = friendlyPdfError(e);
      if (msg === "Operation cancelled.") toast.message(msg);
      else toast.error("Save failed", { description: msg });
    } finally {
      setProcessing(false);
    }
  };

  const clear = () => {
    setFile(null);
    setItems([]);
    setTotal(0);
  };

  const changed = items.length !== total || items.some((it, i) => it.page !== i + 1 || it.rotation !== 0);

  return (
    <>
      <ToolHeader
        icon={Layers}
        title="Reorder PDF Pages"
        description="Drag and drop pages to reorder, rotate individual pages, or remove ones you don't need."
      />
      <ToolLayout>
        {!file && (
          <PdfDropzone
            onFiles={onFiles}
            title="Drop a PDF here, or click to browse"
            subtitle="Rearrange pages visually with drag & drop"
          />
        )}

        {file && (
          <div className="glass-panel rounded-2xl p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {items.length} / {total} pages · {formatBytes(file.size)}
                </p>
              </div>
              <Button size="sm" variant="ghost" onClick={clear} className="text-muted-foreground hover:text-destructive">
                <Trash2 className="mr-1.5 h-4 w-4" /> Reset
              </Button>
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

        {items.length > 0 && (
          <div className="glass-panel rounded-2xl p-4 sm:p-6">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={items.map((i) => i.id)} strategy={rectSortingStrategy}>
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {items.map((it, i) => (
                    <PageCard
                      key={it.id}
                      item={it}
                      position={i + 1}
                      onRotate={(d) => rotate(it.id, d)}
                      onRemove={() => remove(it.id)}
                    />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          </div>
        )}

        {file && (
          <div className="sticky bottom-4 z-10">
            <div className="glass-panel flex flex-wrap items-center justify-between gap-3 rounded-2xl p-3 sm:p-4">
              <div className="text-sm text-muted-foreground">
                {changed ? "Ready to export new PDF" : "Drag pages to reorder"}
              </div>
              <div className="flex gap-2">
                {processing && (
                  <Button variant="outline" size="lg" onClick={() => (cancelRef.current = true)}>Cancel</Button>
                )}
                <Button
                  onClick={save}
                  disabled={processing || items.length === 0}
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

        <div className="pt-2"><AdPlaceholder slot="bottom-banner" /></div>
      </ToolLayout>
    </>
  );
}

function PageCard({
  item,
  position,
  onRotate,
  onRemove,
}: {
  item: Item;
  position: number;
  onRotate: (d: number) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl border border-border/70 bg-background/70",
        isDragging && "z-20 shadow-lg ring-2 ring-primary/50",
      )}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Drag page ${item.page}`}
        className="relative flex aspect-[3/4] w-full cursor-grab items-center justify-center overflow-hidden bg-muted/40 active:cursor-grabbing"
      >
        <img
          src={item.dataUrl}
          alt={`Page ${item.page}`}
          className="max-h-full max-w-full object-contain transition-transform duration-200"
          style={{ transform: `rotate(${item.rotation}deg)` }}
        />
        <span className="absolute left-1.5 top-1.5 rounded-md bg-primary/90 px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground shadow-sm">
          {position}
        </span>
        <span className="absolute bottom-1.5 left-1.5 rounded-md bg-background/80 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground shadow-sm backdrop-blur">
          orig {item.page}
        </span>
      </button>
      <div className="flex items-center justify-between gap-1 border-t border-border/60 bg-background/70 p-1.5">
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => onRotate(-90)}
            aria-label="Rotate left"
            className="grid h-7 w-7 place-items-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onRotate(90)}
            aria-label="Rotate right"
            className="grid h-7 w-7 place-items-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <RotateCw className="h-3.5 w-3.5" />
          </button>
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove page ${item.page}`}
          className="grid h-7 w-7 place-items-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </li>
  );
}
