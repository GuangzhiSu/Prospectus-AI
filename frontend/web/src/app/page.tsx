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

const ecosystemProducts = [
  {
    title: "Prospectus generation",
    text: "Turn prepared issuer evidence into section drafts, verification notes, and Word exports for professional review.",
    href: "/workspace",
    cta: "Open workspace",
  },
  {
    title: "Listing eligibility diagnostic",
    text: "Run a separate listing-pathway diagnosis that surfaces met criteria, shortfalls, missing inputs, and indeterminate checks before drafting.",
    href: "/eligibility",
    cta: "Explore diagnostic",
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
            <h2 className="text-2xl font-semibold">Built as a regulated-finance product ecosystem</h2>
            <p className="mt-4 text-sm leading-6 text-[#637064]">
              The project started with IPO prospectus drafting, and now also includes a standalone listing-eligibility
              diagnostic. They serve adjacent moments in the deal lifecycle while keeping product workflows independent.
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

      <section className="border-y border-[#d5ddd2] bg-white">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-semibold">Two products, one capital-markets context</h2>
            <p className="mt-4 text-sm leading-6 text-[#637064]">
              Use eligibility diagnosis to understand listing-pathway gaps. Use prospectus generation when evidence is
              ready for drafting. The modules can sit in one ecosystem without being merged into one workflow.
            </p>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {ecosystemProducts.map((product) => (
              <div key={product.title} className="border border-[#d5ddd2] p-5">
                <p className="text-lg font-semibold">{product.title}</p>
                <p className="mt-3 text-sm leading-6 text-[#637064]">{product.text}</p>
                <Link
                  href={product.href}
                  className="mt-5 inline-flex h-10 items-center gap-2 border border-[#c9d2c7] px-4 text-sm font-semibold text-[#17201b] hover:bg-[#f6f8f4]"
                >
                  {product.cta}
                  <ArrowIcon />
                </Link>
              </div>
            ))}
          </div>
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
