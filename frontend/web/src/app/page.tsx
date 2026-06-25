import Image from "next/image";
import Link from "next/link";

export const metadata = {
  title: "AI Prospectus | Private AI document generation",
  description:
    "AI Prospectus helps legal and finance teams turn issuer materials into structured evidence, regulated drafts, and exportable documents.",
};

const workflow = [
  {
    title: "Ingest proprietary materials",
    text: "Upload issuer spreadsheets, JSON records, diligence outputs, and internal workpapers into a controlled drafting workspace.",
  },
  {
    title: "Prepare evidence",
    text: "Agent1 separates narrative text from structured facts, maps content to prospectus sections, and preserves source pointers.",
  },
  {
    title: "Generate regulated drafts",
    text: "Agent2 drafts section-by-section with verification notes, missing-data flags, and Word export for professional review.",
  },
];

const audiences = [
  "IPO sponsor counsel teams",
  "Capital markets lawyers",
  "Investment banking execution teams",
  "Compliance and disclosure teams",
];

function ArrowIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14m-6-6 6 6-6 6" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v11m0 0 4-4m-4 4-4-4M5 21h14" />
    </svg>
  );
}

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#f6f8f4] text-[#17201b]">
      <section className="relative overflow-hidden bg-[#111c18] text-white">
        <div className="absolute inset-0 opacity-18">
          <Image
            src="/app-icon-512.png"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        </div>
        <nav className="relative mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/app-icon.png" alt="AI Prospectus logo" width={36} height={36} />
            <span className="text-sm font-semibold">AI Prospectus</span>
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/download" className="hidden text-[#dce8df] hover:text-white sm:inline">
              Download
            </Link>
            <Link href="/workspace" className="border border-white/25 px-4 py-2 font-semibold hover:bg-white/10">
              Launch workspace
            </Link>
          </div>
        </nav>

        <div className="relative mx-auto grid min-h-[640px] max-w-7xl grid-cols-1 items-center gap-10 px-6 pb-16 pt-8 md:grid-cols-[1fr_430px]">
          <div className="max-w-3xl">
            <div className="mb-5 inline-flex border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium uppercase text-[#dce8df]">
              Private AI for regulated document drafting
            </div>
            <h1 className="text-4xl font-semibold leading-tight md:text-6xl">
              Turn proprietary deal materials into prospectus-ready drafts.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-[#dce8df] md:text-lg">
              AI Prospectus is a modular drafting system for sponsor-counsel workflows:
              evidence preparation, section generation, verification notes, and Word export in one controlled workspace.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/download"
                className="inline-flex h-11 items-center gap-2 bg-[#f2c14e] px-5 text-sm font-semibold text-[#17201b] transition hover:bg-[#ffd36b]"
              >
                <DownloadIcon />
                Download app
              </Link>
              <Link
                href="/workspace"
                className="inline-flex h-11 items-center gap-2 border border-white/25 px-5 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Open workspace
                <ArrowIcon />
              </Link>
            </div>
          </div>

          <div className="border border-white/15 bg-[#f7faf6] p-5 text-[#17201b] shadow-2xl">
            <div className="flex items-center gap-3 border-b border-[#d8ded6] pb-4">
              <Image src="/app-icon.png" alt="" width={44} height={44} />
              <div>
                <p className="text-sm font-semibold">Disclosure drafting pipeline</p>
                <p className="text-xs text-[#647064]">Evidence first, generation second</p>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              {workflow.map((item, index) => (
                <div key={item.title} className="grid grid-cols-[32px_1fr] gap-3 border-b border-[#e2e7df] pb-3 last:border-b-0 last:pb-0">
                  <div className="flex h-8 w-8 items-center justify-center bg-[#17201b] text-xs font-semibold text-white">
                    {index + 1}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{item.title}</p>
                    <p className="mt-1 text-sm leading-5 text-[#647064]">{item.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-14">
        <div className="grid gap-8 md:grid-cols-[0.9fr_1.1fr]">
          <div>
            <h2 className="text-2xl font-semibold">Built for proprietary document generation</h2>
            <p className="mt-4 text-sm leading-6 text-[#637064]">
              The project started with IPO prospectus drafting, but the architecture now separates the AI module,
              frontend workspace, platform tools, knowledge module, and pipeline module so domain-specific drafting
              workflows can evolve independently.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {audiences.map((item) => (
                <span key={item} className="border border-[#d5ddd2] bg-white px-3 py-2 text-sm text-[#334139]">
                  {item}
                </span>
              ))}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="border border-[#d5ddd2] bg-white p-5">
              <p className="text-sm font-semibold">Private data workflow</p>
              <p className="mt-3 text-sm leading-6 text-[#637064]">
                Runtime files can stay in a local workspace while the codebase remains clean and modular.
              </p>
            </div>
            <div className="border border-[#d5ddd2] bg-white p-5">
              <p className="text-sm font-semibold">Section-aware drafting</p>
              <p className="mt-3 text-sm leading-6 text-[#637064]">
                Requirements, evidence retrieval, verification, and output bundles are organized around disclosure sections.
              </p>
            </div>
            <div className="border border-[#d5ddd2] bg-white p-5">
              <p className="text-sm font-semibold">Desktop-ready packaging</p>
              <p className="mt-3 text-sm leading-6 text-[#637064]">
                Downloadable builds support internal review and distribution without exposing issuer files to a public SaaS.
              </p>
            </div>
            <div className="border border-[#d5ddd2] bg-white p-5">
              <p className="text-sm font-semibold">Extensible modules</p>
              <p className="mt-3 text-sm leading-6 text-[#637064]">
                AI, frontend, platform, knowledge graph, resources, and extraction pipelines now have clear homes.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-[#d5ddd2] bg-white">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-5 px-6 py-10 md:flex-row md:items-center">
          <div>
            <h2 className="text-xl font-semibold">Download the app or open the hosted workspace.</h2>
            <p className="mt-2 text-sm text-[#637064]">
              Use the website for product discovery, then move to the workspace for controlled drafting.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/download" className="inline-flex h-11 items-center gap-2 bg-[#17201b] px-5 text-sm font-semibold text-white hover:bg-[#2b3a32]">
              <DownloadIcon />
              Download app
            </Link>
            <Link href="/workspace" className="inline-flex h-11 items-center gap-2 border border-[#c9d2c7] px-5 text-sm font-semibold text-[#17201b] hover:bg-[#f6f8f4]">
              Launch workspace
              <ArrowIcon />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
