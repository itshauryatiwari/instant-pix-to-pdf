import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useRef, useState } from "react";
import { PDFDocument as CantooPDFDocument } from "@cantoo/pdf-lib";
import { Download, Eye, EyeOff, Loader2, Lock, Trash2 } from "lucide-react";
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

export const Route = createFileRoute("/tools/protect-pdf")({
  head: () => ({
    meta: [
      { title: "Protect PDF with a Password — Free Browser Tool — PDFMaker" },
      {
        name: "description",
        content:
          "Add a password to a PDF so it can only be opened by people you trust. All processing happens locally in your browser.",
      },
      { property: "og:title", content: "Protect PDF — PDFMaker" },
      {
        property: "og:description",
        content:
          "Encrypt a PDF with a user password (and optional owner password) — 100% in your browser.",
      },
    ],
    links: [{ rel: "canonical", href: "/tools/protect-pdf" }],
  }),
  component: ProtectPage,
});

function ProtectPage() {
  const [file, setFile] = useState<File | null>(null);
  const [userPwd, setUserPwd] = useState("");
  const [ownerPwd, setOwnerPwd] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [processing, setProcessing] = useState(false);
  const cancelRef = useRef(false);

  const onFiles = useCallback((files: File[]) => {
    setFile(files[0]);
  }, []);

  const strength = ((): { label: string; className: string } => {
    const p = userPwd;
    if (p.length < 8) return { label: "Too short", className: "text-destructive" };
    let score = 0;
    if (/[a-z]/.test(p)) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/\d/.test(p)) score++;
    if (/[^\w]/.test(p)) score++;
    if (p.length >= 12) score++;
    if (score <= 2) return { label: "Weak", className: "text-amber-600" };
    if (score === 3) return { label: "OK", className: "text-yellow-600" };
    if (score === 4) return { label: "Strong", className: "text-emerald-600" };
    return { label: "Very strong", className: "text-emerald-600" };
  })();

  const protect = async () => {
    if (!file) return;
    if (userPwd.length < 4) {
      toast.error("Password too short", { description: "Use at least 4 characters." });
      return;
    }
    setProcessing(true);
    cancelRef.current = false;
    try {
      const buf = await file.arrayBuffer();
      const doc = await CantooPDFDocument.load(buf, { ignoreEncryption: true });
      // @cantoo/pdf-lib encryption
      (doc as any).encrypt({
        userPassword: userPwd,
        ownerPassword: ownerPwd || userPwd,
        permissions: {
          printing: "highResolution",
          modifying: false,
          copying: false,
          annotating: true,
          fillingForms: true,
          contentAccessibility: true,
          documentAssembly: false,
        },
      });
      const bytes = await doc.save();
      downloadBlob(new Blob([bytes as BlobPart], { type: "application/pdf" }), timestampName("protected"));
      toast.success("Password added — download started.");
    } catch (e) {
      toast.error("Could not protect PDF", { description: friendlyPdfError(e) });
    } finally {
      setProcessing(false);
    }
  };

  const clear = () => {
    setFile(null);
    setUserPwd("");
    setOwnerPwd("");
  };

  return (
    <>
      <ToolHeader
        icon={Lock}
        title="Protect PDF"
        description="Add a password to a PDF so it can only be opened by people you trust. Everything runs locally in your browser."
      />
      <ToolLayout>
        {!file && (
          <PdfDropzone
            onFiles={onFiles}
            title="Drop a PDF here, or click to browse"
            subtitle="One PDF at a time · we'll add a password"
          />
        )}

        {file && (
          <div className="glass-panel rounded-2xl p-4 sm:p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
                <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
              </div>
              <Button size="sm" variant="ghost" onClick={clear} className="text-muted-foreground hover:text-destructive">
                <Trash2 className="mr-1.5 h-4 w-4" /> Reset
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">User password (required to open)</Label>
                <div className="relative">
                  <Input
                    type={showPwd ? "text" : "password"}
                    value={userPwd}
                    onChange={(e) => setUserPwd(e.target.value)}
                    placeholder="Choose a strong password"
                    autoComplete="new-password"
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
                {userPwd && (
                  <p className={`text-[11px] font-medium ${strength.className}`}>{strength.label}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">
                  Owner password <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  type={showPwd ? "text" : "password"}
                  value={ownerPwd}
                  onChange={(e) => setOwnerPwd(e.target.value)}
                  placeholder="Separate password to change permissions"
                  autoComplete="new-password"
                />
                <p className="text-[11px] text-muted-foreground">
                  Defaults to the user password if left blank.
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-700">
              <strong>Note:</strong> The protected PDF blocks casual copying, editing and document assembly, and requires the password to open. Determined attackers with the right tools can still bypass PDF encryption — treat passwords as a deterrent, not a vault.
            </div>
          </div>
        )}

        {file && (
          <div className="sticky bottom-4 z-10">
            <div className="glass-panel flex flex-wrap items-center justify-end gap-3 rounded-2xl p-3 sm:p-4">
              <Button
                onClick={protect}
                disabled={processing || userPwd.length < 4}
                size="lg"
                className="bg-gradient-primary text-primary-foreground shadow-[0_10px_24px_-12px_rgb(37_99_235_/_0.55)] hover:opacity-95"
              >
                {processing ? (
                  <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Encrypting…</>
                ) : (
                  <><Download className="mr-1.5 h-4 w-4" /> Protect PDF</>
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
