import { Link } from "@tanstack/react-router";
import { FileStack, Github, Menu, Moon, X } from "lucide-react";
import { useState } from "react";

const nav = [
  { to: "/", label: "Home" },
  { to: "/tools", label: "All Tools" },
  { to: "/privacy", label: "Privacy Policy" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border/40 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          <Link
            to="/"
            aria-label="PDFMaker — home"
            className="flex items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span
              aria-hidden="true"
              className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-primary text-primary-foreground shadow-[0_8px_20px_-8px_rgb(37_99_235_/_0.55)]"
            >
              <FileStack className="h-[18px] w-[18px]" strokeWidth={2.4} />
            </span>
            <span className="text-base font-semibold tracking-tight text-foreground">
              PDFMaker
            </span>
          </Link>

          <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
            {nav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground data-[status=active]:bg-accent/60 data-[status=active]:text-foreground"
                activeProps={{ "data-status": "active" } as any}
              >
                {n.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-1">
            <button
              disabled
              aria-label="Toggle dark mode (coming soon)"
              className="hidden h-9 w-9 items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-50 sm:inline-flex"
            >
              <Moon className="h-4 w-4" />
            </button>
            <a
              href="#"
              rel="noopener noreferrer"
              aria-label="View GitHub repository"
              className="hidden h-9 w-9 items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground sm:inline-flex"
            >
              <Github className="h-4 w-4" />
            </a>
            <Link
              to="/tools"
              className="hidden h-8 items-center justify-center gap-2 whitespace-nowrap rounded-md bg-gradient-primary px-3 text-xs font-medium text-primary-foreground shadow transition-opacity hover:opacity-95 sm:inline-flex"
            >
              Browse Tools
            </Link>
            <button
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              onClick={() => setOpen((o) => !o)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground md:hidden"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <div
          className={`grid overflow-hidden transition-[grid-template-rows] duration-300 md:hidden ${
            open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          }`}
        >
          <div className="min-h-0">
            <nav aria-label="Mobile" className="flex flex-col gap-1 pt-2 pb-4">
              {nav.map((n) => (
                <Link
                  key={n.to}
                  to={n.to}
                  onClick={() => setOpen(false)}
                  className="rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground data-[status=active]:bg-accent/60 data-[status=active]:text-foreground"
                  activeProps={{ "data-status": "active" } as any}
                >
                  {n.label}
                </Link>
              ))}
              <Link
                to="/tools"
                onClick={() => setOpen(false)}
                className="mt-2 inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-md bg-gradient-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow"
              >
                Browse Tools
              </Link>
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
}
