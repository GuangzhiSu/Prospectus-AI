import Image from "next/image";
import Link from "next/link";

import { PublicNav } from "@/components/PublicNav";

export const metadata = {
  title: "AI Prospectus | Private AI document generation",
  description:
    "AI Prospectus helps legal and finance teams turn issuer materials into structured evidence, regulated drafts, and exportable documents.",
  alternates: {
    canonical: "/",
    languages: {
      en: "/",
      "zh-CN": "/zh",
    },
  },
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

const graphHighlights = [
  {
    title: "Source anchoring",
    text: "Facts, narrative passages, and extracted tables stay connected to the files they came from.",
  },
  {
    title: "Section routing",
    text: "Evidence is classified against the prospectus section map before drafting begins.",
  },
  {
    title: "Gap detection",
    text: "Missing inputs and weak coverage are surfaced as review signals instead of hidden in the draft.",
  },
];

const contactHref =
  "mailto:contact@ai-prospectus.com?subject=AI%20Prospectus%20demo%20request";

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

function EvidenceGraphVisual() {
  return (
    <div className="border border-white/15 bg-[#0f1916] p-5 text-white shadow-2xl">
      <div className="flex flex-col justify-between gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-semibold uppercase text-[#f2c14e]">Internal evidence layer</p>
          <p className="mt-1 text-sm text-[#c8d8d0]">Source material to verified disclosure structure</p>
        </div>
        <span className="border border-[#5aa79b]/45 bg-[#14332e] px-3 py-1 text-xs font-semibold text-[#9ee0d5]">
          Runtime only
        </span>
      </div>

      <div className="relative mt-5 grid gap-2 overflow-hidden border border-white/10 bg-[#15231f] p-4 sm:block sm:min-h-[300px]">
        <div className="absolute left-[16%] top-[28%] hidden h-px w-[68%] bg-[#f2c14e]/50 sm:block" />
        <div className="absolute left-[21%] top-[48%] hidden h-px w-[54%] rotate-[-18deg] bg-[#5aa79b]/45 sm:block" />
        <div className="absolute left-[24%] top-[57%] hidden h-px w-[50%] rotate-[21deg] bg-white/20 sm:block" />
        <div className="absolute left-[48%] top-[28%] hidden h-[42%] w-px bg-white/20 sm:block" />

        <div className="border border-white/15 bg-[#f7faf6] px-3 py-2 text-[#17201b] sm:absolute sm:left-[6%] sm:top-[14%] sm:w-[9.5rem]">
          <p className="text-xs font-semibold">Issuer files</p>
          <p className="mt-1 text-[11px] text-[#647064]">PDF, DOCX, XLSX, JSON</p>
        </div>
        <div className="border border-[#f2c14e]/55 bg-[#2b2414] px-3 py-2 sm:absolute sm:left-[39%] sm:top-[11%] sm:w-[9rem]">
          <p className="text-xs font-semibold text-[#f7d98b]">Extracted facts</p>
          <p className="mt-1 text-[11px] text-[#e9d8a6]">values, dates, entities</p>
        </div>
        <div className="border border-[#5aa79b]/55 bg-[#14332e] px-3 py-2 sm:absolute sm:right-[5%] sm:top-[18%] sm:w-[9rem]">
          <p className="text-xs font-semibold text-[#9ee0d5]">Section map</p>
          <p className="mt-1 text-[11px] text-[#bfe9e1]">Business, Risk, MD&A</p>
        </div>
        <div className="border border-white/15 bg-[#22302b] px-3 py-2 sm:absolute sm:bottom-[15%] sm:left-[13%] sm:w-[9rem]">
          <p className="text-xs font-semibold">Source pointers</p>
          <p className="mt-1 text-[11px] text-[#c8d8d0]">file, table, page, row</p>
        </div>
        <div className="border border-[#d77259]/55 bg-[#321c18] px-3 py-2 sm:absolute sm:bottom-[9%] sm:left-[42%] sm:w-[9.5rem]">
          <p className="text-xs font-semibold text-[#ffb39f]">Coverage gaps</p>
          <p className="mt-1 text-[11px] text-[#f1c5bb]">missing inputs flagged</p>
        </div>
        <div className="border border-white/15 bg-[#f7faf6] px-3 py-2 text-[#17201b] sm:absolute sm:bottom-[20%] sm:right-[8%] sm:w-[9rem]">
          <p className="text-xs font-semibold">Draft plan</p>
          <p className="mt-1 text-[11px] text-[#647064]">evidence-backed outline</p>
        </div>
      </div>

      <div className="mt-4 grid gap-2 text-xs text-[#c8d8d0] sm:grid-cols-3">
        <div className="border border-white/10 px-3 py-2">Traceable retrieval packets</div>
        <div className="border border-white/10 px-3 py-2">Section-aware prompts</div>
        <div className="border border-white/10 px-3 py-2">Reviewer-facing gaps</div>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#f6f8f4] text-[#17201b]">
      <PublicNav active="home" />
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
        <div className="relative mx-auto grid min-h-[700px] max-w-7xl grid-cols-1 items-center gap-10 px-6 pb-16 pt-28 md:grid-cols-[1fr_430px]">
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
                Open protected workspace
                <ArrowIcon />
              </Link>
              <a
                href={contactHref}
                className="inline-flex h-11 items-center gap-2 border border-white/25 px-5 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Request demo
                <ArrowIcon />
              </a>
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
                AI, frontend, platform, evidence layer, resources, and extraction pipelines now have clear homes.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#17201b] text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 md:grid-cols-[0.85fr_1.15fr] md:items-center">
          <div>
            <p className="text-xs font-semibold uppercase text-[#f2c14e]">Inside the drafting engine</p>
            <h2 className="mt-4 text-3xl font-semibold leading-tight">
              A private evidence graph organizes the facts before the model writes.
            </h2>
            <p className="mt-5 text-sm leading-7 text-[#c8d8d0]">
              Users work with upload, draft, revise, and export. Behind that surface, AI Prospectus builds a structured
              evidence layer that keeps source materials, extracted facts, section requirements, and missing-input
              signals aligned throughout generation.
            </p>
            <div className="mt-7 grid gap-3">
              {graphHighlights.map((item) => (
                <div key={item.title} className="border border-white/15 bg-white/[0.04] p-4">
                  <p className="text-sm font-semibold text-white">{item.title}</p>
                  <p className="mt-2 text-sm leading-6 text-[#c8d8d0]">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
          <EvidenceGraphVisual />
        </div>
      </section>

      <section className="border-t border-[#d5ddd2] bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 border-b border-[#d5ddd2] px-6 py-12 md:grid-cols-[1fr_1fr]">
          <div>
            <h2 className="text-2xl font-semibold">From prospectus drafting to private document generation</h2>
            <p className="mt-4 text-sm leading-6 text-[#637064]">
              AI Prospectus is designed to grow beyond a single drafting template. The same modular structure can support
              issuer questionnaires, diligence summaries, regulated filings, board papers, and other proprietary documents
              where traceability and review discipline matter.
            </p>
          </div>
          <div className="grid gap-3">
            <div className="border border-[#d5ddd2] p-4">
              <p className="text-sm font-semibold">Demo and partnership enquiries</p>
              <p className="mt-2 text-sm leading-6 text-[#637064]">
                For pilots, sponsor-counsel workflows, or private deployment discussions, request a demo and include your
                target document type.
              </p>
              <a href={contactHref} className="mt-4 inline-flex h-10 items-center gap-2 bg-[#17201b] px-4 text-sm font-semibold text-white hover:bg-[#2b3a32]">
                Request demo
                <ArrowIcon />
              </a>
            </div>
            <div className="border border-[#d5ddd2] p-4">
              <p className="text-sm font-semibold">Source and releases</p>
              <p className="mt-2 text-sm leading-6 text-[#637064]">
                The public site links to GitHub releases for downloadable builds while the protected workspace remains
                separate from the marketing surface.
              </p>
              <a href="https://github.com/GuangzhiSu/Prospectus-AI" className="mt-4 inline-flex h-10 items-center gap-2 border border-[#c9d2c7] px-4 text-sm font-semibold text-[#17201b] hover:bg-[#f6f8f4]">
                View GitHub
                <ArrowIcon />
              </a>
            </div>
          </div>
        </div>
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-5 px-6 py-10 md:flex-row md:items-center">
          <div>
            <h2 className="text-xl font-semibold">Download the app or request access to the workspace.</h2>
            <p className="mt-2 text-sm text-[#637064]">
              Use the website for product discovery, then move to a protected workspace for controlled drafting.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/download" className="inline-flex h-11 items-center gap-2 bg-[#17201b] px-5 text-sm font-semibold text-white hover:bg-[#2b3a32]">
              <DownloadIcon />
              Download app
            </Link>
            <Link href="/workspace" className="inline-flex h-11 items-center gap-2 border border-[#c9d2c7] px-5 text-sm font-semibold text-[#17201b] hover:bg-[#f6f8f4]">
              Protected workspace
              <ArrowIcon />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
