import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useRef, useState } from "react";
import { PDFDocument as CantooPDFDocument } from "@cantoo/pdf-lib";
import { Download, Eye, EyeOff, Loader2, Trash2, Unlock } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PdfDropzone } from "@/components/pdf-dropzone";
import { ToolHeader, ToolLayout } from "@/components/tool-shell";
import { AdPlaceholder } from "@/components/ad-placeholder";
import {
  downloadBlob,
  formatBytes,
  friendlyPdfError,
  timestampName,
} from "@/lib/pdf-common";

export const Route = createFileRoute("/tools/unlock-pdf")({
  head: () => ({
    meta: [
      { title: "Unlock PDF — Remove Password — Free Browser Tool — PDFMaker" },
      {
        name: "description",
        content:
          "Remove password protection from a PDF you have the right to edit. Runs entirely in your browser — nothing is uploaded.",
      },
      { property: "og:title", content: "Unlock PDF — PDFMaker" },
      {
        property: "og:description",
        content: "Strip the password from a PDF, locally in your browser.",
      },
    ],
    links: [{ rel: "canonical", href: "/tools/unlock-pdf" }],
  }),
  component: UnlockPage,
});

function UnlockPage() {
  const [file, setFile] = useState<File | null>(null);
  const [pwd, setPwd] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [needsPassword, setNeedsPassword] = useState(false);
  const cancelRef = useRef(false);

  const onFiles = useCallback((files: File[]) => {
    setFile(files[0]);
    setNeedsPassword(false);
    setPwd("");
  }, []);

  const unlock = async () => {
    if (!file) return;
    setProcessing(true);
    cancelRef.current = false;
    try {
      const buf = await file.arrayBuffer();
      let doc;
      try {
        doc = await CantooPDFDocument.load(buf, { password: pwd });
      } catch (e: any) {
        const msg = e?.message || String(e);
        if (/password/i.test(msg) || /encrypt/i.test(msg)) {
          setNeedsPassword(true);
          throw new Error(
            pwd
              ? "Incorrect password. Please try again."
              : "This PDF is password-protected. Enter its password to unlock.",
          );
        }
        throw e;
      }
      const bytes = await doc.save();
      downloadBlob(new Blob([bytes as BlobPart], { type: "application/pdf" }), timestampName("unlocked"));
      toast.success("PDF unlocked — download started.");
    } catch (e) {
      toast.error("Could not unlock PDF", { description: friendlyPdfError(e) });
    } finally {
      setProcessing(false);
    }
  };

  const clear = () => {
    setFile(null);
    setPwd("");
    setNeedsPassword(false);
  };

  return (
    <>
      <ToolHeader
        icon={Unlock}
        title="Unlock PDF"
        description="Remove password protection from a PDF you own or have permission to edit. Nothing leaves your browser."
      />
      <ToolLayout>
        {!file && (
          <PdfDropzone
            onFiles={onFiles}
            title="Drop a password-protected PDF here"
            subtitle="One PDF at a time · we'll ask for the password if needed"
          />
        )}

        {file && (
          <div className="glass-panel rounded-2xl p-4 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
                <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
              </div>
              <Button size="sm" variant="ghost" onClick={clear} className="text-muted-foreground hover:text-destructive">
                <Trash2 className="mr-1.5 h-4 w-4" /> Reset
              </Button>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">
                Password {needsPassword && <span className="text-destructive">(required)</span>}
              </Label>
              <div className="relative">
                <Input
                  type={showPwd ? "text" : "password"}
                  value={pwd}
                  onChange={(e) => setPwd(e.target.value)}
                  placeholder="Leave blank if the PDF has no user password"
                  autoComplete="current-password"
                  onKeyDown={(e) => e.key === "Enter" && !processing && unlock()}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPwd ? "Hide password" : "Show password"}
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
              Only unlock PDFs you own or have permission to edit. Files you don't have the key to may fail with a clear error.
            </div>
          </div>
        )}

        {file && (
          <div className="sticky bottom-4 z-10">
            <div className="glass-panel flex flex-wrap items-center justify-end gap-3 rounded-2xl p-3 sm:p-4">
              <Button
                onClick={unlock}
                disabled={processing}
                size="lg"
                className="bg-gradient-primary text-primary-foreground shadow-[0_10px_24px_-12px_rgb(37_99_235_/_0.55)] hover:opacity-95"
              >
                {processing ? (
                  <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Unlocking…</>
                ) : (
                  <><Download className="mr-1.5 h-4 w-4" /> Unlock PDF</>
                )}
              </Button>
            </div>
          </div>
        )}

        <div className="pt-2"><AdPlaceholder slot="bottom-banner" /></div>
      </ToolLayout>
    </>
  );
}
