import { ArrowLeft, ShieldCheck, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { AdPlaceholder } from "@/components/ad-placeholder";

export function ToolHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
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
            <Icon className="h-6 w-6" strokeWidth={2.25} />
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              {title}
            </h1>
            <p className="mt-2 max-w-2xl text-base leading-relaxed text-muted-foreground">
              {description}
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
  );
}

export function ToolLayout({ children }: { children: ReactNode }) {
  return (
    <section className="pb-24">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)_260px]">
          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <AdPlaceholder slot="left-sidebar" />
            </div>
          </aside>
          <div className="min-w-0 space-y-6">{children}</div>
          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <AdPlaceholder slot="right-sidebar" />
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
