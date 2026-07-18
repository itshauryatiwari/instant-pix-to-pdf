import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PDFDocument, StandardFonts, degrees, rgb } from "pdf-lib";
import { Download, Loader2, Stamp, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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

export const Route = createFileRoute("/tools/watermark-pdf")({
  head: () => ({
    meta: [
      { title: "Watermark PDF — Free Browser Tool — PDFMaker" },
      {
        name: "description",
        content:
          "Add a text or image watermark to a PDF. Control opacity, rotation, size and position with a live preview — 100% in your browser.",
      },
      { property: "og:title", content: "Watermark PDF — PDFMaker" },
      {
        property: "og:description",
        content:
          "Stamp a text or image watermark across your PDF pages with full control.",
      },
    ],
    links: [{ rel: "canonical", href: "/tools/watermark-pdf" }],
  }),
  component: WatermarkPage,
});

type Position =
  | "center"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "tile";

const POSITIONS: { value: Position; label: string }[] = [
  { value: "center", label: "Center" },
  { value: "top-left", label: "Top left" },
  { value: "top-right", label: "Top right" },
  { value: "bottom-left", label: "Bottom left" },
  { value: "bottom-right", label: "Bottom right" },
  { value: "tile", label: "Tile / diagonal" },
];

function WatermarkPage() {
  const [file, setFile] = useState<File | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewDims, setPreviewDims] = useState({ w: 0, h: 0 });
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const cancelRef = useRef(false);

  const [mode, setMode] = useState<"text" | "image">("text");
  const [text, setText] = useState("CONFIDENTIAL");
  const [color, setColor] = useState("#e11d48");
  const [opacity, setOpacity] = useState(30);
  const [rotation, setRotation] = useState(-30);
  const [scale, setScale] = useState(60); // % of page width
  const [position, setPosition] = useState<Position>("center");
  const [pagesInput, setPagesInput] = useState("");

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const onFiles = useCallback(async (files: File[]) => {
    const f = files[0];
    setFile(f);
    setPreviewUrl(null);
    setLoading(true);
    try {
      const buf = await f.arrayBuffer();
      const doc = await loadPdfDocument(buf);
      setTotalPages(doc.numPages);
      const t = await renderPageThumb(doc, 1, 520);
      setPreviewUrl(t.dataUrl);
      setPreviewDims({ w: t.width, h: t.height });
    } catch (e) {
      toast.error("Could not open PDF", { description: friendlyPdfError(e) });
      setFile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const onImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!/^image\//.test(f.type)) {
      toast.error("Please choose an image file");
      return;
    }
    setImageFile(f);
    const url = URL.createObjectURL(f);
    setImageUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
    e.target.value = "";
  };

  useEffect(() => () => { if (imageUrl) URL.revokeObjectURL(imageUrl); }, [imageUrl]);

  const targetPages = useMemo(() => {
    if (!totalPages) return [];
    const s = pagesInput.trim();
    if (!s) return Array.from({ length: totalPages }, (_, i) => i + 1);
    try {
      return parseRanges(s, totalPages);
    } catch {
      return [];
    }
  }, [pagesInput, totalPages]);

  const previewOverlay = useMemo(() => {
    const styles: React.CSSProperties[] = [];
    const cx = previewDims.w / 2;
    const cy = previewDims.h / 2;
    const commonSize = (previewDims.w * scale) / 100;
    const rot = `rotate(${rotation}deg)`;
    if (position === "tile") {
      const gridW = commonSize * 1.6;
      const rows = Math.ceil(previewDims.h / gridW) + 1;
      const cols = Math.ceil(previewDims.w / gridW) + 1;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          styles.push({
            position: "absolute",
            left: c * gridW,
            top: r * gridW,
            transform: rot,
            opacity: opacity / 100,
            width: commonSize,
          });
        }
      }
    } else {
      const pos: Record<Exclude<Position, "tile">, React.CSSProperties> = {
        center: { left: cx, top: cy, transform: `translate(-50%, -50%) ${rot}` },
        "top-left": { left: 20, top: 20, transform: rot, transformOrigin: "top left" },
        "top-right": { right: 20, top: 20, transform: rot, transformOrigin: "top right" },
        "bottom-left": { left: 20, bottom: 20, transform: rot, transformOrigin: "bottom left" },
        "bottom-right": { right: 20, bottom: 20, transform: rot, transformOrigin: "bottom right" },
      };
      styles.push({
        position: "absolute",
        opacity: opacity / 100,
        width: commonSize,
        ...pos[position as Exclude<Position, "tile">],
      });
    }
    return styles;
  }, [previewDims, scale, rotation, opacity, position]);

  const apply = async () => {
    if (!file) return;
    if (mode === "text" && !text.trim()) {
      toast.error("Watermark text is empty");
      return;
    }
    if (mode === "image" && !imageFile) {
      toast.error("Choose a watermark image first");
      return;
    }
    if (targetPages.length === 0) {
      toast.error("Invalid page selection");
      return;
    }
    setProcessing(true);
    cancelRef.current = false;
    try {
      const buf = await file.arrayBuffer();
      const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
      const pages = doc.getPages();
      const hexToRgb = (h: string) => {
        const m = h.replace("#", "");
        const n = parseInt(m.length === 3 ? m.split("").map((c) => c + c).join("") : m, 16);
        return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 };
      };
      const c = hexToRgb(color);
      const font = mode === "text" ? await doc.embedFont(StandardFonts.HelveticaBold) : null;

      let embedded: any = null;
      let imgDims = { w: 0, h: 0 };
      if (mode === "image" && imageFile) {
        const ibuf = await imageFile.arrayBuffer();
        if (/png/i.test(imageFile.type)) embedded = await doc.embedPng(ibuf);
        else embedded = await doc.embedJpg(ibuf);
        imgDims = { w: embedded.width, h: embedded.height };
      }

      const targetSet = new Set(targetPages);
      const rad = (rotation * Math.PI) / 180;

      const placeOne = (page: any, x: number, y: number, w: number, h: number) => {
        if (mode === "text" && font) {
          const fontSize = w / (text.length * 0.55);
          page.drawText(text, {
            x,
            y,
            size: fontSize,
            font,
            color: rgb(c.r, c.g, c.b),
            opacity: opacity / 100,
            rotate: degrees(rotation),
          });
        } else if (embedded) {
          page.drawImage(embedded, {
            x,
            y,
            width: w,
            height: h,
            opacity: opacity / 100,
            rotate: degrees(rotation),
          });
        }
      };

      for (let i = 0; i < pages.length; i++) {
        if (cancelRef.current) throw new Error("cancelled");
        if (!targetSet.has(i + 1)) continue;
        const page = pages[i];
        const { width: pw, height: ph } = page.getSize();
        const targetW = (pw * scale) / 100;
        const targetH =
          mode === "text"
            ? targetW / (text.length * 0.55) * 1.2
            : (targetW * imgDims.h) / (imgDims.w || 1);

        if (position === "tile") {
          const step = targetW * 1.6;
          for (let ty = -targetH; ty < ph + step; ty += step) {
            for (let tx = -targetW; tx < pw + step; tx += step) {
              placeOne(page, tx, ty, targetW, targetH);
            }
          }
        } else {
          let x = 0, y = 0;
          const pad = 20;
          switch (position) {
            case "center":
              x = pw / 2 - (Math.cos(rad) * targetW) / 2 + (Math.sin(rad) * targetH) / 2;
              y = ph / 2 - (Math.sin(rad) * targetW) / 2 - (Math.cos(rad) * targetH) / 2;
              break;
            case "top-left":
              x = pad; y = ph - pad - targetH; break;
            case "top-right":
              x = pw - pad - targetW; y = ph - pad - targetH; break;
            case "bottom-left":
              x = pad; y = pad; break;
            case "bottom-right":
              x = pw - pad - targetW; y = pad; break;
          }
          placeOne(page, x, y, targetW, targetH);
        }
        if (i % 5 === 0) await new Promise((r) => setTimeout(r, 0));
      }

      const bytes = await doc.save();
      downloadBlob(new Blob([bytes as BlobPart], { type: "application/pdf" }), timestampName("watermarked"));
      toast.success("Watermark applied — download started.");
    } catch (e) {
      const msg = friendlyPdfError(e);
      if (msg === "Operation cancelled.") toast.message(msg);
      else toast.error("Watermark failed", { description: msg });
    } finally {
      setProcessing(false);
    }
  };

  const clear = () => {
    setFile(null);
    setPreviewUrl(null);
    setTotalPages(0);
  };

  return (
    <>
      <ToolHeader
        icon={Stamp}
        title="Watermark PDF"
        description="Add a text or image watermark. Adjust opacity, rotation, size and position with a live preview."
      />
      <ToolLayout>
        {!file && (
          <PdfDropzone
            onFiles={onFiles}
            title="Drop a PDF here, or click to browse"
            subtitle="One PDF at a time · text or image watermark"
          />
        )}

        {file && (
          <div className="glass-panel rounded-2xl p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {totalPages} page{totalPages === 1 ? "" : "s"} · {formatBytes(file.size)}
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
              <Loader2 className="h-4 w-4 animate-spin text-primary" /> Loading preview…
            </div>
          </div>
        )}

        {file && !loading && (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="glass-panel rounded-2xl p-4 sm:p-6">
              <p className="mb-3 text-xs font-medium text-muted-foreground">Live preview · page 1</p>
              <div className="mx-auto overflow-hidden rounded-lg border border-border/60 bg-muted/40">
                {previewUrl && (
                  <div
                    className="relative mx-auto"
                    style={{ width: previewDims.w, height: previewDims.h, maxWidth: "100%" }}
                  >
                    <img src={previewUrl} alt="Preview" className="absolute inset-0 h-full w-full object-contain" />
                    {previewOverlay.map((style, i) => (
                      <div key={i} style={style} className="pointer-events-none select-none">
                        {mode === "text" ? (
                          <div
                            style={{
                              color,
                              fontWeight: 800,
                              lineHeight: 1,
                              whiteSpace: "nowrap",
                              fontSize: (previewDims.w * scale) / 100 / (text.length * 0.55),
                            }}
                          >
                            {text}
                          </div>
                        ) : imageUrl ? (
                          <img src={imageUrl} alt="wm" style={{ width: "100%", display: "block" }} />
                        ) : (
                          <div className="rounded border border-dashed border-foreground/40 p-4 text-center text-[10px] text-muted-foreground">
                            No image yet
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="glass-panel rounded-2xl p-4 sm:p-6 space-y-4">
              <Tabs value={mode} onValueChange={(v) => setMode(v as "text" | "image")}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="text">Text</TabsTrigger>
                  <TabsTrigger value="image">Image</TabsTrigger>
                </TabsList>
                <TabsContent value="text" className="space-y-3 pt-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Watermark text</Label>
                    <Input value={text} onChange={(e) => setText(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Color</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        className="h-9 w-12 cursor-pointer rounded border border-border bg-transparent"
                        aria-label="Watermark color"
                      />
                      <Input value={color} onChange={(e) => setColor(e.target.value)} className="font-mono" />
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="image" className="space-y-3 pt-3">
                  <Label className="text-xs">Image file (PNG or JPG)</Label>
                  <label className={cn(
                    "flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-border/70 bg-background/60 px-3 py-4 text-sm text-muted-foreground hover:border-primary/60",
                  )}>
                    <Upload className="h-4 w-4" />
                    <span>{imageFile ? imageFile.name : "Choose image"}</span>
                    <input type="file" accept="image/png,image/jpeg" onChange={onImage} className="hidden" />
                  </label>
                </TabsContent>
              </Tabs>

              <div className="space-y-1.5">
                <Label className="text-xs">Position</Label>
                <Select value={position} onValueChange={(v) => setPosition(v as Position)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {POSITIONS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Opacity: {opacity}%</Label>
                <Slider min={5} max={100} step={5} value={[opacity]} onValueChange={([v]) => setOpacity(v)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Rotation: {rotation}°</Label>
                <Slider min={-90} max={90} step={5} value={[rotation]} onValueChange={([v]) => setRotation(v)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Size: {scale}% of page width</Label>
                <Slider min={10} max={100} step={5} value={[scale]} onValueChange={([v]) => setScale(v)} />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Apply to pages (blank = all)</Label>
                <Input value={pagesInput} onChange={(e) => setPagesInput(e.target.value)} placeholder="e.g. 1-3, 5" />
                <p className="text-[11px] text-muted-foreground">
                  {targetPages.length} page{targetPages.length === 1 ? "" : "s"} targeted
                </p>
              </div>
            </div>
          </div>
        )}

        {file && (
          <div className="sticky bottom-4 z-10">
            <div className="glass-panel flex flex-wrap items-center justify-between gap-3 rounded-2xl p-3 sm:p-4">
              <div className="text-sm text-muted-foreground">
                {mode === "text" ? "Text watermark" : "Image watermark"} · {targetPages.length} page(s)
              </div>
              <div className="flex gap-2">
                {processing && (
                  <Button variant="outline" size="lg" onClick={() => (cancelRef.current = true)}>Cancel</Button>
                )}
                <Button
                  onClick={apply}
                  disabled={processing || targetPages.length === 0}
                  size="lg"
                  className="bg-gradient-primary text-primary-foreground shadow-[0_10px_24px_-12px_rgb(37_99_235_/_0.55)] hover:opacity-95"
                >
                  {processing ? (
                    <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Applying…</>
                  ) : (
                    <><Download className="mr-1.5 h-4 w-4" /> Apply watermark</>
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
