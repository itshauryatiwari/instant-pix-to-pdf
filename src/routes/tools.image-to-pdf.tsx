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
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowLeft,
  Check,
  Clipboard,
  Download,
  FileImage,
  Loader2,
  Plus,
  RotateCw,
  ShieldCheck,
  Trash2,
  UploadCloud,
  X,
  ZoomIn,
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
import { Progress as ProgressBar } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AdPlaceholder } from "@/components/ad-placeholder";
import { cn } from "@/lib/utils";
import {
  formatBytes,
  generatePdf,
  isHeic,
  isSupported,
  readImageMeta,
  type Compression,
  type ImageFit,
  type ImageItem,
  type Margin,
  type Orientation,
  type PageSize,
  type PdfSettings,
} from "@/lib/image-to-pdf";

export const Route = createFileRoute("/tools/image-to-pdf")({
  head: () => ({
    meta: [
      { title: "Image to PDF — Free Browser Converter — PDFMaker" },
      {
        name: "description",
        content:
          "Convert JPG, PNG, WEBP, BMP and GIF images into a single PDF right in your browser. Reorder, rotate and customize page size — nothing is uploaded.",
      },
    ],
  }),
  component: ImageToPdfPage,
});

const defaultSettings: PdfSettings = {
  pageSize: "auto",
  orientation: "auto",
  margin: "small",
  fit: "center",
  compression: "medium",
  background: "#ffffff",
};

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function ImageToPdfPage() {
  const [items, setItems] = useState<ImageItem[]>([]);
  const [settings, setSettings] = useState<PdfSettings>(defaultSettings);
  const [dragOver, setDragOver] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [result, setResult] = useState<{
    blob: Blob;
    url: string;
    filename: string;
    pages: number;
    size: number;
  } | null>(null);
  const [zoom, setZoom] = useState<ImageItem | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const cancelRef = useRef(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      items.forEach((i) => URL.revokeObjectURL(i.url));
      if (result?.url) URL.revokeObjectURL(result.url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addFiles = useCallback(async (files: FileList | File[]) => {
    const arr = Array.from(files);
    if (arr.length === 0) return;

    const accepted: File[] = [];
    let heicCount = 0;
    let rejectedCount = 0;
    for (const f of arr) {
      if (isHeic(f)) {
        heicCount += 1;
        continue;
      }
      if (!isSupported(f)) {
        rejectedCount += 1;
        continue;
      }
      accepted.push(f);
    }

    if (heicCount > 0) {
      toast.error(
        `${heicCount} HEIC file${heicCount > 1 ? "s" : ""} skipped`,
        {
          description:
            "HEIC/HEIF images can't be decoded natively in most browsers. Please convert them to JPG or PNG first.",
        },
      );
    }
    if (rejectedCount > 0) {
      toast.error(
        `${rejectedCount} unsupported file${rejectedCount > 1 ? "s" : ""} skipped`,
        {
          description:
            "Supported formats: JPG, JPEG, PNG, WEBP, BMP, GIF.",
        },
      );
    }

    const loaded: ImageItem[] = [];
    for (const f of accepted) {
      try {
        const meta = await readImageMeta(f);
        loaded.push({
          id: uid(),
          file: f,
          name: f.name.replace(/\.[^.]+$/, ""),
          url: meta.url,
          width: meta.width,
          height: meta.height,
          size: f.size,
          rotation: 0,
          type: f.type || "image/*",
        });
      } catch {
        toast.error(`Could not read “${f.name}”`, {
          description: "The file may be corrupted or in an unsupported encoding.",
        });
      }
    }

    if (loaded.length > 0) {
      setItems((prev) => [...prev, ...loaded]);
      setResult(null);
    }
  }, []);

  // Clipboard paste
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (!e.clipboardData) return;
      const files: File[] = [];
      for (const it of Array.from(e.clipboardData.items)) {
        if (it.kind === "file") {
          const f = it.getAsFile();
          if (f) files.push(f);
        }
      }
      if (files.length > 0) {
        e.preventDefault();
        void addFiles(files);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [addFiles]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) void addFiles(e.dataTransfer.files);
  };

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setItems((prev) => {
      const oldIndex = prev.findIndex((p) => p.id === active.id);
      const newIndex = prev.findIndex((p) => p.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  const removeItem = (id: string) => {
    setItems((prev) => {
      const found = prev.find((p) => p.id === id);
      if (found) URL.revokeObjectURL(found.url);
      return prev.filter((p) => p.id !== id);
    });
    setResult(null);
  };

  const rotateItem = (id: string) => {
    setItems((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, rotation: (((p.rotation + 90) % 360) as 0 | 90 | 180 | 270) }
          : p,
      ),
    );
    setResult(null);
  };

  const renameItem = (id: string, name: string) => {
    setItems((prev) => prev.map((p) => (p.id === id ? { ...p, name } : p)));
    setResult(null);
  };

  const clearAll = () => {
    items.forEach((i) => URL.revokeObjectURL(i.url));
    setItems([]);
    setResult(null);
  };

  const totalSize = useMemo(
    () => items.reduce((a, b) => a + b.size, 0),
    [items],
  );

  const convert = async () => {
    if (items.length === 0) {
      toast.error("Add at least one image first.");
      return;
    }
    setProcessing(true);
    setProgress({ done: 0, total: items.length });
    cancelRef.current = false;

    try {
      const blob = await generatePdf(items, settings, (done, total) => {
        if (cancelRef.current) throw new Error("cancelled");
        setProgress({ done, total });
      });

      const filename = `pdfmaker-${new Date()
        .toISOString()
        .slice(0, 19)
        .replace(/[:T]/g, "-")}.pdf`;
      const url = URL.createObjectURL(blob);
      setResult({ blob, url, filename, pages: items.length, size: blob.size });

      // Auto-download
      try {
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        toast.success("PDF ready — download started.");
      } catch {
        toast.info("PDF ready — use the download button below.");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg === "cancelled") {
        toast.message("Conversion cancelled.");
      } else if (/memory|allocation/i.test(msg)) {
        toast.error("Your browser ran out of memory", {
          description:
            "Try a higher compression setting, fewer images at once, or smaller source images.",
        });
      } else {
        toast.error("Something went wrong", { description: msg });
      }
    } finally {
      setProcessing(false);
    }
  };

  return (
    <>
      <section className="pt-8 pb-4 sm:pt-12">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <a
            href="/tools"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> All tools
          </a>

          <div className="mt-6 flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:gap-6">
            <div
              aria-hidden="true"
              className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-[0_12px_28px_-12px_rgb(37_99_235_/_0.55)]"
            >
              <FileImage className="h-6 w-6" strokeWidth={2.25} />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                Image to PDF
              </h1>
              <p className="mt-2 max-w-2xl text-base leading-relaxed text-muted-foreground">
                Combine JPG, PNG, WEBP, BMP and GIF images into a single PDF —
                reorder, rotate and customize the layout. Everything happens in your
                browser.
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700">
              <ShieldCheck className="h-3.5 w-3.5" />
              100% private
            </span>
          </div>

          <div className="mt-6">
            <AdPlaceholder slot="top-banner" />
          </div>
        </div>
      </section>

      <section className="pb-24">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)_260px]">
            <aside className="hidden lg:block">
              <div className="sticky top-24">
                <AdPlaceholder slot="left-sidebar" />
              </div>
            </aside>

            <div className="min-w-0 space-y-6">
              {/* Dropzone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                className={cn(
                  "glass-panel rounded-2xl p-6 sm:p-8 transition-colors",
                  dragOver && "border-primary/50 bg-primary/5",
                )}
              >
                <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border/70 bg-background/40 px-4 py-10 text-center sm:py-14">
                  <div className="grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary">
                    <UploadCloud className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-base font-medium text-foreground">
                      Drop images here, click to upload, or paste from clipboard
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      JPG · JPEG · PNG · WEBP · BMP · GIF · up to your browser's limit
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <Button
                      onClick={() => inputRef.current?.click()}
                      className="bg-gradient-primary text-primary-foreground hover:opacity-95"
                    >
                      <UploadCloud className="mr-1.5 h-4 w-4" />
                      Choose images
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        toast.message("Paste ready", {
                          description:
                            "Copy an image (Cmd/Ctrl+C) then paste (Cmd/Ctrl+V) anywhere on this page.",
                        });
                      }}
                    >
                      <Clipboard className="mr-1.5 h-4 w-4" />
                      Paste image
                    </Button>
                  </div>
                  <input
                    ref={inputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/bmp,image/gif"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files) void addFiles(e.target.files);
                      e.target.value = "";
                    }}
                  />
                </div>
              </div>

              {/* Image list */}
              {items.length > 0 && (
                <div className="glass-panel rounded-2xl p-4 sm:p-6">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-base font-semibold text-foreground">
                        {items.length} image{items.length > 1 ? "s" : ""}
                      </h2>
                      <p className="text-xs text-muted-foreground">
                        Total {formatBytes(totalSize)} · drag to reorder
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => inputRef.current?.click()}
                      >
                        <Plus className="mr-1.5 h-4 w-4" />
                        Add more
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearAll}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="mr-1.5 h-4 w-4" />
                        Clear
                      </Button>
                    </div>
                  </div>

                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={onDragEnd}
                  >
                    <SortableContext
                      items={items.map((i) => i.id)}
                      strategy={rectSortingStrategy}
                    >
                      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                        {items.map((item, idx) => (
                          <SortableTile
                            key={item.id}
                            item={item}
                            index={idx}
                            onRotate={() => rotateItem(item.id)}
                            onDelete={() => removeItem(item.id)}
                            onZoom={() => setZoom(item)}
                            onRename={() => setRenamingId(item.id)}
                          />
                        ))}
                      </ul>
                    </SortableContext>
                  </DndContext>
                </div>
              )}

              {/* Settings */}
              {items.length > 0 && (
                <div className="glass-panel rounded-2xl p-4 sm:p-6">
                  <h2 className="text-base font-semibold text-foreground">
                    PDF settings
                  </h2>
                  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <SelectRow
                      label="Page size"
                      value={settings.pageSize}
                      onChange={(v) =>
                        setSettings((s) => ({ ...s, pageSize: v as PageSize }))
                      }
                      options={[
                        ["auto", "Auto (match image)"],
                        ["a4", "A4"],
                        ["a3", "A3"],
                        ["letter", "Letter"],
                        ["legal", "Legal"],
                      ]}
                    />
                    <SelectRow
                      label="Orientation"
                      value={settings.orientation}
                      onChange={(v) =>
                        setSettings((s) => ({ ...s, orientation: v as Orientation }))
                      }
                      options={[
                        ["auto", "Auto"],
                        ["portrait", "Portrait"],
                        ["landscape", "Landscape"],
                      ]}
                    />
                    <SelectRow
                      label="Margins"
                      value={settings.margin}
                      onChange={(v) =>
                        setSettings((s) => ({ ...s, margin: v as Margin }))
                      }
                      options={[
                        ["none", "None"],
                        ["small", "Small"],
                        ["medium", "Medium"],
                        ["large", "Large"],
                      ]}
                    />
                    <SelectRow
                      label="Image fit"
                      value={settings.fit}
                      onChange={(v) =>
                        setSettings((s) => ({ ...s, fit: v as ImageFit }))
                      }
                      options={[
                        ["original", "Original size"],
                        ["fit-width", "Fit width"],
                        ["fit-height", "Fit height"],
                        ["fill", "Fill page"],
                        ["center", "Center"],
                      ]}
                    />
                    <SelectRow
                      label="Compression"
                      value={settings.compression}
                      onChange={(v) =>
                        setSettings((s) => ({
                          ...s,
                          compression: v as Compression,
                        }))
                      }
                      options={[
                        ["maximum", "Maximum (smallest)"],
                        ["high", "High"],
                        ["medium", "Medium"],
                        ["low", "Low (best quality)"],
                      ]}
                    />
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs font-medium text-muted-foreground">
                        Background
                      </Label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setSettings((s) => ({ ...s, background: "#ffffff" }))
                          }
                          className={cn(
                            "h-9 w-9 rounded-md border border-border bg-white ring-2 ring-transparent transition-all",
                            settings.background === "#ffffff" &&
                              "ring-ring/60",
                          )}
                          aria-label="White background"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setSettings((s) => ({ ...s, background: "#000000" }))
                          }
                          className={cn(
                            "h-9 w-9 rounded-md border border-border bg-black ring-2 ring-transparent transition-all",
                            settings.background === "#000000" &&
                              "ring-ring/60",
                          )}
                          aria-label="Black background"
                        />
                        <input
                          type="color"
                          aria-label="Custom background color"
                          value={settings.background}
                          onChange={(e) =>
                            setSettings((s) => ({
                              ...s,
                              background: e.target.value,
                            }))
                          }
                          className="h-9 w-14 cursor-pointer rounded-md border border-border bg-transparent p-1"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Processing / result */}
              {processing && (
                <div className="glass-panel rounded-2xl p-4 sm:p-6">
                  <div className="flex items-center gap-3">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">
                        Building your PDF… {progress.done} / {progress.total} page
                        {progress.total > 1 ? "s" : ""}
                      </p>
                      <ProgressBar
                        value={
                          progress.total === 0
                            ? 0
                            : (progress.done / progress.total) * 100
                        }
                        className="mt-2 h-2"
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => (cancelRef.current = true)}
                    >
                      Cancel
                    </Button>
                  </div>
                  <div className="mt-4">
                    <AdPlaceholder slot="processing-banner" />
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
                        Your PDF is ready!
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {result.pages} page{result.pages > 1 ? "s" : ""} ·{" "}
                        {formatBytes(result.size)} · {result.filename}
                      </p>
                    </div>
                    <a
                      href={result.url}
                      download={result.filename}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-gradient-primary px-5 text-sm font-medium text-primary-foreground shadow-[0_10px_24px_-12px_rgb(37_99_235_/_0.55)] transition-opacity hover:opacity-95"
                    >
                      <Download className="h-4 w-4" />
                      Download PDF
                    </a>
                  </div>
                </div>
              )}

              {/* Convert bar */}
              <div className="sticky bottom-4 z-10">
                <div className="glass-panel flex flex-wrap items-center justify-between gap-3 rounded-2xl p-3 sm:p-4">
                  <div className="text-sm text-muted-foreground">
                    {items.length === 0
                      ? "Add images to get started."
                      : `Ready to convert ${items.length} image${items.length > 1 ? "s" : ""} · ${formatBytes(totalSize)}`}
                  </div>
                  <Button
                    onClick={convert}
                    disabled={items.length === 0 || processing}
                    className="bg-gradient-primary text-primary-foreground shadow-[0_10px_24px_-12px_rgb(37_99_235_/_0.55)] hover:opacity-95"
                    size="lg"
                  >
                    {processing ? (
                      <>
                        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                        Building…
                      </>
                    ) : (
                      <>
                        <Download className="mr-1.5 h-4 w-4" />
                        Convert to PDF
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="pt-2">
                <AdPlaceholder slot="bottom-banner" />
              </div>
            </div>

            <aside className="hidden lg:block">
              <div className="sticky top-24">
                <AdPlaceholder slot="right-sidebar" />
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* Zoom preview dialog */}
      <Dialog open={!!zoom} onOpenChange={(o) => !o && setZoom(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="truncate">{zoom?.name}</DialogTitle>
          </DialogHeader>
          {zoom && (
            <div className="flex flex-col items-center gap-3">
              <div
                className="w-full overflow-hidden rounded-lg border border-border/60 bg-muted/40"
                style={{ maxHeight: "70vh" }}
              >
                <img
                  src={zoom.url}
                  alt={zoom.name}
                  style={{
                    transform: `rotate(${zoom.rotation}deg)`,
                    maxWidth: "100%",
                    maxHeight: "70vh",
                    objectFit: "contain",
                    display: "block",
                    margin: "0 auto",
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {zoom.width}×{zoom.height}px · {formatBytes(zoom.size)} ·{" "}
                {zoom.type.replace("image/", "").toUpperCase()}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Rename dialog */}
      <Dialog
        open={!!renamingId}
        onOpenChange={(o) => !o && setRenamingId(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Rename page</DialogTitle>
          </DialogHeader>
          {renamingId && (
            <RenameForm
              value={items.find((i) => i.id === renamingId)?.name ?? ""}
              onSave={(v) => {
                renameItem(renamingId, v);
                setRenamingId(null);
              }}
              onCancel={() => setRenamingId(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function SelectRow({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map(([v, l]) => (
            <SelectItem key={v} value={v}>
              {l}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function RenameForm({
  value,
  onSave,
  onCancel,
}: {
  value: string;
  onSave: (v: string) => void;
  onCancel: () => void;
}) {
  const [v, setV] = useState(value);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave(v.trim() || value);
      }}
      className="flex flex-col gap-4"
    >
      <Input
        autoFocus
        value={v}
        onChange={(e) => setV(e.target.value)}
        placeholder="Page name"
      />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className="bg-gradient-primary text-primary-foreground">
          Save
        </Button>
      </div>
    </form>
  );
}

function SortableTile({
  item,
  index,
  onRotate,
  onDelete,
  onZoom,
  onRename,
}: {
  item: ImageItem;
  index: number;
  onRotate: () => void;
  onDelete: () => void;
  onZoom: () => void;
  onRename: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl border border-border/70 bg-background/70 shadow-sm",
        isDragging && "opacity-80 ring-2 ring-primary/40",
      )}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Reorder ${item.name}`}
        className="relative aspect-[3/4] w-full cursor-grab bg-muted/40 active:cursor-grabbing"
      >
        <img
          src={item.url}
          alt={item.name}
          className="h-full w-full object-contain"
          style={{ transform: `rotate(${item.rotation}deg)` }}
          loading="lazy"
        />
        <span className="pointer-events-none absolute left-1.5 top-1.5 rounded-md bg-background/80 px-1.5 py-0.5 text-[10px] font-semibold text-foreground shadow-sm backdrop-blur">
          {index + 1}
        </span>
      </button>
      <div className="flex items-center gap-1 border-t border-border/60 bg-background/70 p-1.5">
        <button
          type="button"
          onClick={onRename}
          className="min-w-0 flex-1 truncate rounded px-1.5 py-1 text-left text-xs font-medium text-foreground hover:bg-accent"
          title={`${item.name} — click to rename`}
        >
          {item.name}
        </button>
        <button
          type="button"
          onClick={onZoom}
          aria-label="Preview"
          className="grid h-7 w-7 place-items-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={onRotate}
          aria-label="Rotate 90°"
          className="grid h-7 w-7 place-items-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <RotateCw className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label="Remove"
          className="grid h-7 w-7 place-items-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <p className="border-t border-border/60 bg-muted/30 px-2 py-1 text-[10px] text-muted-foreground">
        {item.width}×{item.height} · {formatBytes(item.size)}
      </p>
    </li>
  );
}
