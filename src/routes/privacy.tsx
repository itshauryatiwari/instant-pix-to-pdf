import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — PDFMaker" },
      {
        name: "description",
        content:
          "PDFMaker processes every file locally in your browser. Read exactly what data we do (and don't) collect.",
      },
    ],
  }),
  component: Privacy,
});

function Privacy() {
  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="glass-panel rounded-2xl p-8 sm:p-10">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Privacy Policy
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">Last updated: 2026</p>

          <div className="prose prose-sm mt-8 max-w-none space-y-6 text-sm leading-relaxed text-muted-foreground">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Files never leave your device</h2>
              <p className="mt-2">
                Every PDFMaker tool runs entirely inside your browser using WebAssembly
                and native browser APIs. We do not upload, copy, or store the files you
                convert. Once you close the tab, the file is gone from memory.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-foreground">What we do collect</h2>
              <p className="mt-2">
                We use privacy-friendly, aggregate analytics (page views, referrer,
                approximate country) to understand which tools people use. We never
                collect file contents, file names, personal information, or account
                data.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-foreground">Cookies</h2>
              <p className="mt-2">
                PDFMaker does not set advertising or tracking cookies. A small amount of
                local storage may be used to remember your preferences (like the last
                tool you opened).
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-foreground">Third parties</h2>
              <p className="mt-2">
                We may display ads to keep PDFMaker free. Ads are loaded in isolated
                slots and cannot access your files.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-foreground">Contact</h2>
              <p className="mt-2">
                Questions about privacy? Reach out via the GitHub link in the footer.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
