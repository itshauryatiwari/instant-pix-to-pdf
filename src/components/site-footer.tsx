import { Link } from "@tanstack/react-router";
import { FileStack, Github, Twitter } from "lucide-react";

const quick = [
  { to: "/", label: "Home" },
  { to: "/tools", label: "All Tools" },
  { to: "/privacy", label: "Privacy Policy" },
] as const;

const popular = [
  { to: "/tools/image-to-pdf", label: "Image to PDF" },
  { to: "/tools/pdf-to-image", label: "PDF to Image" },
  { to: "/tools/merge-pdf", label: "Merge PDF" },
  { to: "/tools/split-pdf", label: "Split PDF" },
  { to: "/tools/compress-pdf", label: "Compress PDF" },
  { to: "/tools/rotate-pdf", label: "Rotate PDF" },
] as const;

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border/50 bg-background/60 backdrop-blur">
      <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-5">
            <Link to="/" aria-label="PDFMaker home" className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-primary text-primary-foreground"
              >
                <FileStack className="h-[18px] w-[18px]" strokeWidth={2.4} />
              </span>
              <span className="text-base font-semibold tracking-tight">PDFMaker</span>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
              A complete, private, browser-based PDF toolkit. Convert, merge, split,
              compress and organize documents without ever uploading a file.
            </p>
            <div className="mt-5 flex items-center gap-3">
              <a
                href="#"
                aria-label="GitHub"
                className="grid h-9 w-9 place-items-center rounded-lg border border-border/70 text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
              >
                <Github className="h-4 w-4" />
              </a>
              <a
                href="#"
                aria-label="Twitter"
                className="grid h-9 w-9 place-items-center rounded-lg border border-border/70 text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
              >
                <Twitter className="h-4 w-4" />
              </a>
            </div>
          </div>

          <div className="md:col-span-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
              Quick links
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              {quick.map((q) => (
                <li key={q.to}>
                  <Link
                    to={q.to}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {q.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
              Popular tools
            </h3>
            <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
              {popular.map((p) => (
                <li key={p.to}>
                  <Link
                    to={p.to}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {p.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-border/50 pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center">
          <p>© 2026 PDFMaker. All rights reserved.</p>
          <p>Built with privacy in mind. Nothing ever leaves your browser.</p>
        </div>
      </div>
    </footer>
  );
}
