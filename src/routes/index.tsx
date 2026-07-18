import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Zap,
  Globe,
  UserX,
  Infinity as InfinityIcon,
  MonitorSmartphone,
  ChevronDown,
} from "lucide-react";
import { HOME_TOOLS } from "@/lib/tools";
import { ToolCard } from "@/components/tool-card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PDFMaker — Free Browser-Based PDF Tools" },
      {
        name: "description",
        content:
          "Convert, merge, split, compress and organize PDFs directly in your browser. No uploads, no watermarks, no sign-up required.",
      },
    ],
  }),
  component: Home,
});

const features = [
  { icon: Globe, title: "100% browser-based", text: "All processing runs locally using WebAssembly — no servers, no uploads, no waiting." },
  { icon: ShieldCheck, title: "Private by design", text: "Your files never leave your device. Safe for contracts, IDs and sensitive documents." },
  { icon: Zap, title: "Blazing fast", text: "Native-speed conversions that use your device's hardware for maximum performance." },
  { icon: UserX, title: "No sign-up", text: "Open any tool and start working instantly. No accounts, no email, no friction." },
  { icon: Sparkles, title: "No watermarks", text: "Every export is clean and professional — never a stamp, banner or logo in sight." },
  { icon: InfinityIcon, title: "Unlimited usage", text: "Process as many files as you want. There are no daily limits, quotas or paywalls." },
  { icon: MonitorSmartphone, title: "Works everywhere", text: "Fully responsive across desktop, tablet and mobile browsers — nothing to install." },
];

const faqs = [
  { q: "Is PDFMaker really free to use?", a: "Yes. Every tool on PDFMaker is free with no hidden limits, no watermarks and no account required. We keep it free because everything runs inside your browser — there are no server bills to pay." },
  { q: "Are my files uploaded to a server?", a: "No. PDFMaker processes documents locally in your browser using WebAssembly. Your files never leave your device, which makes it safe for sensitive contracts, IDs and financial paperwork." },
  { q: "Which browsers and devices are supported?", a: "PDFMaker works in every modern browser on desktop, tablet and mobile — including Chrome, Safari, Firefox and Edge. Nothing to install." },
  { q: "Is there a file size limit?", a: "Because processing happens in your browser, the practical limit depends on your device's memory. Most users can comfortably handle PDFs up to several hundred megabytes." },
  { q: "Do you store the files I process?", a: "Never. Files are opened, processed and released from memory entirely on your machine. We can't see them, and nothing is ever sent anywhere." },
  { q: "Which PDF tools are available right now?", a: "PDFMaker is launching with more than twenty planned tools spanning conversion, organization, security and optimization. New tools go live regularly — check the All Tools page for current availability." },
];

function Home() {
  return (
    <>
      <section className="relative overflow-hidden bg-hero pt-14 pb-20 sm:pt-20 sm:pb-28">
        <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-white/60 px-3 py-1 text-xs font-medium text-primary backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" />
              The complete PDF toolkit — free & private
            </span>
            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl md:text-6xl">
              Convert PDFs faster.{" "}
              <span className="text-gradient-primary">Free. Private.</span>{" "}
              Browser-based.
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              PDFMaker runs entirely inside your browser. Your files never leave your
              device, so you get instant conversions with zero uploads, zero watermarks
              and zero limits.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <a
                href="/tools/image-to-pdf"
                className="inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-md bg-gradient-primary px-8 text-sm font-medium text-primary-foreground shadow-[0_12px_30px_-10px_rgb(37_99_235_/_0.55)] transition-opacity hover:opacity-95"
              >
                Image to PDF
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </a>
              <a
                href="/tools"
                className="inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-md border border-border/80 bg-white/60 px-8 text-sm font-medium shadow-sm backdrop-blur transition-colors hover:bg-white hover:text-accent-foreground"
              >
                Browse all tools
              </a>
            </div>
            <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <li className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-primary" />
                100% private, in-browser
              </li>
              <li className="inline-flex items-center gap-1.5">
                <Zap className="h-4 w-4 text-primary" />
                No sign-up, no limits
              </li>
              <li className="inline-flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-primary" />
                {HOME_TOOLS.length}+ tools & counting
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section id="tools" className="py-16 sm:py-24">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium uppercase tracking-wide text-primary">
              24 tools & counting
            </span>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              The complete PDF toolkit
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
              Everything you need to work with PDFs, in one place. New tools are added
              regularly — click any card to open its dedicated page.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {HOME_TOOLS.map((t) => (
              <ToolCard key={t.slug} tool={t} />
            ))}
          </div>

          <div className="mt-10 flex justify-center">
            <a
              href="/tools"
              className="inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-md border border-border/80 bg-white/60 px-8 text-sm font-medium shadow-sm backdrop-blur transition-colors hover:bg-white"
            >
              See all tools
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      <section id="features" className="py-16 sm:py-24">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium uppercase tracking-wide text-primary">
              Why PDFMaker
            </span>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Built for people who take documents seriously
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
              A modern PDF experience without the compromises of legacy web converters.
            </p>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <div
                key={f.title}
                className="glass-panel flex h-full flex-col gap-3 rounded-2xl p-6"
              >
                <div
                  aria-hidden="true"
                  className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary"
                >
                  <f.icon className="h-5 w-5" strokeWidth={2.25} />
                </div>
                <h3 className="text-base font-semibold tracking-tight text-foreground">
                  {f.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {f.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="py-16 sm:py-24">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium uppercase tracking-wide text-primary">
              FAQ
            </span>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Frequently asked questions
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
              Everything you need to know about how PDFMaker handles your files.
            </p>
          </div>
          <div className="mx-auto mt-12 max-w-3xl">
            <div className="glass-panel rounded-2xl p-2 sm:p-4">
              <Accordion type="single" collapsible className="w-full">
                {faqs.map((f, i) => (
                  <AccordionItem
                    key={i}
                    value={`faq-${i}`}
                    className="border-b border-border/60 last:border-b-0"
                  >
                    <AccordionTrigger className="px-4 py-4 text-left text-base font-medium sm:px-6">
                      {f.q}
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4 text-sm leading-relaxed text-muted-foreground sm:px-6">
                      {f.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

// Silence unused chevron import in some tsc versions
void ChevronDown;
