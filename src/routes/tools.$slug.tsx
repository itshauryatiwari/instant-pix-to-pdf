import { createFileRoute, notFound } from "@tanstack/react-router";
import { ArrowLeft, Clock } from "lucide-react";
import { TOOLS } from "@/lib/tools";

export const Route = createFileRoute("/tools/$slug")({
  loader: ({ params }) => {
    const tool = TOOLS.find((t) => t.slug === params.slug);
    if (!tool) throw notFound();
    if (tool.slug === "image-to-pdf") {
      // handled by its own route file, this loader wouldn't fire; safety only.
    }
    return { tool };
  },
  head: ({ loaderData }) => {
    const tool = loaderData?.tool;
    return {
      meta: tool
        ? [
            { title: `${tool.title} — PDFMaker` },
            { name: "description", content: tool.description },
          ]
        : [{ title: "Tool — PDFMaker" }],
    };
  },
  component: ComingSoon,
});

function ComingSoon() {
  const { tool } = Route.useLoaderData();
  const Icon = tool.icon;
  return (
    <section className="py-16 sm:py-24">
      <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 lg:px-8">
        <a
          href="/tools"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> All tools
        </a>
        <div className="glass-panel mt-6 flex flex-col items-center gap-4 rounded-2xl p-10 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-[0_10px_24px_-10px_rgb(37_99_235_/_0.55)]">
            <Icon className="h-6 w-6" strokeWidth={2.25} />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            {tool.title}
          </h1>
          <p className="max-w-lg text-base leading-relaxed text-muted-foreground">
            {tool.description}
          </p>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
            <Clock className="h-3.5 w-3.5" /> Coming soon
          </span>
          <p className="max-w-md text-sm text-muted-foreground">
            This tool is on the roadmap and being built right now. In the meantime, try
            our fully-functional{" "}
            <a href="/tools/image-to-pdf" className="font-medium text-primary hover:underline">
              Image to PDF
            </a>{" "}
            tool.
          </p>
        </div>
      </div>
    </section>
  );
}
