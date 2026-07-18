import { createFileRoute } from "@tanstack/react-router";
import { TOOLS } from "@/lib/tools";
import { ToolCard } from "@/components/tool-card";

export const Route = createFileRoute("/tools/")({
  head: () => ({
    meta: [
      { title: "All PDF Tools — PDFMaker" },
      {
        name: "description",
        content:
          "Browse every PDF tool on PDFMaker — convert, merge, split, compress and organize documents right in your browser.",
      },
    ],
  }),
  component: ToolsIndex,
});

function ToolsIndex() {
  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium uppercase tracking-wide text-primary">
            All tools
          </span>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Every PDF tool, one place
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
            Pick a tool below to get started. Everything runs in your browser — nothing
            is ever uploaded.
          </p>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {TOOLS.map((t) => (
            <ToolCard key={t.slug} tool={t} />
          ))}
        </div>
      </div>
    </section>
  );
}
