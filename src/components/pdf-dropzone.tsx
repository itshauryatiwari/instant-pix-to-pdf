import { UploadCloud } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { isPdf } from "@/lib/pdf-common";
import { toast } from "sonner";

export function PdfDropzone({
  multiple = false,
  onFiles,
  title = "Drop your PDF here, or click to browse",
  subtitle = "PDF files only — everything is processed in your browser",
  children,
}: {
  multiple?: boolean;
  onFiles: (files: File[]) => void;
  title?: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const accept = (files: FileList | File[]) => {
    const arr = Array.from(files);
    const pdfs = arr.filter(isPdf);
    const skipped = arr.length - pdfs.length;
    if (skipped > 0)
      toast.error(`${skipped} non-PDF file${skipped > 1 ? "s" : ""} skipped`, {
        description: "This tool only accepts PDF files.",
      });
    if (pdfs.length > 0) onFiles(multiple ? pdfs : [pdfs[0]]);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (e.dataTransfer.files?.length) accept(e.dataTransfer.files);
      }}
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
          <p className="text-base font-medium text-foreground">{title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button
            onClick={() => inputRef.current?.click()}
            className="bg-gradient-primary text-primary-foreground hover:opacity-95"
          >
            <UploadCloud className="mr-1.5 h-4 w-4" />
            {multiple ? "Choose PDFs" : "Choose PDF"}
          </Button>
          {children}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          multiple={multiple}
          className="hidden"
          onChange={(e) => {
            if (e.target.files) accept(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}
