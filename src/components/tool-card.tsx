import { ArrowUpRight } from "lucide-react";
import type { Tool } from "@/lib/tools";

export function ToolCard({ tool }: { tool: Tool }) {
  const Icon = tool.icon;
  const badge = tool.available ? "Available" : "Coming soon";
  return (
    <a
      href={`/tools/${tool.slug}`}
      aria-label={`${tool.title} — ${tool.description}`}
      className="group block h-full rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <div className="glass-panel glass-panel-hover flex h-full cursor-pointer flex-col gap-4 rounded-2xl p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div
            aria-hidden="true"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-primary text-primary-foreground shadow-[0_8px_20px_-8px_rgb(37_99_235_/_0.45)]"
          >
            <Icon className="h-5 w-5" strokeWidth={2.25} />
          </div>
          <div
            className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors ${
              tool.available
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
                : "border-primary/15 bg-primary/8 text-primary"
            }`}
          >
            {badge}
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold tracking-tight text-foreground">
            {tool.title}
          </h3>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            {tool.description}
          </p>
        </div>
        <div className="mt-1 flex items-center text-sm font-medium text-primary">
          Open tool
          <ArrowUpRight className="ml-1 h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </div>
      </div>
    </a>
  );
}
